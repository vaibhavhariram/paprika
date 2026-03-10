"""Tests for ExecutionRecord models, v0-to-v1 migration, and dual-read compatibility."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import TYPE_CHECKING

import pytest

from paprika.events import (
    LLMCallEndEvent,
    LLMCallStartEvent,
    RunEndEvent,
    RunStartEvent,
    ToolCallEndEvent,
    ToolCallStartEvent,
)
from paprika.execution_record import (
    SCHEMA_VERSION,
    AgentInfo,
    ExecutionInfo,
    ExecutionRecord,
    LLMCallStep,
    PolicyViolationStep,
    TokenUsage,
    ToolCallStep,
    Totals,
)
from paprika.migration import (
    UnsupportedSchemaVersionError,
    detect_schema_version,
    migrate_v0_to_v1,
    validate_schema_version,
)
from paprika.trace_store import LocalTraceStore, Trace

if TYPE_CHECKING:
    from pathlib import Path


# ---------------------------------------------------------------------------
# ExecutionRecord model tests
# ---------------------------------------------------------------------------


class TestExecutionRecordModel:
    def test_round_trip_json(self) -> None:
        record = ExecutionRecord(
            record_id="test-1",
            agent=AgentInfo(name="my_agent"),
            execution=ExecutionInfo(
                started_at=datetime(2025, 1, 1, tzinfo=UTC),
                status="success",
            ),
            totals=Totals(step_count=1, llm_calls=1, total_tokens=100),
            steps=[
                LLMCallStep(
                    step_index=1,
                    timestamp=datetime(2025, 1, 1, tzinfo=UTC),
                    provider="openai",
                    model="gpt-4",
                    input_data={"messages": []},
                    input_hash="abc123",
                    token_usage=TokenUsage(
                        prompt_tokens=50, completion_tokens=50, total_tokens=100
                    ),
                ),
            ],
        )
        json_str = record.model_dump_json_pretty()
        restored = ExecutionRecord.from_json(json_str)
        assert restored.record_id == "test-1"
        assert restored.agent.name == "my_agent"
        assert restored.totals.total_tokens == 100
        assert len(restored.steps) == 1

    def test_schema_version_default(self) -> None:
        record = ExecutionRecord(
            record_id="r1",
            agent=AgentInfo(name="a"),
            execution=ExecutionInfo(
                started_at=datetime(2025, 1, 1, tzinfo=UTC), status="success"
            ),
        )
        assert record.schema_version == SCHEMA_VERSION

    def test_extra_fields_ignored(self) -> None:
        """ExecutionRecord should ignore unknown fields (model_config extra=ignore)."""
        data = {
            "schema_version": "1.0",
            "record_id": "r1",
            "agent": {"name": "a"},
            "execution": {"started_at": "2025-01-01T00:00:00Z", "status": "success"},
            "unknown_field": "should be ignored",
        }
        record = ExecutionRecord.model_validate(data)
        assert record.record_id == "r1"


# ---------------------------------------------------------------------------
# detect_schema_version tests
# ---------------------------------------------------------------------------


class TestDetectSchemaVersion:
    def test_v0_no_version_field(self) -> None:
        assert detect_schema_version({"run_id": "x", "events": []}) == "0.0"

    def test_v1_version_field(self) -> None:
        assert detect_schema_version({"schema_version": "1.0"}) == "1.0"

    def test_future_version(self) -> None:
        assert detect_schema_version({"schema_version": "99.0"}) == "99.0"


# ---------------------------------------------------------------------------
# validate_schema_version tests
# ---------------------------------------------------------------------------


class TestValidateSchemaVersion:
    def test_v1_passes(self) -> None:
        validate_schema_version("1.0")

    def test_v1_minor_passes(self) -> None:
        validate_schema_version("1.5")

    def test_v0_passes(self) -> None:
        validate_schema_version("0.0")

    def test_unsupported_major_raises(self) -> None:
        with pytest.raises(UnsupportedSchemaVersionError, match="99.0"):
            validate_schema_version("99.0")


# ---------------------------------------------------------------------------
# migrate_v0_to_v1 tests
# ---------------------------------------------------------------------------


def _make_v0_trace_data(
    *,
    run_id: str = "run-v0",
    agent_name: str = "test_agent",
    with_llm: bool = False,
    with_tool: bool = False,
    with_violation: bool = False,
) -> dict:
    """Build a v0-format trace dict for testing migration."""
    now = datetime(2025, 1, 1, 12, 0, 0, tzinfo=UTC)
    events = [
        {
            "event_type": "run_start",
            "run_id": run_id,
            "step_index": 0,
            "timestamp": now.isoformat(),
            "event_id": "evt-start",
            "agent_name": agent_name,
            "input_args": {"query": "hello"},
        },
    ]

    if with_llm:
        events.extend([
            {
                "event_type": "llm_call_start",
                "run_id": run_id,
                "step_index": 1,
                "timestamp": now.isoformat(),
                "event_id": "evt-llm-s",
                "provider": "openai",
                "model": "gpt-4",
                "input_data": {"messages": [{"role": "user", "content": "hi"}]},
                "input_hash": "hash1",
            },
            {
                "event_type": "llm_call_end",
                "run_id": run_id,
                "step_index": 1,
                "timestamp": now.isoformat(),
                "event_id": "evt-llm-e",
                "output_data": {"content": "hello there"},
                "token_usage": {
                    "prompt_tokens": 10,
                    "completion_tokens": 5,
                    "total_tokens": 15,
                },
                "duration_ms": 200.0,
            },
        ])

    if with_tool:
        events.append({
            "event_type": "tool_call_start",
            "run_id": run_id,
            "step_index": 2,
            "timestamp": now.isoformat(),
            "event_id": "evt-tool-s",
            "tool_name": "search",
            "args": {"q": "test"},
            "input_hash": "hash2",
        })
        events.append({
            "event_type": "tool_call_end",
            "run_id": run_id,
            "step_index": 2,
            "timestamp": now.isoformat(),
            "event_id": "evt-tool-e",
            "output_data": {"results": [1, 2, 3]},
            "duration_ms": 50.0,
        })

    if with_violation:
        events.append({
            "event_type": "policy_violation",
            "run_id": run_id,
            "step_index": 3,
            "timestamp": now.isoformat(),
            "event_id": "evt-viol",
            "policy_name": "max_steps",
            "message": "too many steps",
            "details": {"limit": 10},
        })

    events.append({
        "event_type": "run_end",
        "run_id": run_id,
        "step_index": 0,
        "timestamp": now.isoformat(),
        "event_id": "evt-end",
        "status": "success",
        "output": "done",
        "total_tokens": 15,
    })

    return {
        "run_id": run_id,
        "agent_name": agent_name,
        "started_at": now.isoformat(),
        "ended_at": now.isoformat(),
        "events": events,
        "metadata": {},
    }


class TestMigrateV0ToV1:
    def test_basic_migration(self) -> None:
        data = _make_v0_trace_data()
        record = migrate_v0_to_v1(data)
        assert isinstance(record, ExecutionRecord)
        assert record.schema_version == SCHEMA_VERSION
        assert record.record_id == "run-v0"
        assert record.agent.name == "test_agent"
        assert record.execution.status == "success"

    def test_llm_call_migration(self) -> None:
        data = _make_v0_trace_data(with_llm=True)
        record = migrate_v0_to_v1(data)
        llm_steps = [s for s in record.steps if isinstance(s, LLMCallStep)]
        assert len(llm_steps) == 1
        step = llm_steps[0]
        assert step.provider == "openai"
        assert step.model == "gpt-4"
        assert step.token_usage is not None
        assert step.token_usage.total_tokens == 15
        assert step.duration_ms == 200.0

    def test_tool_call_migration(self) -> None:
        data = _make_v0_trace_data(with_tool=True)
        record = migrate_v0_to_v1(data)
        tool_steps = [s for s in record.steps if isinstance(s, ToolCallStep)]
        assert len(tool_steps) == 1
        step = tool_steps[0]
        assert step.tool_name == "search"
        assert step.args == {"q": "test"}
        assert step.duration_ms == 50.0

    def test_policy_violation_migration(self) -> None:
        data = _make_v0_trace_data(with_violation=True)
        record = migrate_v0_to_v1(data)
        violation_steps = [s for s in record.steps if isinstance(s, PolicyViolationStep)]
        assert len(violation_steps) == 1
        assert violation_steps[0].policy_name == "max_steps"
        # Also sets policy.violation at the record level
        assert record.policy.violation is not None
        assert record.policy.violation.policy_name == "max_steps"

    def test_totals_computed(self) -> None:
        data = _make_v0_trace_data(with_llm=True, with_tool=True)
        record = migrate_v0_to_v1(data)
        assert record.totals.llm_calls == 1
        assert record.totals.tool_calls == 1
        assert record.totals.step_count == 2
        assert record.totals.total_tokens == 15
        assert record.totals.prompt_tokens == 10
        assert record.totals.completion_tokens == 5

    def test_token_fallback_to_run_end(self) -> None:
        """When no LLM events have token data, fall back to RunEndEvent.total_tokens."""
        data = _make_v0_trace_data()
        # No LLM events, but run_end has total_tokens=15
        record = migrate_v0_to_v1(data)
        assert record.totals.total_tokens == 15

    def test_replay_of_preserved(self) -> None:
        data = _make_v0_trace_data()
        data["metadata"] = {"replay_of": "original-run-id"}
        record = migrate_v0_to_v1(data)
        assert record.replay_of == "original-run-id"

    def test_steps_sorted_by_index(self) -> None:
        data = _make_v0_trace_data(with_llm=True, with_tool=True, with_violation=True)
        record = migrate_v0_to_v1(data)
        indices = [s.step_index for s in record.steps]
        assert indices == sorted(indices)


# ---------------------------------------------------------------------------
# Dual-read compatibility tests
# ---------------------------------------------------------------------------


def _make_v0_trace(run_id: str = "run-v0", agent_name: str = "test_agent") -> Trace:
    """Create a v0 Trace object for saving."""
    trace = Trace(run_id=run_id, agent_name=agent_name)
    trace.events.append(
        RunStartEvent(
            run_id=run_id,
            step_index=0,
            agent_name=agent_name,
            input_args={"input": "hello"},
        )
    )
    trace.events.append(
        RunEndEvent(
            run_id=run_id,
            step_index=0,
            status="success",
            output="done",
        )
    )
    return trace


def _make_v1_record(record_id: str = "run-v1", agent_name: str = "test_agent") -> ExecutionRecord:
    """Create a v1 ExecutionRecord for saving."""
    return ExecutionRecord(
        record_id=record_id,
        agent=AgentInfo(name=agent_name),
        execution=ExecutionInfo(
            started_at=datetime(2025, 1, 1, tzinfo=UTC),
            status="success",
        ),
        totals=Totals(step_count=1, llm_calls=1, total_tokens=100),
        steps=[
            LLMCallStep(
                step_index=1,
                timestamp=datetime(2025, 1, 1, tzinfo=UTC),
                provider="openai",
                model="gpt-4",
                input_data={"messages": []},
                input_hash="abc123",
                token_usage=TokenUsage(
                    prompt_tokens=50, completion_tokens=50, total_tokens=100
                ),
            ),
        ],
    )


class TestDualReadCompatibility:
    """Tests that LocalTraceStore can read both v0 and v1 files."""

    def test_load_v0_trace(self, tmp_trace_dir: Path) -> None:
        """load() returns Trace for v0 files."""
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_v0_trace("run-v0"))
        trace = store.load("run-v0")
        assert isinstance(trace, Trace)
        assert trace.run_id == "run-v0"

    def test_load_record_from_v0(self, tmp_trace_dir: Path) -> None:
        """load_record() migrates v0 to ExecutionRecord."""
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_v0_trace("run-v0"))
        record = store.load_record("run-v0")
        assert isinstance(record, ExecutionRecord)
        assert record.record_id == "run-v0"
        assert record.agent.name == "test_agent"
        assert record.execution.status == "success"

    def test_load_record_from_v1(self, tmp_trace_dir: Path) -> None:
        """load_record() parses v1 ExecutionRecord directly."""
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save_record(_make_v1_record("run-v1"))
        record = store.load_record("run-v1")
        assert isinstance(record, ExecutionRecord)
        assert record.record_id == "run-v1"
        assert record.totals.total_tokens == 100

    def test_save_record_creates_file(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        path = store.save_record(_make_v1_record("run-v1"))
        assert path.exists()
        assert path.name == "run-v1.json"
        data = json.loads(path.read_text())
        assert data["schema_version"] == "1.0"

    def test_save_record_round_trip(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        original = _make_v1_record("run-v1")
        store.save_record(original)
        loaded = store.load_record("run-v1")
        assert loaded.record_id == original.record_id
        assert loaded.totals.total_tokens == original.totals.total_tokens
        assert len(loaded.steps) == len(original.steps)

    def test_list_runs_v0_only(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_v0_trace("run-v0"))
        summaries = store.list_runs()
        assert len(summaries) == 1
        assert summaries[0].run_id == "run-v0"
        assert summaries[0].status == "success"

    def test_list_runs_v1_only(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save_record(_make_v1_record("run-v1"))
        summaries = store.list_runs()
        assert len(summaries) == 1
        assert summaries[0].run_id == "run-v1"
        assert summaries[0].agent_name == "test_agent"
        assert summaries[0].status == "success"
        assert summaries[0].step_count == 1

    def test_list_runs_mixed_v0_and_v1(self, tmp_trace_dir: Path) -> None:
        """list_runs() handles a directory with both v0 and v1 files."""
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_v0_trace("run-v0"))
        store.save_record(_make_v1_record("run-v1"))
        summaries = store.list_runs()
        assert len(summaries) == 2
        run_ids = {s.run_id for s in summaries}
        assert run_ids == {"run-v0", "run-v1"}

    def test_load_record_prefix_match(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save_record(_make_v1_record("abc12345-unique"))
        record = store.load_record("abc12345")
        assert record.record_id == "abc12345-unique"

    def test_load_record_not_found(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(Exception, match="not found|Trace"):
            store.load_record("nonexistent")

    def test_load_record_rejects_unsupported_version(self, tmp_trace_dir: Path) -> None:
        """load_record() raises for unsupported future schema versions."""
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        path = tmp_trace_dir / "future-run.json"
        path.write_text(json.dumps({
            "schema_version": "99.0",
            "record_id": "future-run",
            "agent": {"name": "a"},
            "execution": {"started_at": "2025-01-01T00:00:00Z", "status": "success"},
        }))
        with pytest.raises(UnsupportedSchemaVersionError):
            store.load_record("future-run")
