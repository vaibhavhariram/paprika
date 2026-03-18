import { getDoc, getAllDocSlugs, getNavigation } from "@/lib/docs";
import { MarkdownRenderer } from "@/components/marketing/markdown-renderer";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

interface DocsPageProps {
  params: {
    slug: string[];
  };
}

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: DocsPageProps) {
  const { slug } = await params;
  const doc = await getDoc(slug);

  if (!doc) {
    return {
      title: "Not Found",
      description: "Documentation page not found",
    };
  }

  return {
    title: doc.metadata.title,
    description: doc.metadata.description || "Paprika documentation",
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const doc = await getDoc(slug);

  if (!doc) {
    notFound();
  }

  const { previous, next } = getNavigation(slug);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-12">
        <h1 className="text-4xl font-semibold text-foreground mb-2">
          {doc.metadata.title}
        </h1>
        {doc.metadata.description && (
          <p className="text-lg text-muted-foreground">
            {doc.metadata.description}
          </p>
        )}
      </div>

      {/* Content */}
      <article className="prose prose-invert max-w-none mb-16">
        <MarkdownRenderer content={doc.content} />
      </article>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-4 pt-8 border-t border-border mt-16">
        {previous ? (
          <Link
            href={previous.href}
            className="group flex items-center gap-2 px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Previous</p>
              <p className="text-sm font-medium text-foreground">
                {previous.title}
              </p>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {next ? (
          <Link
            href={next.href}
            className="group flex items-center justify-end gap-2 px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-right"
          >
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Next</p>
              <p className="text-sm font-medium text-foreground">
                {next.title}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
