import { Metadata } from "next";
import Link from "next/link";
import {
  Layers,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  Terminal,
  FileJson,
  Gauge,
  GitCompare,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/marketing/section";
import { CodeBlock } from "@/components/marketing/code-block";

const DEMO_URL = "https://cal.com/vaibhavhariram/30min";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Execution control infrastructure for AI agents: traceability, policy enforcement, safe replay, and operational workflows.",
};

export default function ProductPage() {
  return (
    <>
      <Section>
        <SectionHeader
          eyebrow="Product"
          title="The execution layer for AI agents."
          description="Paprika is production infrastructure that makes agent execution traceable, governable, and replayable. It wraps your runtime — it doesn't replace it."
        />
      </Section>

      <Section className="bg-muted/30 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            {
              icon: Layers,
              title: "Structured trace capture",
              desc: "Every LLM call and tool invocation is recorded as a typed, audit-ready event. Timestamps, token counts, input hashes, and durations — for every run.",
            },
            {
              icon: ShieldCheck,
              title: "Runtime policy enforcement",
              desc: "Configure max_steps, max_tokens, and max_repeat_hashes. Paprika halts execution with a structured PolicyViolationError before damage is done.",
            },
            {
              icon: RotateCcw,
              title: "Safe deterministic replay",
              desc: "Re-execute any prior run using recorded outputs. LLM and tool calls return cached results. No live APIs, no side effects. Mismatches surface immediately.",
            },
            {
              icon: Terminal,
              title: "Inspection and diffing",
              desc: "List runs, inspect traces step-by-step, diff two runs to see where execution diverged. CLI and API for operational workflows.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <item.icon className="h-5 w-5 text-foreground mb-4" />
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          eyebrow="Platform"
          title="Minimal surface, maximum control."
          description="Wrap your agent in minutes. Paprika injects a context object that traces every LLM and tool call automatically."
        />
        <div className="mt-8 max-w-2xl">
          <CodeBlock
            language="python"
            code={`from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,
        max_tokens=20000,
        max_repeat_hashes=3,
    )
)

@runtime.agent()
def support_agent(ctx, user_input):
    analysis = ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages": [{"role": "user", "content": user_input}]},
    )
    customer = ctx.tools.call(
        name="lookup_customer",
        args={"email": "alice@example.com"},
    )
    return ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages": [
            {"role": "user", "content": f"Summarize: {customer}"}
        ]},
    )`}
          />
        </div>
      </Section>

      <Section className="bg-muted/30">
        <SectionHeader
          eyebrow="Trace format"
          title="Audit-ready execution records."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[
            { icon: FileJson, label: "Structured event format" },
            { icon: Gauge, label: "Token usage per call" },
            { icon: GitCompare, label: "Input hashes for diffing" },
            { icon: Building2, label: "Enterprise audit trail" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Ready to add execution control?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Book a demo to see how teams are using Paprika for production agent
            workflows.
          </p>
          <div className="flex justify-center gap-3 mt-8">
            <Button size="lg" asChild>
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                Book a demo
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/waitlist" className="gap-2">
                Join the waitlist
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
