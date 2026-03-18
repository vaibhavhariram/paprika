import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const docsDirectory = join(process.cwd(), '..', '..', 'docs');

export interface DocMetadata {
  title: string;
  description?: string;
  [key: string]: any;
}

export interface DocContent {
  slug: string[];
  metadata: DocMetadata;
  content: string;
  path: string;
}

function inferTitleFromMarkdown(markdown: string): string | null {
  const match = markdown.match(/^#\s+(.+)\s*$/m);
  return match?.[1]?.trim() || null;
}

/**
 * Get a single doc by slug array
 * e.g., ['core-concepts', 'runtime'] -> /docs/core-concepts/runtime.md
 */
export async function getDoc(slugArray: string[]): Promise<DocContent | null> {
  try {
    const docPath = join(docsDirectory, ...slugArray) + '.md';
    const fileContents = readFileSync(docPath, 'utf8');
    const { data, content } = matter(fileContents);

    const inferredTitle = inferTitleFromMarkdown(content);
    const metadata = {
      ...(data as DocMetadata),
      title:
        (data as DocMetadata)?.title ||
        inferredTitle ||
        slugArray[slugArray.length - 1]?.replace(/-/g, ' ') ||
        'Docs',
    } satisfies DocMetadata;

    return {
      slug: slugArray,
      metadata,
      content,
      path: docPath,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Get all doc slugs for static generation
 */
export function getAllDocSlugs(): string[][] {
  const slugs: string[][] = [];

  function walkDir(dir: string, basePath: string[] = []): void {
    try {
      const files = readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        if (file.name.startsWith('.')) continue;

        const fullPath = join(dir, file.name);
        const slug = [...basePath, file.name.replace('.md', '')];

        if (file.isDirectory()) {
          walkDir(fullPath, slug);
        } else if (file.isFile() && file.name.endsWith('.md')) {
          slugs.push(slug);
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dir}:`, error);
    }
  }

  walkDir(docsDirectory);
  return slugs;
}

/**
 * Get navigation structure for sidebar
 */
export const docsNav = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Overview', href: '/docs', slug: ['overview'] },
      { title: 'Quickstart', href: '/docs/quickstart', slug: ['quickstart'] },
    ],
  },
  {
    title: 'Core Concepts',
    items: [
      { title: 'Runtime', href: '/docs/core-concepts/runtime', slug: ['core-concepts', 'runtime'] },
      { title: 'Execution Records', href: '/docs/core-concepts/execution-records', slug: ['core-concepts', 'execution-records'] },
      { title: 'Policies', href: '/docs/core-concepts/policies', slug: ['core-concepts', 'policies'] },
      { title: 'Replay', href: '/docs/core-concepts/replay', slug: ['core-concepts', 'replay'] },
    ],
  },
  {
    title: 'Integration',
    items: [
      { title: 'Integrations', href: '/docs/integrations', slug: ['integrations'] },
      { title: 'CLI', href: '/docs/cli', slug: ['cli'] },
      { title: 'Configuration', href: '/docs/configuration', slug: ['configuration'] },
    ],
  },
];

/**
 * Find a nav item by slug
 */
export function findNavItem(slug: string[]) {
  for (const section of docsNav) {
    for (const item of section.items) {
      if (
        item.slug.length === slug.length &&
        item.slug.every((s, i) => s === slug[i])
      ) {
        return item;
      }
    }
  }
  return null;
}

/**
 * Get previous and next nav items
 */
export function getNavigation(slug: string[]) {
  const allItems = docsNav.flatMap((section) => section.items);
  const currentIndex = allItems.findIndex(
    (item) =>
      item.slug.length === slug.length &&
      item.slug.every((s, i) => s === slug[i])
  );

  return {
    previous: currentIndex > 0 ? allItems[currentIndex - 1] : null,
    next: currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null,
  };
}
