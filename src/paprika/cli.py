"""Paprika CLI for trace inspection."""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING, Annotated

import typer

from paprika._formatting import format_duration, format_table, truncate
from paprika.events import (
    LLMCallEndEvent,
    LLMCallStartEvent,
    PolicyViolationEvent,
    RunEndEvent,
    RunStartEvent,
    ToolCallEndEvent,
    ToolCallStartEvent,
)
from paprika.trace_store import LocalTraceStore

if TYPE_CHECKING:
    from paprika.events import TraceEvent

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
        trace = store.load(run_id)
    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(1) from e

    typer.echo(f"Run ID:     {trace.run_id}")
    typer.echo(f"Agent:      {trace.agent_name}")
    typer.echo(f"Started:    {trace.started_at}")
    if trace.ended_at:
        typer.echo(f"Ended:      {trace.ended_at}")
    if trace.metadata:
        typer.echo(f"Metadata:   {trace.metadata}")
    typer.echo("")

    for event in trace.events:
        _print_event(event, verbose=verbose)


def _print_event(event: TraceEvent, *, verbose: bool) -> None:
    """Print a single trace event."""
    line = f"  [{event.step_index:>3}] {event.event_type}"

    if isinstance(event, RunStartEvent):
        line += f"  agent={event.agent_name}"
    elif isinstance(event, RunEndEvent):
        line += f"  status={event.status}"
        if event.total_tokens > 0:
            line += f"  total_tokens={event.total_tokens}"
        if event.error is not None:
            line += f"  error={truncate(event.error, 60)}"
    elif isinstance(event, LLMCallStartEvent):
        line += f"  provider={event.provider} model={event.model}"
    elif isinstance(event, LLMCallEndEvent):
        line += f"  {format_duration(event.duration_ms)}"
        if event.token_usage is not None:
            line += f"  tokens={event.token_usage.total_tokens}"
    elif isinstance(event, ToolCallStartEvent):
        line += f"  tool={event.tool_name}"
    elif isinstance(event, ToolCallEndEvent):
        line += f"  {format_duration(event.duration_ms)}"
    elif isinstance(event, PolicyViolationEvent):
        line += f"  policy={event.policy_name}"

    typer.echo(line)

    if verbose:
        if isinstance(event, LLMCallStartEvent):
            typer.echo(f"         input: {event.input_data}")
        elif isinstance(event, LLMCallEndEvent):
            typer.echo(f"         output: {event.output_data}")
        elif isinstance(event, ToolCallStartEvent):
            typer.echo(f"         args: {event.args}")
        elif isinstance(event, ToolCallEndEvent):
            typer.echo(f"         output: {event.output_data}")
        elif isinstance(event, RunStartEvent):
            typer.echo(f"         input_args: {event.input_args}")


@runs_app.command("diff")
def diff_runs(
    run_id_a: str = typer.Argument(help="First run ID"),  # noqa: B008
    run_id_b: str = typer.Argument(help="Second run ID"),  # noqa: B008
    trace_dir: TraceDirOption = None,
) -> None:
    """Compare two runs step by step."""
    store = LocalTraceStore(base_dir=_resolve_trace_dir(trace_dir))
    try:
        trace_a = store.load(run_id_a)
        trace_b = store.load(run_id_b)
    except Exception as e:
        typer.echo(f"Error: {e}", err=True)
        raise typer.Exit(1) from e

    events_a = trace_a.events
    events_b = trace_b.events

    typer.echo(f"Run A: {trace_a.run_id}  ({len(events_a)} events)")
    typer.echo(f"Run B: {trace_b.run_id}  ({len(events_b)} events)")
    typer.echo("")

    max_len = max(len(events_a), len(events_b))
    mismatches = 0

    for i in range(max_len):
        ea = events_a[i] if i < len(events_a) else None
        eb = events_b[i] if i < len(events_b) else None

        type_a = ea.event_type if ea else "—"
        type_b = eb.event_type if eb else "—"

        if type_a != type_b:
            typer.echo(f"  [{i}] MISMATCH  A={type_a}  B={type_b}")
            mismatches += 1
        else:
            hash_a = getattr(ea, "input_hash", None)
            hash_b = getattr(eb, "input_hash", None)
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
