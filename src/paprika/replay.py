"""Replay engine for re-executing prior runs with stubbed outputs."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from paprika.errors import ReplayMismatchError
from paprika.events import (
    LLMCallEndEvent,
    LLMCallStartEvent,
    ToolCallEndEvent,
    ToolCallStartEvent,
)

if TYPE_CHECKING:
    from paprika.trace_store import Trace


class ReplayEngine:
    """Replays a prior run by returning recorded outputs instead of making live calls."""

    def __init__(self, trace: Trace) -> None:
        self._trace = trace
        self._llm_stubs: dict[int, dict[str, Any]] = {}
        self._tool_stubs: dict[int, Any] = {}
        self._llm_hashes: dict[int, str] = {}
        self._tool_hashes: dict[int, str] = {}
        self._build_stubs()

    def _build_stubs(self) -> None:
        """Build lookup maps from the trace events."""
        events = self._trace.events
        for i, event in enumerate(events):
            step = event.step_index

            if isinstance(event, LLMCallStartEvent):
                self._llm_hashes[step] = event.input_hash
                for j in range(i + 1, len(events)):
                    end_evt = events[j]
                    if isinstance(end_evt, LLMCallEndEvent) and end_evt.step_index == step:
                        self._llm_stubs[step] = end_evt.output_data
                        break

            elif isinstance(event, ToolCallStartEvent):
                self._tool_hashes[step] = event.input_hash
                for j in range(i + 1, len(events)):
                    end_evt = events[j]
                    if isinstance(end_evt, ToolCallEndEvent) and end_evt.step_index == step:
                        self._tool_stubs[step] = end_evt.output_data
                        break

    def get_llm_stub(self, step_index: int, input_hash: str) -> dict[str, Any]:
        """Get the recorded LLM output for a given step."""
        if step_index not in self._llm_stubs:
            raise ReplayMismatchError(
                step_index,
                expected="llm_call at this step",
                actual="no recorded llm_call",
            )
        recorded_hash = self._llm_hashes.get(step_index, "")
        if recorded_hash and recorded_hash != input_hash:
            raise ReplayMismatchError(
                step_index,
                expected=f"input_hash={recorded_hash}",
                actual=f"input_hash={input_hash}",
            )
        return self._llm_stubs[step_index]

    def get_tool_stub(self, step_index: int, input_hash: str) -> Any:
        """Get the recorded tool output for a given step."""
        if step_index not in self._tool_stubs:
            raise ReplayMismatchError(
                step_index,
                expected="tool_call at this step",
                actual="no recorded tool_call",
            )
        recorded_hash = self._tool_hashes.get(step_index, "")
        if recorded_hash and recorded_hash != input_hash:
            raise ReplayMismatchError(
                step_index,
                expected=f"input_hash={recorded_hash}",
                actual=f"input_hash={input_hash}",
            )
        return self._tool_stubs[step_index]
