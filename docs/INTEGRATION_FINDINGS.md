# Paprika Integration Findings

This report documents findings from integrating Paprika with realistic agent patterns (vanilla loop, LangGraph). It should guide v0.2 design.

---

## 1. Developer Experience

### API Ergonomics

**What works well:**

- `@runtime.agent()` + `ctx` is simple. One decorator, one context object.
- `ctx.llm.call()` and `ctx.tools.call()` mirror common patterns (provider, model, input / name, args).
- `PolicyConfig(max_steps=20)` is readable; no magic defaults.
- `runtime.replay(run_id)` matches expectations for “re-run this trace.”

**Friction:**

- **Tool args must be a dict.** Many tools use `func(a, b)` signatures. Mapping to `args={"a": x, "b": y}` adds boilerplate. A small helper or convention would help.
- **No way to pass `ctx` without an agent.** If you want to trace a one-off script (e.g. a migration) without defining an agent, you must still create a dummy agent and call it. An escape hatch like `runtime.trace_context()` could reduce ceremony.
- **Replay requires the agent to be registered.** You must instantiate the same runtime, register the same tools, define the same agent—then call `replay()`. For examples it’s fine; for production, “replay from a saved trace without loading the app” isn’t supported.

### Runtime Wrapper Complexity

**Complexity is low for vanilla loops.** The loop body is your agent; you swap calls to `ctx.llm.call()` and `ctx.tools.call()`. No structural changes.

**Complexity is moderate for LangGraph.** You must:

1. Add `paprika_ctx` to the graph state.
2. Ensure every LLM/tool node reads `ctx` from state and uses it.
3. Avoid using LangGraph’s native tool/LLM bindings.

The mental model is clear (“ctx flows through state”), but it requires discipline: new nodes must remember to use `ctx` instead of direct SDK calls. A lint rule or decorator (“this node must use ctx”) could help.

### Integration Friction

- **Framework-specific adapters:** LangChain/LangGraph tools often use `@tool` and `structured_output`. Paprika needs plain callables. Teams using these frameworks need adapter layers.
- **Conditional logic:** Nodes that sometimes call LLM, sometimes not (e.g. router nodes) still need `ctx` in state even if they don’t use it. Minor but noticeable.
- **Async:** Paprika’s API is sync. Async agent loops would need async adapters or a separate design.

---

## 2. Architecture Weaknesses

### Where the Runtime Model Breaks Down

1. **Graph frameworks with black-box nodes:** LangGraph nodes can be runnables, chains, or custom classes. Paprika can only trace what goes through `ctx`. If a node uses `OpenAI().invoke()` internally, that call is invisible. The architecture assumes you control all LLM/tool calls.

2. **Multi-agent systems:** If multiple agents run in one process and share tools, each agent needs its own `ctx` and trace. Paprika doesn’t model “multi-agent run” natively; you’d have separate run_ids.

3. **Streaming:** `ctx.llm.call()` returns the full response. Streaming (token-by-token) isn’t supported. A streaming-aware adapter would need a different hook shape.

4. **Conditional tools:** Tools chosen dynamically (e.g. from LLM output) work, but the replay engine matches by step index and input hash. If the agent’s control flow changes (e.g. one run uses tool A, another uses tool B), replay will likely mismatch. Expected but worth documenting.

### Replay Mismatches

- **Deterministic by design:** Replay intentionally fails when execution diverges. We observed correct behavior: identical runs replay successfully; changing a mock response causes `ReplayMismatchError`.
- **Step ordering:** Steps are indexed by occurrence (LLM 1, tool 1, LLM 2, …). If you reorder calls (e.g. two tools before one LLM), replay breaks. The model assumes a total order; it doesn’t support parallel or reordered steps.
- **Input hash sensitivity:** Small changes in prompt (e.g. timestamp, request id) change the hash. Replay will fail. For production, prompts may need to be normalized before hashing.

### Policy False Positives / Edge Cases

- **max_repeat_hashes:** Triggered when the *same* input hash recurs. Legitimate loops (e.g. “retry this tool three times”) can hit this. A separate “max_retries per tool” or an exclusion list might be useful.
- **max_steps:** Counts every LLM and tool call. A complex node that does 3 LLM calls counts as 3 steps. Fine for control, but users need to know that “step” = “one call,” not “one node.”
- **max_tokens:** Accumulates across all LLM calls. Works as intended. No false positives observed.

### Trace Inconsistencies

- **Run ID in list vs inspect:** List shows full UUID; inspect accepts prefix. Consistent. No issues.
- **Metadata:** `replay_of` is set for replay runs. Custom metadata isn’t exposed in the public API; users can’t add tags or labels. Minor.
- **Event ordering:** Events are ordered by insertion. For graphs with parallel execution (if any), ordering could be ambiguous. Current integrations are strictly sequential; no problems seen.

---

## 3. Design Insights

### What Works Well

- **Single `ctx` object:** Passing one context through the call stack is simple. No global state, no thread-local hacks.
- **Decorator-based registration:** `@runtime.agent()` keeps the agent function normal; the wrapper handles tracing and policy.
- **Mock provider:** `provider="mock"` makes examples and tests deterministic without API keys. Essential for demos and CI.
- **Prefix matching for run_id:** Using a short prefix in `inspect`/`replay` improves UX.
- **Trace format:** JSON events with step_index, event_type, input_hash are sufficient for replay and debugging. No over-engineering.

### What Needs Redesign

1. **Pluggable adapters:** The LLM adapter is hardcoded (OpenAI + mock). Supporting Anthropic, local models, etc. would be easier with a `Provider` protocol and registry.
2. **Tool adapter ergonomics:** `args` dict + `**kwargs` mapping is awkward. A `@paprika.tool` decorator that infers args from the function signature could reduce boilerplate.
3. **Replay without full agent load:** For “inspect a trace from another machine,” loading the full app to replay is heavy. A lighter “trace viewer” or “replay script generator” could help.
4. **Async support:** Async agents are common. Sync-only limits adoption. A design for `async def agent(...)` and `await ctx.llm.call(...)` would extend reach.
5. **Policy composition:** `PolicyConfig` is flat. Expressing “max_steps per phase” or “different limits for tools vs LLM” would require multiple config objects or a more expressive DSL.

### What Features Are Unnecessary (For Now)

- **Dashboards / UI:** Traces are small; CLI inspect and diff are enough for MVP.
- **Cloud storage:** Local JSON is fine for single-user and small teams.
- **New policy types:** max_steps, max_tokens, max_repeat_hashes cover the main risks. More policies would add complexity before we see demand.
- **Framework-specific plugins:** LangChain/LangGraph integrations could be separate packages. Keeps core lean.
- **Prompt management:** Paprika traces what’s passed to the LLM; it doesn’t need to manage prompt templates. Out of scope.

---

## 4. Summary for v0.2

| Area | Priority | Recommendation |
|------|----------|----------------|
| Tool args ergonomics | High | Add `@paprika.tool` or helper for `(**kwargs) -> func(*args)` mapping |
| Pluggable LLM adapters | High | Introduce `LLMProvider` protocol; OpenAI and mock as implementations |
| LangGraph / graph integration | Medium | Document `paprika_ctx` pattern; consider helper for state injection |
| Async support | Medium | Design async agent + ctx; implement if user demand appears |
| Replay without app load | Low | Trace viewer or standalone replay script as separate tool |
| Policy composition | Low | Keep flat config; revisit if users need phased limits |

---

*Report generated from integration validation with `simple_agent_loop.py` and `langgraph_integration.py`.*
