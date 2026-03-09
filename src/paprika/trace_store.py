"""Trace persistence and retrieval."""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from paprika.errors import TraceNotFoundError
from paprika.events import TraceEvent  # noqa: TC001

logger = logging.getLogger(__name__)


class Trace(BaseModel):
    """A complete execution trace for a single agent run."""

    run_id: str
    agent_name: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    ended_at: datetime | None = None
    events: list[TraceEvent] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)

    def model_dump_json_pretty(self) -> str:
        """Serialize to indented JSON for human-readable storage."""
        return self.model_dump_json(indent=2)

    @classmethod
    def from_json(cls, data: str) -> Trace:
        """Deserialize from JSON string."""
        return cls.model_validate_json(data)


class TraceSummary(BaseModel):
    """Lightweight summary of a trace for listing."""

    run_id: str
    agent_name: str
    started_at: datetime
    status: str
    step_count: int


class LocalTraceStore:
    """Stores traces as JSON files on the local filesystem."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self._base_dir = base_dir or Path.home() / ".paprika" / "traces"
        self._base_dir.mkdir(parents=True, exist_ok=True)

    @property
    def base_dir(self) -> Path:
        return self._base_dir

    def save(self, trace: Trace) -> Path:
        """Persist a trace to disk. Returns the file path."""
        path = self._base_dir / f"{trace.run_id}.json"
        path.write_text(trace.model_dump_json_pretty())
        logger.debug("Saved trace %s to %s", trace.run_id, path)
        return path

    def load(self, run_id: str) -> Trace:
        """Load a trace by run ID."""
        path = self._base_dir / f"{run_id}.json"
        if not path.exists():
            raise TraceNotFoundError(run_id)
        return Trace.from_json(path.read_text())

    def list_runs(self, limit: int = 20) -> list[TraceSummary]:
        """List recent traces, sorted by modification time (newest first)."""
        trace_files = sorted(
            self._base_dir.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        summaries: list[TraceSummary] = []
        for path in trace_files[:limit]:
            try:
                data = json.loads(path.read_text())
                events = data.get("events", [])
                status = "unknown"
                step_count = 0
                for event in events:
                    et = event.get("event_type")
                    if et == "run_end":
                        status = event.get("status", "unknown")
                    if et in ("llm_call_start", "tool_call_start"):
                        step_count += 1
                summaries.append(
                    TraceSummary(
                        run_id=data["run_id"],
                        agent_name=data.get("agent_name", "unknown"),
                        started_at=data["started_at"],
                        status=status,
                        step_count=step_count,
                    )
                )
            except (json.JSONDecodeError, KeyError):
                logger.warning("Skipping malformed trace file: %s", path)
        return summaries

    def delete(self, run_id: str) -> None:
        """Delete a trace by run ID."""
        path = self._base_dir / f"{run_id}.json"
        if path.exists():
            path.unlink()
