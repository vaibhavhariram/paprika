import { Metadata } from "next";
import { CodeBlock } from "@/components/marketing/code-block";

export const metadata: Metadata = {
  title: "Integrations — Paprika Docs",
  description: "Use Paprika with LangGraph, CrewAI, AutoGen, or custom agent stacks.",
};

export default function IntegrationsPage() {
  return (
    <div>
      <h1 className="text-3xl tracking-tight mb-4">Integrations</h1>
      <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
        Paprika is platform-agnostic. It wraps execution at the runtime level,
        so it works with any agent framework or custom stack.
      </p>

      <div className="space-y-12">
        {/* Vanilla Python */}
        <div>
          <h2 className="text-xl mb-3">Vanilla Python</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The simplest integration. Wrap any Python function that orchestrates
            LLM and tool calls:
          </p>
          <CodeBlock
            language="python"
            code={`from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=20)
)

runtime.register_tool("search", my_search_function)

@runtime.agent()
def research_agent(ctx, query):
    results = ctx.tools.call(
        name="search", args={"q": query}
    )
    summary = ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages": [
            {"role": "user", "content": f"Summarize: {results}"}
        ]},
    )
    return summary`}
          />
        </div>

        {/* LangGraph */}
        <div>
          <h2 className="text-xl mb-3">LangGraph</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Wrap your LangGraph entry point to get trace capture and policy enforcement
            around the entire graph execution:
          </p>
          <CodeBlock
            language="python"
            code={`from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=50, max_tokens=30000)
)

@runtime.agent(name="langgraph_agent")
def run_graph(ctx, user_input):
    # Use ctx.llm.call() inside your graph nodes
    # for traced, policy-enforced LLM calls
    result = ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages": [
            {"role": "user", "content": user_input}
        ]},
    )
    return result`}
          />
        </div>

        {/* CrewAI */}
        <div>
          <h2 className="text-xl mb-3">CrewAI</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Wrap your CrewAI crew execution for trace capture and budget control:
          </p>
          <CodeBlock
            language="python"
            code={`from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=30, max_tokens=25000)
)

@runtime.agent(name="crew_agent")
def run_crew(ctx, task_description):
    # Route LLM calls through ctx.llm.call()
    # Register crew tools with runtime.register_tool()
    plan = ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages": [
            {"role": "user", "content": task_description}
        ]},
    )
    return plan`}
          />
        </div>

        {/* General guidance */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-2">Integration pattern</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The general pattern is the same for all frameworks: wrap your agent&apos;s
            entry point with <code className="font-mono bg-muted px-1 py-0.5 rounded">@runtime.agent()</code>,
            route LLM calls through <code className="font-mono bg-muted px-1 py-0.5 rounded">ctx.llm.call()</code>,
            and register tools with <code className="font-mono bg-muted px-1 py-0.5 rounded">runtime.register_tool()</code>.
            Paprika records everything and enforces policies transparently.
          </p>
        </div>
      </div>
    </div>
  );
}
