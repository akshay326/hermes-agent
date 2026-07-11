# Notion API Write Patterns

Durable patterns for writing to Notion databases via API. These are API-level truths, not environment-specific.

## Schema Discovery (Always First)

```bash
GET /v1/databases/{database_id}
Headers: Authorization: Bearer {token}, Notion-Version: 2022-06-28
```

Response gives `properties` object — each key is a property name, value has `type` field. Example:
```json
{
  "lesson": {"type": "title"},
  "Tags": {"type": "multi_select", "multi_select": {"options": [...]}},
  "Year": {"type": "number"},
  "source_transcript": {"type": "rich_text"},
  "rational evidence": {"type": "rich_text"}
}
```

## Property Value Formatting

| Notion Type | Correct Format | Wrong Format |
|-------------|---------------|--------------|
| title | `{title: [{text: {content: "..."}}]}` | `{title: "..."}` |
| rich_text | `{rich_text: [{text: {content: "..."}}]}` | `{rich_text: "..."}` |
| number | `{number: 2026}` | `{number: "2026"}` |
| select | `{select: {name: "Option"}}` | `{select: "Option"}` |
| multi_select | `{multi_select: [{name: "A"}, {name: "B"}]}` | `{multi_select: ["A", "B"]}` |
| date | `{date: {start: "2026-01-01"}}` | `{date: "2026-01-01"}` |
| checkbox | `{checkbox: true}` | `{checkbox: "true"}` |

**Common errors:**
- 400 "is not a property" → wrong property name (check schema, case-sensitive)
- 400 "expected to be X" → wrong type (e.g., used `status` instead of `select`)
- Title property is always named by the DB, not "title" — check schema for actual name

## Batch Create Pattern

```javascript
const entries = [...]; // array of objects with your data
for (const e of entries) {
  const body = {
    parent: { database_id: dbId },
    properties: {
      "Title Field": { title: [{ text: { content: e.title } }] },
      "Text Field": { rich_text: [{ text: { content: e.text } }] },
      "Number Field": { number: e.year },
      "Tags": { multi_select: e.tags.map(t => ({ name: t })) }
    }
  };
  const resp = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (data.id) { /* success */ }
  else { /* handle data.message error */ }
}
```

## Pagination for Queries

```javascript
let cursor = undefined;
let allRows = [];
while (true) {
  const body = { page_size: 100 };
  if (cursor) body.start_cursor = cursor;
  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await resp.json();
  allRows.push(...(data.results || []));
  if (!data.has_more) break;
  cursor = data.next_cursor;
}
```

## Hermes Docker Environment Notes

- `curl` and `python3` may not be available in the terminal
- Use `bun -e '...'` (bun is at /usr/local/bin/bun) for HTTP calls with `fetch()`
- Or use `mcp_composio_COMPOSIO_REMOTE_WORKBENCH` which has Python with `urllib`
- API tokens: check `/workspace/.env` first (NOTION_TOKEN, NOTION_RESEARCH_DB_ID)
- Token format: `ntn_...` prefix, pass as Bearer header
- **⚠️ Redacted tokens:** Docker env files often mask secrets (e.g. `ntn_b4...W4jj`). If `source .env && echo $NOTION_TOKEN | head -c 10` shows `...`, the token is invalid — direct API calls will 401. Fall back to Composio OAuth: `COMPOSIO_SEARCH_TOOLS` → `COMPOSIO_MANAGE_CONNECTIONS` (toolkit: "notion") → show user OAuth link → `COMPOSIO_WAIT_FOR_CONNECTIONS` → then `NOTION_INSERT_ROW_DATABASE` via `COMPOSIO_MULTI_EXECUTE_TOOL`.
