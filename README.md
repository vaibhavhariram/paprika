# Paprika

Execution control for AI agents.

Paprika is a Python runtime wrapper that records execution traces, enforces runtime policies, and replays agent runs safely — so developers can debug loops, control behavior, and ship agents with confidence.

## Quickstart

```bash
pip install paprika
```

```python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,
        max_tokens=20000,
        max_repeat_hashes=3,
    )
)

runtime.register_tool("greet", lambda name: f"Hello, {name}!")

@runtime.agent()
def my_agent(ctx, name):
    return ctx.tools.call(name="greet", args={"name": name})

result = my_agent("world")
print(result)  # Hello, world!
```

## CLI

```bash
# List recent runs
paprika runs list

# Inspect a run step by step
paprika runs inspect <run-id>

# Compare two runs
paprika runs diff <run-id-a> <run-id-b>
```

## Replay

```python
# Replay a prior run — no live API calls, no side effects
result = runtime.replay(run_id="<run-id>")
```

## Features

- **Structured traces** — Every LLM call, tool invocation, and state transition recorded as typed events
- **Runtime policies** — `max_steps`, `max_tokens`, `max_repeat_hashes` halt execution before damage is done
- **Deterministic replay** — Re-execute prior runs using cached outputs with mismatch detection
- **CLI inspection** — List, inspect, and diff traces from the command line
- **Framework-agnostic** — Works with LangGraph, CrewAI, AutoGen, or vanilla Python agents

## Project Structure

```
paprika/
├── src/paprika/          # Python SDK
├── tests/                # Test suite
├── examples/             # Example scripts
├── apps/web/             # Marketing website (Next.js)
└── pyproject.toml
```

## Development

```bash
# SDK development
uv sync --dev
uv run pytest
uv run ruff check src/ tests/
uv run mypy src/

# Marketing site
cd apps/web
npm install
npm run dev
```

## Test Agents

The `examples/test_agents/` directory contains a realistic testbed with deterministic fake tools and a mock LLM — no API keys or network required.

```bash
# Run from repo root after installing Paprika
./examples/test_agents/scripts/run_looping.sh            # max_steps policy violation
./examples/test_agents/scripts/run_wrong_decision.sh      # bad decision trace clarity
./examples/test_agents/scripts/run_support_workflow.sh happy    # happy-path refund
./examples/test_agents/scripts/run_support_workflow.sh mismatch # replay-mismatch demo
```

See [examples/test_agents/README.md](examples/test_agents/README.md) for details.

## Current Limitations

- Traces are stored locally as JSON files (no hosted storage yet)
- Traces may contain sensitive prompt/tool data (no redaction yet)
- Designed for development/staging (production hardening on roadmap)
- Only OpenAI-compatible LLM providers in v1

## License

MIT
