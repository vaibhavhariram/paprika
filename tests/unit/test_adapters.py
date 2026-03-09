"""Tests for LLM and tool adapters."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import pytest

from paprika.adapters.llm import LLMAdapter
from paprika.adapters.tools import ToolAdapter

if TYPE_CHECKING:
    from paprika.events import TokenUsage


class MockLLMHook:
    """Mock runtime hook for testing the LLM adapter."""

    def __init__(self, stub_output: dict[str, Any] | None = None) -> None:
        self.stub_output = stub_output
        self.pre_calls: list[dict[str, Any]] = []
        self.post_calls: list[dict[str, Any]] = []

    def pre_llm_call(
        self,
        provider: str,
        model: str,
        input_data: dict[str, Any],
        input_hash: str,
    ) -> dict[str, Any] | None:
        self.pre_calls.append(
            {"provider": provider, "model": model, "input_data": input_data, "hash": input_hash}
        )
        return self.stub_output

    def post_llm_call(
        self,
        output: dict[str, Any],
        token_usage: TokenUsage | None,
        duration_ms: float,
    ) -> None:
        self.post_calls.append(
            {"output": output, "token_usage": token_usage, "duration_ms": duration_ms}
        )


class MockToolHook:
    """Mock runtime hook for testing the tool adapter."""

    def __init__(self, stub_output: Any = None) -> None:
        self.stub_output = stub_output
        self.pre_calls: list[dict[str, Any]] = []
        self.post_calls: list[dict[str, Any]] = []

    def pre_tool_call(
        self,
        name: str,
        args: dict[str, Any],
        input_hash: str,
    ) -> Any:
        self.pre_calls.append({"name": name, "args": args, "hash": input_hash})
        return self.stub_output

    def post_tool_call(self, output: Any, duration_ms: float) -> None:
        self.post_calls.append({"output": output, "duration_ms": duration_ms})


class TestLLMAdapter:
    def test_stub_output_skips_real_call(self) -> None:
        stub = {"choices": [{"message": {"content": "stubbed"}}]}
        hook = MockLLMHook(stub_output=stub)
        adapter = LLMAdapter(runtime_hook=hook)

        result = adapter.call(
            provider="openai",
            model="gpt-4",
            input={"messages": [{"role": "user", "content": "hello"}]},
        )

        assert result == stub
        assert len(hook.pre_calls) == 1
        assert len(hook.post_calls) == 1
        assert hook.post_calls[0]["output"] == stub

    def test_pre_call_records_hash(self) -> None:
        hook = MockLLMHook(stub_output={"result": "ok"})
        adapter = LLMAdapter(runtime_hook=hook)
        adapter.call(provider="openai", model="gpt-4", input={"messages": []})
        assert len(hook.pre_calls[0]["hash"]) == 16

    def test_mock_provider_no_network(self) -> None:
        hook = MockLLMHook()  # no stub - will make "real" call
        adapter = LLMAdapter(runtime_hook=hook)
        result = adapter.call(
            provider="mock",
            model="mock",
            input={
                "messages": [{"role": "user", "content": "hi"}],
                "_mock_response": {"choices": [{"message": {"content": "hello"}}]},
                "_mock_usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            },
        )
        assert result["choices"][0]["message"]["content"] == "hello"
        assert result["usage"]["total_tokens"] == 15


class TestToolAdapter:
    def test_calls_registered_tool(self) -> None:
        hook = MockToolHook()

        def my_tool(email: str) -> dict[str, str]:
            return {"name": "Alice", "email": email}

        adapter = ToolAdapter(runtime_hook=hook, tool_registry={"lookup": my_tool})
        result = adapter.call(name="lookup", args={"email": "alice@test.com"})

        assert result == {"name": "Alice", "email": "alice@test.com"}
        assert len(hook.pre_calls) == 1
        assert len(hook.post_calls) == 1

    def test_stub_output_skips_tool(self) -> None:
        hook = MockToolHook(stub_output={"stubbed": True})
        call_count = 0

        def my_tool() -> str:
            nonlocal call_count
            call_count += 1
            return "real"

        adapter = ToolAdapter(runtime_hook=hook, tool_registry={"my_tool": my_tool})
        result = adapter.call(name="my_tool", args={})

        assert result == {"stubbed": True}
        assert call_count == 0  # real tool was never called

    def test_missing_tool_raises(self) -> None:
        hook = MockToolHook()
        adapter = ToolAdapter(runtime_hook=hook, tool_registry={})
        with pytest.raises(ValueError, match="Tool not found"):
            adapter.call(name="nonexistent", args={})
