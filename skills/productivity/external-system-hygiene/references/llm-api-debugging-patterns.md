# LLM API Debugging Patterns

## Reasoning Model Token Budget Trap

**Symptom:** LLM returns empty string despite `maxTokens: 2000`. Response is `finish_reason: "length"`.

**Root cause:** Reasoning models (DeepSeek-R1, MiMo) consume output tokens for internal reasoning before producing visible content. A 2K budget gets entirely eaten by reasoning, leaving 0 tokens for the actual JSON response.

**Fix:** Set `maxTokens: 30000` for reasoning models with `response_format: { type: 'json_object' }`. The reasoning tokens + JSON output both count against the budget.

**Verification:** Check `finish_reason` in the API response. If `"length"`, the budget is too low. If `"stop"`, the response is complete.

## reasoning_content vs content

**Symptom:** LLM response has `content: null` but `reasoning_content` contains the answer.

**Affected models:** MiMo v2.5, DeepSeek-R1 (reasoning models).

**Fix in llm.ts:** When `content` is empty, extract the last non-empty line from `reasoning_content`:

```typescript
if (!content) {
  const reasoningContent = (data.choices?.[0]?.message as Record<string, unknown>)?.reasoning_content;
  if (typeof reasoningContent === 'string') {
    const lines = reasoningContent.split('\n').filter((l: string) => l.trim());
    content = lines[lines.length - 1] ?? '';
  }
}
```

**Better fix:** Use a non-reasoning model (e.g., `deepseek-v4-flash`) for JSON output tasks. Reasoning models are overkill for structured extraction.

## Error Propagation Anti-Pattern

**Symptom:** Errors disappear at each layer of the call chain. Pipeline silently returns "no result" instead of failing loudly.

**The chain:**
```
rankPapers() throws
  → discoverResearch() catch: sets result.error (SILENT)
    → cli.ts catch: prints warning, exit(1) (WHISPER)
      → cron agent: sees exit code, moves on (BLIND)
```

**Fix:** At each layer, decide: propagate or handle completely.

- **Propagate:** `throw e` — let it bubble up
- **Handle:** Log LOUDLY, alert, retry — never just set `result.error` and continue
- **Never:** Catch → set error string → continue (this is silent corruption)

**The rule:** A crash is always preferable to silent corruption.

## Citation-Count Heuristic Failure

**Symptom:** Papers with 1 citation score 1.0 because the pool max is also 1.

**Root cause:** Normalizing citation counts within a small pool (3 papers) produces meaningless scores. A paper with 1 citation in a pool where the max is 1 gets score 1.0 — same as a paper with 224 citations in a pool where the max is 224.

**Fix:** Remove the heuristic entirely. If the LLM can't score, fail loudly. Never fall back to citation-count normalization.

## re-score-verify Pattern

When you fix a scoring/ranking bug, existing data was assigned by the broken code. Re-run the fixed logic against ALL existing entries:

1. Query all entries grouped by scoring context
2. Re-score each through fixed logic
3. Show old vs new scores in a table
4. Purge entries that fail new scoring

This is the only way to prove the DB is clean. "Future entries will be fine" is not sufficient.
