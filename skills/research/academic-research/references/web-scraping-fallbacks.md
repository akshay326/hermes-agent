# Web Scraping Fallbacks for Academic Research

When browser tools (`browser_navigate`, `browser_snapshot`) are unavailable or timing out, use curl-based approaches.

## DuckDuckgo HTML Search

DuckDuckgo serves a lightweight HTML page that can be scraped with curl + grep.

```bash
curl -sL "https://html.duckduckgo.com/html/?q=QUERY+HERE" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
  | grep -oP '<a[^>]*class="result__a"[^>]*>.*?</a>'
```

Returns anchor tags with `uddg=` encoded URLs. The actual URL is URL-encoded after `uddg=`.

**To decode the URL:**
```bash
# Extract and decode the URL from a result link
echo "URL_ENCODED_PART" | python3 -c "import sys,urllib.parse; print(urllib.parse.unquote(sys.stdin.read().strip()))"
```

**For multi-line extraction with titles:**
```bash
curl -sL "https://html.duckduckgo.com/html/?q=QUERY" \
  -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36" \
  | python3 -c "
import sys, re, urllib.parse
html = sys.stdin.read()
links = re.findall(r'<a[^>]*class=\"result__a\"[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>', html)
for href, title in links:
    url = urllib.parse.unquote(href.split('uddg=')[-1].split('&')[0])
    title = re.sub('<[^>]+>', '', title)
    print(f'{title}\n  {url}\n')
"
```

## PubMed Central (PMC) Article Fetching

PMC articles are plain HTML. No browser needed.

### Get abstract + conclusions
```bash
curl -sL "https://pmc.ncbi.nlm.nih.gov/articles/PMC_ID/" -H "User-Agent: Mozilla/5.0" \
  | grep -i -A5 "abstract\|conclusion\|findings\|background"
```

### Get full structured content
```bash
curl -sL "https://pmc.ncbi.nlm.nih.gov/articles/PMC_ID/" -H "User-Agent: Mozilla/5.0" \
  | python3 -c "
import sys, re
html = sys.stdin.read()
# Extract abstract
abstract = re.search(r'<section class=\"abstract\".*?>(.*?)</section>', html, re.DOTALL)
if abstract:
    text = re.sub(r'<[^>]+>', '', abstract.group(1))
    print('ABSTRACT:', text[:500])
# Extract keywords
kw = re.search(r'kwd-group.*?>(.*?)</section>', html, re.DOTALL)
if kw:
    text = re.sub(r'<[^>]+>', '', kw.group(1))
    print('KEYWORDS:', text)
"
```

### PubMed E-utilities (structured search)
```bash
# Search for articles
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=dairy+cognitive+decline&retmax=5&retmode=json"

# Fetch abstracts by ID
curl -s "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=12345678&rettype=abstract&retmode=text"
```

## Semantic Scholar (JSON API)

Best for cross-discipline search with citation counts. Returns clean JSON.

```bash
# Search
curl -s "https://api.semanticscholar.org/graph/v1/paper/search?query=QUERY&limit=5&fields=title,authors,year,citationCount,externalIds" | python3 -m json.tool

# Get citations OF a paper
curl -s "https://api.semanticscholar.org/graph/v1/paper/PMID:12345678/citations?fields=title,year,citationCount&limit=10"

# Get references FROM a paper
curl -s "https://api.semanticscholar.org/graph/v1/paper/PMID:12345678/references?fields=title,year,citationCount&limit=10"
```

## Gotchas

- **Google blocks curl**: Google search returns JS challenges. Use DuckDuckgo HTML instead.
- **PMC rate limits**: Be polite — 3 req/sec max via E-utilities, ~1 req/3s for HTML scraping.
- **Semantic Scholar 429**: Aggressive rate limiting. Wait 5+ seconds between calls if you get 429.
- **DuckDuckgo HTML**: The `uddg=` parameter contains the actual URL, URL-encoded. Decode it before following.
- **PMC article IDs**: Format is `PMC1234567` (with PMC prefix) or just the number depending on context.
