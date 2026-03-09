#!/usr/bin/env python3
"""Vanilla Python agent loop wrapped with Paprika.

Pattern: reasoning (LLM) -> tool -> decision (LLM), repeated until done.

Demonstrates:
- Runtime tracing of multi-step loop
- Policy limits (max_steps)
- Deterministic replay

Run:
  uv run python examples/simple_agent_loop.py
  uv run python examples/simple_agent_loop.py --replay <run_id>
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

from paprika import PaprikaRuntime, PolicyConfig
from paprika.errors import PolicyViolationError

if TYPE_CHECKING:
    from paprika.context import PaprikaContext


def _extract_content(resp: dict[str, Any]) -> str:
    """Extract text from LLM response."""
    try:
        return resp["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        return ""


def create_runtime(trace_dir: Path) -> PaprikaRuntime:
    """Build runtime with agent loop for both run and replay."""
    runtime = PaprikaRuntime(
        policy=PolicyConfig(max_steps=5),
        trace_dir=trace_dir,
    )

    def search_kb(query: str) -> str:
        """Simulate a knowledge-base search tool."""
        return f"Found: [doc1, doc2] for query '{query}'"

    runtime.register_tool("search_kb", search_kb)

    @runtime.agent()
    def agent_loop(ctx: PaprikaContext, user_query: str) -> str:
        messages = [{"role": "user", "content": user_query}]
        max_iterations = 2
        final_answer = ""

        for i in range(max_iterations):
            # 1. Reasoning: LLM decides what to do
            reasoning_input = {
                "messages": messages,
                "_mock_response": {
                    "choices": [
                        {
                            "message": {
                                "content": f"Search for: {user_query}"
                                if i == 0
                                else "DONE. Answer: Here is the summary.",
                                "role": "assistant",
                            }
                        }
                    ]
                },
                "_mock_usage": {"prompt_tokens": 50, "completion_tokens": 20, "total_tokens": 70},
            }
            reasoning = ctx.llm.call(
                provider="mock",
                model="mock",
                input=reasoning_input,
            )
            content = _extract_content(reasoning)
            messages.append({"role": "assistant", "content": content})

            if "DONE" in content.upper():
                final_answer = content
                break

            # 2. Tool call
            tool_result = ctx.tools.call(
                name="search_kb",
                args={"query": user_query},
            )
            messages.append({"role": "user", "content": f"Tool result: {tool_result}"})

            # 3. Decision: LLM interprets tool result
            decision_input = {
                "messages": messages,
                "_mock_response": {
                    "choices": [
                        {
                            "message": {
                                "content": "DONE. Answer: Summary based on search.",
                                "role": "assistant",
                            }
                        }
                    ]
                },
                "_mock_usage": {"prompt_tokens": 50, "completion_tokens": 15, "total_tokens": 65},
            }
            decision = ctx.llm.call(
                provider="mock",
                model="mock",
                input=decision_input,
            )
            content = _extract_content(decision)
            messages.append({"role": "assistant", "content": content})
            final_answer = content

            if "DONE" in content.upper():
                break

        return final_answer or "No answer"

    return runtime, agent_loop


def main() -> int:
    parser = argparse.ArgumentParser(description="Agent loop with Paprika")
    parser.add_argument(
        "--replay",
        metavar="RUN_ID",
        help="Replay a prior run instead of executing",
    )
    args = parser.parse_args()

    trace_dir = Path(os.environ.get("PAPRIKA_TRACE_DIR", "~/.paprika/traces")).expanduser()
    runtime, agent_loop = create_runtime(trace_dir)

    if args.replay:
        try:
            result = runtime.replay(args.replay)
            print(result)
            return 0
        except Exception as e:
            print(f"Replay failed: {e}", file=sys.stderr)
            return 1

    try:
        result = agent_loop("What is the return policy?")
        print(result)
        summaries = runtime.trace_store.list_runs(limit=1)
        if summaries:
            print(f"Run ID: {summaries[0].run_id}")
        return 0
    except PolicyViolationError as e:
        print(f"Policy violation (expected with strict limits): {e}")
        summaries = runtime.trace_store.list_runs(limit=1)
        if summaries:
            print(f"Run ID: {summaries[0].run_id}")
        return 0


if __name__ == "__main__":
    sys.exit(main())
