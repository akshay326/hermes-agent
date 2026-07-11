# Calendar Bloat Analysis & Time-Block Optimization

When a user says their calendar is "bloated" or cluttered, the issue is almost always **recurring series** — not one-off events. The analysis workflow below maps the daily template, detects overlaps, and proposes simplifications while respecting the user's existing rituals.

## Step 1: Pull All Events

Query a 2-month window (covers most recurring patterns):

```python
# Via Composio — use sync_response_to_workbench for large calendars
result = COMPOSIO_MULTI_EXECUTE_TOOL(
    tools=[{
        "tool_slug": "GOOGLECALENDAR_EVENTS_LIST",
        "arguments": {
            "calendar_id": "primary",
            "timeMin": "2026-07-01T00:00:00-07:00",  # LOCAL offset, NOT Z
            "timeMax": "2026-08-31T23:59:59-07:00",
            "singleEvents": True,
            "orderBy": "startTime",
            "maxResults": 2500,
            "timeZone": "America/Los_Angeles"
        }
    }],
    sync_response_to_workbench=True,  # for 100+ events
    session_id="..."
)
```

**Pitfall:** Always use local timezone offsets in `timeMin`/`timeMax`, not UTC `Z`. UTC queries shift the window — e.g., `2026-07-01T00:00:00Z` in PDT covers June 30 5pm, potentially missing boundary events.

## Step 2: Categorize

Group by:
- **Event type** (`default`, `fromGmail`, `birthday`)
- **Recurring vs one-off** (check for `recurringEventId`)
- **Summary frequency** (which titles appear most)

The bloat is usually 90%+ recurring instances. Don't delete them — they're ritual scaffolding.

## Step 3: Map the Daily Template

Extract one instance per recurring series (first occurrence). Sort by start time. Check every pair for overlaps:

```python
# Overlap: [s1, e1) and [s2, e2) overlap iff s1 < e2 AND s2 < e1
```

Present as a timeline with overlap markers.

## Step 4: Classify Overlaps

- **Hard** — one block fully inside another (1hr meeting inside 4hr research). Inner block → `transparent` or move.
- **Soft** — partial collision (lunch extends into buffer). Fix by resizing.
- **Structural** — periodic event colliding with daily block. Pin to specific weekday.

## Step 5: Propose Optimization

1. **Never delete ritual blocks without asking.** Ask which are sacred vs adjustable.
2. **Shrink before removing.** 90min lunch → 30min. 90min buffer → 30min. Time compounds.
3. **Convert standalone reminders to notifications** — UNLESS user says keep as block (calendar blocks are harder to dismiss = commitment device).
4. **Fixed periodic > floating.** "Date Night" on random days → pin to Saturday.
5. **Merge adjacent blocks** with same theme.

## Step 6: Calculate Work Hours

For productivity-focused users, sum work blocks before/after:

```
Before: ML (4h) + DS/Algo (2.5h) = 6.5h
After:  ML (5h) + DS/Algo (3h) = 8.0h
```

Show the delta explicitly.

## User Preference: Habit-Breaking Calendar Blocks

Do NOT convert habit-breaking blocks (caffeine cutoff, screen time limits) to phone reminders without asking. Calendar blocks are intentionally harder to dismiss — that's the feature, not a bug. The user may have chosen them as a commitment device.

When proposing changes: "Do you want to keep X as a calendar block, or convert it to a reminder?"
