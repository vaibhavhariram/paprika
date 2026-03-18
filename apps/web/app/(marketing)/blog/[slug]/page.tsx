import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { blogPosts, getBlogPost } from "@/content/blog";
import { notFound } from "next/navigation";
import { MarkdownRenderer } from "@/components/marketing/markdown-renderer";

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
        <header className="mb-12">
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
            <time>{post.date}</time>
            <span>·</span>
            <span>{post.readTime}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance leading-tight">
            {post.title}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-3xl">
            {post.description}
          </p>
        </header>

        <div className="prose-content">
          <MarkdownRenderer content={post.content} />
        </div>
      </article>
    </div>
  );
}
