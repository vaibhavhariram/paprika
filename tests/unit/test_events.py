"""Tests for event schemas and input hashing."""

from __future__ import annotations

from paprika.events import (
    EventType,
    LLMCallEndEvent,
    LLMCallStartEvent,
    RunEndEvent,
    RunStartEvent,
    TokenUsage,
    ToolCallEndEvent,
    ToolCallStartEvent,
    compute_input_hash,
)


class TestComputeInputHash:
    def test_deterministic(self) -> None:
        data = {"model": "gpt-4", "messages": [{"role": "user", "content": "hello"}]}
        assert compute_input_hash(data) == compute_input_hash(data)

    def test_key_order_independent(self) -> None:
        a = {"b": 2, "a": 1}
        b = {"a": 1, "b": 2}
        assert compute_input_hash(a) == compute_input_hash(b)

    def test_nested_key_order_independent(self) -> None:
        a = {"outer": {"z": 3, "a": 1}}
        b = {"outer": {"a": 1, "z": 3}}
        assert compute_input_hash(a) == compute_input_hash(b)

    def test_different_data_different_hash(self) -> None:
        a = {"key": "value1"}
        b = {"key": "value2"}
        assert compute_input_hash(a) != compute_input_hash(b)

    def test_returns_16_char_hex(self) -> None:
        result = compute_input_hash({"test": True})
        assert len(result) == 16
        assert all(c in "0123456789abcdef" for c in result)


class TestEventSerialization:
    def test_run_start_round_trip(self) -> None:
        event = RunStartEvent(
            run_id="test-run",
            step_index=0,
            agent_name="my_agent",
            input_args={"user_input": "hello"},
        )
        json_str = event.model_dump_json()
        restored = RunStartEvent.model_validate_json(json_str)
        assert restored.run_id == "test-run"
        assert restored.agent_name == "my_agent"
        assert restored.event_type == EventType.RUN_START

    def test_run_end_round_trip(self) -> None:
        event = RunEndEvent(
            run_id="test-run",
            step_index=3,
            status="success",
            output={"result": "done"},
            total_tokens=150,
        )
        json_str = event.model_dump_json()
        restored = RunEndEvent.model_validate_json(json_str)
        assert restored.status == "success"
        assert restored.total_tokens == 150

    def test_llm_call_events_round_trip(self) -> None:
        start = LLMCallStartEvent(
            run_id="test-run",
            step_index=1,
            provider="openai",
            model="gpt-4",
            input_data={"messages": [{"role": "user", "content": "hi"}]},
            input_hash="abc123def456abcd",
        )
        end = LLMCallEndEvent(
            run_id="test-run",
            step_index=1,
            output_data={"choices": [{"message": {"content": "hello"}}]},
            token_usage=TokenUsage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
            duration_ms=123.45,
        )
        start_restored = LLMCallStartEvent.model_validate_json(start.model_dump_json())
        end_restored = LLMCallEndEvent.model_validate_json(end.model_dump_json())
        assert start_restored.provider == "openai"
        assert end_restored.token_usage is not None
        assert end_restored.token_usage.total_tokens == 15

    def test_tool_call_events_round_trip(self) -> None:
        start = ToolCallStartEvent(
            run_id="test-run",
            step_index=2,
            tool_name="lookup",
            args={"email": "test@example.com"},
            input_hash="1234567890abcdef",
        )
        end = ToolCallEndEvent(
            run_id="test-run",
            step_index=2,
            output_data={"name": "Test User"},
            duration_ms=50.0,
        )
        start_restored = ToolCallStartEvent.model_validate_json(start.model_dump_json())
        end_restored = ToolCallEndEvent.model_validate_json(end.model_dump_json())
        assert start_restored.tool_name == "lookup"
        assert end_restored.output_data == {"name": "Test User"}
