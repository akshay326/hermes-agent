# Comprehensive Calendar Audit Pattern

When the user says "think holistically" or "does each part make sense," they want more than overlap detection. They want **logical coherence analysis** — does every event make sense in context with every other event on the same day?

## Analysis Dimensions

### 1. Physical Constraint Validation
Before checking overlaps, verify each event against real-world constraints:
- **Venue hours**: Does the gym open before the scheduled workout? Does the restaurant open before the reservation?
- **Commute time**: Is there travel time between sequential locations?
- **User sleep schedule**: Does the event require waking before the user's alarm? (e.g., 5:30 AM caffeine for a 7 AM workout when user sleeps until 6 AM)
- **Caffeine half-life**: Does the caffeine timing give enough buffer before sleep? (16h ideal, 15.75h acceptable)

### 2. Cross-Event Logical Coherence
For each event, ask: "Does this CONTRADICT any other event on the same day?"

**Common contradictions:**
- Workout at 7 AM + Breakfast at 7 AM → eating during workout (impossible)
- Morning OTF preference + evening "Flexible — OTF" blocks → redundant
- Gym opens 7 AM + Workout at 6 AM → venue not open
- 8-hour sleep goal + 5:15 AM wake time → only 7.75h sleep
- User prefers consistency + some days missing routine blocks → inconsistent

### 3. Inconsistency Detection
Compare across days:
- Which routine blocks exist on Mon-Thu but NOT on Friday?
- Are there events that only appear on some days but should be daily (or vice versa)?
- Do weekend events conflict with weekday patterns?

### 4. Triple/Double Booking
Beyond pairwise overlaps, check for3+ events at the same time:
- Dinner 7:00-8:30 + Date Night 8:00-10:00 + Weekly Checkin 8:30-9:00
- Which event takes priority? (Usually the most personal/important one)

## Query Pattern

```python
# After fetching all events, run this analysis:
def holistic_audit(events_by_day):
    issues = []
    for day, events in sorted(events_by_day.items()):
        # Physical constraints
        for ev in events:
            if 'Workout' in ev.title and ev.start.hour < 7:
                issues.append(f"{day}: Workout before gym opens")
            if 'Breakfast' in ev.title and any(
                'Workout' in e.title and e.start == ev.start 
                for e in events
            ):
                issues.append(f"{day}: Breakfast overlaps workout")
        
        # Logical contradictions
        for ev in events:
            for other in events:
                if ev != other and ev.start == other.start:
                    if contradict(ev, other):
                        issues.append(f"{day}: {ev.title} contradicts {other.title}")
        
        # Cross-day consistency
        # Check if routine blocks are present on all days
        
    return issues
```

## Presenting Results

Group issues by severity:
1. 🔴 **CRITICAL** — Event can't physically happen (gym closed, eating during workout)
2. 🟡 **STRUCTURAL** — Redundant or contradictory (redundant OTF blocks, inconsistent days)
3. 🟢 **HARMLESS** — Intentional overlaps (walking breaks inside research blocks)

Always ask user before fixing. Some "issues" are intentional.

## Batch Fix Pattern

When fixing multiple events across a recurring series:
1. Delete all instances of the wrong event (parallel via MULTI_EXECUTE_TOOL)
2. Create all new instances at correct times (parallel)
3. Verify by re-fetching and re-auditing

Don't try to PATCH individual instances when the entire series needs restructuring — delete and recreate is cleaner.
