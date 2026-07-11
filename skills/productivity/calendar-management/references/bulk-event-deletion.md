# Bulk Event Deletion Pattern

When the user asks to delete all events in a date range (e.g., "delete ALL events from Jul 15-28"), the workflow is:

## Reading Event IDs from a Saved File

Composio event list responses saved via `COMPOSIO_MULTI_EXECUTE_TOOL` to `/mnt/files/` have a deeply nested structure:

```
/mnt/files/mex/main.json           ← on remote sandbox, NOT local Docker
```

**Key structural detail:** The file is NOT a flat calendar event list. It's a `COMPOSIO_MULTI_EXECUTE_TOOL` result envelope:

```python
data = json.load(f)
# Top-level: { success, results, total_count, success_count, error_count }
# results[0].response is the tool response (may be str or dict)
# results[0].response.data.summary_view is the actual event array
inner = data['results'][0]['response']
if isinstance(inner, str):
    inner = json.loads(inner)
summary_view = inner['data']['summary_view']
```

**Field name:** `is_all_day` (NOT `all_day`). Each entry has: `calendar`, `display_url`, `end`, `event_id`, `is_all_day`, `start`, `title`.

```python
# Extract non-all-day event IDs
ids = [e['event_id'] for e in summary_view if e.get('event_id') and not e.get('is_all_day', False)]
```

## Accessing `/mnt/files/` from the Local Docker Environment

Files under `/mnt/files/` live on the **remote Composio sandbox**, NOT the local Hermes Docker filesystem. Use `COMPOSIO_REMOTE_BASH_TOOL` (not the local `terminal` tool) to read them.

```bash
# This FAILS (local Docker has no /mnt/files/):
# cat /mnt/files/mex/main.json  → No such file or directory

# This WORKS (remote sandbox has /mnt/files/):
# Via COMPOSIO_REMOTE_BASH_TOOL:
python3 -c "import json; ..."
```

## Deletion Execution

- Batch size: **15 events per `COMPOSIO_MULTI_EXECUTE_TOOL` call**
- Tool slug: `GOOGLECALENDAR_DELETE_EVENT` (exact — watch for typos, the executor will silently fail on wrong slugs)
- Only required args: `calendar_id` and `event_id`
- **404 errors are expected** — events already deleted from prior batches return 404. Skip them silently.
- The executor returns `error_count` > 0 when any 404 occurs, but the other deletes still succeed. Check individual results, not just the top-level `successful` flag.

## Throughput Example

197 events ÷ 15 per batch = 14 calls (13 full batches of 15 + 1 final batch of 7).
Each call takes ~3-5 seconds. Total: ~60 seconds for the full deletion.