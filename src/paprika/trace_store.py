"""Trace persistence and retrieval."""

from __future__ import annotations

import json
import logging
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from paprika.config import DEFAULT_RUN_LIMIT
from paprika.errors import InvalidRunIdError, TraceNotFoundError
from paprika.events import TraceEvent  # noqa: TC001
from paprika.execution_record import ExecutionRecord
from paprika.migration import detect_schema_version, migrate_v0_to_v1, validate_schema_version

logger = logging.getLogger(__name__)

# Safe run_id pattern: alphanumeric, hyphens, underscores, dots. No empty strings.
_SAFE_RUN_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")


def validate_run_id(run_id: str) -> None:
    """Validate that a run_id is safe for use in file paths.

    Raises InvalidRunIdError if the run_id contains path traversal
    characters, separators, glob metacharacters, or is otherwise unsafe.
    """
    if not run_id or not _SAFE_RUN_ID_RE.match(run_id):
        raise InvalidRunIdError(run_id)


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
    total_tokens: int = 0
    replay_of: str | None = None


class LocalTraceStore:
    """Stores traces as JSON files on the local filesystem."""

    def __init__(self, base_dir: Path | None = None) -> None:
        self._base_dir = base_dir or Path.home() / ".paprika" / "traces"
        self._base_dir.mkdir(parents=True, exist_ok=True)

    @property
    def base_dir(self) -> Path:
        return self._base_dir

    def _safe_trace_path(self, run_id: str) -> Path:
        """Build a trace file path, validating run_id and verifying containment.

        Raises InvalidRunIdError if the run_id is unsafe or the resolved
        path escapes the base directory.
        """
        validate_run_id(run_id)
        candidate = (self._base_dir / f"{run_id}.json").resolve()
        base_resolved = self._base_dir.resolve()
        if not candidate.is_relative_to(base_resolved):
            raise InvalidRunIdError(run_id)
        return candidate

    def save(self, trace: Trace) -> Path:
        """Persist a trace to disk. Returns the file path."""
        path = self._safe_trace_path(trace.run_id)
        path.write_text(trace.model_dump_json_pretty())
        logger.debug("Saved trace %s to %s", trace.run_id, path)
        return path

    def _resolve_path(self, run_id: str) -> Path:
        """Resolve the file path for a run_id, supporting prefix match.

        Returns the path to the trace file. Raises TraceNotFoundError if
        no matching file is found or the prefix is ambiguous.
        """
        path = self._safe_trace_path(run_id)
        if path.exists():
            return path
        # Prefix match: run_id may be truncated.
        # run_id is already validated (safe chars only), so it cannot inject
        # glob metacharacters or path separators.
        matches = [
            p
            for p in self._base_dir.glob(f"{run_id}*.json")
            if p.resolve().is_relative_to(self._base_dir.resolve())
        ]
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            raise TraceNotFoundError(
                f"{run_id} matches {len(matches)} traces; use a longer prefix"
            )
        raise TraceNotFoundError(run_id)

    def load(self, run_id: str) -> Trace:
        """Load a trace by run ID. Supports prefix match if exactly one file matches.

        Always returns a legacy Trace object. If the file is a v1 ExecutionRecord,
        this method will raise an error — use load_record() for v1 files.
        """
        path = self._resolve_path(run_id)
        text = path.read_text()
        data = json.loads(text)
        version = detect_schema_version(data)
        if version == "0.0":
            return Trace.from_json(text)
        validate_schema_version(version)
        # v1 files should be loaded via load_record()
        return Trace.from_json(text)

    def load_record(self, run_id: str) -> ExecutionRecord:
        """Load a run as an ExecutionRecord, migrating v0 traces on the fly.

        This is the preferred method for reading traces in a version-agnostic way.
        - v0 files are migrated to ExecutionRecord via migrate_v0_to_v1()
        - v1 files are parsed directly as ExecutionRecord
        """
        path = self._resolve_path(run_id)
        text = path.read_text()
        data = json.loads(text)
        version = detect_schema_version(data)
        if version == "0.0":
            return migrate_v0_to_v1(data)
        validate_schema_version(version)
        return ExecutionRecord.model_validate(data)

    def save_record(self, record: ExecutionRecord) -> Path:
        """Persist an ExecutionRecord to disk. Returns the file path."""
        path = self._safe_trace_path(record.record_id)
        path.write_text(record.model_dump_json_pretty())
        logger.debug("Saved record %s to %s", record.record_id, path)
        return path

    def list_runs(self, limit: int = DEFAULT_RUN_LIMIT) -> list[TraceSummary]:
        """List recent traces, sorted by modification time (newest first).

        Handles both v0 (legacy Trace) and v1 (ExecutionRecord) files.
        """
        trace_files = sorted(
            self._base_dir.glob("*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        summaries: list[TraceSummary] = []
        for path in trace_files[:limit]:
            try:
                data = json.loads(path.read_text())
                version = detect_schema_version(data)
                if version != "0.0":
                    # v1 ExecutionRecord format
                    totals = data.get("totals", {})
                    summaries.append(
                        TraceSummary(
                            run_id=data.get("record_id", path.stem),
                            agent_name=data.get("agent", {}).get("name", "unknown"),
                            started_at=data.get("execution", {}).get("started_at", ""),
                            status=data.get("execution", {}).get("status", "unknown"),
                            step_count=totals.get("step_count", 0),
                            total_tokens=totals.get("total_tokens", 0),
                            replay_of=data.get("replay_of"),
                        )
                    )
                else:
                    # v0 legacy Trace format
                    events = data.get("events", [])
                    status = "unknown"
                    step_count = 0
                    total_tokens = 0
                    run_end_tokens = 0
                    for event in events:
                        et = event.get("event_type")
                        if et == "run_end":
                            status = event.get("status", "unknown")
                            run_end_tokens = event.get("total_tokens", 0)
                        if et in ("llm_call_start", "tool_call_start"):
                            step_count += 1
                        if et == "llm_call_end":
                            tu = event.get("token_usage")
                            if tu:
                                total_tokens += tu.get("total_tokens", 0)
                    if total_tokens == 0:
                        total_tokens = run_end_tokens
                    summaries.append(
                        TraceSummary(
                            run_id=data["run_id"],
                            agent_name=data.get("agent_name", "unknown"),
                            started_at=data["started_at"],
                            status=status,
                            step_count=step_count,
                            total_tokens=total_tokens,
                            replay_of=data.get("metadata", {}).get("replay_of"),
                        )
                    )
            except (json.JSONDecodeError, KeyError):
                logger.warning("Skipping malformed trace file: %s", path)
        return summaries

    def delete(self, run_id: str) -> None:
        """Delete a trace by run ID."""
        path = self._safe_trace_path(run_id)
        if path.exists():
            path.unlink()
