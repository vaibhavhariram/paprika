"""Tests for PaprikaRuntime and agent decorator."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import pytest

from paprika.context import PaprikaContext
from paprika.errors import PolicyViolationError
from paprika.events import EventType
from paprika.policy import PolicyConfig
from paprika.runtime import PaprikaRuntime
from paprika.trace_store import LocalTraceStore

if TYPE_CHECKING:
    from pathlib import Path


class TestRuntimeDecorator:
    def test_agent_receives_context(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)
        received_ctx = None

        @runtime.agent()
        def my_agent(ctx: PaprikaContext) -> str:
            nonlocal received_ctx
            received_ctx = ctx
            return "done"

        result = my_agent()
        assert result == "done"
        assert received_ctx is not None
        assert isinstance(received_ctx, PaprikaContext)
        assert received_ctx.run_id is not None

    def test_trace_saved_on_success(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)

        @runtime.agent()
        def my_agent(ctx: PaprikaContext) -> str:
            return "success"

        my_agent()
        traces = list(tmp_trace_dir.glob("*.json"))
        assert len(traces) == 1

        # Verify trace content
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        summaries = store.list_runs()
        assert len(summaries) == 1
        assert summaries[0].status == "success"

    def test_trace_saved_on_error(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)

        @runtime.agent()
        def failing_agent(ctx: PaprikaContext) -> str:
            msg = "something went wrong"
            raise RuntimeError(msg)

        with pytest.raises(RuntimeError, match="something went wrong"):
            failing_agent()

        summaries = LocalTraceStore(base_dir=tmp_trace_dir).list_runs()
        assert len(summaries) == 1
        assert summaries[0].status == "error"

    def test_agent_with_args(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)

        @runtime.agent()
        def my_agent(ctx: PaprikaContext, name: str, greeting: str = "hello") -> str:
            return f"{greeting} {name}"

        result = my_agent("world", greeting="hi")
        assert result == "hi world"

    def test_agent_custom_name(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)

        @runtime.agent(name="custom_name")
        def my_agent(ctx: PaprikaContext) -> str:
            return "done"

        assert my_agent._paprika_agent_name == "custom_name"


class TestToolCallTracing:
    def test_tool_call_recorded_in_trace(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)
        runtime.register_tool("greet", lambda name: f"Hello, {name}!")

        @runtime.agent()
        def my_agent(ctx: PaprikaContext) -> Any:
            return ctx.tools.call(name="greet", args={"name": "Alice"})

        result = my_agent()
        assert result == "Hello, Alice!"

        store = LocalTraceStore(base_dir=tmp_trace_dir)
        summaries = store.list_runs()
        trace = store.load(summaries[0].run_id)

        event_types = [e.event_type for e in trace.events]
        assert EventType.TOOL_CALL_START in event_types
        assert EventType.TOOL_CALL_END in event_types


class TestPolicyIntegration:
    def test_max_steps_stops_execution(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(
            policy=PolicyConfig(max_steps=2),
            trace_dir=tmp_trace_dir,
        )
        runtime.register_tool("noop", lambda: "ok")

        @runtime.agent()
        def greedy_agent(ctx: PaprikaContext) -> None:
            for _ in range(5):
                ctx.tools.call(name="noop", args={})

        with pytest.raises(PolicyViolationError, match="Step limit"):
            greedy_agent()

        store = LocalTraceStore(base_dir=tmp_trace_dir)
        summaries = store.list_runs()
        assert summaries[0].status == "policy_violation"

    def test_max_repeat_hashes_stops_execution(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(
            policy=PolicyConfig(max_repeat_hashes=2),
            trace_dir=tmp_trace_dir,
        )
        runtime.register_tool("echo", lambda msg: msg)

        @runtime.agent()
        def looping_agent(ctx: PaprikaContext) -> None:
            for _ in range(5):
                ctx.tools.call(name="echo", args={"msg": "same input"})

        with pytest.raises(PolicyViolationError, match="repeated"):
            looping_agent()


class TestReplay:
    def test_replay_returns_same_output(self, tmp_trace_dir: Path) -> None:
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)
        call_count = 0

        def counting_tool(x: int) -> int:
            nonlocal call_count
            call_count += 1
            return x * 2

        runtime.register_tool("double", counting_tool)

        @runtime.agent()
        def my_agent(ctx: PaprikaContext) -> Any:
            return ctx.tools.call(name="double", args={"x": 5})

        # First run
        result1 = my_agent()
        assert result1 == 10
        assert call_count == 1

        # Get the run_id
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        summaries = store.list_runs()
        run_id = summaries[0].run_id

        # Replay — tool should NOT be called again
        result2 = runtime.replay(run_id)
        assert result2 == 10
        assert call_count == 1  # still 1, tool was not called
