---
name: calendar-management
description: "Google Calendar optimization via Composio — analyze, restructure, and maintain daily schedules. Covers overlap detection, recurring series management, preserving research-backed productivity scaffolding, and batch operations."
version: 1.0.0
author: hermes
license: MIT
platforms: [linux, macos, windows]
prerequisites:
  - googlecalendar Composio connection (active)
metadata:
  hermes:
    tags: [calendar, scheduling, productivity, composio, google-calendar, circadian-rhythm]
    related_skills: [google-workspace, external-system-hygiene, circadian-experiment]
---

# Calendar Management

Google Calendar optimization, cleanup, and restructuring via Composio. Covers daily schedule management, overlap resolution, recurring series operations, and preserving user-defined ritual scaffolding.

## Core Principles

1. **Calendar events are commitment devices.** Never replace blocks with phone reminders — the user explicitly rejects this. Calendar visibility = accountability.
2. **Ritual scaffolding is sacred.** Walking breaks, nature walks, meditation blocks, and routine transitions are research-backed productivity infrastructure (ultradian rhythm, cognitive reset). They are NOT clutter. Always confirm before removing.
3. **One-off overlaps are normal.** When a dinner reservation, travel, or appointment conflicts with the routine, that's expected behavior — not a calendar error.
4. **Saturday/Sunday overrides.** Weekend events (Date Night) may replace weekday routine blocks. The recurring events still fire; user declines them manually unless EXDATE is explicitly requested.

## Workflow: Calendar Cleanup

### Phase 1: Fetch and Analyze
```
GOOGLECALENDAR_EVENTS_LIST (timeMin/timeMax, singleEvents=true, maxResults=2500)
→ If >500 events: save to remote file, parse with Python
→ Group by date, detect overlaps, categorize by type/frequency
```

**Holistic cross-event analysis (MANDATORY):** After detecting overlaps, check if each event makes logical sense in context with OTHER events on the same day:
- If workout is at 7 AM, does breakfast at 7 AM make sense? (No — you can't eat during a workout)
- If gym opens at 7 AM, can you schedule a6 AM workout? (No)
- If user prefers morning OTF, do you need redundant evening "Flexible — OTF" blocks? (No)
- Does a meeting overlap with a walking break that's nested inside a research block? (Intentional — OK)
- Is Friday missing routine blocks that every other day has? (Inconsistency — flag it)
- Is an evening event triple-booked with dinner + date night + weekly checkin? (Fix it)

**The test:** For every event, ask "does this event conflict with or contradict any OTHER event on the same day?" Not just pairwise overlap — logical coherence across the full day. See `references/calendar-audit-pattern.md` for the full analysis framework.

**Overlap detection algorithm:**
```python
# For each day, check all timed event pairs:
if s1 < e2 and s2 < e1:  # they overlap
    # Classify: intentional (caffeine cutoff inside DS/Algo) vs structural vs one-off
```

**Overlap categories:**
- **Intentional**: Reminder markers inside larger blocks (e.g., ☕ Caffeine Cutoff inside 💻 DS/Algo)
- **Structural**: Two different blocks at the same time (real conflicts requiring resolution)
- **One-off**: Specific events temporarily overriding the template (expected, don't fix)

### Phase 2: Map the Recurring Series
The `EVENTS_LIST` response shows instances with `recurringEventId` but NOT the recurrence rules. To get RRULE:
```
GOOGLECALENDAR_EVENTS_GET (event_id=master_id, calendar_id=primary)
→ reveals recurrence[], description, attendees, creator
```

Map every recurring series: master ID, RRULE, current time slot, frequency, instance count.

### Phase 3: Present Plan
Show the user:
1. Current daily template (sorted by start time)
2. All overlaps with severity
3. Proposed changes (what moves, what gets deleted, what stays)
4. Before/after work hours calculation
5. **Ask for confirmation before executing**

### Phase 4: Execute in Batches
Composio supports parallel execution (up to 50 tools). Group by dependency:
- **Batch 1**: Independent deletes + simple patches
- **Batch 2**: More patches + series master deletions
- **Batch 3**: Creates (new events, merged blocks)

Use `send_updates: "none"` on deletes to avoid spamming attendees.

### Phase 5: Verify
Re-fetch calendar, re-run overlap scan, report results.

## Recurring Series Operations

| Operation | Method | Notes |
|-----------|--------|-------|
| Create recurring series | CREATE with `recurrence` array | e.g., `["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=..."]` |
| Change time for ALL instances | PATCH master event (start_time/end_time + recurrence) | Changes every occurrence. Works via Composio PATCH_EVENT. |
| Change ONE instance | PATCH instance ID (`baseId_YYYYMMDDTHHMMSSZ`) | Only that occurrence |
| Delete entire series | DELETE master event | Removes all future instances |
| Delete one instance | DELETE instance ID | Other instances remain |
| Add EXDATE to skip a day | PATCH recurrence array | e.g., `["RRULE:...", "EXDATE:20260711T..."]` |

**Recurring events are preferred over individual instances.** Always use the `recurrence` parameter when creating repeating events. The only reason to create individual instances is for truly one-off events.

## Morning Routine Template (Research-Backed)

When restructuring early-morning schedules, ALWAYS verify real-world constraints first (gym hours, class schedules, commute time). Never assume a venue is open.

Akshay's constraints (as of 2026-07):
- **Gym opens: 7 AM** — NEVER schedule workouts before 7 AM
- **Sleep: 9:30 PM → 6:00 AM** (8.5 hours). Wind-down at 8:30 PM.
- **Caffeine timing**: 6:15 AM pre-workout → 15.75h before 9:30 PM sleep (acceptable buffer)
- **Aadya has NO class ever** — she and Akshay do OTF (Orange Theory Fitness) together. There are no "Aadya class days" vs "solo days." Both go to OTF every time.
- **OTF offers morning and evening classes** — Akshay prefers consistent morning sessions
- **Dinner** — The user initially requested "Dinner w/ Aadya" as recurring events be deleted, but the canonical schedule includes 🍽️ Dinner at 7:00 PM as a standard daily event. Create "🍽️ Dinner" (not "Dinner w/ Aadya") as a recurring block.
- **No redundant evening blocks** — If user prefers morning OTF, don't add "Flexible — OTF / Walk / Free" evening slots.

**Canonical weekday schedule (as of 2026-07-08):**
```
6:15  ☕ Caffeine — pre-OTF
7:00  🏋️ OTF — Akshay + Aadya (1h)
8:00  🚿 Shower (15min)
8:15  🥤 Breakfast / Shake (15min)
8:30  🔬 ML/LLM Research (4h block → 12:30)
12:30 🌳 Nature Walk — Full Restoration (30min)
1:00  🍽️ Lunch (30min)
1:30  🔄 Buffer — calls/admin (30min)
2:00  💻 DS/Algo Prep (4h block → 6:00) + ☕ Last Caffeine cutoff
7:00  🍽️ Dinner
8:30  📚 Book Reading + Wind Down (1h)
9:30  🛌 Sleep
```

**Non-negotiable morning transitions.** Skipping breakfast/shower blocks causes downstream scheduling failures. Breakfast MUST come after OTF (you can't eat during a workout).

## Deep Work Break System

Based on ultradian rhythm research (90min cycles) and evidence from the user's research-db:

**ML Research block (8:30–12:30, 4h):** 3 walking breaks
- 🚶 9:30–9:45 (after 1h focus)
- 🚶 10:30–10:45 (after 2h focus)
- 🚶 11:30–11:45 (after 3h focus)

**DS/Algo block (2:00–6:00, 4h):** 2 walking breaks
- 🚶 3:00–3:15 (after 1h focus)
- 🚶 4:30–4:45 (after 2.5h focus)

**Nature Walk (12:30–1:00, 30min):** cognitive reset between Research and Lunch.

Breaks are intentionally inside the parent block (ML/LLM Research, DS/Algo). They overlap the parent — this is correct behavior, not a conflict. The parent block is the "focus session," breaks are recovery within it.

**CRITICAL: Walking breaks are evidence-based scaffolding.** They are backed by the user's research-db and must NEVER be deleted without explicit user confirmation. When rebuilding a calendar, walking breaks must be recreated alongside core events. The subagent delegation pattern (see below) handles this — delegate walking break creation separately to ensure nothing is missed.

## Cron Design Principles

**Cron jobs should surface data the user CAN'T get from existing apps.** Don't echo what's already visible in Google Calendar — the user has the Calendar app on their phone. A morning briefing that just lists today's events is noise, not value.

**What's noise:**
- Morning briefing that echoes Google Calendar events (user already sees this in the Calendar app)
- Any cron that restates data from a source the user already checks

**What's valuable:**
- Walking break reminders during deep work blocks (Calendar app doesn't remind you to stand up)
- Caffeine cutoff reminders (Calendar app doesn't know your caffeine rules)
- Oura Ring data analysis (sleep score, HRV trends — not in any other app)
- Implementation intention check-ins (behavioral data, not calendar data)

**Implementation pattern for time-based reminders:** Use `no_agent=true` with a bash script instead of spinning up an LLM agent. Zero tokens, instant execution. See `discord-automation` skill for the `no_agent=true` + bash script pattern and timezone handling.

**Timezone pitfall:** Cron schedules are in UTC. Bash scripts checking user-local times must convert via `TZ="America/Los_Angeles"`. A cron `*/30 16-23 * * *` (UTC) covers 9:00 AM–4:30 PM PDT. Always verify the UTC↔PDT mapping before setting schedules.

## Pitfalls

0. **`/mnt/files/` lives on the remote Composio sandbox** — Calendar event data saved by prior sessions to `/mnt/files/` is NOT on the local Hermes Docker filesystem. Use `COMPOSIO_REMOTE_BASH_TOOL` to read those files. The local `terminal` tool will return "No such file or directory". See `references/bulk-event-deletion.md` for the full file-parsing and batch-deletion pattern.

1. **Recurrence rules not in list response** — Always use `EVENTS_GET` on the master event to see RRULE. The list response only shows `recurringEventId`.

2. **Patching master affects ALL instances** — Changing start/end on the master event shifts every occurrence. Verify this is the intended behavior.

3. **Timezone shifts** — Use local timezone (e.g., `America/Los_Angeles`) for all timestamps. UTC `Z` timestamps shift local-day coverage by the offset.

4. **Don't nuke research-backed scaffolding** — Walking breaks, nature walks, and meditation blocks are productivity infrastructure. Confirm with user before removing. These are NOT clutter.

5. **Calendar events = commitment devices** — Users reject replacing blocks with phone reminders. "Breaking bad habits is the harder job."

6. **Saturday Date Night conflict pattern** — Recurring Dinner + Rocky Rani + Date Night on Fridays create triple-books. The user's priority: Date Night > Dinner > weekly checkin. Delete the lower-priority conflicting event. Also: "Dinner w/ Aadya" should NOT be a recurring event — user handles dinner自行. Don't add it back after deleting it.

7. **One-off conflicts are expected** — Dinner reservations, travel, appointments naturally overlap the routine. This is normal, not a calendar error.

8. **Verify real-world constraints BEFORE creating events** — Gym hours, venue open times, class schedules, and commute times must be checked before scheduling. Scheduling a workout at 6 AM when the gym opens at 7 AM is a real error that wastes the user's time. Ask "what time does X actually open?" before creating any event that depends on a physical location.

9. **Think holistically — every event must make sense in context** — Don't just check pairwise overlaps. Check if each event LOGICALLY CONTRADICTS other events. A workout at 7 AM + breakfast at 7 AM = you're eating during your workout (impossible). Morning OTF preference + evening "Flexible — OTF" blocks = redundant dead slots. Missing routine blocks on one day that exist on every other day = inconsistency. The user said it best: "think logically, does each part make sense in context with other parts."

10. **Don't fabricate schedule distinctions that don't exist** — If the user says "Aadya has NO class ever," don't write "On Aadya class days: OTF together. On solo days: home workout." That's inventing a schedule structure the user never described. Use only what the user explicitly tells you about their routine.

11. **Composio Google Calendar API DOES support recurrence rules** — The `GOOGLECALENDAR_CREATE_EVENT` tool accepts a `recurrence` parameter as an array of RFC5545 RRULE strings. Example: `"recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260728T070000Z"]`. Supported frequencies: DAILY, WEEKLY, MONTHLY, YEARLY. For timed events, UNTIL must be UTC with Z suffix (`YYYYMMDDTHHMMSSZ`). For all-day events, UNTIL is date-only (`YYYYMMDD`). **ALWAYS use recurring events for repeating schedules** — creating individual instances is wasteful, fragile, and causes "future weeks missing" gaps. The `GOOGLECALENDAR_PATCH_EVENT` tool also supports `recurrence` for updating existing series.

12. **Recurring event creation is the RIGHT approach** — When building a recurring schedule: (1) Delete any old individual instances, (2) Create ONE event per unique time slot with the correct RRULE, (3) Google auto-generates all instances. 17 recurring events = 17 API calls, not 500+. Example weekday RRULE: `["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR;UNTIL=20260728T070000Z"]`. Example daily RRULE: `["RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;UNTIL=20260728T070000Z"]`.

13. **Old recurring series keep firing after you delete instances** — Deleting an instance of a recurring series does NOT delete the series. The Google Calendar UI-created series will keep generating future instances. You can only delete what's visible in your query window (3 weeks). Events beyond that window remain. Flag this to the user.

14. **"Dinner w/ Aadya" vs "Dinner"** — The user requested deletion of "Dinner w/ Aadya" recurring events (the phrasing was wrong), but the canonical schedule includes 🍽️ Dinner at 7:00 PM as a standard block. When creating Dinner events, use "🍽️ Dinner" without "w/ Aadya" in the title.

15. **Composio event-list file structure is deeply nested** — When event data is saved to `/mnt/files/` via `COMPOSIO_MULTI_EXECUTE_TOOL`, the JSON envelope is `{ results: [{ response: { data: { summary_view, events, ... } } }], ... }`. The `response` field may be a string (needs `json.loads`) or dict. The all-day field is `is_all_day` (NOT `all_day`). Always inspect top-level keys first before assuming a flat structure. See `references/bulk-event-deletion.md`.

16. **Tool slug typos fail silently** — `COMPOSIO_MULTI_EXECUTE_TOOL` returns `not_found_message` for misspelled tool slugs (e.g., `GOCALENDAR_DELETE_EVENT` instead of `GOOGLECALENDAR_DELETE_EVENT`) but continues executing the other tools in the batch. Always verify the slug spelling and check each result's `tool_slug` field matches what you intended. The batch may report "14/15 success" with the 1 failure being a typo, not a real API error.

17. **404 errors on batch deletes are expected and harmless** — Events already deleted from prior batches return 404. The executor wraps the batch as `successful: false` with `error_count > 0`, but individual results show `status_code: 404`. Do NOT treat this as a batch failure — only investigate non-404 errors.

## Composio Tool Reference

See `references/composio-google-calendar-quirks.md` for API schema details, instance ID patterns, and the mass-rebuild workflow.
See `references/bulk-event-deletion.md` for the bulk event deletion pattern (reading event IDs from saved files, parsing the nested Composio result envelope, batch-of-15 execution, 404 handling).

| Tool | Purpose | Key Args |
|------|---------|----------|
| `GOOGLECALENDAR_EVENTS_LIST` | Fetch events in range | calendar_id, timeMin, timeMax, singleEvents, maxResults |
| `GOOGLECALENDAR_EVENTS_GET` | Get single event (reveals RRULE) | event_id, calendar_id |
| `GOOGLECALENDAR_PATCH_EVENT` | Modify event times/title | event_id, calendar_id, start_time, end_time, summary |
| `GOOGLECALENDAR_DELETE_EVENT` | Remove event/series | event_id, calendar_id, send_updates |
| `GOOGLECALENDAR_CREATE_EVENT` | New event with recurrence | start_datetime, summary, recurrence, calendar_id |
| `GOOGLECALENDAR_FIND_EVENT` | Search by text/time | query, calendar_id, time_min, time_max |

## Batch Execution Pattern

```python
# Example: Delete 24 events in parallel
tools = [{"tool_slug": "GOOGLECALENDAR_DELETE_EVENT", 
          "arguments": {"calendar_id": "user@gmail.com", 
                       "event_id": eid, "send_updates": "none"}} 
         for eid in event_ids]
# Execute via COMPOSIO_MULTI_EXECUTE_TOOL (max 50 per call)
```

## Subagent Delegation for Bulk Calendar Ops

When rebuilding 2+ weeks of events, use **recurring events** (preferred) or delegate to subagents only for the delete phase.

### Preferred: Recurring Events (17 API calls)
Create ONE event per unique time slot with RRULE. No subagent needed — fits in 1-2 batches.

### When subagent delegation IS needed:
1. **Delete phase** (parent or subagent): Batch-delete all old individual instances in groups of 15
2. **Create phase** (parent handles): Create recurring events with RRULE — much faster than individual instances

Subagent context must include:
- Exact schedule (times, event names, descriptions)
- RRULE patterns for weekday vs daily events
- Calendar ID and timezone
- UNTIL date for the recurrence range

## Verification Pattern

```python
# After all operations, re-fetch and scan
events = fetch_events(timeMin, timeMax)
for date in group_by_date(events):
    for pair in all_pairs(timed_events[date]):
        if overlaps(pair) and not intentional(pair):
            report_overlap(pair)
```
