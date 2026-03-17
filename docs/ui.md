# Browser UI

Paprika includes a local browser UI for inspecting execution records. Start with `paprika ui` and browse your runs in a timeline view.

## Getting Started

Install the UI extra:

```bash
pip install paprika[ui]
```

Start the UI:

```bash
paprika ui
```

Opens automatically at `http://127.0.0.1:8787/`

---

## Architecture

- **Backend:** FastAPI server (`src/paprika/ui/server.py`)
- **Frontend:** React + Vite + Tailwind CSS
- **Static assets:** Bundled into Python package
- **Binding:** `127.0.0.1` only (local machine only)

The UI is fully self-contained. No external dependencies or cloud services.

---

## Runs List Page

Navigate to `/` or click the Paprika logo.

**Table columns:**

| Column | Content |
|--------|---------|
| Run ID | Unique identifier (click to view details) |
| Agent | Agent name |
| Status | `success`, `error`, or `policy_violation` |
| Steps | Number of LLM + tool steps |
| Tokens | Total tokens used |
| Started | Execution start time |
| Replay? | ✓ if this is a replay run |

**Features:**
- Click any row to view run details
- Sorted by most recent first
- Shows last 20 runs by default (configure with `--limit`)

---

## Run Detail Page

Navigate to `/runs/:run_id` or click a row in the list.

**Top section — Execution Summary:**

```
Record ID: abc123def456
Agent: researcher
Status: success
Duration: 125ms
Started: 2024-01-15 14:32:10 UTC
Ended: 2024-01-15 14:32:10 UTC
Total Tokens: 142
Replay Of: (if applicable) xyz789abc123 [link]
```

**Timeline section — Step-by-step execution:**

Execution flows top to bottom. Each step shows:

### Step Icons

- ▶ **Run start** — synthetic bookend (for UX clarity)
- ◆ **LLM call** — language model invocation
- ⚙ **Tool call** — registered tool execution
- ⚠ **Policy violation** — runtime constraint breach
- ■ **Run end** — synthetic bookend (for UX clarity)

### Step Details

Click any step to expand:

**LLM Call:**
```
Provider: openai
Model: gpt-4o
Input Hash: a1b2c3d4e5f6g7h8
Tokens: 20 (prompt) + 10 (completion)
Duration: 50ms

Input:
{
  "messages": [
    {"role": "user", "content": "Your prompt"}
  ]
}

Output:
{
  "choices": [...]
}
```

**Tool Call:**
```
Tool: search
Input Hash: i9j0k1l2m3n4o5p6
Duration: 35ms

Arguments:
{
  "query": "AI trends"
}

Result:
"Search results..."
```

**Policy Violation:**
```
Policy: max_steps
Message: Maximum step count (10) exceeded
Details:
{
  "limit": 10,
  "current": 11
}
```

---

## JSON Viewer

All JSON blocks (input, output, arguments) are displayed in a collapsible viewer:

- **Monospace font** — readability
- **Collapsible** — expand/collapse sections
- **Syntax-aware** — quoted strings, numbers, booleans are distinguished
- **Gradient fade** — long payloads fade out at the bottom
- **Copy button** — copy JSON to clipboard

---

## Policy Violation Highlighting

When a policy is violated:

- **Red border** — highlights the violation step
- **Red background** — makes it stand out
- **Warning icon** — ⚠ visual indicator
- **Details shown** — violation reason and constraints

---

## Replay Awareness

If a run is a replay (was created by `runtime.replay()`):

- **"Replay Of" field** shows the original run ID
- **Link to original** — click to view the original run side-by-side in your browser
- **Visual indicator** — marked as "Replay run"

Use this to compare original vs replayed and spot mismatches.

---

## Security

- **Local-only binding** — `127.0.0.1:PORT` only, not accessible from other machines
- **No authentication** — intended for single-user local debugging
- **No external network** — all data stays on your machine
- **No SaaS backend** — self-contained, no cloud sync

---

## Limitations

- **No search/filtering** — browse by date/agent name only (coming soon)
- **No comparison view** — manually open two tabs to compare (coming soon)
- **No event streaming** — refresh page to see new runs
- **No live updates** — refresh to see latest results

---

## Browser Compatibility

Tested on:
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)

Requires ES2020+ JavaScript support.

---

## Troubleshooting

**Port already in use:**
```bash
paprika ui --port 8888
```

**Can't open browser:**
```bash
paprika ui --no-open
# Then manually open: http://127.0.0.1:8787/
```

**Traces not showing:**
- Check trace directory: `paprika runs list`
- Override with: `paprika ui --trace-dir /path/to/traces`

---

## API Routes

The UI is backed by two REST endpoints (used internally):

`GET /api/runs?limit=20`
- Returns list of recent execution records

`GET /api/runs/{run_id}`
- Returns full execution record with timeline

These are documented for reference but intended for internal use by the UI.

---

## Next Steps

- Learn more about execution records: [Execution Records](core-concepts/execution-records.md)
- Compare runs with CLI: [CLI Reference](cli.md)
- Configure UI behavior: [Configuration](configuration.md)
