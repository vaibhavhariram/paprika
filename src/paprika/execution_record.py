"""Paprika Execution Record v1 — canonical versioned data model.

Defines the portable, versioned format for capturing a single AI agent execution.
See docs/EXECUTION_RECORD_SPEC.md for the full specification.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field

SCHEMA_VERSION = "1.0"
SUPPORTED_MAJOR = 1


class AgentInfo(BaseModel):
    """Agent identity within an execution record."""

    name: str
    version: str | None = None


class ExecutionInfo(BaseModel):
    """Timing and status of the execution."""

    started_at: datetime
    ended_at: datetime | None = None
    duration_ms: float | None = None
    status: Literal["success", "error", "policy_violation"] = "unknown"  # type: ignore[assignment]
    termination_reason: str | None = None


class PolicyConfigSnapshot(BaseModel):
    """Snapshot of the policy config that was active during the run."""

    max_steps: int | None = None
    max_tokens: int | None = None
    max_repeat_hashes: int | None = None


class PolicyViolationInfo(BaseModel):
    """Details of a policy violation that terminated the run."""

    policy_name: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class PolicyInfo(BaseModel):
    """Policy context for the execution."""

    config: PolicyConfigSnapshot | None = None
    violation: PolicyViolationInfo | None = None


class Totals(BaseModel):
    """Pre-computed aggregate metrics for the execution."""

    step_count: int = 0
    llm_calls: int = 0
    tool_calls: int = 0
    total_tokens: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0


class TokenUsage(BaseModel):
    """Token usage for a single LLM call step."""

    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


# --- Step types ---


class BaseStep(BaseModel):
    """Fields shared by all execution steps."""

    step_index: int
    timestamp: datetime
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class LLMCallStep(BaseStep):
    """A merged LLM call step (input + output in one record)."""

    step_type: Literal["llm_call"] = "llm_call"
    provider: str
    model: str
    input_data: dict[str, Any]
    input_hash: str
    output_data: dict[str, Any] | None = None
    token_usage: TokenUsage | None = None
    duration_ms: float | None = None
    side_effect: str | None = "pure"
    error: str | None = None


class ToolCallStep(BaseStep):
    """A merged tool call step (input + output in one record)."""

    step_type: Literal["tool_call"] = "tool_call"
    tool_name: str
    args: dict[str, Any]
    input_hash: str
    output_data: Any | None = None
    duration_ms: float | None = None
    side_effect: str | None = None
    error: str | None = None


class PolicyViolationStep(BaseStep):
    """A standalone policy violation step."""

    step_type: Literal["policy_violation"] = "policy_violation"
    policy_name: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


ExecutionStep = Annotated[
    LLMCallStep | ToolCallStep | PolicyViolationStep,
    Field(discriminator="step_type"),
]


class ExecutionRecord(BaseModel):
    """Paprika Execution Record v1 — the canonical execution artifact."""

    model_config = {"extra": "ignore"}

    schema_version: str = SCHEMA_VERSION
    record_id: str
    parent_record_id: str | None = None
    replay_of: str | None = None

    agent: AgentInfo
    execution: ExecutionInfo
    policy: PolicyInfo = Field(default_factory=PolicyInfo)
    totals: Totals = Field(default_factory=Totals)
    environment: dict[str, Any] | None = None

    steps: list[ExecutionStep] = Field(default_factory=list)

    input: Any | None = None
    output: Any | None = None
    error: str | None = None

    extensions: dict[str, Any] = Field(default_factory=dict)

    def model_dump_json_pretty(self) -> str:
        """Serialize to indented JSON for human-readable storage."""
        return self.model_dump_json(indent=2)

    @classmethod
    def from_json(cls, data: str) -> ExecutionRecord:
        """Deserialize from JSON string."""
        return cls.model_validate_json(data)
