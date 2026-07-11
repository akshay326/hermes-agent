# Notion Research DB: Content Architecture

## The Problem
When auto-discovering research papers, it's tempting to put the same content in both the evidence property and the page body. This creates redundancy — the user sees the same information twice in slightly different words.

## The Rule
**Evidence property = TL;DR** (what you see in table/database views)
**Page body = Deep council** (what you see when you open the page)

They serve different purposes and should NOT repeat each other.

## Evidence Property Format (concise, scannable)
```
AUTO-DISCOVERED YYYY-MM-DD
Authors: ...
Source: URL

EXECUTIVE SUMMARY: 2-3 sentences

HEALTH: One-line takeaway
→ Action: One concrete action

WEALTH: One-line takeaway
→ Action: One concrete action

SOCIAL: One-line takeaway
→ Action: One concrete action

CBT: One-line takeaway
→ Reframe: One concrete reframe

PERSONAL: One-line takeaway
→ 1. Action one
→ 2. Action two
→ 3. Action three

VERDICT: One sentence
```

## Page Body Format (deep analysis, no repetition)
```
📄 Paper Overview — methodology, sample size, metrics (NOT the abstract)
🔬 The Key Finding — the core asymmetry or result (NOT the executive summary)
📊 Your Data Against This Framework — personal Oura/context data mapped to findings
🧠 CBT Chain: [Topic] — full thought→feeling→behavior breakdown with reframe
🎯 Implementation: The N-[Topic] Fix — concrete steps with reasoning
⚖️ Bottom Line — one thing to do
```

## Why This Works
- Evidence property is visible in database views, filters, and searches → needs to be scannable
- Page body is what you read when you open the page → needs to be the reasoning chain
- The user evaluates the evidence property first ("is this worth reading?"), then dives into the body ("why should I care?")
- Redundancy wastes the user's attention and makes both sections feel shallow

## Multi-POV Analysis Framework
The 5 perspectives (health, wealth, social, CBT, personal) are used for the evidence property TL;DR. The page body uses the same perspectives but with DEEPER analysis:
- Evidence property: one-line takeaway + one action
- Page body: 2-3 sentences of analysis + the reasoning chain + implementation steps

## User Feedback That Drove This
> "you left rational evidence and this counsel, critique, or explanation or simplification of the actual evidence both in rational evidence and in the core body... what should you write, where, and why is the redundancy acting in the first place?"

> "i like this format that you have in the rational evidence slightly better than the format below"

The user prefers the concise evidence property format. The page body should be the deep dive, not a rephrased summary.
