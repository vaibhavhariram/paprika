"""Structured event schemas for execution traces."""

from __future__ import annotations

import enum
import hashlib
import json
import uuid
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field


class EventType(enum.StrEnum):
    """Types of events recorded during agent execution."""

    RUN_START = "run_start"
    RUN_END = "run_end"
    LLM_CALL_START = "llm_call_start"
    LLM_CALL_END = "llm_call_end"
    TOOL_CALL_START = "tool_call_start"
    TOOL_CALL_END = "tool_call_end"
    POLICY_VIOLATION = "policy_violation"


class TokenUsage(BaseModel):
    """Token usage for a single LLM call."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class BaseEvent(BaseModel):
    """Base fields shared by all trace events."""

    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
    run_id: str
    step_index: int


class RunStartEvent(BaseEvent):
    """Recorded when an agent run begins."""

    event_type: Literal[EventType.RUN_START] = EventType.RUN_START
    agent_name: str
    input_args: dict[str, Any] = Field(default_factory=dict)


class RunEndEvent(BaseEvent):
    """Recorded when an agent run completes."""

    event_type: Literal[EventType.RUN_END] = EventType.RUN_END
    status: Literal["success", "error", "policy_violation"]
    output: Any | None = None
    error: str | None = None
    total_tokens: int = 0


class LLMCallStartEvent(BaseEvent):
    """Recorded before an LLM call is made."""

    event_type: Literal[EventType.LLM_CALL_START] = EventType.LLM_CALL_START
    provider: str
    model: str
    input_data: dict[str, Any]
    input_hash: str


class LLMCallEndEvent(BaseEvent):
    """Recorded after an LLM call completes."""

    event_type: Literal[EventType.LLM_CALL_END] = EventType.LLM_CALL_END
    output_data: dict[str, Any]
    token_usage: TokenUsage | None = None
    duration_ms: float


class ToolCallStartEvent(BaseEvent):
    """Recorded before a tool call is made."""

    event_type: Literal[EventType.TOOL_CALL_START] = EventType.TOOL_CALL_START
    tool_name: str
    args: dict[str, Any]
    input_hash: str


class ToolCallEndEvent(BaseEvent):
    """Recorded after a tool call completes."""

    event_type: Literal[EventType.TOOL_CALL_END] = EventType.TOOL_CALL_END
    output_data: Any
    duration_ms: float


class PolicyViolationEvent(BaseEvent):
    """Recorded when a policy violation occurs."""

    event_type: Literal[EventType.POLICY_VIOLATION] = EventType.POLICY_VIOLATION
    policy_name: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


TraceEvent = Annotated[
    RunStartEvent
    | RunEndEvent
    | LLMCallStartEvent
    | LLMCallEndEvent
    | ToolCallStartEvent
    | ToolCallEndEvent
    | PolicyViolationEvent,
    Field(discriminator="event_type"),
]


def _sort_recursive(obj: Any) -> Any:
    """Recursively sort dict keys for deterministic serialization."""
    if isinstance(obj, dict):
        return {k: _sort_recursive(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_sort_recursive(item) for item in obj]
    return obj


def compute_input_hash(data: dict[str, Any]) -> str:
    """Compute a deterministic hash of input data for repeat detection.

    Recursively sorts keys, serializes to JSON, and returns the first 16
    characters of the SHA-256 hex digest.
    """
    sorted_data = _sort_recursive(data)
    serialized = json.dumps(sorted_data, separators=(",", ":"), default=str)
    return hashlib.sha256(serialized.encode()).hexdigest()[:16]
