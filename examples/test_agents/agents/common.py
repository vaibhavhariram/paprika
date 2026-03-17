"""Shared runtime factory and tool registration for test agents."""

from __future__ import annotations

import os
from pathlib import Path

from paprika import PaprikaRuntime, PolicyConfig

from tools.fake_actions import (
    escalate_ticket,
    issue_refund,
    send_email,
)
from tools.fake_customer_db import (
    check_refund_eligibility,
    get_subscription,
    lookup,
)
from tools.fake_policy_docs import get_policy, search_policies
from tools.fake_search import search


def get_trace_dir() -> Path:
    """Return the trace directory, defaulting to ./traces."""
    return Path(os.environ.get("PAPRIKA_TRACE_DIR", str(Path(__file__).resolve().parent.parent / "traces")))


def create_runtime(
    policy: PolicyConfig | None = None,
) -> PaprikaRuntime:
    """Create a PaprikaRuntime with all fake tools registered."""
    if policy is None:
        policy = PolicyConfig(max_steps=20, max_tokens=50000)

    runtime = PaprikaRuntime(policy=policy, trace_dir=get_trace_dir())

    # Knowledge base
    runtime.register_tool("search", search)

    # Customer database
    runtime.register_tool("lookup_customer", lookup)
    runtime.register_tool("get_subscription", get_subscription)
    runtime.register_tool("check_refund_eligibility", check_refund_eligibility)

    # Policy documents
    runtime.register_tool("get_policy", get_policy)
    runtime.register_tool("search_policies", search_policies)

    # Actions (side effects)
    runtime.register_tool("issue_refund", issue_refund)
    runtime.register_tool("send_email", send_email)
    runtime.register_tool("escalate_ticket", escalate_ticket)

    return runtime


def mock_llm_response(content: str, prompt_tokens: int = 100, completion_tokens: int = 50) -> dict:
    """Build the input dict for a mock LLM call with a predetermined response."""
    return {
        "messages": [{"role": "user", "content": "(test)"}],
        "_mock_response": {
            "choices": [{"message": {"content": content, "role": "assistant"}}],
        },
        "_mock_usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        },
    }
