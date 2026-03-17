# Configuration

Configure Paprika's trace storage, policy defaults, and UI behavior.

## Trace Directory

**Default:** `~/.paprika/traces/`

Paprika saves execution records as JSON files to this directory. The directory is created automatically on first run.

### Override with Environment Variable

```bash
PAPRIKA_TRACE_DIR=/custom/path python my_agent.py
```

### Override with CLI Flag

```bash
paprika runs list --trace-dir /custom/path
paprika ui --trace-dir /custom/path
```

### Override in Code

```python
from paprika import PaprikaRuntime
from pathlib import Path

runtime = PaprikaRuntime(
    trace_dir=Path("/custom/path")
)
```

---

## PolicyConfig Options

Set runtime policies when creating the `PaprikaRuntime`.

```python
from paprika import PaprikaRuntime, PolicyConfig

runtime = PaprikaRuntime(
    policy=PolicyConfig(
        max_steps=10,
        max_tokens=10000,
        max_repeat_hashes=3
    )
)
```

**Fields:**

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `max_steps` | int \| None | None | Max LLM + tool steps per run |
| `max_tokens` | int \| None | None | Max cumulative tokens per run |
| `max_repeat_hashes` | int \| None | None | Max repetitions of same input hash |

All fields are optional. If not specified, that policy is not enforced.

### Examples

```python
# Prevent infinite loops
policy = PolicyConfig(max_steps=20)

# Cap expensive runs
policy = PolicyConfig(max_tokens=50000)

# Detect stuck agents
policy = PolicyConfig(max_repeat_hashes=5)

# Enforce all three
policy = PolicyConfig(
    max_steps=50,
    max_tokens=100000,
    max_repeat_hashes=10
)

# No policies
runtime = PaprikaRuntime()  # unlimited
```

---

## UI Server Options

Configure the browser UI when starting it.

### CLI Options

```bash
paprika ui \
  --port 8888 \
  --trace-dir /tmp/paprika \
  --no-open
```

**Options:**
- `--port PORT` (default: 8787) — port to listen on
- `--trace-dir PATH` — trace directory to browse
- `--no-open` — do not auto-open browser

### Programmatic Start

```python
from paprika.ui import create_app
import uvicorn

app = create_app(trace_dir="/custom/path")
uvicorn.run(app, host="127.0.0.1", port=8788)
```

---

## Security Configuration

### Run ID Validation

Run IDs must match the pattern: `^[A-Za-z0-9][A-Za-z0-9._-]*$`

Valid IDs:
- `abc123def456`
- `run_1`
- `agent.v2-test`

Invalid IDs (rejected):
- `../../../etc/passwd` (path traversal blocked)
- `/absolute/path` (slash not allowed)
- `"quoted"` (quote not allowed)

### Path Traversal Prevention

Paprika prevents directory traversal attacks. You cannot access files outside `~/.paprika/traces/` via a malicious run ID.

### UI Binding

The browser UI binds to `127.0.0.1:PORT` only (localhost). It is not accessible from other machines on your network or the internet.

**Not intended for:**
- Multi-user access
- Shared/remote debugging
- Cloud deployment

**Intended for:**
- Local development
- Single-machine debugging
- CI/CD pipeline inspection

---

## What to Put in Execution Records

Paprika stores full inputs and outputs. Consider:

**Safe to include:**
- Prompts and structured queries
- Tool results (search results, API responses)
- Agent reasoning and decisions
- Metadata and timestamps

**Caution — don't include:**
- API keys or secrets (they will be stored as plaintext)
- Passwords or user credentials
- PII (personally identifiable information)
- Sensitive business data

If your agent works with sensitive data, sanitize inputs before passing to Paprika, or use a separate trace directory with restricted access.

---

## Advanced: Custom Trace Store

For specialized use cases, implement a custom trace store:

```python
from paprika import PaprikaRuntime
from paprika.trace_store import LocalTraceStore

# Use custom trace store
custom_store = LocalTraceStore(base_dir="/secure/traces")

runtime = PaprikaRuntime(trace_store=custom_store)
```

See `src/paprika/trace_store.py` for the interface.

---

## Next Steps

- Learn about policies: [Policies](core-concepts/policies.md)
- Use the CLI: [CLI Reference](cli.md)
- Access the browser UI: [UI](ui.md)
