"""Tests for UI ExecutionRecord transforms."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from paprika.execution_record import (
    AgentInfo,
    ExecutionInfo,
    ExecutionRecord,
    LLMCallStep,
    PolicyViolationStep,
    TokenUsage,
    ToolCallStep,
    Totals,
)
from paprika.ui.transforms import record_to_detail, record_to_summary

_NOW = datetime(2025, 1, 15, 10, 0, 0, tzinfo=UTC)
_RUN_ID = "test-run-001"


def _base_record(
    *,
    agent_name: str = "test_agent",
    status: str = "success",
    total_tokens: int = 100,
    steps: list | None = None,
) -> ExecutionRecord:
    """Create a minimal ExecutionRecord."""
    step_list = steps or []
    llm_calls = sum(1 for s in step_list if isinstance(s, LLMCallStep))
    tool_calls = sum(1 for s in step_list if isinstance(s, ToolCallStep))
    return ExecutionRecord(
        record_id=_RUN_ID,
        agent=AgentInfo(name=agent_name),
        execution=ExecutionInfo(
            started_at=_NOW,
            ended_at=_NOW + timedelta(seconds=2),
            duration_ms=2000.0,
            status=status,
        ),
        totals=Totals(
            step_count=llm_calls + tool_calls,
            llm_calls=llm_calls,
            tool_calls=tool_calls,
            total_tokens=total_tokens,
        ),
        steps=step_list,
        input={"args": ["hello"], "kwargs": {}},
        output="done",
    )


class TestBuildTimeline:
    def test_empty_record_produces_bookend_steps(self) -> None:
        record = _base_record()
        result = record_to_detail(record)

        steps = result["steps"]
        assert len(steps) == 2
        assert steps[0]["type"] == "run_start"
        assert steps[0]["label"] == "test_agent"
        assert steps[1]["type"] == "run_end"
        assert steps[1]["label"] == "success"

    def test_llm_call_step(self) -> None:
        llm = LLMCallStep(
            step_index=1,
            timestamp=_NOW + timedelta(milliseconds=100),
            provider="openai",
            model="gpt-4",
            input_data={"messages": [{"role": "user", "content": "hi"}]},
            input_hash="abc123def456",
            output_data={"choices": [{"message": {"content": "hello"}}]},
            token_usage=TokenUsage(
                prompt_tokens=10, completion_tokens=5, total_tokens=15,
            ),
            duration_ms=400.0,
        )
        record = _base_record(steps=[llm])
        result = record_to_detail(record)
        steps = result["steps"]

        # run_start, llm_call, run_end
        assert len(steps) == 3
        llm_step = steps[1]
        assert llm_step["type"] == "llm_call"
        assert llm_step["step_index"] == 1
        assert llm_step["label"] == "gpt-4"
        assert llm_step["duration_ms"] == 400.0
        assert llm_step["tokens"] == 15

        detail = llm_step["detail"]
        assert detail["provider"] == "openai"
        assert detail["model"] == "gpt-4"
        assert detail["input_hash"] == "abc123def456"
        assert detail["input_data"] == {"messages": [{"role": "user", "content": "hi"}]}
        assert detail["output_data"] == {"choices": [{"message": {"content": "hello"}}]}
        assert detail["token_usage"]["prompt_tokens"] == 10
        assert detail["token_usage"]["completion_tokens"] == 5

    def test_tool_call_step(self) -> None:
        tool = ToolCallStep(
            step_index=1,
            timestamp=_NOW + timedelta(milliseconds=100),
            tool_name="search_db",
            args={"query": "test"},
            input_hash="hash1234567890",
            output_data={"results": ["item1"]},
            duration_ms=100.0,
        )
        record = _base_record(steps=[tool])
        result = record_to_detail(record)
        steps = result["steps"]

        assert len(steps) == 3
        tool_step = steps[1]
        assert tool_step["type"] == "tool_call"
        assert tool_step["step_index"] == 1
        assert tool_step["label"] == "search_db"
        assert tool_step["duration_ms"] == 100.0

        detail = tool_step["detail"]
        assert detail["tool_name"] == "search_db"
        assert detail["input_hash"] == "hash1234567890"
        assert detail["args"] == {"query": "test"}
        assert detail["output_data"] == {"results": ["item1"]}

    def test_policy_violation_step(self) -> None:
        violation = PolicyViolationStep(
            step_index=1,
            timestamp=_NOW + timedelta(milliseconds=500),
            policy_name="max_steps",
            message="Exceeded maximum step count of 5",
            details={"limit": 5, "actual": 6},
        )
        record = _base_record(status="policy_violation", steps=[violation])
        result = record_to_detail(record)
        steps = result["steps"]

        assert len(steps) == 3
        violation_step = steps[1]
        assert violation_step["type"] == "policy_violation"
        assert violation_step["step_index"] == 1
        assert violation_step["label"] == "max_steps"

        detail = violation_step["detail"]
        assert detail["policy_name"] == "max_steps"
        assert detail["message"] == "Exceeded maximum step count of 5"
        assert detail["details"] == {"limit": 5, "actual": 6}

    def test_multiple_steps_preserve_order(self) -> None:
        steps = [
            ToolCallStep(
                step_index=1, timestamp=_NOW, tool_name="tool_a",
                args={}, input_hash="h1",
            ),
            LLMCallStep(
                step_index=2, timestamp=_NOW, provider="openai", model="gpt-4",
                input_data={"messages": []}, input_hash="h2",
                token_usage=TokenUsage(total_tokens=20), duration_ms=50.0,
            ),
        ]
        record = _base_record(steps=steps)
        result = record_to_detail(record)
        timeline = result["steps"]

        assert len(timeline) == 4
        assert timeline[0]["type"] == "run_start"
        assert timeline[1]["type"] == "tool_call"
        assert timeline[1]["step_index"] == 1
        assert timeline[2]["type"] == "llm_call"
        assert timeline[2]["step_index"] == 2
        assert timeline[3]["type"] == "run_end"


class TestSummaryFields:
    def test_run_detail_summary_fields(self) -> None:
        record = _base_record()
        result = record_to_detail(record)
        summary = result["summary"]

        assert summary["run_id"] == _RUN_ID
        assert summary["agent_name"] == "test_agent"
        assert summary["started_at"] == _NOW.isoformat()
        assert summary["ended_at"] == (_NOW + timedelta(seconds=2)).isoformat()
        assert summary["duration_ms"] == 2000.0
        assert summary["status"] == "success"
        assert summary["step_count"] == 0  # no LLM/tool steps
        assert summary["replay_of"] is None

    def test_replay_of_exposed(self) -> None:
        record = _base_record()
        record.replay_of = "original-run-123"

        result = record_to_detail(record)
        assert result["summary"]["replay_of"] == "original-run-123"

    def test_step_count_from_totals(self) -> None:
        steps = [
            LLMCallStep(
                step_index=1, timestamp=_NOW, provider="openai", model="gpt-4",
                input_data={}, input_hash="h1",
            ),
            ToolCallStep(
                step_index=2, timestamp=_NOW, tool_name="tool_a",
                args={}, input_hash="h2",
            ),
        ]
        record = _base_record(steps=steps)
        result = record_to_detail(record)
        assert result["summary"]["step_count"] == 2

    def test_duration_none_when_no_ended_at(self) -> None:
        record = _base_record()
        record.execution.ended_at = None
        record.execution.duration_ms = None
        result = record_to_detail(record)
        assert result["summary"]["duration_ms"] is None

    def test_total_tokens_from_totals(self) -> None:
        record = _base_record(total_tokens=42)
        result = record_to_detail(record)
        assert result["summary"]["total_tokens"] == 42

    def test_total_tokens_zero_when_empty(self) -> None:
        record = _base_record(total_tokens=0)
        result = record_to_detail(record)
        assert result["summary"]["total_tokens"] == 0


class TestRecordToSummary:
    def test_includes_expected_fields(self) -> None:
        record = _base_record(total_tokens=42)
        result = record_to_summary(record)
        assert result["total_tokens"] == 42
        assert result["run_id"] == _RUN_ID
        assert result["agent_name"] == "test_agent"
        assert result["status"] == "success"

    def test_replay_of(self) -> None:
        record = _base_record()
        record.replay_of = "orig-run"
        result = record_to_summary(record)
        assert result["replay_of"] == "orig-run"

    def test_no_replay_of(self) -> None:
        record = _base_record()
        result = record_to_summary(record)
        assert result["replay_of"] is None
