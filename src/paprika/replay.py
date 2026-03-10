"""Replay engine for re-executing prior runs with stubbed outputs."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from paprika.errors import ReplayMismatchError
from paprika.execution_record import LLMCallStep, ToolCallStep

if TYPE_CHECKING:
    from paprika.execution_record import ExecutionRecord


class ReplayEngine:
    """Replays a prior run by returning recorded outputs instead of making live calls.

    Accepts an ExecutionRecord and builds stub lookup maps from its merged steps.
    """

    def __init__(self, record: ExecutionRecord) -> None:
        self._record = record
        self._llm_stubs: dict[int, dict[str, Any]] = {}
        self._tool_stubs: dict[int, Any] = {}
        self._llm_hashes: dict[int, str] = {}
        self._tool_hashes: dict[int, str] = {}
        self._build_stubs()

    def _build_stubs(self) -> None:
        """Build lookup maps from canonical merged steps."""
        for step in self._record.steps:
            if isinstance(step, LLMCallStep):
                self._llm_hashes[step.step_index] = step.input_hash
                if step.output_data is not None:
                    self._llm_stubs[step.step_index] = step.output_data
            elif isinstance(step, ToolCallStep):
                self._tool_hashes[step.step_index] = step.input_hash
                if step.output_data is not None:
                    self._tool_stubs[step.step_index] = step.output_data

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
