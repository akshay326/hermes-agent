---
name: cp-sparring
description: "Competitive programming sparring partner — daily problems, code review, test execution, progress tracking. For interview prep."
version: 1.0.0
author: Hermes Agent
metadata:
  hermes:
    tags: [cp, interview-prep, sparring, coding, algorithms]
---

# CP Sparring Partner

Daily competitive programming practice partner for interview preparation.

## Workflow

### Primary Surface: LeetCode
User works directly on LeetCode. **Discord is for when stuck, not for routine practice.** The flow:
1. User gets daily problem (via cron or Notion question bank)
2. User solves on LeetCode independently
3. **Only comes to Discord when stuck** — paste code, get pre-checks
4. Final submission happens on LeetCode (the real judge)

### Daily Delivery (via cron → HOME CHANNEL, not thread)
1. Cron sends today's problem to home channel (discord:1522097290263789799)
2. Include: problem name, LC link, pattern tag, time limit
3. Include ONE "prime" question: "Before you code — what approach would you try? What's the first data structure you'd reach for?"
4. Keep it short and punchy. No explanations. Just the problem and the prime question.

### Code Review (when user pastes solution — ONLY when stuck)
1. Run the code against test cases in the local Python environment
2. Report: ✅ PASS / ❌ FAIL with test case details
3. Ask ONE follow-up: "What's the time/space complexity?" or "What if input was X?"
4. If stuck: point to the gap (don't solve). "Your logic breaks at [specific place]"

### Solution Review (user presents already-solved work)
When the user says "check my notability" / "I solved X" / "review my solutions" — they want **code review of work already completed and accepted on LeetCode**. This is NOT a "stuck" scenario.
1. Pull the notes from Notability via Google Drive (see `ml-equation-quizzer` pipeline)
2. Analyze all solution variants (e.g. "3 different formats" for 2Sum)
3. For each variant: critique time/space complexity, readability, edge cases
4. Compare the approaches — which is optimal and why
5. Suggest next problems based on the pattern they just practiced
6. The user may have multiple documents for different problems — check for all of them

#### Critique Format (reference: `references/cp-critique-format.md`)
Structure the review as:
- **Problem statement** — restate what they solved
- **Your Approaches** — enumerate each variant with:
  - How it works (1-2 sentences)
  - Time/space complexity
  - Whether it's correct
- **What's solid** — affirm correct insights and good reasoning
- **Issues** — specific bugs, edge cases missed, or suboptimal choices
- **Next Problems** — 4-6 problems that build on the pattern they just practiced, with reasons why each is the right next step

**⚠️ Verification Honesty:** I can pre-check against visible examples + edge cases I write, but I do NOT have LeetCode's hidden test cases. My verification is a pre-check, NOT a replacement for the LC judge. Always tell the user: "Submit on LeetCode for final proof." Don't oversell this capability — the user asked directly and expects honesty.

### Notion Question Bank
- Single page (NOT a database): `39610db41d1381e095b2cd3a293fccc7`
- 30 Blind 75 problems, 6 patterns, status column (⬜/✅)
- User updates status directly in Notion after solving
- Parent page: `38910db4-1d13-80e6-bed0-cc41924914ba`

### Progress Tracking
- Log to `~/.hermes/cp-sparring/progress.json`
- Format: `{date, phase, problem_id, pattern, result, time_taken, retries}`
- Weekly summary: problems solved, patterns weak, streak

## Problem Sets

### Phase 1: Pattern Reactivation (Weeks 1-2)
One pattern per day, cycle through:
- Mon: Arrays + Hashing — LC 1, 49, 128, 238, 560
- Tue: Two Pointers + Sliding Window — LC 3, 11, 15, 424, 76
- Wed: Binary Search — LC 33, 34, 74, 153, 4
- Thu: Stack + Monotonic Stack — LC 20, 155, 84, 496, 739
- Fri: Linked List + Fast/Slow — LC 2, 19, 21, 141, 234
- Sat: Trees (BFS/DFS) — LC 102, 104, 226, 236, 543

### Phase 2: Core Interview Patterns (Weeks 3-4)
Two days per pattern, timed:
- Graph BFS/DFS: LC 200, 207, 695, 743, CF 1365D (30 min)
- Graph Shortest Path: LC 743, 787, 1514, 778, CF 20C (35 min)
- DP 1D: LC 70, 139, 198, 300, 322 (40 min)
- DP 2D: LC 62, 64, 1143, 72, 516 (45 min)
- Backtracking: LC 17, 39, 46, 78, 51 (35 min)
- Heap: LC 215, 295, 347, 23, 373 (30 min)
- Intervals: LC 56, 57, 435, 253, 986 (25 min)
- Trie: LC 208, 211, 212, 336, 648 (35 min)

### Phase 3: Pressure Training (Weeks 5-6)
- 1v1 battles (CodeSmash, CF Fight) — Mon/Thu
- Virtual CF Div 2 — Tue (2 hrs)
- LC Hard day — Wed (2 problems, 45 min each)
- Virtual AtCoder ABC — Fri (100 min)
- Mock interview — Sat (2 problems, 60 min, explain aloud)

## Rules
- Never solve the problem for the user — point to the gap
- Ask "what have you tried?" before explaining
- After solve: ask about complexity or edge cases
- Track retries — improvement comes from failing and retrying, not from solving on first try
- **Image-based solutions are common** — user writes code on iPad in Notability, expects vision-based review. Delegate to OpenRouter vision (see `ml-equation-quizzer` pipeline). Don't ask for text paste when the pipeline exists.
- **Be persistent, not passive.** When tools fail (Composio down, Drive API errors), retry with backoff and try alternative paths. The user said "figure it out not my problem" and "retry again" — they expect you to exhaust all automated options before asking for manual work. Give up only after 3+ genuine attempts with different approaches.
