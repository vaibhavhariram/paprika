"""Tests for the Paprika UI FastAPI server.

Server tests save v0 Trace objects to exercise the full migration pipeline:
store.save(v0) → load_record() → migrate_v0_to_v1() → record_to_detail().
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

import pytest
from fastapi.testclient import TestClient

from paprika.events import (
    LLMCallEndEvent,
    LLMCallStartEvent,
    RunEndEvent,
    RunStartEvent,
    TokenUsage,
)
from paprika.trace_store import LocalTraceStore, Trace
from paprika.ui.server import build_app

if TYPE_CHECKING:
    from pathlib import Path

_NOW = datetime(2025, 1, 15, 10, 0, 0, tzinfo=UTC)


def _make_trace(
    run_id: str = "test-run-001",
    agent_name: str = "test_agent",
    status: str = "success",
) -> Trace:
    return Trace(
        run_id=run_id,
        agent_name=agent_name,
        started_at=_NOW,
        ended_at=_NOW + timedelta(seconds=1),
        events=[
            RunStartEvent(
                run_id=run_id, step_index=0, timestamp=_NOW,
                agent_name=agent_name, input_args={},
            ),
            LLMCallStartEvent(
                run_id=run_id, step_index=1, timestamp=_NOW,
                provider="openai", model="gpt-4",
                input_data={"messages": []}, input_hash="abc123",
            ),
            LLMCallEndEvent(
                run_id=run_id, step_index=1, timestamp=_NOW,
                output_data={"choices": []}, duration_ms=200.0,
                token_usage=TokenUsage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
            ),
            RunEndEvent(
                run_id=run_id, step_index=1, timestamp=_NOW + timedelta(seconds=1),
                status=status, output="done", total_tokens=15,
            ),
        ],
    )


@pytest.fixture
def client(tmp_trace_dir: Path) -> TestClient:
    store = LocalTraceStore(base_dir=tmp_trace_dir)
    app = build_app(store)
    return TestClient(app)


@pytest.fixture
def populated_client(tmp_trace_dir: Path) -> TestClient:
    store = LocalTraceStore(base_dir=tmp_trace_dir)
    store.save(_make_trace("run-aaa", "agent_alpha", "success"))
    store.save(_make_trace("run-bbb", "agent_beta", "error"))
    app = build_app(store)
    return TestClient(app)


class TestListRuns:
    def test_empty_store_returns_empty_list(self, client: TestClient) -> None:
        resp = client.get("/api/runs")
        assert resp.status_code == 200
        data = resp.json()
        assert data["runs"] == []

    def test_returns_saved_runs(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs")
        assert resp.status_code == 200
        runs = resp.json()["runs"]
        assert len(runs) == 2

        run_ids = {r["run_id"] for r in runs}
        assert "run-aaa" in run_ids
        assert "run-bbb" in run_ids

    def test_runs_include_expected_fields(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs")
        run = resp.json()["runs"][0]

        assert "run_id" in run
        assert "agent_name" in run
        assert "started_at" in run
        assert "status" in run
        assert "step_count" in run
        assert "total_tokens" in run
        assert "replay_of" in run

    def test_limit_parameter(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        for i in range(5):
            store.save(_make_trace(f"run-{i:03d}", f"agent_{i}"))

        app = build_app(store)
        client = TestClient(app)

        resp = client.get("/api/runs?limit=2")
        assert resp.status_code == 200
        assert len(resp.json()["runs"]) == 2

    def test_limit_validation(self, client: TestClient) -> None:
        resp = client.get("/api/runs?limit=0")
        assert resp.status_code == 422

        resp = client.get("/api/runs?limit=300")
        assert resp.status_code == 422

    def test_total_tokens_computed(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs")
        runs = resp.json()["runs"]
        for run in runs:
            assert run["total_tokens"] == 15


class TestGetRun:
    def test_returns_run_detail(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs/run-aaa")
        assert resp.status_code == 200
        data = resp.json()

        assert "summary" in data
        assert "steps" in data
        assert data["summary"]["run_id"] == "run-aaa"
        assert data["summary"]["agent_name"] == "agent_alpha"
        assert data["summary"]["status"] == "success"

    def test_steps_include_llm_call(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs/run-aaa")
        steps = resp.json()["steps"]

        llm_steps = [s for s in steps if s["type"] == "llm_call"]
        assert len(llm_steps) == 1
        assert llm_steps[0]["label"] == "gpt-4"
        assert llm_steps[0]["duration_ms"] == 200.0
        assert llm_steps[0]["tokens"] == 15

    def test_steps_have_bookends(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs/run-aaa")
        steps = resp.json()["steps"]
        assert steps[0]["type"] == "run_start"
        assert steps[-1]["type"] == "run_end"

    def test_run_not_found_returns_404(self, client: TestClient) -> None:
        resp = client.get("/api/runs/nonexistent-run")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_invalid_run_id_returns_400(self, client: TestClient) -> None:
        resp = client.get("/api/runs/$bad*id")
        assert resp.status_code == 400
        assert "invalid" in resp.json()["detail"].lower()

    def test_prefix_match(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs/run-aaa")
        assert resp.status_code == 200
        assert resp.json()["summary"]["run_id"] == "run-aaa"

    def test_replay_of_in_detail(self, tmp_trace_dir: Path) -> None:
        store = LocalTraceStore(base_dir=tmp_trace_dir)
        trace = _make_trace("replay-run")
        trace.metadata["replay_of"] = "original-run-123"
        store.save(trace)

        app = build_app(store)
        client = TestClient(app)

        resp = client.get("/api/runs/replay-run")
        assert resp.status_code == 200
        assert resp.json()["summary"]["replay_of"] == "original-run-123"

    def test_summary_has_expected_fields(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs/run-aaa")
        summary = resp.json()["summary"]

        expected_fields = {
            "run_id", "agent_name", "started_at", "ended_at",
            "duration_ms", "status", "total_tokens", "step_count", "replay_of",
        }
        assert set(summary.keys()) == expected_fields

    def test_step_detail_has_expected_fields(self, populated_client: TestClient) -> None:
        resp = populated_client.get("/api/runs/run-aaa")
        steps = resp.json()["steps"]

        llm_step = next(s for s in steps if s["type"] == "llm_call")
        assert "detail" in llm_step
        detail = llm_step["detail"]
        assert "provider" in detail
        assert "model" in detail
        assert "input_hash" in detail
        assert "input_data" in detail
        assert "output_data" in detail
        assert "token_usage" in detail
        assert "duration_ms" in detail
