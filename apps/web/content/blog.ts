export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  readTime: string;
  content: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "debugging-agent-loops",
    title: "Debugging agent loops: why they happen and how to stop them",
    description:
      "Production agents can loop indefinitely when they fail to converge. We break down common patterns and show how runtime policies halt them before cost or reliability impact.",
    date: "2026-03-05",
    author: "Paprika Team",
    readTime: "5 min read",
    content: `
## The looping problem

When an LLM-based agent encounters a task it can't resolve, it often falls into a loop — repeating the same reasoning or tool-calling pattern without making progress. This is one of the most common failure modes in production agent systems.

### Why agents loop

There are several root causes:

1. **Ambiguous instructions** — The agent receives conflicting signals from its prompt and tool outputs, causing it to retry the same approach.
2. **Tool failures** — When a tool returns an error, the agent may retry with identical inputs, hoping for a different result.
3. **Context window overflow** — As the conversation grows, earlier context gets truncated, and the agent "forgets" it already tried a particular approach.
4. **Missing termination conditions** — Without explicit stop criteria, the agent will continue executing until an external timeout kills it.

### The cost of loops

An undetected loop can consume thousands of tokens in minutes. At scale, this translates to significant cost — and the failure is often invisible until someone notices the bill.

### How Paprika helps

Paprika provides two policies that directly address looping:

- **max_steps**: A hard cap on the total number of LLM and tool calls. When exceeded, execution halts with a PolicyViolationError.
- **max_repeat_hashes**: Detects when the same normalized input is sent to an LLM or tool repeatedly. After the threshold is exceeded, execution stops.

Both policies are configured at runtime and enforced proactively — the agent is stopped *before* it causes damage, not after.

### Example

\`\`\`python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,
        max_repeat_hashes=3,
    )
)
\`\`\`

With these settings, Paprika will halt any agent that exceeds 20 steps or repeats the same input more than 3 times. The violation is recorded in the trace for later inspection.
    `,
  },
  {
    slug: "why-deterministic-replay-matters",
    title: "Why deterministic replay matters for AI agents",
    description:
      "When a production agent fails, you need exact reproduction. Deterministic replay makes this possible without re-running live APIs or burning tokens.",
    date: "2026-03-01",
    author: "Paprika Team",
    readTime: "4 min read",
    content: `
## The reproducibility problem

Traditional software bugs are reproducible. You can set up the same inputs, run the same code, and get the same failure. AI agents break this model — their behavior depends on model responses that may vary between calls, even with identical inputs.

### What deterministic replay gives you

Paprika's replay engine lets you re-execute a prior agent run using the exact outputs that were recorded during the original execution:

- **LLM calls** return the cached response from the trace instead of hitting the live API.
- **Tool calls** return cached results instead of executing the actual tool.
- **No side effects** — replay never modifies external state.

### When replay is useful

1. **Debugging failures** — Replay the exact execution path that led to an error, step by step.
2. **Regression testing** — Verify that code changes don't alter agent behavior for known inputs.
3. **Cost-free iteration** — Experiment with different post-processing logic without burning tokens.
4. **Team collaboration** — Share a trace file with a colleague and they can replay it locally.

### Mismatch detection

If your agent code has changed since the original run, the replay engine detects this. When the current execution would make a call with different inputs than what's recorded in the trace, Paprika raises a ReplayMismatchError with the expected vs actual step information.

### Example

\`\`\`python
# Original run
result = my_agent("process this data")

# Later — replay without live calls
result = runtime.replay(run_id="abc-123")
\`\`\`

The replayed result is identical to the original, and no external APIs are called.
    `,
  },
  {
    slug: "runtime-safety-for-llm-agents",
    title: "Runtime safety for LLM agents: beyond guardrails",
    description:
      "Guardrails filter outputs; runtime safety controls execution. Why both matter for production agents — and how execution control fits the stack.",
    date: "2026-02-25",
    author: "Paprika Team",
    readTime: "6 min read",
    content: `
## Guardrails vs. runtime control

The AI safety ecosystem has focused heavily on guardrails — systems that filter, classify, or modify LLM outputs before they reach users. Guardrails are important, but they only address one dimension of agent safety.

### The execution dimension

Agent failures aren't just about *what* the model says — they're about *what the agent does*. An agent can:

- Make 50 API calls in a loop
- Spend $20 in tokens in 30 seconds
- Call the same tool with identical inputs repeatedly
- Execute a completely different path on retry

None of these problems are solved by output filtering. They require **execution control** — the ability to inspect, limit, and reproduce what an agent does at runtime.

### Paprika's approach

Paprika operates at the execution layer, not the output layer. It provides:

1. **Traces** — Every step is recorded with timestamps, token counts, and input hashes.
2. **Policies** — Hard limits on steps, tokens, and repeated inputs that halt execution proactively.
3. **Replay** — Exact reproduction of prior runs using cached outputs, with mismatch detection.

### The layered model

The most robust agent systems will use multiple layers:

| Layer | Purpose | Example |
|-------|---------|---------|
| Output guardrails | Filter harmful content | Llama Guard, NeMo |
| Execution control | Limit and trace behavior | Paprika |
| Observability | Monitor and alert | Langfuse, Arize |
| Evaluation | Measure quality | RAGAS, DeepEval |

Paprika fills the execution control layer — complementing, not replacing, the other layers.

### Getting started

\`\`\`python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,
        max_tokens=15000,
        max_repeat_hashes=3,
    )
)
\`\`\`

With three lines of configuration, your agent runs become traceable, policy-enforced, and replayable.
    `,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return blogPosts.find((post) => post.slug === slug);
}
