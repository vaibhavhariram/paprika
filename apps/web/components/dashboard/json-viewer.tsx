"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

interface JsonViewerProps {
  data: unknown;
  maxLines?: number;
}

export function JsonViewer({ data, maxLines = 8 }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatted = JSON.stringify(data, null, 2);
  const lines = formatted.split("\n");
  const needsTruncation = lines.length > maxLines;
  const displayText = !expanded && needsTruncation
    ? lines.slice(0, maxLines).join("\n") + "\n..."
    : formatted;

  async function handleCopy() {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
        aria-label="Copy JSON"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>
      <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs font-mono leading-relaxed">
        {displayText}
      </pre>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? (
            <>
              <ChevronDown className="h-3 w-3" /> Collapse
            </>
          ) : (
            <>
              <ChevronRight className="h-3 w-3" /> Show all ({lines.length} lines)
            </>
          )}
        </button>
      )}
    </div>
  );
}
