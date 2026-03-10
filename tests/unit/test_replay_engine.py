"""Tests for the replay engine.

Tests cover:
- native v1 ExecutionRecord inputs
- migrated v0 traces (via load_record pipeline)
- native v1 files (via save_record + load_record pipeline)
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING

import pytest

from paprika.errors import ReplayMismatchError
from paprika.events import (
    LLMCallEndEvent,
    LLMCallStartEvent,
    RunEndEvent,
    RunStartEvent,
    TokenUsage,
    ToolCallEndEvent,
    ToolCallStartEvent,
)
from paprika.execution_record import (
    AgentInfo,
    ExecutionInfo,
    ExecutionRecord,
    LLMCallStep,
    ToolCallStep,
    Totals,
)
from paprika.execution_record import TokenUsage as RecordTokenUsage
from paprika.replay import ReplayEngine
from paprika.trace_store import LocalTraceStore, Trace

if TYPE_CHECKING:
    from pathlib import Path

_NOW = datetime(2025, 1, 1, 12, 0, 0, tzinfo=UTC)


# ---------------------------------------------------------------------------
# Helpers for building v1 ExecutionRecord directly
# ---------------------------------------------------------------------------


def _make_record_with_llm_call() -> ExecutionRecord:
    return ExecutionRecord(
        record_id="original-run",
        agent=AgentInfo(name="test_agent"),
        execution=ExecutionInfo(started_at=_NOW, status="success"),
        totals=Totals(step_count=1, llm_calls=1, total_tokens=15),
        steps=[
            LLMCallStep(
                step_index=1,
                timestamp=_NOW,
                provider="openai",
                model="gpt-4",
                input_data={"messages": [{"role": "user", "content": "hello"}]},
                input_hash="abcdef1234567890",
                output_data={"choices": [{"message": {"content": "Hi there!"}}]},
                token_usage=RecordTokenUsage(
                    prompt_tokens=10, completion_tokens=5, total_tokens=15,
                ),
                duration_ms=100.0,
            ),
        ],
        input={"args": ["hello"], "kwargs": {}},
    )


def _make_record_with_tool_call() -> ExecutionRecord:
    return ExecutionRecord(
        record_id="original-run",
        agent=AgentInfo(name="test_agent"),
        execution=ExecutionInfo(started_at=_NOW, status="success"),
        totals=Totals(step_count=1, tool_calls=1),
        steps=[
            ToolCallStep(
                step_index=1,
                timestamp=_NOW,
                tool_name="lookup",
                args={"email": "test@example.com"},
                input_hash="1234567890abcdef",
                output_data={"name": "Test User"},
                duration_ms=50.0,
            ),
        ],
    )


# ---------------------------------------------------------------------------
# Helpers for building v0 Trace objects
# ---------------------------------------------------------------------------


def _make_v0_trace_with_llm_call() -> Trace:
    trace = Trace(run_id="original-run", agent_name="test_agent")
    trace.events = [
        RunStartEvent(run_id="original-run", step_index=0, agent_name="test_agent"),
        LLMCallStartEvent(
            run_id="original-run",
            step_index=1,
            provider="openai",
            model="gpt-4",
            input_data={"messages": [{"role": "user", "content": "hello"}]},
            input_hash="abcdef1234567890",
        ),
        LLMCallEndEvent(
            run_id="original-run",
            step_index=1,
            output_data={"choices": [{"message": {"content": "Hi there!"}}]},
            token_usage=TokenUsage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
            duration_ms=100.0,
        ),
        RunEndEvent(run_id="original-run", step_index=1, status="success"),
    ]
    return trace


def _make_v0_trace_with_tool_call() -> Trace:
    trace = Trace(run_id="original-run", agent_name="test_agent")
    trace.events = [
        RunStartEvent(run_id="original-run", step_index=0, agent_name="test_agent"),
        ToolCallStartEvent(
            run_id="original-run",
            step_index=1,
            tool_name="lookup",
            args={"email": "test@example.com"},
            input_hash="1234567890abcdef",
        ),
        ToolCallEndEvent(
            run_id="original-run",
            step_index=1,
            output_data={"name": "Test User"},
            duration_ms=50.0,
        ),
        RunEndEvent(run_id="original-run", step_index=1, status="success"),
    ]
    return trace


# ---------------------------------------------------------------------------
# Core replay engine tests (native v1 ExecutionRecord)
# ---------------------------------------------------------------------------


class TestReplayEngineFromRecord:
    def test_get_llm_stub(self) -> None:
        engine = ReplayEngine(_make_record_with_llm_call())
        result = engine.get_llm_stub(1, "abcdef1234567890")
        assert result == {"choices": [{"message": {"content": "Hi there!"}}]}

    def test_get_tool_stub(self) -> None:
        engine = ReplayEngine(_make_record_with_tool_call())
        result = engine.get_tool_stub(1, "1234567890abcdef")
        assert result == {"name": "Test User"}

    def test_llm_hash_mismatch_raises(self) -> None:
        engine = ReplayEngine(_make_record_with_llm_call())
        with pytest.raises(ReplayMismatchError, match="input_hash"):
            engine.get_llm_stub(1, "different_hash_val")

    def test_tool_hash_mismatch_raises(self) -> None:
        engine = ReplayEngine(_make_record_with_tool_call())
        with pytest.raises(ReplayMismatchError, match="input_hash"):
            engine.get_tool_stub(1, "different_hash_val")

    def test_missing_llm_step_raises(self) -> None:
        engine = ReplayEngine(_make_record_with_llm_call())
        with pytest.raises(ReplayMismatchError, match="no recorded llm_call"):
            engine.get_llm_stub(99, "any_hash")

    def test_missing_tool_step_raises(self) -> None:
        engine = ReplayEngine(_make_record_with_tool_call())
        with pytest.raises(ReplayMismatchError, match="no recorded tool_call"):
            engine.get_tool_stub(99, "any_hash")

    def test_multiple_steps(self) -> None:
        record = ExecutionRecord(
            record_id="multi-run",
            agent=AgentInfo(name="test_agent"),
            execution=ExecutionInfo(started_at=_NOW, status="success"),
            totals=Totals(step_count=2, llm_calls=1, tool_calls=1),
            steps=[
                LLMCallStep(
                    step_index=1, timestamp=_NOW, provider="openai", model="gpt-4",
                    input_data={}, input_hash="llm_hash",
                    output_data={"response": "ok"}, duration_ms=10.0,
                ),
                ToolCallStep(
                    step_index=2, timestamp=_NOW, tool_name="search",
                    args={"q": "test"}, input_hash="tool_hash",
                    output_data=["result1"], duration_ms=5.0,
                ),
            ],
        )
        engine = ReplayEngine(record)
        assert engine.get_llm_stub(1, "llm_hash") == {"response": "ok"}
        assert engine.get_tool_stub(2, "tool_hash") == ["result1"]

    def test_step_without_output_not_stubbed(self) -> None:
        """Steps with output_data=None should not produce stubs."""
        record = ExecutionRecord(
            record_id="no-output-run",
            agent=AgentInfo(name="test_agent"),
            execution=ExecutionInfo(started_at=_NOW, status="error"),
            totals=Totals(step_count=1, llm_calls=1),
            steps=[
                LLMCallStep(
                    step_index=1, timestamp=_NOW, provider="openai", model="gpt-4",
                    input_data={}, input_hash="h1",
                    output_data=None,
                ),
            ],
        )
        engine = ReplayEngine(record)
        with pytest.raises(ReplayMismatchError, match="no recorded llm_call"):
            engine.get_llm_stub(1, "h1")


# ---------------------------------------------------------------------------
# Replay engine from migrated v0 trace (via load_record pipeline)
# ---------------------------------------------------------------------------


class TestReplayEngineFromMigratedV0:
    """Verify that saving a v0 Trace, loading via load_record(), and
    feeding the migrated ExecutionRecord to ReplayEngine works correctly."""

    def test_llm_stub_from_migrated_v0(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_v0_trace_with_llm_call())
        record = store.load_record("original-run")
        engine = ReplayEngine(record)
        result = engine.get_llm_stub(1, "abcdef1234567890")
        assert result == {"choices": [{"message": {"content": "Hi there!"}}]}

    def test_tool_stub_from_migrated_v0(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_v0_trace_with_tool_call())
        record = store.load_record("original-run")
        engine = ReplayEngine(record)
        result = engine.get_tool_stub(1, "1234567890abcdef")
        assert result == {"name": "Test User"}

    def test_hash_mismatch_from_migrated_v0(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_v0_trace_with_llm_call())
        record = store.load_record("original-run")
        engine = ReplayEngine(record)
        with pytest.raises(ReplayMismatchError, match="input_hash"):
            engine.get_llm_stub(1, "wrong_hash")


# ---------------------------------------------------------------------------
# Replay engine from native v1 file (via save_record + load_record pipeline)
# ---------------------------------------------------------------------------


class TestReplayEngineFromNativeV1:
    """Verify that saving a v1 ExecutionRecord, loading via load_record(),
    and feeding it to ReplayEngine works correctly."""

    def test_llm_stub_from_v1_file(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save_record(_make_record_with_llm_call())
        record = store.load_record("original-run")
        engine = ReplayEngine(record)
        result = engine.get_llm_stub(1, "abcdef1234567890")
        assert result == {"choices": [{"message": {"content": "Hi there!"}}]}

    def test_tool_stub_from_v1_file(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save_record(_make_record_with_tool_call())
        record = store.load_record("original-run")
        engine = ReplayEngine(record)
        result = engine.get_tool_stub(1, "1234567890abcdef")
        assert result == {"name": "Test User"}
