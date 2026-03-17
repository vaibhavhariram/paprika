import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Contact — Paprika",
  description: "Book a demo or join the design partner program.",
};

export default function ContactPage() {
  return (
    <Section>
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <SectionHeader
        eyebrow="Contact"
        title="Let's talk."
        description="Book a demo to see Paprika in action, or join our design partner program for early access and direct input on the roadmap."
        className="max-w-2xl"
      />

      <div className="mt-12 max-w-xl space-y-6 text-muted-foreground leading-relaxed">
        <p>
          We're working with teams building AI agents in production. If you're
          wrestling with runtime reliability, traceability, or execution
          governance, we'd like to hear from you.
        </p>
        <p>
          Send us an email at{" "}
          <a
            href="mailto:hello@paprika.ai"
            className="text-foreground underline hover:no-underline"
          >
            hello@paprika.ai
          </a>{" "}
          with a brief description of your use case. We'll get back within a few
          business days.
        </p>
      </div>

      <div className="mt-12 flex flex-wrap gap-4">
        <Button asChild>
          <a
            href="https://cal.com/vaibhavhariram/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="gap-2"
          >
            Book a Demo
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/waitlist">Join the waitlist</Link>
        </Button>
      </div>
    </Section>
  );
}