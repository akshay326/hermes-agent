# Composio Google Calendar — CREATE_EVENT Schema

`GOOGLECALENDAR_CREATE_EVENT` uses a **completely different schema** from `EVENTS_IMPORT`. Do NOT mix them up.

## Required Parameters

```json
{
  "start_datetime": "2026-07-08T07:00:00",   // ISO 8601, flat string (NOT structured object)
  "summary": "🏋️ Workout",
  "timezone": "America/Los_Angeles",           // IANA timezone
  "event_duration_hour": 1,                   // Duration in hours
  "event_duration_minutes": 0                 // Duration in minutes (0-59)
}
```

## Optional Parameters

- `calendar_id` — defaults to `"primary"`
- `description` — event description
- `location` — event location
- `attendees` — list of email addresses
- `create_meeting_room` — add Google Meet link (default: `true`)

## Key Differences from EVENTS_IMPORT

| Field | CREATE_EVENT | EVENTS_IMPORT |
|-------|-------------|---------------|
| Start time | `start_datetime` (flat ISO string) | `start` (`{"dateTime": ..., "timeZone": ...}`) |
| End time | `event_duration_hour` + `event_duration_minutes` | `end` (`{"dateTime": ..., "timeZone": ...}`) |
| iCalUID | Not required | Required |
| Timezone | Top-level `timezone` param | Inside `start`/`end` objects |

## Error Messages If Wrong

- `Missing required field 'start_datetime'` → You used `start` object instead of `start_datetime` string
- `Invalid request data provided` → Check parameter names match exactly

## Example: Create Workout Event

```python
result, err = run_composio_tool("GOOGLECALENDAR_CREATE_EVENT", {
    "calendar_id": "static.akshay@gmail.com",
    "summary": "🏋️ Workout (caffeine: 6:15 AM)",
    "start_datetime": "2026-07-08T07:00:00",
    "timezone": "America/Los_Angeles",
    "event_duration_hour": 1,
    "event_duration_minutes": 0,
    "description": "Caffeine: 6:15 AM pre-workout."
})
```

## Pitfall: Do NOT Use start/end Objects

The EVENTS_IMPORT tool uses structured objects:
```json
"start": {"dateTime": "2026-07-08T07:00:00-07:00", "timeZone": "America/Los_Angeles"}
```

The CREATE_EVENT tool uses flat strings:
```json
"start_datetime": "2026-07-08T07:00:00"
```

Passing structured objects to CREATE_EVENT will fail with `Missing required field 'start_datetime'`.
