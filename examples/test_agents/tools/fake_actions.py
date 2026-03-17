"""Side-effect actions with a tracker for replay verification."""

from __future__ import annotations


class SideEffectTracker:
    """Records all side effects for later inspection or replay comparison."""

    def __init__(self) -> None:
        self.effects: list[dict] = []

    def record(self, action: str, **kwargs) -> None:
        self.effects.append({"action": action, **kwargs})

    def reset(self) -> None:
        self.effects.clear()

    def summary(self) -> list[dict]:
        return list(self.effects)


_tracker = SideEffectTracker()


def get_tracker() -> SideEffectTracker:
    """Return the global side-effect tracker."""
    return _tracker


def issue_refund(email: str, amount: float) -> dict:
    """Issue a refund to a customer."""
    _tracker.record("issue_refund", email=email, amount=amount)
    return {"success": True, "email": email, "amount": amount, "refund_id": "REF-001"}


def send_email(to: str, subject: str, body: str) -> dict:
    """Send an email to a customer."""
    _tracker.record("send_email", to=to, subject=subject, body=body)
    return {"success": True, "to": to, "message_id": "MSG-001"}


def escalate_ticket(email: str, reason: str) -> dict:
    """Escalate a support ticket to a human agent."""
    _tracker.record("escalate_ticket", email=email, reason=reason)
    return {"success": True, "email": email, "ticket_id": "TKT-001"}
