# Session Changes Summary

Compact reference for recent additions. Use for context when switching IDEs or onboarding.

---

## Support Agent Harness (New)

**Location:** `examples/playgrounds/`

| File | Purpose |
|------|---------|
| `support_agent_harness.py` | Product-like customer support validation harness using Paprika |
| `README.md` | Usage and scenario descriptions |

### Tools (mock, no API keys)

- `lookup_customer(email)` — returns mock customer data (customer_id, plan_tier, refund_history, risk_flag)
- `check_refund_eligibility(customer_id)` — business logic (eligible if < 3 refunds, not risk-flagged)
- `issue_refund(customer_id, amount)` — side-effecting; tracked for replay verification
- `send_email(email, subject, body)` — side-effecting; tracked for replay verification

### Scenarios (CLI)

```bash
support_agent_harness.py happy-path          # Normal flow; trace saved
support_agent_harness.py loop                # Triggers max_steps policy
support_agent_harness.py duplicate-action    # Same refund twice; trace clarity
support_agent_harness.py replay <run_id>     # No live side effects
support_agent_harness.py replay-mismatch <run_id>  # ReplayMismatchError
```

**Usage:**
```bash
PAPRIKA_TRACE_DIR=/tmp/harness uv run python examples/playgrounds/support_agent_harness.py happy-path
# Then use run_id for replay / replay-mismatch
```

### Implementation Notes

- Uses public API only: `PaprikaRuntime`, `PolicyConfig`
- All LLM calls use `provider="mock"`
- Script-driven agent: `_create_support_agent(runtime, script)` controls action sequence
- `SideEffectTracker` records refunds/emails; replay verifies list stays empty (stubs used)

### Git

- **Commit:** `8a29812` — feat: add support agent harness for product-like validation
- **Branch:** main
- **Remote:** pushed to origin/main
