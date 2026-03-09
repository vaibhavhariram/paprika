# Paprika

**Execution control infrastructure for AI agents.**

Paprika is a Python SDK that sits between agent code and external systems. It records structured traces, enforces runtime policies (max steps, max tokens, repeat detection), and enables deterministic replay of prior runs.

---

## 30-Second Demo

See Paprika in action (no API keys required):

```bash
git clone https://github.com/vaibhavhariram/paprika.git
cd paprika
uv run demo
```

Example output:

```
Running agent...
  Output: 42 for Alice

Trace saved: 56f3eab3-b784-47b0-901b-269ed50eca90

CLI: paprika runs list
  Run ID     Agent       Status   Steps
  ...

Inspecting run...
  [  0] run_start  agent=demo_agent
  [  1] tool_call_start  tool=multiply
  ...

Replaying run...
  Replay output: 42 for Alice

Demo complete. Paprika: trace, enforce, replay.
```

See [docs/DEMO.md](docs/DEMO.md) for details.

---

## Why Paprika?

Agentic systems introduce production risks: infinite loops, runaway token costs, unpredictable execution, and debugging difficulty. Traditional observability only observes; Paprika adds **runtime control**—trace, enforce limits, and replay deterministically.

---

## Quick Start

### Install

```bash
pip install -e .
# Or: pip install paprika  (when published to PyPI)
```

Verify:

```bash
paprika runs list
```

### Wrap an Agent (~20 lines)

```python
from paprika import PaprikaRuntime, PolicyConfig, PaprikaContext

runtime = PaprikaRuntime(policy=PolicyConfig(max_steps=20))
runtime.register_tool("lookup", lambda email: {"name": "Alice", "email": email})

@runtime.agent()
def support_agent(ctx: PaprikaContext, user_input: str) -> str:
    data = ctx.tools.call(name="lookup", args={"email": "alice@example.com"})
    return f"Summary: {data}"

result = support_agent("help me")
# Traces saved to ~/.paprika/traces/
```

### Replay a Run

```python
result = runtime.replay(run_id="...")  # Same output, no side effects
```

---

## CLI

```bash
paprika runs list                    # List recent runs
paprika runs inspect <run_id>        # Show event timeline
paprika runs inspect <run_id> -v     # Include payloads
paprika runs diff <run_a> <run_b>    # Compare runs
```

Use `--trace-dir` or `PAPRIKA_TRACE_DIR` for a custom trace directory.

---

## Integration Examples

```bash
python examples/basic_agent.py
python examples/policy_violation_agent.py --policy max_steps
python examples/replay_demo.py <run_id>
python examples/simple_agent_loop.py              # Vanilla agent loop
python examples/langgraph_integration.py           # LangGraph (pip install -e ".[examples]")
```

See [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md) and [docs/QUICKSTART.md](docs/QUICKSTART.md).

---

## Limitations (v1)

- **Replay** — Programmatic only (`runtime.replay()`); no `paprika runs replay` CLI
- **Storage** — Local JSON in `~/.paprika/traces/`; no cloud
- **Tools** — Use `ctx.tools.call(name=..., args={...})` with `args` dict
- **LLM** — OpenAI-compatible; use `provider="mock"` for examples

---

## Development

```bash
pip install -e ".[dev]"
pytest
ruff check src/ tests/
mypy src/
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT
