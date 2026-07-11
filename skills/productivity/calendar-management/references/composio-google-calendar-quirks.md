# Composio Google Calendar API — Quirks & Patterns

## Recurring Events: FULLY SUPPORTED

The `GOOGLECALENDAR_CREATE_EVENT` tool **DOES** accept a `recurrence` parameter. This is an array of RFC5545 RRULE strings. ALWAYS use recurring events for repeating schedules.

### Schema for GOOGLECALENDAR_CREATE_EVENT with recurrence:
```json
{
  "calendar_id": "static.akshay@gmail.com",
  "start_datetime": "2026-07-15T07:00:00",
  "summary": "🏋️ OTF — Akshay + Aadya",
  "description": "OTF (Orange Theory Fitness)...",
  "event_duration_hour": 1,
  "event_duration_minutes": 0,
  "timezone": "America/Los_Angeles",
  "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260728T070000Z"]
}
```

### RRULE patterns:
- **Weekdays:** `["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260728T070000Z"]`
- **Every day:** `["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;UNTIL=20260728T070000Z"]`
- **UNTIL format (timed events):** `YYYYMMDDTHHMMSSZ` (UTC with Z suffix)
- **UNTIL format (all-day):** `YYYYMMDD` (date-only)

### Why recurring > individual instances:
- 17 recurring events = 17 API calls (not 500+)
- No "future weeks missing" gaps
- Google handles instance generation automatically
- Easy to update: PATCH the master event's RRULE

### Schema for GOOGLECALENDAR_DELETE_EVENT:
```json
{
  "calendar_id": "static.akshay@gmail.com",
  "event_id": "efeje7dg2k0dalc4ggcd6frqrg_20260709T130000Z"
}
```
Instance ID format: `{recurringEventId}_{YYYYMMDDTHHMMSSZ}`

## Mass Rebuild Pattern

When the entire weekday schedule needs restructuring:

### Step 1: Fetch full calendar
```
GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS
  time_min: "2026-07-08T00:00:00-07:00"
  time_max: "2026-07-29T00:00:00-07:00"
  single_events: true
  response_detail: "minimal"
```
Save to remote file if >500 events.

### Step 2: Parse and identify
Group by day, find all instance IDs for events that need changing. Use `execute_code` or `COMPOSIO_REMOTE_WORKBENCH` for parsing.

### Step 3: Batch delete (groups of 15)
Delete all instances of old events across the full window. Expect some 404s (already deleted or outside series range) — these are harmless.

### Step 4: Create recurring events (NOT individual instances)
Create ONE event per unique time slot with the correct RRULE. Example:
- 15 weekday events + 2 daily events = 17 API calls total
- Each event auto-generates instances for the entire date range
- No need for subagent delegation — 17 calls fit in a single batch

### Step 5: Verify
Re-fetch calendar for a future date (e.g., Wednesday next week), confirm all events appear from the recurring series.

## Instance ID Patterns

Common recurring event base IDs (as of 2026-07):
- Workout series: `efeje7dg2k0dalc4ggcd6frqrg`
- Breakfast series: `8uc47ssa043amj25f3rjegisl4`
- Shower series: `55dcptraek74ml2tgagekaka3k`
- ML Research: `8l5ks48ru53hev7v5rlldu6lko`
- DS/Algo: `04doa8krgj8sqgmbpbhrmh4mfk`
- Walking breaks ML: `e7c3ht8k1as80lobgkvulq81sc`, `8avto946tl5lt0lrusgvrjdme4`, `mkq9652h9egemo7jr37urlmr9c`
- Nature walk: `ua0gc4lk5l9q1cboo57svnfdv0`
- Lunch: `6jeqd9c3il3ia28kqbvsmsj4ds`
- Buffer: `0hpfg989k89hj74c67tc5olh8c`
- Caffeine cutoff: `224tvkoqhf0ssll2v5th98cqm0`
- DS/Algo breaks: `2m0jbt7no1mfenjs488khjb7l4`, `eqodqqvisr30r6tgn7svmtnjec`
- Wind Down: `2f9urkspaqedeamltojtal5otc`

## Overlap Detection Script

```python
from collections import defaultdict

def find_overlaps(events):
    days = defaultdict(list)
    for ev in events:
        s = ev.get('start', {})
        en = ev.get('end', {})
        start = s.get('dateTime', s.get('date', ''))
        end = en.get('dateTime', en.get('date', ''))
        title = ev.get('summary', '')
        if start and end and 'T' in start:
            days[start[:10]].append((start, end, title))
    
    for day, evts in sorted(days.items()):
        for i in range(len(evts)):
            for j in range(i+1, len(evts)):
                s1, e1, t1 = evts[i]
                s2, e2, t2 = evts[j]
                if s1 < e2 and s2 < e1:
                    print(f"⚠️ {day}: {t1} overlaps {t2}")
```

## Common Mistakes to Avoid

1. Scheduling before gym opens (7 AM)
2. Breakfast during workout (same time slot)
3. ML Research block overlapping lunch/breakfast
4. Adding "Dinner" as recurring event (user handles it)
5. Adding "Flexible — OTF" evening blocks when user prefers morning
6. Not checking if Friday/Saturday have the same routine as weekdays
7. Creating events with wrong schema (nested start/end vs start_datetime)
8. **Deleting evidence-based walking breaks during calendar rebuild** — Walking breaks inside research/DS blocks are backed by ultradian rhythm research. They must be recreated as recurring events alongside core blocks. ALWAYS include walking breaks when rebuilding a schedule.
9. **Creating individual instances instead of recurring events** — Use the `recurrence` parameter with RRULE. 17 recurring events > 500 individual instances.
10. **Assuming API limitations without checking the schema** — Always read the full tool schema before claiming a feature is unsupported. The `recurrence` parameter exists on `GOOGLECALENDAR_CREATE_EVENT`.
