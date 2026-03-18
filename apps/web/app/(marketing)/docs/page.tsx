import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Zap, Puzzle, Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Docs",
  description: "Comprehensive documentation for Paprika, the deterministic debugging runtime for AI agents.",
};

const sections = [
  {
    title: "Getting Started",
    items: [
      {
        icon: Zap,
        title: "Quickstart",
        desc: "Install Paprika, write your first agent, and understand replay in 5 minutes.",
        href: "/docs/quickstart",
      },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      {
        icon: Layers,
        title: "Runtime",
        desc: "Understand how PaprikaRuntime wraps agent execution with tracing and policy enforcement.",
        href: "/docs/core-concepts/runtime",
      },
      {
        icon: BookOpen,
        title: "Execution Records",
        desc: "Learn the ExecutionRecord schema: steps, input hashes, status, and structured traces.",
        href: "/docs/core-concepts/execution-records",
      },
      {
        icon: BookOpen,
        title: "Policies",
        desc: "Set runtime guardrails with max_steps, max_tokens, and max_repeat_hashes.",
        href: "/docs/core-concepts/policies",
      },
      {
        icon: BookOpen,
        title: "Replay",
        desc: "Master deterministic replay and mismatch detection for regression testing.",
        href: "/docs/core-concepts/replay",
      },
    ],
  },
  {
    title: "Integration",
    items: [
      {
        icon: Puzzle,
        title: "Integrations",
        desc: "Use Paprika with Vanilla Python, LangGraph, CrewAI, or AutoGen.",
        href: "/docs/integrations",
      },
      {
        icon: BookOpen,
        title: "CLI",
        desc: "Learn the command-line tools: runs list, inspect, diff, and ui.",
        href: "/docs/cli",
      },
      {
        icon: BookOpen,
        title: "Configuration",
        desc: "Configure trace storage, policies, and environment settings.",
        href: "/docs/configuration",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-16">
        <h1 className="text-4xl font-semibold mb-4 text-foreground">
          Documentation
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
          Paprika is the deterministic debugging runtime for AI agents. Capture execution records, enforce policies, and replay failures safely. Everything you need to understand and integrate Paprika.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-12">
        {sections.map((section) => (
          <div key={section.title}>
            <h2 className="text-2xl font-semibold mb-6 text-foreground">
              {section.title}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex flex-col gap-3 rounded-lg border border-border p-6 transition-all hover:border-accent/50 hover:bg-accent/5"
                >
                  <div className="flex items-start justify-between">
                    <item.icon className="h-5 w-5 text-accent shrink-0" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Card */}
      <div className="mt-16 rounded-lg border border-accent/20 bg-accent/5 p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Ready to get started?
            </h3>
            <p className="text-muted-foreground">
              Start with the quickstart to install Paprika and run your first agent with tracing.
            </p>
          </div>
          <Link
            href="/docs/quickstart"
            className="px-4 py-2 rounded-lg bg-accent text-accent-foreground font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Go to Quickstart
          </Link>
        </div>
      </div>
    </div>
  );
}
