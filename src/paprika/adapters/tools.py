"""Tool call adapter."""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Any, Protocol

from paprika.events import compute_input_hash

if TYPE_CHECKING:
    from collections.abc import Callable


class ToolRuntimeHook(Protocol):
    """Protocol for the runtime to intercept tool calls."""

    def pre_tool_call(
        self,
        name: str,
        args: dict[str, Any],
        input_hash: str,
    ) -> Any:
        """Called before tool call. Returns stub output if in replay mode."""
        ...

    def post_tool_call(self, output: Any, duration_ms: float) -> None:
        """Called after tool call completes."""
        ...


class ToolAdapter:
    """Bridges user tool calls to the runtime event recording system."""

    def __init__(
        self,
        runtime_hook: ToolRuntimeHook,
        tool_registry: dict[str, Callable[..., Any]],
    ) -> None:
        self._hook = runtime_hook
        self._registry = tool_registry

    def call(self, *, name: str, args: dict[str, Any]) -> Any:
        """Execute a registered tool, recording events and enforcing policies."""
        input_hash = compute_input_hash({"name": name, "args": args})

        # Pre-call hook — may return stub for replay
        stub = self._hook.pre_tool_call(name, args, input_hash)
        if stub is not None:
            self._hook.post_tool_call(stub, 0.0)
            return stub

        # Look up and execute the tool
        func = self._registry.get(name)
        if func is None:
            msg = f"Tool not found: {name!r}. Register it with runtime.register_tool()."
            raise ValueError(msg)

        start = time.monotonic()
        output = func(**args)
        duration_ms = (time.monotonic() - start) * 1000

        self._hook.post_tool_call(output, duration_ms)
        return output
