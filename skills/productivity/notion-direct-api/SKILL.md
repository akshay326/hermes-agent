---
name: notion-direct-api
description: >-
  Notion API operations via bun — direct API (with token) or proxy fallback
  (localhost:3099, no auth needed). Token locations: ~/.hermes/.env or
  evobot/.env as NOTION_TOKEN. Database IDs: NOTION_RESEARCH_DB_ID,
  NOTION_PROMPTS_DB_ID. Use this instead of Composio for Notion — it's faster,
  more reliable, and avoids OAuth friction. Also covers Readwise API access
  (READWISE_TOKEN in ~/.hermes/.env) — see references/readwise-api.md.
triggers:
  - user mentions Notion, research-db, notion page, notion database
  - task involves reading/writing to Notion
  - previous attempt via Composio failed
priority: high
---

# Notion Direct API via Bun

## Critical Facts
- Token: `NOTION_TOKEN` (50 chars, starts with `ntn_`)
- API version: `2022-06-28`
- Bot name: `akshay-notion-ec2`
- `curl` and `python3` are NOT available. Use `bun -e` only.
- **For full database inventory, load `notion-guardrails` skill.** Quick reference:
  - Research DB: `38910db4-1d13-8008-a491-d8091db7914e`
  - Prompts DB: `38f10db4-1d13-8162-b083-e9ab3676604c`
  - LLM Training Todo: `178f1a89-09e8-4ec8-810d-4e2350d96d33` (Name/Status/Priority/Deadline/Tags)
  - Questions: `39010db4-1d13-8163-a252-f09442c4b256`
  - diary-db: `5f77be0f-dea6-43b7-930f-18a561c4ff95`

## Token Discovery (check in order)

The token location varies. Check these in order until you find a working one:

1. `~/.hermes/.env` → `NOTION_TOKEN`
2. `/home/ubuntu/akshay-projects/evobot/.env` → `NOTION_TOKEN` (known working location as of 2026-07)
3. `/workspace/.env` → `NOTION_TOKEN` or `NOTION_API_KEY`

Verify the token works before building scripts:
```bash
source /home/ubuntu/akshay-projects/evobot/.env && bun -e "
const r = await fetch('https://api.notion.com/v1/users/me', {
  headers: { 'Authorization': 'Bearer ' + process.env.NOTION_TOKEN, 'Notion-Version': '2022-06-28' }
});
console.log(r.status, (await r.json()).object);
"
```
If status is 401, the token is valid-length but revoked. Skip to the proxy fallback below.

## Proxy Fallback (localhost:3099)

A Notion proxy runs on `localhost:3099` (bun process, auto-started). It routes requests to the Notion API **without requiring auth headers** — the proxy handles authentication internally.

```bash
# Verify proxy is alive
curl -s http://localhost:3099/v1/users/me | head -100
# Should return: {"object":"user","name":"akshay-notion-ec2",...}
```

**Proxy usage pattern** — replace `https://api.notion.com` with `http://localhost:3099` and drop all auth headers:
```bash
bun -e "
const r = await fetch('http://localhost:3099/v1/pages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // NO auth headers
  body: JSON.stringify({ parent: { database_id: '...' }, properties: { ... } })
});
console.log(await r.json());
"
```

**Pitfall: Proxy schema limitation.** Through the proxy, `GET /v1/databases/{id}` returns only metadata (title, id, url) — it does NOT return `properties`. You cannot discover the schema via the proxy. Use the documented schema in this skill instead (see "research-db Schema" section below).

**When to use proxy vs direct API:**
- Direct API (with valid token): preferred, supports schema discovery
- Proxy: fallback when token is 401, or for quick one-off operations where you already know the schema

## Shell Interpolation (THE #1 PITFALL)

**WRONG** — single-quoted bun -e prevents variable expansion:
```bash
source ~/.hermes/.env && bun -e 'const t = "$NOTION_TOKEN"; ...'
```

**RIGHT** — use double-quoted outer string or shell interpolation:
```bash
source ~/.hermes/.env && bun -e "
const t = process.env.NOTION_TOKEN;
const r = await fetch('https://api.notion.com/v1/users/me', {
  headers: { 'Authorization': 'Bearer ' + t, 'Notion-Version': '2022-06-28' }
});
console.log(await r.json());
"
```

**ALTERNATIVE** — embed directly in single-quoted bun-e with shell variable:
```bash
source ~/.hermes/.env && bun -e '
const t = "'"$NOTION_TOKEN"'";
const r = await fetch("https://api.notion.com/v1/users/me", {
  headers: { "Authorization": "Bearer " + t, "Notion-Version": "2022-06-28" }
});
console.log(await r.json());
'
```

## MANDATORY FIRST STEP: Discover Schema Before ANY Write

**Every session, before creating or updating pages: run schema discovery first.** Property names are NOT intuitive — the research DB uses `lesson` (not `Name`), has no `Status` field, and uses `source_transcript` + `rational evidence` as rich_text fields. Guessing property names wastes a round-trip and produces confusing 400 errors.

```bash
source ~/.hermes/.env && bun -e '
const t = process.env.NOTION_TOKEN;
const r = await fetch("https://api.notion.com/v1/databases/38910db4-1d13-8008-a491-d8091db7914e", {
  headers: { "Authorization": "Bearer " + t, "Notion-Version": "2022-06-28" }
});
const d = await r.json();
for (const [name, def] of Object.entries(d.properties)) {
  console.log(name, ":", def.type);
}
'
```

This is NOT optional even if you "already know" the schema. Run it. Every time.

## Common Operations

### 1. Fetch Database Schema
```bash
source ~/.hermes/.env && bun -e '
const t = "'"$NOTION_TOKEN"'";
const DB = "'"$NOTION_RESEARCH_DB_ID"'";
const r = await fetch("https://api.notion.com/v1/databases/" + DB, {
  headers: { "Authorization": "Bearer " + t, "Notion-Version": "2022-06-28" }
});
const d = await r.json();
for (const [name, def] of Object.entries(d.properties)) {
  let extra = "";
  if (def.type === "select") extra = " → " + def.select.options.map(o=>o.name).join(", ");
  if (def.type === "multi_select") extra = " → " + def.multi_select.options.map(o=>o.name).join(", ");
  console.log(name + " (" + def.type + ")" + extra);
}
'
```

### 2. Create Page
```bash
source ~/.hermes/.env && bun -e '
const t = "'"$NOTION_TOKEN"'";
const DB = "'"$NOTION_RESEARCH_DB_ID"'";
const r = await fetch("https://api.notion.com/v1/pages", {
  method: "POST",
  headers: { "Authorization": "Bearer " + t, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
  body: JSON.stringify({
    parent: { database_id: DB },
    properties: {
      "lesson": { title: [{ text: { content: "Title Here" } }] },
      "Tags": { multi_select: [{ name: "Health" }] },
      "Year": { number: 2026 },
      "source_transcript": { rich_text: [{ text: { content: "Source info" } }] },
      "rational evidence": { rich_text: [{ text: { content: "Evidence" } }] }
    }
  })
});
const d = await r.json();
console.log("Status:", r.status);
console.log("Page ID:", d.id);
console.log("URL:", d.url);
'
```

### 3. Add Body Content (max 100 blocks per call)
```bash
source ~/.hermes/.env && bun -e '
const t = "'"$NOTION_TOKEN"'";
const PAGE = "PAGE_ID_HERE";
const blocks = [
  { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "Section" } }] } },
  { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "Content" } }] } },
  { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: "Item" } }] } },
];
const r = await fetch("https://api.notion.com/v1/blocks/" + PAGE + "/children", {
  method: "PATCH",
  headers: { "Authorization": "Bearer " + t, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
  body: JSON.stringify({ children: blocks })
});
const d = await r.json();
console.log("Blocks added:", d.results?.length || 0);
'
```

### 4. Query Database
```bash
source ~/.hermes/.env && bun -e '
const t = "'"$NOTION_TOKEN"'";
const DB = "'"$NOTION_RESEARCH_DB_ID"'";
const r = await fetch("https://api.notion.com/v1/databases/" + DB + "/query", {
  method: "POST",
  headers: { "Authorization": "Bearer " + t, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
  body: JSON.stringify({ page_size: 5 })
});
const d = await r.json();
for (const p of d.results) {
  const title = p.properties.lesson?.title?.[0]?.plain_text || "untitled";
  console.log(p.id, title);
}
'
```

## research-db Schema
| Property | Type | Options |
|----------|------|---------|
| lesson | title | — |
| Tags | multi_select | Decision, Health, Work, Relationships, Money, Meta, stress, psychology, mind, automation, AI, learning, cognitive offloading, education, sleep, neurodegeneration, Alzheimer, circadian, meditation, HRV, meta-analysis, burnout, resilience, sleep debt, oxidative stress, exercise, chronotype, cardiometabolic, personal health, oura ring |
| Year | number | — |
| source_transcript | rich_text | — |
| rational evidence | rich_text | — |

## Eval Harness
Run `scripts/notion-eval.js` to verify the integration works (5 operations, 3-retry each).
```bash
source /workspace/.env && bun evals/notion-eval.js
```
Expected: 5/5 passed. Tested 3 consecutive runs, all first-attempt passes.

## Overlap Note
This skill overlaps with the existing `notion` skill (Notion API + ntn CLI). Use THIS skill (direct bun API) instead of the `notion` skill — it's faster, more reliable, and avoids Composio OAuth.

## MANDATORY: Template for New Entries

Every research-db entry MUST include body content. Never create a thin entry (title + properties only).

### Template A: Multi-POV Analysis (DEFAULT for auto-discovered papers)

Use this for papers found by the research-discovery pipeline. The user explicitly rejected raw abstract dumps as "too crude" and "cryptic."

**CRITICAL: Layered Content Architecture — No Redundancy**

The user corrected redundant content between the evidence property and page body: "what should you write, where, and why is the redundancy acting in the first place?" The fix: each layer serves a distinct purpose.

- **Evidence property** = TL;DR. Concise, scannable, one-line per POV with action. Shows in database table views. Keep under 1900 chars.
- **Page body** = Deep analysis. The reasoning chain, paper methodology, biometric data grounding, CBT thought→feeling→behavior chain, implementation details. This is what you see when you open the page.

**NEVER** copy the same content into both. The evidence property summarizes; the page body explains.

#### Evidence property format (TL;DR — what you see in table views):
```
AUTO-DISCOVERED YYYY-MM-DD
Authors: [names]
Source: [URL]

EXECUTIVE SUMMARY: [1-2 sentences]

HEALTH: [one-line takeaway]
→ Action: [one concrete action]

WEALTH: [one-line takeaway]
→ Action: [one concrete action]

SOCIAL: [one-line takeaway]
→ Action: [one concrete action]

CBT: [one-line takeaway]
→ Reframe: [one cognitive reframing]

PERSONAL: [key data points from user's Oura/HRV]
→ 1. [action]  2. [action]  3. [action]

VERDICT: [one sentence]
```

#### Page body format (deep analysis — what you see when you open the page):
```
📄 Paper Overview
[Methodology, sample size, key metrics — NOT the abstract dump]

🔬 The Key Finding
[The core asymmetry or result, with numbers]

📊 Your [Biometric] Data Against This Framework
[Pull real data from Oura/HRV: regularity score, HRV avg, workout patterns, sleep quality]
[Connect the paper's findings to the user's actual numbers]

🧠 CBT Chain: [Specific pattern]
[Trigger → Automatic thought → Emotion → Behavior → Result]
[The reframe, grounded in the paper's data]

🎯 Implementation: [N]-Trait Fix
[Specific actions with numbers, not generic advice]

⚖️ Bottom Line
[One thing to do, with the reasoning]
```

The "Personal" POV in the page body should ground recommendations in the user's ACTUAL biometric data (HRV avg, regularity score, workout HRV penalty, sleep patterns). This requires fetching real data before generating the analysis.

### Template B: Academic (for manually added papers)

```
## Research Question
[What question does this answer? PICO if applicable]

## Key Findings
[3-5 bullets with numbers/effect sizes]

## Methodology
[Study design, sample size, duration]

## Relevance & Implications
[How this applies to MY context]

## References
[Full citations with DOIs]
```

Always add body content when creating a page. Use Template A for auto-discovered papers, Template B for manually curated entries.

## Two-Step Page Pattern (DEFAULT for any page with body content)

Always use this pattern — create page with properties first, then add body content as blocks:

1. **POST /v1/pages** — properties only. Keep every rich_text content field under 2000 chars. Use short summaries in `rational evidence` and `source_transcript`.
2. **PATCH /v1/blocks/{pageId}/children** — add full body content as heading/paragraph/list blocks. Each text node still has the 2000-char limit, but you get unlimited nodes.

This avoids truncation and keeps properties clean. Never try to stuff long content into property rich_text fields.

**For complex scripts:** Write to a file (e.g. `~/.hermes/scripts/notion-*.js`) and run with `source ~/.hermes/.env && bun ~/.hermes/scripts/notion-*.js` — avoids shell quoting issues in long inline scripts.

## Pitfalls
1. **Shell quoting**: Always use the shell interpolation pattern to pass shell vars into bun -e
2. **Block limit**: Notion API max 100 blocks per PATCH request
3. **Rich text limit**: Max 2000 chars per text content field
4. **Composio is unnecessary**: Don't fall back to Composio OAuth — the direct API works
5. **Token looks truncated in cat**: The `...` in `cat` output is cosmetic — the full 50-char token is valid
6. **Scripts over inline**: For complex operations, write to a file and run with `bun` — avoids shell quoting issues in long inline scripts
7. **Token 401 despite valid length**: Token may be 50 chars with correct `ntn_` prefix but still return 401 (rotated/revoked). Verify with a quick `GET /v1/users/me` before building scripts. If 401, use the proxy fallback (localhost:3099).
8. **Proxy schema gap**: The proxy at localhost:3099 does NOT return `properties` on `GET /v1/databases/{id}` — only metadata. Use the documented schema tables in this skill instead of attempting runtime schema discovery through the proxy.
