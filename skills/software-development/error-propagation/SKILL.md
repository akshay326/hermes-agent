---
name: error-propagation
description: "Make failures loud across every layer — function, module, CLI, cron. Silent data corruption is worse than no feature. Covers removing heuristic fallbacks, diagnosing silent failure chains, and verifying error propagation."
version: 1.0.0
author: Hermes Agent
tags: [error-handling, debugging, pipelines, reliability, cron]
related_skills: [systematic-debugging, eval-gates]
---

# Error Propagation: Making Failures Loud

**Core principle:** Silent corruption is worse than no feature. When a fallback mechanism produces garbage data, the system must scream — not whisper.

## When to Use

- Removing a heuristic fallback (citation count, default score, placeholder data)
- Replacing catch-and-swallow with proper error propagation
- Any pipeline where silent data corruption is worse than visible failure
- Cron jobs that need to alert on failure, not just log it
- Debugging "why is garbage data in my database?"

## The Anti-Pattern: Silent Failure Chain

```
Function throws → catch → fallback to heuristic (GARBAGE DATA)
  → Module catches → sets result.error (SILENT)
    → CLI catches → chalk.yellow("⚠") (WHISPER)
      → Cron agent: "No paper added, moving on" (DEAF)
```

Every layer eats the error. Garbage enters the database. Nobody knows until someone manually inspects the data.

## The Fix: Screaming Failure Chain

```
Function throws after N attempts (NO FALLBACK)
  → Module RE-THROWS critical errors (DON'T SWALLOW)
    → CLI: chalk.bgRed.white.bold("🔥 CRITICAL FAILURE") + exit(1)
      → Cron prompt: MUST start with 🔥 — can't silently continue
```

## Implementation: 4 Layers

### Layer 1: Function Level — Throw, Don't Return Garbage

```typescript
// BEFORE (bad): silent fallback
try {
  rankings = await callLLM(papers);
} catch (e) {
  if (attempt === 1) {
    rankings = papers.map(p => ({ score: citationCount / 10 })); // GARBAGE
  }
}

// AFTER (good): throw on failure
try {
  rankings = await callLLM(papers);
} catch (e) {
  if (attempt === 1) {
    throw new Error(`LLM ranking failed after 2 attempts: ${e.message}`);
  }
}
```

### Layer 2: Module Level — Re-throw Critical Errors

```typescript
// BEFORE (bad): swallow everything
} catch (e) {
  result.error = e.message; // silent
}

// AFTER (good): re-throw critical failures
} catch (e) {
  if (e.message?.includes('LLM ranking failed')) throw e; // RE-THROW
  result.error = e.message; // non-critical still caught
}
```

### Layer 3: CLI Level — Visual Screaming

```typescript
// BEFORE (bad): yellow whisper
console.log(chalk.yellow(`⚠ No paper added: ${result.error}`));

// AFTER (good): red banner
console.error(chalk.bgRed.white.bold(' 🔥 LLM RANKING FAILURE — NO PAPER ADDED '));
console.error(chalk.red(`   Error: ${result.error}`));
console.error(chalk.red('   The heuristic is GONE — no fallback, no silent corruption'));
```

### Layer 4: Cron/Agent Level — Prompt Must Enforce Reporting

```
CRITICAL: If the command fails:
1. DO NOT silently move on
2. Your message MUST start with: 🔥 LLM RANKING FAILURE
3. Include the EXACT error
4. State: "The heuristic has been removed. No fallback."
DO NOT say "No paper added, but that's okay" — the failure IS the story.
```

## Diagnosing Silent Failures

### Symptoms

- Garbage data appearing in database with suspiciously uniform scores
- Heuristic reasons in logs: "score is heuristic", "LLM failed, using citation count"
- Cron jobs reporting "ok" but no real work being done
- Catch blocks that set `result.error` but never throw

### Tracing the Chain

1. Find the heuristic: `grep -r "heuristic\|fallback\|Math.min\|citationCount" src/`
2. Find the catch blocks: `grep -r "catch.*{" src/` and trace what they do
3. Find the cron prompt: check if it says "moving on" or "that's okay" after failures
4. Test: kill the upstream dependency and run the pipeline — what do you see?

## Verification: Proof, Not Prediction

**The user's rule:** When asked to verify a fix, EXECUTE the code and show output. Do NOT say "this should work because..." or "the fix is correct because...". Predictions are noise. Execution is signal.

Bad: "The fix should prevent garbage data because the heuristic is removed."
Good: Runs the pipeline → shows score 8 with real reason → "Score 8, real reason, real tags. Done."

### Verification Checklist

After applying the pattern:

- [ ] Kill the upstream dependency (LLM endpoint, API, database)
- [ ] Run the pipeline
- [ ] Verify SCREAMING output at every layer
- [ ] Verify no garbage data enters the system
- [ ] Verify the cron job delivers the failure message
- [ ] Verify the failure message includes the exact error

If any layer silently eats the error, the pattern is incomplete.

### Falsifiable Test

If the fix is correct, this command must produce a screaming failure (not a silent one):

```bash
# Kill the dependency, then run the pipeline
OPENCODE_API_KEY="invalid" bun src/cli.ts discover --json 2>&1
# Expected: 🔥 LLM RANKING FAILURE banner + exit code 1
# If you see "⚠ No paper added" or exit 0 → fix is incomplete
```

## Real-World Example

**Problem:** Research discovery pipeline silently adding irrelevant papers.

**Root cause:** `rankPapers()` falls back to citation-count scoring when LLM fails. Papers with 128 citations but zero topical relevance score 1.0. Papers with 1 citation in a small pool also score 1.0.

**Fix:**
1. Removed citation-count heuristic (7 lines deleted)
2. `rankPapers()` throws after 2 failed attempts
3. `discoverResearch()` re-throws LLM failures
4. `cli.ts` prints red banner + exit(1)
5. Cron prompt updated to require failure reporting

**Result:** LLM down → pipeline fails loudly → no garbage in database → cron alerts Discord.

## Related

- `systematic-debugging` — 4-phase root cause debugging methodology
- `eval-gates` — pair cron jobs with evals as CI pre-merge gates
