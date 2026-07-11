# The Anti-Inaction System — Reference Document

Full system design saved at: `/home/ubuntu/.hermes/research/anti-inaction-system.md`

## Key Components

1. **MCII Cards** — Mental Contrasting with Implementation Intentions for each avoidance item
2. **Courage Dashboard** — Physical device (Fire tablet) with left panel (avoidance list) + right panel (KPIs)
3. **Daily Ritual** — 2-min morning question + 1-min evening reflection
4. **Weekly Review** — 10-min Sunday session with fear accuracy score + 80-year-old test
5. **Notion Databases** — "Courage Actions" + "Weekly Reflections"

## Research Anchors

- Gilbert et al. (2004) — 95% anticipation bias
- Gollwitzer & Sheeran (2006) — Implementation intentions (d = .65)
- Gilovich & Medvec (1995) — Inaction regret > action regret
- Breines & Chen (2012) — Self-compassion reduces avoidance
- Steel (2007) — Procrastination as self-regulatory failure

## Mermaid Diagrams

Two sequence diagrams in the document:
1. Daily Courage Practice (morning + evening flow)
2. Weekly Review Flow (Sunday session)

## Integration Points

- Google Sheets → Dashboard (auto-refresh KPIs)
- Notion → Dashboard (MCII cards + reflections)
- Fire Tablet → Dashboard (full-screen browser mode)
- Hermes → Discord (morning/evening reminders via cron)

## User's 5 Items

1. No-Weed Challenge (CUD)
2. RNG Outreach (Fear of Rejection)
3. RFS Upsolving (Compliance)
4. Freelancing/Gigs (Financial Independence)
5. ML Applications (Academic/Career)

Each has: desired outcome, obstacle, if-then plan, 80-year-old test.
