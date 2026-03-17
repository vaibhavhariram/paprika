"""Deterministic customer database tool."""

CUSTOMERS = {
    "alice@example.com": {
        "name": "Alice",
        "email": "alice@example.com",
        "plan": "Pro",
        "risk_flag": False,
        "last_payment": "2026-02-15",
        "lifetime_value": 480.00,
    },
    "bob@example.com": {
        "name": "Bob",
        "email": "bob@example.com",
        "plan": "Enterprise",
        "risk_flag": True,
        "last_payment": "2026-01-10",
        "lifetime_value": 12000.00,
    },
}


def lookup(email: str) -> dict:
    """Look up a customer by email."""
    customer = CUSTOMERS.get(email)
    if customer:
        return {"found": True, "customer": customer}
    return {"found": False, "customer": None}


def get_subscription(email: str) -> dict:
    """Get subscription details for a customer."""
    customer = CUSTOMERS.get(email)
    if not customer:
        return {"error": "Customer not found"}
    return {
        "email": email,
        "plan": customer["plan"],
        "last_payment": customer["last_payment"],
        "active": True,
    }


def check_refund_eligibility(email: str) -> dict:
    """Check whether a customer is eligible for a refund."""
    customer = CUSTOMERS.get(email)
    if not customer:
        return {"eligible": False, "reason": "Customer not found"}
    if customer["risk_flag"]:
        return {
            "eligible": False,
            "reason": "Account is risk-flagged. Requires manager approval.",
        }
    return {"eligible": True, "reason": "Customer is eligible for a refund."}
