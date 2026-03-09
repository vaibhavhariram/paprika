"""Shared test fixtures."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import pytest

if TYPE_CHECKING:
    from pathlib import Path


@pytest.fixture
def tmp_trace_dir(tmp_path: Path) -> Path:
    """Provide a temporary directory for trace storage."""
    trace_dir = tmp_path / "traces"
    trace_dir.mkdir()
    return trace_dir


@pytest.fixture
def tmp_trace_store(tmp_trace_dir: Path) -> Any:
    """Provide a LocalTraceStore backed by a temp directory."""
    from paprika.trace_store import LocalTraceStore

    return LocalTraceStore(base_dir=tmp_trace_dir)
