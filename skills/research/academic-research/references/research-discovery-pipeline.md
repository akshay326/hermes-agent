# Research Discovery Pipeline — Implementation Reference

Battle-tested patterns from building an automated research paper discovery system (Jul 2026). Updated 2026-07-09 after "slop" feedback — killed generic wellness topics, raised thresholds, replaced rigid 5-POV with adaptive analysis.

## Architecture (Updated 2026-07-09 — Exa + GLM-5.2)

```
Search (Exa "research paper" primary, arXiv fallback, Semantic Scholar supplementary)
  → Quality Filter (heuristic patterns)
  → Dedup (title similarity against existing DB)
  → LLM Rank (GLM-5.2, score 1-10, threshold ≥ 6)
  → Adaptive Analysis (2-3 relevant perspectives, NOT rigid 5-POV)
  → Notion Insert (properties + rich body blocks)
  → Re-index (embed + upsert to Qdrant)
```

### API Reliability (CRITICAL — discovered 2026-07-09)

**arXiv API times out from cloud servers.** The API is slow/unreliable from Docker/cloud environments. Always add retry with exponential backoff (2s, 4s). Treat arXiv as fallback, not primary.

**Semantic Scholar rate-limits aggressively (429).** Free tier allows ~100 requests/hour. After 3-4 sequential calls, expect 429 even with 1.2s delay. Use OpenAlex for batch DOI resolution (tolerates ~0.5s delay, 2 req/s).

**Exa is the most reliable primary source.** Use `EXA_SEARCH` with `category: "research paper"` for automated pipelines. No rate limit issues, built-in academic content filtering, and returns structured results with highlights. Requires Composio connection (active for this user).

**Fallback order:** Exa → arXiv (with retry) → Semantic Scholar (with delay) → OpenAlex

## Key Files

- `src/research-discovery.ts` — Full pipeline (search, filter, dedup, rank, insert)
- `src/research-indexer.ts` — Passive re-indexer (embed existing entries → Qdrant)
- `src/cli.ts` — `discover` command (runs discovery) + `ingest --research-only` (re-indexes)
- `src/llm.ts` — LLM wrapper (chat, chatStream, chatStructured)
- `evals/research-discovery.test.ts` — Eval harness for the pipeline

## Topic Focus (DEFAULT_TOPICS in research-discovery.ts)

Focus on Akshay's actual research edge — NOT generic wellness:

```
AI cognitive offloading metacognition
LLM reasoning degradation context
decision making satisficing heuristic
perfectionism indecisiveness cognitive
HRV biofeedback stress regulation
biometric-informed behavior change
CBT digital intervention effectiveness
cognitive debt AI assistance
executive function fatigue decision quality
quantified self wearable health outcomes
```

**AVOID**: "meditation stress reduction", "sleep deprivation neurodegeneration", "exercise chronotype circadian", "large language model reasoning" (too broad) — these produce generic wellness slop that's "helpful to doctor friends" but useless for someone doing AI cognition research.

## Topic Selection — DB Tags vs Hand-Crafted Topics (CRITICAL — 2026-07-09)

**Pitfall: Generic DB tags drown out sharp research topics.** When `fetchExistingTags()` pulls tags from the Notion DB, generic tags like "Health" (20x), "personal health" (20x), "HRV" (18x) dominate the frequency sort. The pipeline then searches for these generic terms → gets generic wellness papers → LLM correctly rejects them → "all papers below threshold."

**Fix:** Always lead with `DEFAULT_TOPICS` (sharp, hand-crafted research edge). DB tags only supplement. Filter out known-generic tags before merging:

```typescript
const GENERIC_TAGS = new Set([
  'health', 'personal health', 'ai', 'sleep', 'hrv',
  'stress', 'exercise', 'meditation', 'psychology',
  'meta-analysis', 'intervention', 'learning',
]);

// Always lead with DEFAULT_TOPICS, supplement with non-generic DB tags
const merged = [...DEFAULT_TOPICS, ...filtered.filter(t => !DEFAULT_TOPICS.includes(t))];
```

**Rule:** If the top 5 search topics are single-word or generic ("Health", "sleep", "HRV"), the pipeline will find nothing relevant. The search queries MUST be specific multi-word phrases that describe a research question, not a topic category.

## ArXiv API — Atom XML Parsing (No Dependencies)

arXiv returns Atom XML. Simple regex parsing works fine — no need for an XML library:

```typescript
const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
let match;
while ((match = entryRegex.exec(xml)) !== null) {
  const block = match[1];
  const id = (block.match(/<id>([^<]+)<\/id>/)?.[1] ?? '').split('/abs/').pop() ?? '';
  const title = (block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  const summary = (block.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? '').replace(/\s+/g, ' ').trim();
  const authors = [...block.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)].map(m => m[1].trim());
  const categories = [...block.matchAll(/term="([^"]+)"/g)].map(m => m[1]);
}
```

**Pitfall:** Filter out withdrawn papers — check if title contains "withdrawn" after parsing.

## Semantic Scholar — Rate Limits Are Aggressive

The documented "1 req/sec" is optimistic. In practice:
- 429 errors after 3-4 sequential calls even with 1.5s delay
- Use `time.sleep(1.2)` between calls minimum
- For batch operations, prefer OpenAlex (tolerates ~0.5s delay, 2 req/s)
- Treat Semantic Scholar as supplementary to arXiv, not primary

## Quality Filter — Heuristic Rejection Patterns

```typescript
const rejectPatterns = [
  /preliminary/i,
  /short\s+paper/i,
  /workshop\s+paper/i,
  /demo\s+paper/i,
  /extended\s+abstract/i,
];
```

Additional filters:
- Abstract < 100 chars → reject (placeholder/missing)
- Semantic Scholar: citation count thresholds by age:
  - yearDiff > 1: require 5+ citations
  - yearDiff > 2: require 20+ citations

## Dedup — Title Similarity

Three-layer check:
1. **Exact match** — normalized lowercase Set lookup
2. **Substring containment** — either direction (`existing.includes(new)` or `new.includes(existing)`)
3. **Token overlap** — Jaccard similarity > 70%: `intersection / union > 0.7`

```typescript
function isDuplicate(title: string, existingTitles: Set<string>): boolean {
  const normalized = title.toLowerCase().trim();
  if (existingTitles.has(normalized)) return true;
  for (const existing of existingTitles) {
    if (normalized.includes(existing) || existing.includes(normalized)) return true;
    const normTokens = new Set(normalized.split(/\s+/));
    const existTokens = new Set(existing.split(/\s+/));
    const intersection = [...normTokens].filter(t => existTokens.has(t)).length;
    const union = new Set([...normTokens, ...existTokens]).size;
    if (union > 0 && intersection / union > 0.7) return true;
  }
  return false;
}
```

## LLM Ranking — Quality Criteria (Threshold ≥ 6, CALIBRATED — Updated 2026-07-09)

**Score threshold: ≥ 6 to pass** (lowered from 7 after discovering the prompt was too pessimistic).

**Model: `glm-5.2`** (not `z-ai/glm-5.2` — the prefix breaks the API). Tested and confirmed working via opencode-go provider.

### Scoring Bands (CALIBRATED, not pessimistic)
- **8-10**: Genuinely novel, rigorous, directly relevant. Add to DB.
- **6-7**: Solid contribution, relevant topic, worth tracking. Add to DB.
- **4-5**: Incremental, small sample, or tangentially relevant. Reject.
- **1-3**: Generic wellness, confirms known facts, or off-topic. Reject.

### Calibration Rules (from 2026-07-09 "AI slop" debugging)

**Pitfall: Overly strict prompt rejects everything.** The original prompt said "most papers should score below 7" and demanded peer-reviewed in top venues. This caused the LLM to score a perfectly relevant "Cognitive Offloading in the Age of LLMs" paper as 6/10 and reject it.

**Fixes applied:**
1. **ArXiv preprints are acceptable** IF they have rigorous methodology. Many top papers start as preprints.
2. **Score relevance to ANY focus area**, not ALL simultaneously. No single paper covers AI cognition + HRV + CBT.
3. **Recency bonus**: 2025-2026 papers get +1. This helps newer work pass the threshold.
4. **Remove "most papers should score below 7"** — this sets a pessimistic baseline. Let the criteria speak.

### Updated Ranking Prompt Template
```
Rate these papers by quality and relevance for a researcher focused on: {tags}.

SCORING — be CALIBRATED, not pessimistic:
- Score EACH paper independently against the criteria below
- ArXiv preprints are acceptable IF they have rigorous methodology
- A paper only needs to be relevant to ONE focus area, not all of them
- Recency matters: 2025-2026 papers get a +1 bonus

QUALITY CRITERIA:
1. METHODOLOGY: RCTs, meta-analyses, large cohorts, systematic reviews, or strong computational experiments
2. INSIGHT: Does it change how we think about the topic? Or just confirm what's known?
3. RECENCY: 2025-2026 preferred, 2024 acceptable, older needs citations
4. SPECIFICITY: Addresses a concrete question (vs. broad survey)

SCORE SCALE:
- 8-10: Novel finding, rigorous method, directly relevant to research focus
- 6-7: Solid contribution, relevant topic, worth tracking
- 4-5: Incremental, small sample, or tangentially relevant
- 1-3: Generic wellness, confirms known facts, or off-topic

REJECT (1-3): "meditation is good", "exercise helps", obvious conclusions, workshop papers without substance

Papers:
{paperSummaries}

For each paper, output a JSON array of objects:
[{"index": N, "score": 1-10, "reason": "brief quality assessment", "tags": ["tag1", "tag2"]}]

Threshold: score >= 6 to include. Return ONLY the JSON array, no other text.
```

**Pitfall:** LLM may return JSON with markdown fences. Parse with fence extraction + brace-match fallback.

### CRITICAL: Reasoning Model Token Budget

When using reasoning models (MiMo v2.5, DeepSeek R1, etc.), **reasoning tokens consume the output budget silently**. The model produces `reasoning_content` (invisible chain-of-thought) before writing the actual JSON to `content`. If `maxTokens` is too low, reasoning eats the entire budget → `content` is empty → JSON.parse fails.

**Evidence:** With `maxTokens: 2000` and 12 papers, MiMo v2.5 returned empty `content` because reasoning tokens consumed the full 2K budget. With `maxTokens: 30000`, the same call succeeds.

**Fix:** Set `maxTokens` to **10x** what you'd use for non-reasoning models. For 12 papers with abstracts: `maxTokens: 30000` (not 2000–3000).

**Model choice for JSON:** Prefer `deepseek-v4-flash` over MiMo v2.5 for structured output. DeepSeek puts JSON directly in `content` without reasoning overhead. MiMo v2.5 puts JSON in `reasoning_content` and returns empty `content` (handled by `llm.ts` lines 78-82).

### CRITICAL: No Heuristic Fallbacks in Scoring

When LLM ranking fails, **never** fall back to citation-count scoring. The pipeline should **fail cleanly** (throw, log error, add nothing).

**Why citation-count scoring is broken:**
1. Citation count ≠ topical relevance. A federated learning paper with 76 citations scores higher than a relevant paper with 5 citations.
2. Normalization in small pools is meaningless. A paper with 1 citation in a pool of 3 papers scores 1.0 (perfect) under min-max normalization.
3. The database silently fills with garbage. No error, no alert — just wrong papers with high scores.

**Rule:** Citation count is a pre-filter (reject old papers with < N citations), not a scoring mechanism. The LLM is the sole scorer.

## Verification Standard: 3 Consecutive Runs

A single successful run could be luck. **Three consecutive runs with different papers** proves the pipeline consistently finds relevant content. Each run should:
- Find 10+ candidates from search
- Pass quality filter (heuristic rejection)
- LLM ranks at least one paper ≥ 6
- Create a Notion page with adaptive analysis
- All three runs find DIFFERENT papers (dedup working)

If run 3 fails, the pipeline is not reliably improved — keep debugging. Show all three outputs as proof.

## Adaptive Analysis (replaces rigid 5-POV)

The old system forced every paper through a rigid 5-POV template (health/wealth/social/CBT/personal). This produced slop — every paper got the same perspectives regardless of relevance.

**New approach:** The LLM picks 2-3 perspectives that are genuinely relevant to the paper's actual content.

### Analysis Type (PovAnalysis)
```typescript
interface PovAnalysis {
  executive_summary: string;    // 2-3 sentences: what was found and why it matters
  why_it_matters: string;       // 1 sentence: connection to human-AI cognitive interaction
  perspectives: Array<{
    label: string;              // short perspective name
    emoji: string;              // relevant emoji
    insight: string;            // 2-3 specific sentences
    action: string;             // one concrete action, doable THIS WEEK
  }>;
  key_takeaway: string;         // 1 sentence: single most important thing
  verdict: string;              // "Act on this / Track it / Skip — with one sentence reason"
}
```

### Analysis Prompt Template
```
You are a research analyst creating a targeted analysis for someone researching AI cognition,
decision-making under uncertainty, and biometric-informed behavior change.

Paper: "{title}"
Authors: {authors} ({year})
Tags: {tags}

Abstract:
{abstract}

Create a SHORT, SHARP analysis. Rules:
- Pick ONLY 2-3 perspectives that are genuinely relevant to this specific paper
  (do NOT force all 5 — skip irrelevant ones)
- Each perspective must connect to the researcher's actual work: AI cognitive offloading,
  satisficing vs maximizing, HRV-biometric feedback loops, CBT frameworks, or decision
  quality under cognitive load
- NO generic health advice ("exercise more", "sleep better") — that's slop
- Be specific about WHAT changes in understanding or behavior
- The "action" must be something concrete this person could do THIS WEEK

Return a JSON object:
{
  "executive_summary": "...",
  "why_it_matters": "...",
  "perspectives": [
    {"label": "...", "emoji": "...", "insight": "...", "action": "..."}
  ],
  "key_takeaway": "...",
  "verdict": "..."
}
```

**System prompt:** `'You are a rigorous research analyst. Respond ONLY with valid JSON. No generic filler.'`

**Pitfall:** Raw abstract dumps are rejected by the user ("too crude", "cryptic"). The adaptive analysis is MANDATORY for every discovered paper.

**Pitfall:** If the LLM returns all 5 perspectives for every paper, the prompt isn't strong enough. Add: "If you include more than 3 perspectives, you're doing it wrong — pick the 2-3 that matter most."

## Notion Page Creation — Schema (Adaptive Format)

Two-step pattern (MANDATORY) with LAYERED content:

**Step 1 — Properties (POST /v1/pages):**
The `rational evidence` property is the TL;DR — what you see in database table views. Keep under 1900 chars. Format:
```
AUTO-DISCOVERED YYYY-MM-DD
Authors: [names]
Source: [URL]

[executive_summary]

Key: [key_takeaway]

Verdict: [verdict]

[label]: [insight]
Action: [action]

[label]: [insight]
Action: [action]
...
```

**Step 2 — Body blocks (PATCH /v1/blocks/{pageId}/children):**
The page body is the deep analysis — what you see when you open the page. NEVER repeat the evidence property content. Body structure (adaptive — only shows relevant perspectives):
```
📄 Summary — executive_summary + why_it_matters callout
🎯 Key Takeaway — key_takeaway callout
[relevant_perspective_emoji] [perspective_label] — insight paragraph + action callout
[relevant_perspective_emoji] [perspective_label] — insight paragraph + action callout
...
⚖️ Verdict — verdict callout
```

**CRITICAL: No redundancy between evidence property and page body.** The user explicitly rejected this: "what should you write, where, and why is the redundancy acting in the first place?" Evidence property summarizes; page body explains.

## Anti-Slop Pattern

When user says output is "slop" or "generic":

1. **Identify root causes**: Check topics, thresholds, templates, prompts
2. **Narrow scope**: Remove generic/wellness topics, focus on actual research edge
3. **Raise thresholds**: Increase score cutoffs to filter more aggressively
4. **Make templates adaptive**: Replace rigid templates with LLM-selected perspectives
5. **Tighten prompts**: Add explicit rejection criteria, call out slop by name

### Case Study: 2026-07-09 "slop for me" feedback

User said: "hey maybe this is helpful to my doctor friends but this is slop for me"

**Root causes:**
- DEFAULT_TOPICS included generic wellness ("meditation stress reduction", "sleep deprivation neurodegeneration")
- 5-POV template (health/wealth/social/CBT/personal) forced on every paper regardless of relevance
- Score threshold (≥ 5) let mediocre papers through
- Ranking prompt was too permissive

**Fixes applied:**
- Narrowed topics to AI cognition, satisficing, HRV biofeedback, cognitive debt
- Raised threshold from 5 to 7
- Replaced rigid 5-POV with adaptive 2-3 perspectives
- Added explicit "REJECT: generic wellness" to ranking prompt
- Added `why_it_matters` and `key_takeaway` fields

## Biometric Grounding (for relevant papers)

When a paper connects to biometrics (HRV, sleep, activity), the "Personal" perspective must use the user's ACTUAL data, not generic advice. Before generating the analysis:
1. Fetch real Oura data: HRV trend, sleep regularity, workout patterns, best/worst days
2. Connect paper findings to specific numbers: "Your regularity score is 41/100 — this paper says traits explain 42% of circadian variance"
3. Give actions grounded in the data: "Your OTF days show 7% lower HRV — cap heart rate zones on 2 of 3 sessions"

The GLM 5.2 subagent pattern (delegate analysis generation to a capable model with real data context) produces significantly better results than generating locally.

## Eval Harness Pattern

6 checks for the discovery pipeline:
1. Notion DB access (query with page_size=1)
2. ArXiv API returns valid XML entries
3. Semantic Scholar API returns valid JSON (skip on 429)
3b. Exa API returns research papers (skip if EXA_API_KEY not set)
4. Quality filter rejects known bad patterns
5. Dedup logic catches existing titles

Each test has 3 retries with 1.5s backoff. Semantic Scholar 429 → skip (non-blocking). Exa skip → non-blocking (only if API key missing).

## Cron Job Pattern

Two-phase cron job:
1. **DISCOVER** — `bun src/cli.ts discover --json` (finds + adds new paper)
2. **INGEST** — `bun src/cli.ts ingest --research-only` (re-indexes all entries)

Schedule: `0 */4 * * *` (every 4 hours). Report as watchdog log with ✅/⚠ status.

## Exa Search for Papers (New — 2026-07-09)

When building automated pipelines, use Exa with `category: "research paper"`. This is more reliable than arXiv/Semantic Scholar from cloud environments.

### Direct API (for TypeScript/Node code)

The Exa API is called directly with an API key — NOT via Composio (Composio is for agent-side MCP tools, not standalone scripts):

```typescript
const r = await fetch('https://api.exa.ai/search', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.EXA_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query,
    category: 'research paper',
    numResults: 5,
    startPublishedDate: '2024-01-01',
    contents: { highlights: { query: 'main findings methodology', maxCharacters: 500 } },
  }),
  signal: AbortSignal.timeout(15_000),
});
```

**Setup:** Add `EXA_API_KEY=<key>` to `/workspace/.env`. Get key from exa.ai (free tier available).

**Pitfall:** The Composio MCP tools (EXA_SEARCH, EXA_ANSWER, etc.) are for agent-side use only. TypeScript code running as standalone scripts cannot call Composio MCP tools — it must use the Exa REST API directly.

### Composio Pattern (for agent-side use)

When using Exa via Composio MCP tools (agent session, not standalone code):

```
EXA_SEARCH with:
  query: "cognitive offloading AI metacognition"
  category: "research paper"
  numResults: 10
  type: "fast" (450ms)
  contents: { highlights: { query: "key findings" } }
```

### YC Startups in Paper Discovery (2026)
- **Epsilon (YC W23)** — AI search engine for scientific research. epsilon-ai.com
- **AnswerThis (YC F25)** — Research services. answerthis.io
- **Thesis (YC F25)** — Research services. thesislabs.ai

### Other Notable Tools
- **Paper Espresso** — Open-source paper discovery/summarization platform
- **PaSa** — LLM Agent for comprehensive academic paper search
- **Paper Circle** — Open-source multi-agent research discovery framework
- **Undermind** — AI assistant for scientific literature

## Model Identifier Pitfall (2026-07-09)

**`glm-5.2` works. `z-ai/glm-5.2` does NOT.** The opencode-go provider rejects the prefixed form with "Model not supported". Always test model identifiers before deploying to production pipelines.

**Verification pattern:**
```typescript
const r = await chat({ system: "Reply OK", user: "ping", temperature: 0, maxTokens: 5, model: "glm-5.2" });
// If this throws, the model ID is wrong
```

When a cron job reports "same count every run":
- The pipeline reads + re-processes existing data but never creates new entries
- Check: does the pipeline call a "create page" or "insert" function?
- Check: is there a search/discovery step, or does it only query the existing DB?
- Fix: add active discovery phase before the re-index phase

## Data Integrity: Re-Scoring Existing Entries

When a scoring mechanism is fixed, re-score ALL existing entries to identify contamination:

1. **Group by topic** — papers are scored against a topic, not in isolation
2. **Run LLM scoring** on each topic's paper set
3. **Compare old vs new scores** — papers that scored high under the old mechanism but low under the new one are contamination
4. **Purge low-score papers** — delete from both Notion and Postgres

**Evidence:** Re-scoring 104 threads (25 unique paper sets) found 5 papers that scored high under citation-count heuristic but 0.1 under LLM. These were "Survey on Multi-Label Learning" (128 citations, irrelevant to drug discovery) and similar citation-bait.
