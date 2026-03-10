"use client";

import Link from "next/link";
import {
  ArrowRight,
  Github,
  RotateCcw,
  ShieldCheck,
  Layers,
  Activity,
  Zap,
  Bug,
  Repeat,
  DollarSign,
  Search,
  Lock,
  Eye,
  Code2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Section, SectionHeader } from "@/components/section";
import { FadeIn, Stagger } from "@/components/motion";
import { Typewriter } from "@/components/typewriter";
import { CodeBlock } from "@/components/code-block";

export default function Home() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accent/50 via-background to-background" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 pt-28 pb-20 sm:pt-36 sm:pb-28">
          <FadeIn className="flex flex-col items-center text-center">
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <Badge variant="outline">Production control</Badge>
              <Badge variant="outline">Runtime governance</Badge>
              <Badge variant="outline">Audit-ready traces</Badge>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight max-w-4xl text-balance leading-[1.08] min-h-[1.2em]">
              <Typewriter text="Control AI agents in production." speed={40} />
            </h1>

            <FadeIn delay={1.6} className="max-w-2xl mt-6">
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                The execution layer for reliable AI agents. Trace every run,
                enforce runtime policies, and replay safely&nbsp;&mdash; so you can
                ship agents with operational confidence.
              </p>
            </FadeIn>

            <FadeIn delay={2.0} className="flex flex-wrap items-center justify-center gap-4 mt-10">
              <Button size="lg" asChild>
                <Link href="/contact" className="gap-2">
                  Book a Demo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs/quickstart" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <a
                  href="https://github.com/vaibhavhariram/paprika"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2 text-muted-foreground"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
            </FadeIn>
          </FadeIn>

          {/* Before / After demo card */}
          <FadeIn delay={2.4} className="mt-20 max-w-3xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-4">
                  Without execution control
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Repeat className="h-4 w-4 mt-0.5 text-red-400/70 shrink-0" />
                    Looped 14 times before timeout
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 mt-0.5 text-red-400/70 shrink-0" />
                    38k tokens consumed
                  </li>
                  <li className="flex items-start gap-2">
                    <Bug className="h-4 w-4 mt-0.5 text-red-400/70 shrink-0" />
                    Duplicate tool calls undetected
                  </li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-card p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-4">
                  With Paprika
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-400/70 shrink-0" />
                    Halted at step 6 by policy
                  </li>
                  <li className="flex items-start gap-2">
                    <RotateCcw className="h-4 w-4 mt-0.5 text-emerald-400/70 shrink-0" />
                    Replayed safely without side effects
                  </li>
                  <li className="flex items-start gap-2">
                    <Search className="h-4 w-4 mt-0.5 text-emerald-400/70 shrink-0" />
                    Root cause isolated in trace
                  </li>
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── Problem ── */}
      <Section>
        <FadeIn>
          <SectionHeader
            eyebrow="The problem"
            title="AI agents break production trust."
            description="Probabilistic systems need deterministic control. Without execution governance, failures are invisible, costly, and unreproducible."
          />
        </FadeIn>
        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
          {[
            {
              icon: Repeat,
              title: "Infinite loops",
              desc: "Agents repeat without termination, burning compute and burning budgets.",
            },
            {
              icon: DollarSign,
              title: "Runaway costs",
              desc: "Unchecked LLM calls accumulate with no budget enforcement.",
            },
            {
              icon: Bug,
              title: "Duplicate side effects",
              desc: "Same tool called twice with identical inputs — redundant and risky.",
            },
            {
              icon: Search,
              title: "Unreproducible failures",
              desc: "No structured trace to replay, audit, or diagnose when things break.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <item.icon className="h-5 w-5 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </Stagger>
      </Section>

      {/* ── How It Works ── */}
      <Section className="bg-muted/30">
        <FadeIn>
          <SectionHeader
            eyebrow="How it works"
            title="Three layers of execution control."
          />
        </FadeIn>
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            {
              icon: Layers,
              title: "Capture execution traces",
              desc: "Every LLM call and tool invocation is recorded as a structured, audit-ready event with timestamps, token usage, and input hashes.",
            },
            {
              icon: ShieldCheck,
              title: "Enforce runtime policies",
              desc: "Set hard limits on steps, tokens, and repeated inputs. Paprika halts execution before damage is done.",
            },
            {
              icon: RotateCcw,
              title: "Replay runs safely",
              desc: "Re-execute any prior run using recorded outputs. No live APIs, no side effects. Mismatches surface immediately.",
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
        </Stagger>
      </Section>

      {/* ── What Makes Paprika Different ── */}
      <Section>
        <FadeIn>
          <SectionHeader
            eyebrow="Why Paprika"
            title="Built differently."
          />
        </FadeIn>
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {[
            {
              icon: ShieldCheck,
              title: "Enforcement at runtime",
              desc: "Limits are enforced in the execution path, not after the fact. Incidents are prevented, not detected.",
            },
            {
              icon: RotateCcw,
              title: "Safe replay",
              desc: "Re-run any execution with recorded outputs. Debug, audit, and validate without hitting live APIs.",
            },
            {
              icon: Code2,
              title: "Platform-agnostic",
              desc: "Wraps execution, not frameworks. Works with LangGraph, CrewAI, AutoGen, or custom agent stacks.",
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
        </Stagger>
      </Section>

      {/* ── Inside the Runtime ── */}
      <Section className="bg-muted/30">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <SectionHeader
              eyebrow="Platform architecture"
              title="An execution layer, not a framework."
              description="Paprika wraps your agent runtime to record traces, enforce policies, and enable replay. Minimal surface, maximum control."
            />
            <ul className="mt-6 space-y-3">
              {[
                "Decorator-based agent registration",
                "Context-injected LLM and tool adapters",
                "Structured traces for audit and debugging",
                "CLI and API for inspection and diffing",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Zap className="h-3.5 w-3.5 text-foreground shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn delay={0.2}>
            <CodeBlock
              language="python"
              code={`from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(max_steps=20)
)

@runtime.agent()
def agent(ctx, prompt):
    result = ctx.llm.call(
        provider="openai",
        model="gpt-4.1-mini",
        input={"messages": [
            {"role": "user", "content": prompt}
        ]},
    )
    return result`}
            />
          </FadeIn>
        </div>
      </Section>

      {/* ── Integrations ── */}
      <Section>
        <FadeIn>
          <SectionHeader
            eyebrow="Integrations"
            title="Works with your stack."
            description="Platform-agnostic. Wraps execution at the runtime level — works with any agent framework or custom stack."
            className="text-center mx-auto"
          />
        </FadeIn>
        <Stagger className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 max-w-2xl mx-auto">
          {["LangGraph", "CrewAI", "AutoGen", "Vanilla Python"].map(
            (name) => (
              <div
                key={name}
                className="rounded-lg border border-border bg-card p-4 text-center"
              >
                <p className="text-sm font-medium">{name}</p>
              </div>
            )
          )}
        </Stagger>
      </Section>

      {/* ── Security ── */}
      <Section className="bg-muted/30">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <FadeIn>
            <SectionHeader
              eyebrow="Security"
              title="Built for operational trust."
              description="Every runtime decision is traceable. Every replay is side-effect free. Audit-ready by design."
            />
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                { icon: Eye, label: "Reproducible execution" },
                { icon: Lock, label: "No live calls in replay" },
                { icon: Activity, label: "Transparent runtime" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground"
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" size="sm" asChild>
                <Link href="/security" className="gap-2">
                  Learn more
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="space-y-4 font-mono text-sm text-muted-foreground">
                <div>
                  <span className="text-emerald-400">✓</span> Replay: live APIs blocked
                </div>
                <div>
                  <span className="text-emerald-400">✓</span> Tools: stubbed from trace
                </div>
                <div>
                  <span className="text-emerald-400">✓</span> Mismatch detection
                </div>
                <div>
                  <span className="text-emerald-400">✓</span> Audit-ready trace format
                </div>
                <div>
                  <span className="text-emerald-400">✓</span> Zero side effects in replay
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </Section>

      {/* ── FAQ ── */}
      <Section>
        <FadeIn>
          <SectionHeader
            eyebrow="FAQ"
            title="Frequently asked questions."
            className="text-center mx-auto"
          />
        </FadeIn>
        <FadeIn delay={0.2} className="mt-12 max-w-2xl mx-auto">
          <Accordion type="single" collapsible>
            {[
              {
                q: "Why do agents loop?",
                a: "LLM-based agents are probabilistic. Without explicit termination conditions or budget enforcement, they can repeat the same reasoning or tool-calling pattern indefinitely. Paprika's max_steps and max_repeat_hashes policies detect and halt these loops automatically.",
              },
              {
                q: "Does Paprika replace observability tools?",
                a: "No. Paprika is not a monitoring dashboard or log aggregator. It's a runtime layer that enforces policies and captures structured traces. It complements observability tools — you can export Paprika traces to your existing monitoring stack.",
              },
              {
                q: "Which frameworks does Paprika support?",
                a: "Paprika is framework-agnostic. It wraps execution at the Python runtime level, so it works with LangGraph, CrewAI, AutoGen, or any custom agent loop. You don't need to adopt a specific framework to use Paprika.",
              },
              {
                q: "Does Paprika modify my agent code?",
                a: "No. Paprika uses a decorator pattern to wrap your agent functions. Your business logic stays untouched. The runtime injects a context object that provides traced LLM and tool call interfaces.",
              },
              {
                q: "Is Paprika production ready?",
                a: "Paprika provides production-grade execution control: trace capture, policy enforcement, and safe replay. Design partner pilots are underway. Enterprise features (hosted traces, team dashboards) are on the roadmap.",
              },
            ].map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger>{item.q}</AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeIn>
      </Section>

      {/* ── Final CTA ── */}
      <Section className="bg-muted/30">
        <FadeIn className="text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
            Operational confidence for AI agents.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Add execution control to your agent stack. Trace, enforce, replay —
            and ship with confidence.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
            <Button size="lg" asChild>
              <Link href="/contact" className="gap-2">
                Book a Demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/docs/quickstart" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </FadeIn>
      </Section>
    </>
  );
}
