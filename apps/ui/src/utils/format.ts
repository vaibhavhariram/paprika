/** Format a duration in ms to a human-readable string. */
export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1) return `${Math.round(ms * 1000)}µs`;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

/** Format an ISO timestamp to a relative time string. */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffSec = Math.floor((now - date.getTime()) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString();
}

/** Format an ISO timestamp to a full datetime string. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** Truncate a run_id for display, showing first 12 chars. */
export function truncateId(id: string, len: number = 12): string {
  if (id.length <= len) return id;
  return id.slice(0, len) + "...";
}
