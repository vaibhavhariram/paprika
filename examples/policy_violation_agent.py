#!/usr/bin/env python3
"""Demonstrate policy violations: max_steps, max_tokens, max_repeat_hashes.

Run:
  uv run python examples/policy_violation_agent.py --policy max_steps
  uv run python examples/policy_violation_agent.py --policy max_tokens
  uv run python examples/policy_violation_agent.py --policy max_repeat_hashes

Each run triggers a PolicyViolationError and saves a trace.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import TYPE_CHECKING

from paprika import PaprikaRuntime, PolicyConfig
from paprika.errors import PolicyViolationError

if TYPE_CHECKING:
    from paprika.context import PaprikaContext


def run_max_steps(runtime: PaprikaRuntime) -> None:
    """Exceed max_steps with multiple tool calls."""
    runtime.register_tool("noop", lambda: "ok")

    @runtime.agent()
    def greedy_agent(ctx: PaprikaContext) -> None:
        ctx.tools.call(name="noop", args={})
        ctx.tools.call(name="noop", args={})  # 2nd call triggers violation

    greedy_agent()


def run_max_tokens(runtime: PaprikaRuntime) -> None:
    """Exceed max_tokens using mock LLM with high token count."""

    @runtime.agent()
    def token_hungry_agent(ctx: PaprikaContext) -> str:
        # Mock provider returns configurable usage; one call with 25k tokens exceeds 20k limit
        ctx.llm.call(
            provider="mock",
            model="mock",
            input={
                "messages": [{"role": "user", "content": "hello"}],
                "_mock_response": {
                    "choices": [{"message": {"content": "hi", "role": "assistant"}}]
                },
                "_mock_usage": {
                    "prompt_tokens": 15000,
                    "completion_tokens": 10000,
                    "total_tokens": 25000,
                },
            },
        )
        return "done"

    token_hungry_agent()


def run_max_repeat_hashes(runtime: PaprikaRuntime) -> None:
    """Exceed max_repeat_hashes with identical repeated tool calls."""
    runtime.register_tool("repeat_me", lambda x: x)

    @runtime.agent()
    def looping_agent(ctx: PaprikaContext) -> None:
        args = {"x": "same"}
        for _ in range(5):
            ctx.tools.call(name="repeat_me", args=args)  # same args = same hash

    looping_agent()


def main() -> int:
    parser = argparse.ArgumentParser(description="Demonstrate policy violations")
    parser.add_argument(
        "--policy",
        choices=["max_steps", "max_tokens", "max_repeat_hashes"],
        required=True,
        help="Which policy to violate",
    )
    parser.add_argument(
        "--trace-dir", default=None, help="Trace directory (default: ~/.paprika/traces)"
    )
    args = parser.parse_args()

    default_trace = os.environ.get("PAPRIKA_TRACE_DIR", "~/.paprika/traces")
    trace_dir = Path(args.trace_dir or default_trace).expanduser()
    policy_map = {
        "max_steps": PolicyConfig(max_steps=1),
        "max_tokens": PolicyConfig(max_tokens=20000),
        "max_repeat_hashes": PolicyConfig(max_repeat_hashes=3),
    }
    runtime = PaprikaRuntime(policy=policy_map[args.policy], trace_dir=trace_dir)

    runners = {
        "max_steps": run_max_steps,
        "max_tokens": run_max_tokens,
        "max_repeat_hashes": run_max_repeat_hashes,
    }

    try:
        runners[args.policy](runtime)
        print("Unexpected: no policy violation occurred")
        return 1
    except PolicyViolationError as e:
        print(f"PolicyViolationError (expected): {e}")
        summaries = runtime.trace_store.list_runs(limit=1)
        if summaries:
            print(f"Run ID: {summaries[0].run_id}")
        return 0
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
