const statusStyles: Record<string, string> = {
  success: "bg-emerald-900/50 text-emerald-400 border-emerald-800",
  error: "bg-red-900/50 text-red-400 border-red-800",
  policy_violation: "bg-amber-900/50 text-amber-400 border-amber-800",
  unknown: "bg-zinc-800 text-zinc-400 border-zinc-700",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] ?? statusStyles.unknown;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${style}`}
    >
      {status}
    </span>
  );
}
