import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRuns } from "../api";
import type { RunSummary } from "../types";
import { formatRelativeTime, formatDateTime, truncateId } from "../utils/format";
import StatusBadge from "./StatusBadge";

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "loaded"; runs: RunSummary[] };

const LIMITS = [20, 50, 100] as const;

export default function RunsList() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [limit, setLimit] = useState<number>(20);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });

    fetchRuns(limit)
      .then((data) => {
        if (!cancelled) setState({ kind: "loaded", runs: data.runs });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ kind: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (state.kind === "loading") {
    return (
      <div className="text-zinc-500 py-20 text-center text-sm">
        Loading runs...
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="py-20 text-center">
        <p className="text-red-400 text-sm mb-2">Failed to load runs</p>
        <p className="text-zinc-500 text-xs font-mono">{state.message}</p>
      </div>
    );
  }

  const { runs } = state;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-zinc-300">Recent Runs</h2>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>Show</span>
          {LIMITS.map((l) => (
            <button
              key={l}
              onClick={() => setLimit(l)}
              className={`px-2 py-0.5 rounded ${
                limit === l
                  ? "bg-zinc-700 text-zinc-200"
                  : "hover:bg-zinc-800 text-zinc-500"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="text-zinc-500 py-20 text-center text-sm">
          No runs found. Run an agent with Paprika to see traces here.
        </div>
      ) : (
        <div className="border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                <th className="text-left px-4 py-2 font-medium">Run ID</th>
                <th className="text-left px-4 py-2 font-medium">Agent</th>
                <th className="text-left px-4 py-2 font-medium">Started</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-right px-4 py-2 font-medium">Steps</th>
                <th className="text-right px-4 py-2 font-medium">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr
                  key={run.run_id}
                  onClick={() => navigate(`/runs/${run.run_id}`)}
                  className="border-b border-zinc-800/50 hover:bg-zinc-900 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-2.5 font-mono text-xs text-zinc-300">
                    <span title={run.run_id}>{truncateId(run.run_id)}</span>
                    {run.replay_of && (
                      <span
                        className="ml-2 text-[10px] text-violet-400 border border-violet-800 rounded px-1"
                        title={`Replay of ${run.replay_of}`}
                      >
                        replay
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300">{run.agent_name}</td>
                  <td
                    className="px-4 py-2.5 text-zinc-500"
                    title={formatDateTime(run.started_at)}
                  >
                    {formatRelativeTime(run.started_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                    {run.step_count}
                  </td>
                  <td className="px-4 py-2.5 text-right text-zinc-400 tabular-nums">
                    {run.total_tokens > 0 ? run.total_tokens.toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
