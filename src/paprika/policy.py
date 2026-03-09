"""Runtime policy configuration and enforcement."""

from __future__ import annotations

from pydantic import BaseModel

from paprika.errors import PolicyViolationError


class PolicyConfig(BaseModel):
    """Configurable limits for agent execution."""

    max_steps: int | None = None
    max_tokens: int | None = None
    max_repeat_hashes: int | None = None


class PolicyState(BaseModel):
    """Mutable state tracked during a run for policy evaluation."""

    step_count: int = 0
    total_tokens: int = 0
    hash_counts: dict[str, int] = {}


class PolicyEngine:
    """Evaluates runtime policies against current execution state."""

    def __init__(self, config: PolicyConfig) -> None:
        self._config = config

    @property
    def config(self) -> PolicyConfig:
        return self._config

    def check_pre_step(self, state: PolicyState) -> None:
        """Check policies before a step executes. Raises on violation."""
        if self._config.max_steps is not None and state.step_count > self._config.max_steps:
            raise PolicyViolationError(
                "max_steps",
                f"Step limit exceeded: {state.step_count} > {self._config.max_steps}",
                details={"current": state.step_count, "limit": self._config.max_steps},
            )

    def check_post_step(self, state: PolicyState) -> None:
        """Check policies after a step completes. Raises on violation."""
        if self._config.max_tokens is not None and state.total_tokens > self._config.max_tokens:
            raise PolicyViolationError(
                "max_tokens",
                f"Token budget exceeded: {state.total_tokens} > {self._config.max_tokens}",
                details={"current": state.total_tokens, "limit": self._config.max_tokens},
            )
        if self._config.max_repeat_hashes is not None:
            for hash_val, count in state.hash_counts.items():
                if count > self._config.max_repeat_hashes:
                    raise PolicyViolationError(
                        "max_repeat_hashes",
                        f"Input hash {hash_val[:8]}... repeated {count} times "
                        f"(limit: {self._config.max_repeat_hashes})",
                        details={
                            "hash": hash_val,
                            "count": count,
                            "limit": self._config.max_repeat_hashes,
                        },
                    )
