---
name: external-system-hygiene
description: "Data integrity when writing to external systems — respect existing structure, avoid duplication, verify before creating."
version: 1.0.0
author: hermes
license: MIT
platforms: [linux, macos, windows]
prerequisites: []
metadata:
  hermes:
    tags: [data-integrity, safety, external-apis, notion, databases]
---

# External System Hygiene

**When writing to external systems (Notion, Airtable, GitHub, etc.), respect the user's existing data structure. Never create duplicates without explicit permission.**

## Core Principle

The user owns the data. You are a guest with write access. Structural changes (new databases, new repos, new tables) are **not content updates** — they're infrastructure changes that require explicit permission.

## Autonomous Agent Write Rule

**Cron jobs and background agents running without user supervision MUST default to READ-ONLY for external systems.** If a cron prompt says "check if X exists, and if missing, add it" — the correct interpretation is to report the gap, not to fabricate entries. Writing to external systems from autonomous agents creates phantom data the user can't see, can't review, and has to clean up manually.

**Trigger:** Any cron job prompt that says "if missing, create/add/insert" or "ensure X is in Y."

**Fix:** Remove the write instruction entirely. Change to: `DO NOT create or write to [system]. READ ONLY. Report gaps in your output.`

**When user explicitly requests writes later:** The READ-ONLY default applies to autonomous agents running without supervision. When the user later says "add them" or "figure out how to add them," use the correct API from the reference file. The distinction:
- "Check if X exists" / "ensure X is in Y" → read-only, report gaps
- "Add/create X" / "figure out how to add them" → use proper API format from reference

**Readwise specifics (Jul 2026):** Library API (v2/highlights) creates `source: "api_article"` entries that appear in the main library but NOT in the Reader. The Reader API (v3/save) saves URLs to the reading app where the user actually reads. User wants documents in the Reader, not fake highlights in the library. Cron fabricated 4 fake books; user couldn't see them. Then user explicitly said "figure out a way to add them" — used correct Reader API. See `references/readwise-api.md` for both APIs.

## Pre-Write Checklist

Before creating anything new in an external system:

1. **Check existing credentials/config** — look for API tokens, .env vars, or saved auth before initiating new OAuth flows. The connection may already be configured. **But verify the token actually works** — in Docker environments, secrets are often redacted (e.g. `ntn_b4...W4jj`), so the token may exist but return 401. Quick check: `source .env && echo $TOKEN | head -c 10`. If truncated/redacted → fall back to Composio OAuth. (Pitfalls: (a) agent set up Composio OAuth for Notion when token was already valid in /workspace/.env; (b) agent tried direct API with redacted token, wasting calls before falling back to Composio)
2. **Discover first** — search for existing resources with similar names/structure
3. **Inspect parent structure** — see what children already exist under the target
4. **Check for name collisions** — if "X" exists, don't create "X (2)" or "X - Copy"
5. **Ask before creating databases/tables/repos** — these are structural, not content
6. **Use existing structure** — add to what exists, don't parallel it

## What This Prevents

- Duplicate databases with identical schemas (caught: "LLM Training Todo" created when wiki already had todo structure)
- Parallel hierarchies that confuse the user's organization
- Orphaned resources that look like mistakes
- Version sprawl ("why are there 3 copies of this?")

## Safe Pattern

```
1. GET /search?query="name" → find existing
2. GET /blocks/{parent_id}/children → see structure
3. IF exists → use it (add child, append, query existing DB)
4. IF doesn't exist → ASK before creating
5. NEVER create standalone duplicates
```

## User-Specific Rules

When the user documents a hierarchy (e.g., "llm-wiki, research-db, diary-db"), that IS the structure. Write to those specific resources, not to new ones you create.

## Signals You're About to Violate

- You're about to call `POST /data_sources` or `POST /databases`
- You're about to `POST /repos` or create a new project
- You're creating something with a name that's "close to" something that exists
- The user said "write to X" but you're creating Y instead
- You're adding recurring events without confirming each one with the user
- You're scheduling events without verifying real-world constraints (gym hours, venue availability)

## Schema-First Write Pattern

When writing data to an external DB via API (Notion, Airtable, etc.):

1. **Query the schema** — `GET /databases/{id}` to discover property names and types. Never guess property names.
2. **Match types exactly** — Notion is case-sensitive: `rich_text` not `string`, `multi_select` not `array`. Title property is one per DB.
3. **Format values correctly** — Notion: `{title: [{text: {content: "..."}}]}`, `{rich_text: [{text: {content: "..."}}]}`, `{multi_select: [{name: "tag"}]}`.
4. **Batch creates** — loop through entries, POST each, check for `id` in response to confirm success.
5. **Handle errors** — 400 validation_error usually means wrong property name/type. Re-query schema and retry.

See `references/notion-api-write-patterns.md` for detailed examples.

See `references/llm-api-debugging-patterns.md` for LLM API quirks (reasoning token budgets, reasoning_content extraction, error propagation anti-patterns).

## Recovery

If you've already created duplicates:
1. Acknowledge the mistake
2. Identify which resources are the "real" ones vs duplicates
3. Ask user whether to delete duplicates or merge content
4. Update your mental model for next time

## Related Skills

- `notion` — Notion API operations (protected, bundled)
- `airtable` — Airtable API operations
- `github-repo-management` — GitHub repo operations

## Data Quality Verification

When you fix a bug in scoring/ranking/filtering logic, the existing data in the DB was assigned by the broken code. Re-run the fixed logic against ALL existing entries to identify contamination.

**Pattern:**
1. Query all entries from the DB (grouped by their scoring context)
2. Re-score each entry through the fixed logic
3. Compare old scores vs new scores
4. Entries that pass new scoring → keep
5. Entries that fail new scoring → purge (delete from DB)

**Why this matters:** A bug fix that only affects future entries leaves contaminated data in place. The DB is only as clean as its worst scorer.

**Example:** LLM ranking was falling back to citation-count heuristic. After fixing the LLM, re-scored all 25 papers across 12 threads. Found 5 papers (20%) that were pure citation bait — high citations, zero topical relevance. Purged them.

**Pitfall:** Don't assume "existing data is fine because it was added by the system." If the system was broken, the data is suspect.

---

**Origins:**
- Session 2026-07-02 — Agent created duplicate "LLM Training Todo" database when user wanted items inside existing "LLM Wiki" structure. User corrected: "you are not following notions, data sanity checks."
- Session 2026-07-02 — Agent attempted Composio OAuth for Notion when API token already existed in /workspace/.env. User corrected: "how come you can't connect to notion? i think you had access and were able to run it previously."
- Session 2026-07-02 — Notion token in /workspace/.env was redacted (`ntn_b4...W4jj`), causing 401 on direct API. Composio OAuth was the correct fallback. Lesson: always verify token validity before choosing auth path — "exists" ≠ "works".
- Session 2026-07-08 — Agent added "Dinner w/ Aadya" as recurring Google Calendar events without asking. Added "Flexible — OTF" evening blocks when user prefers morning. Scheduled 6 AM workout when gym opens at7 AM. User corrected: "think holistically man — does each part make sense in context with other parts." Lesson: verify real-world constraints AND don't fabricate recurring events without explicit permission.
- Session 2026-07-11 — Cron job `f34c47107d9a` (ML Research Nudge) told to "check if papers exist in Readwise, if missing add them via POST /api/v2/highlights." Cron created 4 fake "books" with auto-generated summaries as highlights — not real content the user saved. User couldn't see them; had to manually delete highlights via API. Books couldn't be deleted (Readwise API: DELETE not allowed on books). User: "if i can't see them, i'm gonna assume i can't read them." Fix: removed write instruction from cron prompt, added `NEVER write to Readwise. READ ONLY.` rule. Lesson: autonomous agents must default to READ-ONLY; "if missing, add it" = report the gap, don't fabricate.