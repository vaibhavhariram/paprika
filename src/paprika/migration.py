"""Migration helpers for converting legacy v0 traces to Execution Record v1.

The v0 format stores a flat list of start/end event pairs.
The v1 format stores merged steps with top-level metadata.

This module provides:
- ``migrate_v0_to_v1``: convert a legacy trace dict into an ExecutionRecord
- ``detect_schema_version``: determine the format version of a JSON payload
"""

from __future__ import annotations

import logging
from typing import Any

from paprika.errors import PaprikaError
from paprika.execution_record import (
    SCHEMA_VERSION,
    SUPPORTED_MAJOR,
    AgentInfo,
    ExecutionInfo,
    ExecutionRecord,
    LLMCallStep,
    PolicyInfo,
    PolicyConfigSnapshot,
    PolicyViolationInfo,
    PolicyViolationStep,
    TokenUsage,
    ToolCallStep,
    Totals,
)

logger = logging.getLogger(__name__)


class UnsupportedSchemaVersionError(PaprikaError):
    """Raised when a trace file has an unsupported schema version."""

    def __init__(self, version: str) -> None:
        self.version = version
        super().__init__(
            f"Unsupported schema version '{version}'. "
            f"This version of Paprika supports schema versions up to {SUPPORTED_MAJOR}.x. "
            "Please upgrade Paprika."
        )


def detect_schema_version(data: dict[str, Any]) -> str:
    """Determine the schema version of a trace payload.

    Returns ``"0.0"`` for legacy traces without a schema_version field.
    """
    return data.get("schema_version", "0.0")


def _parse_major_version(version: str) -> int:
    """Extract the major version number from a schema version string."""
    try:
        return int(version.split(".")[0])
    except (ValueError, IndexError):
        return 0


def validate_schema_version(version: str) -> None:
    """Check that a schema version is supported.

    Raises UnsupportedSchemaVersionError for unsupported versions.
    """
    major = _parse_major_version(version)
    if major > SUPPORTED_MAJOR:
        raise UnsupportedSchemaVersionError(version)


def migrate_v0_to_v1(data: dict[str, Any]) -> ExecutionRecord:
    """Convert a legacy v0 trace dict into an Execution Record v1.

    The input ``data`` is expected to be the raw JSON-parsed dict from a legacy
    trace file (with ``events`` list, no ``schema_version``).

    This function:
    - pairs LLM/tool start+end events into merged steps
    - promotes RunStartEvent/RunEndEvent data to top-level fields
    - computes totals from event data
    - returns a fully valid ExecutionRecord v1 instance
    """
    events = data.get("events", [])

    # Extract run-level data from RunStart/RunEnd events
    agent_name = data.get("agent_name", "unknown")
    run_input: Any = None
    run_output: Any = None
    run_error: str | None = None
    run_status: str = "unknown"
    run_end_total_tokens: int = 0

    for event in events:
        et = event.get("event_type")
        if et == "run_start":
            agent_name = event.get("agent_name", agent_name)
            run_input = event.get("input_args")
        elif et == "run_end":
            run_status = event.get("status", "unknown")
            run_output = event.get("output")
            run_error = event.get("error")
            run_end_total_tokens = event.get("total_tokens", 0)

    # Pair start/end events into merged steps
    llm_starts: dict[int, dict[str, Any]] = {}
    llm_ends: dict[int, dict[str, Any]] = {}
    tool_starts: dict[int, dict[str, Any]] = {}
    tool_ends: dict[int, dict[str, Any]] = {}
    violations: list[dict[str, Any]] = []

    for event in events:
        et = event.get("event_type")
        si = event.get("step_index", 0)
        if et == "llm_call_start":
            llm_starts[si] = event
        elif et == "llm_call_end":
            llm_ends[si] = event
        elif et == "tool_call_start":
            tool_starts[si] = event
        elif et == "tool_call_end":
            tool_ends[si] = event
        elif et == "policy_violation":
            violations.append(event)

    steps: list[LLMCallStep | ToolCallStep | PolicyViolationStep] = []

    # Merge LLM call pairs
    for si in sorted(set(llm_starts) | set(llm_ends)):
        start = llm_starts.get(si)
        end = llm_ends.get(si)

        token_usage_data = end.get("token_usage") if end else None
        token_usage = TokenUsage(**token_usage_data) if token_usage_data else None

        steps.append(LLMCallStep(
            step_index=si,
            timestamp=start.get("timestamp") if start else (end.get("timestamp") if end else ""),
            event_id=start.get("event_id", "") if start else (end.get("event_id", "") if end else ""),
            provider=start.get("provider", "unknown") if start else "unknown",
            model=start.get("model", "unknown") if start else "unknown",
            input_data=start.get("input_data", {}) if start else {},
            input_hash=start.get("input_hash", "") if start else "",
            output_data=end.get("output_data") if end else None,
            token_usage=token_usage,
            duration_ms=end.get("duration_ms") if end else None,
            side_effect="pure",
        ))

    # Merge tool call pairs
    for si in sorted(set(tool_starts) | set(tool_ends)):
        start = tool_starts.get(si)
        end = tool_ends.get(si)

        steps.append(ToolCallStep(
            step_index=si,
            timestamp=start.get("timestamp") if start else (end.get("timestamp") if end else ""),
            event_id=start.get("event_id", "") if start else (end.get("event_id", "") if end else ""),
            tool_name=start.get("tool_name", "unknown") if start else "unknown",
            args=start.get("args", {}) if start else {},
            input_hash=start.get("input_hash", "") if start else "",
            output_data=end.get("output_data") if end else None,
            duration_ms=end.get("duration_ms") if end else None,
        ))

    # Add policy violation steps
    for v in violations:
        steps.append(PolicyViolationStep(
            step_index=v.get("step_index", 0),
            timestamp=v.get("timestamp", ""),
            event_id=v.get("event_id", ""),
            policy_name=v.get("policy_name", "unknown"),
            message=v.get("message", ""),
            details=v.get("details", {}),
        ))

    # Sort steps by step_index
    steps.sort(key=lambda s: s.step_index)

    # Compute totals
    llm_call_count = len(set(llm_starts) | set(llm_ends))
    tool_call_count = len(set(tool_starts) | set(tool_ends))
    total_tokens = 0
    prompt_tokens = 0
    completion_tokens = 0
    for step in steps:
        if isinstance(step, LLMCallStep) and step.token_usage:
            total_tokens += step.token_usage.total_tokens
            prompt_tokens += step.token_usage.prompt_tokens
            completion_tokens += step.token_usage.completion_tokens

    # Fall back to RunEndEvent.total_tokens if no LLM events had token data
    if total_tokens == 0 and run_end_total_tokens > 0:
        total_tokens = run_end_total_tokens

    # Build policy violation info from the first violation event
    policy_violation: PolicyViolationInfo | None = None
    if violations:
        v = violations[0]
        policy_violation = PolicyViolationInfo(
            policy_name=v.get("policy_name", "unknown"),
            message=v.get("message", ""),
            details=v.get("details", {}),
        )

    # Compute duration
    started_at = data.get("started_at")
    ended_at = data.get("ended_at")
    duration_ms: float | None = None
    if started_at and ended_at:
        from datetime import datetime as dt

        try:
            sa = dt.fromisoformat(started_at) if isinstance(started_at, str) else started_at
            ea = dt.fromisoformat(ended_at) if isinstance(ended_at, str) else ended_at
            duration_ms = (ea - sa).total_seconds() * 1000
        except (ValueError, TypeError):
            pass

    # Extract replay_of from metadata
    metadata = data.get("metadata", {})
    replay_of = metadata.get("replay_of")

    return ExecutionRecord(
        schema_version=SCHEMA_VERSION,
        record_id=data.get("run_id", ""),
        replay_of=replay_of,
        agent=AgentInfo(name=agent_name),
        execution=ExecutionInfo(
            started_at=started_at,
            ended_at=ended_at,
            duration_ms=duration_ms,
            status=run_status,
        ),
        policy=PolicyInfo(violation=policy_violation),
        totals=Totals(
            step_count=llm_call_count + tool_call_count,
            llm_calls=llm_call_count,
            tool_calls=tool_call_count,
            total_tokens=total_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
        ),
        steps=steps,
        input=run_input,
        output=run_output,
        error=run_error,
    )
