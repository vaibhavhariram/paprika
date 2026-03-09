"""LLM call adapter."""

from __future__ import annotations

import os
import time
from typing import Any, Protocol

import httpx

from paprika.events import TokenUsage, compute_input_hash

# Default provider base URLs
_PROVIDER_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
}

# Env var names for API keys by provider
_PROVIDER_KEY_ENVS: dict[str, str] = {
    "openai": "OPENAI_API_KEY",
}


class RuntimeHook(Protocol):
    """Protocol for the runtime to intercept adapter calls."""

    def pre_llm_call(
        self,
        provider: str,
        model: str,
        input_data: dict[str, Any],
        input_hash: str,
    ) -> dict[str, Any] | None:
        """Called before LLM call. Returns stub output if in replay mode."""
        ...

    def post_llm_call(
        self,
        output: dict[str, Any],
        token_usage: TokenUsage | None,
        duration_ms: float,
    ) -> None:
        """Called after LLM call completes."""
        ...


class LLMAdapter:
    """Bridges user LLM calls to the runtime event recording system."""

    def __init__(
        self,
        runtime_hook: RuntimeHook,
        providers: dict[str, str] | None = None,
    ) -> None:
        self._hook = runtime_hook
        self._providers = {**_PROVIDER_URLS, **(providers or {})}

    def call(
        self,
        *,
        provider: str,
        model: str,
        input: dict[str, Any],
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Make an LLM call, recording events and enforcing policies."""
        input_hash = compute_input_hash({"provider": provider, "model": model, "input": input})

        # Pre-call hook — may return stub for replay
        stub = self._hook.pre_llm_call(provider, model, input, input_hash)
        if stub is not None:
            self._hook.post_llm_call(stub, None, 0.0)
            return stub

        # Make the actual API call
        start = time.monotonic()
        output = self._call_provider(provider, model, input, **kwargs)
        duration_ms = (time.monotonic() - start) * 1000

        # Extract token usage
        usage_data = output.get("usage")
        token_usage = None
        if isinstance(usage_data, dict):
            token_usage = TokenUsage(
                prompt_tokens=usage_data.get("prompt_tokens", 0),
                completion_tokens=usage_data.get("completion_tokens", 0),
                total_tokens=usage_data.get("total_tokens", 0),
            )

        self._hook.post_llm_call(output, token_usage, duration_ms)
        return output

    def _call_provider(
        self,
        provider: str,
        model: str,
        input_data: dict[str, Any],
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Call an OpenAI-compatible chat completions endpoint."""
        if provider == "mock":
            return self._call_mock_provider(input_data)

        base_url = self._providers.get(provider)
        if base_url is None:
            msg = f"Unknown LLM provider: {provider!r}. Register it or use a known provider."
            raise ValueError(msg)

        env_var = _PROVIDER_KEY_ENVS.get(provider, f"{provider.upper()}_API_KEY")
        api_key = os.environ.get(env_var, "")
        if not api_key:
            msg = f"API key not found. Set the {env_var} environment variable."
            raise ValueError(msg)

        url = f"{base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        body = {"model": model, **input_data, **kwargs}

        response = httpx.post(url, json=body, headers=headers, timeout=120.0)
        response.raise_for_status()
        result: dict[str, Any] = response.json()
        return result

    def _call_mock_provider(self, input_data: dict[str, Any]) -> dict[str, Any]:
        """Return canned response for mock provider (no network, used in examples/tests)."""
        usage = input_data.get("_mock_usage")
        if usage is None:
            usage = {"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150}
        response = input_data.get("_mock_response")
        if response is None:
            response = {
                "choices": [{"message": {"content": "mock response", "role": "assistant"}}]
            }
        result: dict[str, Any] = dict(response) if isinstance(response, dict) else {"choices": []}
        if "usage" not in result:
            result["usage"] = usage
        return result
