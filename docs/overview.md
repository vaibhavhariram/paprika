# Paprika: The Deterministic Debugging Runtime for AI Agents

Paprika is the deterministic debugging runtime for AI agents. It captures structured execution records, enforces runtime constraints, and safely replays runs to reproduce and diff agent behavior.

Where observability tools tell you what went wrong after a run, Paprika lets you stop bad runs mid-execution, reproduce failures without side effects, and diff behavior changes before you ship.

## Who It's For

Engineers running AI agents in production or pre-production who need to:
- Debug failures safely (no duplicate refunds, emails, or API mutations)
- Prevent runaway execution with runtime guardrails
- Validate that code changes don't break agent behavior
- Step through exact execution without making live API calls

## Core Concepts

Paprika provides four primitives:

### Runtime

The `PaprikaRuntime` wraps agent execution. Register your agent with a decorator, inject a context, and route LLM and tool calls through instrumented context. No framework lock-in—it works with vanilla Python, LangGraph, CrewAI, AutoGen, and any Python agent framework.

→ See [Runtime](core-concepts/runtime.md)

### Execution Records

Every run produces a single structured JSON file—an `ExecutionRecord`. It contains typed steps (LLM calls, tool calls, policy violations), input hashes, token counts, latency, and full inputs/outputs. Stored locally on disk. Diffable. Portable. No cloud backend required.

→ See [Execution Records](core-concepts/execution-records.md)

### Policies

Runtime guardrails that halt execution when limits are breached. Set a maximum number of steps, total tokens, or repeated inputs. When a policy fires, execution stops and the violation is recorded in the trace with exact details.

→ See [Policies](core-concepts/policies.md)

### Replay Engine

Re-execute any previous run using recorded outputs instead of making live API calls. No external side effects. If the replayed execution diverges from the original (agent logic changed, prompt changed, tool changed), Paprika raises a `ReplayMismatchError` with the exact step and input hash diff.

This is the core differentiator: deterministic replay with mismatch detection. No other tool in the AI agent space offers this.

→ See [Replay Engine](core-concepts/replay.md)

## What Paprika Is Not

- **Not an observability dashboard.** Paprika stores traces locally as JSON. You can layer LangSmith, Datadog, or Honeycomb on top if you want cloud monitoring, but Paprika itself has no SaaS backend.
- **Not an eval framework.** Paprika detects behavioral changes, not quality. Layer evaluation frameworks on top for quality metrics.
- **Not a prompt manager or gateway.** Paprika doesn't proxy requests or manage versions. It records execution.
- **Not a monitoring service.** Paprika doesn't alert, aggregate, or stream metrics. It controls and records local execution.

## How Paprika Fits in Your Stack

Paprika sits at the **runtime level**, below all other tools.

```
┌─────────────────────────────────────────┐
│  Eval Frameworks (Ragas, DeepEval, etc) │
├─────────────────────────────────────────┤
│ Observability (LangSmith, Datadog, etc) │
├─────────────────────────────────────────┤
│      Paprika Runtime + Replay           │
└─────────────────────────────────────────┘
```

- Paprika **controls and records** execution
- Observability tools **observe** what Paprika controls
- Eval frameworks **assess** the quality of recorded outputs

You can run all three together. Paprika works with every agent framework and every observability platform.

## Why Deterministic Replay Matters

### Safe Failure Reproduction

You can replay a production failure without making duplicate API calls, sending duplicate emails, or triggering duplicate payments. Perfect for debugging real-world agent failures in isolation.

### Regression Detection

Change your agent code, prompt, or tools. Replay old traces against new code. If behavior diverges at any step, Paprika tells you exactly where and why. Catch regressions before shipping.

### Behavioral Confidence

Not "did it log correctly?" but "did it decide the same way?" Paprika's mismatch detection validates that behavioral changes are intentional.

## Quick Start

Install:
```bash
pip install paprika
```

Write a simple agent:
```python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(policy=PolicyConfig(max_steps=10))

@runtime.agent(name="researcher")
def my_agent(ctx):
    # LLM call
    response = ctx.llm.call(
        provider="openai",
        model="gpt-4o",
        input={"messages": [{"role": "user", "content": "Find a fact"}]}
    )

    # Tool call
    result = ctx.tools.call(name="search", args={"query": "AI trends"})
    return result

runtime.register_tool("search", lambda query: f"Found: {query}")
result = runtime.run("researcher", {})
```

Inspect the trace:
```bash
paprika runs list
paprika runs inspect <run-id>
```

Replay the run:
```python
runtime.replay(run_id="<run-id>")
```

→ Full walkthrough: [Quickstart](quickstart.md)

## Next Steps

- **Get started quickly:** [Quickstart](quickstart.md)
- **Understand the runtime:** [Runtime](core-concepts/runtime.md)
- **Learn about execution records:** [Execution Records](core-concepts/execution-records.md)
- **Set runtime policies:** [Policies](core-concepts/policies.md)
- **Master replay and mismatch detection:** [Replay Engine](core-concepts/replay.md)
- **Integrate with your framework:** [Integrations](integrations.md)
- **Use the CLI:** [CLI Reference](cli.md)
- **Compare with other tools:** [How Paprika Fits](how-paprika-fits.md)
