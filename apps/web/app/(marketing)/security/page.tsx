import { Metadata } from "next";
import { ShieldCheck, Lock, Eye, Activity, FileJson, AlertTriangle } from "lucide-react";
import { Section, SectionHeader } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Security — Paprika",
  description:
    "Security posture for Paprika: execution isolation, audit trails, and enterprise trust.",
};

export default function SecurityPage() {
  return (
    <>
      <Section>
        <SectionHeader
          eyebrow="Security"
          title="Built for operational trust."
          description="Paprika is designed for teams running AI agents in production. Reproducibility, transparency, and execution isolation are core to the platform."
        />
      </Section>

      <Section className="bg-muted/30 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              title: "Replay isolation",
              desc: "In replay mode, Paprika never calls live LLM providers or executes live tool functions. All outputs are returned from the recorded trace.",
            },
            {
              icon: Eye,
              title: "Transparent runtime",
              desc: "Every execution step is recorded as a structured event. No hidden state mutations or opaque runtime decisions.",
            },
            {
              icon: ShieldCheck,
              title: "Policy enforcement",
              desc: "Runtime policies halt execution proactively. Step limits, token budgets, and repeat detection prevent runaway behavior before it causes damage.",
            },
            {
              icon: Activity,
              title: "Mismatch detection",
              desc: "During replay, Paprika validates that the current execution matches the recorded trace. Any divergence raises an explicit ReplayMismatchError.",
            },
            {
              icon: FileJson,
              title: "Trace control",
              desc: "Traces are structured, portable, and under your control. Storage location and retention are configurable. Enterprise deployments can use private storage.",
            },
            {
              icon: AlertTriangle,
              title: "Data handling",
              desc: "Traces may contain prompts or tool payloads. Redaction and retention policies are configurable. Sensitive data handling is documented and continuously improved.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <item.icon className="h-5 w-5 text-foreground mb-4" />
              <h3 className="mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="Security principles"
          description="These principles guide every design decision in Paprika."
        />
        <ul className="mt-8 space-y-4 max-w-2xl">
          {[
            "Replay mode must never call live tools or LLM providers.",
            "Trace format is structured, documented, and versioned.",
            "Policy violations halt execution with structured exceptions.",
            "All runtime behavior is inspectable via traces and API.",
            "No telemetry or external data transmission without explicit opt-in.",
            "Enterprise deployments support private, dedicated infrastructure.",
          ].map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <span className="text-emerald-400 mt-0.5 font-mono text-xs">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
