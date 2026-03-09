#!/usr/bin/env python3
"""Minimal Paprika agent example: tools only, no LLM calls.

Run: uv run python examples/basic_agent.py

Uses default trace directory ~/.paprika/traces. Override with PAPRIKA_TRACE_DIR.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING

from paprika import PaprikaRuntime

if TYPE_CHECKING:
    from paprika.context import PaprikaContext


def main() -> None:
    trace_dir = Path(os.environ.get("PAPRIKA_TRACE_DIR", "~/.paprika/traces")).expanduser()
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

    result = support_agent("help me with my account")
    print(result)

    # Print run_id for CLI inspection
    summaries = runtime.trace_store.list_runs(limit=1)
    if summaries:
        print(f"Run ID: {summaries[0].run_id}")


if __name__ == "__main__":
    main()
