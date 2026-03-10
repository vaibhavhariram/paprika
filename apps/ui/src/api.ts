import type { RunsResponse, RunDetailResponse } from "./types";

const BASE = "/api";

export async function fetchRuns(limit: number = 20): Promise<RunsResponse> {
  const res = await fetch(`${BASE}/runs?limit=${limit}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch runs: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRunDetail(runId: string): Promise<RunDetailResponse> {
  const res = await fetch(`${BASE}/runs/${encodeURIComponent(runId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch run: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
