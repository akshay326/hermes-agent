# Notion via Composio MCP — Quirks & Pitfalls

Reference for Notion operations via Composio's `NOTION_*` tools (not `ntn` CLI or curl).

## Code Block Format

**Pitfall:** `NOTION_ADD_MULTIPLE_PAGE_CONTENT` does NOT accept the simplified format for code blocks.

**Wrong (fails with `'code' is not a valid block_property`):**
```json
{"content_block": {"content": "sequenceDiagram...", "block_property": "code"}}
```

**Correct (full Notion schema required):**
```json
{"content_block": {
  "type": "code",
  "code": {
    "language": "mermaid",
    "rich_text": [{"type": "text", "text": {"content": "sequenceDiagram..."}}]
  }
}}
```

All other block types work with the simplified format:
- `{"content_block": {"content": "...", "block_property": "paragraph"}}`
- `{"content_block": {"content": "...", "block_property": "heading_2"}}`
- `{"content_block": {"content": "...", "block_property": "bulleted_list_item"}}`
- `{"content_block": {"content": "...", "block_property": "numbered_list_item"}}`
- `{"content_block": {"content": "...", "block_property": "to_do"}}`
- `{"content_block": {"content": "...", "block_property": "quote"}}`
- `{"content_block": {"content": "...", "block_property": "callout"}}`
- `{"content_block": {"content": "---", "block_property": "divider"}}`

## Bulk Content Strategy

For pages with 20+ blocks (e.g., comprehensive docs, research syntheses):

1. **Create page** with `NOTION_CREATE_NOTION_PAGE` (small initial markdown seed)
2. **Add content** via `COMPOSIO_REMOTE_WORKBENCH` with `run_composio_tool("NOTION_ADD_MULTIPLE_PAGE_CONTENT", ...)` in batches of 4-5 blocks
3. **Avoid** `COMPOSIO_MULTI_EXECUTE_TOOL` for complex nested structures — it sometimes has JSON serialization issues with code blocks

**Why the workbench is more reliable:** The Python `run_composio_tool` helper handles JSON serialization correctly, while the multi-execute tool sometimes mangles nested objects.

## Mermaid Diagrams in Notion

Mermaid diagrams work as code blocks with `language: "mermaid"`. Notion renders them as code (not interactive diagrams), but the syntax is preserved. Users can paste into [mermaid.live](https://mermaid.live) to render.

## Page Creation Flow

```
1. NOTION_SEARCH_NOTION_PAGE → find parent page/database
2. NOTION_CREATE_NOTION_PAGE → create with title + icon + small markdown
3. NOTION_ADD_MULTIPLE_PAGE_CONTENT → append in batches
4. NOTION_GET_PAGE_MARKDOWN → verify final result
```

**Parent page discovery:** Search with empty query + `filter_value: "database"` to list all databases. Databases have `parent.type: "page_id"` — use that page_id as parent for new pages.

## Database Creation

**Pitfall:** `NOTION_CREATE_DATABASE` requires a `title` property in the properties array. Without it, returns `400 validation_error: Property 'title' is required`.

**Correct format:**
```json
{
  "parent_id": "page-uuid",
  "title": "My Database",
  "properties": [
    {"name": "Title", "type": "title"},  // REQUIRED
    {"name": "Date", "type": "date"},
    {"name": "Status", "type": "select", "select": {"options": [...]}}
  ]
}
```

## Row Insertion Value Types

**Pitfall:** `NOTION_INSERT_ROW_DATABASE` requires all property values to be **strings**, even for dates and checkboxes.

**Wrong (fails with `Input should be a valid string`):**
```json
{"name": "Day Number", "type": "number", "value": 1}
{"name": "Action Completed", "type": "checkbox", "value": false}
```

**Correct:**
```json
{"name": "Day Number", "type": "number", "value": "1"}
{"name": "Action Completed", "type": "checkbox", "value": "false"}
```

## MULTI_EXECUTE_TOOL vs REMOTE_WORKBENCH

**Pattern:** `COMPOSIO_MULTI_EXECUTE_TOOL` sometimes fails with JSON serialization issues for complex nested structures (especially code blocks). Use `COMPOSIO_REMOTE_WORKBENCH` with `run_composio_tool()` as fallback.

**When to use which:**
- `MULTI_EXECUTE_TOOL` — simple text blocks (paragraphs, headings, lists)
- `REMOTE_WORKBENCH` — code blocks, complex nested structures, batches of 5+ blocks

**Why the workbench is more reliable:** The Python `run_composio_tool` helper handles JSON serialization correctly, while the multi-execute tool sometimes mangles nested objects.

## Tool Name Differences

| Action | Composio Tool | Notes |
|--------|--------------|-------|
| Search pages | `NOTION_SEARCH_NOTION_PAGE` | Returns pages + databases |
| Create page | `NOTION_CREATE_NOTION_PAGE` | Needs parent_id, title, optional markdown |
| Add content | `NOTION_ADD_MULTIPLE_PAGE_CONTENT` | Batch blocks (max 100) |
| Read page | `NOTION_GET_PAGE_MARKDOWN` | Returns Notion-flavored markdown |
| Fetch database | `NOTION_FETCH_DATABASE` | Needs database_id |
| Update page | `NOTION_UPDATE_PAGE` | Properties, icon, cover |
| List blocks | `NOTION_FETCH_BLOCK_CONTENTS` | Paginated children |
| Replace content | `NOTION_REPLACE_PAGE_CONTENT` | Destructive — deletes all children first |
