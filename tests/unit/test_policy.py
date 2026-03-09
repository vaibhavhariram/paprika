"""Tests for policy engine."""

from __future__ import annotations

import pytest

from paprika.errors import PolicyViolationError
from paprika.policy import PolicyConfig, PolicyEngine, PolicyState


class TestPolicyEngine:
    def test_no_limits_passes(self) -> None:
        engine = PolicyEngine(PolicyConfig())
        state = PolicyState(step_count=100, total_tokens=999999)
        engine.check_pre_step(state)
        engine.check_post_step(state)

    def test_max_steps_pre_check(self) -> None:
        engine = PolicyEngine(PolicyConfig(max_steps=3))
        state = PolicyState(step_count=3)
        engine.check_pre_step(state)  # exactly at limit is OK
        state.step_count = 4
        with pytest.raises(PolicyViolationError, match="Step limit exceeded"):
            engine.check_pre_step(state)

    def test_max_tokens_post_check(self) -> None:
        engine = PolicyEngine(PolicyConfig(max_tokens=100))
        state = PolicyState(total_tokens=100)
        engine.check_post_step(state)  # exactly at limit is OK
        state.total_tokens = 101
        with pytest.raises(PolicyViolationError, match="Token budget exceeded"):
            engine.check_post_step(state)

    def test_max_repeat_hashes_post_check(self) -> None:
        engine = PolicyEngine(PolicyConfig(max_repeat_hashes=2))
        state = PolicyState(hash_counts={"abc123": 2})
        engine.check_post_step(state)  # at limit is OK
        state.hash_counts["abc123"] = 3
        with pytest.raises(PolicyViolationError, match="repeated 3 times"):
            engine.check_post_step(state)

    def test_violation_has_details(self) -> None:
        engine = PolicyEngine(PolicyConfig(max_steps=2))
        state = PolicyState(step_count=3)
        with pytest.raises(PolicyViolationError) as exc_info:
            engine.check_pre_step(state)
        assert exc_info.value.policy_name == "max_steps"
        assert exc_info.value.details["current"] == 3
        assert exc_info.value.details["limit"] == 2
