# Paprika Execution Record v1 — Specification

## 1. Executive Summary

The Paprika Execution Record is the canonical, versioned data format for capturing a single AI agent execution. It replaces the current implicit trace format with an explicit, portable contract that serves as the single source of truth for:

- **Runtime output** — what the runtime produces after every agent run
- **Replay input** — the deterministic replay engine's source of stubs and validation
- **CLI inspection** — what `paprika runs inspect` reads and displays
- **UI rendering** — what the browser timeline viewer consumes
- **Diff / comparison** — the basis for structural comparison between runs
- **Future cloud ingestion** — a stable, portable artifact for upload and analysis
- **Third-party integrations** — a documented schema external tools can depend on

Today, Paprika traces are internal JSON artifacts shaped by Pydantic model serialization. The Execution Record formalizes this into a versioned, documented data contract with explicit compatibility guarantees, extension points, and migration rules. The format stays JSON, stays local-first, and stays simple — but becomes something external systems can reliably consume.

## 2. Design Goals

1. **Versioned** — every record declares its schema version; consumers can adapt
2. **Portable** — a single `.json` file is a complete, self-contained execution record
3. **Replay-friendly** — all fields needed for deterministic replay are explicitly defined
4. **Readable** — human-readable JSON with clear field names; no binary encoding
5. **Extensible** — new fields and step types can be added without breaking existing consumers
6. **Minimal** — v1 includes only fields the current codebase actually needs, nothing speculative
7. **Safe to evolve** — forward and backward compatibility rules are defined upfront

## 3. Explicit Non-Goals

- **Binary format** — JSON stays. Performance optimization via binary encoding is out of scope.
- **Multi-run containers** — each file is one execution. Batching is a future concern.
- **Normalization across providers** — LLM input/output payloads remain provider-specific dicts.
- **Cost/pricing fields** — can be added as extensions later; not in v1.
- **Evaluation/scoring metadata** — extension point, not core schema.
- **Protocol buffers or gRPC schemas** — JSON + Pydantic is sufficient for the current scale.
- **Paprika Cloud API contract** — this spec defines the file format, not an API wire format.
- **Formal JSON Schema publication** — Pydantic models remain the canonical source of truth; a JSON Schema export can be derived from them later.

## 4. Proposed Top-Level Schema

```
ExecutionRecord v1
├── schema_version: "1.0"
├── record_id: str                  # UUID, same as current run_id
├── parent_record_id: str | null    # for sub-agent / nested runs (future)
├── replay_of: str | null           # record_id of the original run if this is a replay
│
├── agent
│   ├── name: str
│   └── version: str | null         # optional agent version tag
│
├── execution
│   ├── started_at: datetime (ISO 8601, UTC)
│   ├── ended_at: datetime | null
│   ├── duration_ms: float | null
│   ├── status: "success" | "error" | "policy_violation"
│   └── termination_reason: str | null   # human-readable why it ended
│
├── policy
│   ├── config: PolicyConfig | null      # snapshot of active policy at run start
│   │   ├── max_steps: int | null
│   │   ├── max_tokens: int | null
│   │   └── max_repeat_hashes: int | null
│   └── violation: PolicyViolation | null  # populated if status == "policy_violation"
│       ├── policy_name: str
│       ├── message: str
│       └── details: dict
│
├── totals
│   ├── step_count: int              # number of LLM + tool call steps
│   ├── llm_calls: int
│   ├── tool_calls: int
│   ├── total_tokens: int
│   ├── prompt_tokens: int
│   └── completion_tokens: int
│
├── environment: dict | null         # optional runtime context
│   ├── paprika_version: str
│   ├── python_version: str
│   └── ...                          # extensible
│
├── steps: Step[]                    # ordered execution steps
│
├── input: Any | null                # final agent input (from RunStartEvent.input_args)
├── output: Any | null               # final agent output (from RunEndEvent.output)
├── error: str | null                # error message if status == "error"
│
└── extensions: dict                 # reserved for future use, default {}
```

### Key design decisions

**`record_id` replaces `run_id`**: The term "execution record" is the canonical name. Internally, `run_id` remains an alias for backward compatibility, but the serialized field is `record_id`.

**`replay_of` promoted to top-level**: Currently buried in `metadata["replay_of"]`. This is important enough for a first-class field.

**`policy.config` is a snapshot**: Records the exact policy that was active when the run started. This makes records self-documenting — you can see what limits were in effect without needing external config.

**`totals` are pre-computed**: Consumers currently compute these by scanning events. Pre-computing at write time is cheaper and eliminates inconsistencies.

**`environment` is optional**: Useful for debugging ("which Paprika version produced this?") but not required for replay or inspection.

**`input`/`output`/`error` at top level**: The agent's final input and output are first-class fields, not buried inside RunStart/RunEnd step details. Makes the record immediately scannable.

## 5. Step Model

Each step in the `steps` array represents one logical execution action.

### 5.1 Base step fields (all steps)

```
step_index: int                    # sequential, 0-based
step_type: str                     # discriminator
timestamp: str                     # ISO 8601 UTC
event_id: str                      # UUID, for dedup/reference
```

### 5.2 Step types

#### `llm_call`

Merges the current LLMCallStartEvent + LLMCallEndEvent into a single step. This is the most significant structural change from the current format: **the Execution Record stores paired steps, not raw event pairs**.

```
step_type: "llm_call"
provider: str
model: str
input_data: dict                   # full LLM input payload
input_hash: str                    # deterministic hash for replay matching
output_data: dict | null           # full LLM response (null if call failed)
token_usage: TokenUsage | null
duration_ms: float | null
side_effect: "pure"                # LLM calls are deterministic-replay-safe
error: str | null
```

#### `tool_call`

Merges ToolCallStartEvent + ToolCallEndEvent.

```
step_type: "tool_call"
tool_name: str
args: dict                         # tool input arguments
input_hash: str                    # deterministic hash for replay matching
output_data: Any | null            # tool return value
duration_ms: float | null
side_effect: str                   # see Section 7
error: str | null
```

#### `policy_violation`

Standalone step, not paired.

```
step_type: "policy_violation"
policy_name: str
message: str
details: dict
```

### 5.3 Why no `run_start` / `run_end` step types?

The current format uses RunStartEvent and RunEndEvent as bookend events in the events list. In the Execution Record, this information lives at the top level (`input`, `output`, `error`, `execution.status`, `execution.started_at`, etc.). This eliminates redundancy and makes the `steps` array purely about the execution actions the agent took.

The UI already treats run_start/run_end specially (sorted first/last, different styling). Moving them out of the step list makes the data model match the UI model.

### 5.4 TokenUsage

```
prompt_tokens: int
completion_tokens: int
total_tokens: int
```

Unchanged from current format.

## 6. Replay / Determinism Semantics

### 6.1 Replay contract

A record is **replayable** if every `llm_call` and `tool_call` step has:
- a valid `input_hash`
- a non-null `output_data`

The replay engine can then:
1. Load the record
2. Build a stub map: `step_index → output_data` for each step
3. Re-execute the agent, intercepting calls at each step
4. Validate that `input_hash` matches the recorded value
5. Return the recorded `output_data` instead of making a real call

### 6.2 Replay validation fields

| Field | Role in replay |
|-------|---------------|
| `step_index` | Stub lookup key — must match execution order exactly |
| `input_hash` | Integrity check — detects if the agent's input has changed |
| `output_data` | Stub value — returned instead of making a real call |

### 6.3 Input hash stability

The `input_hash` computation (recursive key sort → JSON serialize → SHA256 → first 16 hex chars) is part of the spec. Changing this algorithm is a **breaking change** that requires a new schema version.

### 6.4 Mismatch diagnostics

When replay detects a mismatch, the record provides enough data to diagnose:
- `step_index` tells you which step diverged
- `input_hash` comparison shows whether the input changed
- `input_data` / `args` show the actual content for manual comparison

### 6.5 `replay_of` semantics

When a record has `replay_of` set:
- It was produced by re-executing the original record's agent with recorded stubs
- The `steps` should structurally match the original (same count, same types, same order)
- Differences indicate non-determinism in agent logic outside of LLM/tool calls

## 7. Side-Effect Model

Each step carries a `side_effect` classification that indicates the safety of replaying or re-executing that step.

### 7.1 Side-effect levels

| Level | Meaning | Replay behavior |
|-------|---------|----------------|
| `pure` | No external interaction; deterministic given same input | Safe to replay with stubs |
| `read_only` | Reads external state but doesn't modify it | Safe to replay with stubs; live re-execution may return different data |
| `write` | Modifies external state | Must use stubs during replay; live re-execution has side effects |
| `irreversible` | Modifies external state in a way that cannot be undone | Must use stubs; flag prominently in UI |

### 7.2 Default assignments

| Step type | Default side_effect |
|-----------|-------------------|
| `llm_call` | `pure` (API call is stateless from the agent's perspective) |
| `tool_call` | `read_only` (conservative default; can be overridden per-tool) |
| `policy_violation` | not applicable (no external interaction) |

### 7.3 How side_effect is set

In v1, `side_effect` is set by convention:
- `llm_call` steps are always `pure`
- `tool_call` steps default to `read_only`
- Tool authors can declare a side_effect level when registering a tool via `runtime.register_tool(name, func, side_effect="write")`
- The runtime records whatever the tool declares

In future versions, the UI could use this to:
- Warn before live re-execution of `write` / `irreversible` steps
- Show a safety indicator on each timeline step
- Filter "safe to replay" vs "has side effects" runs

### 7.4 v1 pragmatism

The `side_effect` field is **optional in v1** with a default of `null` (meaning "unclassified"). This allows gradual adoption — existing tools don't need to declare anything, and consumers treat `null` as "unknown, assume read_only".

## 8. Versioning Strategy

### 8.1 Schema version field

Every Execution Record carries:

```json
"schema_version": "1.0"
```

This is a **string**, not a number, following semver-like conventions:
- `"1.0"` — initial release
- `"1.1"` — backward-compatible additions (new optional fields)
- `"2.0"` — breaking changes (field renames, removed fields, changed semantics)

### 8.2 Compatibility rules

**Backward compatibility** (consumer reading older records):
- Consumers must handle missing optional fields gracefully (use defaults)
- A v1.1 consumer must be able to read v1.0 records without error
- Missing `schema_version` implies "0.0" (pre-spec legacy format)

**Forward compatibility** (consumer reading newer records):
- Consumers should ignore unknown fields (Pydantic's `model_config = {"extra": "ignore"}`)
- A v1.0 consumer should be able to read a v1.1 record (ignoring new fields)
- A v1.x consumer encountering a v2.0 record should fail with a clear error: "Unsupported schema version 2.0; upgrade Paprika"

### 8.3 Version bump rules

| Change type | Version bump | Example |
|-------------|-------------|---------|
| New optional field on record or step | minor (1.0 → 1.1) | Adding `cost_usd` to llm_call steps |
| New step type | minor (1.0 → 1.1) | Adding `user_input` step type |
| New required field | major (1.x → 2.0) | Making `environment` required |
| Field rename | major (1.x → 2.0) | Renaming `record_id` to `execution_id` |
| Field removal | major (1.x → 2.0) | Removing `input_hash` |
| Changed hash algorithm | major (1.x → 2.0) | Changing SHA256 to BLAKE3 |
| New top-level section | minor if optional | Adding `annotations: dict` |

### 8.4 Reader behavior

```
schema_version parsing:
  missing or "0.0"  → apply legacy migration (Section 9)
  "1.x"             → read normally, ignore unknown fields
  "2.x" or higher   → error: "Unsupported schema version"
```

## 9. Migration Plan

### 9.1 Current format → Execution Record v1 mapping

| Current field | Execution Record v1 field |
|--------------|--------------------------|
| `run_id` | `record_id` |
| `agent_name` | `agent.name` |
| `started_at` | `execution.started_at` |
| `ended_at` | `execution.ended_at` |
| `metadata.replay_of` | `replay_of` |
| `events[type=run_start].input_args` | `input` |
| `events[type=run_end].status` | `execution.status` |
| `events[type=run_end].output` | `output` |
| `events[type=run_end].error` | `error` |
| `events[type=run_end].total_tokens` | `totals.total_tokens` |
| `events[]` (paired start/end) | `steps[]` (merged) |

### 9.2 Migration function

A `migrate_v0_to_v1(data: dict) -> dict` function converts legacy traces:

1. Set `schema_version` to `"1.0"`
2. Copy `run_id` → `record_id`
3. Extract `agent_name` into `agent.name`
4. Extract `metadata.replay_of` → `replay_of`
5. Pair start/end events by `step_index` into merged steps
6. Extract RunStartEvent.input_args → `input`
7. Extract RunEndEvent fields → `output`, `error`, `execution.status`
8. Compute `totals` from events
9. Set `environment` to `null`
10. Set `extensions` to `{}`

This is essentially the logic already in `ui/transforms.py` (step pairing, token computation), promoted to a first-class migration function.

### 9.3 Rollout strategy

**Phase 1: Read both, write current** (non-breaking)
- Add `migrate_v0_to_v1()` function
- Update `LocalTraceStore.load()` to detect missing `schema_version` and auto-migrate in memory
- All consumers (CLI, UI, replay) continue working unchanged
- No files on disk are modified
- Duration: 1 release cycle

**Phase 2: Write v1, read both** (write-side migration)
- Update runtime to write Execution Record v1 format
- `LocalTraceStore.load()` still handles both formats
- Old traces on disk remain readable
- New traces are v1 format
- Duration: 1 release cycle

**Phase 3: Deprecate v0** (cleanup)
- Log a warning when loading v0 traces: "Legacy trace format detected; consider re-running with current Paprika version"
- Provide a CLI command: `paprika runs migrate [--trace-dir ...]` to batch-convert v0 files on disk
- Remove v0 read path after sufficient deprecation period

### 9.4 Risk mitigation

- **Never delete old trace files** — migration is always in-memory or opt-in on-disk
- **Migration function is pure** — takes dict, returns dict, no side effects
- **Existing tests continue to pass** — Phase 1 is purely additive

## 10. Impact on Existing Components

### 10.1 Runtime (`runtime.py`)

**Phase 1**: No changes.
**Phase 2**: `RunState` builds an Execution Record v1 dict instead of a flat event list. The core change is:
- Remove `record_start()` / `record_end()` as event-appenders
- Instead, set top-level fields directly and append merged steps
- `PolicyConfig` is snapshotted into `policy.config` at run start
- `totals` are computed from accumulated state at run end

### 10.2 Replay engine (`replay.py`)

**Phase 1**: Add a v1 reader path alongside the existing one. The replay engine needs:
- `steps[].step_index` for stub lookup
- `steps[].input_hash` for validation
- `steps[].output_data` for stub values

Since v1 steps are already merged (no start/end pairing needed), the replay engine gets simpler.

**Phase 2**: Remove the v0 path.

### 10.3 Trace store (`trace_store.py`)

**Phase 1**: `load()` detects format version and migrates v0 in memory. `save()` unchanged.
**Phase 2**: `save()` writes v1 format. `list_runs()` can read `totals` directly from v1 records instead of scanning events — this is a performance win for large traces.

New model: `ExecutionRecord` (Pydantic) replaces or wraps `Trace`.

### 10.4 CLI (`cli.py`)

**Phase 1**: No changes (auto-migration in `load()` handles it).
**Phase 2**: Update `inspect` command to render the v1 structure directly. The `_print_event()` function becomes `_print_step()`. The `diff` command operates on `steps[]` instead of `events[]`.

### 10.5 UI transforms (`ui/transforms.py`)

**Phase 1**: No changes (auto-migration feeds the same shape to transforms).
**Phase 2**: Transforms simplify dramatically. `trace_to_detail()` no longer needs to pair events — the steps are already merged. `_compute_total_tokens()` becomes a simple field read from `totals.total_tokens`. The transform layer may become thin enough to inline into the server routes.

### 10.6 UI server (`ui/server.py`)

**Phase 1**: No changes.
**Phase 2**: API response shapes may change slightly (e.g., `totals` object instead of flat `total_tokens`). Frontend types updated to match.

## 11. Risks / Tradeoffs

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Breaking replay** — changing the step structure could break replay of existing traces | High | Phase 1 auto-migration ensures old traces are readable. Replay engine accepts both formats during transition. |
| **Migration bugs** — incorrect v0→v1 conversion corrupts data | Medium | Migration is read-only (in-memory). Original files are never modified. Comprehensive test coverage of the migration function with real trace fixtures. |
| **Paired steps lose timing granularity** — merging start+end events loses the ability to see "when did the call start" vs "when did it end" | Low | The step carries `timestamp` (start time) and `duration_ms`. End time is derivable: `timestamp + duration_ms`. No information is lost. |
| **`record_id` vs `run_id` naming confusion** | Low | Keep `run_id` as an alias in the Pydantic model. The JSON field is `record_id` but code can access either. |
| **Side-effect classification is subjective** | Low | Default to `null` (unclassified). This is advisory metadata, not enforced by the runtime. |
| **`schema_version` string parsing** | Low | Simple `major.minor` string split. No semver library needed. |
| **Dual-format maintenance burden** | Medium | Limit to 1-2 release cycles. Phase 3 removes the v0 path. |

## 12. Recommended Implementation Order

### Step 1: Define the Pydantic models (1 day)

Create `src/paprika/execution_record.py` with:
- `ExecutionRecord` — top-level model
- `Step` — discriminated union of step types
- `LLMCallStep`, `ToolCallStep`, `PolicyViolationStep`
- `AgentInfo`, `ExecutionInfo`, `PolicySnapshot`, `Totals`
- `migrate_v0_to_v1(data: dict) -> dict` function

Write comprehensive tests for the migration function using existing trace fixtures.

### Step 2: Wire into trace store (0.5 days)

Update `LocalTraceStore.load()` to:
- Detect `schema_version` in loaded JSON
- If missing, call `migrate_v0_to_v1()` before model validation
- Return an `ExecutionRecord` (or convert to one)

Keep `save()` unchanged (still writes current format).

### Step 3: Update consumers to accept both (1 day)

- UI transforms: accept `ExecutionRecord` or legacy `Trace`
- CLI: same
- Replay engine: same

This is Phase 1 — non-breaking, read-only migration.

### Step 4: Update runtime to write v1 (1 day)

Modify `RunState` and `_execute_agent()` to produce an `ExecutionRecord` instead of a `Trace`. Update `save()` to write v1 format.

### Step 5: Simplify consumers (0.5 days)

- Remove legacy code paths from transforms, CLI, replay
- Simplify UI transforms (direct field reads instead of event pairing)
- Update API response shapes if needed

### Step 6: Add `paprika runs migrate` CLI command (0.5 days)

Batch-converts v0 trace files on disk to v1 format. Optional, non-destructive (writes new files or overwrites with confirmation).

**Total estimated effort: 4-5 days**

## 13. Example Record

```json
{
  "schema_version": "1.0",
  "record_id": "550e8400-e29b-41d4-a716-446655440000",
  "parent_record_id": null,
  "replay_of": null,

  "agent": {
    "name": "support_agent",
    "version": null
  },

  "execution": {
    "started_at": "2025-01-15T10:30:45.123456+00:00",
    "ended_at": "2025-01-15T10:30:47.654321+00:00",
    "duration_ms": 2530.865,
    "status": "success",
    "termination_reason": null
  },

  "policy": {
    "config": {
      "max_steps": 10,
      "max_tokens": 5000,
      "max_repeat_hashes": 3
    },
    "violation": null
  },

  "totals": {
    "step_count": 2,
    "llm_calls": 1,
    "tool_calls": 1,
    "total_tokens": 35,
    "prompt_tokens": 20,
    "completion_tokens": 15
  },

  "environment": {
    "paprika_version": "0.2.0",
    "python_version": "3.13.1"
  },

  "input": {
    "args": ["help me with my account"],
    "kwargs": {}
  },
  "output": "I've looked up your account. You're on the premium plan.",
  "error": null,

  "steps": [
    {
      "step_index": 1,
      "step_type": "llm_call",
      "timestamp": "2025-01-15T10:30:45.234567+00:00",
      "event_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "provider": "openai",
      "model": "gpt-4",
      "input_data": {
        "messages": [
          {"role": "user", "content": "help me with my account"}
        ]
      },
      "input_hash": "a1b2c3d4e5f6g7h8",
      "output_data": {
        "choices": [
          {"message": {"role": "assistant", "content": "Let me look that up."}}
        ]
      },
      "token_usage": {
        "prompt_tokens": 20,
        "completion_tokens": 15,
        "total_tokens": 35
      },
      "duration_ms": 1200.5,
      "side_effect": "pure",
      "error": null
    },
    {
      "step_index": 2,
      "step_type": "tool_call",
      "timestamp": "2025-01-15T10:30:46.434567+00:00",
      "event_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "tool_name": "lookup_customer",
      "args": {"email": "alice@example.com"},
      "input_hash": "f8e7d6c5b4a39281",
      "output_data": {"name": "Alice", "plan": "premium"},
      "duration_ms": 45.3,
      "side_effect": "read_only",
      "error": null
    }
  ],

  "extensions": {}
}
```

### Policy violation example

When `status` is `"policy_violation"`, the record looks like:

```json
{
  "execution": {
    "status": "policy_violation",
    "termination_reason": "Exceeded maximum step count of 5"
  },
  "policy": {
    "config": {"max_steps": 5, "max_tokens": null, "max_repeat_hashes": null},
    "violation": {
      "policy_name": "max_steps",
      "message": "Exceeded maximum step count of 5",
      "details": {"current": 6, "limit": 5}
    }
  },
  "steps": [
    {"step_index": 1, "step_type": "llm_call", "...": "..."},
    {"step_index": 2, "step_type": "tool_call", "...": "..."},
    {"step_index": 3, "step_type": "llm_call", "...": "..."},
    {"step_index": 4, "step_type": "tool_call", "...": "..."},
    {"step_index": 5, "step_type": "llm_call", "...": "..."},
    {
      "step_index": 5,
      "step_type": "policy_violation",
      "timestamp": "2025-01-15T10:31:15.000000+00:00",
      "event_id": "...",
      "policy_name": "max_steps",
      "message": "Exceeded maximum step count of 5",
      "details": {"current": 6, "limit": 5}
    }
  ]
}
```

### Replay example

```json
{
  "schema_version": "1.0",
  "record_id": "replay-run-789",
  "replay_of": "550e8400-e29b-41d4-a716-446655440000",
  "agent": {"name": "support_agent", "version": null},
  "execution": {"status": "success", "...": "..."},
  "steps": ["... (same structure as original, stubs returned instead of live calls)"]
}
```
