export type TraceStepType =
  | "run_start"
  | "llm_call"
  | "tool_call"
  | "policy_check"
  | "halt"
  | "trace_write"
  | "run_end";

export type TraceStepStatus =
  | "ok"
  | "live"
  | "allowed"
  | "blocked"
  | "stubbed"
  | "mismatch"
  | "halted"
  | "written";

export type DemoScenarioId = "capture" | "policy" | "replay";

export type TraceStep = {
  step: number;
  timestamp: string;
  type: TraceStepType;
  label: string;
  provider?: string;
  model?: string;
  tool?: string;
  inputHash: string;
  outputHash?: string;
  tokens: number;
  latencyMs: number;
  status: TraceStepStatus;
  explanation: string;
  data: Record<string, unknown>;
};

export type ReplayPair = {
  step: number;
  original: TraceStep;
  replay: TraceStep;
  match: boolean;
  diff?: string;
};

export type DemoTrace = {
  id: DemoScenarioId;
  tabLabel: string;
  eyebrow: string;
  title: string;
  runId: string;
  status: string;
  statusTone: "success" | "warning" | "danger" | "info";
  summary: string;
  maxSteps: number;
  tokenBudget: number;
  policyConfig: string;
  code: string;
  steps: TraceStep[];
  replayPairs?: ReplayPair[];
};

const captureSteps: TraceStep[] = [
  {
    step: 1,
    timestamp: "10:42:01.004",
    type: "run_start",
    label: "support_triage started",
    inputHash: "4d7a91c2",
    tokens: 0,
    latencyMs: 3,
    status: "ok",
    explanation:
      "Paprika opens an execution record before the agent does any work. This gives the run a stable id and a place to attach every later LLM call, tool call, policy check, and final status.",
    data: {
      agent_name: "support_triage",
      run_id: "run_7f31a92c",
      policy: "standard_interview_demo",
    },
  },
  {
    step: 2,
    timestamp: "10:42:01.031",
    type: "policy_check",
    label: "preflight policy budget",
    inputHash: "d8bb6a10",
    tokens: 0,
    latencyMs: 6,
    status: "allowed",
    explanation:
      "The runtime checks the configured limits before the first live call. In a production agent, this is where Paprika prevents a run from starting outside its step or token budget.",
    data: {
      max_steps: 20,
      max_tokens: 50000,
      block_duplicate_input_hashes: true,
      decision: "allowed",
    },
  },
  {
    step: 3,
    timestamp: "10:42:01.188",
    type: "llm_call",
    label: "classify incoming customer ticket",
    provider: "openai",
    model: "gpt-4.1-mini",
    inputHash: "91be240f",
    outputHash: "b4a82077",
    tokens: 1184,
    latencyMs: 892,
    status: "live",
    explanation:
      "Paprika records the model, provider, prompt hash, output hash, latency, and token count. The prompt body can stay private while the hash still proves whether a later replay followed the same path.",
    data: {
      provider: "openai",
      model: "gpt-4.1-mini",
      input_hash: "91be240f",
      output_hash: "b4a82077",
      token_usage: { prompt_tokens: 844, completion_tokens: 340, total_tokens: 1184 },
      response: { priority: "high", next_action: "lookup_account" },
    },
  },
  {
    step: 4,
    timestamp: "10:42:02.115",
    type: "tool_call",
    label: "sql_query account health",
    tool: "sql_query",
    inputHash: "a3f9c2bd",
    outputHash: "620b803a",
    tokens: 0,
    latencyMs: 88,
    status: "live",
    explanation:
      "Tool arguments get the same treatment as LLM inputs. Here the SQL query is tied to hash a3f9c2bd, which lets Paprika detect duplicate side-effect risk later.",
    data: {
      tool_name: "sql_query",
      input_hash: "a3f9c2bd",
      args: {
        query: "select tier, renewal_date, open_incidents from accounts where id = $1",
        params: ["acct_20491"],
      },
      output: { tier: "enterprise", renewal_date: "2026-06-18", open_incidents: 2 },
    },
  },
  {
    step: 5,
    timestamp: "10:42:02.218",
    type: "policy_check",
    label: "duplicate input hash check",
    inputHash: "a3f9c2bd",
    tokens: 0,
    latencyMs: 5,
    status: "allowed",
    explanation:
      "The policy layer sees the SQL call hash for the first time and allows it. This is the config-to-enforcement link interviewers should notice: the trace shows both the call and the policy decision.",
    data: {
      policy_name: "block_duplicate_input_hashes",
      input_hash: "a3f9c2bd",
      seen_count: 1,
      decision: "allowed",
    },
  },
  {
    step: 6,
    timestamp: "10:42:02.330",
    type: "tool_call",
    label: "web_search incident history",
    tool: "web_search",
    inputHash: "77ca8e92",
    outputHash: "ad81c5f0",
    tokens: 0,
    latencyMs: 413,
    status: "live",
    explanation:
      "External tools are captured as structured events too. The trace gives a reviewer the exact query, a stable input hash, and the result summary without needing raw application logs.",
    data: {
      tool_name: "web_search",
      input_hash: "77ca8e92",
      args: { query: "Acme Cloud outage payment processor incident status" },
      output: { results: 4, top_result: "status.acmecloud.com/incidents/payments-2026-05" },
    },
  },
  {
    step: 7,
    timestamp: "10:42:02.773",
    type: "llm_call",
    label: "draft customer-safe summary",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    inputHash: "0e84cc12",
    outputHash: "992a10d4",
    tokens: 1629,
    latencyMs: 1264,
    status: "live",
    explanation:
      "This second model call uses a different provider and still lands in the same execution record. Paprika is tracking the runtime, not locking the agent into one model vendor.",
    data: {
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      input_hash: "0e84cc12",
      token_usage: { prompt_tokens: 1197, completion_tokens: 432, total_tokens: 1629 },
      output: { tone: "calm", escalation_needed: true },
    },
  },
  {
    step: 8,
    timestamp: "10:42:04.062",
    type: "policy_check",
    label: "token budget check",
    inputHash: "3ac10d91",
    tokens: 0,
    latencyMs: 4,
    status: "allowed",
    explanation:
      "Running token total is checked before the agent continues. The trace now shows 2,813 tokens used out of a 50,000 token budget.",
    data: {
      policy_name: "max_tokens",
      tokens_used: 2813,
      token_budget: 50000,
      decision: "allowed",
    },
  },
  {
    step: 9,
    timestamp: "10:42:04.121",
    type: "tool_call",
    label: "http_request create escalation draft",
    tool: "http_request",
    inputHash: "bc2e41a8",
    outputHash: "0f20e6ab",
    tokens: 0,
    latencyMs: 147,
    status: "live",
    explanation:
      "The outbound HTTP request is recorded with its method, path, and response status. If this were replayed, Paprika would return the recorded response instead of posting again.",
    data: {
      tool_name: "http_request",
      input_hash: "bc2e41a8",
      args: { method: "POST", path: "/internal/escalations/drafts", body: { account_id: "acct_20491" } },
      output: { status_code: 201, draft_id: "esc_draft_88d2" },
    },
  },
  {
    step: 10,
    timestamp: "10:42:04.292",
    type: "llm_call",
    label: "produce final triage decision",
    provider: "openai",
    model: "gpt-4.1-mini",
    inputHash: "f49d2b90",
    outputHash: "d56b7a90",
    tokens: 936,
    latencyMs: 741,
    status: "live",
    explanation:
      "The agent produces its final decision using the accumulated tool results. Paprika can now explain not just the answer, but the execution path that led to it.",
    data: {
      provider: "openai",
      model: "gpt-4.1-mini",
      input_hash: "f49d2b90",
      token_usage: { prompt_tokens: 712, completion_tokens: 224, total_tokens: 936 },
      output: { priority: "P1", route_to: "enterprise_support", confidence: 0.91 },
    },
  },
  {
    step: 11,
    timestamp: "10:42:05.058",
    type: "policy_check",
    label: "final step and token check",
    inputHash: "e23b1004",
    tokens: 0,
    latencyMs: 5,
    status: "allowed",
    explanation:
      "Before closing the run, Paprika records final counters: 11 of 20 steps and 3,749 of 50,000 tokens. This turns runtime behavior into inspectable evidence.",
    data: {
      steps_used: 11,
      max_steps: 20,
      tokens_used: 3749,
      max_tokens: 50000,
      decision: "allowed",
    },
  },
  {
    step: 12,
    timestamp: "10:42:05.081",
    type: "trace_write",
    label: "write execution record",
    inputHash: "c4d01b65",
    outputHash: "6dff0a28",
    tokens: 0,
    latencyMs: 19,
    status: "written",
    explanation:
      "The completed trace is persisted in an audit-ready JSON shape. That export can be attached to debugging notes, regression tests, or incident reviews.",
    data: {
      path: ".paprika/runs/run_7f31a92c.json",
      bytes: 18492,
      format: "paprika.execution_record.v1",
    },
  },
  {
    step: 13,
    timestamp: "10:42:05.104",
    type: "run_end",
    label: "support_triage completed",
    inputHash: "d56b7a90",
    outputHash: "e1a3f770",
    tokens: 0,
    latencyMs: 2,
    status: "ok",
    explanation:
      "The run ends successfully with a final status, duration, token total, and replayable trace. This is the basic proof that Paprika can observe an agent end to end.",
    data: {
      status: "completed",
      duration_ms: 4100,
      total_tokens: 3749,
      step_count: 13,
    },
  },
];

const policySteps: TraceStep[] = [
  {
    step: 1,
    timestamp: "11:17:22.010",
    type: "run_start",
    label: "refund_agent started",
    inputHash: "fd11a92e",
    tokens: 0,
    latencyMs: 3,
    status: "ok",
    explanation:
      "The run begins under a strict policy profile. The key rule here is block_duplicate_input_hashes, which protects tools from repeated side effects.",
    data: { agent_name: "refund_agent", run_id: "run_blocked_6139", policy: "strict_side_effects" },
  },
  {
    step: 2,
    timestamp: "11:17:22.030",
    type: "policy_check",
    label: "load strict runtime policy",
    inputHash: "15b90eca",
    tokens: 0,
    latencyMs: 4,
    status: "allowed",
    explanation:
      "Paprika records the exact policy config used for the run. This makes the later halt defensible, because the trace shows what rule was active when execution started.",
    data: {
      max_steps: 20,
      max_tokens: 50000,
      block_duplicate_input_hashes: true,
      duplicate_scope: "tool_call",
    },
  },
  {
    step: 3,
    timestamp: "11:17:22.194",
    type: "llm_call",
    label: "plan refund investigation",
    provider: "openai",
    model: "gpt-4.1-mini",
    inputHash: "7047d9a2",
    outputHash: "86b4d2ac",
    tokens: 1006,
    latencyMs: 804,
    status: "live",
    explanation:
      "The model decides to fetch payment details before issuing a refund. Paprika captures the prompt hash and token count before any tool with side effects is called.",
    data: {
      provider: "openai",
      model: "gpt-4.1-mini",
      input_hash: "7047d9a2",
      token_usage: { prompt_tokens: 771, completion_tokens: 235, total_tokens: 1006 },
      output: { next_tool: "http_request", endpoint: "/payments/pay_9130" },
    },
  },
  {
    step: 4,
    timestamp: "11:17:23.026",
    type: "tool_call",
    label: "http_request fetch payment",
    tool: "http_request",
    inputHash: "a3f9c2bd",
    outputHash: "120e9f77",
    tokens: 0,
    latencyMs: 132,
    status: "live",
    explanation:
      "This is the first tool call with input_hash a3f9c2bd. It is allowed because the hash has not appeared before in this run.",
    data: {
      tool_name: "http_request",
      input_hash: "a3f9c2bd",
      args: { method: "GET", path: "/payments/pay_9130" },
      output: { status_code: 200, amount: 4800, currency: "USD", refundable: true },
    },
  },
  {
    step: 5,
    timestamp: "11:17:23.178",
    type: "policy_check",
    label: "duplicate input hash check",
    inputHash: "a3f9c2bd",
    tokens: 0,
    latencyMs: 6,
    status: "allowed",
    explanation:
      "The duplicate check records seen_count 1 and lets the agent continue. This is why the later block is concrete instead of hand-wavy.",
    data: {
      policy_name: "block_duplicate_input_hashes",
      input_hash: "a3f9c2bd",
      seen_count: 1,
      decision: "allowed",
    },
  },
  {
    step: 6,
    timestamp: "11:17:23.240",
    type: "tool_call",
    label: "http_request fetch payment again",
    tool: "http_request",
    inputHash: "a3f9c2bd",
    outputHash: "blocked",
    tokens: 0,
    latencyMs: 1,
    status: "blocked",
    explanation:
      "The agent tries the same tool call again with the same input_hash a3f9c2bd. Paprika catches it before the HTTP request is sent.",
    data: {
      tool_name: "http_request",
      input_hash: "a3f9c2bd",
      args: { method: "GET", path: "/payments/pay_9130" },
      blocked_before_execution: true,
    },
  },
  {
    step: 7,
    timestamp: "11:17:23.244",
    type: "policy_check",
    label: "duplicate input hash blocked",
    inputHash: "a3f9c2bd",
    tokens: 0,
    latencyMs: 4,
    status: "blocked",
    explanation:
      "The policy check fires with seen_count 2 and decision blocked. The trace connects the rule, the repeated hash, and the exact step that caused termination.",
    data: {
      policy_name: "block_duplicate_input_hashes",
      input_hash: "a3f9c2bd",
      seen_count: 2,
      decision: "blocked",
      reason: "duplicate tool input hash",
    },
  },
  {
    step: 8,
    timestamp: "11:17:23.250",
    type: "halt",
    label: "halt duplicate side effect",
    inputHash: "a3f9c2bd",
    tokens: 0,
    latencyMs: 2,
    status: "halted",
    explanation:
      "Paprika halts the run at the runtime layer. The important part is that the duplicate tool call never reaches the external payment system.",
    data: {
      halted: true,
      error: "PolicyViolationError",
      message: "duplicate tool input hash a3f9c2bd blocked by policy",
    },
  },
  {
    step: 9,
    timestamp: "11:17:23.256",
    type: "trace_write",
    label: "persist blocked execution record",
    inputHash: "4e712bda",
    outputHash: "335a109e",
    tokens: 0,
    latencyMs: 17,
    status: "written",
    explanation:
      "Even failed or blocked runs are useful. Paprika preserves the halted trace so a reviewer can see the attempted repeat, the policy decision, and the absence of a second side effect.",
    data: {
      path: ".paprika/runs/run_blocked_6139.json",
      bytes: 13704,
      status: "policy_violation",
    },
  },
  {
    step: 10,
    timestamp: "11:17:23.292",
    type: "trace_write",
    label: "write policy violation snapshot",
    inputHash: "9841e8bd",
    outputHash: "30cc12a8",
    tokens: 0,
    latencyMs: 11,
    status: "written",
    explanation:
      "Paprika writes a compact violation snapshot with the repeated hash, the blocked tool name, and the policy that fired. This is the artifact an interviewer can imagine attaching to an incident review.",
    data: {
      violation_type: "duplicate_input_hash",
      blocked_step: 6,
      repeated_input_hash: "a3f9c2bd",
      policy_name: "block_duplicate_input_hashes",
    },
  },
  {
    step: 11,
    timestamp: "11:17:23.301",
    type: "trace_write",
    label: "index blocked hash for audit",
    inputHash: "0f9a812c",
    outputHash: "69e211df",
    tokens: 0,
    latencyMs: 9,
    status: "written",
    explanation:
      "The repeated hash is indexed so the blocked run can be searched or compared later. This keeps the enforcement event connected to the full execution record.",
    data: {
      indexed_fields: ["run_id", "policy_name", "input_hash", "tool_name", "blocked_at_step"],
      input_hash: "a3f9c2bd",
      tool_name: "http_request",
    },
  },
  {
    step: 12,
    timestamp: "11:17:23.318",
    type: "run_end",
    label: "refund_agent ended as blocked",
    inputHash: "335a109e",
    outputHash: "94cb2280",
    tokens: 0,
    latencyMs: 1,
    status: "halted",
    explanation:
      "The final status is policy_violation, with only 1,006 tokens spent and 10 recorded steps. The demo mirrors the hero story: halt early instead of looping into tens of thousands of tokens.",
    data: {
      status: "policy_violation",
      duration_ms: 1268,
      total_tokens: 1006,
      halted_at_step: 8,
    },
  },
];

const replayOriginalSteps: TraceStep[] = [
  {
    step: 1,
    timestamp: "14:05:09.001",
    type: "run_start",
    label: "research_agent original run",
    inputHash: "5a84b0f1",
    outputHash: "12bbd829",
    tokens: 0,
    latencyMs: 3,
    status: "ok",
    explanation:
      "This is the original execution record that replay will use as truth. Each later replay step has to align with these recorded inputs and outputs.",
    data: { run_id: "run_original_4c91", agent_name: "research_agent" },
  },
  {
    step: 2,
    timestamp: "14:05:09.044",
    type: "policy_check",
    label: "replayable policy profile",
    inputHash: "0bd930a2",
    tokens: 0,
    latencyMs: 5,
    status: "allowed",
    explanation:
      "The original run records the policy context too. This matters because replay can prove whether a future version of the agent still follows the same guarded path.",
    data: { max_steps: 20, max_tokens: 50000, replay_mode: false },
  },
  {
    step: 3,
    timestamp: "14:05:09.211",
    type: "llm_call",
    label: "plan research steps",
    provider: "openai",
    model: "gpt-4.1-mini",
    inputHash: "870bc1a4",
    outputHash: "fa0d5591",
    tokens: 1321,
    latencyMs: 974,
    status: "live",
    explanation:
      "The original model output is recorded. In replay, Paprika can return this output without making a live model request.",
    data: {
      provider: "openai",
      model: "gpt-4.1-mini",
      input_hash: "870bc1a4",
      output: { plan: ["search filings", "query revenue", "summarize risk"] },
    },
  },
  {
    step: 4,
    timestamp: "14:05:10.211",
    type: "tool_call",
    label: "web_search latest filing",
    tool: "web_search",
    inputHash: "46bf9c10",
    outputHash: "c0aa1321",
    tokens: 0,
    latencyMs: 512,
    status: "live",
    explanation:
      "The web search result is part of the trace. Replay should use this exact result so the agent can be debugged without depending on live web content.",
    data: { tool_name: "web_search", args: { query: "Northwind Robotics 10-Q 2026 revenue" }, output: { results: 5 } },
  },
  {
    step: 5,
    timestamp: "14:05:10.751",
    type: "llm_call",
    label: "extract filing fields",
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    inputHash: "b711e34a",
    outputHash: "e9381d50",
    tokens: 1848,
    latencyMs: 1381,
    status: "live",
    explanation:
      "This call converts retrieved evidence into structured fields. The recorded output becomes the replay stub.",
    data: { fields: { quarter: "Q1 2026", reported_revenue_m: 42.7, gross_margin: 0.61 } },
  },
  {
    step: 6,
    timestamp: "14:05:12.160",
    type: "policy_check",
    label: "token budget check",
    inputHash: "52ca1988",
    tokens: 0,
    latencyMs: 5,
    status: "allowed",
    explanation:
      "The original run remains under budget. Replay will keep the same counters but will not spend live provider tokens.",
    data: { tokens_used: 3169, max_tokens: 50000, decision: "allowed" },
  },
  {
    step: 7,
    timestamp: "14:05:12.190",
    type: "tool_call",
    label: "sql_query revenue table",
    tool: "sql_query",
    inputHash: "8cf40b21",
    outputHash: "51a55aa0",
    tokens: 0,
    latencyMs: 76,
    status: "live",
    explanation:
      "The database result is recorded with its output hash. This is the value replay will compare at the divergence point.",
    data: {
      tool_name: "sql_query",
      args: { query: "select revenue_m from quarterly_results where company=$1 and quarter=$2", params: ["northwind", "2026-Q1"] },
      output: { revenue_m: 42.7 },
    },
  },
  {
    step: 8,
    timestamp: "14:05:12.292",
    type: "llm_call",
    label: "draft answer from evidence",
    provider: "openai",
    model: "gpt-4.1-mini",
    inputHash: "f8c520d2",
    outputHash: "f8d9d2bb",
    tokens: 1197,
    latencyMs: 866,
    status: "live",
    explanation:
      "The answer is grounded in the recorded search and SQL outputs. If those inputs change in replay, Paprika should flag the exact row.",
    data: { output: { answer: "Revenue was $42.7M in Q1 2026.", confidence: 0.88 } },
  },
  {
    step: 9,
    timestamp: "14:05:13.186",
    type: "tool_call",
    label: "http_request verify CRM account",
    tool: "http_request",
    inputHash: "29c1ab77",
    outputHash: "6b4a1102",
    tokens: 0,
    latencyMs: 184,
    status: "live",
    explanation:
      "This original HTTP response says the account tier is enterprise. In the replay scenario, the injected mismatch changes this value, which is exactly what Paprika should catch.",
    data: {
      tool_name: "http_request",
      args: { method: "GET", path: "/crm/accounts/northwind" },
      output: { account_tier: "enterprise", owner: "Strategic Accounts" },
    },
  },
  {
    step: 10,
    timestamp: "14:05:13.398",
    type: "policy_check",
    label: "final replay-safety check",
    inputHash: "bdcf0920",
    tokens: 0,
    latencyMs: 4,
    status: "allowed",
    explanation:
      "The original run passes final policy checks. In replay, this row should align unless execution has already diverged.",
    data: { duplicate_hashes: 0, steps_used: 10, decision: "allowed" },
  },
  {
    step: 11,
    timestamp: "14:05:13.438",
    type: "trace_write",
    label: "write original trace",
    inputHash: "99a4b1f2",
    outputHash: "f294c710",
    tokens: 0,
    latencyMs: 21,
    status: "written",
    explanation:
      "The original execution record is now durable and can be used later for deterministic replay or regression testing.",
    data: { path: ".paprika/runs/run_original_4c91.json", bytes: 20312 },
  },
  {
    step: 12,
    timestamp: "14:05:13.463",
    type: "run_end",
    label: "research_agent completed",
    inputHash: "f294c710",
    outputHash: "acc421e0",
    tokens: 0,
    latencyMs: 2,
    status: "ok",
    explanation:
      "The original run completed successfully. The replay demo uses this trace to prove deterministic re-execution and mismatch detection.",
    data: { status: "completed", total_tokens: 4366, duration_ms: 4462 },
  },
];

const replaySteps: TraceStep[] = replayOriginalSteps.map((step) => ({
  ...step,
  timestamp: step.timestamp.replace("14:05", "14:22"),
  latencyMs: step.type === "llm_call" || step.type === "tool_call" ? Math.max(3, Math.round(step.latencyMs / 90)) : step.latencyMs,
  tokens: step.type === "llm_call" ? 0 : step.tokens,
  status: step.type === "llm_call" || step.type === "tool_call" ? "stubbed" : step.status,
  explanation:
    step.type === "llm_call" || step.type === "tool_call"
      ? "During replay, Paprika returns the recorded output for this step instead of calling the live provider or tool. The row still aligns with the original input hash so the run remains deterministic."
      : step.explanation,
  data: {
    ...step.data,
    replay_mode: true,
    source: step.type === "llm_call" || step.type === "tool_call" ? "stubbed_from_trace" : "runtime",
  },
}));

replaySteps[8] = {
  ...replaySteps[8],
  outputHash: "d9270c13",
  status: "mismatch",
  explanation:
    "This replayed tool output does not match the original trace. Paprika flags the divergence at step 9, before the agent can continue with a false assumption.",
  data: {
    tool_name: "http_request",
    args: { method: "GET", path: "/crm/accounts/northwind" },
    original_output: { account_tier: "enterprise", owner: "Strategic Accounts" },
    replay_output: { account_tier: "self_serve", owner: "Growth Queue" },
    expected_output_hash: "6b4a1102",
    actual_output_hash: "d9270c13",
    error: "ReplayMismatchError",
  },
};

export const demoTraces: DemoTrace[] = [
  {
    id: "capture",
    tabLabel: "Trace capture",
    eyebrow: "Scenario 1",
    title: "Watch a normal agent run become an execution record.",
    runId: "run_7f31a92c",
    status: "Completed",
    statusTone: "success",
    summary:
      "A support triage agent classifies a ticket, queries internal data, checks policy thresholds, and writes a replayable trace.",
    maxSteps: 20,
    tokenBudget: 50000,
    policyConfig:
      "PolicyConfig(max_steps=20, max_tokens=50000, block_duplicate_input_hashes=True)",
    code: `runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,
        max_tokens=50000,
        block_duplicate_input_hashes=True,
    )
)

@runtime.agent(name="support_triage")
def triage(ctx, ticket):
    plan = ctx.llm.call(provider="openai", model="gpt-4.1-mini", input=ticket)
    account = ctx.tools.call("sql_query", {"account_id": plan.account_id})
    return ctx.llm.call(provider="anthropic", model="claude-sonnet-4-5", input=account)`,
    steps: captureSteps,
  },
  {
    id: "policy",
    tabLabel: "Policy enforcement",
    eyebrow: "Scenario 2",
    title: "Block a repeated tool call before it becomes a side effect.",
    runId: "run_blocked_6139",
    status: "Blocked",
    statusTone: "danger",
    summary:
      "A refund agent repeats an HTTP request with the same input hash. Paprika records the duplicate, blocks the second call, and halts the run.",
    maxSteps: 20,
    tokenBudget: 50000,
    policyConfig:
      "PolicyConfig(max_steps=20, max_tokens=50000, block_duplicate_input_hashes=True)",
    code: `runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=20,
        max_tokens=50000,
        block_duplicate_input_hashes=True,
    )
)

@runtime.agent(name="refund_agent")
def refund(ctx, request):
    payment = ctx.tools.call("http_request", {"method": "GET", "path": "/payments/pay_9130"})
    repeated = ctx.tools.call("http_request", {"method": "GET", "path": "/payments/pay_9130"})
    return repeated`,
    steps: policySteps,
  },
  {
    id: "replay",
    tabLabel: "Safe replay diff",
    eyebrow: "Scenario 3",
    title: "Replay a prior run and catch a trace divergence.",
    runId: "run_replay_4c91",
    status: "Mismatch detected",
    statusTone: "warning",
    summary:
      "The replay uses recorded outputs for LLM and tool calls. At step 9, a tool output differs from the original trace, so Paprika flags the divergence.",
    maxSteps: 20,
    tokenBudget: 50000,
    policyConfig:
      "PolicyConfig(max_steps=20, max_tokens=50000, block_duplicate_input_hashes=True)",
    code: `original = runtime.run(research_agent, question)

replayed = runtime.replay(
    original.run_id,
    fail_on_mismatch=True,
)

# Step 9 raises ReplayMismatchError when the tool output diverges.`,
    steps: replaySteps,
    replayPairs: replayOriginalSteps.map((original, index) => ({
      step: original.step,
      original,
      replay: replaySteps[index],
      match: index !== 8,
      diff:
        index === 8
          ? "Original account_tier=enterprise, replay account_tier=self_serve"
          : undefined,
    })),
  },
];
