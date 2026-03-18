# Integrations

Paprika works with any Python agent framework. The integration pattern is universal: wrap the entry point, route LLM calls through context, register tools.

## General Pattern

All integrations follow this pattern:

1. Create a `PaprikaRuntime`
2. Register tools with `runtime.register_tool(name, func)`
3. Wrap your agent execution with `@runtime.agent(name="...")`
4. Route LLM calls through `ctx.llm.call(...)`
5. Route tool calls through `ctx.tools.call(...)`

That's it. No magic, no framework lock-in.

## Vanilla Python

Full example: a multi-step research agent.

```python
from paprika import PaprikaRuntime, PolicyConfig

# Create runtime
runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=20, max_tokens=50000)
)

# Register tools
def search(query: str) -> str:
    return f"Results for '{query}': AI is advancing..."

def summarize_tool(text: str) -> str:
    return f"Summary: {text[:100]}..."

runtime.register_tool("search", search)
runtime.register_tool("summarize", summarize_tool)

# Define agent
@runtime.agent(name="researcher")
def researcher(ctx, topic: str):
    # Step 1: LLM generates research question
    response = ctx.llm.call(
        provider="openai",
        model="gpt-4o",
        input={
            "messages": [
                {
                    "role": "user",
                    "content": f"Generate a research question about {topic}"
                }
            ]
        }
    )
    question = response["choices"][0]["message"]["content"]

    # Step 2: Search for results
    search_result = ctx.tools.call(
        name="search",
        args={"query": question}
    )

    # Step 3: Summarize results
    summary = ctx.tools.call(
        name="summarize",
        args={"text": search_result}
    )

    return {
        "question": question,
        "results": search_result,
        "summary": summary
    }

# Run the agent
if __name__ == "__main__":
    result = researcher("machine learning")
    print(result)
```

## LangGraph

Wrap a LangGraph graph execution and route LLM calls through context.

```python
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from paprika import PaprikaRuntime

# Set up Paprika
runtime = PaprikaRuntime()

# Define tool
def search(query: str) -> str:
    return f"Search results for {query}"

runtime.register_tool("search", search)

# Define LangGraph nodes
def node_generate_question(state):
    response = state["ctx"].llm.call(
        provider="openai",
        model="gpt-4o",
        input={
            "messages": [
                {"role": "user", "content": "Generate a question about AI"}
            ]
        }
    )
    state["question"] = response["choices"][0]["message"]["content"]
    return state

def node_search(state):
    result = state["ctx"].tools.call(
        name="search",
        args={"query": state["question"]}
    )
    state["search_result"] = result
    return state

# Build graph
graph_builder = StateGraph(dict)
graph_builder.add_node("generate", node_generate_question)
graph_builder.add_node("search", node_search)
graph_builder.add_edge(START, "generate")
graph_builder.add_edge("generate", "search")
graph_builder.add_edge("search", END)
graph = graph_builder.compile()

# Wrap graph execution with Paprika agent
@runtime.agent(name="langgraph_agent")
def run_graph(ctx):
    initial_state = {"ctx": ctx}
    result = graph.invoke(initial_state)
    return result

# Run
if __name__ == "__main__":
    result = run_graph()
    print(result)
```

**Key:** Pass `ctx` into the graph state so nodes can access it. Route all LLM calls and tool calls through `ctx.llm.call()` and `ctx.tools.call()`.

## CrewAI

Wrap crew execution and route decisions through Paprika context.

```python
from crewai import Agent, Task, Crew
from paprika import PaprikaRuntime, PolicyConfig

# Set up Paprika
runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=30)
)

# Register tools
from crewai_tools import SerperDevTool
search_tool = SerperDevTool()
runtime.register_tool("search", lambda query: search_tool.run(query))

@runtime.agent(name="crew_researcher")
def research_crew(ctx):
    def crew_search(query: str):
        return ctx.tools.call(name="search", args={"query": query})

    result = crew_search("latest AI trends")
    return result

# Run
if __name__ == "__main__":
    result = research_crew()
    print(result)
```

**Note:** CrewAI does not expose agent internals for context injection. Integration requires wrapping CrewAI's LLM calls via monkey-patching, logging trajectory post-execution, or using a custom LLM provider. This is pattern-level integration, not deep integration.

## AutoGen

Wrap agent conversations and route through Paprika.

```python
from autogen import AssistantAgent, UserProxyAgent
from paprika import PaprikaRuntime

runtime = PaprikaRuntime()

assistant = AssistantAgent(name="assistant", llm_config={"model": "gpt-4o"})
user_proxy = UserProxyAgent(name="user", human_input_mode="NEVER")

@runtime.agent(name="autogen_chat")
def run_autogen(ctx, task: str):
    user_proxy.initiate_chat(
        assistant,
        message=task,
        max_consecutive_auto_reply=5
    )

    messages = user_proxy.chat_messages[assistant]
    return {
        "messages": messages,
        "status": "completed"
    }

# Run
if __name__ == "__main__":
    result = run_autogen(ctx=None, task="Research AI trends")
    print(result)
```

**Note:** Like CrewAI, AutoGen does not expose internal LLM calls. Integration is pattern-level: wrap execution, log trajectory post-execution.

## Integration Maturity

| Framework | Type | Maturity | Notes |
|-----------|------|----------|-------|
| Vanilla Python | Deep (context injection) | Production | Full step-by-step recording |
| LangGraph | Deep (state-based injection) | Production | Pass context in state |
| CrewAI | Pattern-level | Experimental | Wrapping/logging only |
| AutoGen | Pattern-level | Experimental | Wrapping/logging only |

**Deep integration:** Paprika context used directly, full recording.
**Pattern-level integration:** Entry point wrapped, trajectory logged.

## Custom Frameworks

For any agent framework:

1. **Route LLM calls:**
   ```python
   response = ctx.llm.call(
       provider="openai",
       model="gpt-4o",
       input={...}
   )
   ```

2. **Route tool calls:**
   ```python
   result = ctx.tools.call(
       name="tool_name",
       args={...}
   )
   ```

3. **Wrap entry point:**
   ```python
   @runtime.agent(name="my_agent")
   def my_agent(ctx):
       # ... your framework logic ...
       pass
   ```

## Next Steps

- Set up runtime policies: [Policies](core-concepts/policies.md)
- Understand execution records: [Execution Records](core-concepts/execution-records.md)
- Master replay: [Replay Engine](core-concepts/replay.md)
