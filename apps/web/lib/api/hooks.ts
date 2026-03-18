"use client";

import useSWR from "swr";
import { fetchRuns, fetchRunDetail } from "./client";
import type { RunsResponse, RunDetailResponse } from "./types";

export function useRuns(limit: number = 20) {
  const { data, error, isLoading, mutate } = useSWR<RunsResponse>(
    `/api/runs?limit=${limit}`,
    () => fetchRuns(limit),
    {
      refreshInterval: 10000,
      revalidateOnFocus: true,
    }
  );

  return {
    runs: data?.runs ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useRunDetail(runId: string | null) {
  const { data, error, isLoading } = useSWR<RunDetailResponse>(
    runId ? `/api/runs/${runId}` : null,
    () => (runId ? fetchRunDetail(runId) : Promise.reject("No run ID")),
    {
      revalidateOnFocus: false,
    }
  );

  return {
    data,
    isLoading,
    error,
  };
}
