#!/usr/bin/env python3
"""Realistic customer support agent harness for validating Paprika.

Product-like workflow with fake tools. Runs locally via provider="mock".
Use for validation and playground only — not part of Paprika core.

Scenarios:
  happy-path      Normal flow: lookup -> eligibility -> action -> email
  loop            Deliberate runaway; triggers policy enforcement
  duplicate-action  Agent issues refund twice; tests trace clarity and replay safety
  replay          Replay prior run; verifies no live side effects
  replay-mismatch  Changed path triggers ReplayMismatchError

Usage:
  uv run python examples/playgrounds/support_agent_harness.py happy-path
  uv run python examples/playgrounds/support_agent_harness.py replay <run_id>
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import TYPE_CHECKING, Any

from paprika import PaprikaRuntime, PolicyConfig
from paprika.errors import PolicyViolationError, ReplayMismatchError, TraceNotFoundError

if TYPE_CHECKING:
    from paprika.context import PaprikaContext

# Trace dir for harness — isolated from default ~/.paprika
HARNESS_TRACE_DIR = Path(os.environ.get("PAPRIKA_TRACE_DIR", "~/.paprika/playground")).expanduser()


class SideEffectTracker:
    """Tracks side-effecting tool calls for replay verification."""

    def __init__(self) -> None:
        self.refunds: list[tuple[str, float]] = []
        self.emails: list[tuple[str, str, str]] = []

    def clear(self) -> None:
        self.refunds.clear()
        self.emails.clear()

    def record_refund(self, customer_id: str, amount: float) -> None:
        self.refunds.append((customer_id, amount))

    def record_email(self, email: str, subject: str, body: str) -> None:
        self.emails.append((email, subject, body))


# Module-level tracker so tools and main can share state
_tracker = SideEffectTracker()

# Mock customer DB
_MOCK_CUSTOMERS: dict[str, dict[str, Any]] = {
    "alice@example.com": {
        "customer_id": "cust-001",
        "plan_tier": "premium",
        "refund_history": 0,
        "risk_flag": False,
    },
    "bob@example.com": {
        "customer_id": "cust-002",
        "plan_tier": "basic",
        "refund_history": 2,
        "risk_flag": True,
    },
}


def _lookup_customer(email: str) -> dict[str, Any]:
    """Returns mock customer data."""
    return dict(
        _MOCK_CUSTOMERS.get(
            email,
            {
                "customer_id": "cust-unknown",
                "plan_tier": "free",
                "refund_history": 0,
                "risk_flag": False,
            },
        )
    )


def _check_refund_eligibility(customer_id: str) -> dict[str, Any]:
    """Simple business logic: eligible if < 3 refunds and not risk-flagged."""
    for c in _MOCK_CUSTOMERS.values():
        if c["customer_id"] == customer_id:
            eligible = c["refund_history"] < 3 and not c["risk_flag"]
            return {"eligible": eligible, "reason": "policy_check"}
    return {"eligible": False, "reason": "customer_not_found"}


def _issue_refund(customer_id: str, amount: float) -> dict[str, Any]:
    """Side-effecting: records that a refund was issued."""
    _tracker.record_refund(customer_id, amount)
    return {"status": "issued", "customer_id": customer_id, "amount": amount}


def _send_email(email: str, subject: str, body: str) -> dict[str, Any]:
    """Side-effecting: records what would have been sent."""
    _tracker.record_email(email, subject, body)
    return {"status": "sent", "to": email}


def _create_runtime(
    max_steps: int = 20,
    max_repeat_hashes: int | None = 3,
    trace_dir: Path | None = None,
) -> PaprikaRuntime:
    """Build runtime with support tools. Uses public API only."""
    trace_dir = trace_dir or HARNESS_TRACE_DIR
    trace_dir.mkdir(parents=True, exist_ok=True)

    policy = PolicyConfig(max_steps=max_steps, max_repeat_hashes=max_repeat_hashes)
    runtime = PaprikaRuntime(policy=policy, trace_dir=trace_dir)

    runtime.register_tool("lookup_customer", _lookup_customer)
    runtime.register_tool("check_refund_eligibility", _check_refund_eligibility)
    runtime.register_tool("issue_refund", _issue_refund)
    runtime.register_tool("send_email", _send_email)

    return runtime


def _mock_llm_response(ctx: PaprikaContext, next_action: str) -> str:
    """Call mock LLM that returns the next action (for scripted scenarios)."""
    resp = ctx.llm.call(
        provider="mock",
        model="mock",
        input={
            "messages": [{"role": "user", "content": "next"}],
            "_mock_response": {
                "choices": [{"message": {"content": next_action, "role": "assistant"}}]
            },
            "_mock_usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
        },
    )
    return resp["choices"][0]["message"]["content"]


def _create_support_agent(runtime: PaprikaRuntime, script: list[str]):
    """Register agent that follows the given script. Returns the agent callable."""

    @runtime.agent()
    def support_agent(ctx: PaprikaContext, cust_email: str, msg: str) -> str:
        script_idx = 0
        customer_id: str | None = None
        outcome = "pending"

        while script_idx < len(script):
            action = _mock_llm_response(ctx, script[script_idx])
            script_idx += 1

            if action == "done":
                outcome = "resolved"
                break
            elif action == "lookup":
                data = ctx.tools.call(name="lookup_customer", args={"email": cust_email})
                customer_id = data["customer_id"]
            elif action == "check_eligibility":
                if customer_id:
                    ctx.tools.call(
                        name="check_refund_eligibility",
                        args={"customer_id": customer_id},
                    )
            elif action == "issue_refund":
                if customer_id:
                    ctx.tools.call(
                        name="issue_refund",
                        args={"customer_id": customer_id, "amount": 29.99},
                    )
            elif action == "send_email":
                ctx.tools.call(
                    name="send_email",
                    args={
                        "email": cust_email,
                        "subject": "Support response",
                        "body": f"Re: {msg}",
                    },
                )

        return outcome

    return support_agent


def _run_agent(
    runtime: PaprikaRuntime,
    email: str,
    complaint: str,
    script: list[str],
) -> str:
    """Execute agent following the given action script. Returns final output."""
    agent = _create_support_agent(runtime, script)
    return agent(email, complaint)


def cmd_happy_path(runtime: PaprikaRuntime) -> int:
    """Normal flow: lookup -> check -> refund -> done."""
    print("Scenario: happy-path (normal support flow)")
    _tracker.clear()

    script = ["lookup", "check_eligibility", "issue_refund", "done"]
    result = _run_agent(
        runtime,
        email="alice@example.com",
        complaint="I want a refund for my order",
        script=script,
    )

    print(f"  Result: {result}")
    print(f"  Refunds issued: {len(_tracker.refunds)}")
    print(f"  Emails sent: {len(_tracker.emails)}")

    summaries = runtime.trace_store.list_runs(limit=1)
    if summaries:
        print(f"  Trace: {summaries[0].run_id}")
    return 0


def cmd_loop(runtime: PaprikaRuntime) -> int:
    """Deliberate runaway: repeat same actions until policy stops."""
    print("Scenario: loop (policy enforcement)")
    # Create runtime with strict limits
    trace_dir = runtime.trace_store.base_dir
    strict_runtime = _create_runtime(
        max_steps=5,
        max_repeat_hashes=3,
        trace_dir=trace_dir,
    )

    _tracker.clear()
    script = ["lookup", "check_eligibility"] * 3  # 6 steps; max_steps=5 triggers

    try:
        _run_agent(strict_runtime, "alice@example.com", "refund", script)
        print("  Unexpected: no policy violation")
        return 1
    except PolicyViolationError as e:
        print(f"  PolicyViolationError (expected): {e.policy_name}")
        summaries = strict_runtime.trace_store.list_runs(limit=1)
        if summaries:
            print(f"  Trace: {summaries[0].run_id}")
        return 0


def cmd_duplicate_action(runtime: PaprikaRuntime) -> int:
    """Agent issues same refund twice; trace shows both; replay stubs both."""
    print("Scenario: duplicate-action (same refund twice)")
    _tracker.clear()

    script = ["lookup", "issue_refund", "issue_refund", "done"]
    result = _run_agent(
        runtime,
        email="alice@example.com",
        complaint="refund x2",
        script=script,
    )

    print(f"  Result: {result}")
    print(f"  Refunds issued (live): {len(_tracker.refunds)} (expect 2)")
    summaries = runtime.trace_store.list_runs(limit=1)
    if summaries:
        print(f"  Trace: {summaries[0].run_id}")
    return 0


def cmd_replay(runtime: PaprikaRuntime, run_id: str) -> int:
    """Replay prior run; verify no live side effects."""
    print("Scenario: replay (no side effects)")
    _tracker.clear()

    # Register same agent as happy-path (required for replay)
    happy_script = ["lookup", "check_eligibility", "issue_refund", "done"]
    _create_support_agent(runtime, happy_script)

    replayed = runtime.replay(run_id)
    print(f"  Replay output: {replayed}")
    print(f"  Refunds issued during replay: {len(_tracker.refunds)} (expect 0)")
    print(f"  Emails sent during replay: {len(_tracker.emails)} (expect 0)")

    if _tracker.refunds or _tracker.emails:
        print("  FAIL: Side effects occurred during replay")
        return 1
    print("  OK: No side effects during replay")
    return 0


def cmd_replay_mismatch(runtime: PaprikaRuntime, run_id: str) -> int:
    """Replay with changed agent path; expect ReplayMismatchError."""
    print("Scenario: replay-mismatch (divergent path)")

    # Agent with extra step (send_email before refund) — input hash will differ
    diverged_script = [
        "lookup",
        "check_eligibility",
        "send_email",  # Extra step not in original
        "issue_refund",
        "done",
    ]
    _create_support_agent(runtime, diverged_script)

    try:
        runtime.replay(run_id)
        print("  Unexpected: replay succeeded despite path change")
        return 1
    except ReplayMismatchError as e:
        print(f"  ReplayMismatchError (expected): step {e.step_index}")
        return 0
    except TraceNotFoundError as e:
        print(f"  TraceNotFoundError: {e}")
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Support agent harness for Paprika validation")
    parser.add_argument(
        "scenario",
        choices=["happy-path", "loop", "duplicate-action", "replay", "replay-mismatch"],
        help="Scenario to run",
    )
    parser.add_argument(
        "run_id",
        nargs="?",
        help="Run ID for replay / replay-mismatch",
    )
    parser.add_argument(
        "--trace-dir",
        default=None,
        type=Path,
        help="Trace directory (default: ~/.paprika/playground)",
    )
    args = parser.parse_args()

    trace_dir = args.trace_dir or HARNESS_TRACE_DIR
    runtime = _create_runtime(trace_dir=trace_dir)

    if args.scenario == "happy-path":
        return cmd_happy_path(runtime)
    if args.scenario == "loop":
        return cmd_loop(runtime)
    if args.scenario == "duplicate-action":
        return cmd_duplicate_action(runtime)
    if args.scenario == "replay":
        if not args.run_id:
            print("replay requires run_id", file=sys.stderr)
            return 1
        return cmd_replay(runtime, args.run_id)
    if args.scenario == "replay-mismatch":
        if not args.run_id:
            print("replay-mismatch requires run_id", file=sys.stderr)
            return 1
        return cmd_replay_mismatch(runtime, args.run_id)

    return 1


if __name__ == "__main__":
    sys.exit(main())
