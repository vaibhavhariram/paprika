"""Deterministic knowledge-base search tool."""

KB = {
    "refund policy": (
        "Refunds are available within 30 days of purchase. "
        "Risk-flagged accounts require manager approval."
    ),
    "subscription tiers": (
        "Plans: Free, Pro ($20/mo), Enterprise (custom). "
        "Upgrades are prorated; downgrades take effect next cycle."
    ),
    "escalation procedure": (
        "Escalate to a human agent when: (1) customer is risk-flagged, "
        "(2) refund exceeds $500, or (3) customer requests it."
    ),
    "business hours": "Support is available Mon–Fri 9 AM – 6 PM ET.",
}


def search(query: str) -> dict:
    """Search the knowledge base. Returns the best matching article."""
    query_lower = query.lower()
    for key, content in KB.items():
        if key in query_lower or any(word in query_lower for word in key.split()):
            return {"found": True, "article": key, "content": content}
    return {"found": False, "article": None, "content": "No matching article found."}
