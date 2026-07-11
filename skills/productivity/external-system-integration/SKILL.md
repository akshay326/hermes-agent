---
name: external-system-integration
description: "Patterns and quirks when integrating with external systems via APIs — data retrieval, format mismatches, pagination, and reliability differences between tool variants."
version: 1.0.0
author: hermes
license: MIT
platforms: [linux, macos, windows]
prerequisites: []
metadata:
  hermes:
    tags: [external-apis, integrations, google-drive, composio, data-retrieval]
    related_skills: [google-workspace, external-system-hygiene]
---

# External System Integration

**Patterns and quirks when working with external systems via APIs. Covers data retrieval, format mismatches, pagination issues, and reliability differences between tool variants.**

## Core Principle

External systems often have inconsistent APIs — the same data can be accessed through different tools with different behaviors. Always verify results across multiple approaches when something seems off.

## Pre-Integration Checklist

Before querying external systems:

1. **Check tool variants** — many systems offer multiple tools (e.g., search vs list). They may have different reliability characteristics.
2. **Verify file types independently** — don't trust filenames or extensions; check actual mime types via metadata.
3. **Handle "empty but not really empty"** — empty results don't distinguish between "no data" and "permission denied" or "tool limitation".
4. **Paginate systematically** — always check for nextPageToken and iterate until exhausted.

## Google Drive Quirks

See `references/drive-composio-quirks.md` for detailed patterns.

## Notion DB Insertion & Research→Calendar Pipeline

See `references/notion-db-and-calendar-pipeline.md` for: correct Notion tool name (`NOTION_INSERT_ROW_DATABASE`, NOT `NOTION_CREATE_ROW`), properties-as-array format, multi-select case sensitivity, personal calendar event creation (`exclude_organizer: true`), the research→DB→calendar pipeline pattern, schedule optimization via batch delete→recreate, and Notion parent page accessibility pitfalls.

## Google Calendar & Sheets via Composio

See `references/composio-google-fallback.md` for patterns when gws/Python unavailable. Covers: separate toolkit connections, read-only calendar detection (`accessRole`), sheet creation timeout workaround (use workbench sandbox), bulk event creation, and daily cron "single source of truth" pattern.

See `references/create-event-schema.md` for `GOOGLECALENDAR_CREATE_EVENT` schema — uses `start_datetime` flat ISO string and `event_duration_hour/minutes`, NOT structured `start/end` objects. Completely different from `EVENTS_IMPORT`.

See `references/calendar-bloat-analysis.md` for: analyzing bloated calendars (600+ recurring events), mapping daily templates, detecting overlaps, and proposing time-block optimizations while preserving user rituals.

**Key learnings:**

### DOWNLOAD_FILE mime_type Behavior

- `GOOGLEDRIVE_DOWNLOAD_FILE` ignores `mime_type` for non-Google Workspace files
- Only works for exporting Docs/Sheets/Slides to different formats
- Regular files always download in native format regardless of mime_type parameter

### FIND_FILE vs LIST_CHILDREN_V2

- `GOOGLEDRIVE_FIND_FILE` with mime type filters can return empty even when files exist
- `GOOGLEDRIVE_LIST_CHILDREN_V2` is more reliable for folder enumeration
- Always verify folder exists with `GET_FILE_METADATA` before querying

### Misleading File Extensions

Files can have extensions that don't match their actual mime type:

| Filename | Actual mime type | Notes |
|----------|------------------|-------|
| `diagram.png` | `application/vnd.jgraph.mxfile` | DrawIO file, not PNG |
| `export.pdf` | `application/vnd.google-apps.document` | Google Doc, not PDF |

**Detection:** Always check `mimeType` from `GET_FILE_METADATA` before assuming file type.

### Pagination Pattern

```python
items = []
resp, _ = run_composio_tool('GOOGLEDRIVE_FIND_FILE', {...})
data = resp.get('data', {})
items += data.get('files', [])
tok = data.get('nextPageToken')
while tok:
    resp, _ = run_composio_tool('GOOGLEDRIVE_FIND_FILE', {..., 'pageToken': tok})
    data = resp.get('data', {})
    items += data.get('files', [])
    tok = data.get('nextPageToken')
```

## Cron Job Pattern for Monitoring

When setting up cron jobs to detect new file uploads:

1. **Don't rely solely on mime type filters** — they may miss files with wrong extensions
2. **Check file metadata after listing** — get actual mime type
3. **Handle the "empty but not really empty" case** — LIST_CHILDREN_V2 may find what FIND_FILE misses
4. **Use createdTime filtering carefully** — account for timezone and clock skew

## Composio Sandbox vs Terminal Environment

**Critical distinction:** The Composio remote sandbox (`COMPOSIO_REMOTE_WORKBENCH`) and the terminal environment are **different execution contexts** with different capabilities.

| Capability | Terminal | Composio Sandbox |
|------------|----------|------------------|
| Environment variables | Full (OPENROUTER_API_KEY, etc.) | May be missing |
| Python | Often unavailable | Jupyter kernel available |
| Bun/Node.js | Usually available | Available |
| Network access | Full | Limited to Composio helpers |

**Pattern:** When calling external APIs (OpenRouter, etc.) from within `COMPOSIO_REMOTE_WORKBENCH`, env vars like API keys may not be available. Two workarounds:

1. **Use terminal to run the script directly** — pass the API key via environment:
   ```bash
   export OPENROUTER_API_KEY="sk-or-..."
   bun run /tmp/analyze.mjs
   ```

2. **Use `COMPOSIO_REMOTE_WORKBENCH` with `invoke_llm`** — Composio's built-in LLM helper doesn't need external API keys.

**When to use which:**
- `COMPOSIO_REMOTE_WORKBENCH` — for bulk data processing, file operations, multi-tool orchestration
- `terminal` — for direct API calls, scripts needing env vars, or when Python is unavailable

## Bun as Python Fallback

When Python is not available in the docker terminal (`which python3` fails), **bun** is usually installed and can run JavaScript/TypeScript scripts. This is particularly useful for:
- Calling external APIs (fetch is available natively)
- File operations
- Data transformation

```bash
cat > /tmp/script.mjs << 'EOF'
const response = await fetch("https://api.example.com/...");
const data = await response.json();
console.log(JSON.stringify(data, null, 2));
EOF
bun run /tmp/script.mjs
```

## Biometric Data Timezone Handling

**Pitfall:** Oura Ring MCP server returns all times in **UTC**, not the user's local timezone. When writing sleep/wake times, workout times, or any timestamped biometric data to Google Sheets or other external systems, convert UTC to the user's local timezone first.

**Example:** User sleeps 11 PM PDT → 7 AM PDT. Oura returns "Bedtime: 6:00 AM → 2:00 PM" (UTC). Without conversion, the sheet shows impossible times.

**Fix:** Subtract the user's UTC offset from all timestamps before writing:
```
PDT = UTC - 7 hours
PST = UTC - 8 hours
```

**Detection:** If Oura sleep data shows bedtime in the morning (6-8 AM) and wake in the afternoon (2-4 PM), it's almost certainly UTC, not local time.

**Also applies to:** Workout start/end times, readiness timestamps, any biometric data from Oura or similar devices that use UTC internally.

## Composio MCP Server Rate Limiting

**Symptom:** `COMPOSIO_MULTI_EXECUTE_TOOL` returns `"MCP server 'composio' is unreachable after 3 consecutive failures"` with auto-retry countdown.

**Root cause:** Burst of rapid Composio API calls triggers rate limiting on the MCP server. Each `COMPOSIO_MULTI_EXECUTE_TOOL` call internally fires multiple API calls.

**Recovery:**
1. Wait **30–50 seconds** before retrying (use `terminal` with `sleep 30`)
2. Reduce batch size — split 5-tool batches into 2–3 smaller batches
3. Avoid calling `COMPOSIO_SEARCH_TOOLS`, `COMPOSIO_MANAGE_CONNECTIONS`, and `COMPOSIO_MULTI_EXECUTE_TOOL` in rapid succession
4. If rate-limited mid-workflow, finish other non-Composio work first, then retry

**Prevention:** When a workflow needs 5+ Composio calls, serialize them with pauses rather than firing all at once.

**Retry loop rule:** NEVER retry the same failing MCP call more than twice in a single turn. After 2 failures, pivot to alternative approaches (session history search, different tool variants, manual fallback). Hitting the same endpoint 4+ times wastes turns, triggers `same_tool_failure_warning`, and signals to the user that you're spinning. The `ml-equation-quizzer` skill has a specific resilience flow for Google Drive access — follow it.

**Fabrication rule:** NEVER fabricate API parameters (file IDs, folder IDs, record IDs) when you don't have real values. Random IDs always 404 and waste turns. If you don't have a real ID from a prior API response or session history, say so — don't guess.

## Google Calendar EVENTS_IMPORT Pitfall

`GOOGLECALENDAR_EVENTS_IMPORT` has strict parameter requirements that differ from other calendar tools:

1. **`iCalUID` is REQUIRED** — must be a unique string (e.g., `"survey-123@hermes"`). Without it, the tool returns 400.
2. **`start`/`end` must be structured objects**, not flat strings:
   ```json
   // CORRECT
   "start": {"dateTime": "2026-07-07T17:00:00-07:00", "timeZone": "America/Los_Angeles"}
   
   // WRONG — flat strings cause "Input should be a valid dictionary" error
   "start": "2026-07-07T17:00:00-07:00"
   ```
3. **Timezone in the object is recommended** — prevents DST-shift surprises.

**Preferred alternative for simple events:** Use the gws CLI `$GAPI calendar create` instead of EVENTS_IMPORT when available — it handles iCalUID and datetime formatting automatically.

## Composio Gmail Account ID Matching

After `COMPOSIO_MANAGE_CONNECTIONS` initiates a Gmail connection, the account ID is shown in the response (e.g., `gmail_cluck-aponic`). When calling tools via `COMPOSIO_MULTI_EXECUTE_TOOL`, you can either:
- Pass `account: "gmail_cluck-aponic"` explicitly, OR
- Omit the `account` field to use the default/only connected account

**Pitfall:** If you pass the wrong account ID (e.g., a partially matched string), the tool returns `"No account found matching"`. When in doubt, omit the account field and let Composio use the active connection automatically.

## Notion Database Discovery (Hidden/Inline Databases)

**Problem:** `NOTION_SEARCH_NOTION_PAGE` returns items from databases the integration can see (via parent page sharing), but `NOTION_FETCH_DATABASE` returns 404 because the database itself isn't directly shared.

**Diagnostic pattern:**
1. Paginate through ALL search results (check `has_more` + `next_cursor` — often 490+ items across 20 pages)
2. Extract unique `parent.database_id` values from child pages — these reveal database IDs you can't directly access
3. Try `NOTION_FETCH_DATABASE` on each discovered ID
4. If still 404, tell user to share: Notion page → `...` → `Connect to` → integration name

```python
# After paginating search results
db_ids = set()
for r in all_results:
    parent = r.get('parent', {})
    if parent.get('type') == 'database_id':
        db_ids.add(parent.get('database_id'))
# Then try FETCH_DATABASE on each
```

**Key insight:** Inline databases (`"is_inline": true`) live inside a parent page. Their ID only appears as `parent.database_id` on child pages, not in top-level search results.

## `NOTION_FETCH_ROW` Parameter Name

Takes `page_id`, NOT `block_id`. Passing `block_id` returns `{'page_id': 'Missing'}` error.

## Signals You're Hitting a Quirk

- Empty results when you know files exist
- Files not matching expected mime type
- Different tools returning different results for same folder
- Pagination stopping before expected results
- `OPENROUTER_API_KEY` or other env vars not available in sandbox
- Python not found in docker terminal (use bun instead)
- Composio MCP server "unreachable" after rapid tool call bursts

## Recovery

When tool behavior seems inconsistent:
1. Try alternative tool variant (FIND_FILE → LIST_CHILDREN_V2)
2. Get metadata for individual files to verify
3. Check if folder is in shared drive (requires driveId parameter)
4. Verify permissions are correct

## Large Composio Response Handling

When `COMPOSIO_MULTI_EXECUTE_TOOL` returns 100K+ tokens (common with calendar event lists, Gmail bulk fetches), the inline response is truncated. Use `sync_response_to_workbench=true` to persist the full response to the sandbox, then parse it via `COMPOSIO_REMOTE_WORKBENCH`.

**Key pitfall:** The inline `structure_info` and `data_preview` are schema/samples only — NOT the full data. Always read from the remote file for complete analysis.

See `references/large-composio-responses.md` for the full pattern.

## Cron-Driven Sheet Auto-Population from MCP Data Sources

**Pattern:** Pull data from MCP tools (Oura Ring, etc.) + Composio tools (Google Calendar, etc.) on a cron schedule → write to a Google Sheet row-matched by date. Fully unsupervised.

### Architecture

```
Cron (daily 8 AM PDT)
  ├─ Oura Ring MCP: get_sleep, get_workouts, get_readiness, get_activity
  ├─ Google Calendar Composio: list events (detect yoga, date night)
  └─ Google Sheets Composio: lookup row by date → update cells
```

### Tool Disambiguation (Critical)

**Oura Ring = MCP tools** (`mcp_oura_ring_get_sleep`, etc.). **NOT Composio tools.** Calling `COMPOSIO_MULTI_EXECUTE_TOOL` with `OURA_RING_GET_SLEEP` returns "Tool not found."

**Google Sheets = Composio tools** (`GOOGLESHEETS_VALUES_UPDATE`, etc.). **NOT MCP tools.**

**Google Calendar = Composio tools** (`GOOGLECALENDAR_EVENTS_LIST`, etc.). Also available via gws CLI.

### Row Matching Strategy

The sheet has a Date column (A). Each cron run:

1. **Read column A** to find the row matching yesterday's date
2. **If found** → `GOOGLESHEETS_VALUES_UPDATE` with a bounded range (e.g., `Sheet1!C9:O9`)
3. **If not found** → append a new row before any TOTAL/summary row
4. **Verify** → re-read the updated row to confirm write succeeded

**Pitfall:** Don't use `GOOGLESHEETS_SPREADSHEETS_VALUES_APPEND` blindly — it appends to the end of the sheet, which may be after a TOTAL row. Always look up the target row first.

### Handling Partial Data

Not all data sources are available at cron-fire time:

| Source | Availability at 8 AM PDT | Strategy |
|--------|-------------------------|----------|
| Oura sleep | ✅ Available (processed overnight) | Fill sleep columns |
| Oura readiness | ✅ Available | Fill readiness column |
| Oura workouts | ✅ Available | Fill workout columns |
| Oura activity/steps | ✅ Available | Fill steps column |
| Google Calendar events | ✅ Available | Detect yoga/date night |
| Today's sleep | ❌ Not yet | Leave empty, fill tomorrow |

**Pattern:** Write what you have. Don't skip the entire row because one column is unavailable. The cron runs daily — gaps get filled on the next pass.

### Pre-Automation Backfill

Before setting up the cron, **backfill missing historical data first**. This:
- Validates the data pipeline works end-to-end
- Gives the user immediate value (no "wait a week for data")
- Catches timezone/format bugs before they compound

Steps:
1. Fetch N days of Oura data (all endpoints in parallel)
2. Fetch N days of calendar events
3. Parse and convert all timestamps (UTC → local)
4. Update each row in the sheet
5. Verify each write
6. THEN create the cron job for ongoing automation

### Cron Prompt Template

The cron agent needs a self-contained prompt with:
- Sheet ID, tab name, column mapping
- Exact tool names (MCP for Oura, Composio for Sheets/Calendar)
- UTC→local timezone conversion rule
- Row lookup + update strategy
- Edge case handling (no data, partial data, new dates)

**Key instruction:** Include the exact `value_input_option: "RAW"` parameter — omitting it causes validation errors on `GOOGLESHEETS_VALUES_UPDATE`.

## Related Skills

- `google-workspace` — Google Workspace operations (bundled, protected)
- `external-system-hygiene` — Data integrity when writing to external systems

---

**Origin:** Sessions 2026-07-04, 2026-07-07, 2026-07-08 — Cron job checking Google Drive folder for new PNG files (FIND_FILE mime type quirk, misleading extensions). Gmail + Calendar + Notion multi-system workflow (Composio rate limiting after burst calls, EVENTS_IMPORT iCalUID/structured objects requirement, Gmail account ID matching). Calendar bloat analysis with 600+ recurring events — large response handling via remote workbench, overlap detection, time-block optimization while preserving user rituals. Cron-driven KPI sheet auto-population: Oura MCP + Google Calendar Composio → Google Sheets, row-matched by date, UTC→PDT conversion, pre-automation backfill pattern.
