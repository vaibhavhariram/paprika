# Runtime

The `PaprikaRuntime` is the entry point. It wraps agent execution, records events, enforces policies, and enables replay.

## Basic Setup

```python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=10,
        max_tokens=10000
    )
)
```

The runtime manages:
- Trace storage (default: `~/.paprika/traces/`)
- Policy enforcement
- Agent registration
- Tool registration
- Execution recording

## Agent Registration

Register an agent with the `@runtime.agent()` decorator:

```python
@runtime.agent(name="my_agent")
def my_agent(ctx):
    # ctx is PaprikaContext, injected automatically
    pass
```

The decorator wraps your function to:
- Inject `PaprikaContext` as the first argument
- Record execution start/end
- Enforce policies
- Capture all LLM and tool calls
- Save an `ExecutionRecord`

Your agent function signature must be:

```python
def agent_name(ctx: PaprikaContext, *args, **kwargs) -> Any:
    ...
```

The `ctx` parameter is always first. Additional arguments are passed through.

## Context Injection

Inside your agent function, use the injected `ctx`:

### LLM Calls

```python
response = ctx.llm.call(
    provider="openai",
    model="gpt-4o",
    input={
        "messages": [
            {"role": "user", "content": "Your prompt"}
        ]
    }
)
```

**Keyword arguments:**
- `provider` (str): `"openai"`, `"mock"`, or custom provider
- `model` (str): model identifier
- `input` (dict): full input dict (no argument reconstruction)

The LLM call is **automatically recorded**:
- Input data and input hash
- Output data
- Token usage
- Duration
- Any errors

### Tool Calls

```python
result = ctx.tools.call(
    name="search",
    args={"query": "AI trends"}
)
```

**Keyword arguments:**
- `name` (str): registered tool name
- `args` (dict): tool arguments

The tool call is **automatically recorded**:
- Tool name
- Arguments and input hash
- Output data
- Duration
- Any errors

### Run ID

Access the current run's UUID:

```python
run_id = ctx.run_id
```

## Tool Registration

Register tools before running agents:

```python
def search(query: str) -> str:
    # Your tool implementation
    return f"Results for {query}"

runtime.register_tool("search", search)
```

Tools can be:
- Simple Python functions
- Async functions
- Classes with `__call__`
- Any callable

The tool is **automatically recorded** when called via `ctx.tools.call()`.

## Running Agents

Two ways to run an agent:

### Method 1: Call the decorated function

```python
result = my_agent({})  # Returns the agent's return value
```

This works like a normal function. The `@runtime.agent()` decorator injects `ctx` automatically.

### Method 2: Use `runtime.run()`

```python
result = runtime.run(
    agent_name="my_agent",
    input={"some": "data"}
)
```

Both methods:
- Create a new `ExecutionRecord`
- Enforce policies
- Capture all LLM and tool calls
- Save the trace to disk

## Full Example

```python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=10)
)

# Register a tool
def weather(location: str) -> str:
    return f"Sunny in {location}"

runtime.register_tool("weather", weather)

# Define an agent
@runtime.agent(name="weather_agent")
def weather_agent(ctx, location: str) -> str:
    # LLM call
    response = ctx.llm.call(
        provider="mock",
        model="gpt-4o",
        input={
            "messages": [
                {"role": "user", "content": f"What's the weather in {location}?"}
            ]
        }
    )

    # Tool call
    weather_result = ctx.tools.call(
        name="weather",
        args={"location": location}
    )

    return weather_result

# Run the agent
result = weather_agent("San Francisco")
print(result)  # "Sunny in San Francisco"
```

## Auto-Recorded Fields

Paprika automatically records:

**Per LLM call:**
- Provider and model
- Full input dict
- Input hash (for mismatch detection)
- Full output dict
- Token usage (if available)
- Duration
- Errors (if any)

**Per tool call:**
- Tool name
- Full arguments dict
- Input hash (for repeat detection)
- Full output
- Duration
- Errors (if any)

**Per run:**
- Start and end time
- Duration
- Final status (`success`, `error`, `policy_violation`)
- Final output or error message
- Total tokens and step counts
- All policies that fired

No manual instrumentation required beyond using the context.

## What Happens on Error

If your agent raises an exception:

```python
@runtime.agent(name="failing_agent")
def failing_agent(ctx):
    raise ValueError("Something went wrong")

try:
    result = failing_agent()
except ValueError as e:
    # You handle the error
    pass

# The ExecutionRecord is still saved with:
# - execution.status = "error"
# - execution.error = "Something went wrong"
# - All steps recorded up to the error
```

## Limitations

- Agents must be synchronous (async agents coming soon)
- Agents are recorded sequentially (no parallel agent execution)
- Context is per-agent (nested agent calls not yet supported)

## Next Steps

- Understand execution records: [Execution Records](execution-records.md)
- Set policies: [Policies](policies.md)
- Master replay: [Replay Engine](replay.md)
