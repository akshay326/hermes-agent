# Multi-Source Literature Review Pattern

Proven workflow for comprehensive peer-reviewed literature searches across 4+ subtopics. Tested across nutrition, health behavior, digital health, and wearable technology research sessions with 20+ papers compiled.

## Architecture — Two Primary Pipelines

### Pipeline A: Scholar-First (when terminal lacks python3/curl)
Best when: docker has no curl/python3, or when citation counts matter.

```
┌─────────────────────────────────────────────┐
│  Round 1: Composio Scholar (parallel)        │
│  - 4-8 COMPOSIO_SEARCH_SCHOLAR calls via     │
│    COMPOSIO_MULTI_EXECUTE_TOOL               │
│  - One per subtopic, focused queries         │
│  - Returns: title, authors, year, citations, │
│    snippet, source, link (NO DOIs)           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Round 2: Workbench extraction               │
│  - Parse /mnt/files/mex/*.json with Python   │
│  - Deduplicate by normalized title           │
│  - Filter by year range                      │
│  - Sort by citation count                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Round 3: DOI resolution via Web Search      │
│  - 4-5 parallel COMPOSIO_SEARCH_WEB calls    │
│  - Query: "Author YEAR title关键词 DOI"      │
│  - Extract DOI from citations[].url          │
│  - Batch: 5 papers per call, up to 3 batches │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Round 4: Compile to markdown                │
│  - Per-topic sections with paper entries      │
│  - Synthesis table at end                     │
│  - Full reference list with DOIs              │
└─────────────────────────────────────────────┘
```

### Pipeline B: PubMed-First (when terminal has python3/curl)
Best when: PubMed indexing matters (MeSH terms, structured abstracts, clinical trial data).

```
┌─────────────────────────────────────────────┐
│  Round 1: PubMed via COMPOSIO_REMOTE_WORKBENCH │
│  - 4-8 broad queries (one per subtopic)      │
│  - esearch → esummary in Python loops         │
│  - 1.0s sleep between esearch calls           │
│  - Collect PMIDs + DOIs                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Round 2: Web Search via COMPOSIO_MULTI      │
│  - 4 parallel COMPOSIO_SEARCH_WEB calls      │
│  - One per subtopic with broader queries      │
│  - Finds papers missed by PubMed syntax       │
│  - Surfaces DOIs from non-PubMed sources      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Round 3: DOI Resolution via Workbench       │
│  - Batch DOI → PMID lookup (esearch by DOI)  │
│  - 1.2s delay between requests               │
│  - esummary for full metadata                 │
│  - Abstracts via efetch (XML)                 │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Round 4: Gap-filling + Additional DOIs      │
│  - Targeted PubMed queries for missing areas  │
│  - Semantic Scholar for citation counts       │
│  - Additional DOI lookups from web results    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│  Round 5: Compile to markdown file           │
│  - Per-topic sections with paper entries      │
│  - Synthesis table at end                     │
│  - Full reference list with DOIs              │
└─────────────────────────────────────────────┘
```

## PubMed Query Patterns for Nutrition Research

### Protein intake + body composition
```
(protein intake OR high protein diet) AND (body composition OR lean mass OR muscle mass) AND (weight loss OR caloric restriction OR energy deficit) AND 2020:2026[dp]
```

### Rate of weight loss
```
(rate of weight loss OR weight loss speed) AND (muscle mass OR lean mass OR body composition) AND 2020:2026[dp]
```

### Protein supplementation vs whole food
```
(protein supplement OR whey protein) AND (whole food OR food-based) AND (body composition OR lean mass) AND 2020:2026[dp]
```

### Macronutrient distribution
```
(macronutrient distribution OR macronutrient ratio) AND (caloric restriction OR weight loss) AND (body composition) AND 2020:2026[dp]
```

### ISSN position stands
```
international society of sports nutrition AND (position stand) AND 2023:2026[dp]
```

### Systematic reviews / meta-analyses
```
(topic keywords) AND (systematic review OR meta-analysis[pt]) AND 2020:2026[dp]
```

## Web Search Queries (Composio)

Use broad, natural-language queries that complement PubMed's Boolean syntax:

- "optimal protein intake grams per kg fat loss preserve muscle mass caloric deficit 2023 2024 study"
- "rate of weight loss preserves muscle mass deficit percentage body fat study 2023 2024"
- "protein bar vs whole food protein body composition muscle study research 2023 2024"
- "macronutrient distribution cutting phase protein carb fat ratio body composition 2023 2024"

These surface papers that PubMed keyword searches miss, especially from non-MEDLINE journals.

## Key Pitfalls

1. **Composio MULTI_EXECUTE account parameter**: Never pass `account: null` — omit the field entirely. Causes validation error.
2. **Scholar doesn't return DOIs**: Always follow up with COMPOSIO_SEARCH_WEB for DOI resolution.
3. **PubMed 429 on batch DOI lookups**: Use 1.0-1.5s delay, not 0.35s. See main SKILL.md.
4. **Semantic Scholar year filter**: The `year=2020-2026` parameter sometimes returns 0 results. Remove it and filter manually, or rely on PubMed + web search instead.
5. **Workbench cell timeout**: Each cell has a 3-minute limit. Break large batch operations into multiple cells. Save intermediate results to `/tmp/` or `/mnt/files/` between cells.
6. **esearch vs esummary PMIDs**: esearch returns PMIDs that may not match expected papers if the query is too broad. Always verify titles match the topic before including.
7. **Web search DOIs**: Web search results may include DOIs from non-peer-reviewed sources (preprints, blog posts). Always verify DOIs resolve to PubMed-indexed papers.

## Domain-Specific Query Patterns

### Health Behavior / Wearable Technology
```
self-monitoring wearable feedback behavior change
HRV sleep activity predict behavior change wearable
digital nudge implementation intentions health
gamification intrinsic motivation health apps
```

### Nutrition / Supplements
```
(protein intake OR high protein diet) AND (body composition OR lean mass) AND 2020:2026[dp]
```

### Psychology / Behavior Change Theory
```
implementation intentions meta-analysis health behavior
self-determination theory gamification health app
nudge theory digital health intervention
```

### Digital Health / mHealth
```
mHealth app engagement retention behavior change
digital intervention physical activity systematic review
just-in-time adaptive intervention health behavior
```

## Output Format

Structure the final compilation as:

```markdown
# Research Compilation: [Topic]

## TOPIC 1: [Subtopic Name]

### 1.1 [Paper Title Shortened]
- **Title:** Full title
- **Authors:** Last1, Last2, Last3 et al.
- **Journal:** Full journal name
- **Year:** YYYY
- **DOI:** 10.xxxx/xxxxx
- **PMID:** XXXXXXXX
- **Key Findings:** 2-3 sentences on what the paper found
- **Relevance:** 1 sentence on why this paper matters to the user's question

[... repeat for each paper ...]

## SYNTHESIS TABLE

| Topic | Evidence Level | Key Recommendation | Source Quality |
|-------|---------------|-------------------|----------------|

## KEY REFERENCES (COMPLETE LIST)
1. Authors (Year) *Journal*. DOI: ...
```
