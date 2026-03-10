import type { TimelineStep } from "../types";
import { formatDuration } from "../utils/format";
import JsonViewer from "./JsonViewer";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex gap-3 text-xs">
      <span className="text-zinc-500 min-w-[80px] shrink-0">{label}</span>
      <span className="text-zinc-300 font-mono break-all">{value}</span>
    </div>
  );
}

function LLMCallDetail({ detail }: { detail: Record<string, unknown> }) {
  const tokenUsage = detail.token_usage as Record<string, number> | null;
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Field label="Provider" value={detail.provider as string} />
        <Field label="Model" value={detail.model as string} />
        <Field label="Hash" value={detail.input_hash as string} />
        <Field
          label="Duration"
          value={formatDuration(detail.duration_ms as number | null)}
        />
        {tokenUsage && (
          <Field
            label="Tokens"
            value={`${tokenUsage.prompt_tokens} prompt + ${tokenUsage.completion_tokens} completion = ${tokenUsage.total_tokens} total`}
          />
        )}
      </div>
      {detail.input_data != null && (
        <JsonViewer data={detail.input_data} label="Input" />
      )}
      {detail.output_data != null && (
        <JsonViewer data={detail.output_data} label="Output" />
      )}
    </div>
  );
}

function ToolCallDetail({ detail }: { detail: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Field label="Tool" value={detail.tool_name as string} />
        <Field label="Hash" value={detail.input_hash as string} />
        <Field
          label="Duration"
          value={formatDuration(detail.duration_ms as number | null)}
        />
      </div>
      {detail.args != null && <JsonViewer data={detail.args} label="Args" />}
      {detail.output_data != null && (
        <JsonViewer data={detail.output_data} label="Output" />
      )}
    </div>
  );
}

function PolicyViolationDetail({
  detail,
}: {
  detail: Record<string, unknown>;
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Field label="Policy" value={detail.policy_name as string} />
        <Field label="Message" value={detail.message as string} />
      </div>
      {detail.details != null &&
        Object.keys(detail.details as object).length > 0 && (
          <JsonViewer data={detail.details} label="Details" />
        )}
    </div>
  );
}

function RunStartDetail({ detail }: { detail: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      <Field label="Agent" value={detail.agent_name as string} />
      {detail.input_args != null &&
        Object.keys(detail.input_args as object).length > 0 && (
          <JsonViewer data={detail.input_args} label="Input args" />
        )}
    </div>
  );
}

function RunEndDetail({ detail }: { detail: Record<string, unknown> }) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Field label="Status" value={detail.status as string} />
        {detail.total_tokens != null && (detail.total_tokens as number) > 0 && (
          <Field
            label="Tokens"
            value={(detail.total_tokens as number).toLocaleString()}
          />
        )}
        {detail.error != null && (
          <Field label="Error" value={detail.error as string} />
        )}
      </div>
      {detail.output != null && (
        <JsonViewer data={detail.output} label="Output" />
      )}
    </div>
  );
}

export default function StepDetailPanel({ step }: { step: TimelineStep }) {
  const { type, detail } = step;

  return (
    <div className="px-4 py-3 bg-zinc-900/50 border-t border-zinc-800/50">
      {type === "llm_call" && <LLMCallDetail detail={detail} />}
      {type === "tool_call" && <ToolCallDetail detail={detail} />}
      {type === "policy_violation" && <PolicyViolationDetail detail={detail} />}
      {type === "run_start" && <RunStartDetail detail={detail} />}
      {type === "run_end" && <RunEndDetail detail={detail} />}
    </div>
  );
}
