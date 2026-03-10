import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Users, Zap, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/section";

export const metadata: Metadata = {
  title: "Pricing — Paprika",
  description: "Execution control for AI agents. Design partner, growth, and enterprise plans.",
};

export default function PricingPage() {
  return (
    <>
      <Section>
        <SectionHeader
          eyebrow="Pricing"
          title="Plans for every stage."
          description="From design partner pilots to enterprise adoption. We work with teams building AI agents in production."
          className="text-center mx-auto max-w-2xl"
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Design Partner Pilot */}
          <div className="rounded-lg border border-border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Design Partner Pilot
                </p>
              </div>
              <p className="text-3xl font-bold mt-2">Pilot</p>
              <p className="text-sm text-muted-foreground mt-1">
                For teams evaluating execution control
              </p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Structured trace capture",
                "Runtime policy enforcement",
                "Safe deterministic replay",
                "CLI and API access",
                "Direct product feedback",
                "Pilot pricing",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full gap-2" asChild>
              <Link href="/contact">
                Join pilot
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Growth */}
          <div className="rounded-lg border-2 border-foreground bg-card p-8 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-foreground text-background text-xs font-medium">
              Popular
            </div>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Growth
                </p>
              </div>
              <p className="text-3xl font-bold mt-2">Growth</p>
              <p className="text-sm text-muted-foreground mt-1">
                For teams scaling agent workloads
              </p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Everything in Pilot",
                "Hosted trace storage",
                "Team access",
                "Usage-based pricing",
                "SLA and support",
                "Framework integrations",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button className="w-full gap-2" asChild>
              <Link href="/contact">
                Talk to sales
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Enterprise */}
          <div className="rounded-lg border border-border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">
                  Enterprise
                </p>
              </div>
              <p className="text-3xl font-bold mt-2">Enterprise</p>
              <p className="text-sm text-muted-foreground mt-1">
                For organizations with strict requirements
              </p>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {[
                "Everything in Growth",
                "Dedicated infrastructure",
                "Custom SLAs",
                "SSO and audit logging",
                "On-premise deployment",
                "Success management",
              ].map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full gap-2" asChild>
              <Link href="/contact">
                Contact sales
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <p className="mt-12 text-center text-sm text-muted-foreground max-w-xl mx-auto">
          All plans include execution control, trace capture, policy enforcement,
          and safe replay. Pricing scales with usage.
        </p>
      </Section>
    </>
  );
}
