# Learning Signal Detection — Regex Patterns & Technique Mapping

## Signal Types → Learning Science Techniques

| Signal | Regex Patterns | Technique | Effect Size | Source |
|--------|---------------|-----------|-------------|--------|
| confusion | `confus`, `not sure`, `hmm`, `unclear`, `wait`, `i think.*but`, `maybe.*wrong`, `i'm.*lost` | Self-Explanation | d=0.55 | Chi et al. 1989 |
| prediction | `i think.*will`, `i bet`, `my prediction`, `probably`, `i predict`, `he.*will.*probably` | Elaborative Interrogation | d=0.46 | Dunlosky et al. 2013 |
| insight | `oh wow`, `surprised`, `finally`, `nice`, `cool`, `prior.*updated`, `i was wrong`, `turns out` | Spaced Retrieval | d=0.50 | Roediger & Karpicke 2006 |
| question | `i'm curious`, `wondering`, `what would`, `how does`, `why.*does`, `what if`, `i want to know` | Elaborative Interrogation | d=0.46 | Dunlosky et al. 2013 |
| connection | `connects? to`, `like.*when`, `similar to`, `reminds me`, `same as`, `parallel`, `both.*about` | Interleaving | d=0.43 | Rohrer & Taylor 2007 |

## Signal Detection Results (2026-07-09)

Test run on Akshay's Readwise (20 recent highlights):
- confusion: 8 signals
- prediction: 6 signals
- insight: 5 signals
- question: 2 signals
- connection: 5 signals

**Total: 26 signals across 20 highlights** — Akshay's notes are rich with learning signals.

## Nudge Type → Discord Format

```
{emoji} **{nudge_type}** — from {source}

{your_highlight_or_note_summary}

{nudge_prompt}
```

### Nudge Prompts by Type

- **connection**: "Your highlight says: '...' — Can you connect this to something else you've read recently? What's the structural similarity?"
- **confusion**: "You wrote: '...' — What specifically is unclear? Try to articulate the confusion in one sentence."
- **prediction**: "Your note says: '...' — Was your prediction right? What did you miss?"
- **question**: "You asked: '...' — Have you found the answer? If so, does it update your prior?"
- **insight**: "You noted: '...' — Can you explain what surprised you and why? That's self-explanation in action."

## Cron Schedule (PDT)

| Time | Type | Cron (UTC) | Job ID |
|------|------|------------|--------|
| 8:15 AM | prediction | `15 15 * * 1-5` | 90fc4be7ea16 |
| 12:15 PM | connection | `15 19 * * 1-5` | 5da82aa4c9ca |
| 2:00 PM | confusion | `0 21 * * 1-5` | fb533eb02726 |
| 6:15 PM | insight | `15 1 * * 2-6` | e6e7c133781e |

## Feedback Loop Tracking

File: `/workspace/learning-companion/feedback-loops.json`

Metrics:
- `total_nudges`: Total nudges sent
- `nudges_responded`: Nudges that got a response
- `prior_updates_detected`: Responses containing "I was wrong", "turns out", "actually"
- `feedback_loop_rate`: responses / total_nudges
- `weekly`: Per-week breakdown of nudges, responses, prior updates

## Extending Signal Patterns

To add new signals, edit the `SIGNALS` object in `scripts/nudge-generator.js`. Each signal type maps to an array of regex patterns. The first matching pattern per type per highlight triggers that signal.

To add new nudge types:
1. Add regex patterns to `SIGNALS`
2. Add technique mapping to `TECHNIQUE_MAP`
3. Add prompt template to `generateNudgePrompt()`
4. Add emoji to `typeEmoji` in `main()`
