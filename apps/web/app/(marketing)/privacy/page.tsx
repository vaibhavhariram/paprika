import { Metadata } from "next";
import { Section } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Privacy Policy — Paprika",
  description: "Privacy policy for Paprika execution control infrastructure.",
};

export default function PrivacyPage() {
  return (
    <Section>
      <div className="max-w-2xl">
        <h1 className="text-3xl tracking-tight mb-8">Privacy Policy</h1>
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <p>Last updated: March 2026</p>

          <h2 className="text-foreground text-lg mt-8">Overview</h2>
          <p>
            Paprika provides execution control infrastructure for AI agents. This
            policy describes how we handle data in connection with our products,
            pilots, and services.
          </p>

          <h2 className="text-foreground text-lg mt-8">Data Handling</h2>
          <p>
            Execution traces and related data are controlled by you. Paprika can
            be deployed with data storage and processing entirely within your
            environment. When using our hosted or managed offerings, trace data
            is stored and processed according to the terms of your agreement.
          </p>

          <h2 className="text-foreground text-lg mt-8">Trace Data</h2>
          <p>
            Execution traces may include prompts, tool inputs, model outputs, and
            metadata from agent runs. You are responsible for determining what
            data you capture and where it is stored. We do not access or use your
            trace data beyond what is required to deliver our services.
          </p>

          <h2 className="text-foreground text-lg mt-8">Product Usage</h2>
          <p>
            We may collect limited, aggregated usage data to improve our
            platform. We do not include telemetry or analytics that transmit
            your agent data or prompts unless you explicitly opt in.
          </p>

          <h2 className="text-foreground text-lg mt-8">Website</h2>
          <p>
            This website may use cookies for essential functionality. We do not
            sell or share personal information collected through this site for
            advertising purposes.
          </p>

          <h2 className="text-foreground text-lg mt-8">Contact</h2>
          <p>
            For privacy-related questions or to exercise your rights, please
            contact us at{" "}
            <a
              href="mailto:hello@paprika.ai"
              className="text-foreground underline"
            >
              hello@paprika.ai
            </a>
            .
          </p>
        </div>
      </div>
    </Section>
  );
}
