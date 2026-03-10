"""Transform ExecutionRecord data into UI-friendly timeline structures.

This module projects canonical ExecutionRecord fields into the dict shapes
expected by the React frontend. No event pairing or aggregation is needed —
the ExecutionRecord already provides merged steps and pre-computed totals.
"""

from __future__ import annotations

from typing import Any

from paprika.execution_record import (
    ExecutionRecord,
    LLMCallStep,
    PolicyViolationStep,
    ToolCallStep,
)


def _step_to_dict(step: LLMCallStep | ToolCallStep | PolicyViolationStep) -> dict[str, Any]:
    """Project a single ExecutionRecord step into the timeline dict shape."""
    if isinstance(step, LLMCallStep):
        return {
            "type": "llm_call",
            "step_index": step.step_index,
            "label": step.model,
            "timestamp": step.timestamp.isoformat(),
            "duration_ms": step.duration_ms,
            "tokens": step.token_usage.total_tokens if step.token_usage else None,
            "detail": {
                "provider": step.provider,
                "model": step.model,
                "input_hash": step.input_hash,
                "input_data": step.input_data,
                "output_data": step.output_data,
                "token_usage": step.token_usage.model_dump() if step.token_usage else None,
                "duration_ms": step.duration_ms,
            },
        }
    if isinstance(step, ToolCallStep):
        return {
            "type": "tool_call",
            "step_index": step.step_index,
            "label": step.tool_name,
            "timestamp": step.timestamp.isoformat(),
            "duration_ms": step.duration_ms,
            "detail": {
                "tool_name": step.tool_name,
                "input_hash": step.input_hash,
                "args": step.args,
                "output_data": step.output_data,
                "duration_ms": step.duration_ms,
            },
        }
    # PolicyViolationStep
    return {
        "type": "policy_violation",
        "step_index": step.step_index,
        "label": step.policy_name,
        "timestamp": step.timestamp.isoformat(),
        "detail": {
            "policy_name": step.policy_name,
            "message": step.message,
            "details": step.details,
        },
    }


def _build_timeline(record: ExecutionRecord) -> list[dict[str, Any]]:
    """Build the full timeline including synthetic run_start/run_end bookends."""
    steps: list[dict[str, Any]] = []

    # Synthetic run_start bookend
    steps.append({
        "type": "run_start",
        "step_index": 0,
        "label": record.agent.name,
        "timestamp": record.execution.started_at.isoformat(),
        "detail": {
            "agent_name": record.agent.name,
            "input_args": record.input,
        },
    })

    # Canonical merged steps
    for step in record.steps:
        steps.append(_step_to_dict(step))

    # Synthetic run_end bookend
    steps.append({
        "type": "run_end",
        "step_index": 0,
        "label": record.execution.status,
        "timestamp": (
            record.execution.ended_at.isoformat()
            if record.execution.ended_at
            else record.execution.started_at.isoformat()
        ),
        "detail": {
            "status": record.execution.status,
            "output": record.output,
            "error": record.error,
            "total_tokens": record.totals.total_tokens,
        },
    })

    return steps


def record_to_detail(record: ExecutionRecord) -> dict[str, Any]:
    """Transform an ExecutionRecord into a UI-friendly run detail response."""
    return {
        "summary": {
            "run_id": record.record_id,
            "agent_name": record.agent.name,
            "started_at": record.execution.started_at.isoformat(),
            "ended_at": (
                record.execution.ended_at.isoformat()
                if record.execution.ended_at
                else None
            ),
            "duration_ms": record.execution.duration_ms,
            "status": record.execution.status,
            "total_tokens": record.totals.total_tokens,
            "step_count": record.totals.step_count,
            "replay_of": record.replay_of,
        },
        "steps": _build_timeline(record),
    }


def record_to_summary(record: ExecutionRecord) -> dict[str, Any]:
    """Build a list-view summary dict from an ExecutionRecord."""
    return {
        "run_id": record.record_id,
        "agent_name": record.agent.name,
        "started_at": record.execution.started_at.isoformat(),
        "status": record.execution.status,
        "step_count": record.totals.step_count,
        "total_tokens": record.totals.total_tokens,
        "replay_of": record.replay_of,
    }
