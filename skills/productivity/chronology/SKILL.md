---
name: chronology
description: "Query Akshay's personal timeline (Chronology Notion DB) — what he read, wrote, and did. Use at session start to ground yourself in recent activity."
version: 1.0.0
author: hermes-agent
tags: [notion, timeline, context, readwise]
metadata:
  hermes:
    tags: [notion, timeline, context]
    created_by: agent
---

# Chronology — Personal Timeline

A timeline DB that aggregates verifiable actions where Akshay is the author:
- **Readwise** highlights grouped by document (one entry per book/article)
- **Notion** entries from research-db, Questions
- **thoughts-db** — independent thoughts (title IS the date, body is the thinking)
- **Manual** entries for anything else

## Schema

| Field | Type | Purpose |
|-------|------|---------|
| Event | title | What happened |
| Date | date | When — timeline index |
| Source | select | Readwise / thoughts-db / research-db / Questions / Manual |
| Type | select | article / thought / research / question / note |
| Tags | multi_select | Topic axis (AI, health, startups...) |
| Status | select | new / reviewed / starred |
| URL | url | Link back to source |
| Summary | rich_text | One-line description |

Minimum for insertion: Event + Date + Source. Everything else is enrichment.

**DB ID:** `39910db41d1381899acbcec6f60c16cf`
**API Version:** `2022-06-28`
**Auth:** `export $(grep NOTION_TOKEN /home/ubuntu/akshay-projects/evobot/.env | xargs)`

## Query: Recent Activity (for session grounding)

```bash
export $(grep NOTION_TOKEN /home/ubuntu/akshay-projects/evobot/.env | xargs) && bun -e '
const t = process.env.NOTION_TOKEN;
const r = await fetch("https://api.notion.com/v1/databases/39910db41d1381899acbcec6f60c16cf/query", {
  method: "POST",
  headers: { "Authorization": "Bearer " + t, "Notion-Version": "2022-06-28", "Content-Type": "application/json" },
  body: JSON.stringify({
    page_size: 20,
    sorts: [{ property: "Date", direction: "descending" }]
  })
});
const d = await r.json();
for (const p of d.results || []) {
  const ev = p.properties.Event?.title?.[0]?.plain_text || "";
  const dt = p.properties.Date?.date?.start || "";
  const src = p.properties.Source?.select?.name || "";
  const type = p.properties.Type?.select?.name || "";
  const tags = p.properties.Tags?.multi_select?.map(t=>t.name) || [];
  console.log(`${dt} | ${src} | ${type} | [${tags.join(",")}] | ${ev}`);
}
'
```

## Query: Thoughts Only

```bash
# Filter by Source = thoughts-db
filter: { "property": "Source", "select": { "equals": "thoughts-db" } }
```

## Query: By Type

```bash
filter: { "property": "Type", "select": { "equals": "thought" } }
```

## Sync Script

`~/.hermes/scripts/chronology-sync.js` — pulls fresh data from Readwise + Notion + thoughts-db.

```bash
export $(grep NOTION_TOKEN /home/ubuntu/akshay-projects/evobot/.env | xargs) && \
export $(grep READWISE_TOKEN ~/.hermes/.env | xargs) && \
bun ~/.hermes/scripts/chronology-sync.js
```

Groups Readwise highlights by document (one entry per book/article, not per highlight). Deduplicates against existing entries. Cron: daily at 6 AM UTC (`ffcf4bc3d3c3`), local-only delivery.

## Usage Patterns

1. **Session start**: Query recent activity to ground context ("what has Akshay been reading/doing?")
2. **Post-sync**: After running chronology-sync.js, review what was captured
3. **Manual entry**: Create entries for actions not from Readwise/Notion (meetings, workouts, etc.)

## Pitfalls

1. **Token export**: Must use `export $(grep NOTION_TOKEN ... | xargs)` — `source` alone doesn't propagate to bun
2. **Rate limit**: Notion API ~3 req/s. Sync script handles this naturally with sequential writes
3. **Encoding**: Some Readwise highlights have non-BMP chars that Notion rejects — script sanitizes them
4. **Timeline view**: Enable in Notion UI after DB creation — not settable via API
