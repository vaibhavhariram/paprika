import { useState } from "react";

const COLLAPSE_THRESHOLD = 8;

export default function JsonViewer({
  data,
  label,
}: {
  data: unknown;
  label?: string;
}) {
  const text = JSON.stringify(data, null, 2);
  const lines = text.split("\n");
  const isLarge = lines.length > COLLAPSE_THRESHOLD;
  const [expanded, setExpanded] = useState(!isLarge);

  return (
    <div className="mt-1">
      {label && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium">
            {label}
          </span>
          {isLarge && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {expanded ? "collapse" : `expand (${lines.length} lines)`}
            </button>
          )}
        </div>
      )}
      <pre
        className={`text-xs font-mono bg-zinc-950 border border-zinc-800 rounded px-3 py-2 overflow-x-auto text-zinc-300 whitespace-pre ${
          !expanded ? "max-h-48 overflow-hidden relative" : ""
        }`}
      >
        {expanded ? text : lines.slice(0, COLLAPSE_THRESHOLD).join("\n")}
        {!expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-zinc-950 to-transparent" />
        )}
      </pre>
    </div>
  );
}
