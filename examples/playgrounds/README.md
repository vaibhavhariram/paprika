# Playgrounds

Validation harnesses for Paprika. **Not part of Paprika core** — isolated examples only.

---

## Support Agent Harness

Realistic customer support workflow: lookup → eligibility → refund/email.

```bash
# All scenarios use ~/.paprika/playground or PAPRIKA_TRACE_DIR
uv run python examples/playgrounds/support_agent_harness.py happy-path
uv run python examples/playgrounds/support_agent_harness.py loop
uv run python examples/playgrounds/support_agent_harness.py duplicate-action

# Replay requires run_id from a prior happy-path run
uv run python examples/playgrounds/support_agent_harness.py replay <run_id>
uv run python examples/playgrounds/support_agent_harness.py replay-mismatch <run_id>
```

### Scenarios

| Scenario | Purpose |
|----------|---------|
| happy-path | Normal flow; trace saved |
| loop | Runaway behavior; triggers max_steps policy |
| duplicate-action | Same refund twice; tests trace clarity and replay safety |
| replay | Replay prior run; verifies no live side effects |
| replay-mismatch | Divergent path; triggers ReplayMismatchError |

### Tools (mock)

- `lookup_customer(email)` — mock customer data
- `check_refund_eligibility(customer_id)` — business logic
- `issue_refund(customer_id, amount)` — side-effecting; tracked
- `send_email(email, subject, body)` — side-effecting; tracked

Uses `provider="mock"` for all LLM calls — no API keys or network.
