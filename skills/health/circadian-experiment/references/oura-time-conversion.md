# Oura Ring Time Conversion Reference

## Critical: UTC → Local Time

All Oura API responses return timestamps in **UTC**, not the user's local timezone. The user is in **PDT (UTC-7)** during the experiment period (July 2026).

### Conversion Rule
```
PDT = UTC - 7 hours
```

### Example Conversions (July 9, 2026 data)
| Oura Shows (UTC) | Actual (PDT) | Interpretation |
|------------------|--------------|----------------|
| Bedtime 5:00 AM Jul 9 | 10:00 PM Jul 8 | Normal bedtime ✅ |
| Wake 1:39 PM Jul 9 | 6:39 AM Jul 9 | Normal wake ✅ |
| Yoga 2:30 PM Jul 9 | 7:30 AM Jul 9 | Morning yoga session |
| Hiking 3:12 PM Jul 9 | 8:12 AM Jul 9 | Morning hike |

### Common Mistake
Without conversion, the data appears to show:
- 5 AM bedtime (looks like inverted schedule)
- 2 PM wake (looks like afternoon nap)
- Afternoon workouts (looks like OTF at wrong time)

This is the **#1 data interpretation error** with Oura data.

## Scoring Logic (Exact Criteria)

### Anchor 1: Wake Time
- **Target:** 7:00 AM PDT
- **Scoring:**
  - ✅: Within 30 min of target (6:30–7:30 AM)
  - ⚠️: 30–60 min off (6:00–6:30 AM or 7:30–8:00 AM)
  - ❌: >60 min off

### Anchor 2: Exercise Time
- **Target:** 5:30 PM OTF (fixed slot)
- **Scoring:**
  - ✅: Workout at or near 5:30 PM
  - ⚠️: Different time but still active (yoga, hiking, etc.)
  - ❌: No workout logged

### Anchor 3: Dinner Time
- **Target:** 7:00 PM, no eating after 7:30 PM
- **Scoring:**
  - ✅: Dinner ≤7 PM + no late eating
  - ⚠️: No tag data available (Oura doesn't track meals)
  - ❌: Late dinner or confirmed late snacking

### Anchor 4: Sleep Time
- **Target:** 10:30 PM PDT
- **Scoring:**
  - ✅: Bedtime ≤10:45 PM
  - ⚠️: 10:45–11:15 PM
  - ❌: >11:15 PM

### Daily Rhythm Score
- Count of ✅ out of 4 anchors
- 4/4 = perfect, 3/4 = strong, 2/4 = needs attention, 1/4 or 0/4 = reframe

## Data Sources

| Metric | API Call | Key Fields |
|--------|----------|------------|
| Sleep | `get_sleep` | bedtime, wake_time, total_sleep, efficiency, hrv_avg |
| Activity | `get_activity` | steps, calories, intensity breakdown |
| Readiness | `get_readiness` | score, contributors, body_temp |
| Workouts | `get_workouts` | type, start_time, end_time, calories |
| HRV Trend | `analyze_hrv_trend` | avg, range, trend direction |
| Tags | `get_tags` | manual entries (alcohol, caffeine, etc.) |

## Log Entry Format
```json
{
  "date": "YYYY-MM-DD",
  "day": N,
  "sleep": {"bedtime_pdt": "10:00 PM", "wake_pdt": "6:39 AM", ...},
  "activity": {"workouts": [...]},
  "anchors": {"wake": {"score": "✅"}, ...},
  "rhythm_score": 2,
  "notes": "..."
}
```
