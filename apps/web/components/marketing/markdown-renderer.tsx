import React from 'react';
import { CodeBlock } from './code-block';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Simple markdown renderer using regex-based parsing
 * Handles: headings, paragraphs, code blocks, lists, emphasis, links, blockquotes
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const parseMarkdown = (markdown: string): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];
    const lines = markdown.split('\n');
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block (``` ... ```)
      if (line.trim().startsWith('```')) {
        const language = line.trim().substring(3).trim() || 'plaintext';
        const codeLines: string[] = [];
        i++;

        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }

        elements.push(
          <div key={`code-${elements.length}`} className="my-6">
            <CodeBlock language={language} code={codeLines.join('\n')} />
          </div>
        );
        i++; // Skip closing ```
        continue;
      }

      // Headings (# ## ### etc)
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.substring(level).trim();
        const element = parseInlineMarkdown(text);

        const headingClass =
          level === 1
            ? 'text-4xl font-semibold mt-12 mb-6'
            : level === 2
              ? 'text-3xl font-semibold mt-10 mb-4'
              : level === 3
                ? 'text-2xl font-semibold mt-8 mb-3'
                : 'text-xl font-semibold mt-6 mb-2';

        const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;
        elements.push(
          React.createElement(
            HeadingTag,
            { key: `heading-${elements.length}`, className: `${headingClass} text-foreground scroll-mt-20` },
            element
          )
        );
        i++;
        continue;
      }

      // Blockquote
      if (line.startsWith('>')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].startsWith('>')) {
          quoteLines.push(lines[i].substring(1).trim());
          i++;
        }
        elements.push(
          <blockquote
            key={`quote-${elements.length}`}
            className="border-l-4 border-accent px-4 py-2 my-6 italic text-muted-foreground"
          >
            {quoteLines.join(' ')}
          </blockquote>
        );
        continue;
      }

      // Unordered list
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          listItems.push(lines[i].trim().substring(2));
          i++;
        }
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside my-4 space-y-2 text-foreground">
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInlineMarkdown(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (/^\d+\.\s/.test(line.trim())) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
          i++;
        }
        elements.push(
          <ol key={`olist-${elements.length}`} className="list-decimal list-inside my-4 space-y-2 text-foreground">
            {listItems.map((item, idx) => (
              <li key={idx}>{parseInlineMarkdown(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        i++;
        continue;
      }

      // Paragraph
      const paragraphLines: string[] = [line];
      i++;
      while (i < lines.length && !lines[i].startsWith('#') && !lines[i].startsWith('>') &&
             !lines[i].trim().startsWith('- ') && !lines[i].trim().startsWith('```') &&
             !/^\d+\.\s/.test(lines[i].trim()) && lines[i].trim() !== '') {
        paragraphLines.push(lines[i]);
        i++;
      }

      const paragraphText = paragraphLines.join('\n').trim();
      if (paragraphText) {
        elements.push(
          <p key={`para-${elements.length}`} className="text-foreground leading-7 my-4">
            {parseInlineMarkdown(paragraphText)}
          </p>
        );
      }
    }

    return elements;
  };

  const parseInlineMarkdown = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Pattern for **bold**, *italic*, `code`, [link](url)
    const regex = /\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // **bold**
        parts.push(
          <strong key={`bold-${parts.length}`} className="font-semibold text-foreground">
            {match[1]}
          </strong>
        );
      } else if (match[2]) {
        // *italic*
        parts.push(
          <em key={`italic-${parts.length}`} className="italic text-foreground">
            {match[2]}
          </em>
        );
      } else if (match[3]) {
        // `code`
        parts.push(
          <code
            key={`inline-code-${parts.length}`}
            className="px-2 py-1 rounded bg-muted text-muted-foreground font-mono text-sm"
          >
            {match[3]}
          </code>
        );
      } else if (match[4] && match[5]) {
        // [link](url)
        parts.push(
          <a
            key={`link-${parts.length}`}
            href={match[5]}
            className="text-accent hover:underline"
          >
            {match[4]}
          </a>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="prose prose-invert max-w-none space-y-4">
      {parseMarkdown(content)}
    </div>
  );
}
