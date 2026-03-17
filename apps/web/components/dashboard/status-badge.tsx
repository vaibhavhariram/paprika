import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  success: "bg-success/15 text-success",
  error: "bg-error/15 text-error",
  policy_violation: "bg-warning/15 text-warning",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statusStyles[status] ?? "bg-muted text-muted-foreground"
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}
