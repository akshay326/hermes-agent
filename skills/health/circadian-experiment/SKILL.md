---
name: circadian-experiment
description: "2-week circadian rhythm experiment — daily check-in tracking 3 trait anchors (wake time, exercise time, meal time) with CBT framing"
version: 1.0.0
author: Hermes Agent
tags: [circadian, HRV, CBT, experiment, health]
---

# Circadian Experiment: 2-Week Rhythm Lock

## The Hypothesis
Based on Smith et al. (2026) — lifestyle traits explain 42.3% of circadian variance, states explain 0.9% (47:1 ratio). Fixing habitual timing should improve HRV within 2 weeks.

## The 3 Trait Anchors

### 1. Wake Time (master anchor)
- **Target:** 7:00 AM ±15 min (Week 1: ±30 min, Week 2: ±15 min)
- **Current:** ~7 AM
- **Why:** Primary zeitgeber — the circadian system uses wake time as the master clock reset.
- **Scoring:** Within 30 min of 7 AM = ✅, 30–60 min = ⚠️, >60 min = ❌

### 2. Exercise Time (consistent slot)
- **Target:** 5:30 PM OTF (fixed time, same slot every workout day)
- **Current:** OTF 5:30–6:30 PM
- **Why:** Exercise timing is a top trait predictor of circadian phase
- **Scoring:** Workout at or near 5:30 PM = ✅, different time = ⚠️, no workout = ❌

### 3. Meal Timing (cutoff boundary)
- **Target:** Dinner at 7:00 PM, no eating after 7:30 PM (3h before 10:30 PM sleep)
- **Current:** Dinner ~7 PM (just started last week)
- **Why:** Meal timing synchronizes metabolic clock
- **Scoring:** Dinner ≤7 PM + no late eating = ✅, dinner ≤7 PM but late snacking = ⚠️, no data or late dinner = ❌

### 4. Sleep Time (downstream of wake)
- **Target:** 10:30 PM (7 AM wake + 8h sleep goal + 30 min wind-down)
- **Current:** ~10:30 PM
- **Why:** Sleep time is a consequence of wake time consistency, not a separate lever
- **Scoring:** Bedtime ≤10:45 PM = ✅, 10:45–11:15 PM = ⚠️, >11:15 PM = ❌

## User's Established Streaks (do not suggest these — they're already locked)
- **Protein shake:** 2 years daily (lactose-free milk 2%, chia 2tsp, hemp 2tsp, whey gold, 1-2 cups spinach)
- **OTF:** Consistent 5:30–6:30 PM slot
- **Dinner at 7 PM:** Just started (last week)

## Daily Check-In Protocol

The cron agent pulls data from Oura automatically and posts a summary+thread to Discord (no interactive Q&A).

### Data Sources (auto-pulled)
1. **Wake time:** mcp_oura_ring_get_sleep → actual wake time
2. **Exercise:** mcp_oura_ring_get_activity → workout time and type
3. **Dinner/Meals:** Not auto-tracked — scored as ⚠️ if no data
4. **Sleep:** mcp_oura_ring_get_sleep → bedtime, duration, efficiency
5. **HRV:** mcp_oura_ring_get_sleep → nightly HRV for trend
6. **Stress:** mcp_oura_ring_get_stress → day summary (Stressful/Normal/Restored), high stress min, high recovery min. Enriches CBT reflection with context about what the body experienced.

**⚠️ CRITICAL:** All Oura times are in UTC. Convert to PDT (UTC-7) before scoring. See `references/oura-time-conversion.md` for details and examples.

### Output Format
Uses `scripts/discord-post-thread.ts` to post:
- **Summary:** Rhythm score (X/4), key anchor times, one observation
- **Thread:** Anchor-by-anchor breakdown, HRV trend, CBT reflection

See `discord-automation` skill for the posting pattern.

### Cron Workflow Patterns (from session experience)

**Data availability fallback:**
- Oura data may not be synced at cron time. When today's data is unavailable, fall back to yesterday's data.
- Always note the date discrepancy in the log entry (e.g., "Data from July 8, checked July 9").
- Pull sleep, activity, readiness, tags, and workouts in parallel for efficiency.

**Day numbering:**
- Day 0 = experiment start date (baseline setup)
- Day 1 = first check-in day (may be same date as Day 0)
- Subsequent days increment sequentially regardless of data gaps
- Log entry format: `{"date":"YYYY-MM-DD","day":N,"phase":"baseline",...}`

**Discord posting with shell escaping:**
- Summary text contains emojis and markdown — use temp files to avoid shell escaping issues
- Write summary to `/tmp/summary.txt`, details JSON to `/tmp/details.json`
- Read files into shell variables: `SUMMARY=$(cat /tmp/summary.txt) && DETAILS=$(cat /tmp/details.json)`
- Pass to script: `bun scripts/discord-post-thread.ts <channel> "$SUMMARY" "$DETAILS" "<thread_name>"`

**Weekly summary trigger:**
- Produce weekly summary only on Sundays
- Include: rhythm score trend, weakest anchor, HRV trend, CBT observation

## Scoring

Each anchor gets a simple score:
- **On time** (within 30 min of target): ✅
- **Slight drift** (30-60 min off): ⚠️
- **Missed** (>60 min off or not logged): ❌

**Daily rhythm score:** Number of ✅ out of 4 anchors
- 4/4 = perfect rhythm day
- 3/4 = strong
- 2/4 = needs attention
- 1/4 or 0/4 = reframe, don't punish (CBT)

## CBT Framing

When a day scores low, the agent uses this reframe:
- **Thought:** "I broke my rhythm today"
- **Reality:** "One day is 0.9% of variance. The trait is what I do most days, not today."
- **Action:** "Log it, note the reason, and protect tomorrow's anchors."

The agent NEVER uses guilt language. It uses curiosity language:
- "Interesting — what got in the way?" not "You missed again."
- "What would help tomorrow?" not "Don't let this happen again."

## Week 1 → Week 2 Progression

**Week 1 (Days 1-7):** Establish baseline
- Log all 4 anchors daily
- Identify natural drift patterns
- No judgment, just data collection

**Week 2 (Days 8-14):** Tighten the window
- Target ±15 min on all anchors (vs ±30 min in Week 1)
- Focus on the weakest anchor from Week 1
- Begin tracking HRV trend (Oura) to see if shifts appear

## Reporting

The agent produces a weekly summary:
- Rhythm score trend (are ✅ counts increasing?)
- Which anchor is weakest?
- HRV trend (if Oura data available)
- CBT observation: what thought patterns emerged around missed anchors?

## The Music Analogy

From the user's own insight: *"Ain't that fucking surprising? Isn't that what matters in music too? And isn't that what I'm trying to do wrong? Trying to fix certain ornaments while using the rhythm?"*

The experiment is about the rhythm, not the ornaments. Consistency > perfection. The user is a musician — this analogy is the most powerful CBT reframe available. Use it when they fixate on a single bad day.

## CBT Depth: The Overcorrection Trap

The full thought→feeling→behavior chain:
1. **Trigger:** Sleep in on Tuesday, Oura shows low score
2. **Automatic thought:** "I ruined my rhythm. I need to fix this tonight."
3. **Emotion:** Guilt, anxiety, pressure to perform
4. **Behavior:** Force early bedtime, skip dinner to "reset," set harsh alarm
5. **Result:** Lie in bed anxious, wake exhausted, create larger deviation than original

**The reframe:** "My rhythm is set by what I usually do, not what I did today. Today was a data point, not a verdict." — This is empirically grounded (states = 0.9% of variance), not just positive thinking.

**User's own words on overcorrection:** "Not to myself, not to overcorrect myself or others because it's not worth the fight. What matters is rhythm, not per note stress."

## Pitfalls

1. **Oura data not synced at cron time.** Today's data often isn't available when the cron runs. Always try today first, then fall back to yesterday. Note the date in the log entry so the trend analysis isn't confused.

2. **Inverted schedules from travel/disruption.** When the user is traveling, sleep times can flip completely (5 AM bedtimes, 2 PM wake). Don't panic-score these — note the context. The CBT reframe applies: "One day is 0.9% of variance."

3. **No dinner data.** Oura doesn't track meals. Dinner anchor is always ⚠️ unless manually tagged. Don't fabricate data — just note "no data available."

4. **CRITICAL: Oura returns times in UTC, not local time.** All sleep/wake timestamps and workout times from Oura APIs are in UTC. Convert to PDT (UTC-7) before scoring or logging. Example: "5:00 AM UTC" bedtime = "10:00 PM PDT" previous night. Failure to convert produces inverted schedules that look like 5 AM bedtimes and 2 PM wakes. This is the single most common data interpretation error.

5. **Activity data enriches over time.** Oura may update activity scores, step counts, and workout details after initial sync. Re-pulling the same date hours later can yield different numbers (e.g., score 96→98, steps 7k→14k, new workouts appearing). If the cron runs shortly after data first appears, the numbers may be incomplete. This is normal — note it but don't re-log. The trend matters more than single-day precision.
