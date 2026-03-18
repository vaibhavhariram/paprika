/** Summary of a single run, returned by GET /api/runs */
export interface RunSummary {
  run_id: string;
  agent_name: string;
  started_at: string;
  status: string;
  step_count: number;
  total_tokens: number;
  replay_of: string | null;
}

/** Response shape from GET /api/runs */
export interface RunsResponse {
  runs: RunSummary[];
}

/** Detail of a timeline step, returned by GET /api/runs/:id */
export interface TimelineStep {
  type: "run_start" | "run_end" | "llm_call" | "tool_call" | "policy_violation";
  step_index: number;
  label: string;
  timestamp: string | null;
  duration_ms?: number | null;
  tokens?: number | null;
  detail: Record<string, unknown>;
}

/** Summary within a run detail response */
export interface RunDetailSummary {
  run_id: string;
  agent_name: string;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  status: string;
  total_tokens: number;
  step_count: number;
  replay_of: string | null;
}

/** Response shape from GET /api/runs/:id */
export interface RunDetailResponse {
  summary: RunDetailSummary;
  steps: TimelineStep[];
}
