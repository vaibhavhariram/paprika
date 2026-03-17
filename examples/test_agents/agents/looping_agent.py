"""Agent that loops until it hits the max_steps policy limit.

Demonstrates how Paprika enforces step-count budgets. The agent
repeatedly searches the KB and calls the LLM in a tight loop,
triggering a PolicyViolationError.
"""

from __future__ import annotations

from paprika import PaprikaContext, PolicyConfig
from paprika.errors import PolicyViolationError

from agents.common import create_runtime, mock_llm_response


def main() -> None:
    runtime = create_runtime(policy=PolicyConfig(max_steps=5))

    @runtime.agent(name="looping_agent")
    def looping_agent(ctx: PaprikaContext) -> str:
        """Agent that keeps searching and reasoning in a loop."""
        queries = [
            "refund policy",
            "subscription tiers",
            "escalation procedure",
            "business hours",
            "refund policy",  # repeat
            "subscription tiers",  # repeat
        ]
        results = []
        for q in queries:
            result = ctx.tools.call(name="search", args={"query": q})
            llm_out = ctx.llm.call(
                provider="mock",
                model="mock",
                input=mock_llm_response(f"Thinking about: {q} -> {result}"),
            )
            results.append(llm_out)
        return f"Completed {len(results)} iterations (should not reach here)"

    try:
        result = looping_agent()
        print(f"Result: {result}")
    except PolicyViolationError as exc:
        print(f"Policy violation (expected): {exc.policy_name} — {exc}")

    # Show the trace was still recorded
    summaries = runtime.trace_store.list_runs(limit=1)
    if summaries:
        s = summaries[0]
        print(f"Trace: run_id={s.run_id}, status={s.status}, steps={s.step_count}")


if __name__ == "__main__":
    main()
