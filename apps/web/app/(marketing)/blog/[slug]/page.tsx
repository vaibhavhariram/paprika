import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { blogPosts, getBlogPost } from "@/content/blog";
import { notFound } from "next/navigation";

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getBlogPost(params.slug);
  if (!post) return { title: "Not Found — Paprika" };
  return {
    title: `${post.title} — Paprika Blog`,
    description: post.description,
  };
}

export default function BlogPostPage({ params }: Props) {
  const post = getBlogPost(params.slug);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to blog
      </Link>

      <article>
        <header className="mb-10">
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            <time>{post.date}</time>
            <span>·</span>
            <span>{post.readTime}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl tracking-tight text-balance leading-tight">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {post.description}
          </p>
        </header>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          {post.content.split("\n").map((line, i) => {
            const trimmed = line.trimStart();
            if (trimmed.startsWith("## ")) {
              return (
                <h2
                  key={i}
                  className="text-xl mt-10 mb-4 text-foreground"
                >
                  {trimmed.slice(3)}
                </h2>
              );
            }
            if (trimmed.startsWith("### ")) {
              return (
                <h3
                  key={i}
                  className="text-lg mt-8 mb-3 text-foreground"
                >
                  {trimmed.slice(4)}
                </h3>
              );
            }
            if (trimmed.startsWith("```")) {
              return null; // Code blocks are simplified for this template
            }
            if (trimmed.startsWith("- ") || trimmed.startsWith("1. ")) {
              return (
                <p
                  key={i}
                  className="text-muted-foreground leading-relaxed ml-4"
                >
                  {trimmed}
                </p>
              );
            }
            if (trimmed.startsWith("|")) {
              return (
                <p
                  key={i}
                  className="text-muted-foreground font-mono text-sm leading-relaxed"
                >
                  {trimmed}
                </p>
              );
            }
            if (trimmed.length === 0) {
              return <div key={i} className="h-3" />;
            }
            return (
              <p
                key={i}
                className="text-muted-foreground leading-relaxed mb-3"
              >
                {trimmed}
              </p>
            );
          })}
        </div>
      </article>
    </div>
  );
}
