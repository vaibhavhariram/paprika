#!/usr/bin/env python3
"""LangGraph workflow wrapped with Paprika.

Paprika captures LLM and tool calls made by graph nodes.
The graph state carries paprika_ctx so nodes use ctx.llm.call() and ctx.tools.call().

Run:
  uv pip install -e ".[examples]"  # or uv sync --extra examples
  uv run python examples/langgraph_integration.py
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import TYPE_CHECKING, Any

from paprika import PaprikaRuntime, PolicyConfig

if TYPE_CHECKING:
    from paprika.context import PaprikaContext

try:
    from langgraph.graph import END, START, StateGraph
    from typing_extensions import TypedDict
except ImportError:
    print("LangGraph required. Install with: uv sync --extra examples")
    raise


class GraphState(TypedDict, total=False):
    """State passed between LangGraph nodes. paprika_ctx is injected by Paprika."""

    messages: list[dict[str, Any]]
    paprika_ctx: Any  # PaprikaContext injected by agent
    result: str


def _extract_content(resp: dict[str, Any]) -> str:
    try:
        return resp["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        return ""


def create_graph_nodes():
    """Build node functions that use paprika_ctx from state."""

    def llm_node(state: GraphState) -> dict[str, Any]:
        ctx = state["paprika_ctx"]
        messages = state.get("messages", [])
        resp = ctx.llm.call(
            provider="mock",
            model="mock",
            input={
                "messages": messages,
                "_mock_response": {
                    "choices": [
                        {"message": {"content": "I will search the KB.", "role": "assistant"}}
                    ]
                },
                "_mock_usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            },
        )
        content = _extract_content(resp)
        return {"messages": messages + [{"role": "assistant", "content": content}]}

    def tool_node(state: GraphState) -> dict[str, Any]:
        ctx = state["paprika_ctx"]
        tool_result = ctx.tools.call(name="lookup", args={"key": "info"})
        messages = state.get("messages", [])
        return {"messages": messages + [{"role": "user", "content": f"Tool: {tool_result}"}]}

    def final_llm_node(state: GraphState) -> dict[str, Any]:
        ctx = state["paprika_ctx"]
        messages = state.get("messages", [])
        resp = ctx.llm.call(
            provider="mock",
            model="mock",
            input={
                "messages": messages,
                "_mock_response": {
                    "choices": [{"message": {"content": "Summary from KB.", "role": "assistant"}}]
                },
                "_mock_usage": {"prompt_tokens": 10, "completion_tokens": 5, "total_tokens": 15},
            },
        )
        content = _extract_content(resp)
        return {"result": content}

    return llm_node, tool_node, final_llm_node


def build_graph():
    """Build LangGraph: START -> llm -> tool -> llm -> END."""
    llm_node, tool_node, final_llm_node = create_graph_nodes()
    builder = StateGraph(GraphState)
    builder.add_node("llm", llm_node)
    builder.add_node("tool", tool_node)
    builder.add_node("final_llm", final_llm_node)
    builder.add_edge(START, "llm")
    builder.add_edge("llm", "tool")
    builder.add_edge("tool", "final_llm")
    builder.add_edge("final_llm", END)
    return builder.compile()


def main() -> None:
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="LangGraph + Paprika")
    parser.add_argument("--replay", metavar="RUN_ID", help="Replay a prior run")
    args = parser.parse_args()

    trace_dir = Path(os.environ.get("PAPRIKA_TRACE_DIR", "~/.paprika/traces")).expanduser()
    runtime = PaprikaRuntime(
        policy=PolicyConfig(max_steps=5),
        trace_dir=trace_dir,
    )
    runtime.register_tool("lookup", lambda key: f"value_for_{key}")

    graph = build_graph()

    @runtime.agent()
    def langgraph_agent(ctx: PaprikaContext, query: str) -> str:
        """Run LangGraph with Paprika context in state."""
        state: GraphState = {
            "messages": [{"role": "user", "content": query}],
            "paprika_ctx": ctx,
        }
        result = graph.invoke(state)
        return result.get("result", "No result")

    if args.replay:
        try:
            result = runtime.replay(args.replay)
            print(result)
            sys.exit(0)
        except Exception as e:
            print(f"Replay failed: {e}", file=sys.stderr)
            sys.exit(1)

    result = langgraph_agent("What is the policy?")
    print(result)

    summaries = runtime.trace_store.list_runs(limit=1)
    if summaries:
        print(f"Run ID: {summaries[0].run_id}")


if __name__ == "__main__":
    main()
