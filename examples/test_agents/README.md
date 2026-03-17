# Test Agents

A realistic testbed for Paprika using deterministic fake tools and a mock LLM.
All agents run fully offline with no external dependencies beyond Paprika itself.

## Agents

| Agent | What it demonstrates |
|---|---|
| `looping_agent` | Tight loop that triggers `max_steps` policy violation |
| `wrong_decision_agent` | Refunds a risk-flagged customer (Bob) — trace shows the bad decision path |
| `support_workflow_agent` | Happy-path refund for Alice, plus replay and replay-mismatch demos |

## Directory layout

```
examples/test_agents/
├── agents/
│   ├── common.py                  # Shared runtime factory, tool registration
│   ├── looping_agent.py
│   ├── wrong_decision_agent.py
│   └── support_workflow_agent.py
├── tools/
│   ├── fake_search.py             # Deterministic KB search
│   ├── fake_customer_db.py        # Customer lookup, subscription, eligibility
│   ├── fake_policy_docs.py        # Policy retrieval and search
│   └── fake_actions.py            # Refund, email, escalation + SideEffectTracker
├── scripts/
│   ├── run_looping.sh
│   ├── run_wrong_decision.sh
│   └── run_support_workflow.sh
└── traces/                        # Trace output (gitignored via .gitkeep)
```

## Running the agents

All commands assume you are in the Paprika repo root and have Paprika installed
(e.g. `uv sync` or `pip install -e .`).

### Option A: Shell scripts

```bash
# Looping agent (triggers max_steps policy violation)
./examples/test_agents/scripts/run_looping.sh

# Wrong decision agent (refunds risk-flagged Bob)
./examples/test_agents/scripts/run_wrong_decision.sh

# Support workflow — happy path (refunds eligible Alice)
./examples/test_agents/scripts/run_support_workflow.sh happy

# Support workflow — replay a prior run
./examples/test_agents/scripts/run_support_workflow.sh replay <RUN_ID>

# Support workflow — replay-mismatch demo
./examples/test_agents/scripts/run_support_workflow.sh mismatch
```

### Option B: Direct Python

```bash
cd examples/test_agents
export PYTHONPATH="$(pwd):$PYTHONPATH"

python -m agents.looping_agent
python -m agents.wrong_decision_agent
python -m agents.support_workflow_agent
python -m agents.support_workflow_agent --replay <RUN_ID>
python -m agents.support_workflow_agent --replay-mismatch
```

## Traces

Traces are written to `examples/test_agents/traces/` by default.
Override with `PAPRIKA_TRACE_DIR`:

```bash
export PAPRIKA_TRACE_DIR=/tmp/my-traces
```

Inspect traces with the Paprika CLI:

```bash
paprika runs list
paprika runs inspect <RUN_ID>
```

## Fake tools

All tools return deterministic results with no network or database calls:

- **fake_search** — keyword search over a small knowledge base
- **fake_customer_db** — two hardcoded customers: Alice (clean) and Bob (risk-flagged)
- **fake_policy_docs** — refund, escalation, and privacy policies
- **fake_actions** — `issue_refund`, `send_email`, `escalate_ticket` with a `SideEffectTracker` that records all actions for later inspection
