import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/section";

export const metadata: Metadata = {
  title: "Company — Paprika",
  description:
    "Building the execution layer for AI agents. Infrastructure for probabilistic software in production.",
};

export default function CompanyPage() {
  return (
    <>
      <Section>
        <SectionHeader
          eyebrow="Company"
          title="Building the execution layer for AI."
          description="Paprika is infrastructure for AI agents in production. We're building the control plane that makes probabilistic systems trustworthy."
        />
      </Section>

      <Section className="bg-muted/30 pt-0">
        <div className="max-w-2xl space-y-6 text-muted-foreground leading-relaxed">
          <p>
            AI agents are powerful but unpredictable. They loop, exceed budgets,
            make duplicate calls, and fail in ways that are difficult to
            reproduce. Existing tools help teams build agents or observe them —
            but none provide real execution control at the runtime layer.
          </p>
          <p>
            Paprika fills that gap. We're building the execution infrastructure
            that records structured traces, enforces runtime policies, and enables
            deterministic replay of prior runs. The goal is to make agent
            execution as trustworthy as traditional software.
          </p>
          <p>
            We believe that AI-native software requires a new layer of execution
            infrastructure — one that treats probabilistic behavior as a
            first-class concern. We're partnering with early teams to shape that
            layer.
          </p>
        </div>
      </Section>

      <Section>
        <SectionHeader
          title="Partner with us"
          description="We're working with design partners who are building AI agents in production. Early access, direct input on the roadmap, and pilot pricing."
        />
        <div className="flex gap-3 mt-8">
          <Button asChild>
            <Link href="/contact" className="gap-2">
              Join design partner program
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/docs/quickstart">Try the quickstart</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
