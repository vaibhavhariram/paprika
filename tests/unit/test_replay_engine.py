"""Tests for the replay engine."""

from __future__ import annotations

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
from paprika.replay import ReplayEngine
from paprika.trace_store import Trace


def _make_trace_with_llm_call() -> Trace:
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


def _make_trace_with_tool_call() -> Trace:
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


class TestReplayEngine:
    def test_get_llm_stub(self) -> None:
        engine = ReplayEngine(_make_trace_with_llm_call())
        result = engine.get_llm_stub(1, "abcdef1234567890")
        assert result == {"choices": [{"message": {"content": "Hi there!"}}]}

    def test_get_tool_stub(self) -> None:
        engine = ReplayEngine(_make_trace_with_tool_call())
        result = engine.get_tool_stub(1, "1234567890abcdef")
        assert result == {"name": "Test User"}

    def test_llm_hash_mismatch_raises(self) -> None:
        engine = ReplayEngine(_make_trace_with_llm_call())
        with pytest.raises(ReplayMismatchError, match="input_hash"):
            engine.get_llm_stub(1, "different_hash_val")

    def test_tool_hash_mismatch_raises(self) -> None:
        engine = ReplayEngine(_make_trace_with_tool_call())
        with pytest.raises(ReplayMismatchError, match="input_hash"):
            engine.get_tool_stub(1, "different_hash_val")

    def test_missing_step_raises(self) -> None:
        engine = ReplayEngine(_make_trace_with_llm_call())
        with pytest.raises(ReplayMismatchError, match="no recorded llm_call"):
            engine.get_llm_stub(99, "any_hash")

    def test_missing_tool_step_raises(self) -> None:
        engine = ReplayEngine(_make_trace_with_tool_call())
        with pytest.raises(ReplayMismatchError, match="no recorded tool_call"):
            engine.get_tool_stub(99, "any_hash")
