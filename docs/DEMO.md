# Paprika Demo

The demo runs Paprika’s core workflow in under 30 seconds, with **no API keys** required.

---

## How to Run

```bash
# From repo (after clone)
uv run demo

# Or after pip install
pip install -e .
demo
```

---

## What the Demo Does

1. **Running agent...** — Creates a Paprika runtime, registers tools (`multiply`, `lookup_customer`), defines an agent with `@runtime.agent()`, and runs it. The agent calls tools and a mock LLM (`provider="mock"`), so no network or API key is needed.

2. **Trace saved: &lt;run_id&gt;** — Every execution step is recorded to a trace file (stored in a temp directory for this demo). The run ID identifies the trace.

3. **CLI: paprika runs list** — Shows the list output you’d see from `paprika runs list`. The demo runs this logic in-process rather than via subprocess.

4. **Inspecting run...** — Displays the event timeline for the run: `run_start`, `tool_call_start`, `tool_call_end`, `llm_call_start`, `llm_call_end`, `run_end`. This is the same output as `paprika runs inspect <run_id>`.

5. **Replaying run...** — Re-executes the agent using the recorded trace. Tools and LLM are stubbed; no real calls are made. The output matches the original run, demonstrating deterministic replay.

6. **Demo complete.** — Confirms the full flow: trace, enforce, replay.

---

## Each Printed Step

| Step | Meaning |
|------|---------|
| Running agent... | Agent function executes; tools and LLM (mock) are called |
| Trace saved: &lt;run_id&gt; | Trace written to disk; run_id can be used for inspect/replay |
| CLI: paprika runs list | Summary of runs (same as `paprika runs list`) |
| Inspecting run... | Event timeline for the run |
| Replaying run... | Deterministic replay using recorded outputs |

---

## Demo Location

The demo logic lives in `src/paprika/demo.py`. You can also run:

```bash
python examples/demo.py
```

---

## Requirements

- Python 3.11+
- No external API keys
- No network access (mock provider used)
