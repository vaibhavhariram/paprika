"""Deterministic policy document tool."""

POLICIES = {
    "refund": {
        "title": "Refund Policy",
        "content": (
            "Standard refunds are processed within 5 business days. "
            "Risk-flagged accounts must be escalated to a manager. "
            "Refunds over $500 require VP approval."
        ),
    },
    "escalation": {
        "title": "Escalation Policy",
        "content": (
            "Escalate when: (1) customer is risk-flagged, "
            "(2) refund amount exceeds $500, (3) customer explicitly requests, "
            "or (4) agent is uncertain about the correct action."
        ),
    },
    "privacy": {
        "title": "Privacy Policy",
        "content": (
            "Customer data must not be shared with third parties. "
            "PII must be redacted from logs. Access is audit-logged."
        ),
    },
}


def get_policy(name: str) -> dict:
    """Retrieve a specific policy by name."""
    policy = POLICIES.get(name.lower())
    if policy:
        return {"found": True, **policy}
    return {"found": False, "title": None, "content": "Policy not found."}


def search_policies(query: str) -> dict:
    """Search across all policies for a keyword."""
    query_lower = query.lower()
    matches = []
    for key, policy in POLICIES.items():
        if query_lower in policy["content"].lower() or query_lower in key:
            matches.append({"name": key, "title": policy["title"]})
    return {"matches": matches, "count": len(matches)}
