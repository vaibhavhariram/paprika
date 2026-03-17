"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useRunDetail } from "@/lib/api/hooks";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { StepTimeline } from "@/components/dashboard/step-timeline";
import { ErrorState } from "@/components/dashboard/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatDateTime, truncateId } from "@/lib/utils/format";
import { ArrowLeft, RotateCcw } from "lucide-react";

export default function RunDetailPage() {
  const params = useParams();
  const runId = params.id as string;
  const { data, isLoading, error } = useRunDetail(runId);

  if (error) {
    return <ErrorState message="Failed to load run details" />;
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const { summary, steps } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/app/runs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to runs
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-mono">
            {truncateId(summary.run_id, 16)}
          </h1>
          <StatusBadge status={summary.status} />
          {summary.replay_of && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <RotateCcw className="h-3 w-3" />
              Replay of {truncateId(summary.replay_of, 8)}
            </span>
          )}
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Agent</p>
            <p className="mt-0.5 text-sm font-medium">{summary.agent_name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Duration</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {formatDuration(summary.duration_ms)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Steps</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {summary.step_count}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tokens</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {summary.total_tokens.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          Started {formatDateTime(summary.started_at)}
          {summary.ended_at && <> · Ended {formatDateTime(summary.ended_at)}</>}
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="text-sm font-medium mb-3">
          Execution timeline ({steps.length} steps)
        </h2>
        <StepTimeline steps={steps} />
      </div>
    </div>
  );
}
