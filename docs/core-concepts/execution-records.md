# Execution Records

Every run produces a single canonical artifact: an **ExecutionRecord**. It's a structured JSON file containing the complete execution timeline, inputs, outputs, and metadata.

## The Artifact

When you run an agent, Paprika creates a JSON file:

```
~/.paprika/traces/
├── abc123def456.json
├── xyz789abc123.json
└── ...
```

Each file is a complete `ExecutionRecord`. Open one:

```bash
cat ~/.paprika/traces/abc123def456.json | jq .
```

Example (abbreviated):

```json
{
  "schema_version": "1.0",
  "record_id": "abc123def456",
  "agent": {
    "name": "researcher",
    "version": null
  },
  "execution": {
    "started_at": "2024-01-15T14:32:10.123456Z",
    "ended_at": "2024-01-15T14:32:10.248456Z",
    "duration_ms": 125.0,
    "status": "success",
    "termination_reason": null
  },
  "policy": {
    "config": {
      "max_steps": 10,
      "max_tokens": 10000,
      "max_repeat_hashes": 3
    },
    "violation": null
  },
  "totals": {
    "step_count": 3,
    "llm_calls": 2,
    "tool_calls": 1,
    "total_tokens": 142,
    "prompt_tokens": 95,
    "completion_tokens": 47
  },
  "input": {},
  "output": {
    "question": "What is AI?",
    "search_result": "...",
    "summary": "..."
  },
  "error": null,
  "steps": [
    { "step_type": "llm_call", ... },
    { "step_type": "tool_call", ... },
    { "step_type": "llm_call", ... }
  ]
}
```

## Top-Level Fields

| Field | Type | Purpose |
|-------|------|---------|
| `schema_version` | string | Always `"1.0"` |
| `record_id` | string | Unique run identifier (UUID format) |
| `parent_record_id` | string \| null | For derived runs (future use) |
| `replay_of` | string \| null | If this is a replay, the original run's record_id |
| `agent` | object | Agent metadata: `name`, `version` |
| `execution` | object | Execution timeline and status |
| `policy` | object | Policy config snapshot and violation (if any) |
| `totals` | object | Aggregate counts: steps, tokens, calls |
| `input` | any | Original input to the agent |
| `output` | any | Final output from the agent |
| `error` | string \| null | Error message if execution failed |
| `environment` | object \| null | Environment metadata (reserved) |
| `steps[]` | array | Typed steps (LLM calls, tool calls, policy violations) |
| `extensions` | object | Reserved for future extensions |

## Execution Status

`execution.status` is one of:

- **`"success"`** — Agent completed normally
- **`"error"`** — Agent raised an exception
- **`"policy_violation"`** — A runtime policy was violated (agent halted mid-execution)

## Steps

The `steps[]` array contains typed execution steps. Each step has:

```json
{
  "step_type": "llm_call" | "tool_call" | "policy_violation",
  "step_index": 0,
  "timestamp": "2024-01-15T14:32:10.130000Z",
  "event_id": "uuid"
}
```

### LLM Call Step

```json
{
  "step_type": "llm_call",
  "step_index": 0,
  "timestamp": "2024-01-15T14:32:10.130000Z",
  "event_id": "abc123",
  "provider": "openai",
  "model": "gpt-4o",
  "input_data": {
    "messages": [
      { "role": "user", "content": "Your prompt" }
    ]
  },
  "input_hash": "a1b2c3d4e5f6g7h8",
  "output_data": {
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Response text"
        }
      }
    ]
  },
  "token_usage": {
    "prompt_tokens": 12,
    "completion_tokens": 8,
    "total_tokens": 20
  },
  "duration_ms": 150.0,
  "side_effect": "pure",
  "error": null
}
```

**Fields:**
- `provider` — LLM provider: `"openai"`, `"mock"`, custom
- `model` — Model identifier
- `input_data` — Full input dict (exact same as passed to `ctx.llm.call()`)
- `input_hash` — Deterministic hash of input (for mismatch detection)
- `output_data` — Full output dict from the LLM
- `token_usage` — Token counts if available
- `duration_ms` — Wall-clock duration
- `side_effect` — `"pure"` (LLM calls have no side effects)
- `error` — Error message if the call failed

### Tool Call Step

```json
{
  "step_type": "tool_call",
  "step_index": 1,
  "timestamp": "2024-01-15T14:32:10.180000Z",
  "event_id": "def456",
  "tool_name": "search",
  "args": {
    "query": "AI trends"
  },
  "input_hash": "i9j0k1l2m3n4o5p6",
  "output_data": "Search results...",
  "duration_ms": 45.0,
  "side_effect": null,
  "error": null
}
```

**Fields:**
- `tool_name` — Name of the registered tool
- `args` — Arguments dict (exact same as passed to `ctx.tools.call()`)
- `input_hash` — Deterministic hash of args (for repeat detection)
- `output_data` — Return value from the tool
- `duration_ms` — Wall-clock duration
- `side_effect` — Null (can be `"read_only"`, `"write"`, `"irreversible"` in future)
- `error` — Error message if the tool raised an exception

### Policy Violation Step

```json
{
  "step_type": "policy_violation",
  "step_index": 5,
  "timestamp": "2024-01-15T14:32:10.240000Z",
  "event_id": "ghi789",
  "policy_name": "max_steps",
  "message": "Maximum step count (10) exceeded",
  "details": {
    "limit": 10,
    "current": 11
  }
}
```

**Fields:**
- `policy_name` — Name of violated policy: `"max_steps"`, `"max_tokens"`, `"max_repeat_hashes"`
- `message` — Human-readable violation description
- `details` — Policy-specific details (limit, current value, etc.)

When a policy violation occurs:
- Execution halts immediately (remaining steps not executed)
- `execution.status = "policy_violation"`
- `policy.violation` contains the violation details
- The `PolicyViolationStep` is added to `steps[]`

## Input Hash

The `input_hash` field is critical for mismatch detection and repeat detection.

**Algorithm:**
1. Take input dict (e.g., `{"messages": [...]}`)
2. Recursively sort all keys alphabetically
3. Serialize to compact JSON (no whitespace, sorted keys)
4. Compute SHA256 hash
5. Take first 16 hex characters

Example:

```python
input_dict = {"messages": [{"role": "user", "content": "hi"}]}
# Sorted and serialized: '{"messages":[{"content":"hi","role":"user"}]}'
# SHA256: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6...'
# First 16 chars: 'a1b2c3d4e5f6g7h8'
```

The hash is deterministic:
- Same input → same hash
- Different input → different hash (with overwhelming probability)

Used for:
- **Replay mismatch detection** — if replayed input hash ≠ original, `ReplayMismatchError`
- **Repeat detection** — if same input hash appears too many times, `max_repeat_hashes` policy fires

## Storage

### Default Location

```
~/.paprika/traces/
```

The directory is created automatically on first run.

### Override Directory

Use environment variable:

```bash
PAPRIKA_TRACE_DIR=/tmp/paprika python agent.py
```

Or CLI flag:

```bash
paprika runs list --trace-dir /tmp/paprika
```

### File Naming

Files are named by `record_id`:

```
abc123def456.json
```

Run IDs must match the pattern: `^[A-Za-z0-9][A-Za-z0-9._-]*$`

(Alphanumeric, dots, dashes, underscores; no path traversal risk)

## Security

**Path Traversal Prevention:**

Run IDs are validated. You cannot escape the trace directory via a run ID like `../../../etc/passwd`. Invalid run IDs raise `InvalidRunIdError`.

**No Secrets Storage:**

`ExecutionRecord` stores full inputs and outputs. If your LLM calls or tool calls include sensitive data (API keys, passwords, PII), they **will be stored in the trace file**. Do not log sensitive data to Paprika traces if you can avoid it. Use the `input` and `output` fields only for non-sensitive structured data.

## Versions

`schema_version` is always `"1.0"`.

If Paprika updates the schema in a breaking way, the version number will increment (e.g., `"2.0"`). The code will migrate old traces automatically on load.

## Accessing Records Programmatically

```python
from paprika import PaprikaRuntime

runtime = PaprikaRuntime()

# Load a record
record = runtime.trace_store.load_record(run_id="abc123def456")

# Access fields
print(record.record_id)
print(record.agent.name)
print(record.execution.status)
print(record.totals.step_count)

# Iterate steps
for step in record.steps:
    if step.step_type == "llm_call":
        print(f"LLM: {step.model} in {step.duration_ms}ms")
    elif step.step_type == "tool_call":
        print(f"Tool: {step.tool_name}")
    elif step.step_type == "policy_violation":
        print(f"Violation: {step.policy_name}")

# Serialize to JSON
json_string = record.model_dump_json_pretty()
```

## Next Steps

- Inspect records via CLI: [CLI](../cli.md)
- Replay records: [Replay Engine](replay.md)
- Set policies that affect execution status: [Policies](policies.md)
