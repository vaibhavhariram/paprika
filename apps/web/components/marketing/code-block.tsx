"use client";

import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = "python", className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting by language
  const highlightCode = (code: string, lang: string) => {
    if (lang === "python") {
      return code
        .replace(/\b(def|class|import|from|if|else|elif|for|while|return|try|except|finally|with|as|pass|break|continue|True|False|None)\b/g, '<span class="text-[#9ecbff]">$1</span>')
        .replace(/("([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\')/g, '<span class="text-[#a3d95f]">$1</span>')
        .replace(/(#.*$)/gm, '<span class="text-[#6a7e7f]">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="text-[#e5b76f]">$1</span>');
    } else if (lang === "typescript" || lang === "javascript" || lang === "js" || lang === "ts") {
      return code
        .replace(/\b(const|let|var|function|async|await|import|export|from|if|else|return|class|extends|new|this|try|catch|finally|typeof|instanceof)\b/g, '<span class="text-[#9ecbff]">$1</span>')
        .replace(/("([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\'|`([^`\\]|\\.)*`)/g, '<span class="text-[#a3d95f]">$1</span>')
        .replace(/(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, '<span class="text-[#6a7e7f]">$1</span>')
        .replace(/\b(\d+)\b/g, '<span class="text-[#e5b76f]">$1</span>');
    } else if (lang === "bash" || lang === "shell" || lang === "sh") {
      return code
        .replace(/\b(export|echo|cd|ls|cat|chmod|mkdir|rm|mv|cp|grep|find|sed|awk)\b/g, '<span class="text-[#9ecbff]">$1</span>')
        .replace(/("([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\')/g, '<span class="text-[#a3d95f]">$1</span>')
        .replace(/(#.*$)/gm, '<span class="text-[#6a7e7f]">$1</span>')
        .replace(/\$\w+/g, '<span class="text-[#e5b76f]">$&</span>');
    } else if (lang === "json") {
      return code
        .replace(/"([^"\\]|\\.)*":/g, '<span class="text-[#9ecbff]">$&</span>')
        .replace(/"([^"\\]|\\.)*"/g, '<span class="text-[#a3d95f]">$&</span>')
        .replace(/\b(true|false|null)\b/g, '<span class="text-[#9ecbff]">$1</span>')
        .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="text-[#e5b76f]">$1</span>');
    }
    return code;
  };

  const highlightedCode = highlightCode(code, language);

  return (
    <div className={cn("rounded-xl border border-border/60 bg-card overflow-hidden", className)}>
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-muted/30">
        <span className="text-[11px] text-muted-foreground/60 font-mono tracking-wide">{language}</span>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-all duration-150"
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code block */}
      <pre className="p-6 overflow-x-auto text-sm leading-[1.7]">
        <code
          className="font-mono text-foreground/85"
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
        />
      </pre>
    </div>
  );
}
