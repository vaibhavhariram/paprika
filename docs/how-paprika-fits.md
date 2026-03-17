# How Paprika Fits

Understanding where Paprika sits in the AI engineering stack — and where it doesn't.

## Paprika vs Observability Platforms (LangSmith, Sentrial, Helicone, Phoenix)

**These platforms:** Cloud-hosted dashboards that observe agent execution. They log everything and provide analytics, cost tracking, prompt versioning, team collaboration.

**Paprika:** Local-first runtime control. Records execution locally. Enables replay and mismatch detection.

| Aspect | LangSmith | Paprika |
|--------|-----------|---------|
| Deployment | Cloud (SaaS) | Local (Python package) |
| Trace storage | Remote servers | Local JSON files |
| Observability | ✓ (dashboards, analytics) | ✓ (browser UI, JSON) |
| Cost tracking | ✓ | ✗ |
| Prompt versioning | ✓ | ✗ |
| Team collaboration | ✓ (shared workspace) | ✗ (local only) |
| **Deterministic replay** | ✗ | ✓ |
| **Mismatch detection** | ✗ | ✓ |
| **Policy enforcement** | ✗ | ✓ |

**Stack position:**

```
Paprika (runtime control)
    ↓ (Paprika records execution)
    ↓
LangSmith / Datadog (observe + analyze)
```

You can run both together. Paprika controls and records; LangSmith observes what Paprika controls.

**When to use each:**
- **Paprika:** Debug agent failures safely, detect regressions, validate reproducibility
- **LangSmith:** Track costs, manage prompts, analyze quality trends, collaborate with teams

---

## Paprika vs Eval Frameworks (Ragas, DeepEval, AutoEval)

**Eval frameworks:** Assess the quality of agent outputs against criteria. "Is the response accurate?" "Does it answer the question?"

**Paprika:** Detects behavior changes, not quality. "Did the agent make the same decision path?" "Did the prompt change cause divergent behavior?"

| Aspect | DeepEval | Paprika |
|--------|----------|---------|
| Purpose | Quality assessment | Behavior change detection |
| Measures | Accuracy, relevance, hallucination | Input hash divergence |
| Timing | After execution (batch) | During replay (step-by-step) |
| Output | Quality score | Mismatch error or ✓ pass |
| Framework | Python package | Python package |
| Cloud | Optional (SaaS) | None |

**Stack position:**

```
Paprika (behavior validation)
    ↓ (does behavior match?)
    ↓
Eval frameworks (is quality acceptable?)
```

Run Paprika first to catch regressions. Then run evals to check quality.

**When to use each:**
- **Paprika:** "Did my code change break the agent?" (regression testing)
- **DeepEval:** "Does the agent still produce high-quality outputs?" (quality assurance)

---

## Paprika vs Gateway Tools (Anthropic Workbench, Prompt Caching, LLM Proxies)

**Gateway tools:** Sit in the middle of API calls. Intercept requests, add middleware, cache responses, manage credentials.

**Paprika:** Records execution locally. Does not proxy requests (unless you add custom middleware).

| Aspect | Gateway | Paprika |
|--------|---------|---------|
| Request interception | ✓ (proxies all calls) | ✗ (passive recording) |
| Response caching | ✓ | ✗ (records only, doesn't cache live calls) |
| Credential management | ✓ | ✗ |
| Cost optimization | ✓ | ✗ |
| **Reproducible replay** | ✗ | ✓ |
| **Mismatch detection** | ✗ | ✓ |

**Stack position:**

```
(Optional: Gateway for cost optimization)
    ↓
Paprika (replay and regression testing)
    ↓
LLM APIs / Tools
```

Paprika is orthogonal to gateways. You can use both.

**When to use each:**
- **Gateway:** Optimize API costs, manage credentials, add middleware
- **Paprika:** Replay failures safely, test for regressions

---

## Paprika vs Monitoring / Alerting (Datadog, New Relic, Custom Alerts)

**Monitoring tools:** Watch metrics in real-time. Alert when something goes wrong.

**Paprika:** Records execution for later inspection and replay. Does not emit alerts.

| Aspect | Datadog | Paprika |
|--------|---------|---------|
| Real-time metrics | ✓ | ✗ |
| Alerting | ✓ | ✗ |
| Dashboards | ✓ | Limited (local UI) |
| **Deterministic replay** | ✗ | ✓ |
| **Safe failure reproduction** | ✗ | ✓ |

**Stack position:**

```
Datadog (alert on failures)
    ↓
Paprika (reproduce failures safely)
```

Datadog alerts you when something breaks. Paprika lets you replay the failure locally to debug it.

---

## Full Stack Example

A complete AI engineering stack might look like:

```
┌────────────────────────────────────────┐
│ Your Agent Application                 │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ Paprika Runtime                        │  ← Replay, regression testing
│ (Policy enforcement, step recording)   │
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ LLM Providers (OpenAI, Anthropic, etc) │
│ Optional: Gateway middleware           │  ← Cost optimization, caching
└────────────────────────────────────────┘
           ↓
┌────────────────────────────────────────┐
│ Observability (LangSmith, Datadog)     │  ← Dashboards, cost tracking
│ Eval Framework (Ragas, DeepEval)       │  ← Quality metrics
│ Monitoring (alerts on failures)        │  ← Real-time alerts
└────────────────────────────────────────┘
```

**Layers:**
1. **Paprika** — controls and records execution locally
2. **LLM APIs** — external services
3. **Observability / Eval / Monitoring** — analysis and dashboards

---

## What Paprika Doesn't Do

- **No SaaS backend** — all data stays local
- **No cost tracking** — use LangSmith for billing analytics
- **No prompt management** — use LangSmith or Anthropic Workbench
- **No quality evals** — use Ragas or DeepEval
- **No real-time alerts** — use Datadog or custom monitoring
- **No team collaboration** — intended for local debugging
- **No eval tooling** — not an eval platform

---

## Decision Tree: What Tool Do I Need?

```
"My agent failed in production"
    ├─ "I need to reproduce it safely"
    │  └─ Use Paprika.replay()
    │
    ├─ "I need to see what happened"
    │  └─ Use Paprika runs inspect / UI
    │
    └─ "I need to analyze trends"
       └─ Use LangSmith or Datadog

"I changed my prompt/code"
    ├─ "Did behavior change?"
    │  └─ Use Paprika.replay() → ReplayMismatchError
    │
    └─ "Is quality still acceptable?"
       └─ Use DeepEval or Ragas

"I'm worried about costs"
    └─ Use gateway caching + LangSmith cost tracking

"I need my team to collaborate"
    └─ Use LangSmith workspace

"I want real-time alerts"
    └─ Use Datadog or custom monitoring
```

---

## When Paprika Is Enough

For solo developers or small teams:
- Debugging agent failures
- Detecting regressions
- Validating reproducibility
- Testing locally before shipping

Paprika is your complete solution.

---

## When You Need More

For organizations scaling agents:
- Use Paprika for local debugging + regression testing
- Add LangSmith for cost tracking, prompt management, team collab
- Add Ragas/DeepEval for quality metrics
- Add Datadog for production monitoring + alerting

All tools complement Paprika. None conflict with it.

---

## Next Steps

- Learn Paprika's capabilities: [Overview](overview.md)
- Get started: [Quickstart](quickstart.md)
- Understand Paprika's core: [Runtime](core-concepts/runtime.md), [Replay](core-concepts/replay.md)
