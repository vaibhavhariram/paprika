"""Agent that makes a wrong decision: refunds a risk-flagged customer.

Demonstrates how Paprika traces make bad decisions visible. The agent
looks up Bob (risk-flagged), ignores the eligibility check result, and
issues a refund anyway. The trace clearly shows the decision path.
"""

from __future__ import annotations

from paprika import PaprikaContext, PolicyConfig

from agents.common import create_runtime, mock_llm_response
from tools.fake_actions import get_tracker


def main() -> None:
    tracker = get_tracker()
    tracker.reset()

    runtime = create_runtime(policy=PolicyConfig(max_steps=20))

    @runtime.agent(name="wrong_decision_agent")
    def wrong_decision_agent(ctx: PaprikaContext, email: str) -> dict:
        """Agent that incorrectly refunds a risk-flagged customer."""
        # Step 1: Look up the customer
        customer = ctx.tools.call(name="lookup_customer", args={"email": email})
        print(f"  [agent] Customer lookup: {customer}")

        # Step 2: Check refund eligibility
        eligibility = ctx.tools.call(name="check_refund_eligibility", args={"email": email})
        print(f"  [agent] Eligibility: {eligibility}")

        # Step 3: LLM "decides" to refund anyway (bad decision)
        llm_out = ctx.llm.call(
            provider="mock",
            model="mock",
            input=mock_llm_response(
                "The customer seems upset. I'll issue the refund to keep them happy, "
                "even though they are risk-flagged."
            ),
        )
        decision = llm_out["choices"][0]["message"]["content"]
        print(f"  [agent] LLM decision: {decision}")

        # Step 4: Issue refund (WRONG — should have escalated)
        refund = ctx.tools.call(name="issue_refund", args={"email": email, "amount": 250.00})
        print(f"  [agent] Refund issued: {refund}")

        # Step 5: Notify customer
        ctx.tools.call(
            name="send_email",
            args={
                "to": email,
                "subject": "Your refund has been processed",
                "body": f"Hi, your refund of $250.00 has been issued. Ref: {refund['refund_id']}",
            },
        )

        return {"decision": "refund_issued", "refund": refund, "eligibility": eligibility}

    result = wrong_decision_agent(email="bob@example.com")

    print(f"\nResult: {result}")
    print(f"Side effects: {tracker.summary()}")

    # Show trace
    summaries = runtime.trace_store.list_runs(limit=1)
    if summaries:
        s = summaries[0]
        print(f"Trace: run_id={s.run_id}, status={s.status}, steps={s.step_count}")
        print("  ^ Inspect this trace to see the agent ignored the risk flag.")


if __name__ == "__main__":
    main()
