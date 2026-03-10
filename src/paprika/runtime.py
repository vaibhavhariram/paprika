"""Paprika runtime core."""

from __future__ import annotations

import functools
import logging
import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from paprika.adapters.llm import LLMAdapter
from paprika.adapters.tools import ToolAdapter
from paprika.context import PaprikaContext
from paprika.errors import PaprikaError, PolicyViolationError
from paprika.events import (
    LLMCallEndEvent,
    LLMCallStartEvent,
    PolicyViolationEvent,
    RunEndEvent,
    RunStartEvent,
    TokenUsage,
    ToolCallEndEvent,
    ToolCallStartEvent,
)
from paprika.policy import PolicyConfig, PolicyEngine, PolicyState
from paprika.replay import ReplayEngine
from paprika.trace_store import LocalTraceStore, Trace

if TYPE_CHECKING:
    from collections.abc import Callable
    from pathlib import Path

logger = logging.getLogger(__name__)


class RunState:
    """Mutable state for a single agent run. Implements runtime hook protocols."""

    def __init__(
        self,
        run_id: str,
        agent_name: str,
        policy_engine: PolicyEngine,
        replay_engine: ReplayEngine | None = None,
    ) -> None:
        self.run_id = run_id
        self.agent_name = agent_name
        self.trace = Trace(run_id=run_id, agent_name=agent_name)
        self._policy_engine = policy_engine
        self._policy_state = PolicyState()
        self._replay_engine = replay_engine
        self._step_index = 0
        self._last_input_hash: str | None = None

    @property
    def step_index(self) -> int:
        return self._step_index

    def record_start(self, args: tuple[Any, ...], kwargs: dict[str, Any]) -> None:
        """Record the run start event."""
        event = RunStartEvent(
            run_id=self.run_id,
            step_index=0,
            agent_name=self.agent_name,
            input_args={"args": list(args), "kwargs": kwargs},
        )
        self.trace.events.append(event)

    def record_end(
        self,
        status: str,
        output: Any = None,
        error: str | None = None,
    ) -> None:
        """Record the run end event."""
        self.trace.ended_at = datetime.now(UTC)
        event = RunEndEvent(
            run_id=self.run_id,
            step_index=self._step_index,
            status=status,
            output=output,
            error=error,
            total_tokens=self._policy_state.total_tokens,
        )
        self.trace.events.append(event)

    def record_policy_violation(self, exc: PolicyViolationError) -> None:
        """Record a policy violation event."""
        event = PolicyViolationEvent(
            run_id=self.run_id,
            step_index=self._step_index,
            policy_name=exc.policy_name,
            message=str(exc),
            details=exc.details,
        )
        self.trace.events.append(event)

    # -- LLM RuntimeHook implementation --

    def pre_llm_call(
        self,
        provider: str,
        model: str,
        input_data: dict[str, Any],
        input_hash: str,
    ) -> dict[str, Any] | None:
        self._step_index += 1
        self._policy_state.step_count += 1

        # Check pre-step policy
        self._policy_engine.check_pre_step(self._policy_state)

        # Record start event
        self._last_input_hash = input_hash

        event = LLMCallStartEvent(
            run_id=self.run_id,
            step_index=self._step_index,
            provider=provider,
            model=model,
            input_data=input_data,
            input_hash=input_hash,
        )
        self.trace.events.append(event)

        # Check replay
        if self._replay_engine is not None:
            return self._replay_engine.get_llm_stub(self._step_index, input_hash)

        return None

    def post_llm_call(
        self,
        output: dict[str, Any],
        token_usage: TokenUsage | None,
        duration_ms: float,
    ) -> None:
        # Update token tracking
        if token_usage is not None:
            self._policy_state.total_tokens += token_usage.total_tokens

        # Track input hash
        if self._last_input_hash is not None:
            h = self._last_input_hash
            self._policy_state.hash_counts[h] = self._policy_state.hash_counts.get(h, 0) + 1

        # Record end event
        event = LLMCallEndEvent(
            run_id=self.run_id,
            step_index=self._step_index,
            output_data=output,
            token_usage=token_usage,
            duration_ms=duration_ms,
        )
        self.trace.events.append(event)

        # Check post-step policy
        self._policy_engine.check_post_step(self._policy_state)

    # -- Tool ToolRuntimeHook implementation --

    def pre_tool_call(
        self,
        name: str,
        args: dict[str, Any],
        input_hash: str,
    ) -> Any | None:
        self._step_index += 1
        self._policy_state.step_count += 1

        # Check pre-step policy
        self._policy_engine.check_pre_step(self._policy_state)

        # Record start event
        self._last_input_hash = input_hash

        event = ToolCallStartEvent(
            run_id=self.run_id,
            step_index=self._step_index,
            tool_name=name,
            args=args,
            input_hash=input_hash,
        )
        self.trace.events.append(event)

        # Check replay
        if self._replay_engine is not None:
            return self._replay_engine.get_tool_stub(self._step_index, input_hash)

        return None

    def post_tool_call(self, output: Any, duration_ms: float) -> None:
        # Track input hash
        if self._last_input_hash is not None:
            h = self._last_input_hash
            self._policy_state.hash_counts[h] = self._policy_state.hash_counts.get(h, 0) + 1

        # Record end event
        event = ToolCallEndEvent(
            run_id=self.run_id,
            step_index=self._step_index,
            output_data=output,
            duration_ms=duration_ms,
        )
        self.trace.events.append(event)

        # Check post-step policy
        self._policy_engine.check_post_step(self._policy_state)


class PaprikaRuntime:
    """Main runtime that wraps agent execution with tracing and policy enforcement."""

    def __init__(
        self,
        *,
        policy: PolicyConfig | None = None,
        trace_store: LocalTraceStore | None = None,
        trace_dir: Path | None = None,
    ) -> None:
        self._policy_config = policy or PolicyConfig()
        self._trace_store = trace_store or LocalTraceStore(base_dir=trace_dir)
        self._tools: dict[str, Callable[..., Any]] = {}
        self._registered_agents: dict[str, Callable[..., Any]] = {}

    @property
    def trace_store(self) -> LocalTraceStore:
        return self._trace_store

    def register_tool(self, name: str, func: Callable[..., Any]) -> None:
        """Register a tool function that can be called via ctx.tools.call()."""
        self._tools[name] = func

    def agent(self, *, name: str | None = None) -> Callable[..., Any]:
        """Decorator that wraps an agent function with tracing and policy enforcement."""

        def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
            agent_name = name or func.__name__

            @functools.wraps(func)
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                return self._execute_agent(func, agent_name, args, kwargs)

            wrapper._paprika_agent_name = agent_name  # type: ignore[attr-defined]
            self._registered_agents[agent_name] = func
            return wrapper

        return decorator

    def _execute_agent(
        self,
        func: Callable[..., Any],
        agent_name: str,
        args: tuple[Any, ...],
        kwargs: dict[str, Any],
        replay_engine: ReplayEngine | None = None,
        replay_of: str | None = None,
    ) -> Any:
        """Core execution logic shared by normal runs and replays."""
        run_id = str(uuid.uuid4())
        policy_engine = PolicyEngine(self._policy_config)
        run_state = RunState(
            run_id=run_id,
            agent_name=agent_name,
            policy_engine=policy_engine,
            replay_engine=replay_engine,
        )

        if replay_of:
            run_state.trace.metadata["replay_of"] = replay_of

        ctx = PaprikaContext(
            llm=LLMAdapter(runtime_hook=run_state),
            tools=ToolAdapter(runtime_hook=run_state, tool_registry=self._tools),
            run_id=run_id,
        )

        run_state.record_start(args, kwargs)
        try:
            result = func(ctx, *args, **kwargs)
            run_state.record_end(status="success", output=result)
            return result
        except PolicyViolationError as exc:
            run_state.record_policy_violation(exc)
            run_state.record_end(status="policy_violation", error=str(exc))
            raise
        except Exception as exc:
            run_state.record_end(status="error", error=str(exc))
            raise
        finally:
            self._trace_store.save(run_state.trace)
            logger.info("Trace saved for run %s", run_id)

    def replay(self, run_id: str) -> Any:
        """Re-execute an agent run using recorded outputs from a prior trace."""
        record = self._trace_store.load_record(run_id)
        agent_name = record.agent.name
        func = self._registered_agents.get(agent_name)
        if func is None:
            msg = (
                f"No agent registered with name {agent_name!r}. "
                f"Ensure the agent is decorated with @runtime.agent() before replaying."
            )
            raise PaprikaError(msg)

        replay_engine = ReplayEngine(record)

        # Extract original input args from canonical top-level field
        original_args: tuple[Any, ...] = ()
        original_kwargs: dict[str, Any] = {}
        if isinstance(record.input, dict):
            original_args = tuple(record.input.get("args", []))
            original_kwargs = record.input.get("kwargs", {})

        return self._execute_agent(
            func,
            agent_name,
            original_args,
            original_kwargs,
            replay_engine=replay_engine,
            replay_of=run_id,
        )
