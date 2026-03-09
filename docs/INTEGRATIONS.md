# Paprika Integration Guide

This document explains how Paprika integrates with existing agent frameworks and patterns.

---

## Core Idea

Paprika wraps **execution**, not frameworks. It intercepts LLM and tool calls via a context object (`ctx`) that you pass through your agent code. All calls must go through:

- `ctx.llm.call(provider=..., model=..., input=...)`
- `ctx.tools.call(name=..., args={...})`

If your agent uses these, Paprika will trace, enforce policies, and enable replay.

---

## Recommended Wrapping Patterns

### 1. Vanilla Agent Loop

**Pattern:** `while` / `for` loop with reasoning (LLM) → tool → decision (LLM).

**How to wrap:** Put the entire loop inside a single `@runtime.agent()` function. Use `ctx` for every LLM and tool invocation.

```python
@runtime.agent()
def agent_loop(ctx: PaprikaContext, user_query: str) -> str:
    messages = [{"role": "user", "content": user_query}]
    for _ in range(max_iterations):
        reasoning = ctx.llm.call(provider="openai", model="gpt-4", input={"messages": messages})
        # ... parse reasoning ...
        tool_result = ctx.tools.call(name="search", args={"query": q})
        messages.append(...)
        decision = ctx.llm.call(...)
        if done:
            break
    return final_answer
```

**Example:** `examples/simple_agent_loop.py`

**Friction:** None. The loop body is your agent logic; you replace raw `llm()`/`tool()` calls with `ctx.llm.call()`/`ctx.tools.call()`.

---

### 2. LangGraph (or Similar Graph Runtimes)

**Pattern:** Nodes receive state, return state updates. Some nodes call LLMs, others call tools.

**How to wrap:** Inject `paprika_ctx` into the graph state. Each node that does LLM/tool work reads `ctx` from state and uses it.

```python
# State schema
class GraphState(TypedDict, total=False):
    messages: list
    paprika_ctx: Any  # Injected by Paprika agent

# Agent wraps graph.invoke()
@runtime.agent()
def langgraph_agent(ctx: PaprikaContext, query: str) -> str:
    state = {"messages": [{"role": "user", "content": query}], "paprika_ctx": ctx}
    result = graph.invoke(state)
    return result["result"]

# Nodes use ctx from state
def llm_node(state: GraphState):
    ctx = state["paprika_ctx"]
    resp = ctx.llm.call(provider="openai", model="gpt-4", input={"messages": state["messages"]})
    return {"messages": [...]}

def tool_node(state: GraphState):
    ctx = state["paprika_ctx"]
    out = ctx.tools.call(name="lookup", args={"key": "x"})
    return {"messages": [...]}
```

**Example:** `examples/langgraph_integration.py`

**Friction:** You must thread `paprika_ctx` through state. Nodes cannot use LangGraph’s native tool/LLM bindings—they must use `ctx.llm.call()` and `ctx.tools.call()`.

---

### 3. Function-Call Style Agents

**Pattern:** Agent returns structured tool calls; executor runs them; result fed back.

**How to wrap:** The executor (the part that actually invokes tools and optionally LLMs) must use `ctx`. Typically:

- Parse tool calls from LLM output
- For each call: `result = ctx.tools.call(name=..., args=...)`
- Feed results back via `ctx.llm.call()` for the next turn

Same rules: all external calls go through `ctx`.

---

## Limitations Discovered

### 1. Tools Must Use `args` Dict

Paprika’s `ctx.tools.call(name="x", args={"a": 1, "b": 2})` expects keyword args as a dict. If your tools take positional args or a different shape, you need an adapter:

```python
def my_tool(a: int, b: str) -> str:
    return f"{a}-{b}"

# Adapter for Paprika
runtime.register_tool("my_tool", lambda **kwargs: my_tool(kwargs["a"], kwargs["b"]))
# Or: register_tool("my_tool", lambda a, b=None: my_tool(a, b or ""))
```

### 2. No Native Framework Binding Interception

Paprika does not patch LangChain/LangGraph/OpenAI SDKs. You must route calls through `ctx.llm.call()` and `ctx.tools.call()`. Framework-native `bind_tools`, `agent_executor`, etc. will **not** be traced unless you wrap their internals.

### 3. Replay Requires Identical Agent Setup

`runtime.replay(run_id)` needs the same agent (by name) registered. If you add/remove tools or change the graph structure, replay can fail with `ReplayMismatchError` when the execution path diverges.

### 4. State in Graph Frameworks

For LangGraph, state is merged across nodes. Ensure `paprika_ctx` is set once in the initial state and not overwritten. Nodes that do not return `paprika_ctx` typically preserve it (merge semantics depend on the framework).

### 5. Mock Provider for Testing

Use `provider="mock"` with `_mock_response` and `_mock_usage` in `input` for deterministic examples and tests without API keys. See `examples/policy_violation_agent.py`.

---

## Best Practices for Tool and LLM Adapters

### Tools

- **Register before agent runs:** `runtime.register_tool(...)` must be called before the first agent invocation.
- **Args as dict:** Tools are invoked with `**args`; ensure your functions accept the keys you pass.
- **Deterministic for replay:** Non-deterministic tools (e.g. random, time) can cause replay mismatches if the *recorded* output is reused but the hash check passes (hash is on input only). Prefer deterministic tools or document non-replayability.

### LLM

- **Use `input` for messages:** `ctx.llm.call(provider="openai", model="gpt-4", input={"messages": [...]})` follows OpenAI chat completions shape.
- **Provider `mock`:** For tests/examples, use `provider="mock"` with `_mock_response` and `_mock_usage` in `input`.
- **Token usage:** Real providers should return `usage` in the response for `max_tokens` policy enforcement.

---

## Summary

| Pattern              | Wrapping approach                         | Friction level |
|----------------------|-------------------------------------------|----------------|
| Vanilla loop         | Single `@agent()` with `ctx` in loop body | Low            |
| LangGraph / graphs   | `paprika_ctx` in state, nodes use ctx      | Medium         |
| Framework-native     | Must replace with ctx-based calls         | High           |
