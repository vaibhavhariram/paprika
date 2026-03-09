"""Tests for trace storage."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import pytest

from paprika.errors import TraceNotFoundError
from paprika.events import RunEndEvent, RunStartEvent
from paprika.trace_store import LocalTraceStore, Trace

if TYPE_CHECKING:
    from pathlib import Path


def _make_trace(run_id: str = "test-run-1", agent_name: str = "test_agent") -> Trace:
    trace = Trace(run_id=run_id, agent_name=agent_name)
    trace.events.append(
        RunStartEvent(
            run_id=run_id,
            step_index=0,
            agent_name=agent_name,
            input_args={"input": "hello"},
        )
    )
    trace.events.append(
        RunEndEvent(
            run_id=run_id,
            step_index=0,
            status="success",
            output="done",
        )
    )
    return trace


class TestLocalTraceStore:
    def test_save_creates_file(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        trace = _make_trace()
        path = store.save(trace)
        assert path.exists()
        assert path.name == "test-run-1.json"

    def test_save_writes_valid_json(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        trace = _make_trace()
        path = store.save(trace)
        data = json.loads(path.read_text())
        assert data["run_id"] == "test-run-1"
        assert data["agent_name"] == "test_agent"
        assert len(data["events"]) == 2

    def test_load_round_trip(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        original = _make_trace()
        store.save(original)
        loaded = store.load("test-run-1")
        assert loaded.run_id == original.run_id
        assert loaded.agent_name == original.agent_name
        assert len(loaded.events) == len(original.events)

    def test_load_missing_raises(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(TraceNotFoundError):
            store.load("nonexistent-run")

    def test_list_runs(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_trace("run-1"))
        store.save(_make_trace("run-2"))
        summaries = store.list_runs()
        assert len(summaries) == 2
        run_ids = {s.run_id for s in summaries}
        assert run_ids == {"run-1", "run-2"}

    def test_list_runs_respects_limit(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        for i in range(5):
            store.save(_make_trace(f"run-{i}"))
        summaries = store.list_runs(limit=3)
        assert len(summaries) == 3

    def test_delete(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_trace("run-to-delete"))
        store.delete("run-to-delete")
        with pytest.raises(TraceNotFoundError):
            store.load("run-to-delete")

    def test_creates_base_dir(self, tmp_path: Path) -> None:
        new_dir = tmp_path / "nested" / "traces"
        store = LocalTraceStore(base_dir=new_dir)
        assert new_dir.exists()
        store.save(_make_trace())
        assert store.load("test-run-1").run_id == "test-run-1"
