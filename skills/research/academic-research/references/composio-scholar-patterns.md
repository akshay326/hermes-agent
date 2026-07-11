# Composio Scholar API — Reference Patterns

## Response Structure

```json
{
  "data": {
    "articles": [
      {
        "title": "Paper Title",
        "authors": [{"name": "Author Name", "link": "https://..."}],
        "publication_year": "2024",
        "source": "journal or publisher",
        "link": "https://...",
        "pdf_link": "https://..." or null,
        "citation_count": 42,
        "snippet": "Google Scholar excerpt..."
      }
    ],
    "serpapi_pagination": {
      "current": 1,
      "next": "url for next page"
    },
    "total_results": 1220
  }
}
```

## Key Behaviors

- Returns ~10 results per page
- `citation_count` can be `null` for very new papers
- `authors` array contains `{name, link}` objects — always extract `.name`
- `snippet` is a Google Scholar search excerpt, NOT a full abstract
- `source` field contains the journal/publisher name (e.g., "Cell", "Nature Medicine", "mdpi.com")
- `pdf_link` is often null even when PDFs exist

## Parallel Execution Pattern

```python
# Via COMPOSIO_MULTI_EXECUTE_TOOL — run 5 searches simultaneously
tools = [
    {"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "QUERY_1", "start": 0}},
    {"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "QUERY_2", "start": 0}},
    {"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "QUERY_3", "start": 0}},
    {"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "QUERY_4", "start": 0}},
    {"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "QUERY_5", "start": 0}},
]
# Results saved to /mnt/files/mex/*.json when large
```

## Remote File Extraction

When responses are large, results save to `/mnt/files/mex/*.json`. Extract with:

```python
import json
file_data = json.load(open("/mnt/files/mex/farm.json"))
for i, label in enumerate(search_labels):
    articles = file_data['results'][i]['response']['data'].get('articles', [])
    for a in articles:
        authors = ", ".join([au['name'] for au in a.get('authors', []) if isinstance(au, dict)])
        print(f"{a.get('publication_year')}: {a.get('title')} ({authors})")
```

**Pitfall:** The `structure_info` and `data_preview` in the inline response are truncated. Always parse the full remote file for complete data.

## Search Query Tips

- Include year ranges in queries: `"artificial sweeteners 2022 2024"`
- Use specific terms over broad ones: `"erythritol cardiovascular" > "sweetener health"`
- For systematic reviews, add method terms: `"meta-analysis"`, `"systematic review"`, `"randomized controlled trial"`
- Scholar handles natural language queries well — no need for boolean syntax

## DOI Resolution Pattern

Composio Scholar does NOT return DOIs. For comprehensive literature reviews, follow up with `COMPOSIO_SEARCH_WEB` to resolve DOIs for each key paper:

```python
# Run 5 parallel web searches for DOIs
tools = [
    {"tool_slug": "COMPOSIO_SEARCH_WEB", "arguments": {"query": "AuthorLastName YEAR 'paper title关键词' DOI"}},
    {"tool_slug": "COMPOSIO_SEARCH_WEB", "arguments": {"query": "AuthorLastName YEAR 'paper title关键词' DOI"}},
    # ... up to 5 per batch
]
```

The web search returns `citations[].url` which often contains DOI links (doi.org/...). Extract the DOI from the answer text or citation URLs. This is more reliable than trying to construct DOI lookups via PubMed.

**Pitfall:** Web search may surface preprints, blog posts, and non-peer-reviewed sources alongside the real DOI. Always verify the DOI resolves to the correct paper by checking the title matches.

## Pagination

```python
# Fetch page 2 of results
{"tool_slug": "COMPOSIO_SEARCH_SCHOLAR", "arguments": {"query": "QUERY", "start": 10}}
# start=20 for page 3, etc.
```
