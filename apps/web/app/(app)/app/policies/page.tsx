"use client";

import { useRuns } from "@/lib/api/hooks";
import { RunsTable } from "@/components/dashboard/runs-table";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ErrorState } from "@/components/dashboard/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Timer, Hash, RotateCcw } from "lucide-react";

const policyDescriptions = [
  {
    name: "max_steps",
    icon: Timer,
    title: "Maximum steps",
    description:
      "Limits the total number of LLM and tool calls in a single agent run. Prevents runaway loops.",
  },
  {
    name: "max_tokens",
    icon: Hash,
    title: "Maximum tokens",
    description:
      "Limits cumulative token usage across all LLM calls. Controls cost and prevents unbounded generation.",
  },
  {
    name: "max_repeat_hashes",
    icon: RotateCcw,
    title: "Maximum repeat hashes",
    description:
      "Limits how many times the same input can be sent to an LLM. Detects infinite loops from identical prompts.",
  },
];

export default function PoliciesPage() {
  const { runs, isLoading, error, mutate } = useRuns(100);

  if (error) {
    return <ErrorState onRetry={() => mutate()} />;
  }

  const violations = runs.filter((r) => r.status === "policy_violation");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg">Policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime policies enforce execution limits on agent runs.
          When a policy is violated, execution halts and the violation is recorded in the trace.
        </p>
      </div>

      {/* Policy descriptions */}
      <div className="grid gap-4 sm:grid-cols-3">
        {policyDescriptions.map((policy) => (
          <div key={policy.name} className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <policy.icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{policy.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {policy.description}
            </p>
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {policy.name}
            </p>
          </div>
        ))}
      </div>

      {/* Recent violations */}
      <div>
        <h2 className="text-sm font-medium mb-3">
          Recent violations ({violations.length})
        </h2>
        {isLoading ? (
          <Skeleton className="h-32 rounded-lg" />
        ) : violations.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No violations"
            description="No policy violations have been recorded. Policies are enforced automatically at runtime."
          />
        ) : (
          <RunsTable runs={violations} />
        )}
      </div>
    </div>
  );
}
