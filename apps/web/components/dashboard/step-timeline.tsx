"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format";
import { JsonViewer } from "./json-viewer";
import {
  Brain,
  Wrench,
  AlertTriangle,
  Play,
  Square,
  ChevronRight,
} from "lucide-react";
import type { TimelineStep } from "@/lib/api/types";

const stepIcons: Record<string, React.ElementType> = {
  llm_call: Brain,
  tool_call: Wrench,
  policy_violation: AlertTriangle,
  run_start: Play,
  run_end: Square,
};

const stepColors: Record<string, string> = {
  llm_call: "text-blue-400",
  tool_call: "text-emerald-400",
  policy_violation: "text-warning",
  run_start: "text-muted-foreground",
  run_end: "text-muted-foreground",
};

export function StepTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <StepRow key={i} step={step} />
      ))}
    </div>
  );
}

function StepRow({ step }: { step: TimelineStep }) {
  const [open, setOpen] = useState(false);
  const Icon = stepIcons[step.type] ?? Play;
  const colorClass = stepColors[step.type] ?? "text-muted-foreground";
  const hasDetail =
    step.detail && Object.keys(step.detail).length > 0;

  return (
    <div className="rounded-md border border-transparent hover:border-border/50 transition-colors">
      <button
        onClick={() => hasDetail && setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm",
          hasDetail && "cursor-pointer"
        )}
      >
        <Icon className={cn("h-4 w-4 shrink-0", colorClass)} />
        <span className="flex-1 truncate">
          <span className="text-xs text-muted-foreground mr-2">
            #{step.step_index}
          </span>
          <span className="font-medium">{step.type.replace("_", " ")}</span>
          <span className="ml-2 text-muted-foreground">{step.label}</span>
        </span>
        {step.tokens != null && step.tokens > 0 && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {step.tokens.toLocaleString()} tok
          </span>
        )}
        {step.duration_ms != null && (
          <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
            {formatDuration(step.duration_ms)}
          </span>
        )}
        {hasDetail && (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              open && "rotate-90"
            )}
          />
        )}
      </button>
      {open && hasDetail && (
        <div className="px-3 pb-3 pl-10">
          <StepDetail step={step} />
        </div>
      )}
    </div>
  );
}

function StepDetail({ step }: { step: TimelineStep }) {
  const d = step.detail;

  if (step.type === "llm_call") {
    return (
      <div className="space-y-3">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Provider: {String(d.provider)}</span>
          <span>Model: {String(d.model)}</span>
          <span>Hash: {String(d.input_hash)}</span>
        </div>
        {d.input_data ? (
          <div>
            <p className="text-xs font-medium mb-1">Input</p>
            <JsonViewer data={d.input_data} />
          </div>
        ) : null}
        {d.output_data ? (
          <div>
            <p className="text-xs font-medium mb-1">Output</p>
            <JsonViewer data={d.output_data} />
          </div>
        ) : null}
        {d.token_usage ? (
          <div className="text-xs text-muted-foreground">
            Tokens: {String((d.token_usage as Record<string, unknown>).prompt_tokens)} prompt
            + {String((d.token_usage as Record<string, unknown>).completion_tokens)} completion
            = {String((d.token_usage as Record<string, unknown>).total_tokens)} total
          </div>
        ) : null}
      </div>
    );
  }

  if (step.type === "tool_call") {
    return (
      <div className="space-y-3">
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Tool: {String(d.tool_name)}</span>
          <span>Hash: {String(d.input_hash)}</span>
        </div>
        {d.args ? (
          <div>
            <p className="text-xs font-medium mb-1">Arguments</p>
            <JsonViewer data={d.args} />
          </div>
        ) : null}
        {d.output_data ? (
          <div>
            <p className="text-xs font-medium mb-1">Output</p>
            <JsonViewer data={d.output_data} />
          </div>
        ) : null}
      </div>
    );
  }

  if (step.type === "policy_violation") {
    return (
      <div className="space-y-2">
        <div className="text-xs">
          <span className="font-medium text-warning">Policy: {String(d.policy_name)}</span>
        </div>
        <p className="text-sm text-muted-foreground">{String(d.message)}</p>
        {d.details ? <JsonViewer data={d.details} /> : null}
      </div>
    );
  }

  // run_start / run_end fallback
  return <JsonViewer data={d} />;
}
