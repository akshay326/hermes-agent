# Notion DB Insertion & Research→Calendar Pipeline

## Notion DB Row Insertion

### Correct tool: `NOTION_INSERT_ROW_DATABASE`

**NOT** `NOTION_CREATE_ROW` — that tool does not exist. Common mistake.

### Properties format: ARRAY of objects, not a dict

```python
# CORRECT
properties = [
    {"name": "lesson", "type": "title", "value": "Paper title here"},
    {"name": "Tags", "type": "multi_select", "value": "Health,psychology,meta-analysis"},
    {"name": "Year", "type": "number", "value": "2022"},
    {"name": "rational evidence", "type": "rich_text", "value": "Summary of findings..."},
    {"name": "source_transcript", "type": "rich_text", "value": "https://doi.org/..."}
]

# WRONG — this causes validation errors
properties = {
    "lesson": "Paper title here",
    "Tags": "Health,psychology"
}
```

### Property type rules
- `title` — exactly ONE per database, maps to the primary title column
- `rich_text` — all other text fields use this, NOT `text`
- `multi_select` — comma-separated option names (must match schema exactly, case-sensitive)
- `number` — numeric STRING (e.g., `"2022"`, not `2022`)
- `select` — single option name
- `date` — ISO 8601 string

### Schema discovery
Always call `NOTION_FETCH_DATABASE` first to get exact property names and types. Property names are case-sensitive and vary per database.

### Batch insertion
Use `COMPOSIO_MULTI_EXECUTE_TOOL` with up to 50 parallel `NOTION_INSERT_ROW_DATABASE` calls for bulk inserts.

## Google Calendar Personal Event Creation

### `exclude_organizer: true`
For personal events (walking breaks, focus time, habits), set `exclude_organizer: true` to prevent being added as an attendee to your own event. Without this, you get a Google Meet link and an attendee entry for yourself.

### `create_meeting_room: false` (for non-meeting events)
The default is `true`, which adds a Google Meet link. For personal break blocks, this is noise. Unfortunately the schema doesn't have a separate param — the Meet link is added by default. If you need to avoid it, the event still works; just ignore the Meet link.

### Timezone always required
Always pass `timezone: "America/Los_Angeles"` (or appropriate IANA zone). Naive datetimes without timezone produce unexpected offsets.

### Transparency for break blocks
Break blocks should be `opaque` (default) so they block time and prevent meeting scheduling during breaks. Use `transparent` only for informational events that shouldn't block availability.

## Research→DB→Calendar Pipeline

A reusable pattern for turning research findings into scheduled behavioral interventions:

### Step 1: Academic search via Exa
```
EXA_ANSWER with model="exa-pro" for citation-backed answers
EXA_SEARCH + EXA_GET_CONTENTS_ACTION for deeper extraction
```
Use `category: "research paper"` for academic sources. `exa-pro` model expands queries for better coverage.

### Step 2: Annotate in Notion research DB
Create rows with:
- `lesson` (title): One-sentence takeaway
- `Tags` (multi_select): Relevant topic tags
- `Year` (number): Publication year
- `rational evidence` (rich_text): Effect sizes, sample sizes, key findings, DOI
- `source_transcript` (rich_text): URL or DOI link

### Step 3: Schedule behavioral interventions in Google Calendar
For each research-backed intervention:
1. Fetch user's existing calendar to find appropriate time blocks
2. Calculate break placement using the research (e.g., 45-min work → 18-min break)
3. Create calendar events with:
   - `summary`: Emoji + descriptive name (e.g., "🚶 Walking Break — ML Research")
   - `description`: The specific paper citation + instruction
   - `exclude_organizer: true`
   - `timezone` explicitly set
4. Batch creation via `COMPOSIO_MULTI_EXECUTE_TOOL`

### Parallel execution
All three steps can be parallelized:
- Exa search queries are independent
- Notion DB inserts are independent of each other
- Calendar events for different days are independent
- Only constraint: DB schema fetch must precede Notion inserts

## Schedule Optimization Pattern (Batch Delete→Recreate)

When the user asks to optimize an existing calendar schedule:

1. **Collect event IDs** from the previous creation (save them in the same session)
2. **Batch delete** old events via `GOOGLECALENDAR_DELETE_EVENT` in parallel (up to 50 per batch)
3. **Batch create** new optimized events in parallel
4. **Verify** by listing the time window after creation

This is faster than PATCHing each event individually, and avoids schema mismatch issues when the event structure changes (e.g., different break duration, different description).

### Timing optimization principle
For cognitive work breaks, the research says:
- Breaks <10 min don't help performance (Albulescu 2022)
- Nature exposure benefits begin at 10-15 min, peak at 30 min (Bell 2025)
- Longer breaks give better restoration per minute than multiple short breaks
- One 30-min walk > three 15-min walks for full attention restoration

## Pitfalls

1. **`NOTION_CREATE_ROW` does not exist** — use `NOTION_INSERT_ROW_DATABASE`
2. **Notion properties is an array, not a dict** — passing a dict causes 400 validation errors
3. **Multi-select values are case-sensitive** — `"Health"` ≠ `"health"`. Check schema first.
4. **Calendar events without timezone** — produce unexpected offsets, especially around DST
5. **`exclude_organizer` defaults to false** — you'll get a Meet link and self-attendee without it
6. **Notion parent page may not be accessible** — the parent page ID from DB schema (`parent.page_id`) may return 404. Always search for an accessible page first via `NOTION_SEARCH_NOTION_PAGE` before creating child pages. The DB itself is not a valid parent for standalone pages.
7. **Batch delete requires saving event IDs** — when recreating events, you must have the IDs from creation. If IDs aren't saved, use `GOOGLECALENDAR_FIND_EVENT` with a time window to recover them before deleting.
