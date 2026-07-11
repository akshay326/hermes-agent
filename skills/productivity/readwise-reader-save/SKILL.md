---
name: readwise-reader-save
description: "Save papers/articles to Readwise Reader with full content. Use when adding research to the reading queue — fetches full text from ar5iv for arXiv papers, or scrapes URLs for web articles."
version: 1.0.0
author: Hermes
license: MIT
metadata:
  hermes:
    tags: [readwise, research, reading, papers]
---

# Save to Readwise Reader

Save papers and articles to Readwise Reader with full content for reading.

## API Details

- **Token**: `X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m`
- **Save endpoint**: `POST https://readwise.io/api/v3/save/`
- **List endpoint**: `GET https://readwise.io/api/v3/list/`
- **NO DELETE support** — must remove manually in Reader UI

### Save Request Format

```bash
curl -s -X POST "https://readwise.io/api/v3/save/" \
  -H "Authorization: Token X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://arxiv.org/abs/XXXX.XXXXX",
    "html": "<full HTML content>",
    "title": "Paper Title",
    "tags": ["ml-research", "relevant-tag"],
    "location": "later"
  }'
```

Returns: `{"id": "...", "url": "https://read.readwise.io/read/..."}`

### Key Parameters

| Param | Required | Description |
|-------|----------|-------------|
| url | YES | Document URL (used as unique key — same URL = update, not duplicate) |
| html | NO | Full HTML content. If omitted, Reader scrapes the URL (unreliable for PDFs) |
| title | NO | Override title |
| tags | NO | List of tag strings |
| location | NO | `new`, `later`, `archive`, `feed` (default: `new`) |

## Fetching Full Paper Content

**For arXiv papers**, use ar5iv (renders arXiv papers as HTML):

```bash
# Fetch full paper HTML from ar5iv
html=$(curl -s "https://ar5iv.labs.arxiv.org/html/ARXIV_ID" | python3 -c "
import sys,re
html=sys.stdin.read()
html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.DOTALL)
html=re.sub(r'<style[^>]*>.*?</style>','',html,flags=re.DOTALL)
print(html[:500000])
")
```

If ar5iv returns 404 or < 1000 chars, fall back to scraping the arXiv abstract page.

**For web articles**, the Reader API can scrape URLs directly — just pass the URL without `html`.

## Deduplication

The Reader uses URL as unique key. Saving the same URL again returns HTTP 200 (not 201) and updates the existing entry. No duplicates created.

## Python Script (bulk save)

```python
import requests, re, json, time

TOKEN = "X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m"
HEADERS = {"Authorization": f"Token {TOKEN}", "Content-Type": "application/json"}

def fetch_arxiv_html(arxiv_id):
    """Fetch full paper from ar5iv"""
    resp = requests.get(f"https://ar5iv.labs.arxiv.org/html/{arxiv_id}", timeout=30)
    if resp.status_code == 200 and len(resp.text) > 1000:
        html = re.sub(r'<script[^>]*>.*?</script>', '', resp.text, flags=re.DOTALL)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
        return html[:500000]
    return None

def save_to_reader(url, html=None, title=None, tags=None, location="later"):
    """Save to Readwise Reader"""
    payload = {"url": url, "location": location}
    if html: payload["html"] = html
    if title: payload["title"] = title
    if tags: payload["tags"] = tags
    
    resp = requests.post("https://readwise.io/api/v3/save/", 
                        headers=HEADERS, json=payload, timeout=60)
    return resp.status_code, resp.json()

def save_arxiv_paper(arxiv_id, tags=None):
    """Save an arXiv paper with full content"""
    html = fetch_arxiv_html(arxiv_id)
    url = f"https://arxiv.org/abs/{arxiv_id}"
    status, resp = save_to_reader(url, html=html, tags=tags or ["ml-research"])
    return status, resp
```

## Pitfalls

- **Don't use `read.readwise.io` for API calls** — that's the SPA frontend. API is at `readwise.io/api/v3/save/`
- **arXiv PDFs can't be scraped** — always use ar5iv for full content, or pass HTML directly
- **No DELETE via API** — must remove junk entries manually in Reader UI
- **Rate limit**: 50 saves/minute per token
- **URL is the dedup key** — same URL = update, not create
