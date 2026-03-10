import { useState } from "react";
import type { TimelineStep } from "../types";
import { formatDuration } from "../utils/format";
import StepDetailPanel from "./StepDetailPanel";

const typeConfig: Record<
  string,
  { icon: string; color: string; bg?: string; border?: string }
> = {
  run_start: { icon: "▶", color: "text-zinc-500" },
  run_end: { icon: "■", color: "text-zinc-500" },
  llm_call: { icon: "◆", color: "text-blue-400" },
  tool_call: { icon: "⚙", color: "text-teal-400" },
  policy_violation: {
    icon: "⚠",
    color: "text-red-400",
    bg: "bg-red-950/30",
    border: "border-l-red-500",
  },
};

export default function StepRow({ step }: { step: TimelineStep }) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[step.type] ?? typeConfig.run_start;
  const isViolation = step.type === "policy_violation";
  const isBookend = step.type === "run_start" || step.type === "run_end";

  return (
    <div
      className={`border-l-2 ${
        isViolation
          ? "border-l-red-500 bg-red-950/20"
          : "border-l-zinc-800"
      }`}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors ${
          config.bg ?? ""
        }`}
      >
        {/* Expand indicator */}
        <span
          className={`text-[10px] text-zinc-600 w-3 transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>

        {/* Step index */}
        <span className="text-[11px] text-zinc-600 font-mono w-6 text-right shrink-0">
          {isBookend ? "" : step.step_index}
        </span>

        {/* Type icon */}
        <span className={`text-sm ${config.color} w-5 text-center shrink-0`}>
          {config.icon}
        </span>

        {/* Type label */}
        <span className="text-[11px] text-zinc-500 w-24 shrink-0">
          {step.type.replace("_", " ")}
        </span>

        {/* Step label */}
        <span
          className={`text-sm flex-1 truncate ${
            isViolation
              ? "text-red-300 font-medium"
              : isBookend
                ? "text-zinc-500"
                : "text-zinc-200"
          }`}
        >
          {step.label}
        </span>

        {/* Duration */}
        {step.duration_ms != null && (
          <span className="text-xs text-zinc-500 font-mono tabular-nums shrink-0">
            {formatDuration(step.duration_ms)}
          </span>
        )}

        {/* Tokens */}
        {step.tokens != null && step.tokens > 0 && (
          <span className="text-xs text-zinc-500 font-mono tabular-nums shrink-0 w-16 text-right">
            {step.tokens.toLocaleString()} tok
          </span>
        )}
      </button>

      {expanded && <StepDetailPanel step={step} />}
    </div>
  );
}
