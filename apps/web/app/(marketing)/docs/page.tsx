import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Zap, Puzzle } from "lucide-react";

export const metadata: Metadata = {
  title: "Documentation — Paprika",
  description: "Platform documentation for Paprika execution control infrastructure.",
};

export default function DocsPage() {
  return (
    <div>
      <h1 className="text-3xl tracking-tight mb-4">Documentation</h1>
      <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
        Platform docs for adding execution control to your agent stack.
      </p>

      <div className="grid gap-4">
        {[
          {
            icon: Zap,
            title: "Quickstart",
            desc: "Add Paprika to your agent runtime and capture your first trace in minutes.",
            href: "/docs/quickstart",
          },
          {
            icon: Puzzle,
            title: "Integrations",
            desc: "Use Paprika with LangGraph, CrewAI, AutoGen, or custom agent stacks.",
            href: "/docs/integrations",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-start gap-4 rounded-lg border border-border p-5 transition-colors hover:bg-accent/50"
          >
            <item.icon className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <h3 className="group-hover:text-foreground flex items-center gap-1">
                {item.title}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-lg border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <h3 className="mb-1">Core concepts</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Paprika has four core components: the <strong className="text-foreground">Runtime</strong> wraps
              agent execution, <strong className="text-foreground">Traces</strong> record every step as audit-ready
              events, <strong className="text-foreground">Policies</strong> enforce runtime limits, and
              the <strong className="text-foreground">Replay Engine</strong> re-executes runs safely using recorded outputs.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
