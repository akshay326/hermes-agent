# Biometric Data Analysis — Lessons Learned

## The Error (Session 2026-07-03)

Analyzed user's HRV from 30-day window, concluded it was "critically low" (19ms vs 30-100ms population norm), created Notion doc recommending medical intervention. User pushed back: "fetch more data, I have 2.5 years."

**The 2.5-year data revealed:**
- HRV has been 16-21ms consistently for 2.5 years — never above 21ms average
- This is a STABLE BASELINE, not a decline
- No intervention (exercise, meditation, sleep improvement) moved the needle over 365 days
- Population "normal range" may not apply to this individual

## What the Research Actually Says

1. **No universally accepted normative values for HRV** — individual variation reaches 260,000%
2. **Population means are "inadequate for individual assessment"** — experts recommend individual baselines
3. **HRV is 30-65% heritable** — twin studies show genetics account for large individual differences
4. **Oura Ring Gen3 validated** — Lin's concordance 0.97 vs ECG for RMSSD (accurate device, but may not capture personal context)

## Correct Methodology for Personal Data Analysis

### Step 1: Check data extent
- How much data exists? (days, months, years)
- Don't analyze a window when the full dataset is available

### Step 2: Establish personal baseline
- What is THIS person's average over the full period?
- Has it changed over time? (trend analysis)
- What's the individual variance? (CV, range)

### Step 3: Check data quality
- Sensor adherence (% of days with data)
- Missing values (N/A patterns)
- Firmware version / device issues
- Multiple devices that could conflict

### Step 4: Compare to population norms — CAREFULLY
- Acknowledge that population norms may not apply
- Note heritability of the metric if known
- Check if the metric is known to have large individual variation
- Frame as "below population average" not "abnormally low"

### Step 5: Identify what IS independently concerning
- Separate the metric from the interpretation
- Sleep regularity 0/100 is concerning regardless of HRV
- SpO2 data being mostly N/A is a data quality issue

### Step 6: Be honest about uncertainty
- "I don't know if this is normal for you" is a valid conclusion
- Don't frame observations as diagnoses
- Recommend professional evaluation when uncertain, without alarm

## Key Sources

- HRV normative data: "No universally accepted normative values" — individual variation up to 260,000%
- Oura validation: Lin's concordance 0.97 for RMSSD vs ECG
- HRV heritability: 30-65% (twin studies)
- Sleep regularity: Cao et al. 2026 — SRI <60 linked to cognitive risk
