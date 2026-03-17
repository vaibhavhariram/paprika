"use client";

import Link from "next/link";
import { StatusBadge } from "./status-badge";
import { formatRelativeTime, truncateId, formatDuration } from "@/lib/utils/format";
import { RotateCcw } from "lucide-react";
import type { RunSummary } from "@/lib/api/types";

interface RunsTableProps {
  runs: RunSummary[];
  compact?: boolean;
}

export function RunsTable({ runs, compact = false }: RunsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Run ID</th>
            <th className="pb-2 pr-4 font-medium">Agent</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            {!compact && <th className="pb-2 pr-4 font-medium">Steps</th>}
            {!compact && <th className="pb-2 pr-4 font-medium">Tokens</th>}
            <th className="pb-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run.run_id}
              className="border-b border-border/50 transition-colors hover:bg-muted/50"
            >
              <td className="py-2.5 pr-4">
                <Link
                  href={`/app/runs/${run.run_id}`}
                  className="font-mono text-xs hover:underline"
                >
                  {truncateId(run.run_id)}
                </Link>
                {run.replay_of && (
                  <RotateCcw className="ml-1.5 inline-block h-3 w-3 text-muted-foreground" />
                )}
              </td>
              <td className="py-2.5 pr-4 text-muted-foreground">
                {run.agent_name}
              </td>
              <td className="py-2.5 pr-4">
                <StatusBadge status={run.status} />
              </td>
              {!compact && (
                <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                  {run.step_count}
                </td>
              )}
              {!compact && (
                <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">
                  {run.total_tokens.toLocaleString()}
                </td>
              )}
              <td className="py-2.5 text-muted-foreground">
                {formatRelativeTime(run.started_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
