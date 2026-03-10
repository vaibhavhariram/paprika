import { Metadata } from "next";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "Quickstart — Paprika Docs",
  description: "Add execution control to your agent stack in under 5 minutes.",
};

export default function QuickstartPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight mb-4">Quickstart</h1>
      <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
        Add Paprika to your agent runtime in minutes. This guide covers
        installation, your first traced agent, and inspecting the results.
      </p>

      <div className="space-y-10">
        {/* Step 1 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">1. Install Paprika</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Paprika requires Python 3.11+. Install it with pip or uv:
          </p>
          <CodeBlock language="bash" code="pip install paprika" />
          <p className="text-xs text-muted-foreground mt-2">
            Or with uv: <code className="font-mono bg-muted px-1 py-0.5 rounded">uv add paprika</code>
          </p>
        </div>

        {/* Step 2 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">2. Write your first agent</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create a file called <code className="font-mono bg-muted px-1 py-0.5 rounded">agent.py</code>:
          </p>
          <CodeBlock
            language="python"
            code={`from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=10,
        max_tokens=10000,
    )
)

# Register a simple tool
runtime.register_tool(
    "greet",
    lambda name: f"Hello, {name}!"
)

@runtime.agent()
def my_agent(ctx, name):
    greeting = ctx.tools.call(
        name="greet",
        args={"name": name},
    )
    return greeting

# Run the agent
result = my_agent("world")
print(result)  # Hello, world!`}
          />
        </div>

        {/* Step 3 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">3. Run it</h2>
          <CodeBlock language="bash" code="python agent.py" />
          <p className="text-sm text-muted-foreground mt-4">
            Paprika records a structured trace for each run. Default storage is <code className="font-mono bg-muted px-1 py-0.5 rounded">~/.paprika/traces/</code> (configurable).
          </p>
        </div>

        {/* Step 4 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">4. Inspect the trace</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Use the Paprika CLI to view your runs:
          </p>
          <CodeBlock
            language="bash"
            code={`# List recent runs
paprika runs list

# Inspect a specific run
paprika runs inspect <run-id>

# Compare two runs
paprika runs diff <run-id-a> <run-id-b>`}
          />
        </div>

        {/* Step 5 */}
        <div>
          <h2 className="text-xl font-semibold mb-3">5. Replay a run</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Replay a previous run without making any live calls:
          </p>
          <CodeBlock
            language="python"
            code={`# Replay uses recorded outputs — no live API calls
result = runtime.replay(run_id="<run-id>")`}
          />
          <p className="text-sm text-muted-foreground mt-4">
            During replay, all LLM and tool calls return cached results.
            If the execution path diverges from the original trace,
            Paprika raises a <code className="font-mono bg-muted px-1 py-0.5 rounded">ReplayMismatchError</code>.
          </p>
        </div>

        {/* Next steps */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold mb-2">Next steps</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              • Configure <code className="font-mono bg-muted px-1 py-0.5 rounded">max_repeat_hashes</code> to detect looping agents
            </li>
            <li>
              • Explore the <code className="font-mono bg-muted px-1 py-0.5 rounded">paprika runs diff</code> command for comparing runs
            </li>
            <li>
              • Check the integration guide for using Paprika with frameworks
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
