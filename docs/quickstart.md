# Quickstart

Get from zero to "I understand replay mismatch detection" in 15 minutes.

## 1. Install

```bash
pip install paprika
```

Requires Python 3.11+.

## 2. Create a Multi-Step Agent

This agent researches a topic by making an LLM call and a tool call.

Create `agent.py`:

```python
from paprika import PaprikaRuntime, PolicyConfig, PolicyViolationError, ReplayMismatchError

# Create runtime with policies
runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=10,
        max_tokens=10000,
        max_repeat_hashes=3
    )
)

# Register a tool
def search(query: str) -> str:
    """Mock search tool—returns a canned result."""
    return f"Search results for '{query}': AI is advancing rapidly."

runtime.register_tool("search", search)

# Define an agent
@runtime.agent(name="researcher")
def researcher(ctx):
    """Research agent: asks LLM a question, then searches for context."""

    # Step 1: Ask LLM for a research question
    llm_response = ctx.llm.call(
        provider="mock",
        model="gpt-4o",
        input={
            "messages": [
                {
                    "role": "user",
                    "content": "Generate a research question about AI trends"
                }
            ]
        }
    )
    question = llm_response.get("choices", [{}])[0].get("message", {}).get("content", "What is AI?")
    print(f"Generated question: {question}")

    # Step 2: Use a tool to search
    search_result = ctx.tools.call(
        name="search",
        args={"query": question}
    )
    print(f"Search result: {search_result}")

    # Step 3: Summarize with LLM
    summary = ctx.llm.call(
        provider="mock",
        model="gpt-4o",
        input={
            "messages": [
                {
                    "role": "user",
                    "content": f"Summarize: {search_result}"
                }
            ]
        }
    )
    summary_text = summary.get("choices", [{}])[0].get("message", {}).get("content", "No summary")

    return {
        "question": question,
        "search_result": search_result,
        "summary": summary_text
    }

# Mock provider setup (for deterministic examples without API keys)
runtime.trace_store.base_dir.mkdir(parents=True, exist_ok=True)

if __name__ == "__main__":
    # Run the agent
    try:
        result = runtime.run(
            agent_name="researcher",
            input={}
        )
        print("\n✓ Agent run completed successfully")
        print(f"Result: {result}")
    except PolicyViolationError as e:
        print(f"\n✗ Policy violation: {e.policy_name}")
        print(f"  {e.details}")
    except Exception as e:
        print(f"\n✗ Error: {e}")
```

For this quickstart, we're using `provider="mock"` so the agent returns canned responses and doesn't need live API keys. The example is fully deterministic.

Run it:

```bash
python agent.py
```

Output:
```
Generated question: What is the latest trend in AI research?
Search result: Search results for 'What is the latest trend in AI research?': AI is advancing rapidly.
✓ Agent run completed successfully
Result: {'question': 'What is the latest trend in AI research?', 'search_result': "Search results for 'What is the latest trend in AI research?': AI is advancing rapidly.", 'summary': 'No summary'}
```

## 3. Inspect the Trace

List recent runs:

```bash
paprika runs list
```

Output:
```
Run ID                                    Agent      Started              Status    Steps
───────────────────────────────────────────────────────────────────────────────────────
abc123def456                              researcher 2024-01-15 14:32:10  success   3
```

Inspect the full trace:

```bash
paprika runs inspect abc123def456
```

Output (condensed):
```
Record ID: abc123def456
Agent: researcher
Started: 2024-01-15 14:32:10 UTC
Ended: 2024-01-15 14:32:10 UTC
Duration: 125ms
Status: success
Total tokens: 0
Steps: 3

Step 0: llm_call (gpt-4o)
  Provider: mock
  Model: gpt-4o
  Input hash: a1b2c3d4e5f6g7h8
  Tokens: 0
  Duration: 10ms

Step 1: tool_call (search)
  Tool: search
  Input hash: i9j0k1l2m3n4o5p6
  Duration: 5ms

Step 2: llm_call (gpt-4o)
  Provider: mock
  Model: gpt-4o
  Input hash: q7r8s9t0u1v2w3x4
  Tokens: 0
  Duration: 10ms
```

The trace includes every step, input hash, duration, and tokens consumed.

## 4. Replay the Run

Replay uses recorded outputs. No live APIs are called.

In Python:

```python
from paprika import PaprikaRuntime

runtime = PaprikaRuntime()

# Define the same agent (unchanged code)
@runtime.agent(name="researcher")
def researcher(ctx):
    # ... same code as before ...
    pass

runtime.register_tool("search", search)

# Replay the original run
original_run_id = "abc123def456"
result = runtime.replay(run_id=original_run_id)
print(f"Replayed result: {result}")
```

The `ctx.llm.call()` and `ctx.tools.call()` return cached outputs from the original run. No network calls are made. No side effects occur.

## 5. See a Mismatch

Now change the agent code slightly:

```python
@runtime.agent(name="researcher")
def researcher(ctx):
    """CHANGED: different search query"""

    llm_response = ctx.llm.call(
        provider="mock",
        model="gpt-4o",
        input={
            "messages": [
                {
                    "role": "user",
                    "content": "Generate a research question about LLMs"  # ← CHANGED
                }
            ]
        }
    )
    # ... rest unchanged ...
```

The first LLM call now has a different input. When you replay against the old trace:

```python
try:
    result = runtime.replay(run_id="abc123def456")
except ReplayMismatchError as e:
    print(f"Mismatch at step {e.step_index}")
    print(f"Expected hash: {e.expected}")
    print(f"Actual hash: {e.actual}")
```

Output:
```
Mismatch at step 0
Expected hash: a1b2c3d4e5f6g7h8
Actual hash: y9z0a1b2c3d4e5f6
```

This is the core differentiator: **Paprika detects behavioral changes.** You changed the prompt → the input hash changed → Paprika caught it.

This is how you validate that code changes don't break agent behavior, before shipping.

## 6. Diff Two Runs

You have:
- Original run: `abc123def456` (with original prompt)
- Replayed run: `xyz789abc123` (with changed code)

Compare them:

```bash
paprika runs diff abc123def456 xyz789abc123
```

Output:
```
Step 0 (llm_call): MISMATCH
  Expected hash: a1b2c3d4e5f6g7h8
  Actual hash: y9z0a1b2c3d4e5f6

Step 1 (tool_call): MATCH
  Hash: i9j0k1l2m3n4o5p6

Step 2 (llm_call): MATCH
  Hash: q7r8s9t0u1v2w3x4
```

The diff shows exactly where the two runs diverged.

## 7. Next Steps

You now understand:
- ✓ How to write and run an agent with Paprika
- ✓ How to inspect a trace
- ✓ How to replay safely
- ✓ How mismatch detection catches behavior changes

**Next topics:**
- Set runtime policies to prevent runaway execution: [Policies](core-concepts/policies.md)
- Understand execution records in detail: [Execution Records](core-concepts/execution-records.md)
- Master replay and mismatch detection: [Replay Engine](core-concepts/replay.md)
- Integrate with your framework: [Integrations](integrations.md)
- Use the CLI and browser UI: [CLI](cli.md), [UI](ui.md)
