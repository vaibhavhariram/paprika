"use client";

import { useRuns } from "@/lib/api/hooks";
import { RunsTable } from "@/components/dashboard/runs-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { RotateCcw } from "lucide-react";

export default function ReplayPage() {
  const { runs, isLoading, error, mutate } = useRuns(100);

  if (error) {
    return <ErrorState onRetry={() => mutate()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg">Replay</h1>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const replayRuns = runs.filter((r) => r.replay_of !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg">Replay</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Deterministic replay re-executes a prior run using cached outputs.
          Mismatches are detected when the agent&apos;s behavior diverges from the recorded trace.
        </p>
      </div>

      {replayRuns.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No replay runs"
          description="Use runtime.replay(run_id) to replay a prior run. Replay traces will appear here."
        />
      ) : (
        <div>
          <h2 className="text-sm font-medium mb-3">
            Replay runs ({replayRuns.length})
          </h2>
          <RunsTable runs={replayRuns} />
        </div>
      )}
    </div>
  );
}
