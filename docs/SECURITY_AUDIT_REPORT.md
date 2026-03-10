# Paprika — Full Repository Security & Infrastructure Audit

**Date:** March 2026  
**Scope:** Entire repository (src/paprika/, adapters, runtime, replay, trace storage, CLI, examples, Next.js marketing site, packaging, CI)  
**Mode:** Read-only audit — no code changes made

---

## Executive Summary

The Paprika codebase is **moderately ready** for pilot use with **one critical security vulnerability** that must be fixed before any production or multi-user deployment. The core execution control (runtime, policy, replay, adapters) is well-structured and follows sound patterns. Trace storage, CLI, and packaging have specific issues to address.

**Critical finding:** Directory traversal via unvalidated `run_id` in `LocalTraceStore.load()`, `delete()`, and `glob()` — allows reading or deleting files outside the trace directory when `run_id` is user-supplied (CLI, `--replay` flag, programmatic API).

**Strengths:** Clean separation of concerns, Pydantic for validation, no subprocess/shell execution, no obvious injection paths in adapters. Frontend is static with mailto-only contact; no API routes or forms.

**Overall health:** Fix the path traversal, add run_id validation, and document trace security (secrets in traces) — then the codebase is suitable for design partner pilots. Enterprise readiness will require trace retention, size limits, and schema versioning.

---

## Critical Security Issues

### 1. Directory Traversal via Unvalidated `run_id`

**WARNING:** `LocalTraceStore` accepts arbitrary `run_id` strings in `load()`, `delete()`, and uses `run_id` in `glob()`. When `run_id` contains path components (e.g. `../../../etc/passwd`), operations can read or delete files outside the trace directory.

**Location:** `src/paprika/trace_store.py` lines 66–79 (`load`), 72–73 (`glob`), 115–118 (`delete`)

**Why this is dangerous:**
- `path = self._base_dir / f"{run_id}.json"` — Path division does not sanitize. With `run_id = "../../../etc/passwd"`, `path` resolves outside `base_dir`.
- `path.exists()` and `path.read_text()` would access `/etc/passwd.json` (or similar).
- `glob(f"{run_id}*.json")` with `run_id = "../"` matches files in the parent directory.
- `delete()` with a malicious `run_id` could delete arbitrary files.

**Exploitation scenarios:**
1. **CLI:** `paprika runs inspect "../../../.ssh/id_rsa"` — attempt to load a file as JSON (may fail on parse but path is still accessed).
2. **CLI:** `paprika runs diff "../../../etc/" "../../../var/"` — glob patterns that escape the trace dir.
3. **Programmatic:** `runtime.replay("../../../sensitive/config.json")` when run_id comes from user input (e.g. `examples/langgraph_integration.py --replay`).
4. **Programmatic:** `store.delete("../../../important/file")` — deletes a file outside the trace dir.

**Secure alternative design:**
- Validate `run_id` before any filesystem operation: reject if it contains `..`, `/`, `\`, or other path separators.
- Restrict to a safe character set (e.g. alphanumeric, hyphens, underscores — UUID-like).
- After path construction, assert `path.resolve().is_relative_to(self._base_dir.resolve())` (Python 3.12+) or equivalent to ensure the resolved path stays under `base_dir`.

---

## Reliability Risks

### 2. Policy Check Order — `max_steps` Checked After Increment

**Location:** `src/paprika/runtime.py` lines 106–111, 169–171

The runtime increments `step_count` before `check_pre_step()`. This is correct: it allows exactly `max_steps` steps (step 1 through step N), and triggers on step N+1. No bypass.

**Verdict:** Acceptable. Policy logic is correct.

### 3. Replay Engine — Malformed Trace Handling

**Location:** `src/paprika/replay.py` — `_build_stubs()`

If a trace has duplicate `step_index` values for the same event type (e.g. two `LLMCallEndEvent` with `step_index=1`), the later event overwrites the stub. Replay could return the wrong recorded output for that step. Malformed traces could cause subtle replay divergence.

**Recommendation:** Add trace validation on load (e.g. step indices unique per event pair) or at least log when duplicate step indices are observed. Low priority for v1.

### 4. Hash Collision in Repeat Detection

**Location:** `src/paprika/events.py` — `compute_input_hash()` returns first 16 hex chars of SHA-256

16 hex chars = 64 bits. Collision probability is negligible for normal use. A collision could cause a false positive (new input flagged as repeat) or false negative (repeated input allowed). The latter is the operational risk — a loop might not be halted.

**Verdict:** Acceptable for v1. Document as a known limitation if scaling to very high step counts.

### 5. No Trace Size or Count Limits

**Location:** `src/paprika/trace_store.py` — `save()`, `list_runs()`

- No limit on trace file size. A pathological agent could produce huge traces (e.g. massive `input_data`/`output_data`), leading to unbounded disk usage and potential memory issues when loading.
- `list_runs()` reads and parses each trace file to build summaries. With thousands of traces, this could be slow and memory-heavy.
- `path.read_text()` in `list_runs()` and `load()` — no streaming or size cap.

**Recommendation:** Add optional trace size cap and/or sampling for `list_runs`. Document disk usage expectations.

---

## Data Handling Risks

### 6. Traces Contain Full Prompts, Model Outputs, and Tool Data

**Location:** All event schemas in `src/paprika/events.py`; persisted via `trace_store.save()`

Traces store `input_data`, `output_data`, `args`, and `input_args` in full. These can include:
- API keys (if accidentally included in prompts)
- PII (user messages, customer data)
- Internal system details

**Recommendation:** Add a security section to docs: (1) treat trace files as sensitive, (2) restrict filesystem permissions on `~/.paprika/traces`, (3) consider redaction before storing (future work). README mentions "Traces may contain sensitive prompt/tool data (no redaction yet)" — good; expand in a dedicated security doc.

### 7. Exception Messages Persisted in Traces

**Location:** `src/paprika/runtime.py` lines 286–288

`run_state.record_end(status="error", error=str(exc))` persists the full exception message. If an upstream library or agent code includes secrets in exception messages, they will be stored in the trace.

**Recommendation:** Document that users should avoid raising exceptions with sensitive data. Optional: truncate or sanitize `str(exc)` before storage (risky for debuggability).

### 8. Pydantic Serialization Mode

**Location:** `src/paprika/trace_store.py` line 30; `src/paprika/events.py` (all event models)

`Trace.model_dump_json_pretty()` uses `model_dump_json(indent=2)`. Pydantic v2 handles `datetime` and common types correctly for JSON. If custom types are added later (e.g. `bytes`, `Path`), ensure `model_dump_json(mode="json")` or equivalent is used so output is strictly JSON-safe.

**Verdict:** Current usage is fine. Revisit if schema evolves.

### 9. `compute_input_hash` — Deep Nesting and Circular References

**Location:** `src/paprika/events.py` — `compute_input_hash()`, `_sort_recursive()`

`json.dumps(sorted_data, default=str)` will raise `RecursionError` for circular references. Deeply nested input could cause stack overflow in `_sort_recursive`. Unlikely for normal agent inputs.

**Recommendation:** Add a recursion depth limit if supporting untrusted or highly dynamic input. Low priority for v1.

---

## Packaging / Build Issues

### 10. `__init__.py` Exports — Clean Public API

**Location:** `src/paprika/__init__.py`

Exports: `PaprikaContext`, `PaprikaError`, `PolicyViolationError`, `ReplayMismatchError`, `TraceNotFoundError`, `PolicyConfig`, `ReplayEngine`, `PaprikaRuntime`, `Trace`.

Internal modules (`_formatting`, `adapters`, `events` internals) are not exported. `from paprika import PaprikaRuntime` works without leaking internals.

**Verdict:** Good.

### 11. Entrypoints Correct

**Location:** `pyproject.toml` — `[project.scripts]`

- `paprika = "paprika.cli:app"` — CLI
- `demo = "paprika.demo:main"` — Demo

Both resolve correctly.

### 12. Optional Dependencies

**Location:** `pyproject.toml` — `[project.optional-dependencies]`

- `examples = ["langgraph>=0.2,<1"]` — Used only for `langgraph_integration.py`. Correct.

### 13. Dependency Pinning

`uv.lock` pins exact versions. CI uses `uv sync --dev` for reproducible installs. No obvious supply-chain risks in direct dependencies (pydantic, typer, httpx).

---

## Frontend Issues

### 14. Next.js Marketing Site — Static, No Forms

**Location:** `apps/web/`

- No API routes (`app/api/` does not exist).
- Contact page uses `mailto:` links only — no form submission, no server-side processing.
- No `dangerouslySetInnerHTML`, `eval`, or `innerHTML` usage found.
- `CodeBlock` component renders `{code}` as React text — escaped by default; no XSS from code samples.
- Blog content is from `content/blog.ts` (build-time); not user-generated.

**Verdict:** Low frontend risk. No CSRF or XSS vectors identified.

### 15. Dependencies — Next.js and Radix

**Location:** `apps/web/package.json`

- Next.js 14, React 18, Radix UI components. All from well-maintained projects.
- No known high-risk or unmaintained packages in direct deps.

---

## CLI Review

### 16. User Input Handling

**Location:** `src/paprika/cli.py`

- `run_id` passed directly to `store.load(run_id)` and `store.load(run_id_a)`, `store.load(run_id_b)` — **path traversal risk** (covered in Critical #1).
- `--trace-dir` comes from user; used as `base_dir`. User intentionally chooses trace location — acceptable.
- `PAPRIKA_TRACE_DIR` env var — if set to invalid path (e.g. `/nonexistent`), errors may be opaque. Document.

### 17. Exception Handling

**Location:** `src/paprika/cli.py` lines 86–88, 154–156

```python
except Exception as e:
    typer.echo(f"Error: {e}", err=True)
    raise typer.Exit(1) from e
```

Exception message is echoed to user. If `e` contains sensitive data, it would be shown. Paprika’s own errors are generally safe; third-party exceptions could leak. Low risk for CLI context (local user).

---

## Minor Improvements

### 18. `TraceNotFoundError` Initialization

**Location:** `src/paprika/errors.py` line 39

`TraceNotFoundError` passes `run_id` to `super().__init__()`. If `run_id` is malicious or huge, the error message could be long. Minor.

### 19. Tool Adapter — `func(**args)` Pass-Through

**Location:** `src/paprika/adapters/tools.py` line 58

Tool functions receive `**args` directly. No sanitization. If a tool has `**kwargs`, it receives all keys. This is by design — tools are trusted. Document that tool authors must validate args.

### 20. CI — Integration Tests

**Location:** `.github/workflows/ci.yml`

CI runs `uv run pytest --cov=paprika` without excluding `@pytest.mark.integration`. Integration tests run by default. Good.

### 21. `LocalTraceStore` — `list_runs` Malformed File Handling

**Location:** `src/paprika/trace_store.py` lines 109–110

Malformed JSON or missing keys cause a warning and skip. No crash. Good.

---

## Recommended Next Actions

Prioritized for production readiness:

1. **Fix directory traversal (Critical)**  
   Validate `run_id` in `LocalTraceStore.load()`, `delete()`, and before `glob()`. Reject path components and ensure resolved path stays under `base_dir`. Add tests for malicious `run_id` values.

2. **Document trace security**  
   Add SECURITY.md or similar: trace files may contain secrets/PII; restrict permissions; recommend redaction for sensitive deployments.

3. **Add trace size safeguard**  
   Optional max trace size (e.g. refuse to save beyond N MB) or warning when a single trace exceeds a threshold. Prevents accidental disk exhaustion.

4. **Add trace format version**  
   Introduce `schema_version` (e.g. `"1"`) in trace JSON for future migrations. Reduces compatibility risk.

5. **Tighten `run_id` validation at API boundary**  
   If `run_id` is ever accepted from network (future API), enforce strict format (e.g. UUID) and length limits. For CLI, same validation as in LocalTraceStore applies.

---

*Audit performed as read-only. No code changes were made. Fixes should be implemented and re-tested before release.*
