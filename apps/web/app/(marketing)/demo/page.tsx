"use client";

import type { ElementType, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Brain,
  Clock,
  Code2,
  Download,
  FileJson,
  PauseCircle,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  demoTraces,
  type DemoScenarioId,
  type DemoTrace,
  type TraceStep,
  type TraceStepStatus,
  type TraceStepType,
} from "./traces";

const stepIcons: Record<TraceStepType, ElementType> = {
  run_start: Play,
  llm_call: Brain,
  tool_call: Wrench,
  policy_check: ShieldCheck,
  halt: PauseCircle,
  trace_write: FileJson,
  run_end: Square,
};

const stepColors: Record<TraceStepType, string> = {
  run_start: "text-muted-foreground",
  llm_call: "text-sky-400",
  tool_call: "text-emerald-400",
  policy_check: "text-violet-400",
  halt: "text-red-400",
  trace_write: "text-amber-300",
  run_end: "text-muted-foreground",
};

const statusStyles: Record<TraceStepStatus, string> = {
  ok: "border-border bg-muted text-muted-foreground",
  live: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  allowed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  blocked: "border-red-500/30 bg-red-500/10 text-red-300",
  stubbed: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  mismatch: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  halted: "border-red-500/30 bg-red-500/10 text-red-300",
  written: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

const traceStatusStyles: Record<DemoTrace["statusTone"], string> = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

export default function DemoPage() {
  const [activeId, setActiveId] = useState<DemoScenarioId>("capture");
  const [visibleCount, setVisibleCount] = useState(0);
  const [selectedStepNumber, setSelectedStepNumber] = useState<number | null>(
    null
  );

  const trace = useMemo(
    () => demoTraces.find((item) => item.id === activeId) ?? demoTraces[0],
    [activeId]
  );

  useEffect(() => {
    setVisibleCount(0);
    setSelectedStepNumber(null);

    let nextCount = 0;
    const intervalId = window.setInterval(() => {
      nextCount += 1;
      setVisibleCount(nextCount);

      if (nextCount >= trace.steps.length) {
        window.clearInterval(intervalId);
      }
    }, 150);

    return () => window.clearInterval(intervalId);
  }, [trace.id, trace.steps.length]);

  const visibleSteps = trace.steps.slice(0, visibleCount);
  const selectedStep =
    trace.steps.find((step) => step.step === selectedStepNumber) ??
    visibleSteps[visibleSteps.length - 1] ??
    trace.steps[0];

  const totals = visibleSteps.reduce(
    (acc, step) => ({
      tokens: acc.tokens + step.tokens,
      latencyMs: acc.latencyMs + step.latencyMs,
    }),
    { tokens: 0, latencyMs: 0 }
  );

  const progress = Math.round((visibleSteps.length / trace.steps.length) * 100);

  function chooseTrace(id: DemoScenarioId) {
    setActiveId(id);
  }

  function replayStream() {
    setVisibleCount(0);
    setSelectedStepNumber(null);
  }

  function exportTrace() {
    const body = JSON.stringify(trace, null, 2);
    const blob = new Blob([body], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${trace.runId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-background">
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-18">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div>
            <Badge variant="outline" className="mb-5">
              Clickable product demo
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Debug an AI agent run like an execution trace.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              This demo is intentionally self-contained: no login, no backend,
              no live model calls. It shows the product story that matters in an
              interview: trace capture, runtime enforcement, deterministic
              replay, and mismatch detection.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Policy config</p>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-md bg-background p-4 text-xs leading-relaxed text-muted-foreground">
              <code>{trace.policyConfig}</code>
            </pre>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/25">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap gap-3">
            {demoTraces.map((item) => (
              <Button
                key={item.id}
                variant={item.id === trace.id ? "default" : "outline"}
                onClick={() => chooseTrace(item.id)}
                className="gap-2"
              >
                {item.id === "capture" && <FileJson className="h-4 w-4" />}
                {item.id === "policy" && <ShieldCheck className="h-4 w-4" />}
                {item.id === "replay" && <RotateCcw className="h-4 w-4" />}
                {item.tabLabel}
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={replayStream} className="gap-2">
              <Play className="h-4 w-4" />
              Replay animation
            </Button>
            <Button variant="outline" onClick={exportTrace} className="gap-2">
              <Download className="h-4 w-4" />
              Export trace
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.8fr)]">
          <main className="space-y-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {trace.eyebrow}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {trace.title}
                </h2>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    traceStatusStyles[trace.statusTone]
                  )}
                >
                  {trace.status}
                </span>
              </div>
              <p className="mt-4 max-w-3xl text-muted-foreground">
                {trace.summary}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Metric
                icon={FileJson}
                label="Steps used"
                value={`${visibleSteps.length} / ${trace.maxSteps}`}
                progress={(visibleSteps.length / trace.maxSteps) * 100}
              />
              <Metric
                icon={Brain}
                label={
                  trace.id === "replay" ? "Live tokens spent" : "Tokens used"
                }
                value={`${totals.tokens.toLocaleString()} / ${trace.tokenBudget.toLocaleString()}`}
                progress={(totals.tokens / trace.tokenBudget) * 100}
              />
              <Metric
                icon={Clock}
                label="Observed latency"
                value={`${totals.latencyMs.toLocaleString()} ms`}
                progress={progress}
              />
            </div>

            <div className="rounded-lg border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">{trace.runId}</p>
                  <p className="text-xs text-muted-foreground">
                    Rows stream in at 150ms each. Click a row to inspect the
                    full event JSON.
                  </p>
                </div>
                <Badge variant="outline">{progress}% streamed</Badge>
              </div>

              {trace.id === "replay" && trace.replayPairs ? (
                <ReplayDiff
                  trace={trace}
                  visibleCount={visibleCount}
                  selectedStep={selectedStep.step}
                  onSelect={setSelectedStepNumber}
                />
              ) : (
                <TraceTimeline
                  steps={visibleSteps}
                  selectedStep={selectedStep.step}
                  onSelect={setSelectedStepNumber}
                />
              )}
            </div>
          </main>

          <aside className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Agent wrapper</h3>
              </div>
              <pre className="mt-4 max-h-[360px] overflow-auto rounded-md bg-background p-4 text-xs leading-relaxed text-muted-foreground">
                <code>{trace.code}</code>
              </pre>
            </div>

            <StepInspector step={selectedStep} />
          </aside>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  progress,
}: {
  icon: ElementType;
  label: string;
  value: string;
  progress: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-3 text-xl font-semibold tabular-nums">{value}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-all duration-150"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

function TraceTimeline({
  steps,
  selectedStep,
  onSelect,
}: {
  steps: TraceStep[];
  selectedStep: number;
  onSelect: (step: number) => void;
}) {
  return (
    <div className="divide-y divide-border/70">
      {steps.map((step) => (
        <TraceRow
          key={step.step}
          step={step}
          selected={selectedStep === step.step}
          onClick={() => onSelect(step.step)}
        />
      ))}
    </div>
  );
}

function ReplayDiff({
  trace,
  visibleCount,
  selectedStep,
  onSelect,
}: {
  trace: DemoTrace;
  visibleCount: number;
  selectedStep: number;
  onSelect: (step: number) => void;
}) {
  const pairs = trace.replayPairs?.slice(0, visibleCount) ?? [];
  const mismatch = pairs.find((pair) => !pair.match);

  return (
    <div>
      {mismatch && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                Trace divergence detected at step {mismatch.step}
              </p>
              <p className="text-xs text-amber-100/80">{mismatch.diff}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 border-b border-border bg-muted/35 px-4 py-2 text-xs font-medium text-muted-foreground">
        <span>Original Run</span>
        <span>Replay</span>
      </div>

      <div className="divide-y divide-border/70">
        {pairs.map((pair) => (
          <button
            key={pair.step}
            onClick={() => onSelect(pair.step)}
            className={cn(
              "grid w-full grid-cols-2 gap-0 text-left transition-colors hover:bg-muted/50",
              selectedStep === pair.step && "bg-muted",
              !pair.match && "bg-amber-500/10"
            )}
          >
            <ReplayCell step={pair.original} />
            <ReplayCell step={pair.replay} replay match={pair.match} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReplayCell({
  step,
  replay = false,
  match = true,
}: {
  step: TraceStep;
  replay?: boolean;
  match?: boolean;
}) {
  const Icon = stepIcons[step.type];

  return (
    <div className="min-w-0 border-r border-border/70 px-4 py-3 last:border-r-0">
      <div className="flex min-w-0 items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", stepColors[step.type])} />
        <span className="font-mono text-xs text-muted-foreground">
          #{step.step}
        </span>
        <span className="truncate text-sm font-medium">{step.label}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <TinyBadge>{step.inputHash}</TinyBadge>
        <TinyBadge>{step.latencyMs}ms</TinyBadge>
        <TinyBadge>{step.tokens.toLocaleString()} tok</TinyBadge>
        {replay && step.status === "stubbed" && (
          <TinyBadge className="border-blue-500/30 bg-blue-500/10 text-blue-300">
            stubbed from trace
          </TinyBadge>
        )}
        {replay && !match && (
          <TinyBadge className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            mismatch
          </TinyBadge>
        )}
      </div>
    </div>
  );
}

function TraceRow({
  step,
  selected,
  onClick,
}: {
  step: TraceStep;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = stepIcons[step.type];

  return (
    <button
      onClick={onClick}
      className={cn(
        "grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto_auto]",
        selected && "bg-muted",
        (step.status === "blocked" || step.status === "halted") &&
          "bg-red-500/5"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", stepColors[step.type])} />
      <span className="font-mono text-xs text-muted-foreground">
        #{step.step}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{step.label}</span>
        <span className="mt-1 flex flex-wrap gap-2">
          <TinyBadge>{step.type}</TinyBadge>
          <TinyBadge>{step.inputHash}</TinyBadge>
          {(step.provider || step.tool) && (
            <TinyBadge>{step.model ?? step.tool}</TinyBadge>
          )}
        </span>
      </span>
      <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
        {step.tokens.toLocaleString()} tok
      </span>
      <span className="hidden w-16 text-right text-xs tabular-nums text-muted-foreground sm:inline">
        {step.latencyMs}ms
      </span>
      <span
        className={cn(
          "hidden rounded-full border px-2 py-0.5 text-xs sm:inline",
          statusStyles[step.status]
        )}
      >
        {step.status}
      </span>
    </button>
  );
}

function StepInspector({ step }: { step: TraceStep }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Selected step</h3>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            #{step.step} / {step.type} / {step.inputHash}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs",
            statusStyles[step.status]
          )}
        >
          {step.status}
        </span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        {step.explanation}
      </p>
      <pre className="mt-4 max-h-[420px] overflow-auto rounded-md bg-background p-4 text-xs leading-relaxed text-muted-foreground">
        <code>{JSON.stringify(step, null, 2)}</code>
      </pre>
    </div>
  );
}

function TinyBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
