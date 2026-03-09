"""Paprika: Execution control for AI agents."""

from paprika.context import PaprikaContext
from paprika.errors import (
    PaprikaError,
    PolicyViolationError,
    ReplayMismatchError,
    TraceNotFoundError,
)
from paprika.policy import PolicyConfig
from paprika.replay import ReplayEngine
from paprika.runtime import PaprikaRuntime
from paprika.trace_store import Trace

__version__ = "0.1.0"
version = __version__  # Alias for `paprika.version`

__all__ = [
    "PaprikaContext",
    "PaprikaError",
    "PaprikaRuntime",
    "PolicyConfig",
    "PolicyViolationError",
    "ReplayEngine",
    "ReplayMismatchError",
    "Trace",
    "TraceNotFoundError",
]
