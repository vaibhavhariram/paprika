# Paprika v1 — Manual Verification Checklist

This document defines how to manually verify the Paprika MVP end-to-end. Run each scenario and confirm pass/fail before shipping.

**Prerequisites:**
- `uv sync` (or `pip install -e .`)
- Python 3.11+

**Isolated testing:** Use `PAPRIKA_TRACE_DIR=/tmp/paprika-verify` to keep traces separate from production.

---

## 1. Happy-Path Agent Execution

**Setup:**
```bash
cd /path/to/paprika
uv run python examples/basic_agent.py
```

**Commands:**
```bash
PAPRIKA_TRACE_DIR=/tmp/paprika-verify uv run python examples/basic_agent.py
```

**Expected result:**
- Agent executes two tool calls (lookup, format) and returns a summary string.
- Output contains `Summary:` and `Alice`.
- No exceptions.

**Inspect:**
- Trace saved to `~/.paprika/traces/<run_id>.json`
- `uv run paprika runs list --trace-dir /tmp/paprika-verify` shows the run with status `success` and step_count 2
- `uv run paprika runs inspect <run_id> --trace-dir /tmp/paprika-verify` shows run_start → tool_call_start → tool_call_end (x2) → run_end

**Pass criteria:**
- [ ] Example runs without error
- [ ] Trace file exists on disk
- [ ] CLI list shows the run
- [ ] CLI inspect shows correct event timeline

---

## 2. Max Steps Policy Violation

**Setup:**
```bash
uv run python examples/policy_violation_agent.py --policy max_steps
```

**Expected result:**
- `PolicyViolationError` raised with message containing `max_steps` or `Step limit exceeded`.
- Trace is saved before the exception propagates.

**Inspect:**
- Trace contains `policy_violation` event and `run_end` with status `policy_violation`
- `uv run paprika runs inspect <run_id> --trace-dir /tmp/paprika-verify` shows policy_violation in the timeline

**Pass criteria:**
- [ ] PolicyViolationError is raised
- [ ] Trace includes policy_violation event
- [ ] Run status is `policy_violation`

---

## 3. Max Tokens Policy Violation

**Setup:**
```bash
uv run python examples/policy_violation_agent.py --policy max_tokens
```

**Expected result:**
- Agent uses a mock LLM that returns token usage. When cumulative tokens exceed the limit, `PolicyViolationError` is raised with `max_tokens` or `Token budget exceeded`.
- Trace is saved.

**Inspect:**
- Trace contains policy_violation event for max_tokens
- run_end has status `policy_violation`

**Pass criteria:**
- [ ] PolicyViolationError is raised
- [ ] Trace includes policy_violation for max_tokens
- [ ] Token usage is recorded in LLM events

---

## 4. Max Repeat Hashes Policy Violation

**Setup:**
```bash
uv run python examples/policy_violation_agent.py --policy max_repeat_hashes
```

**Expected result:**
- Agent calls the same tool with the same args repeatedly. After exceeding `max_repeat_hashes`, `PolicyViolationError` is raised with `max_repeat_hashes` or `repeated`.
- Trace is saved.

**Inspect:**
- Trace contains policy_violation event for max_repeat_hashes
- Multiple identical tool_call events before the violation

**Pass criteria:**
- [ ] PolicyViolationError is raised
- [ ] Trace includes policy_violation for max_repeat_hashes
- [ ] Violation occurs after repeated identical calls

---

## 5. Replay of Prior Run

**Setup:**
```bash
# First: run basic_agent to create a trace
uv run python examples/basic_agent.py
# Note the run_id printed at the end (or from paprika runs list)

# Second: replay that run
uv run python examples/replay_demo.py <run_id>
```

**Expected result:**
- Replay completes with the same output as the original run.
- During replay, tools are NOT actually executed (stubbed from trace).
- No side effects (e.g. if a tool wrote to a file, that would not happen in replay).

**Inspect:**
- Replay output matches original output.
- New trace is saved for the replay run, with `metadata.replay_of` pointing to the original run_id.

**Pass criteria:**
- [ ] Replay produces identical output to original
- [ ] Tools are stubbed (no real side effects)
- [ ] Replay trace has replay_of metadata

---

## 6. CLI Inspection of Runs

**Setup:** Ensure at least one trace exists (run `basic_agent.py` or integration tests).

**Commands:**
```bash
uv run paprika runs list --trace-dir /tmp/paprika-verify
uv run paprika runs inspect <run_id> --trace-dir /tmp/paprika-verify
uv run paprika runs inspect <run_id> -v --trace-dir /tmp/paprika-verify
```

**Expected result:**
- `list`: Table with Run ID, Agent, Started, Status, Steps. No errors.
- `inspect`: Timeline of events with step index and event type.
- `inspect -v`: Same plus input/output payloads where applicable.

**Pass criteria:**
- [ ] List shows runs without error
- [ ] Inspect shows event timeline
- [ ] Verbose mode shows payloads

**Note:** Use full `run_id` (UUID) from the list output. Prefix matching is supported: if a unique trace matches, you can use a short prefix.

---

## 7. CLI Diff of Two Runs

**Setup:** Create two traces — e.g. run `basic_agent.py` twice, or run it once and use a different example.

**Commands:**
```bash
uv run paprika runs list --trace-dir /tmp/paprika-verify  # get two run_ids
uv run paprika runs diff <run_id_a> <run_id_b> --trace-dir /tmp/paprika-verify
```

**Expected result:**
- For identical runs (same agent, same flow): "Runs are structurally identical."
- For different runs: Mismatches or hash diffs shown per step index.

**Pass criteria:**
- [ ] Diff runs without error
- [ ] Identical runs show "structurally identical"
- [ ] Different runs show differences

---

## Quick Reference

| Scenario              | Command                                           | Key check                         |
|-----------------------|---------------------------------------------------|-----------------------------------|
| Happy path            | `PAPRIKA_TRACE_DIR=/tmp/pv uv run python examples/basic_agent.py` | Trace saved, CLI list/inspect |
| Max steps violation   | `PAPRIKA_TRACE_DIR=/tmp/pv uv run python examples/policy_violation_agent.py --policy max_steps` | PolicyViolationError, trace |
| Max tokens violation  | `PAPRIKA_TRACE_DIR=/tmp/pv uv run python examples/policy_violation_agent.py --policy max_tokens` | PolicyViolationError, trace |
| Repeat hashes        | `PAPRIKA_TRACE_DIR=/tmp/pv uv run python examples/policy_violation_agent.py --policy max_repeat_hashes` | PolicyViolationError, trace |
| Replay               | `PAPRIKA_TRACE_DIR=/tmp/pv uv run python examples/replay_demo.py <run_id>` | Same output, no side effects |
| CLI list             | `uv run paprika runs list --trace-dir /tmp/pv`     | Table of runs                     |
| CLI inspect          | `uv run paprika runs inspect <run_id> --trace-dir /tmp/pv` | Event timeline            |
| CLI diff             | `uv run paprika runs diff <run_a> <run_b> --trace-dir /tmp/pv` | Structural comparison   |

---

## Integration Examples (Optional)

| Example                   | Command                                            | Notes                          |
|---------------------------|----------------------------------------------------|--------------------------------|
| Vanilla agent loop        | `uv run python examples/simple_agent_loop.py`      | LLM → tool → LLM loop          |
| LangGraph                 | `uv sync --extra examples && uv run python examples/langgraph_integration.py` | Requires langgraph |

See [INTEGRATIONS.md](INTEGRATIONS.md) for wrapping patterns.

---

## Custom Trace Directory

For isolated testing, use `PAPRIKA_TRACE_DIR` or pass `--trace-dir` to the CLI:

```bash
export PAPRIKA_TRACE_DIR=/tmp/paprika-test-traces
uv run python examples/basic_agent.py
paprika runs list --trace-dir /tmp/paprika-test-traces
```

Examples use the default `~/.paprika/traces` unless configured.
