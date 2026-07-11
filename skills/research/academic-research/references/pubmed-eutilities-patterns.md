# PubMed E-utilities — Battle-Tested Patterns

## Common Pitfalls

### 1. URL Encoding (Critical)
**NEVER** build E-utilities URLs by string concatenation with unencoded spaces.
```python
# WRONG — will raise InvalidURL: URL can't contain control characters
url = f"...term={query}&retmax=5..."  # query has spaces!

# RIGHT — always use urlencode
params = urllib.parse.urlencode({'db': 'pubmed', 'term': query, ...})
url = f"...{params}"
```

### 2. Date Range Filters
Date ranges go inside the search term string, not as separate parameters:
```
"whey protein" AND 2023:2026[dp]
```
Field tags: `[dp]` = date of publication, `[Journal]` = journal name, `[tiab]` = title/abstract.

### 3. esummary DOI Extraction
`esummary` returns `articleids` as an array of dicts. DOI is NOT a top-level field:
```python
doi = next((e['value'] for e in info.get('articleids', []) if e.get('idtype') == 'doi'), '')
```

### 4. esearch vs esummary vs efetch
- `esearch` → returns list of PMIDs matching query (lightweight, fast)
- `esummary` → returns structured metadata (title, authors, journal, DOI) for PMIDs (preferred for citation gathering)
- `efetch` → returns full text/abstract (heavy, use when you need to read paper content)

## Rate Limits
- E-utilities: 3 requests/second without API key, 10/second with key
- Safe sleep between calls: `time.sleep(0.35)` for non-key usage
- Batch PMIDs into single requests (comma-separated, up to 200 per call)

## Multi-Category Search Template

For systematic searches across multiple sub-topics:

```python
searches = {
    "category_name": "search terms AND 2022:2026[dp]",
    ...
}

for key, query in searches.items():
    pmids = pubmed_search(query, retmax=8)
    time.sleep(0.35)
    papers = pubmed_fetch(pmids)
    time.sleep(0.35)
    # process papers[key] = papers
```

## Output Format Template

For structured citation output:
```
**Study N: [Short Title]**
- **Authors:** First Author, Second Author, ... et al.
- **Journal:** Full Journal Name
- **Year:** YYYY Mon
- **DOI:** 10.xxxx/xxxxx
- **PMID:** NNNNNNN | [PubMed](https://pubmed.ncbi.nlm.nih.gov/NNNNNNN/)
- **Key Findings:** One-paragraph summary of main results and implications.
```

## Parallel vs Sequential Execution

- Web searches (via Composio or web_search): can run 8-10 in parallel via ThreadPoolExecutor
- PubMed E-utilities: must serialize calls with sleep(0.35) between them
- Within a single workbench cell: batch all searches in a loop (not separate cells)
