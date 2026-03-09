"""Paprika execution context."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from paprika.adapters.llm import LLMAdapter
    from paprika.adapters.tools import ToolAdapter


class PaprikaContext:
    """Injected into agent functions to provide LLM and tool access."""

    def __init__(self, llm: LLMAdapter, tools: ToolAdapter, run_id: str) -> None:
        self.llm = llm
        self.tools = tools
        self.run_id = run_id
