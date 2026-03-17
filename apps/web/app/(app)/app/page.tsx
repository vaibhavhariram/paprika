"use client";

import Link from "next/link";
import { useRuns } from "@/lib/api/hooks";
import { RunsTable } from "@/components/dashboard/runs-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Zap, AlertTriangle, Hash } from "lucide-react";

export default function DashboardPage() {
  const { runs, isLoading, error, mutate } = useRuns(20);

  if (error) {
    return <ErrorState onRetry={() => mutate()} />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg">Overview</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  const totalRuns = runs.length;
  const successRuns = runs.filter((r) => r.status === "success").length;
  const violations = runs.filter((r) => r.status === "policy_violation").length;
  const totalTokens = runs.reduce((sum, r) => sum + r.total_tokens, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-lg">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total runs" value={totalRuns} icon={Activity} />
        <StatCard label="Successful" value={successRuns} icon={Zap} />
        <StatCard label="Violations" value={violations} icon={AlertTriangle} />
        <StatCard
          label="Total tokens"
          value={totalTokens.toLocaleString()}
          icon={Hash}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium">Recent runs</h2>
          <Link
            href="/app/runs"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </Link>
        </div>
        {runs.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No runs yet"
            description="Run an agent with Paprika to see execution traces here."
          />
        ) : (
          <RunsTable runs={runs.slice(0, 5)} compact />
        )}
      </div>
    </div>
  );
}
