---
name: cron-resilience
description: "Make cron jobs survive transient failures — retry logic, health watchdogs, provider failover, and job consolidation. Complements error-propagation (which makes failures loud) with automatic recovery (which makes failures self-healing)."
version: 1.0.0
author: Hermes Agent
tags: [cron, reliability, retry, watchdog, hermes, infrastructure]
related_skills: [error-propagation, hermes-agent]
---

# Cron Resilience: Automatic Recovery for Scheduled Jobs

**Core principle:** Making failures loud (error-propagation) is necessary but not sufficient. For data-integration jobs that must not miss, the system should auto-retry without human intervention.

## When to Use

- Cron jobs that write to external systems (Google Sheets, Notion, databases)
- Any job where a single failure = missing data that can't be recovered
- Provider rate limits (429) or transient outages (5xx) killing jobs
- Consolidating multiple similar cron jobs into fewer, smarter ones

## Architecture: Three-Layer Defense

```
Layer 1: Prompt-level retry
  Agent catches error → sleeps → retries once → reports if still failing

Layer 2: Bash health watchdog (no LLM cost)
  Runs every30min → scans output/ for FAILED jobs → re-runs via hermes cron run

Layer 3: Job consolidation
  Reduce job count → fewer failure surfaces → simpler monitoring
```

## Layer 1: Prompt-Level Retry

Add this block to the START of any data-integration cron prompt:

```
[RETRY PROTOCOL — MANDATORY]
If ANY tool call fails with HTTP429,5xx, or timeout:
1. Run: sleep30 (via terminal)
2. Retry the failed call ONCE
3. If it fails again, include the error in your output — do NOT silently skip data
The [target system] MUST be updated. Missing data = broken dashboard.
```

**Why this works:** The agent is already running — it can catch the error and retry within the same session. No external orchestration needed.

**Limitation:** If the provider (opencode-go, openrouter) is down entirely, the agent can't even start. Layer 2 handles this.

## Layer2: Bash Health Watchdog

A bash script that runs on a separate cron (no_agent=true, zero LLM cost):

```bash
#!/bin/bash
# Cron Health Watchdog — re-runs failed data-integration jobs
set -o pipefail

OUTPUT_DIR="$HOME/.hermes/cron/output"
DATA_JOBS="a6576d6d6a19 d2688bfa66ea"  # job IDs to monitor
RETRY_LOG="$OUTPUT_DIR/.watchdog-retries.json"

# Don't run during sleep hours
PDT_HOUR=$(TZ=America/Los_Angeles date +%-H)
[ "$PDT_HOUR" -lt7 ] 2>/dev/null && exit0

[ -f "$RETRY_LOG" ] || echo '{}' > "$RETRY_LOG"

for JOB_ID in $DATA_JOBS; do
    JOB_DIR="$OUTPUT_DIR/$JOB_ID"
    [ -d "$JOB_DIR" ] || continue

    LATEST=$(ls -t "$JOB_DIR"/*.md 2>/dev/null | head -1)
    [ -n "$LATEST" ] || continue

    # Check if FAILED
    head -5 "$LATEST" | grep -q "FAILED" || continue

    # Check age (20-90 min window — not too fresh, not too old)
    FAIL_TIME=$(stat -c %Y "$LATEST" 2>/dev/null) || continue
    NOW=$(date +%s)
    AGE_MIN=$(( (NOW - FAIL_TIME) /60 ))
    [ "$AGE_MIN" -lt20 ] || [ "$AGE_MIN" -gt90 ] 2>/dev/null && continue

    # Check retry count (max2 per job per day)
    TODAY=$(date +%Y-%m-%d)
    RETRIES=$(python3 -c "
import json, os
try:
    d = json.load(open('$RETRY_LOG')) if os.path.exists('$RETRY_LOG') else {}
except: d = {}
print(d.get('$JOB_ID', {}).get('$TODAY', 0))
" 2>/dev/null || echo "0")
    RETRIES=${RETRIES:-0}

    [ "$RETRIES" -ge2 ] 2>/dev/null && continue

    # RE-TRIGGER via Hermes CLI
    hermes cron run "$JOB_ID" --accept-hooks 2>&1 || true

    # Log retry
    python3 -c "
import json, os
path = '$RETRY_LOG'
try: d = json.load(open(path)) if os.path.exists(path) else {}
except: d = {}
if '$JOB_ID' not in d: d['$JOB_ID'] = {}
d['$JOB_ID']['$TODAY'] = d['$JOB_ID'].get('$TODAY', 0) + 1
json.dump(d, open(path, 'w'), indent=2)
"
done
```

**Key discovery:** `hermes cron run <job_id>` triggers a job immediately via the CLI. This is the bridge between bash watchdog and the LLM cron system.

**Schedule:** `*/30 * * * *` with `no_agent: true`

**Guard rails:**
- Sleep hour guard (no runs midnight-7 AM PDT)
-20-90 min age window (lets the job fail fully before retrying)
- Max2 retries per job per day (prevents infinite loops)
- Retry log persisted to `.watchdog-retries.json`

## Layer3: Job Consolidation Patterns

### Auto-type selection (nudge generator example)

**Before:**4 cron jobs, each with a different `--type` flag:
```
morning:   bun nudge-generator.js --type prediction
midday:    bun nudge-generator.js --type connection
afternoon: bun nudge-generator.js --type confusion
evening:   bun nudge-generator.js --type insight
```

**After:**4 cron jobs, same prompt, script auto-selects based on time:
```js
// In nudge-generator.js
if (!nudgeType) {
  const pdtHour = parseInt(new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false
  }));
  if (pdtHour < 10) nudgeType = 'prediction';
  else if (pdtHour <14) nudgeType = 'connection';
  else if (pdtHour <17) nudgeType = 'confusion';
  else nudgeType = 'insight';
}
```

**Principle:** Push logic into scripts, keep prompts identical. Reduces prompt duplication and makes jobs interchangeable.

### Redundancy elimination

Before consolidating, categorize every job:

| Category | Behavior on failure | Example |
|----------|-------------------|---------|
| DATA INTEGRATION | MUST retry — writes to external systems | KPI sheet, research ingestion |
| NOTIFICATION | Can miss — nice-to-have | Walking reminders, learning nudges |
| SHELL SCRIPT | Already reliable — no LLM needed | Bash-only jobs |

Kill jobs that are redundant with other data sources (e.g., a health audit Discord thread is redundant with a KPI Google Sheet that already has the same data).

## Provider Health Checks

Quick pre-flight before data-integration jobs:

```bash
#!/bin/bash
# provider-health-check.sh
HTTP_CODE=$(timeout10 curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $(grep OPENCODE_API_KEY ~/.hermes/.env | cut -d= -f2)" \
    "https://api.opencode.ai/v1/models" 2>/dev/null || echo "000")

case "$HTTP_CODE" in
    200) echo "[health-check] Provider OK"; exit0 ;;
    429) echo "[health-check] Rate limited"; exit1 ;;
    000) echo "[health-check] Unreachable"; exit1 ;;
    *)   echo "[health-check] HTTP $HTTP_CODE — proceeding"; exit0 ;;
esac
```

**Usage:** Source at the top of a cron prompt, or run standalone.

## Provider-Level vs Tool-Level Rate Limits

**Critical distinction:** HTTP 429 can come from two places, and the fix is different:

| Source | Error message | Fix |
|--------|--------------|-----|
| **Tool API** (Notion, Google Sheets, Oura) | `429 Too Many Requests` on a specific MCP call | Prompt-level retry with sleep(30) — the agent can catch and retry |
| **LLM Provider** (opencode-go, openrouter) | `HTTP 429: Monthly usage limit reached` on agent startup | **Prompt retry CANNOT help** — the agent never starts. Need provider failover or balance increase. |

**What happened Jul 10:** OpenCode API hit monthly usage limit. 4 jobs failed around 3-5 PM PDT. The prompt-level retry protocol was useless because the agent couldn't even start. Most jobs recovered by evening when presumably balance was added.

**Mitigation:**
1. Set `model`/`provider` per-job with fallback options — don't rely on default provider for critical jobs
2. The watchdog's `hermes cron run` also fails if provider is down — that's expected, the 2-retry limit prevents wasting attempts
3. Monitor `last_status: error` on the cron list — if ALL jobs fail simultaneously, it's a provider issue, not individual job issues

## Output Format for User-Facing Cron Jobs

**Core principle:** The user wants to DO something with the output, not read a report. Lead with the actionable thing. Everything else is noise.

**User correction (Jul 2026):** "the message is so long, make it human readable" — Discord is a CHAT, not a document.

### Discord-Specific Rules (MANDATORY for Discord delivery)

- **Under 150 words.** Period. No exceptions.
- **One quiz/question.** Not two. Not three.
- **No headers.** Use emoji: 📚 🧠 💭 ⚠️
- **No bullet lists > 3 items.**
- **No markdown tables.** They render badly on mobile.
- **No links unless clickable.** If you cite a paper, just say the name.
- **Write like texting a smart friend,** not writing a research brief.
- **Lead with the actionable thing.** Everything else is noise.
- **`[SILENT]` for nothing-to-report.** Don't send "No paper found but that's okay" — suppress entirely.

### Good (Discord)
```
📚 Papers in Readwise: AI Safety via Debate, SPIN, Generativism.

🧠 Today's question: SPIN trains a model against a frozen copy of itself. If it gets perfect at distinguishing its outputs from the reference — has it succeeded or failed? What happens to KL(p‖q) when distributions are easily separable vs overlapping?

💭 Think about it before tomorrow.
```

### Bad (Discord) — DON'T DO THIS
```
## Priority Papers
1. **AI Safety via Debate** (Irving et al., 2018) — https://arxiv.org/abs/1805.00899
### Analysis
Based on the knowledge assessment page in Notion, Akshay has a solid understanding... [500 words of slop]
```

### Anti-patterns (AI slop)
```
🔬 Research Ingestion — Jul 10
📊 Chunks indexed: 90
📄 New paper: Complexity and Satisficing (score: 7/10)
✅ Status: OK
---
| Field | Value |
| Title | Complexity and Satisficing... |
```

### Rules for ALL output formats
1. **Clickable link is the output.** If the user can't click through, the cron job failed its purpose.
2. **No metadata walls.** Scores, tags, chunk counts, author lists, Notion page IDs — the user didn't ask for these.
3. **`deliver: discord:channel_id`** for user-facing jobs.
4. **One-liner on failure.** `⚠️ Discover failed: [error]` — not a 5-paragraph failure analysis.

**Prompt template for clean output:**
```
OUTPUT FORMAT (your final response):
If success: [Actionable thing with link]
If nothing: [SILENT]
If error: One line with ⚠️ and the error
Never output tables, bullet lists, or metadata walls.
```

## Watchdog Coverage

The watchdog only monitors `DATA_JOBS` — jobs that write to external systems and MUST not miss. Notification-only jobs (walking reminders, learning nudges) are excluded because missing one is harmless.

**When adding a new data-integration job:**
1. Add its job ID to `DATA_JOBS` in the watchdog script
2. Verify the output directory exists (`~/.hermes/cron/output/<job_id>/`)
3. Test: `hermes cron run <job_id> --accept-hooks` and confirm output appears

**When adding a new notification job:** No watchdog changes needed. Just set `deliver: discord:channel_id` and verify delivery.

## Delivery Target Verification

After creating or modifying any cron job, verify delivery is correct:

```bash
# Quick check: which jobs deliver where
hermes cron list | python3 -c "
import sys, json
data = json.load(sys.stdin)
for j in data['jobs']:
    d = j.get('deliver', 'origin')
    marker = '⚠️ LOCAL' if d == 'local' else '✅'
    print(f\"{marker} {j['name']}: {d}\")
"
```

**Common mistakes:**
- `deliver: local` on a user-facing job → results never reach Discord
- `deliver: origin` on a job created in a different channel → bounces to wrong place
- Missing `deliver` field → defaults to `origin` (current channel), which may not be #home

**Rule:** All user-facing jobs must have `deliver: discord:1522097290263789799` (Home) explicitly set.

## Pitfalls

- **Don't retry in the watchdog if the provider is completely down** — the `hermes cron run` will also fail. The 2-retry-per-day limit prevents wasting attempts.
- **Don't consolidate jobs that deliver at different times** — 4 nudges at 8 AM/12 PM/2 PM/6 PM can't become 1 job at8 AM without delayed delivery logic.
- **Don't use `set -u` in watchdog scripts** — bash `set -u` (nounset) causes false errors when variables are set inside conditional blocks. Use `set -o pipefail` only.
- **The20-90 min age window matters** — too fresh (under20 min) means the job might still be running; too old (over90 min) means the window for same-day data has passed.
- **`hermes cron run` needs `--accept-hooks`** — without it, the CLI prompts for TTY confirmation which hangs in cron context.
- **Watchdog only covers data-integration jobs** — notification jobs (reminders, nudges) are intentionally excluded. Don't add them unless they write to external systems.
- **Monthly provider limits are invisible to the watchdog** — if ALL jobs fail simultaneously, it's a provider issue. Check `hermes cron list` for pattern: if every `last_status` is `error`, the provider is down, not individual job issues.
- **Autonomous cron jobs must default to READ-ONLY for external systems** — if a prompt says "check if X exists, and if missing, add it," the cron agent will fabricate entries. The correct interpretation is to report the gap. Add `DO NOT write to [system]. READ ONLY.` to any cron prompt that queries external APIs. (See `external-system-hygiene` Autonomous Agent Write Rule.)

## Verification

After setting up the resilience system:
1. Simulate a failure: corrupt the API key temporarily
2. Wait for the job to fail
3. Confirm the watchdog detects it (check `.watchdog-retries.json`)
4. Restore the API key
5. Confirm the watchdog re-runs the job successfully
6. Verify the output file shows `last_status: ok`
