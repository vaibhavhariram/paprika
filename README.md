# Paprika — Execution Control & Observability for AI Agents

**A runtime instrumentation framework that lets you record, inspect, and replay AI agent execution traces with deterministic policy enforcement.**

> Paprika is a Python SDK that wraps agent runtimes to capture structured execution traces, enforce safety policies, and replay runs deterministically. Built for developers who need to debug agent loops, prove correctness, and ship agents with confidence. Works with any LLM provider and agent framework (LangGraph, CrewAI, AutoGen, vanilla Python).

---

## Quick Start (5 minutes)

### 1. Install

```bash
pip install paprika
```

### 2. Wrap Your Agent

```python
from paprika import PaprikaRuntime, PolicyConfig

# Initialize with policies — execution halts if limits are exceeded
runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,              # Prevent infinite loops
        max_tokens=20000,          # Cap API spend
        max_repeat_hashes=3,       # Detect stuck patterns
    )
)

# Register your tools
runtime.register_tool("greet", lambda name: f"Hello, {name}!")

# Decorate your agent
@runtime.agent()
def my_agent(ctx, name):
    return ctx.tools.call(name="greet", args={"name": name})

# Run — now fully traced
result = my_agent("world")  # Trace recorded automatically
print(result)  # "Hello, world!"
```

### 3. Inspect & Replay

```bash
# List all recorded runs
paprika runs list

# Step through a run (see every LLM call, tool invocation, decision)
paprika runs inspect <run-id>

# Compare two runs side-by-side
paprika runs diff <run-id-a> <run-id-b>

# Replay a run deterministically (no API calls, cached outputs)
python -c "from paprika import PaprikaRuntime; PaprikaRuntime().replay(run_id='<run-id>')"
```

---

## What This Demonstrates

### Systems Design & Runtime Instrumentation
- **Adapter Pattern**: Pluggable LLM and tool adapters for framework agnosticity (see [src/paprika/adapters/](src/paprika/adapters/) — works with OpenAI, Anthropic, LangGraph, etc.)
- **Event-Driven Architecture**: Structured event capture (LLMCallStart/End, ToolCallStart/End, PolicyViolation) with typed event classes ([events.py:15-24](src/paprika/events.py#L15-L24))
- **Decorator-Based Instrumentation**: Runtime wrapping via decorators and context injection ([runtime.py:36-50](src/paprika/runtime.py#L36-L50)) — transparent to user code

### Policy Enforcement & Safety
- **State Machine for Policies**: PolicyEngine tracks steps, tokens, and pattern hashes in real-time ([policy.py](src/paprika/policy.py))
- **Pre-Execution Blocking**: Policies halt execution *before* damage (token overspend, infinite loops) ([errors.py](src/paprika/errors.py))

### Deterministic Execution & Correctness
- **Replay Engine**: Re-executes runs using cached LLM outputs with mismatch detection ([replay.py](src/paprika/replay.py))
- **Trace Store**: Persistent JSON-backed trace storage with full execution history ([trace_store.py](src/paprika/trace_store.py))
- **Type Safety**: Strict mypy checking ensures correctness across the codebase

### Testing & Quality
- **Comprehensive Test Suite**: 30+ tests covering unit, integration, and end-to-end scenarios ([tests/](tests/))
- **Mock Testbed**: Deterministic fake LLM and tools for testing without API keys ([examples/test_agents/](examples/test_agents/))
- **Code Quality**: ruff linting, mypy strict mode, pytest with coverage

### Full-Stack Development
- **Python SDK**: Pydantic models, decorators, context managers
- **CLI Tool**: Typer-based CLI for inspection (paprika runs list/inspect/diff)
- **Backend API**: FastAPI for trace serving (optional UI backend)
- **Frontend**: Next.js marketing site with interactive trace viewer

---

## Architecture

```
User Agent Code
        ↓
  [PaprikaRuntime] ← Wraps agent execution
        ↓
  ┌─────┴─────────────────┐
  ↓                       ↓
[Policy Engine]      [Event Capture]
- max_steps          - LLMCallEvent
- max_tokens         - ToolCallEvent
- repeat detection   - PolicyViolationEvent
  ↓                       ↓
  └─────┬─────────────────┘
        ↓
 [Trace Store]
   (JSON files)
        ↓
  ┌──────┴──────────────┐
  ↓                     ↓
[CLI Tools]        [Replay Engine]
- runs list        - Cache outputs
- runs inspect     - Deterministic re-exec
- runs diff        - Mismatch detection
```

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| **SDK** | Python 3.11+, Pydantic 2.5+ | Type-safe configuration, validation |
| **CLI** | Typer 0.9+ | Type-driven CLI with great UX |
| **Storage** | JSON (local files) | No external dependencies, easy to inspect |
| **Testing** | pytest 7+, pytest-cov | Comprehensive test coverage with mocks |
| **Code Quality** | ruff, mypy (strict) | Fast linting, strict type checking |
| **Optional UI** | FastAPI, Uvicorn | REST API for trace serving |
| **Marketing Site** | Next.js 15+, TypeScript, Tailwind | Modern web experience for docs |

---

## For Recruiters: How to Evaluate This

### What You're Looking At
This is a **full-stack Python project** demonstrating:
- Runtime instrumentation and metaprogramming
- Systems design (event-driven, policy enforcement)
- Type safety and testing discipline
- Framework integration (adapter pattern)
- Full-stack awareness (Python SDK → CLI → Web UI)

### How to Try It (15 minutes)

1. **See the core design** (5 min):
   ```bash
   # Install and run the quickstart above
   pip install paprika
   python -c "from paprika import PaprikaRuntime, PolicyConfig; ..."
   ```

2. **Inspect the architecture** (5 min):
   - Read [src/paprika/runtime.py](src/paprika/runtime.py) — Core execution wrapping (focus on RunState class)
   - Read [src/paprika/policy.py](src/paprika/policy.py) — Policy enforcement logic
   - Read [src/paprika/replay.py](src/paprika/replay.py) — Deterministic replay implementation

3. **See it in action** (5 min):
   ```bash
   # Run the test agent suite (no API keys needed, fully mocked)
   cd /path/to/paprika
   ./examples/test_agents/scripts/run_looping.sh    # Shows policy violation
   paprika runs inspect <run-id-from-output>        # Step through execution
   ```

### Code to Review (in order of importance)

| File | What It Shows | Lines |
|------|---------------|-------|
| [src/paprika/runtime.py](src/paprika/runtime.py) | Runtime instrumentation, decorator-based wrapping | 10-50: RunState initialization |
| [src/paprika/events.py](src/paprika/events.py) | Event schema design, typed trace structure | All — understand event model |
| [src/paprika/policy.py](src/paprika/policy.py) | Policy enforcement state machine | All — policy logic |
| [src/paprika/replay.py](src/paprika/replay.py) | Deterministic execution with cache validation | All — replay correctness |
| [src/paprika/adapters/](src/paprika/adapters/) | Adapter pattern for LLM/tool abstraction | — framework agnosticity |

### Key Design Decisions

1. **Event-Driven Traces** — Every execution step is captured as a typed event, enabling deterministic replay and rich debugging
2. **Policy Pre-Execution Blocking** — Policies check *before* running, not after, to prevent damage
3. **Framework Agnostic** — Adapters for LLM providers and tool frameworks mean this works with any agent system
4. **Type-Safe SDK** — Strict mypy + Pydantic means the API is self-documenting and prevents misuse

---

## Development Setup

```bash
# Install dependencies
uv sync --dev

# Run tests (30+ tests covering unit, integration, e2e)
uv run pytest

# Type checking
uv run mypy src/

# Linting
uv run ruff check src/ tests/

# Marketing site
cd apps/web
npm install && npm run dev
```

---

## Test Agents (Deterministic Testbed)

The `examples/test_agents/` directory contains realistic agent scenarios with fully mocked LLM and tools — **no API keys required**.

```bash
# Infinite loop — shows max_steps policy violation
./examples/test_agents/scripts/run_looping.sh

# Bad decision — shows trace clarity for debugging
./examples/test_agents/scripts/run_wrong_decision.sh

# Happy path — customer support refund workflow
./examples/test_agents/scripts/run_support_workflow.sh happy

# Replay mismatch — shows correctness detection
./examples/test_agents/scripts/run_support_workflow.sh mismatch
```

See [examples/test_agents/README.md](examples/test_agents/README.md) for details.

---

## Current Limitations

- Traces stored locally as JSON files (no hosted storage yet)
- Sensitive data not redacted from traces (security roadmap)
- Built for dev/staging (production hardening TBD)
- v1 supports OpenAI-compatible LLM providers only

---

## License

MIT
