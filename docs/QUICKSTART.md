# Paprika Quickstart

Get up and running in under 10 minutes.

---

## 1. Install

```bash
pip install -e .
# Or from PyPI (when published): pip install paprika
```

After install, the `paprika` CLI is available. No `uv run` needed.

Verify:

```bash
paprika runs list
# Output: No runs found. (or a table of runs)
# Use --trace-dir /path/to/dir if ~/.paprika is not writable
```

---

## 2. Wrap a Simple Agent

Create `my_agent.py`:

```python
from paprika import PaprikaRuntime, PolicyConfig, PaprikaContext

runtime = PaprikaRuntime(policy=PolicyConfig(max_steps=20))
runtime.register_tool("greet", lambda name: f"Hello, {name}!")

@runtime.agent()
def my_agent(ctx: PaprikaContext, task: str) -> str:
    result = ctx.tools.call(name="greet", args={"name": "World"})
    return result

print(my_agent("say hi"))  # Hello, World!
```

---

## 3. Run the Agent

```bash
python my_agent.py
```

Traces are saved to `~/.paprika/traces/`.

---

## 4. Inspect the Trace

```bash
paprika runs list
# Note the Run ID (full UUID)

paprika runs inspect <run_id>
# Shows event timeline: run_start, tool_call_start, tool_call_end, run_end
```

---

## 5. Replay the Run

```python
# In my_agent.py, after running once:
run_id = "..."  # from paprika runs list
result = runtime.replay(run_id)
print(result)  # Same output, no real tool execution
```

---

## Full Example (~25 lines)

```python
from paprika import PaprikaRuntime, PolicyConfig, PaprikaContext

runtime = PaprikaRuntime(policy=PolicyConfig(max_steps=20))
runtime.register_tool("greet", lambda name: f"Hello, {name}!")

@runtime.agent()
def my_agent(ctx: PaprikaContext, task: str) -> str:
    return ctx.tools.call(name="greet", args={"name": "World"})

# Run
result = my_agent("say hi")
print(result)

# Replay (get run_id from `paprika runs list`)
summaries = runtime.trace_store.list_runs(limit=1)
if summaries:
    replayed = runtime.replay(summaries[0].run_id)
    print("Replay:", replayed)
```

---

## Installation Verification

In a clean environment:

```bash
pip install -e .
paprika runs list
```

Expected: `No runs found.` (or a table of runs). If `~/.paprika` is not writable, use `paprika runs list --trace-dir /tmp/paprika`.

---

## Next Steps

- [README](../README.md) — Overview, CLI, examples, limitations
- [INTEGRATIONS.md](INTEGRATIONS.md) — Wrapping patterns for agent loops and LangGraph
- [MANUAL_VERIFICATION.md](MANUAL_VERIFICATION.md) — Full verification checklist
