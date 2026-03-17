"""Full support workflow agent with happy-path, replay, and replay-mismatch demos.

Usage:
    python -m agents.support_workflow_agent                  # happy path
    python -m agents.support_workflow_agent --replay <id>    # replay a prior run
    python -m agents.support_workflow_agent --replay-mismatch # replay with altered tools
"""

from __future__ import annotations

import argparse
import sys

from paprika import PaprikaContext, PolicyConfig
from paprika.errors import ReplayMismatchError, TraceNotFoundError

from agents.common import create_runtime, mock_llm_response
from tools.fake_actions import get_tracker


def build_agent(runtime):
    """Register the support workflow agent on the given runtime."""

    @runtime.agent(name="support_workflow_agent")
    def support_workflow_agent(ctx: PaprikaContext, email: str) -> dict:
        """Happy-path support agent: look up, check eligibility, act correctly."""
        # Step 1: Look up customer
        customer = ctx.tools.call(name="lookup_customer", args={"email": email})
        print(f"  [agent] Customer: {customer}")

        if not customer["found"]:
            return {"decision": "customer_not_found", "email": email}

        # Step 2: Check subscription
        sub = ctx.tools.call(name="get_subscription", args={"email": email})
        print(f"  [agent] Subscription: {sub}")

        # Step 3: Look up refund policy
        policy = ctx.tools.call(name="get_policy", args={"name": "refund"})
        print(f"  [agent] Policy: {policy}")

        # Step 4: Check eligibility
        eligibility = ctx.tools.call(name="check_refund_eligibility", args={"email": email})
        print(f"  [agent] Eligibility: {eligibility}")

        # Step 5: LLM decides what to do
        llm_out = ctx.llm.call(
            provider="mock",
            model="mock",
            input=mock_llm_response(
                f"Customer {email} is eligible: {eligibility['eligible']}. "
                f"Reason: {eligibility['reason']}. "
                "I will proceed with the refund since the customer is eligible."
            ),
        )
        decision = llm_out["choices"][0]["message"]["content"]
        print(f"  [agent] LLM decision: {decision}")

        # Step 6: Take action based on eligibility
        if eligibility["eligible"]:
            refund = ctx.tools.call(name="issue_refund", args={"email": email, "amount": 49.99})
            ctx.tools.call(
                name="send_email",
                args={
                    "to": email,
                    "subject": "Refund processed",
                    "body": f"Your refund of $49.99 has been issued. Ref: {refund['refund_id']}",
                },
            )
            return {"decision": "refund_issued", "refund": refund}
        else:
            escalation = ctx.tools.call(
                name="escalate_ticket",
                args={"email": email, "reason": eligibility["reason"]},
            )
            ctx.tools.call(
                name="send_email",
                args={
                    "to": email,
                    "subject": "Your request has been escalated",
                    "body": "A manager will review your case shortly.",
                },
            )
            return {"decision": "escalated", "ticket": escalation}

    return support_workflow_agent


def run_happy_path() -> str:
    """Run the support workflow for Alice (eligible for refund)."""
    tracker = get_tracker()
    tracker.reset()

    runtime = create_runtime(policy=PolicyConfig(max_steps=20))
    agent = build_agent(runtime)

    result = agent(email="alice@example.com")

    print(f"\nResult: {result}")
    print(f"Side effects: {tracker.summary()}")

    summaries = runtime.trace_store.list_runs(limit=1)
    run_id = summaries[0].run_id if summaries else "unknown"
    print(f"Trace: run_id={run_id}")
    return run_id


def run_replay(run_id: str) -> None:
    """Replay a prior run deterministically."""
    runtime = create_runtime(policy=PolicyConfig(max_steps=20))
    build_agent(runtime)

    try:
        result = runtime.replay(run_id=run_id)
        print(f"\nReplay result: {result}")
        print("Replay succeeded — execution matched the original trace.")
    except TraceNotFoundError:
        print(f"Error: No trace found for run_id '{run_id}'")
        sys.exit(1)
    except ReplayMismatchError as exc:
        print(f"Replay mismatch at step {exc.step_index}:")
        print(f"  Expected: {exc.expected}")
        print(f"  Got:      {exc.actual}")
        sys.exit(1)


def run_replay_mismatch() -> None:
    """Run an agent, then replay with a modified agent that produces different inputs.

    Replay compares input hashes at each step. If the agent code changes so that
    tool call arguments differ from the recorded trace, a ReplayMismatchError fires.
    """
    # First, run the original (Alice happy path)
    print("=== Original run ===")
    run_id = run_happy_path()

    # Now register a modified agent that calls lookup_customer with a different email.
    # The replay engine will detect that the input hash at step 0 doesn't match.
    print("\n=== Replay with altered agent (expecting mismatch) ===")
    runtime = create_runtime(policy=PolicyConfig(max_steps=20))

    @runtime.agent(name="support_workflow_agent")
    def support_workflow_agent_v2(ctx: PaprikaContext, email: str) -> dict:
        """Modified agent that looks up a DIFFERENT customer than the original."""
        # This calls lookup_customer with bob instead of the original alice,
        # causing a different input hash → ReplayMismatchError
        customer = ctx.tools.call(name="lookup_customer", args={"email": "bob@example.com"})
        return {"decision": "altered", "customer": customer}

    try:
        result = runtime.replay(run_id=run_id)
        print(f"Replay result (unexpected success): {result}")
    except ReplayMismatchError as exc:
        print(f"Replay mismatch detected (expected):")
        print(f"  Step index: {exc.step_index}")
        print(f"  Expected:   {exc.expected}")
        print(f"  Actual:     {exc.actual}")
    except TraceNotFoundError:
        print(f"Error: Trace not found for run_id '{run_id}'")


def main() -> None:
    parser = argparse.ArgumentParser(description="Support workflow agent")
    parser.add_argument("--replay", metavar="RUN_ID", help="Replay a prior run by ID")
    parser.add_argument("--replay-mismatch", action="store_true", help="Demo replay mismatch detection")
    args = parser.parse_args()

    if args.replay:
        run_replay(args.replay)
    elif args.replay_mismatch:
        run_replay_mismatch()
    else:
        run_happy_path()


if __name__ == "__main__":
    main()
