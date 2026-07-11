# Composio Fallback for Google Calendar & Sheets

When `gws` CLI and Python are unavailable (e.g., Docker containers without Python), use Composio tools as the execution path for Google Calendar and Sheets operations.

## Connection Management

Each Google toolkit requires its own Composio connection:
- `googlecalendar` — calendar events (create, list, delete, patch)
- `googlesheets` — spreadsheet operations (create, read, write)
- `googledrive` — file management (upload, download, share)

**Pitfall:** Connecting one toolkit does NOT auto-connect others. Check each independently with `COMPOSIO_MANAGE_CONNECTIONS` before executing tools.

## Calendar Operations via Composio

### Tool discovery
```
COMPOSIO_SEARCH_TOOLS → queries: [{use_case: "create and list calendar events"}]
```
Returns: `GOOGLECALENDAR_CREATE_EVENT`, `GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS`, `GOOGLECALENDAR_DELETE_EVENT`, etc.

### Schema check
Some tools have `hasFullSchema: false` with a `schemaRef`. Call `COMPOSIO_GET_TOOL_SCHEMAS` before first use to get full parameter definitions.

### Bulk operations
`COMPOSIO_MULTI_EXECUTE_TOOL` handles up to 50 parallel tool calls. Use for:
- Creating multiple recurring events in one batch
- Deleting multiple events (cap at 5-10 per batch to avoid rate limits)

### Read-only calendar pitfall
**Symptom:** 403 Forbidden when deleting events from a calendar you don't own.

**Root cause:** The calendar's `accessRole` is `freeBusyReader` or `reader` — you can see events but not modify them.

**Detection:** Check `accessRole` in the calendar list response before attempting mutations:
- `owner` → full access
- `writer` → can create/edit/delete
- `reader` → read-only
- `freeBusyReader` → can only see free/busy status

**Fix:** Unsubscribe from the calendar, or ask the calendar owner to clean up.

## Sheets Operations via Composio

### Connection required
Unlike Calendar (which may already be connected), Sheets always needs a fresh connection:
```
COMPOSIO_MANAGE_CONNECTIONS → toolkits: [{name: "googlesheets", action: "add"}]
COMPOSIO_WAIT_FOR_CONNECTIONS → toolkits: ["googlesheets"]
```

### Sheet creation reliability
**Pitfall:** `GOOGLESHEETS_CREATE_GOOGLE_SHEET1` may timeout on first attempt via `COMPOSIO_MULTI_EXECUTE_TOOL`.

**Workaround:** Use `COMPOSIO_REMOTE_WORKBENCH` with `run_composio_tool()` for more reliable creation:
```python
result, error = run_composio_tool("GOOGLESHEETS_CREATE_GOOGLE_SHEET1", {"title": "Sheet Name"})
# Extract spreadsheet_id defensively from nested response
data = result.get("data", {})
if isinstance(data, dict) and isinstance(data.get("data"), dict):
    data = data["data"]
spreadsheet_id = data.get("spreadsheetId")
```

### Writing data
Use `GOOGLESHEETS_VALUES_UPDATE` with `value_input_option: "USER_ENTERED"` for parsed input (numbers stay numbers, formulas work).

## Daily Cron Integration

For a "single source of truth" pattern:
1. Calendar IS the source of truth for schedule
2. Cron job reads calendar each morning → posts briefing
3. Any schedule change = update calendar → next morning's briefing reflects it

Example cron (7 AM PDT):
```
schedule: "0 14 * * *"  # 14:00 UTC = 7:00 AM PDT
prompt: Read today's calendar events using GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS and post a morning summary.
deliver: discord:<channel_id>
```

## EVENTS_IMPORT: Creating Calendar Events

`GOOGLECALENDAR_EVENTS_IMPORT` requires specific parameter shapes — flat strings fail silently:

```python
# CORRECT
result, err = run_composio_tool("GOOGLECALENDAR_EVENTS_IMPORT", {
    "calendar_id": "primary",
    "iCalUID": "unique-event-id@hermes",  # REQUIRED
    "summary": "Event Title",
    "start": {"dateTime": "2026-07-07T17:00:00-07:00", "timeZone": "America/Los_Angeles"},
    "end": {"dateTime": "2026-07-07T17:30:00-07:00", "timeZone": "America/Los_Angeles"},
    "description": "Event details"
})

# WRONG — missing iCalUID or flat datetime strings
result, err = run_composio_tool("GOOGLECALENDAR_EVENTS_IMPORT", {
    "summary": "Event Title",
    "start": "2026-07-07T17:00:00-07:00",  # FAILS
    "end": "2026-07-07T17:30:00-07:00"
})
```

**Error messages if wrong:**
- `"Following fields are missing: {'iCalUID'}"` → add iCalUID
- `"Input should be a valid dictionary on parameter 'start'"` → wrap in `{"dateTime": ..., "timeZone": ...}`

**Alternative:** For simple events, use `$GAPI calendar create` (gws CLI) instead — it auto-generates iCalUID and handles datetime formatting.

## Recurring Events

Create events with `recurrence` array using RFC 5545 RRULE:
- Daily: `["RRULE:FREQ=DAILY"]`
- Weekdays: `["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"]`
- Weekly on Saturday: `["RRULE:FREQ=WEEKLY;BYDAY=SA"]`

Always include `timezone` (e.g. "America/Los_Angeles") for recurring events. Naive datetimes produce unexpected offsets.

## Timezone Handling for Biometric Data

When pulling data from Oura Ring (or similar devices) and writing to Google Sheets:

1. Oura returns UTC — all sleep, workout, and readiness timestamps are in UTC
2. Convert to user's local timezone before writing (PDT = UTC-7, PST = UTC-8)
3. Detection: If bedtime shows as 6-8 AM and wake as 2-4 PM, it is UTC, not the user's actual schedule
