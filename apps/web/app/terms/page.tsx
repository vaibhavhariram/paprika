import { Metadata } from "next";
import { Section } from "@/components/section";

export const metadata: Metadata = {
  title: "Terms of Service — Paprika",
  description: "Terms of service for Paprika execution control infrastructure.",
};

export default function TermsPage() {
  return (
    <Section>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight mb-8">Terms of Service</h1>
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed">
          <p>Last updated: March 2026</p>

          <h2 className="text-foreground text-lg font-semibold mt-8">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Paprika products, pilots, or services
            (&quot;Services&quot;), you agree to these Terms. If you are using the
            Services on behalf of an organization, you represent that you have
            authority to bind that organization.
          </p>

          <h2 className="text-foreground text-lg font-semibold mt-8">2. Use of Services</h2>
          <p>
            Paprika provides execution control infrastructure for AI agents. You
            may use the Services in accordance with your agreement or pilot
            terms. Use is subject to acceptable use policies and any limits
            specified in your plan.
          </p>

          <h2 className="text-foreground text-lg font-semibold mt-8">3. Data and Security</h2>
          <p>
            You retain ownership of your data. Execution traces and agent data
            are processed according to your deployment configuration and our
            security practices. You are responsible for the data you capture and
            how you configure storage.
          </p>

          <h2 className="text-foreground text-lg font-semibold mt-8">4. Service Level</h2>
          <p>
            For paid plans and enterprise agreements, service levels are
            defined in your order form or agreement. Pilots and early-access
            offerings may not include formal SLAs. We strive to maintain high
            availability and will communicate any planned maintenance.
          </p>

          <h2 className="text-foreground text-lg font-semibold mt-8">5. Limitations</h2>
          <p>
            The Services are provided as described. We disclaim warranties to
            the extent permitted by law. Our liability is limited as set forth
            in your agreement or, if none, to the maximum extent permitted by
            applicable law.
          </p>

          <h2 className="text-foreground text-lg font-semibold mt-8">6. Changes</h2>
          <p>
            We may update these Terms from time to time. Material changes will
            be communicated via the contact information we have for your
            account or through the product. Continued use of the Services after
            such notice constitutes acceptance.
          </p>

          <h2 className="text-foreground text-lg font-semibold mt-8">7. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
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
