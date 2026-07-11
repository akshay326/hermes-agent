---
name: research-verification
description: "Verify claims of novelty before accepting or challenging them. Dispatch subagents to search arxiv, Google Scholar, and key blogs. Grade honestly: ✅ novel, ⚠️ components exist but synthesis is new, ❌ well-explored. Use when user says 'nobody is talking about this' or 'this is a novel insight'."
version: 1.0.0
author: Hermes
license: MIT
metadata:
  hermes:
    tags: [research, verification, novelty, academic-integrity]
---

# Research Verification — Novelty Checking Pattern

When the user claims "nobody is talking about this" or "this is a novel insight":

## The Rule

**DO NOT accept the claim at face value** — even if it sounds plausible.
**DO NOT dismiss it immediately** — the user may be right.

Verify first. Then grade honestly.

## Why This Matters

The user's credibility depends on knowing the literature. If they claim novelty and a reviewer cites existing work, they look uninformed. Verification is an act of respect, not doubt.

## Verification Steps

1. **Identify the claim** — what specific synthesis or insight is being claimed as novel?
2. **Dispatch a subagent** to search:
   - arxiv (API or web search)
   - Google Scholar
   - Key blogs (Anthropic, OpenAI, EleutherAI, LessWrong)
   - Twitter/X (for recent discourse)
3. **Wait for results** — the 2-3 minute delay is worth the credibility
4. **Grade honestly**:
   - ✅ "You're right — this specific synthesis doesn't exist in the literature"
   - ⚠️ "The components exist (cite them), but your specific framing is novel"
   - ❌ "This is already well-explored (cite the papers). What's different about your angle?"

## Subagent Dispatch Pattern

```python
delegate_task(
    goal="Search for existing research on [topic]. Find papers or blog posts that discuss [specific aspects]. Return the key papers/authors and their main arguments.",
    context="User has an insight about [topic]. Need to verify if this is novel or already discussed in literature. Check arxiv, Google Scholar, Anthropic blog, OpenAI blog, and general ML literature."
)
```

## Grading Rubric

| Grade | Meaning | Response |
|-------|---------|----------|
| ✅ Novel | Specific synthesis doesn't exist | "You're right. I can't find this in the literature." |
| ⚠️ Partially novel | Components exist, synthesis is new | "The components exist (cite them), but your specific framing is novel. Here's what's already been said..." |
| ❌ Not novel | Well-explored | "This is already well-explored (cite papers). What's different about your angle?" |

## Example (2026-07-10)

**Claim**: "I'm not sure if anyone is talking about" the parallel between human learning and LLM alignment.

**Subagent found**:
- 15+ papers on self-play for LLM alignment (SPIN, SPPO, SPAG, RSPO, etc.)
- "Generativism" (this month) on human learning parallels
- "AI Safety via Debate" (Irving et al., 2018) — foundational paper
- "Cognitive Framework for LLM Learning" (Wu et al., 2025) — maps LLM learning to human cognition

**Verdict**: ⚠️ The specific synthesis (human self-play cognition ↔ LLM self-play alignment as unified framework) was novel. The components were well-explored.

**Key papers to cite when claiming this synthesis**:
- Irving et al. (2018) — AI Safety via Debate: self-play for alignment
- Chen et al. (ICML 2024) — SPIN: self-play fine-tuning
- Bai et al. (2022) — Constitutional AI: self-critique as self-play
- Wu et al. (2025) — Cognitive framework mapping LLM learning to human cognition
- Generativism (2026) — new learning theory for generative AI age

## Pitfalls

- **Accepting without verification** — the user may be wrong, and that's okay. Better to catch it early.
- **Dismissing without verification** — the user may be right, and you'd be denying them credit.
- **Verifying but not sharing results** — the user needs to know what exists so they can differentiate their contribution.
- **Being slow about it** — dispatch the subagent immediately, don't wait for multiple turns.
