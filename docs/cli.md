# CLI Reference

Paprika provides four CLI commands for managing and inspecting runs.

## paprika runs list

List recent execution records.

**Usage:**
```bash
paprika runs list [--limit N] [--trace-dir PATH]
```

**Options:**
- `--limit N` (default: 20) — maximum runs to display
- `--trace-dir PATH` — override default trace directory (`~/.paprika/traces/`)

**Output:**

```
Run ID                                    Agent      Started              Status    Steps
───────────────────────────────────────────────────────────────────────────────────────
abc123def456                              researcher 2024-01-15 14:32:10  success   3
xyz789abc123                              researcher 2024-01-15 14:31:05  success   5
```

**Fields:**
- `Run ID` — Unique identifier for the run
- `Agent` — Agent name (from `@runtime.agent(name=...)`)
- `Started` — Execution start time
- `Status` — `success`, `error`, or `policy_violation`
- `Steps` — Total number of steps executed

Runs are sorted by most recent first.

---

## paprika runs inspect

Display full details of a single execution record.

**Usage:**
```bash
paprika runs inspect <run-id> [--verbose] [--trace-dir PATH]
```

**Options:**
- `<run-id>` (required) — run ID (full UUID or prefix match)
- `--verbose` (optional) — show full input/output JSON
- `--trace-dir PATH` — override default trace directory

**Output:**

```
Record ID: abc123def456
Agent: researcher
Started: 2024-01-15 14:32:10 UTC
Ended: 2024-01-15 14:32:10 UTC
Duration: 125ms
Status: success
Total tokens: 142
Total steps: 3

Step 0: llm_call (gpt-4o)
  Provider: openai
  Model: gpt-4o
  Input hash: a1b2c3d4e5f6g7h8
  Tokens: 20
  Duration: 50ms

Step 1: tool_call (search)
  Tool: search
  Input hash: i9j0k1l2m3n4o5p6
  Duration: 35ms

Step 2: llm_call (gpt-4o)
  Provider: openai
  Model: gpt-4o
  Input hash: q7r8s9t0u1v2w3x4
  Tokens: 122
  Duration: 40ms
```

With `--verbose`, full JSON input and output are displayed.

---

## paprika runs diff

Compare two execution records step-by-step.

**Usage:**
```bash
paprika runs diff <run-id-a> <run-id-b> [--trace-dir PATH]
```

**Options:**
- `<run-id-a>` (required) — first run ID
- `<run-id-b>` (required) — second run ID
- `--trace-dir PATH` — override default trace directory

**Output:**

```
Comparing run-id-a vs run-id-b

Step 0 (llm_call): MATCH
  Hash: a1b2c3d4e5f6g7h8

Step 1 (tool_call): MATCH
  Hash: i9j0k1l2m3n4o5p6

Step 2 (llm_call): MISMATCH
  Expected hash: q7r8s9t0u1v2w3x4
  Actual hash: y9z0a1b2c3d4e5f6
```

**Interpretation:**
- `MATCH` — Same input hash (identical behavior)
- `MISMATCH` — Different input hashes (behavioral divergence)

Use this to identify where two runs diverged. Common case: comparing original vs replayed runs to catch regressions.

---

## paprika ui

Start the local browser UI for trace inspection.

**Usage:**
```bash
paprika ui [--port PORT] [--trace-dir PATH] [--no-open]
```

**Options:**
- `--port PORT` (default: 8787) — port to bind to
- `--trace-dir PATH` — override default trace directory
- `--no-open` — do not auto-open browser

**Output:**

```
Starting Paprika UI...
Listening on http://127.0.0.1:8787/
Opening browser...
```

The UI opens at `http://127.0.0.1:8787/` and displays:
- **Runs List** (`/`) — table of recent runs
- **Run Detail** (`/runs/:run_id`) — execution timeline with step details

**Requirements:**
- `paprika[ui]` extra: `pip install paprika[ui]`
- Requires FastAPI and uvicorn

**Security:**
- Binds to `127.0.0.1` only (local network only, not accessible from the internet)
- No authentication (intended for local debugging only)

---

## Environment Variables

`PAPRIKA_TRACE_DIR` — override default trace directory.

```bash
PAPRIKA_TRACE_DIR=/tmp/paprika paprika runs list
```

---

## Next Steps

- Understand execution records: [Execution Records](core-concepts/execution-records.md)
- Configure trace location and policies: [Configuration](configuration.md)
- Explore the browser UI: [UI](ui.md)
