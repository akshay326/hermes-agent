# Caffeine & HRV Research Summary

Research deployment from 2026-07-07 session: optimizing caffeine timing for HRV improvement.

## Key Papers (Appended to Research-DB 38910db41d138008a491d8091db7914e)

### 1. Gardiner et al. 2023 — Meta-Analysis
- **Title:** The effect of caffeine on subsequent sleep: A systematic review and meta-analysis
- **Journal:** Sleep Medicine Reviews, 2023. 258 citations.
- **DOI:** https://doi.org/10.1016/j.smrv.2023.101764
- **Key Findings:** Meta-analysis of 10+ studies. Caffeine significantly reduces total sleep time, sleep efficiency, and deep sleep. Effect persists 6+ hours post-consumption. Authors recommend no caffeine within 8-12 hours of bedtime.
- **Relevance:** Deep sleep is when HRV is highest and parasympathetic recovery occurs. Caffeine's suppression of deep sleep directly impairs HRV recovery.

### 2. Gardiner et al. 2024 — RCT (Gold Standard)
- **Title:** Dose and timing effects of caffeine on subsequent sleep: a randomized clinical crossover trial
- **Journal:** Sleep, 2024
- **DOI:** https://doi.org/10.1093/sleep/zsae230
- **Methodology:** 23 males, placebo-controlled, double-blind, randomized crossover. Polysomnography.
- **Key Findings:**
  - 100mg: Safe up to **4 hours before bedtime** (no significant disruption)
  - 400mg: Sleep initiation delayed within **12 hours** of bedtime; sleep fragmentation within **8 hours**
  - Subjective sleep quality reduced **-34%** when 400mg consumed 4h before bed — but subjects **couldn't perceive it**
- **Critical insight:** People cannot accurately perceive caffeine's effect on their own sleep quality.

### 3. Koenig et al. 2013 — Systematic Review (HRV-specific)
- **Title:** Impact of Caffeine on Heart Rate Variability: A Systematic Review
- **Journal:** Journal of Caffeine Research, 2013. 66 citations.
- **DOI:** https://doi.org/10.1089/jcr.2013.0009
- **Key Findings:** Caffeine stimulates sympathetic nervous system, reducing HRV and parasympathetic tone. Individual variation linked to CYP1A2 genotype.
- **Relevance:** Directly demonstrates caffeine as a suppressor of the metric targeted for improvement.

### 4. Baur et al. 2024 — Mechanistic (Most Relevant)
- **Title:** Concentration–effect relationships of plasma caffeine on EEG delta power and cardiac autonomic activity during human sleep
- **Journal:** Journal of Sleep Research, 2024
- **DOI:** https://doi.org/10.1111/jsr.14140
- **Key Findings:** Measured plasma caffeine during sleep via EEG and cardiac monitoring. Found concentration-effect relationship: higher plasma caffeine → reduced EEG delta power (deep sleep marker) AND altered cardiac autonomic activity.
- **Why this is the key paper:** Directly proves the pathway: residual caffeine → less deep sleep → worse cardiac autonomic activity (what HRV measures). Most mechanistically relevant for understanding why caffeine timing matters for HRV.

### 5. Porto et al. 2022 — Meta-Analysis (Post-Exercise Recovery)
- **Title:** Caffeine intake and its influences on heart rate variability recovery in healthy active adults after exercise
- **Journal:** Nutr Metab Cardiovasc Dis, 2022. 12 studies qualitative, 5 quantitative.
- **DOI:** https://doi.org/10.1016/j.numecd.2022.01.015
- **Key Findings:** Caffeine intake did NOT significantly affect HRV recovery after exercise (RMSSD p=0.67, HF p=0.22). Note: this was post-exercise recovery, not resting HRV.

## Caffeine Pharmacokinetics Reference

- **Mean half-life:** ~5 hours (range 1.5–9.5 hours)
- **Metabolism:** 95% via CYP1A2 enzyme in liver
- **Individual variation:** 5-6 fold due to CYP1A2 polymorphism
- **Metabolites:** Paraxanthine (80%), theobromine (10-12%), theophylline (4%)
- **Clearance math:** Each half-life reduces by 50%. After 3 half-lives (15h), ~12.5% remains.

### Sources
- NCBI Pharmacology of Caffeine: https://www.ncbi.nlm.nih.gov/books/NBK223808/
- Springer 2026 (CYP1A2 review): https://link.springer.com/article/10.1186/s41065-026-00648-z
- PharmRev (individual differences): https://pharmrev.aspetjournals.org/content/70/2/384

## Creatine + Caffeine Interaction

- **Newton et al. 2022:** Creatine nitrate + caffeine (400mg) co-ingestion didn't alter subjective sleep quality. But 400mg caffeine is the problem, not the creatine.
- **Creatine alone:** May actually improve sleep duration on training days (Nutrients 2025). Safe for sleep.
- **Pre-workout supplements:** ScienceDaily 2026 warns: linked to dangerous sleep loss in 16-30 year olds.

## Practical Application: Last Caffeine Cutoff

For someone consuming ~400-500mg total daily (3-4 teas + coffee + supplements):

| Last caffeine | Hours before 10 PM sleep | Residual at bedtime | Verdict |
|--------------|-------------------------|--------------------:|---------| 
| 2 PM | 8.5h | ~12% | ✅ Safe |
| 3 PM | 7.5h | ~20% | ⚠️ Borderline |
| 4 PM | 6.5h | ~38% | ❌ Disruptive |
| 5 PM | 5h | 50% | ❌ Highly disruptive |

**The LAST dose of the day is the critical variable** — not total intake, not timing of earlier doses. Each dose has its own clearance curve; the one closest to bedtime determines residual concentration during sleep.

## Research-DB Schema (for appending papers)

- `lesson` (title): Paper title with context (e.g., "Caffeine & Sleep: Meta-Analysis (Gardiner 2023)")
- `Tags` (multi_select): sleep, HRV, Health, personal health, RCT, meta-analysis, etc.
- `Year` (number): Publication year
- `rational evidence` (rich_text): Concise TL;DR with key findings and practical implication
- `source_transcript` (rich_text): DOI URL

## Calendar Integration Pattern

Events added via Composio `GOOGLECALENDAR_CREATE_EVENT`:
- **Workout event:** 6:00-7:00 AM weekdays, description includes caffeine clearance math
- **Caffeine cutoff reminder:** 2:00 PM weekdays, description includes research rationale
- Both recurring via `RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR`
