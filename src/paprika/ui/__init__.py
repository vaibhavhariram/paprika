"""Paprika UI — local browser-based trace viewer."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from paprika.trace_store import LocalTraceStore


def create_app(store: LocalTraceStore) -> object:
    """Create the FastAPI application for the trace viewer.

    Returns the FastAPI app instance. Requires ``fastapi`` to be installed
    (available via ``pip install paprika[ui]``).
    """
    from paprika.ui.server import build_app

    return build_app(store)
