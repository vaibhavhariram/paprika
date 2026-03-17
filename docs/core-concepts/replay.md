# Replay Engine

Deterministic replay is Paprika's core differentiator. Re-execute any previous run using recorded outputs instead of making live API calls. No external side effects. If behavior diverges, Paprika raises `ReplayMismatchError` with exact step and hash diff.

## What Replay Does

Given an `ExecutionRecord`, replay **re-executes the same agent code** but **returns recorded outputs** instead of calling live LLMs or tools.

```python
# Original run (live API calls)
result = runtime.run(agent_name="researcher", input={})
# → Makes real LLM calls, searches the web, etc.
# → Saves ExecutionRecord with all inputs/outputs

# Replay (no live calls)
result = runtime.replay(run_id="abc123def456")
# → Re-executes the agent code
# → LLM calls return recorded responses
# → Tool calls return recorded results
# → No network, no side effects
```

## Why It Matters

### Safe Failure Reproduction

Production failure? Replay it safely.

**Without replay:** You must re-trigger the failure with live APIs, risking:
- Duplicate email notifications
- Duplicate refunds
- Repeated API charges
- External side effects

**With replay:** You step through the exact execution with zero external impact.

### Regression Detection

Change your agent code? Detect regressions.

**Without replay:** You run tests against your new code. But are the test outcomes the same as before? Hard to know if subtle behavior changed.

**With replay:** Replay your production traces against new code. If inputs diverge at any step, Paprika raises `ReplayMismatchError`. You've caught the regression before shipping.

### Behavioral Confidence

"Did I break something?"

→ Replay old traces against new code. If there are no mismatches, behavior is identical. If there are mismatches, you know exactly which step and why.

## How It Works

### Under the Hood

When you call `runtime.replay(run_id="abc123def456")`:

1. **Load the ExecutionRecord** from disk
2. **Extract recorded outputs** from each step
3. **Build stub maps:**
   - `_llm_stubs[step_index]` → cached LLM outputs
   - `_tool_stubs[step_index]` → cached tool results
   - `_llm_hashes[step_index]` → original input hashes
   - `_tool_hashes[step_index]` → original input hashes
4. **Re-execute the agent code:**
   - When `ctx.llm.call(...)` is invoked, return the cached output from `_llm_stubs`
   - When `ctx.tools.call(...)` is invoked, return the cached result from `_tool_stubs`
   - **Recompute the input hash** at each step
5. **Compare hashes:**
   - If recomputed hash matches original → ✓ step continues
   - If recomputed hash differs from original → ✗ `ReplayMismatchError`

### Input Hash Recomputation

During replay, Paprika recomputes input hashes at each step.

**Original run (step 0):**
```python
# Agent code
response = ctx.llm.call(
    provider="openai",
    model="gpt-4o",
    input={"messages": [{"role": "user", "content": "What is AI?"}]}
)
# → Input hash: a1b2c3d4e5f6g7h8
# → Recorded in ExecutionRecord
```

**Replay (step 0):**
```python
# Same agent code
response = ctx.llm.call(
    provider="openai",
    model="gpt-4o",
    input={"messages": [{"role": "user", "content": "What is AI?"}]}
)
# → Paprika recomputes hash: a1b2c3d4e5f6g7h8
# → Matches original hash → ✓ continue
# → Return cached output (no live API call)
```

If the agent code changed:

```python
# Changed code
response = ctx.llm.call(
    provider="openai",
    model="gpt-4o",
    input={"messages": [{"role": "user", "content": "What is Machine Learning?"}]}  # ← Different!
)
# → Paprika recomputes hash: y9z0a1b2c3d4e5f6  (different!)
# → Does NOT match original: a1b2c3d4e5f6g7h8
# → Raise ReplayMismatchError
```

## Side-Effect Safety

Replay **disables live API calls** and **disables real tool execution**. This prevents:

- ✗ Duplicate LLM API calls (no billing)
- ✗ Duplicate emails sent by tools
- ✗ Duplicate database mutations
- ✗ Duplicate external API calls
- ✗ Any side effects

All `ctx.llm.call()` and `ctx.tools.call()` return recorded, cached results.

## Mismatch Detection

If the replayed agent produces a **different input hash** at any step, Paprika raises `ReplayMismatchError`.

**Error format:**

```python
from paprika import ReplayMismatchError

try:
    result = runtime.replay(run_id="abc123def456")
except ReplayMismatchError as e:
    print(e.step_index)      # 0 (which step)
    print(e.expected)        # "a1b2c3d4e5f6g7h8" (original hash)
    print(e.actual)          # "y9z0a1b2c3d4e5f6" (new hash)
    print(str(e))            # "Replay mismatch at step 0: expected a1b2c3d4e5f6g7h8, got y9z0a1b2c3d4e5f6"
```

### Why Mismatches Happen

- **Code change** — you changed the LLM prompt or tool arguments
- **Logic change** — you changed which tools are called or in what order
- **Conditional change** — you changed an if/else that affects execution flow
- **Anything that changes inputs** — code change → input change → hash change

### What Mismatches Mean

A mismatch means: **the agent's behavior changed at this step.**

This is exactly what you want to catch before shipping. It tells you:
- "You changed the code"
- "The change affects agent behavior"
- "Here's the exact step where it diverges"

## Full Workflow Example

### 1. Original Run

```python
@runtime.agent(name="researcher")
def researcher(ctx):
    response = ctx.llm.call(
        provider="openai",
        model="gpt-4o",
        input={"messages": [{"role": "user", "content": "What is AI?"}]}
    )
    return response.get("choices", [{}])[0].get("message", {}).get("content", "")

result = runtime.run("researcher", {})
# → Saves ExecutionRecord with record_id "abc123def456"
# → LLM returns: "AI is artificial intelligence"
# → Input hash at step 0: a1b2c3d4e5f6g7h8
```

### 2. Code Change

```python
@runtime.agent(name="researcher")
def researcher(ctx):
    response = ctx.llm.call(
        provider="openai",
        model="gpt-4o",
        input={"messages": [{"role": "user", "content": "What is Machine Learning?"}]}  # ← CHANGED
    )
    return response.get("choices", [{}])[0].get("message", {}).get("content", "")
```

### 3. Replay Against Old Trace

```python
try:
    result = runtime.replay(run_id="abc123def456")
except ReplayMismatchError as e:
    print(f"Mismatch at step {e.step_index}")
    print(f"Expected: {e.expected}")
    print(f"Actual: {e.actual}")
    # Output:
    # Mismatch at step 0
    # Expected: a1b2c3d4e5f6g7h8
    # Actual: y9z0a1b2c3d4e5f6
```

### 4. Interpret

Paprika caught the change. The prompt changed → the input hash changed → the behavioral change was detected.

You know **before shipping** that this code change affects agent behavior.

## Diffing Two Runs

Compare original and replayed runs:

```bash
paprika runs diff abc123def456 xyz789abc123
```

Output:
```
Step 0 (llm_call): MISMATCH
  Expected hash: a1b2c3d4e5f6g7h8
  Actual hash: y9z0a1b2c3d4e5f6
  Provider: openai
  Model: gpt-4o

Step 1 (tool_call): MATCH
  Hash: i9j0k1l2m3n4o5p6
  Tool: search

Step 2 (llm_call): MATCH
  Hash: q7r8s9t0u1v2w3x4
```

The diff shows which steps changed.

## Connecting Runs

Replayed runs are marked with `replay_of` field in the ExecutionRecord:

```json
{
  "record_id": "xyz789abc123",
  "replay_of": "abc123def456",  // ← Original run
  ...
}
```

This links the replay back to its original. Useful for tracking:
- "Which run was this a replay of?"
- "Did we find a mismatch when we replayed?"

## Workflow: Regression Testing

1. Run your agent in production
   ```
   ExecutionRecord saved: abc123def456
   ```

2. Change your code (bug fix, prompt change, logic update)

3. Replay all production traces
   ```python
   for run_summary in runtime.trace_store.list_runs(limit=100):
       try:
           runtime.replay(run_id=run_summary.run_id)
           print(f"✓ {run_summary.run_id}: no mismatch")
       except ReplayMismatchError as e:
           print(f"✗ {run_summary.run_id}: mismatch at step {e.step_index}")
   ```

4. If there are mismatches, investigate:
   - Is the behavioral change intentional?
   - If not, revert the code change
   - If yes, document the intentional change and move forward

This is behavioral regression testing.

## Current Limitations

- **No batch replay yet** — replay one run at a time (manual loop for batch)
- **No counterfactual patching yet** — can't modify individual steps before replaying
- **Replay is deterministic but not live** — no A/B testing against live models
- **Only deterministic replay** — future: interactive debugging with stepper

## Next Steps

- Set runtime policies: [Policies](policies.md)
- Inspect ExecutionRecords: [Execution Records](execution-records.md)
- Integrate with your framework: [Integrations](../integrations.md)
- Use CLI to manage runs: [CLI](../cli.md)
