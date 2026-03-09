# Paprika — Project Architecture & Product Spec

## Document Metadata

| Field        | Value                   |
| ------------ | ----------------------- |
| Project      | Paprika                 |
| Category     | AI Agent Infrastructure |
| Type         | Python SDK              |
| Version      | v1 MVP                  |
| Authors      | Paprika founders        |
| Status       | Active development      |
| Last Updated | 2026                    |

---

# 1. Project Overview

## What Paprika Is

Paprika is an **execution control layer for AI agents**.

It provides runtime infrastructure that allows developers to:

* record structured traces of agent execution
* enforce runtime policies (loops, tokens, etc.)
* replay prior runs safely
* inspect agent behavior after execution

Paprika wraps existing agent logic and tool calls to make **AI-native software inspectable and controllable**.

---

## Problem

Agentic systems introduce new production risks:

* infinite reasoning loops
* uncontrolled token spending
* unpredictable execution paths
* non-reproducible failures
* debugging difficulty
* unsafe replay of side-effecting operations

Traditional observability tools (logs, traces, dashboards) only **observe** behavior.

Paprika introduces a runtime layer that can:

* record execution deterministically
* enforce runtime limits
* replay past runs safely.

---

## Core Concept

Paprika sits **between agent code and external systems**.

```
Agent Code
     │
Paprika Runtime
     │
LLM + Tool Adapters
     │
External APIs / Models
```

Paprika acts as the **execution supervisor**.

---

# 2. Design Principles

Paprika is designed with the following principles.

### 1. Small Core Runtime

The core runtime must remain simple and auditable.

### 2. Explicit Execution

Every step of execution should be traceable.

### 3. Deterministic Replay

Developers must be able to reproduce runs safely.

### 4. Minimal Magic

Paprika should avoid implicit behavior or hidden state.

### 5. Developer-First

The SDK should feel natural to Python developers.

---

# 3. Core Features (MVP)

Paprika v1 implements four core capabilities.

---

# 3.1 Structured Execution Traces

Paprika records every execution step.

Events include:

* run start
* run end
* LLM call start
* LLM call completion
* tool call start
* tool call completion
* policy violations

Trace data is written locally as JSON.

Example trace layout:

```
~/.paprika/traces/<run_id>.json
```

Trace data contains:

```
Run Metadata
Execution Events
Policy Data
Token Usage
Timing Information
```

---

# 3.2 Runtime Policy Enforcement

Paprika can halt execution when policies are violated.

Policies include:

### Max Steps

Limits the number of execution steps.

```
max_steps = 20
```

Prevents infinite loops.

---

### Max Tokens

Limits cumulative token usage across LLM calls.

```
max_tokens = 20000
```

Prevents runaway spending.

---

### Repeat Hash Detection

Detects repeated reasoning patterns.

Paprika hashes normalized step inputs:

```
hash(normalized_input)
```

If the same signature repeats too many times, execution halts.

---

# 3.3 Deterministic Replay

Paprika allows replaying prior runs.

Replay mode:

* loads a previous trace
* stubs LLM responses
* stubs tool outputs
* prevents real side effects

Replay is used for:

* debugging failures
* verifying agent behavior
* testing prompt changes

Replay intentionally fails if execution diverges.

---

# 3.4 CLI Inspection

Paprika provides a minimal CLI.

### List Runs

```
paprika runs list
```

Shows recent runs.

---

### Inspect Run

```
paprika runs inspect <run_id>
```

Displays event timeline.

---

### Replay Run

```
paprika runs replay <run_id>
```

Runs replay engine.

---

### Diff Runs

```
paprika runs diff <run_a> <run_b>
```

Shows divergence between runs.

---

# 4. Public SDK API

Example usage:

```python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,
        max_tokens=20000,
        max_repeat_hashes=3
    )
)

@runtime.agent()
def support_agent(ctx, user_input: str):

    analysis = ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages":[{"role":"user","content":user_input}]}
    )

    result = ctx.tools.call(
        name="lookup_customer",
        args={"email":"alice@example.com"}
    )

    return ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages":[{"role":"user","content":f"Summarize {result}"}]}
    )
```

Replay:

```
runtime.replay(run_id="abc123")
```

---

# 5. System Architecture

Paprika is composed of several subsystems.

```
PaprikaRuntime
│
├── Context Layer
│
├── Policy Engine
│
├── Event System
│
├── Trace Store
│
├── Replay Engine
│
└── Adapters
     ├── LLM Adapter
     └── Tool Adapter
```

---

# 6. Core Modules

## runtime.py

Main runtime orchestration.

Responsibilities:

* run lifecycle
* context injection
* policy enforcement
* event emission
* trace saving

---

## context.py

Provides the runtime context available inside agent functions.

Includes:

```
ctx.llm.call()
ctx.tools.call()
```

Context carries run metadata.

---

## policy.py

Defines runtime policies.

Includes:

```
PolicyConfig
PolicyEngine
PolicyState
```

---

## events.py

Defines structured trace events.

Includes:

```
EventType
TraceEvent
TokenUsage
```

Events are serialized via Pydantic.

Pydantic v2 serialization is used for fast JSON dumping using `model_dump_json()`, which ensures JSON-safe serialization modes. See the Pydantic documentation for details on serialization behavior and performance improvements.
[https://docs.pydantic.dev/latest/concepts/serialization/](https://docs.pydantic.dev/latest/concepts/serialization/)

---

## trace_store.py

Handles trace persistence.

Default implementation:

```
LocalTraceStore
```

Trace format:

```
{
 run_id
 started_at
 ended_at
 events[]
 metadata
}
```

---

## replay.py

Responsible for deterministic replay.

Functions:

```
ReplayEngine
get_stub_output()
detect_mismatch()
```

Replay works by matching step indexes and event types.

---

## adapters/

Adapters connect Paprika to external systems.

### LLM Adapter

Wraps model calls.

Responsibilities:

* record events
* capture token usage
* enable replay stubbing

---

### Tool Adapter

Wraps tool calls.

Responsibilities:

* register callable tools
* record tool invocation
* stub outputs during replay

---

# 7. Data Model

## Run

Represents a single execution.

```
run_id
agent_name
started_at
ended_at
status
metadata
```

---

## Event

Each step of execution.

Fields:

```
event_id
run_id
step_index
event_type
timestamp
input_payload
output_payload
token_usage
error
```

---

## PolicyConfig

Configuration for runtime limits.

```
max_steps
max_tokens
max_repeat_hashes
```

---

# 8. Storage

Paprika v1 uses local JSON storage.

Default path:

```
~/.paprika/traces/
```

Example:

```
~/.paprika/traces/8e91b6.json
```

Future versions may support:

* SQLite
* S3
* distributed trace stores.

---

# 9. Repository Structure

```
paprika/
│
├─ src/paprika/
│   ├ runtime.py
│   ├ context.py
│   ├ policy.py
│   ├ events.py
│   ├ trace_store.py
│   ├ replay.py
│   ├ errors.py
│   ├ cli.py
│   └ adapters/
│       ├ llm.py
│       └ tools.py
│
├ tests/
│   ├ unit/
│   ├ integration/
│   └ fixtures/
│
├ examples/
│
├ docs/
│
├ pyproject.toml
└ README.md
```

---

# 10. Development Standards

Paprika uses:

```
Python 3.11+
pydantic
typer
pytest
ruff
mypy
uv
```

CI runs:

```
ruff check
mypy
pytest
```

Across:

```
Python 3.11
Python 3.12
Python 3.13
```

---

# 11. Testing Strategy

Testing layers:

### Unit Tests

Test individual modules.

Examples:

```
policy enforcement
event serialization
trace persistence
```

---

### Integration Tests

Test full runtime flow.

Examples:

```
agent execution
trace recording
policy violations
replay runs
```

---

### Golden Trace Tests

Replay tests using fixed trace fixtures.

Ensures serialization stability.

---

# 12. Known Limitations (v1)

Paprika v1 intentionally excludes:

* distributed runtimes
* Kubernetes orchestration
* model routing
* prompt management
* enterprise authentication
* hosted dashboards

Paprika v1 focuses only on:

```
execution control
trace recording
policy enforcement
replay
```

---

# 13. Future Roadmap (Non-MVP)

Possible directions:

### Advanced Replay

* branch replay
* partial replay
* time travel debugging

---

### Runtime Sandboxing

* containerized tool execution
* side effect isolation

---

### Distributed Agent Runtime

* queue execution
* multi-worker scheduling
* trace streaming

---

### Hosted Platform

* cloud trace storage
* visual trace inspection
* team collaboration

---

# 14. Product Positioning

Paprika should be described as:

**Execution control infrastructure for AI agents**

Not:

* an LLM observability platform
* a prompt IDE
* an agent framework
* a model gateway

Paprika complements existing tools like:

* LangGraph
* CrewAI
* AutoGen

by controlling execution rather than orchestrating it.

---

# 15. Success Criteria

Paprika v1 is successful if developers can:

1. wrap an agent in under 10 minutes
2. inspect execution traces
3. enforce runtime limits
4. replay runs safely
5. debug agent failures reproducibly

---
