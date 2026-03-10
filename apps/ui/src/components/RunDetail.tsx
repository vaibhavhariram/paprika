import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchRunDetail } from "../api";
import type { RunDetailResponse } from "../types";
import { formatDuration, formatDateTime } from "../utils/format";
import StatusBadge from "./StatusBadge";
import StepRow from "./StepRow";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; data: RunDetailResponse };

export default function RunDetail() {
  const { runId } = useParams<{ runId: string }>();
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    setState({ kind: "loading" });

    fetchRunDetail(runId)
      .then((data) => {
        if (!cancelled) setState({ kind: "loaded", data });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ kind: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [runId]);

  if (state.kind === "loading") {
    return (
      <div className="text-zinc-500 py-20 text-center text-sm">
        Loading run...
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="py-20 text-center">
        <p className="text-red-400 text-sm mb-2">Failed to load run</p>
        <p className="text-zinc-500 text-xs font-mono mb-4">
          {state.message}
        </p>
        <Link
          to="/"
          className="text-xs text-zinc-400 hover:text-zinc-200 underline"
        >
          Back to runs
        </Link>
      </div>
    );
  }

  const { summary, steps } = state.data;

  return (
    <div>
      {/* Back link */}
      <Link
        to="/"
        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4 inline-block"
      >
        ← All runs
      </Link>

      {/* Summary header */}
      <div className="border border-zinc-800 rounded-lg p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-sm font-mono text-zinc-200 mb-1">
              {summary.run_id}
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-400">
                {summary.agent_name}
              </span>
              <StatusBadge status={summary.status} />
              {summary.replay_of && (
                <Link
                  to={`/runs/${summary.replay_of}`}
                  className="text-[11px] text-violet-400 border border-violet-800 rounded px-1.5 py-0.5 hover:bg-violet-900/30 transition-colors"
                  title={`Replay of ${summary.replay_of}`}
                >
                  replay of {summary.replay_of.slice(0, 12)}...
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-zinc-500 mb-0.5">Started</div>
            <div className="text-zinc-300 font-mono">
              {formatDateTime(summary.started_at)}
            </div>
          </div>
          {summary.ended_at && (
            <div>
              <div className="text-zinc-500 mb-0.5">Ended</div>
              <div className="text-zinc-300 font-mono">
                {formatDateTime(summary.ended_at)}
              </div>
            </div>
          )}
          <div>
            <div className="text-zinc-500 mb-0.5">Duration</div>
            <div className="text-zinc-300 font-mono">
              {formatDuration(summary.duration_ms)}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 mb-0.5">Steps / Tokens</div>
            <div className="text-zinc-300 font-mono">
              {summary.step_count} steps
              {summary.total_tokens > 0 &&
                ` · ${summary.total_tokens.toLocaleString()} tokens`}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-2">
        <h2 className="text-sm font-medium text-zinc-300 mb-3">Timeline</h2>
      </div>
      <div className="border border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-800/50">
        {steps.map((step, i) => (
          <StepRow key={`${step.step_index}-${step.type}-${i}`} step={step} />
        ))}
      </div>
    </div>
  );
}
