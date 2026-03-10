"""Paprika CLI for trace inspection."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Annotated

import typer

from paprika._formatting import format_duration, format_table
from paprika.execution_record import (
    LLMCallStep,
    PolicyViolationStep,
    ToolCallStep,
)
from paprika.trace_store import LocalTraceStore

app = typer.Typer(name="paprika", help="Execution control for AI agents")
runs_app = typer.Typer(help="Inspect and manage agent runs")
app.add_typer(runs_app, name="runs")

TraceDirOption = Annotated[
    Path | None,
    typer.Option(help="Custom trace directory (default: ~/.paprika/traces or PAPRIKA_TRACE_DIR)"),
]


def _resolve_trace_dir(trace_dir: Path | None) -> Path | None:
    """Resolve trace dir from arg or PAPRIKA_TRACE_DIR env."""
    if trace_dir is not None:
        return trace_dir
    env_path = os.environ.get("PAPRIKA_TRACE_DIR")
    if env_path:
        return Path(env_path).expanduser()
    return None


@runs_app.command("list")
def list_runs(
    limit: int = typer.Option(20, help="Maximum number of runs to display"),  # noqa: B008
    trace_dir: TraceDirOption = None,
) -> None:
    """List recent agent runs."""
    store = LocalTraceStore(base_dir=_resolve_trace_dir(trace_dir))
    summaries = store.list_runs(limit=limit)

    if not summaries:
        typer.echo("No runs found.")
        return

    headers = ["Run ID", "Agent", "Started", "Status", "Steps"]
    rows = []
    for s in summaries:
        rows.append(
            [
                s.run_id,
                s.agent_name,
                s.started_at.strftime("%Y-%m-%d %H:%M:%S"),
                s.status,
                str(s.step_count),
            ]
        )
    typer.echo(format_table(headers, rows))


@runs_app.command("inspect")
def inspect_run(
    run_id: str = typer.Argument(help="Run ID to inspect"),  # noqa: B008
    trace_dir: TraceDirOption = None,
    verbose: bool = typer.Option(  # noqa: B008
        False, "--verbose", "-v", help="Show full payloads"
    ),
) -> None:
    """Show detailed trace for a run."""
    store = LocalTraceStore(base_dir=_resolve_trace_dir(trace_dir))
    try:
        record = store.load_record(run_id)
    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(1) from e

    typer.echo(f"Run ID:     {record.record_id}")
    typer.echo(f"Agent:      {record.agent.name}")
    typer.echo(f"Started:    {record.execution.started_at}")
    if record.execution.ended_at:
        typer.echo(f"Ended:      {record.execution.ended_at}")
    typer.echo(f"Status:     {record.execution.status}")
    if record.totals.total_tokens > 0:
        typer.echo(f"Tokens:     {record.totals.total_tokens}")
    if record.replay_of:
        typer.echo(f"Replay of:  {record.replay_of}")
    typer.echo("")

    for step in record.steps:
        _print_step(step, verbose=verbose)


def _print_step(
    step: LLMCallStep | ToolCallStep | PolicyViolationStep,
    *,
    verbose: bool,
) -> None:
    """Print a single execution step."""
    if isinstance(step, LLMCallStep):
        line = f"  [{step.step_index:>3}] llm_call  provider={step.provider} model={step.model}"
        line += f"  {format_duration(step.duration_ms)}"
        if step.token_usage is not None:
            line += f"  tokens={step.token_usage.total_tokens}"
        typer.echo(line)
        if verbose:
            typer.echo(f"         input: {step.input_data}")
            typer.echo(f"         output: {step.output_data}")
    elif isinstance(step, ToolCallStep):
        line = f"  [{step.step_index:>3}] tool_call  tool={step.tool_name}"
        line += f"  {format_duration(step.duration_ms)}"
        typer.echo(line)
        if verbose:
            typer.echo(f"         args: {step.args}")
            typer.echo(f"         output: {step.output_data}")
    elif isinstance(step, PolicyViolationStep):
        line = f"  [{step.step_index:>3}] policy_violation  policy={step.policy_name}"
        typer.echo(line)
        if verbose:
            typer.echo(f"         message: {step.message}")
            typer.echo(f"         details: {step.details}")


@app.command("ui")
def launch_ui(
    port: int = typer.Option(8787, help="Port for the UI server"),  # noqa: B008
    trace_dir: TraceDirOption = None,
    no_open: bool = typer.Option(  # noqa: B008
        False, "--no-open", help="Don't auto-open the browser"
    ),
) -> None:
    """Launch the Paprika trace viewer in your browser."""
    try:
        import uvicorn  # noqa: F811
    except ImportError:
        typer.echo(
            "Paprika UI requires extra dependencies.\n"
            "Install them with:  pip install paprika[ui]",
            err=True,
        )
        raise typer.Exit(1) from None

    from paprika.ui import create_app

    resolved = _resolve_trace_dir(trace_dir)
    store = LocalTraceStore(base_dir=resolved)
    ui_app = create_app(store)
    url = f"http://127.0.0.1:{port}"

    if not no_open:
        import threading
        import webbrowser

        def _open_browser() -> None:
            try:
                webbrowser.open(url)
            except Exception:  # noqa: BLE001
                pass

        threading.Timer(1.5, _open_browser).start()

    typer.echo(f"Paprika UI running at {url}")
    typer.echo(f"Serving traces from {store.base_dir}")
    typer.echo("Press Ctrl+C to stop.")
    try:
        uvicorn.run(ui_app, host="127.0.0.1", port=port, log_level="warning")
    except OSError as exc:
        typer.echo(f"Error: {exc}", err=True)
        typer.echo(f"Port {port} may be in use. Try: paprika ui --port {port + 1}", err=True)
        raise typer.Exit(1) from exc


@runs_app.command("diff")
def diff_runs(
    run_id_a: str = typer.Argument(help="First run ID"),  # noqa: B008
    run_id_b: str = typer.Argument(help="Second run ID"),  # noqa: B008
    trace_dir: TraceDirOption = None,
) -> None:
    """Compare two runs step by step."""
    store = LocalTraceStore(base_dir=_resolve_trace_dir(trace_dir))
    try:
        record_a = store.load_record(run_id_a)
        record_b = store.load_record(run_id_b)
    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(1) from e

    steps_a = record_a.steps
    steps_b = record_b.steps

    typer.echo(f"Run A: {record_a.record_id}  ({len(steps_a)} steps)")
    typer.echo(f"Run B: {record_b.record_id}  ({len(steps_b)} steps)")
    typer.echo("")

    max_len = max(len(steps_a), len(steps_b))
    mismatches = 0

    for i in range(max_len):
        sa = steps_a[i] if i < len(steps_a) else None
        sb = steps_b[i] if i < len(steps_b) else None

        type_a = sa.step_type if sa else "—"
        type_b = sb.step_type if sb else "—"

        if type_a != type_b:
            typer.echo(f"  [{i}] MISMATCH  A={type_a}  B={type_b}")
            mismatches += 1
        else:
            hash_a = getattr(sa, "input_hash", None)
            hash_b = getattr(sb, "input_hash", None)
            if hash_a and hash_b and hash_a != hash_b:
                typer.echo(f"  [{i}] HASH DIFF  type={type_a}  A={hash_a[:8]}  B={hash_b[:8]}")
                mismatches += 1
            else:
                typer.echo(f"  [{i}] MATCH     type={type_a}")

    typer.echo("")
    if mismatches == 0:
        typer.echo("Runs are structurally identical.")
    else:
        typer.echo(f"{mismatches} difference(s) found.")
