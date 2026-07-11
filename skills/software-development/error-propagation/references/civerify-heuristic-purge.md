# Session: Civerify LLM Ranking Heuristic Purge

**Date:** 2026-07-07
**Project:** civerify (research discovery pipeline)
**Files:** `src/research-discovery.ts`, `src/cli.ts`

## Problem

`rankPapers()` crashed on JSON parse when deepseek-v4-flash reasoning tokens consumed the output budget. The catch block fell back to citation-count scoring — a heuristic that produced garbage. Papers with 128 citations but zero topical relevance scored 1.0. Papers with 1 citation in a small pool also scored 1.0.

## Root Cause Chain

1. MiMo v2.5 was the ranking model — puts JSON in `reasoning_content`, not `content`
2. Switched to deepseek-v4-flash — but `maxTokens: 2000` too low for reasoning + JSON
3. Reasoning tokens consumed entire budget → empty response → JSON.parse fails
4. Catch block fell back to citation-count heuristic → garbage data entered Notion DB

## Changes Made

### research-discovery.ts

```diff
// rankPapers() — removed heuristic fallback, added throw
- if (attempt === 1) {
-   rankings = papers.map((p, i) => ({
-     index: i + 1,
-     score: p.source === 'semantic_scholar' ? Math.min(7, 3 + Math.floor(p.citationCount / 10)) : 5,
-     reason: `Heuristic (LLM failed: ${lastError})`,
-     tags: existingTags.slice(0, 2),
-   }));
- }
+ if (attempt === 1) {
+   throw new Error(`LLM ranking failed after 2 attempts: ${lastError}`);
+ }

// discoverResearch() — re-throw LLM failures
} catch (e) {
+   if ((e as Error).message?.includes('LLM ranking failed')) {
+     throw e;
+   }
    result.error = e instanceof Error ? e.message : String(e);
```

### cli.ts

```diff
// discover command — screaming failure banner
} else {
-   console.log(chalk.yellow(`⚠ No paper added: ${result.error}`));
+   console.error(chalk.bgRed.white.bold(' 🔥 LLM RANKING FAILURE — NO PAPER ADDED '));
+   console.error(chalk.red(`   Error: ${result.error}`));
+   console.error(chalk.red('   The heuristic is GONE — no fallback, no silent corruption'));
}
```

### Cron prompt (research-ingestion, job d2688bfa66ea)

Added: "If the command fails, your message MUST start with: 🔥 LLM RANKING FAILURE. DO NOT silently move on."

## Verification

- ✅ Heuristic removed (no citation-count scoring)
- ✅ Throws on LLM failure
- ✅ Re-throws LLM errors
- ✅ Screaming failure banner
- ✅ Success path works (score 8, real reason, real tags)
- ✅ Cron prompt enforces failure reporting

## Settings That Work

- Model: `deepseek-v4-flash` (cheaper, cleaner JSON than MiMo v2.5)
- Max tokens: 30,000 (reasoning tokens consume budget — 2K was too low)
- Response format: `{ type: 'json_object' }` (enforced, not optional)
- Abstract truncation: 100 chars (was 300 — saves tokens)
