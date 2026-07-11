---
name: omp-routing
description: "OMP-style planner/executor model routing for Hermes. Routes messages to different models based on intent: plan mode (GLM 5.2) vs executor (MiMo v2.5)."
version: 2.0.0
author: Hermes Agent
license: MIT
tags: [routing, planner, executor, omp, model-selection]
---

# OMP-Style Planner/Executor Routing

Implements OMP's role-based routing in Hermes. Routes work by intent:
- **Plan mode** → GLM 5.2 (planner advisor)
- **Execute mode** → MiMo v2.5 (executor)
- **Auto** → classify intent and route accordingly

## How It Works

### Text-Based Override (No CLI Commands)

When the user types a message, detect the intent and route:

| Prefix | Model | Role |
|--------|-------|------|
| `plan:` or `plan:` | GLM 5.2 | Planner - deep reasoning, strategy |
| `exec:` or `run:` | MiMo v2.5 | Executor - tool calls, implementation |
| `slow:` | GLM 5.2 | Deep reasoning (slow role) |
| `smol:` | MiMo v2.5 | Cheap subagent fan-out |
| (no prefix) | Auto-classify | Detect intent and route |

### Auto-Classification Rules

When no prefix is specified, classify the message:

**Route to Planner (GLM 5.2) when:**
- User asks for a plan, strategy, or architecture
- Question is about "how should I..." or "what's the best approach"
- Multi-step task that needs decomposition
- User explicitly says "think about this" or "analyze"
- Complex reasoning that doesn't need tool execution

**Route to Executor (MiMo v2.5) when:**
- User asks to run a command or execute code
- Task is straightforward and tool-focused
- User says "do X" or "run Y" or "implement Z"
- Simple question that can be answered directly
- Urgent execution needed

### Implementation

```python
# Detection logic (run in session context)
def classify_intent(message: str) -> str:
    """Classify message intent for routing."""
    msg = message.lower().strip()
    
    # Explicit overrides
    if msg.startswith("plan:") or msg.startswith("plan "):
        return "planner"
    if msg.startswith("exec:") or msg.startswith("run:"):
        return "executor"
    if msg.startswith("slow:"):
        return "planner"  # slow = deep reasoning
    if msg.startswith("smol:"):
        return "executor"  # smol = cheap fan-out
    
    # Auto-classification heuristics
    plan_signals = [
        "how should", "what's the best", "plan", "strategy",
        "architecture", "analyze", "think about", "approach",
        "design", "evaluate", "compare", "tradeoff"
    ]
    
    exec_signals = [
        "run", "execute", "implement", "build", "create",
        "install", "fix", "debug", "test", "deploy"
    ]
    
    plan_score = sum(1 for s in plan_signals if s in msg)
    exec_score = sum(1 for s in exec_signals if s in msg)
    
    if plan_score > exec_score:
        return "planner"
    elif exec_score > plan_score:
        return "executor"
    else:
        return "auto"  # Let the main model decide
```

### Usage in Hermes

1. **Plan mode**: Type `plan: how should I structure the auth system?`
   → Routes to GLM 5.2 for deep reasoning

2. **Execute mode**: Type `exec: run the tests` or just `run the tests`
   → Routes to MiMo v2.5 for tool execution

3. **Auto mode**: Type a message without prefix
   → Auto-classifies and routes accordingly

### Testing

To test the routing works:
1. Send `plan: analyze the architecture of this project`
   → Should delegate to GLM 5.2
2. Send `exec: list files in the current directory`
   → Should delegate to MiMo v2.5
3. Send a message without prefix
   → Should auto-classify and route

### Configuration

Full 3-model config in `~/.hermes/config.yaml` (see `templates/omp-full-config.yaml` for copy-paste):

```yaml
model:
  default: mimo-v2.5              # Executor: tool calls, implementation
  provider: opencode-go

delegation:
  model: glm-5.2                  # Planner: deep reasoning, strategy
  provider: opencode-go
  reasoning_effort: high

auxiliary:
  vision:
    provider: openrouter           # Vision: PDFs, images, diagrams
    model: google/gemini-2.5-flash

compression:
  enabled: true
  threshold: 0.50                  # 50% of 200k = 100k tokens
  threshold_tokens: 100000         # Hard cap before degradation zone
  target_ratio: 0.25               # Compress to ~25k
  protect_last_n: 20
```

**IMPORTANT:** Your `.env` needs `OPENCODE_API_KEY` (this is the correct variable name).
The OpenCode Go API endpoint is `https://opencode.ai/zen/go/v1/chat/completions`.
Model ID for GLM-5.2 is simply `glm-5.2` (no prefix needed).

### Key Insight from OMP

OMP's `auto` level classifies each turn and resolves a concrete effort level (low → xhigh). Cheap turns stay cheap, hard ones get the budget. This skill replicates that by:
1. Detecting explicit overrides (plan:/exec:)
2. Auto-classifying when no override is present
3. Routing to the appropriate model based on intent

The goal is cost optimization: use the cheaper model (MiMo V2.5) for simple tasks, and the more capable model (GLM 5.2) for complex reasoning.

## Vision Pipeline (PDFs, Images, Diagrams)

MiMo V2.5 and GLM 5.2 are **text-only** — they cannot read images or PDFs. When the agent needs to "see" something, it must delegate to a vision-capable model via the `auxiliary.vision` config path or `delegate_task`.

### Available Vision Paths

| Path | Model | Supports | Setup |
|------|-------|----------|-------|
| **OpenRouter Gemini** (recommended) | google/gemini-2.5-flash | PDFs, images, diagrams, handwriting | Already configured in auxiliary.vision |
| Google Cloud Vision API | Google OCR | Dense OCR, document text | Needs GCP project + Composio connection |
| pdftoppm → image → vision | Any vision model | Full control over page selection | Needs pdftoppm + base64 encoding |

### OpenRouter PDF Support (native)

OpenRouter supports sending PDFs directly via base64 — no need to convert to images first:
```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "Analyze this document:" },
      { "type": "file", "file": "data:application/pdf;base64,{base64_data}" }
    ]
  }]
}
```

### How Delegation Works

When MiMo V2.5 encounters something it can't see (PDF, image, diagram):
1. MiMo calls `delegate_task` with the vision task
2. The subagent uses OpenRouter Gemini (via auxiliary.vision config)
3. Gemini returns structured analysis
4. MiMo uses the analysis to continue the main task

### Google Drive Integration

Notability notes auto-backup as PDFs to Google Drive. The agent can:
1. Find files: `GOOGLEDRIVE_FIND_FILE` with `folder_id` for the Notability folder
2. Download: `GOOGLEDRIVE_DOWNLOAD_FILE` returns an S3 URL
3. Analyze: Send the PDF to Gemini via OpenRouter

Notability folder ID: `1WCXZxDJp80qw_GDUF96uBV7yjZqO1QSI` (inside `Welcome/` folder)

## Context Management for OMP Agents

**Critical pitfall:** Models with large context windows (500k–1M tokens) degrade significantly past ~40-50% of their advertised max. Research shows 13.9%–85% performance drops even with perfect retrieval (Du et al. 2025). The model starts "thinking in circles" and losing coherence.

### Why This Matters for OMP

The executor (MiMo v2.5) via OpenCode provider may expose a large context window. If Hermes uses default compression (50% of window), compaction could trigger at 500k+ tokens — deep in the degradation zone. The planner (GLM 5.2) used for complex reasoning is especially vulnerable since reasoning quality degrades fastest with context length.

### Recommended Config

MiMo V2.5's **actual context limit is 200k tokens** (the opencode-go plan advertises 1M, but the model caps at 200k). Degradation threshold from research: 40-50% of max = **80-100k tokens**. After system prompt + tools + codebase (~25k), real working room is ~55-75k tokens.

Add to `~/.hermes/config.yaml`:

```yaml
compression:
  enabled: true
  threshold: 0.50              # Trigger at 50% of 200k = 100k tokens
  threshold_tokens: 100000     # Hard cap: stay before degradation zone
  target_ratio: 0.25           # Compress down to ~25k after trigger
  protect_last_n: 20           # Keep recent messages intact
```

This keeps active context under 100k tokens — before the 40-50% degradation cliff identified by Wang et al. (2026). Claude Code recommends 50-70% for reasoning-heavy tasks; our 50% sits right at that boundary.

### How to Apply

```bash
hermes config set compression.threshold 0.50
hermes config set compression.threshold_tokens 100000
hermes config set compression.target_ratio 0.25
hermes config set compression.protect_last_n 20
```

Restart after applying: `/reset` in-session or restart the gateway.

For full research details, see `references/context-degradation-research.md`.

## OMP Upstream Architecture (canonical reference)

For the real OMP framework's routing/delegation implementation, see
`references/omp-architecture.md` — covers the `ModelRoutingPolicy` rule system
(match by `phase` / `agent` / `taskRole` / `taskPriority` / `leaf` /
`hasDependencies`, first-match-wins), the five orchestration phases
(coordinator / worker / delegated / synthesis / short-circuit), the
`delegate_to_agent` tool with cycle/depth/pool guards, and `AgentPool.runEphemeral`.
Source repo: `github.com/open-multi-agent/open-multi-agent`, CLI binary `oma`.

## User Preferences

- **Verify before building:** User explicitly said "i want to verify with proof that works right now." Always demonstrate a working proof-of-concept before proposing architecture changes or gateway modifications.
- **OpenCode Go, not OpenRouter:** User corrected: "we need to run glm-5.2 with opencode-go, not openrouter." Use the OpenCode Go API endpoint for GLM-5.2 calls.
- **Simple scripts first:** User rejected gateway code changes ("doesn't look like a good idea") in favor of standalone scripts that can be run manually. Start with scripts, graduate to gateway integration later.

## Current State: Specification Only (Not Wired)

**CRITICAL LIMITATION (discovered 2026-07-07):** The prefix-based routing (`plan:`, `exec:`, etc.) is a specification — it describes what *should* happen but is NOT implemented at the gateway level. Messages arrive at the model unchanged regardless of prefix. The config (`delegation.model: glm-5.2`) exists but isn't used for prefix routing.

### Why It Doesn't Work Yet (Updated 2026-07-07)

Hermes slash commands like `/compress` work because they're intercepted **before
reaching the model** — at the CLI level via `_looks_like_slash_command()` →
`process_command()` (cli.py ~8347), or at the gateway level via
`event.get_command()` → `resolve_command()` → dispatch chain (gateway/run.py
~9455). The OMP prefix routing (`plan:`) is a **skill-level pattern** — the agent
reads the skill and knows the pattern, but no middleware intercepts the message
to switch models.

For `/plan` to work like `/compress`, add a `CommandDef` to
`hermes_cli/commands.py::COMMAND_REGISTRY` and a handler in both
`cli.py::process_command()` and `gateway/run.py`. See
`references/gateway-slash-commands.md` for the full implementation path with
real code patterns and two viable approaches (one-off model swap vs per-turn
override).

### User's Request

User explicitly asked: *"i want /compress style gateway level switch / plan should run glm model behind open code go to api"*

This means: `/plan` should be a native slash command (like `/compress`) that routes the message to GLM-5.2 via the opencode-go provider, not a text prefix that the agent reads.

### Implementation Notes (from gateway investigation)

**Corrected (2026-07-07):** The actual architecture uses `hermes_cli/commands.py`
(`COMMAND_REGISTRY: list[CommandDef]`) as the single source of truth — not
`gateway/slash_commands.py` (that file does not exist). See
`references/gateway-slash-commands.md` for the full, corrected architecture with
real line numbers and code patterns.

Key files:
- `hermes_cli/commands.py` — `CommandDef` dataclass + `COMMAND_REGISTRY` list
- `cli.py` — `process_command()` dispatches via `if/elif canonical == "..."`
- `gateway/run.py` — gateway dispatch (~line 9455) with hook interception
- `hermes_cli/cli_agent_setup_mixin.py` — `_resolve_turn_agent_config` + `_init_agent`

Two viable approaches for `/plan`:

**Approach A — One-off model swap (like `/moa`):** Register `CommandDef("plan", ...)`,
add handler, temporarily switch to glm-5.2, run prompt, restore model.

**Approach B — Per-turn model override (like `/fast`):** Attach `model_override` to
the `turn_route` dict so `_init_agent(model_override=...)` picks up the plan model.
The `signature` comparison auto-triggers re-init. Lighter touch — no explicit
save/restore needed.

**Closest existing pattern:** `/moa` (line 116 of COMMAND_REGISTRY) already does
"run one prompt through a different model, then restore." `/fast` uses
`request_overrides` for per-turn behavior without model swap.

OMP's actual delegation uses YAML pipelines via swarm extension, not prefix routing.
The `plan:` prefix in this skill is a Hermes-specific design, not OMP's pattern.

## Working Scripts (Proven 2026-07-07)

The prefix-based routing is NOT wired at the gateway level, but these scripts work standalone:

### `scripts/plan.js` — One-shot GLM-5.2 call
```bash
bun run scripts/plan.js "your deep reasoning question"
```
Calls GLM-5.2 via OpenCode Go API, prints response with reasoning visible.

### `scripts/plan-and-deploy.js` — GLM-5.2 plans → fan-out to executors
```bash
bun run scripts/plan-and-deploy.js "complex question needing multiple angles"
```
Flow: GLM-5.2 breaks question into 2-4 tasks → tasks executed in parallel on executor model (kimi-k2/mimo) → results collected.

### API Details (Verified)
- **Endpoint:** `https://opencode.ai/zen/go/v1/chat/completions`
- **Auth:** `Authorization: Bearer $OPENCODE_API_KEY`
- **Model ID:** `glm-5.2` (returns as `frank/GLM-5.2`)
- **Cost:** $5/month flat rate via OpenCode Go subscription
- **Reasoning:** Visible in `reasoning_content` field

### Fan-Out Architecture
```
User question
     ↓
GLM-5.2 (planner, $5/mo flat)
     ↓ creates task breakdown
     ↓
┌────┬────┬────┐
mimo mimo deepseek  (executors, pay-per-token)
└────┴────┴────┘
     ↓ results
Final answer (optional: GLM-5.2 synthesis)
```

## Verification After Config Change

After applying config, verify in a **new session** (not the current one):

| Check | Command | Expected |
|-------|---------|----------|
| Model loaded | `/model` | Shows `mimo-v2.5` via `opencode-go` |
| Config active | `/config` | Shows all compression + delegation settings |
| Planner works | Run `bun run scripts/plan.js "test"` | GLM-5.2 responds via OpenCode Go |
| Fan-out works | Run `bun run scripts/plan-and-deploy.js "test"` | Tasks created and executed |
| Vision works | Send `/image <path>` or reference image URL | Uses Gemini 2.5 Flash |
| Status check | `/status` | Shows current model, provider, session info |

**Important:** Model/provider changes require a new session (`/reset` or restart gateway). Compression settings also need a new session to take effect.
