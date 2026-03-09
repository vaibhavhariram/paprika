#!/usr/bin/env python3
"""Replay a prior run using recorded outputs (no side effects).

Run:
  1. uv run python examples/basic_agent.py   # create a trace
  2. uv run python examples/replay_demo.py <run_id>

The replay produces identical output without executing tools.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from paprika import PaprikaRuntime
from paprika.errors import PaprikaError, TraceNotFoundError

if TYPE_CHECKING:
    from paprika.context import PaprikaContext


def get_runtime(trace_dir: Path) -> PaprikaRuntime:
    """Build runtime with same tools/agent as basic_agent.py."""
    runtime = PaprikaRuntime(trace_dir=trace_dir)

    def lookup_customer(email: str) -> dict[str, str]:
        return {"name": "Alice", "email": email, "plan": "premium"}

    def format_response(data: str) -> str:
        return f"Summary: {data}"

    runtime.register_tool("lookup_customer", lookup_customer)
    runtime.register_tool("format_response", format_response)

    @runtime.agent()
    def support_agent(ctx: PaprikaContext, user_input: str) -> str:
        customer = ctx.tools.call(name="lookup_customer", args={"email": "alice@example.com"})
        result = ctx.tools.call(name="format_response", args={"data": str(customer)})
        return result

    return runtime


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python examples/replay_demo.py <run_id>")
        print("  Get run_id from: paprika runs list")
        return 1

    run_id = sys.argv[1]
    trace_dir = Path(os.environ.get("PAPRIKA_TRACE_DIR", "~/.paprika/traces")).expanduser()
    runtime = get_runtime(trace_dir)

    try:
        result = runtime.replay(run_id)
        print(result)
        summaries = runtime.trace_store.list_runs(limit=1)
        if summaries:
            print(f"Replay run ID: {summaries[0].run_id}")
        return 0
    except TraceNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1
    except PaprikaError as e:
        print(f"Replay error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
