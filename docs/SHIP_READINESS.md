# Paprika v1 — Ship-Readiness Report

## Executive Summary

Paprika v1 is **ready for first pilot users** with clear limitations documented. The core functionality (trace recording, policy enforcement, replay, CLI inspection) is implemented, tested, and verifiable. Recommended next step: merge stabilization to `main`, tag `v0.1.0`, and onboard 1–2 pilot users with explicit expectations.

---

## What Is Complete and Credible

| Area | Status | Evidence |
|------|--------|----------|
| Runtime core | ✅ Complete | `runtime.py`, 62+ tests |
| Trace recording | ✅ Complete | JSON events, LocalTraceStore |
| Policy enforcement | ✅ Complete | max_steps, max_tokens, max_repeat_hashes |
| Replay engine | ✅ Complete | Stubbed LLM/tool outputs, hash matching |
| CLI (list, inspect, diff) | ✅ Complete | Typer commands |
| LLM adapter | ✅ Complete | OpenAI-compatible + mock provider |
| Tool adapter | ✅ Complete | Registry, recording |
| Examples | ✅ Complete | basic_agent, policy_violation, replay_demo |
| Manual verification | ✅ Complete | docs/MANUAL_VERIFICATION.md |
| CI | ✅ Complete | ruff, mypy, pytest on 3.11–3.13 |

---

## What Is Risky or Brittle

1. **Trace store load by prefix** — New prefix matching may collide if UUIDs share prefixes; acceptable for v1.
2. **Mock LLM provider** — Uses `_mock_response` / `_mock_usage` keys in `input`; undocumented but stable.
3. **Run ID in list** — Full UUID can be long; some terminals may wrap. Consider truncation option in v1.1.
4. **PAPRIKA_TRACE_DIR** — Env var is optional; if set to invalid path, errors may be opaque.

---

## Assumptions Needing Real User Validation

- **Agent registration model** — Single runtime with `@agent()` decorator and `register_tool()` is sufficient for pilot workflows.
- **Tool call signature** — `ctx.tools.call(name=..., args={...})` is acceptable; no positional or variadic args.
- **Trace volume** — Local JSON files scale to hundreds of runs; thousands may need cleanup or archival.
- **Replay from Python only** — No CLI `replay` command; users run `runtime.replay(run_id)` from scripts. Acceptable for pilots.

---

## Top 5 Gaps / Weaknesses

1. **No `paprika runs replay` CLI command** — Spec mentioned it; only programmatic replay exists. Workaround: `replay_demo.py`.
2. **LLM adapter tightly coupled** — No pluggable adapter interface; extending to Anthropic, etc. requires code changes.
3. **Trace format not versioned** — Future schema changes may break backward compatibility.
4. **No trace retention / pruning** — Traces accumulate; users must manually delete or archive.
5. **Limited error messages** — Some failures (e.g. replay mismatch) could be more actionable.

---

## v1.1 Priority List

1. **CLI replay** — `paprika runs replay <run_id> --entry module:get_runtime` (or similar) for demos.
2. **Trace schema version** — Add `schema_version` field and migration path.
3. **Adapter interface** — Abstract LLM/Tool adapters for pluggable backends.
4. **Trace pruning** — Configurable retention (e.g. keep last N runs).
5. **Improved ReplayMismatchError** — Show expected vs actual at step, with snippet.

---

## Git / Repo Hygiene Assessment

**Current state (as of stabilization):**

- **Branch:** `milestone-0/scaffold` (feature branch)
- **Untracked:** `docs/` (PAPRIKA_DOCUMENTATION.MD, MANUAL_VERIFICATION.md, SHIP_READINESS.md)
- **History:** 4 commits, linear; no force-push or messy history

**Recommended workflow:**

1. **Add and commit docs:**
   ```bash
   git add docs/
   git add examples/
   git add src/ README.md
   git status  # review
   git commit -m "chore: post-MVP stabilization — docs, examples, manual verification"
   ```

2. **Merge to main:**
   ```bash
   git checkout main
   git merge milestone-0/scaffold --no-ff -m "Merge milestone-0: MVP + stabilization"
   ```

3. **Tag release:**
   ```bash
   git tag -a v0.1.0 -m "Paprika v0.1.0 — MVP with execution control, traces, replay, CLI"
   git push origin main --tags
   ```

4. **Optional:** Delete or archive `milestone-0/scaffold` after merge.

**Do NOT:** Rewrite history. The current history is clean.

---

## Ready for First Pilot?

**Yes**, with these conditions:

- Share README, examples, and MANUAL_VERIFICATION with pilots.
- Set expectation: "Local SDK, no hosted features; feedback on ergonomics and gaps."
- Track: which policies they use, whether replay is valuable, and pain points.

---

*Report generated as part of post-MVP stabilization pass.*
