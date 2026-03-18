import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/marketing/section";
import { WaitlistForm } from "@/components/marketing/waitlist-form";

const DEMO_URL = "https://cal.com/vaibhavhariram/30min";

export const metadata: Metadata = {
  title: "Waitlist",
  description: "Join the waitlist for Paprika execution control infrastructure.",
};

export default function WaitlistPage() {
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
        eyebrow="Waitlist"
        title="Get updates and early access."
        description="Join the waitlist for product updates and design partner availability. If you're already running agents in production, book a demo instead."
        className="max-w-2xl"
      />

      <div className="mt-10 max-w-xl space-y-4">
        <WaitlistForm source="waitlist_page" />
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <a href={DEMO_URL} target="_blank" rel="noopener noreferrer" className="gap-2">
              Book a demo
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/product">Explore the product</Link>
          </Button>
        </div>
      </div>
    </Section>
  );
}

