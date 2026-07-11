---
name: google-calendar-recurring
description: Create and manage recurring Google Calendar events via Composio API with RRULE. Includes Akshay's canonical schedule and RRULE reference.
tags: [calendar, recurring, RRULE, google-calendar, composio, schedule]
triggers:
  - user mentions recurring calendar events
  - user wants to extend/modify schedule
  - user asks about RRULE syntax
  - calendar schedule changes
---

# Google Calendar Recurring Events via Composio

## Key Discovery

`GOOGLECALENDAR_CREATE_EVENT` supports a `recurrence` parameter — an **array of RRULE strings**. This was missed initially; the tool was used with only `start_datetime`/`duration`, creating individual instances instead.

## RRULE Syntax Reference

### Format
```
"recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260728T070000Z"]
```

### Parameters
| Param | Values | Example |
|-------|--------|---------|
| `FREQ` | DAILY, WEEKLY, MONTHLY, YEARLY | `FREQ=WEEKLY` |
| `BYDAY` | MO,TU,WE,TH,FR,SA,SU | `BYDAY=MO,TU,WE,TH,FR` |
| `UNTIL` | YYYYMMDDTHHMMSSZ (UTC) | `UNTIL=20260728T070000Z` |
| `COUNT` | Integer (替代UNTIL) | `COUNT=10` |
| `INTERVAL` | Integer | `INTERVAL=2` (every 2 weeks) |

### Common Patterns
```python
# Weekdays only (Mon-Fri)
["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260728T070000Z"]

# Every day
["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;UNTIL=20260728T070000Z"]

# Every other day
["RRULE:FREQ=DAILY;INTERVAL=2;UNTIL=20260728T070000Z"]

# Specific days only
["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20260728T070000Z"]
```

## Composio API Parameters

### Required
- `start_datetime`: ISO format `"YYYY-MM-DDTHH:MM:SS"`
- `timezone`: IANA format `"America/Los_Angeles"` (REQUIRED for recurring events)
- `summary`: Event title
- `recurrence`: Array of RRULE strings

### Optional
- `event_duration_hour` + `event_duration_minutes`: Duration (or use `end_datetime`)
- `description`: Event description
- `calendar_id`: `"static.akshay@gmail.com"` or `"primary"`
- `create_meeting_room`: `true`/`false` (default true, adds Google Meet)

### Example Call
```python
COMPOSIO_MULTI_EXECUTE_TOOL with:
  tool_slug: "GOOGLECALENDAR_CREATE_EVENT"
  arguments:
    calendar_id: "static.akshay@gmail.com"
    summary: "🏋️ OTF — Akshay + Aadya"
    description: "OTF together.\nCaffeine: 6:15 AM → 15.75h before sleep."
    start_datetime: "2026-07-15T07:00:00"
    event_duration_hour: 1
    event_duration_minutes: 0
    timezone: "America/Los_Angeles"
    recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260728T070000Z"]
```

## Akshay's Canonical Schedule (17 Recurring Events)

### Weekdays Only (Mon-Fri) — RRULE: `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`
| # | Time | Event | Duration |
|---|------|-------|----------|
| 1 | 6:15 AM | ☕ Caffeine — pre-OTF | 5 min |
| 2 | 7:00 AM | 🏋️ OTF — Akshay + Aadya | 1h |
| 3 | 8:00 AM | 🚿 Shower | 15 min |
| 4 | 8:15 AM | 🥤 Breakfast / Shake | 15 min |
| 5 | 8:30 AM | 🔬 ML/LLM Research | 4h |
| 6 | 9:30 AM | 🚶 Walking Break — ML Research | 15 min |
| 7 | 10:30 AM | 🚶 Walking Break — ML Research | 15 min |
| 8 | 11:30 AM | 🚶 Walking Break — ML Research | 15 min |
| 9 | 12:30 PM | 🌳 Nature Walk — Full Restoration | 30 min |
| 10 | 1:00 PM | 🍽️ Lunch | 30 min |
| 11 | 1:30 PM | 🔄 Buffer — calls/admin | 30 min |
| 12 | 2:00 PM | ☕ Last Caffeine — HARD CUTOFF | 5 min |
| 13 | 2:00 PM | 💻 DS/Algo Prep | 4h |
| 14 | 3:00 PM | 🚶 Walking Break — DS/Algo Prep | 15 min |
| 15 | 4:30 PM | 🚶 Walking Break — DS/Algo Prep | 15 min |

### Every Day (Mon-Sun) — RRULE: `FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU`
| # | Time | Event | Duration |
|---|------|-------|----------|
| 16 | 7:00 PM | 🍽️ Dinner | 1.5h |
| 17 | 8:30 PM | 📚 Book Reading + 🥛 Wind Down | 1h |

### Sleep: 9:30 PM → 6:00 AM (8.5h)

## Extending the Schedule

To extend recurring events past current `UNTIL`:

1. Find the event ID using `GOOGLECALENDAR_FIND_EVENT` or `GOOGLECALENDAR_EVENTS_LIST`
2. Update using `GOOGLECALENDAR_PATCH_EVENT` with new recurrence:
```python
GOOGLECALENDAR_PATCH_EVENT with:
  calendar_id: "static.akshay@gmail.com"
  event_id: "<master_event_id>"
  recurrence: ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260831T070000Z"]
```

## Pitfalls

1. **`recurrence` must be an ARRAY with `RRULE:` prefix** — not a bare string. Correct: `["RRULE:FREQ=DAILY"]`. Wrong: `"FREQ=DAILY"` or `["FREQ=DAILY"]`. The API returns 400 "Invalid recurrence rule" if the prefix is missing.
2. **timezone is REQUIRED** for recurring events — without it, instances shift to wrong wall-clock time
2. **UNTIL must be UTC** with Z suffix for timed events: `YYYYMMDDTHHMMSSZ`
3. **Don't create individual instances** when recurrence is available — use RRULE
4. **Master event ID** updates the entire series; instance ID updates only that occurrence
5. **BYDAY** must be comma-separated with no spaces: `BYDAY=MO,TU,WE` not `BYDAY=MO, TU, WE`

## Calendar ID

Primary calendar: `static.akshay@gmail.com`
Timezone: `America/Los_Angeles` (PDT/PST)
