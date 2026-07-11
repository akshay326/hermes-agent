---
name: learning-companion
description: "AI learning companion that reads Readwise/Notion, generates evidence-based nudges, and tracks Bayesian prior updates. Uses elaborative interrogation, self-explanation, spaced retrieval, and interleaving — all grounded in learning science."
version: 1.0.0
author: Hermes
license: MIT
metadata:
  hermes:
    tags: [learning, productivity, readwise, nudge, feedback-loop]
    homepage: https://github.com/nousresearch/hermes-agent
---

# Learning Companion — Evidence-Based Nudge System

An AI "pair of eyes" that watches learning across Readwise, Notion, and other sources, generates personalized nudges, and tracks Bayesian prior updates.

## Architecture

```
Readwise (highlights + notes) ──┐
Notion (research-db, learning path) ──┤──→ Signal Detection ──→ Nudge Generation ──→ Discord Threads
Notability (future) ──┘                                                    │
                                                             ┌──────────────┘
                                                             ▼
                                                    Feedback Loop Tracking
                                                    (feedback-loops.json)
```

## Evidence Base

Four learning techniques with effect sizes from meta-analyses:

| Technique | Effect Size | Source |
|-----------|-------------|--------|
| Elaborative Interrogation | d = 0.46 | Dunlosky et al. (2013) |
| Self-Explanation | d = 0.55 | Chi et al. (1989) |
| Spaced Retrieval | d = 0.50 | Roediger & Karpicke (2006) |
| Interleaving | d = 0.43 | Rohrer & Taylor (2007) |

All 4 articles are in research-db (Notion).

## Signal Detection

The nudge generator detects these signals in Readwise highlights:

1. **Confusion signals**: "confused", "not sure", "hmm", "unclear"
2. **Prediction signals**: "I think", "I bet", "my prediction", "probably"
3. **Insight signals**: "oh wow", "surprised", "finally", "prior updated"
4. **Question signals**: "I'm curious", "wondering", "what would", "how does"
5. **Connection signals**: "connects to", "like when", "similar to", "reminds me"

## Nudge Types

| Type | Emoji | What It Does |
|------|-------|--------------|
| Connection | 🔗 | Links two things you've read that you haven't connected |
| Gap Probe | ❓ | Identifies a confusion and asks you to resolve it |
| Prediction Check | 🎯 | Asks if your earlier prediction was right |
| Curiosity Seed | 💡 | Plants a question for later, not now |
| Retrieval Practice | ✨ | Picks a highlight from 2 weeks ago and asks you to recall |

## Bayesian Prior Updates

The core metric: **how many nudges led to prior updates?**

- Each nudge that gets a response = feedback loop completed
- Each response that contains "I was wrong", "turns out", "actually" = prior update detected
- Feedback loop rate = responses / total nudges
- Weekly tracking shows trends

## Tracking File

`~/.hermes/learning-companion/feedback-loops.json`:
```json
{
  "metrics": {
    "total_nudges": 0,
    "nudges_responded": 0,
    "prior_updates_detected": 0,
    "feedback_loop_rate": 0,
    "weekly": {}
  },
  "nudges": [],
  "prior_updates": []
}
```

## Cron Schedule

4 daily check-ins aligned with Akshay's canonical day (PDT):
- **8:15 AM** — Post-OTF, pre-research morning nudge
- **12:15 PM** — Post-research, pre-nature midday nudge
- **2:00 PM** — Post-lunch, pre-DS/Algo afternoon nudge
- **6:15 PM** — Post-DS/Algo, pre-dinner evening nudge

All deliver to Discord Home channel (1522097290263789799).

## Nudge Delivery Format

```
{emoji} **{nudge_type}** — from {source}

{your_highlight_or_note}

{nudge_prompt}
```

Example:
```
🎯 **prediction check** — from Let's Build GPT by Andrej Karpathy

Your note: "Hmm. I'm curious to know more what would be such a situation with language next token prediction."

Was your prediction right? What did you miss?
```

## Behavioral Rules

1. **One nudge per check-in** — never dump multiple questions
2. **Always grounded in YOUR data** — never generic
3. **Questions, not answers** — point to the gap, don't fill it
4. **Timed to natural breaks** — not during deep work
5. **Track responses** — update feedback-loops.json when user responds
6. **Weekly synthesis** — report feedback loop rate every Sunday

## Pitfalls

- **Don't nudge when there's nothing to nudge about** — if no signals found, stay silent
- **Don't repeat the same nudge** — check tracking file for recent nudges
- **Don't nudge on weekends** — unless user explicitly wants it
- **Don't over-explain the technique** — just ask the question
- **Don't track without user consent** — always transparent about what's measured

## Sources

- Dunlosky J et al. (2013). PSPI, 14(1), 4-58.
- Chi MTH et al. (1989). Cognitive Science, 13(2), 145-182.
- Roediger HL, Karpicke JD (2006). Psychological Science, 17(3), 249-255.
- Rohrer D, Taylor K (2007). Instructional Science, 35(6), 481-498.
- Brčić M & Frljić S (2026). arXiv:2606.26181.
