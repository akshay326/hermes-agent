---
name: academic-research
description: "Search, read, and synthesize peer-reviewed research across disciplines — Exa (synthesis + deep research), arXiv, PubMed/PMC, Semantic Scholar, Google Scholar. Includes web scraping fallbacks when browser tools fail. Also covers product/splement nutrition research: brand verification, ingredient-by-ingredient literature review, and daily consumption analysis."
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [research, academic, papers, PubMed, arxiv, semantic-scholar, nutrition, supplements, product-research]
    related_skills: [arxiv, productive-struggle]
---

# Academic Research — Cross-Discipline Paper Discovery & Reading

Find, read, and synthesize peer-reviewed papers across all academic disciplines. Combines arXiv (CS/physics/math), PubMed/PMC (biomedical/health), and Semantic Scholar (cross-discipline with citation data).

## Tool Priority

| Source | Best for | API key? | Rate limit |
|--------|----------|----------|------------|
| **Composio Exa** | Quick synthesis + deep async research + paper content | No | Varies by tool |
| **Composio Scholar** | Any discipline, Google Scholar results with citations | No | ~1-2 req/s |
| arXiv API | CS, physics, math, quantitative bio | No | ~1 req/3s |
| PubMed/PMC | Medicine, nutrition, neuroscience, psychology | No | 3 req/s (E-utilities) |
| Semantic Scholar | Cross-discipline, citations, recommendations | No (100/s with key) | 1 req/s |
| DuckDuckgo HTML | Fallback when browser fails, finding article URLs | No | Be polite |

**Exa and Scholar are both excellent first choices** — pick based on the task:
- **EXA_ANSWER** for quick "what does the research say?" with synthesized findings and citations (faster, returns a summary)
- **COMPOSIO_SEARCH_SCHOLAR** for structured paper discovery with citation counts (better for building a paper list, finding specific authors/years)
- Both work even when browser tools, curl, and python3 are unavailable, and both support parallel execution via `COMPOSIO_MULTI_EXECUTE_TOOL`.

## Composio Scholar API (Primary Tool When Available)

When browser and terminal tools are unavailable, `COMPOSIO_SEARCH_SCHOLAR` via `COMPOSIO_MULTI_EXECUTE_TOOL` is the go-to. It returns Google Scholar results with citation counts.

### Single Search
```
COMPOSIO_SEARCH_SCHOLAR with query="artificial sweeteners gut microbiome 2022 2024" start=0
```
Returns: `{articles: [{title, authors: [{name}], publication_year, source, link, citation_count, snippet}], total_results, pagination}`

### Parallel Searches (Recommended)
Use `COMPOSIO_MULTI_EXECUTE_TOOL` to run 5+ scholar searches simultaneously — one per subtopic:
```
tools: [
  {tool_slug: "COMPOSIO_SEARCH_SCHOLAR", arguments: {query: "QUERY_1", start: 0}},
  {tool_slug: "COMPOSIO_SEARCH_SCHOLAR", arguments: {query: "QUERY_2", start: 0}},
  ...
]
```
**Pitfall (account parameter):** When using `COMPOSIO_MULTI_EXECUTE_TOOL` for parallel scholar searches, **omit the `account` field entirely** — do NOT pass `account: null`. Passing null causes a validation error: "Expected string, received null at tools[0].account". Just omit it:
```python
# CORRECT
tools = [{"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "..."}}]

# WRONG — causes validation error
tools = [{"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "..."}, "account": None}]
```

**Pitfall:** Results are saved to a remote file (`/mnt/files/mex/*.json`) when the response is large. The inline `data_preview` is truncated. Use `COMPOSIO_REMOTE_WORKBENCH` with Python to extract full article lists from the saved file.

### Extracting Results from Remote File
```python
import json
file_data = json.load(open("/mnt/files/mex/farm.json"))
for i, label in enumerate(search_labels):
    articles = file_data['results'][i]['response']['data'].get('articles', [])
    for a in articles:
        authors = ", ".join([au['name'] for au in a.get('authors', []) if isinstance(au, dict)])
        print(f"{a['publication_year']}: {a['title']} ({authors}) - {a.get('source')}")
```

**Pitfall:** The `authors` array contains objects `{name, link}` — always extract `.name`. Some authors may have `{object}` as link (Google Scholar internal).

**Pitfall:** `citation_count` can be `null` for very new papers. Don't filter on it.

**Pitfall:** Web search may surface preprints, blog posts, and non-peer-reviewed sources alongside the real DOI. Always verify the DOI resolves to the correct paper by checking the title matches.

## Composio Exa API (Deep Research + Paper Content)

Exa is a distinct toolkit from Scholar — it provides **quick citation-backed answers** (EXA_ANSWER), **async deep research tasks** (EXA_CREATE_RESEARCH), and **paper content extraction** (EXA_GET_CONTENTS_ACTION). Best for when you need synthesized findings with citations, not just paper discovery.

### Recommended Workflow

**Step 1: Parallel EXA_ANSWER for multi-angle quick synthesis**
Run 2-3 EXA_ANSWER calls in parallel via COMPOSIO_MULTI_EXECUTE_TOOL, each with a different angle on the research question:
```python
tools = [
    {"tool_slug": "EXA_ANSWER", "arguments": {"query": "ANGLE_1 question", "model": "exa-pro"}},
    {"tool_slug": "EXA_ANSWER", "arguments": {"query": "ANGLE_2 question", "model": "exa-pro"}},
    {"tool_slug": "EXA_ANSWER", "arguments": {"query": "ANGLE_3 question", "model": "exa-pro"}},
]
```
Each returns `{answer: str, citations: [{title, url, author, publishedDate}]}`. Use `model: "exa-pro"` for broader results (uses two expanded queries internally).

**Step 2: EXA_CREATE_RESEARCH for deep async investigation**
When quick answers aren't enough, kick off a deep research task:
```python
tools = [{"tool_slug": "EXA_CREATE_RESEARCH", "arguments": {
    "instructions": "Detailed research prompt with 5 specific sub-questions...",
    "model": "exa-research-pro"
}}]
```
Returns `{researchId: str, status: "running"}`. **Must poll to completion.**

**Step 3: Poll with EXA_GET_RESEARCH**
```python
tools = [{"tool_slug": "EXA_GET_RESEARCH", "arguments": {"researchId": "THE_ID"}}]
```
Status stays `"running"` across many polls — only finalize when status is `"completed"` and `output.content` is present. The researchId must be persisted; recovery requires EXA_LIST_RESEARCH.

**Step 4: EXA_SEARCH for gap-filling with highlights**
Use `type: "deep-lite"` for a good speed/quality tradeoff:
```python
tools = [{"tool_slug": "EXA_SEARCH", "arguments": {
    "query": "specific gap-filling query",
    "type": "deep-lite",
    "numResults": 5,
    "contents": {"highlights": {"query": "key findings", "maxCharacters": 3000}, "summary": true}
}}]
```
Returns structured results with highlights (passage excerpts), summaries, and metadata per result. Excellent for getting quantitative findings from specific papers.

**Step 5: EXA_GET_CONTENTS_ACTION for paper deep-dives**
Fetch full content from specific paper URLs:
```python
tools = [{"tool_slug": "EXA_GET_CONTENTS_ACTION", "arguments": {
    "urls": ["https://specific-paper-url.com"],
    "highlights": {"query": "specific topic", "maxCharacters": 4000},
    "summary": true
}}]
```

**Pitfall (CRITICAL):** The parameter is `urls` (plural, array), NOT `url` (singular). Passing `url` gives: `"Invalid request data provided - Either 'urls' or 'ids' must be provided"`. Always use:
```python
# CORRECT
{"urls": ["https://example.com/paper"]}

# WRONG — causes 400 error
{"url": "https://example.com/paper"}
```

**Pitfall:** Results are saved to remote file when large. Use `COMPOSIO_REMOTE_WORKBENCH` with Python to extract full text from saved files:
```python
import json
data = json.load(open("/mnt/files/mex/sell.json"))
for i, result in enumerate(data['results']):
    paper = result['response']['data']['results'][0]
    print(paper.get('summary', ''))
    print(paper.get('highlights', []))
```

### Parallel Execution Pattern for Exa

All Exa tools can run in parallel via COMPOSIO_MULTI_EXECUTE_TOOL. Group by dependency:
- **Independent:** Multiple EXA_ANSWER, multiple EXA_SEARCH — all parallel
- **Dependent:** EXA_CREATE_RESEARCH → poll → EXA_GET_CONTENTS_ACTION — serial

**Pitfall (mixed tool types in one batch):** You can mix EXA tools with Scholar in a SINGLE `COMPOSIO_MULTI_EXECUTE_TOOL` call — they're all independent. This is faster than two separate batch calls. Example: `[EXA_SEARCH, EXA_SEARCH, EXA_ANSWER, COMPOSIO_SEARCH_SCHOLAR]` in one tools array. The only requirement is that none of the tools depend on each other's outputs.

### When to Use Exa vs Scholar

| Scenario | Use | Why |
|----------|-----|-----|
| Quick "what does research say about X?" | EXA_ANSWER | Returns synthesized answer + citations in one call |
| Deep async research across many sources | EXA_CREATE_RESEARCH | Explores web broadly, synthesizes findings |
| Need paper highlights/summaries | EXA_SEARCH with highlights | Returns passage excerpts without full fetch |
| Need full paper content | EXA_GET_CONTENTS_ACTION | Fetches text + summary from URLs |
| Need structured paper metadata | Scholar | Better for title/author/citation counting |
| Need PubMed-specific (MeSH, abstracts) | PubMed E-utilities | Structured biomedical data |

## OpenAlex API for DOI Resolution (Preferred Alternative)

When Semantic Scholar rate-limits (429 errors after 3-4 calls even with 1.5s delay), **use OpenAlex instead**. It's free, requires no API key, and tolerates ~2 req/s:

```python
import json, subprocess, time

# Single DOI lookup
query = "Karyotaki 2017 self-guided iCBT depression"
url = f"https://api.openalex.org/works?search={query.replace(' ', '+')}&per_page=1&select=title,doi,publication_year,authorships"
proc = subprocess.run(["curl", "-s", url], capture_output=True, text=True, timeout=10)
data = json.loads(proc.stdout)
r = data['results'][0]
doi = r['doi']  # Returns full URL: https://doi.org/10.1001/...
authors = [a['author']['display_name'] for a in r['authorships'][:4]]
```

**Pitfall:** OpenAlex search is fuzzy — it may return wrong papers for ambiguous queries. Always verify the returned title matches the target paper. Add author last name + year to narrow results.

**Pitfall:** OpenAlex `doi` field returns a full URL (`https://doi.org/10.xxxx/...`), not just the DOI string. Strip the prefix if you need the bare DOI.

**Proven batch pattern (28 papers, 0.5s delay):** OpenAlex handled 28 sequential lookups with `time.sleep(0.5)` without any 429 errors. This is ~3x faster than Semantic Scholar for batch DOI resolution.

## Multi-Round Scholar Search with Combining

For comprehensive literature reviews, run **multiple rounds** of parallel Scholar searches with different query variants, then combine and deduplicate:

```
Round 1: 5 parallel queries (broad coverage)
  → Extract articles, save to batch_1.json
Round 2: 5 parallel queries (different angles/gaps identified from Round 1)
  → Extract articles, save to batch_2.json
Combine: Load both files, deduplicate by normalized title, sort by citations
```

This yielded 99 unique articles from 10 queries in one session — far more than a single round of 5 queries (~50 articles).

**Deduplication pattern:**
```python
seen_titles = set()
for article in all_articles:
    title_norm = article['title'].lower().strip()
    if title_norm in seen_titles:
        continue
    seen_titles.add(title_norm)
    # ... process article
```

## Academic Publisher Accessibility (via COMPOSIO_SEARCH_FETCH_URL_CONTENT)

Not all publisher sites are fetchable. Tested patterns:

| Publisher | Accessible? | Notes |
|-----------|-------------|-------|
| JMIR (jmir.org, mhealth.jmir.org) | ✅ Yes | Full text + summary available |
| Frontiers (frontiersin.org) | ✅ Yes | Full text available |
| Springer/Nature | ✅ Yes | Abstract + summary available |
| Cambridge Core | ✅ Yes | Abstract available |
| PLOS ONE | ✅ Yes | Full text available |
| ACM Digital Library | ⚠️ Partial | Some pages fetch, some 403 |
| JAMA Network | ❌ 403 | Blocked |
| Wiley (onlinelibrary.wiley.com) | ❌ 403 | Blocked |
| APA PsycNET | ❌ 403 | Blocked |
| SAGE Journals | ❌ 504/timeout | Blocked |
| ScienceDirect | ❌ Varies | Sometimes works |

**Strategy:** When fetching paper content, try JMIR/Frontiers/Springer first. For blocked publishers, use web search snippets + Scholar abstracts as fallback.

## Pagination
Scholar returns ~10 results per page. Use `start` parameter (0, 10, 20...) for pagination. Stop when `total_results` is exhausted or results become irrelevant.

## Quick Start

```bash
# arXiv (CS/physics/math)
curl -s "https://export.arxiv.org/api/query?search_query=all:QUERY&max_results=5"

# PubMed via E-utilities — ALWAYS URL-encode parameters
# esearch: find PMIDs matching a query
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=QUERY&retmax=5&retmode=json&sort=date"

# esummary: fetch citation metadata (title, authors, journal, DOI) for PMIDs
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=12345,67890&retmode=json"

# efetch: fetch full abstracts/text (heavier, use for reading content)
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=12345&rettype=abstract&retmode=text"

# Semantic Scholar (cross-discipline, returns JSON)
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=QUERY&limit=5&fields=title,authors,year,citationCount"

# DuckDuckgo HTML fallback (when browser tools fail)
curl -sL "https://html.duckduckgo.com/html/?q=QUERY" -H "User-Agent: Mozilla/5.0" | grep -oP '<a[^>]*class="result__a"[^>]*>.*?</a>'
```

### PubMed via Python (workbench or terminal)

When using Python's `urllib` for PubMed E-utilities, **always URL-encode** parameters:

```python
import urllib.request, urllib.parse, json, time

def pubmed_search(term, retmax=10):
    params = urllib.parse.urlencode({
        'db': 'pubmed', 'term': term,
        'retmax': str(retmax), 'retmode': 'json', 'sort': 'date'
    })
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read().decode())
    return data.get('esearchresult', {}).get('idlist', [])

def pubmed_fetch(pmids):
    """Fetch title, authors, journal, DOI for a list of PMIDs."""
    if not pmids: return []
    params = urllib.parse.urlencode({
        'db': 'pubmed', 'id': ','.join(pmids), 'retmode': 'json'
    })
    url = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?{params}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=15)
    data = json.loads(resp.read().decode())
    results = []
    for pmid in pmids:
        info = data.get('result', {}).get(pmid, {})
        if info:
            doi = next((e['value'] for e in info.get('articleids', []) if e.get('idtype') == 'doi'), '')
            results.append({
                'pmid': pmid,
                'title': info.get('title', 'N/A'),
                'authors': ', '.join(a['name'] for a in info.get('authors', [])[:5]),
                'journal': info.get('fulljournalname', info.get('source', 'N/A')),
                'year': info.get('pubdate', 'N/A'),
                'doi': doi,
                'url': f'https://pubmed.ncbi.nlm.nih.gov/{pmid}/'
            })
    return results

# Usage pattern: search → sleep → fetch → sleep
pmids = pubmed_search("whey protein supplementation meta-analysis 2023:2026[dp]", retmax=8)
time.sleep(0.35)
papers = pubmed_fetch(pmids)
```

**Pitfall:** Building URLs by string concatenation (e.g., `f"...term={query}&..."`) will fail with `InvalidURL: URL can't contain control characters` when the query contains spaces. Always use `urllib.parse.urlencode()`.

**Pitfall:** PubMed date range filters use the format `YYYY:YYYY[dp]` appended to the search term, not as a separate parameter.

**Pitfall:** `esummary` returns structured JSON with `articleids` array — DOI is under `idtype == 'doi'`, not a top-level field.

## Reading Paper Content

### PMC articles (plain HTML, no browser needed)
```bash
curl -sL "https://pmc.ncbi.nlm.nih.gov/articles/PMC_ID/" -H "User-Agent: Mozilla/5.0" \
  | grep -i -A5 "abstract\|conclusion\|findings"
```

### arXiv papers
```bash
# Abstract page
curl -s "https://export.arxiv.org/api/query?id_list=ID" | python3 -c "import sys,xml.etree.ElementTree as ET; ..."

# Full paper (PDF → text)
pip install pymupdf && python3 -c "import fitz; print(fitz.open('paper.pdf')[0].get_text())"
```

## When Browser Tools Fail

If `browser_navigate` times out or Chromium is unavailable:

1. **Search**: curl + DuckDuckgo HTML scraping (see `references/web-scraping-fallbacks.md`)
2. **Read articles**: curl + direct PMC/arXiv HTML fetching
3. **Get metadata**: Semantic Scholar API (JSON, no browser needed)

## When Terminal Is Also Unavailable

If `terminal` commands fail (no curl/python3) AND browser tools are down:

1. **First choice: Composio Exa** — Use `COMPOSIO_MULTI_EXECUTE_TOOL` with `EXA_ANSWER` for quick synthesized findings, or `EXA_CREATE_RESEARCH` for deep investigation. Exa returns citation-backed answers without needing browser/terminal. See "Composio Exa API" section above.

2. **Second choice: Composio Scholar** — Use `COMPOSIO_MULTI_EXECUTE_TOOL` with `COMPOSIO_SEARCH_SCHOLAR` for parallel searches across subtopics. Returns structured paper lists with citation counts. See "Composio Scholar API" section above.

3. **Third choice: Workbench for PubMed** — The workbench sandbox has Python with `urllib` — enough for all E-utilities, arXiv API, and Semantic Scholar calls. Use when you need PubMed-specific structured data (MeSH terms, full abstracts). **This is the proven Python environment when the docker terminal lacks python3** — always try workbench first for Python-dependent research tasks.

```python
# PubMed E-utilities via workbench
import urllib.request, json
url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=sleep+regularity+cognition&retmax=5&retmode=json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read())
    ids = data["esearchresult"]["idlist"]

# Fetch abstracts (rate limit: 1.5s between calls)
import time
time.sleep(1.5)
url2 = f"https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id={','.join(ids)}&rettype=abstract&retmode=text"
```

**Pitfall:** PubMed rate-limits aggressively — insert `time.sleep(0.35)` between sequential calls when using E-utilities (3 req/s allowed). Semantic Scholar rate-limits are MORE aggressive than documented: `time.sleep(1.5)` between queries is NOT enough when doing 5+ sequential searches — expect 429 errors after ~3-4 calls. Use `time.sleep(2.0–3.0)` for Semantic Scholar, or batch queries into fewer calls. When running many parallel searches, batch IDs into single requests rather than one per PMID.

**Pitfall (batch DOI lookups):** When searching PubMed by DOI (`term=f'{doi}[doi]'`) in a loop — e.g., to resolve 10-20 DOIs discovered via web search — `time.sleep(0.35)` is NOT enough. You will hit 429 errors after ~5-8 requests. Use `time.sleep(1.0–1.5)` between each esearch call, and use a distinctive User-Agent header (e.g., `'HermesResearch/1.0 (research@example.com)'`) instead of the default. Batch the lookups across multiple workbench cells if >15 DOIs are needed. Alternatively, batch all PMIDs into a single `esummary` call (that endpoint tolerates larger batches) rather than fetching one at a time.

**Pitfall:** When using `COMPOSIO_REMOTE_WORKBENCH` for PubMed searches, run `esearch` and `esummary` as sequential steps within the same Python script (with `time.sleep(0.35)` between calls), not as separate workbench cells. The workbench has a 3-minute cell timeout — batch all related searches into one cell using loops.

## Synthesis Pattern

When the user asks "help me learn about X" or "what does the research say about Y":

1. **Don't dump a full answer first.** Follow productive-struggle Move 1-2.
2. Search across relevant databases (arXiv for CS, PubMed for health, Semantic Scholar for cross-discipline).
3. Present 2-3 key papers with one-paragraph framing each.
4. Ask: "Which angle do you want to go deeper on?"
5. Then synthesize — but still point to gaps in the evidence.

**User-context reframing (important):** After synthesizing the research, check if the user has revealed personal context (job situation, visa status, financial pressure, health condition, career goals). If so, produce a SECOND pass that reframes the same findings specifically for THEIR situation. The general synthesis is "what the research says." The reframed version is "what this means for you." The reframed section should reference specific numbers from the research but translate them into actionable advice for their context. This pattern was validated when a user researching WFH vs office productivity revealed they were an O-1 visa holder applying to YC startups — the reframed output (first-month in-person, hybrid negotiation tactics) was significantly more useful than the general synthesis alone.
4. **Persist findings** — when the user asks to save/write findings to Notion or another external system, follow the schema-first write pattern (see `external-system-hygiene` skill). Query the target DB schema first, understand property names and types, format values to match, then batch create entries.

### Output Format for Comprehensive Reviews

When producing a literature review (not just "find me a paper"), structure the output as:

1. **Per-topic sections** — Group papers by subtopic, not chronologically. Each section gets a numbered list of papers.
2. **Per-paper entry** — Include: Title, Authors, Journal, Year, Citations, Key Findings (2-3 sentences), Relevance (1 sentence connecting to user's question).
3. **Synthesis table** — At the end, include a summary table mapping ingredient/variable → evidence level → primary concern → severity. This makes the actionable insights immediately visible.
4. **File output** — Write the full compilation to a `.md` file so the user has a persistent reference. Don't just leave it in chat.

### Product/Supplement Research Workflow

When researching a consumer product (protein bar, supplement, food item):

1. **Brand verification FIRST** — Search with the exact specs the user provided. If they don't match the named brand, report the discrepancy and research the correct brand. This is a critical pitfall.
2. **Full nutrition extraction** — Get the complete nutrition label and ingredient list
3. **Categorize ingredients by research priority** — Protein sources → Sweeteners → Novel fats → Fiber additives → Skip common additives
4. **Per-ingredient literature search** — Use PubMed for health/safety studies, focus on 2020-2026 for recent evidence
5. **Daily consumption analysis** — Calculate totals for "X bars/day" scenarios, compare to protein needs (1.6-2.2g/kg), flag GI tolerance issues
6. **Structured output** — Nutrition Facts table → Ingredients → Protein Analysis → Sweetener Research → Health Considerations → Citations

See `references/product-nutrition-research.md` for detailed patterns, search queries, and pitfalls.

### Health Metric Optimization Workflow

When the user wants to improve a health metric (HRV, sleep, heart rate, stress, etc.) based on evidence:

**Step 1: Check Current Biometrics**
- Query Oura Ring data for the relevant metric(s) using `mcp_oura_ring_*` tools
- Establish personal baseline BEFORE comparing to population norms
- Check data quality (adherence, missing data, sensor issues)
- Look for patterns (day-of-week, correlations with other metrics)

**Key principle:** Individual variation can reach 260,000% for some metrics. Population norms may not apply. Always ask: "Is this a change from YOUR baseline, or has it always been this way?"

**Step 2: Research Evidence**
Use the parallel search patterns above (EXA_SEARCH with 4+ queries covering different angles). Focus on:
- Mechanistic studies (how does X affect Y?)
- Dose/timing studies (what's the optimal protocol?)
- Meta-analyses (what's the consensus?)

**Step 3: Append to Research Database**
Add key papers to Notion research-db with:
- Multi-POV analysis in page body (not just abstract dump)
- Concise TL;DR in `rational evidence` property
- Source URL in `source_transcript`
- Appropriate tags (sleep, HRV, Health, RCT, meta-analysis, etc.)

**Step 4: Synthesize & Recommend**
- Do the math (pharmacokinetics, clearance times, dose-response)
- Connect research to user's specific situation and constraints
- Present: evidence chain → personal implication → concrete recommendation

**Step 5: Create Calendar Events**
Use Composio Google Calendar tools to add concrete events:
- Habit events (recurring, with research rationale in description)
- Reminder/cutoff events (behavioral cues)
- Include the "why" in the event description for future reference

**Step 6: Set Up Verification**
- Enable tracking in Oura (tags, manual entries)
- Propose a measurement timeline (2-4 weeks for meaningful data)
- Use `mcp_oura_ring_compare_conditions` to verify effect post-implementation

**Pitfalls:**
- **Comparing individual data to population norms:** Always check personal baseline first. A "low" HRV might be someone's stable constitutional baseline, not a problem.
- **Single-dose vs. spread-out intake:** Pharmacokinetic studies often test single large doses. Real-world intake is spread out. The LAST dose is the critical variable.
- **Ignoring individual variation:** CYP1A2 genotype (for caffeine) can make half-life range from 1.5 to 9.5 hours. Conservative cutoffs account for slow metabolizers.
- **Forgetting to track:** Research is useless without verification. Always set up tracking (Oura tags, manual logs) to confirm the intervention works.

See `references/health-habit-optimization.md` for the caffeine/HRV research example and pharmacokinetics reference.

### Multi-Round Search Strategy (for comprehensive literature reviews)

When the user wants a thorough review across a topic (not just "find me a paper"):

1. **Round 1 — Broad web searches** (8-10 parallel queries): Cast a wide net across different angles of the topic. Use `web_search` or Composio web search to get overviews, identify key themes, and surface frequently-cited papers. These queries should cover different sub-topics, populations, and outcome types.

2. **Round 2 — PubMed API for citation details**: Take the most promising PMIDs or search terms from Round 1 and run targeted PubMed E-utilities searches. Use `esearch` → `esummary` to get structured citation metadata (title, authors, journal, DOI, URL). Group searches by sub-topic category for organized output.

3. **Round 3 — Gap-filling searches**: Identify what's missing from Round 2 (e.g., specific dosage studies, safety data, specific populations) and run additional targeted queries.

4. **Round 4 — Compile and organize**: Structure findings by topic/theme, not chronologically. Include a summary table at the end mapping evidence quality to conclusions.

**Pitfall:** PubMed search syntax uses field tags like `[dp]` for date, `[Journal]` for journal name. Combine with boolean: `"whey protein" AND "meta-analysis" AND 2023:2026[dp]`. Date ranges go at the end of the query term.

## Cross-Discipline Search Strategy

Different databases cover different fields. A nutrition + cognition question needs PubMed. A machine learning question needs arXiv. A question about citations/impact needs Semantic Scholar.

| Topic domain | Primary source | Secondary |
|-------------|---------------|-----------|
| AI/ML, CS, physics, math | arXiv | Semantic Scholar |
| Medicine, nutrition, neuroscience | PubMed/PMC | Semantic Scholar |
| Psychology, education | PubMed/PMC | Semantic Scholar |
| Cross-discipline, citation analysis | Semantic Scholar | — |
| Finding article URLs when browser fails | DuckDuckgo HTML | curl + direct URLs |

## Automated Research Discovery Pipelines

When building a system that automatically finds and adds new papers to a database (e.g., a cron job that discovers research), use this pattern:

### Pipeline: Search → Filter → Dedup → Rank → Insert

1. **Search** — Use Exa (`category: "research paper"`) as primary. ArXiv as fallback (add retry with exponential backoff — it times out from cloud servers). Semantic Scholar as supplementary (rate-limits aggressively, use OpenAlex for batch DOI resolution). **Always prioritize sharp, hand-crafted DEFAULT_TOPICS over auto-derived DB tags** — generic tags like "Health" produce nothing relevant.

2. **Quality filter** — Reject papers with these title/abstract signals:
   - `preliminary`, `short paper`, `workshop paper`, `demo paper`, `extended abstract`
   - Abstract < 100 chars (placeholder/missing)
   - Semantic Scholar: require citation count thresholds by age (yearDiff > 1 → 5+ citations, yearDiff > 2 → 20+ citations)

3. **Dedup** — Check against existing DB entries by:
   - Exact title match (normalized lowercase)
   - Substring containment (either direction)
   - Token overlap ratio > 70% (Jaccard similarity)

4. **LLM rank** — Use `glm-5.2` (not `z-ai/glm-5.2` — prefix breaks API). **Be calibrated, not pessimistic**: allow arXiv preprints, score relevance to ANY focus area (not ALL), give recency bonus. Score ≥ 6 to pass. See `references/research-discovery-pipeline.md` for the full ranking prompt template.

5. **Generate adaptive analysis** — Before inserting, use the LLM to generate a targeted analysis. This is MANDATORY — raw abstract dumps are unacceptable. The analysis picks **2-3 perspectives** that are genuinely relevant to the paper (do NOT force all 5 — skip irrelevant ones). Each perspective must connect to the researcher's actual work: AI cognitive offloading, satisficing vs maximizing, HRV-biometric feedback loops, CBT frameworks, or decision quality under cognitive load. NO generic health advice — that's slop. Actions must be concrete and doable THIS WEEK.

6. **Insert** — Two-step Notion page creation with LAYERED content (no redundancy):
   - **Step 1 (properties):** POST `/v1/pages` with title, year, tags, **concise TL;DR in `rational evidence`** (one-line per POV + action, under 1900 chars), source URL in `source_transcript`
   - **Step 2 (body blocks):** PATCH `/v1/blocks/{pageId}/children` with **deep analysis** — NOT a repeat of the evidence property. Body should contain: Paper Overview (methodology, sample size, key metrics), The Key Finding (core result with numbers), Your Data Against This Framework (real Oura/HRV numbers grounded in the paper's findings), CBT Chain (trigger→thought→emotion→behavior→result), Implementation (specific actions with numbers), Bottom Line. Use `appendBlocks()` from `notion-writer.ts`.

   **The evidence property and page body must serve DIFFERENT purposes.** Evidence = what to do (TL;DR for table views). Page body = why and how (deep analysis when you open the page). Copying the same content into both was explicitly rejected by the user: "what should you write, where, and why is the redundancy acting in the first place?"

### Diagnosing Broken Pipelines — Layer-by-Layer

When a pipeline "stops finding papers," check in this order:

**Layer 1: Search API health** — Is the API reachable? Rate-limited? Response format changed? (arXiv times out from cloud = network issue, not code bug. Semantic Scholar 429 = quota exhausted.)

**Layer 2: Config & credentials** — API keys set in `.env`? Model identifier correct? (`glm-5.2` works, `z-ai/glm-5.2` doesn't.) Environment variables propagated to cron context?

**Layer 3: Search quality** — 0 candidates = search source is bottleneck. 10+ candidates but all fail ranking = LLM/prompt is bottleneck. Candidates pass ranking but analysis fails = LLM call is bottleneck.

**Layer 4: LLM scoring variance** — Smaller models score inconsistently. Run 3+ times to confirm. If consistently too strict: relax prompt, lower threshold, or switch models.

**Rule:** Add diagnostic logging at each layer boundary BEFORE proposing fixes. "arXiv times out" and "LLM scores everything low" require different fixes.

### Pitfall: Thin Entries (No Analysis)

**Never create a research-db entry with only title + abstract dump.** The user explicitly rejected this: "this is too crude, i cant see how its direct helpful to me, a bit cryptic." Every entry MUST have a multi-POV analysis (see Pipeline step 5) written to the page body. The abstract goes in the paper summary; the analysis goes in the page body with actionable takeaways per perspective.

### Pitfall: Reasoning Model Token Budget (CRITICAL)

When using reasoning models (MiMo v2.5, DeepSeek R1, etc.) with `response_format: { type: 'json_object' }`, **reasoning tokens consume the output budget silently**. The model thinks in `reasoning_content` (invisible chain-of-thought), then writes the actual JSON to `content`. If `maxTokens` is too low, reasoning eats the entire budget → `content` is empty → JSON.parse fails → silent fallback to heuristic scoring.

**Symptoms:** LLM ranking returns empty string or truncated JSON. Catch block fires. Pipeline falls back to citation-count heuristic. Papers with high citations but zero topical relevance enter the database.

**Fix:** Set `maxTokens` to **10x** what you'd use for non-reasoning models. For 12 papers with abstracts, use `maxTokens: 30000` (not 2000–3000). The reasoning tokens are invisible but real.

**Model choice:** For structured JSON output, prefer `deepseek-v4-flash` over MiMo v2.5. DeepSeek outputs JSON directly in `content` without reasoning overhead. MiMo v2.5 puts JSON in `reasoning_content` and returns empty `content`, requiring special handling in `llm.ts` (lines 78-82 extract from `reasoning_content` when `content` is empty).

### Pitfall: Heuristic Fallbacks Corrupt Data Silently

When LLM ranking fails, a citation-count heuristic (`score = 3 + Math.floor(citationCount / 10)`) silently assigns scores. This is worse than no score because:

1. **Citation count ≠ topical relevance.** A federated learning paper with 76 citations scores higher than a relevant paper with 5 citations.
2. **Normalization in small pools is meaningless.** A paper with 1 citation in a pool of 3 papers scores 1.0 (perfect) under min-max normalization.
3. **The database silently fills with garbage.** No error, no alert — just wrong papers with high scores.

**Rule:** Never use citation count as a scoring heuristic. Use it only as a pre-filter (reject papers with < N citations for their age). The LLM must be the sole scorer. If the LLM fails, the pipeline should **fail cleanly** (throw, log error, add nothing) rather than fall back to a broken heuristic.

### Diagnosing "Same Output" Cron Jobs

When a cron job reports the same count every run (e.g., "18 entries indexed" every 4 hours), the pipeline is likely a **passive re-indexer** — it re-processes existing data without discovering new items. Check:
- Does the pipeline **create** new entries in the target DB, or only **read + re-embed** existing ones?
- Is there a search/discovery step, or does it only query the existing DB?
- The fix is usually adding an active discovery phase (search external sources → filter → insert) before the re-index phase.

### Verification: Proof, Not Predictions

After implementing a fix to the pipeline, **run the actual code and show the real output**. The user explicitly rejected predictions: "no prediction, gimme proof."

**Pattern:**
1. Implement the fix
2. Run the pipeline (or a targeted test)
3. Show the actual output (copy-paste the console/JSON, not a summary)
4. If it works, say "done" — no explanation needed
5. If it fails, show the failure output and continue debugging

**Anti-pattern:** "This should fix the issue because reasoning tokens consume budget..." → user: "ahahah fucker no prediction, gimme proof"

**What counts as proof:** Actual console output showing the LLM returned valid JSON, scores were assigned, papers were ranked. Not "the logic looks correct." Not "this should work." The output itself.

See `references/web-scraping-fallbacks.md` for DuckDuckgo and PMC scraping patterns.
See `references/composio-scholar-patterns.md` for Composio Scholar API response structure, parallel execution, and remote file extraction patterns.
See `references/pubmed-eutilities-patterns.md` for battle-tested PubMed API patterns, URL encoding pitfalls, and the multi-category search template.
See `references/product-nutrition-research.md` for product/ingredient research workflow: brand verification, nutrition fact extraction, per-ingredient literature search, daily consumption analysis, and structured output format.
See `references/wearable-biometric-behavior-change-literature.md` for curated literature on wearable biometrics, self-monitoring feedback loops, digital nudges, and gamification in health apps (2018-2026, 15 papers with DOIs).
See `references/cbt-digital-intervention-literature.md` for curated literature on CBT-based digital health interventions: self-guided efficacy, cognitive model evidence, failure modes, intervention timing, and wearable+CBT integration (2018-2026, 40 papers with DOIs).
See `references/research-discovery-pipeline.md` for implementation patterns: ArXiv XML parsing, Semantic Scholar rate limits, quality filtering heuristics, title dedup, LLM ranking, Notion page creation schema, and cron job architecture for automated paper discovery.
