"""End-to-end integration tests."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

import pytest

from paprika.errors import PolicyViolationError
from paprika.events import EventType
from paprika.policy import PolicyConfig
from paprika.runtime import PaprikaRuntime
from paprika.trace_store import LocalTraceStore

if TYPE_CHECKING:
    from pathlib import Path

    from paprika.context import PaprikaContext


@pytest.mark.integration
class TestEndToEnd:
    def test_full_agent_run_with_tools(self, tmp_trace_dir: Path) -> None:
        """Full flow: runtime → agent → tool calls → trace on disk."""
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)

        def lookup_customer(email: str) -> dict[str, str]:
            return {"name": "Alice", "email": email, "plan": "premium"}

        def format_response(data: str) -> str:
            return f"Summary: {data}"

        runtime.register_tool("lookup_customer", lookup_customer)
        runtime.register_tool("format_response", format_response)

        @runtime.agent()
        def support_agent(ctx: PaprikaContext, user_input: str) -> str:
            customer = ctx.tools.call(name="lookup_customer", args={"email": "alice@example.com"})
            result = ctx.tools.call(name="format_response", args={"data": str(customer)})
            return result

        result = support_agent("help me with my account")
        assert "Summary:" in result
        assert "Alice" in result

        # Verify trace file
        trace_files = list(tmp_trace_dir.glob("*.json"))
        assert len(trace_files) == 1

        data = json.loads(trace_files[0].read_text())
        assert data["agent_name"] == "support_agent"
        event_types = [e["event_type"] for e in data["events"]]
        assert event_types == [
            "run_start",
            "tool_call_start",
            "tool_call_end",
            "tool_call_start",
            "tool_call_end",
            "run_end",
        ]

    def test_policy_violation_traced(self, tmp_trace_dir: Path) -> None:
        """Policy violation is recorded in the trace."""
        runtime = PaprikaRuntime(
            policy=PolicyConfig(max_steps=1),
            trace_dir=tmp_trace_dir,
        )
        runtime.register_tool("noop", lambda: "ok")

        @runtime.agent()
        def greedy_agent(ctx: PaprikaContext) -> None:
            ctx.tools.call(name="noop", args={})
            ctx.tools.call(name="noop", args={})  # should trigger violation

        with pytest.raises(PolicyViolationError):
            greedy_agent()

        store = LocalTraceStore(base_dir=tmp_trace_dir)
        summaries = store.list_runs()
        trace = store.load(summaries[0].run_id)

        has_violation = any(e.event_type == EventType.POLICY_VIOLATION for e in trace.events)
        assert has_violation

    def test_replay_full_flow(self, tmp_trace_dir: Path) -> None:
        """Run → replay → verify same output without side effects."""
        runtime = PaprikaRuntime(trace_dir=tmp_trace_dir)
        side_effects: list[str] = []

        def impure_tool(action: str) -> str:
            side_effects.append(action)
            return f"did {action}"

        runtime.register_tool("do_thing", impure_tool)

        @runtime.agent()
        def my_agent(ctx: PaprikaContext, task: str) -> Any:
            r1 = ctx.tools.call(name="do_thing", args={"action": "step1"})
            r2 = ctx.tools.call(name="do_thing", args={"action": "step2"})
            return f"{r1}, {r2}"

        # Original run
        result1 = my_agent("go")
        assert result1 == "did step1, did step2"
        assert side_effects == ["step1", "step2"]

        # Get run ID
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        # Most recent is first
        summaries = store.list_runs()
        run_id = summaries[0].run_id

        # Replay
        side_effects.clear()
        result2 = runtime.replay(run_id)
        assert result2 == "did step1, did step2"
        assert side_effects == []  # no side effects during replay
