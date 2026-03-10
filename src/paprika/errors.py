"""Paprika error hierarchy."""

from __future__ import annotations

from typing import Any


class PaprikaError(Exception):
    """Base exception for all paprika errors."""


class PolicyViolationError(PaprikaError):
    """Raised when a runtime policy limit is exceeded."""

    def __init__(
        self,
        policy_name: str,
        message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.policy_name = policy_name
        self.details = details or {}
        super().__init__(message)


class ReplayMismatchError(PaprikaError):
    """Raised when replay execution diverges from the recorded trace."""

    def __init__(self, step_index: int, expected: str, actual: str) -> None:
        self.step_index = step_index
        self.expected = expected
        self.actual = actual
        super().__init__(f"Replay mismatch at step {step_index}: expected {expected}, got {actual}")


class TraceNotFoundError(PaprikaError):
    """Raised when a requested trace cannot be found."""

    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        super().__init__(f"Trace not found for run_id: {run_id}")


class InvalidRunIdError(PaprikaError):
    """Raised when a run_id contains unsafe or invalid characters."""

    def __init__(self, run_id: str) -> None:
        self.run_id = run_id
        super().__init__(
            f"Invalid run_id: {run_id!r}. "
            "Run IDs must contain only alphanumeric characters, hyphens, underscores, and dots."
        )
