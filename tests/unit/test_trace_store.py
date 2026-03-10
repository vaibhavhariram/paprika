"""Tests for trace storage."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

import pytest

from paprika.errors import InvalidRunIdError, TraceNotFoundError
from paprika.events import RunEndEvent, RunStartEvent
from paprika.trace_store import LocalTraceStore, Trace, validate_run_id

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

    def test_load_prefix_match(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_trace("abc12345-unique-id"))
        loaded = store.load("abc12345")
        assert loaded.run_id == "abc12345-unique-id"

    def test_load_prefix_ambiguous_raises(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        store.save(_make_trace("abc111"))
        store.save(_make_trace("abc222"))
        with pytest.raises(TraceNotFoundError, match="matches 2 traces"):
            store.load("abc")

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


class TestValidateRunId:
    """Tests for the run_id validation function."""

    def test_valid_uuid(self) -> None:
        validate_run_id("550e8400-e29b-41d4-a716-446655440000")

    def test_valid_simple_id(self) -> None:
        validate_run_id("test-run-1")

    def test_valid_with_dots(self) -> None:
        validate_run_id("run.2024.01.15")

    def test_valid_with_underscores(self) -> None:
        validate_run_id("my_run_id")

    def test_valid_alphanumeric(self) -> None:
        validate_run_id("abc123")

    def test_reject_empty_string(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("")

    def test_reject_dotdot(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("..")

    def test_reject_traversal_unix(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("../../../etc/passwd")

    def test_reject_traversal_mixed(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("a/../../b")

    def test_reject_absolute_path(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("/etc/passwd")

    def test_reject_backslash_traversal(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("..\\..\\windows\\system32")

    def test_reject_glob_star(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("*")

    def test_reject_glob_question(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("run?")

    def test_reject_glob_bracket(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("run[0-9]")

    def test_reject_slash(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("foo/bar")

    def test_reject_leading_dot(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id(".hidden")

    def test_reject_leading_hyphen(self) -> None:
        with pytest.raises(InvalidRunIdError):
            validate_run_id("-flag")


class TestTraceStoreTraversalProtection:
    """Tests that the trace store rejects directory traversal attempts."""

    def test_load_traversal_rejected(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.load("../../../etc/passwd")

    def test_delete_traversal_rejected(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.delete("../../../etc/passwd")

    def test_load_dotdot_rejected(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.load("..")

    def test_load_absolute_path_rejected(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.load("/etc/passwd")

    def test_load_backslash_traversal_rejected(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.load("..\\..\\windows\\system32")

    def test_load_glob_metachar_rejected(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.load("*")

    def test_delete_empty_rejected(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.delete("")

    def test_path_stays_under_base_dir(self, tmp_trace_dir: Path) -> None:
        """Verify that _safe_trace_path always returns a path under base_dir."""
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        path = store._safe_trace_path("valid-run-id")
        assert path.resolve().is_relative_to(tmp_trace_dir.resolve())

    def test_save_with_traversal_run_id_rejected(self, tmp_trace_dir: Path) -> None:
        """Ensure save also validates run_id."""
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        trace = Trace(run_id="../../../etc/passwd", agent_name="evil")
        with pytest.raises(InvalidRunIdError):
            store.save(trace)

    def test_outside_file_not_accessible(self, tmp_path: Path) -> None:
        """Plant a file outside trace dir and confirm it can't be read."""
        trace_dir = tmp_path / "traces"
        trace_dir.mkdir()
        secret = tmp_path / "secret.json"
        secret.write_text('{"run_id": "secret", "agent_name": "x", "events": []}')

        store = LocalTraceStore(base_dir=trace_dir)
        with pytest.raises(InvalidRunIdError):
            store.load("../secret")


class TestCLITraversalProtection:
    """Tests that CLI commands surface clean errors for invalid run IDs."""

    def test_inspect_invalid_run_id(self, tmp_trace_dir: Path) -> None:
        from typer.testing import CliRunner

        from paprika.cli import app

        runner = CliRunner()
        result = runner.invoke(
            app,
            ["runs", "inspect", "../../../etc/passwd", "--trace-dir", str(tmp_trace_dir)],
        )
        assert result.exit_code != 0
        assert "Invalid run_id" in result.output or "Error" in result.output

    def test_diff_invalid_run_id(self, tmp_trace_dir: Path) -> None:
        from typer.testing import CliRunner

        from paprika.cli import app

        runner = CliRunner()
        result = runner.invoke(
            app,
            ["runs", "diff", "../bad", "also/../bad", "--trace-dir", str(tmp_trace_dir)],
        )
        assert result.exit_code != 0
