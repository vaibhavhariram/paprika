"use client";

import { useState } from "react";
import { useRuns } from "@/lib/api/hooks";
import { RunsTable } from "@/components/dashboard/runs-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { List } from "lucide-react";

const LIMITS = [20, 50, 100] as const;

export default function RunsPage() {
  const [limit, setLimit] = useState<number>(20);
  const { runs, isLoading, error, mutate } = useRuns(limit);

  if (error) {
    return <ErrorState onRetry={() => mutate()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg">Runs</h1>
        <div className="flex items-center gap-1">
          {LIMITS.map((l) => (
            <Button
              key={l}
              variant={limit === l ? "outline" : "ghost"}
              size="sm"
              onClick={() => setLimit(l)}
            >
              {l}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-10 rounded-md" />
          ))}
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          icon={List}
          title="No runs found"
          description="Run an agent with Paprika to see execution traces here."
        />
      ) : (
        <RunsTable runs={runs} />
      )}
    </div>
  );
}
