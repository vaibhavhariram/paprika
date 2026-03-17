# Policies

Policies are runtime guardrails that halt execution when limits are breached. Set them up, and Paprika enforces them automatically.

## Setup

Define policies when creating the runtime:

```python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=10,
        max_tokens=10000,
        max_repeat_hashes=3
    )
)
```

All three policies are optional. If not specified, that policy is not enforced.

When a policy is violated:
- Execution **stops immediately**
- A `PolicyViolationError` is raised
- The violation is recorded in the trace as a `PolicyViolationStep`
- `execution.status` becomes `"policy_violation"`

## max_steps

**What it does:** Prevents infinite loops or runaway execution by limiting the number of LLM and tool calls.

**When it triggers:** Checked *before* each step. If `step_count >= max_steps`, execution halts.

**Error raised:**

```python
PolicyViolationError(
    policy_name="max_steps",
    message="Maximum step count (10) exceeded",
    details={"limit": 10, "current": 11}
)
```

**How it's recorded:**

```json
{
  "step_type": "policy_violation",
  "step_index": 10,
  "policy_name": "max_steps",
  "message": "Maximum step count (10) exceeded",
  "details": {"limit": 10, "current": 11}
}
```

The `execution.status` becomes `"policy_violation"`.

**Example:**

Agent configured with `max_steps=5` attempts to run 7 steps:

```
Step 0: LLM call (allowed)
Step 1: Tool call (allowed)
Step 2: LLM call (allowed)
Step 3: Tool call (allowed)
Step 4: LLM call (allowed)
Step 5: POLICY VIOLATION — max_steps breached, execution halts
```

The trace contains 5 completed steps + 1 `PolicyViolationStep`. The agent never executes step 6 or 7.

## max_tokens

**What it does:** Caps cumulative token usage across the entire run. Prevents expensive runaway LLM calls.

**When it triggers:** Checked *after* each LLM call. If `total_tokens > max_tokens`, execution halts.

**Error raised:**

```python
PolicyViolationError(
    policy_name="max_tokens",
    message="Token limit exceeded: 10500 > 10000",
    details={"limit": 10000, "current": 10500}
)
```

**How it's recorded:**

```json
{
  "step_type": "policy_violation",
  "step_index": 8,
  "policy_name": "max_tokens",
  "message": "Token limit exceeded: 10500 > 10000",
  "details": {"limit": 10000, "current": 10500}
}
```

The `execution.status` becomes `"policy_violation"`.

**Example:**

Agent with `max_tokens=1000`:

```
Step 0: LLM call (500 tokens, total: 500) — allowed
Step 1: Tool call (no tokens)
Step 2: LLM call (600 tokens, total: 1100) — POLICY VIOLATION, halt
```

Execution stops after step 2 (even though step 2 completed). No further steps execute. `total_tokens` in the record is 1100.

## max_repeat_hashes

**What it does:** Detects when an agent is stuck in a loop by watching input hashes. If the same input (same hash) appears more than N times, the agent is likely stuck.

**When it triggers:** Checked *after* each step. If any input hash has appeared more than `max_repeat_hashes` times, execution halts.

**Error raised:**

```python
PolicyViolationError(
    policy_name="max_repeat_hashes",
    message="Input hash repeated 4 times (limit: 3)",
    details={
        "limit": 3,
        "hash": "a1b2c3d4e5f6g7h8",
        "count": 4
    }
)
```

**How it's recorded:**

```json
{
  "step_type": "policy_violation",
  "step_index": 7,
  "policy_name": "max_repeat_hashes",
  "message": "Input hash repeated 4 times (limit: 3)",
  "details": {
    "limit": 3,
    "hash": "a1b2c3d4e5f6g7h8",
    "count": 4
  }
}
```

**Example:**

Agent configured with `max_repeat_hashes=2` gets stuck in a prompt loop:

```
Step 0: LLM call
  Input: "What is AI?"
  Hash: a1b2c3d4e5f6g7h8

Step 1: LLM call
  Input: "What is AI?"  (same as step 0)
  Hash: a1b2c3d4e5f6g7h8  (count = 2)

Step 2: Tool call (different input)
  Hash: i9j0k1l2m3n4o5p6

Step 3: LLM call
  Input: "What is AI?"  (same as steps 0 and 1)
  Hash: a1b2c3d4e5f6g7h8  (count = 3) — POLICY VIOLATION, halt
```

Execution stops after step 3. The violation indicates the agent is stuck asking the same question.

## Catching Violations

In your agent code:

```python
from paprika import PolicyViolationError, PaprikaRuntime

runtime = PaprikaRuntime(policy=PolicyConfig(max_steps=5))

@runtime.agent(name="my_agent")
def my_agent(ctx):
    # ... agent code ...
    pass

try:
    result = runtime.run("my_agent", {})
except PolicyViolationError as e:
    print(f"Policy violated: {e.policy_name}")
    print(f"Message: {e.message}")
    print(f"Details: {e.details}")
    # Handle gracefully
```

But note: the trace is **already saved** even if the exception is caught. The `ExecutionRecord` contains the violation step.

## Combining Policies

All three can be active simultaneously:

```python
runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,           # Prevent infinite loops
        max_tokens=50000,       # Prevent expensive runs
        max_repeat_hashes=5     # Prevent stuck loops
    )
)
```

They operate independently. If any policy fires, execution halts.

## Adjusting Policies

You can change policy settings per runtime. Use lower limits for testing, higher for production:

```python
# Strict for testing
dev_runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=5, max_tokens=1000)
)

# Relaxed for production
prod_runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=100, max_tokens=100000)
)
```

## No Policies

If you don't set policies, execution is unconstrained:

```python
runtime = PaprikaRuntime()  # No limits
```

All execution is recorded, but nothing is forcibly halted.

## Current Limitations

- Policies are evaluated at runtime (not compile-time)
- Policies are per-runtime (not per-agent)
- Token counting is only accurate for LLM calls that return token usage

## Next Steps

- Understand execution records: [Execution Records](execution-records.md)
- Master replay and mismatch detection: [Replay Engine](replay.md)
- Integrate with your framework: [Integrations](../integrations.md)
