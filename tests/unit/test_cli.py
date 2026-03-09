"""Tests for CLI commands."""

from __future__ import annotations

from typing import TYPE_CHECKING

from typer.testing import CliRunner

from paprika.cli import app
from paprika.events import RunEndEvent, RunStartEvent, ToolCallEndEvent, ToolCallStartEvent
from paprika.trace_store import LocalTraceStore, Trace

if TYPE_CHECKING:
    from pathlib import Path

runner = CliRunner()


def _create_sample_trace(trace_dir: Path, run_id: str = "test-run-abc123") -> Trace:
    """Create and save a sample trace for CLI testing."""
    store = LocalTraceStore(base_dir=trace_dir)
    trace = Trace(run_id=run_id, agent_name="test_agent")
    trace.events = [
        RunStartEvent(
            run_id=run_id,
            step_index=0,
            agent_name="test_agent",
            input_args={"args": ["hello"], "kwargs": {}},
        ),
        ToolCallStartEvent(
            run_id=run_id,
            step_index=1,
            tool_name="greet",
            args={"name": "Alice"},
            input_hash="abc123def456abcd",
        ),
        ToolCallEndEvent(
            run_id=run_id,
            step_index=1,
            output_data="Hello, Alice!",
            duration_ms=5.0,
        ),
        RunEndEvent(
            run_id=run_id,
            step_index=1,
            status="success",
            output="Hello, Alice!",
        ),
    ]
    store.save(trace)
    return trace


class TestListCommand:
    def test_list_empty(self, tmp_trace_dir: Path) -> None:
        result = runner.invoke(app, ["runs", "list", "--trace-dir", str(tmp_trace_dir)])
        assert result.exit_code == 0
        assert "No runs found" in result.output

    def test_list_shows_runs(self, tmp_trace_dir: Path) -> None:
        _create_sample_trace(tmp_trace_dir)
        result = runner.invoke(app, ["runs", "list", "--trace-dir", str(tmp_trace_dir)])
        assert result.exit_code == 0
        assert "test_agent" in result.output
        assert "success" in result.output


class TestInspectCommand:
    def test_inspect_run(self, tmp_trace_dir: Path) -> None:
        _create_sample_trace(tmp_trace_dir)
        result = runner.invoke(
            app, ["runs", "inspect", "test-run-abc123", "--trace-dir", str(tmp_trace_dir)]
        )
        assert result.exit_code == 0
        assert "test-run-abc123" in result.output
        assert "test_agent" in result.output
        assert "run_start" in result.output
        assert "tool_call_start" in result.output

    def test_inspect_verbose(self, tmp_trace_dir: Path) -> None:
        _create_sample_trace(tmp_trace_dir)
        result = runner.invoke(
            app,
            ["runs", "inspect", "test-run-abc123", "--trace-dir", str(tmp_trace_dir), "-v"],
        )
        assert result.exit_code == 0
        assert "Alice" in result.output

    def test_inspect_missing(self, tmp_trace_dir: Path) -> None:
        result = runner.invoke(
            app, ["runs", "inspect", "nonexistent", "--trace-dir", str(tmp_trace_dir)]
        )
        assert result.exit_code == 1


class TestDiffCommand:
    def test_diff_identical(self, tmp_trace_dir: Path) -> None:
        _create_sample_trace(tmp_trace_dir, "run-a")
        _create_sample_trace(tmp_trace_dir, "run-b")
        result = runner.invoke(
            app, ["runs", "diff", "run-a", "run-b", "--trace-dir", str(tmp_trace_dir)]
        )
        assert result.exit_code == 0
        assert "structurally identical" in result.output

    def test_diff_different_lengths(self, tmp_trace_dir: Path) -> None:
        _create_sample_trace(tmp_trace_dir, "run-a")
        # Create a shorter trace
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        trace_b = Trace(run_id="run-b", agent_name="test_agent")
        trace_b.events = [
            RunStartEvent(run_id="run-b", step_index=0, agent_name="test_agent"),
            RunEndEvent(run_id="run-b", step_index=0, status="success"),
        ]
        store.save(trace_b)

        result = runner.invoke(
            app, ["runs", "diff", "run-a", "run-b", "--trace-dir", str(tmp_trace_dir)]
        )
        assert result.exit_code == 0
        assert "difference(s) found" in result.output
