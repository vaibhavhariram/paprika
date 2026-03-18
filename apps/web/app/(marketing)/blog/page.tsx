import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { blogPosts } from "@/content/blog";
import { Section, SectionHeader } from "@/components/marketing/section";

export const metadata: Metadata = {
  title: "Blog",
  description: "Technical insights on production AI agent execution, runtime control, and operational reliability.",
};

export default function BlogPage() {
  return (
    <Section>
      <SectionHeader
        eyebrow="Blog"
        title="Execution infrastructure for AI agents."
        description="Technical insights on production agent control, runtime reliability, and execution governance."
      />

      <div className="mt-12 grid gap-6 max-w-3xl">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group block rounded-lg border border-border p-6 transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <time>{post.date}</time>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
            <h2 className="text-lg group-hover:text-foreground flex items-center gap-2">
              {post.title}
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {post.description}
            </p>
          </Link>
        ))}
      </div>
    </Section>
  );
}
