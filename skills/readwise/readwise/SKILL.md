---
name: readwise
description: "Readwise & Reader API: save documents to Reader for reading, query highlights, manage library. Single token auth."
version: 2.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos]
tags: [readwise, reader, highlights, annotations, productivity]
metadata:
  hermes:
    tags: [readwise, reader, highlights, annotations, productivity]
---

# Readwise & Reader API

Readwise stores highlights from books, articles, and tweets. Reader is the reading app that saves/surfaces content.

Use this skill for:
- Saving URLs/documents to Reader for reading and annotation
- Querying highlights and documents
- Managing tags, notes, and library organization
- Saving arXiv papers with full content to Reader

---

## Auth — SINGLE TOKEN

Readwise uses **one token** for both the library API and the Reader API. Get it from https://readwise.io/access_token.

```
Authorization: Token <READWISE_TOKEN>
```

Token location: `READWISE_TOKEN` in `~/.hermes/.env`.

Verify: `GET https://readwise.io/api/v2/auth` → 204 = valid.

---

## API Endpoints

### TWO different base URLs, same token:

1. **Library API** — `https://readwise.io/api/v2/` — highlights, books, library management
2. **Reader API** — `https://readwise.io/api/v3/save/` — save documents to Reader for reading

**CRITICAL:** The Reader API is at `readwise.io/api/v3/save/`, NOT `read.readwise.io`. The domain `read.readwise.io` is the Reader SPA frontend (serves HTML, not API responses). POST to `read.readwise.io` returns 405 because it's a single-page app, not an API server.

### Save to Reader (full documents)

```
POST https://readwise.io/api/v3/save/
Authorization: Token <READWISE_TOKEN>
Content-Type: application/json

{
  "url": "https://example.com/article",
  "html": "<html>...full content...</html>",
  "title": "Article Title",
  "tags": ["tag1", "tag2"],
  "location": "later"
}
```

**Parameters:**
- `url` (required): Document's unique URL. If you don't have one, use a made-up URL.
- `html` (optional): Full HTML content. If omitted, Reader scrapes the URL. **Always provide `html` for papers** — Reader can't scrape arXiv PDFs.
- `title` (optional): Overwrites scraped title.
- `tags` (optional): Array of strings.
- `location` (optional): `new`, `later`, `archive`, or `feed`. Default: `new`.
- `category` (optional): `article`, `email`, `rss`, `pdf`, `epub`, `tweet`, `video`. Default: guessed from URL.

**Response (201 Created or 200 if already exists):**
```json
{
  "id": "01kx7a...",
  "url": "https://read.readwise.io/read/01kx7a..."
}
```

### Save URL to Reader (no HTML — Reader scrapes)

```
POST https://readwise.io/api/v3/save/
Authorization: Token <READWISE_TOKEN>
Content-Type: application/json

{"url": "https://example.com/article"}
```

Works for standard web pages. **Does NOT work well for arXiv PDFs** — Reader gets only the abstract (~200 words).

### List Reader Documents

```
GET https://readwise.io/api/v3/list/
Authorization: Token <READWISE_TOKEN>
```

Returns documents with `id`, `url`, `title`, `location`, `word_count`, `tags`.

### List Books/Articles (Library API)

```
GET https://readwise.io/api/v2/books?page_size=10&category=articles
```

**Source field distinction:**
- `"source": "reader"` — saved to Reader (appears in `read.readwise.io/later`)
- `"source": "api_article"` — created via library API highlights (NOT in Reader)

### Create Highlight (Library API)

Creates library entries, NOT Reader documents.

```
POST https://readwise.io/api/v2/highlights
Authorization: Token <READWISE_TOKEN>
Content-Type: application/json

{
  "highlights": [{
    "text": "The highlighted text",
    "title": "Document Title",
    "author": "Author Name",
    "source_url": "https://arxiv.org/abs/XXXX.XXXXX",
    "tags": ["ml-research", "tag2"]
  }]
}
```

**Format:** Body must be `{"highlights": [...]}` (wrapped in `highlights` key). Flat objects return `"highlights key not provided"`.

**Limitation:** API does NOT support DELETE on books (returns 405). Only highlights can be deleted: `DELETE /api/v2/highlights/{id}/` → 204.

---

## Saving arXiv Papers to Reader (Full Content)

arXiv papers are PDFs — Reader can't scrape them. Use this workflow:

### Step 1: Fetch full paper HTML from ar5iv

ar5iv.labs.arxiv.org renders arXiv papers as HTML:

```bash
curl -s "https://ar5iv.labs.arxiv.org/html/1805.00899" | python3 -c "
import sys,re
html=sys.stdin.read()
html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.DOTALL)
html=re.sub(r'<style[^>]*>.*?</style>','',html,flags=re.DOTALL)
print(html[:500000])
"
```

If ar5iv returns 404 (paper too new), fall back to arxiv.org/abs page (abstract only ~200 words).

### Step 2: Save to Reader with HTML content

```bash
curl -s -X POST "https://readwise.io/api/v3/save/" \
  -H "Authorization: Token $READWISE_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"https://arxiv.org/abs/1805.00899\", \"html\": \"$HTML\", \"title\": \"Paper Title\", \"tags\": [\"ml-research\"]}"
```

**For batch saves, use a Python script** — HTML content is too large for inline shell:

```python
import requests, re, json, time

TOKEN = "..."
HEADERS = {"Authorization": f"Token {TOKEN}", "Content-Type": "application/json"}

def save_paper(arxiv_id, title, tags):
    resp = requests.get(f"https://ar5iv.labs.arxiv.org/html/{arxiv_id}", timeout=30)
    html = resp.text if resp.status_code == 200 and len(resp.text) > 1000 else None
    if not html:
        resp = requests.get(f"https://arxiv.org/abs/{arxiv_id}", timeout=30)
        html = resp.text
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
    r = requests.post("https://readwise.io/api/v3/save/",
        headers=HEADERS,
        json={"url": f"https://arxiv.org/abs/{arxiv_id}", "html": html[:500000],
              "title": title, "tags": tags, "location": "later"})
    return r.status_code, r.json()
```

---

## Pitfalls

- **Reader API endpoint is `readwise.io/api/v3/save/`**, NOT `read.readwise.io/api/save`. The `read.readwise.io` domain serves the SPA frontend, not API responses. POST to it returns 405.
- **Single token for both APIs.** The same `READWISE_TOKEN` works for both library (`/api/v2/`) and reader (`/api/v3/`). There is no separate "Reader access token."
- **arXiv papers need `html` parameter.** Reader can't scrape arXiv PDFs. Fetch HTML from `ar5iv.labs.arxiv.org/html/{id}` and pass it via `html`. Without it, Reader saves only the abstract (~200 words).
- **ar5iv may not have very new papers.** If ar5iv returns 404, the paper is too new. Fall back to abstract page or accept partial content.
- **API highlights ≠ Reader documents.** `POST /api/v2/highlights` creates library entries with `"source": "api_article"`. Use `/api/v3/save/` for Reader.
- **Create highlight format:** Body must be `{"highlights": [...]}` (wrapped array).
- **DELETE books not supported:** Only highlights can be deleted.
- **Token format**: `Token <value>` not `Bearer <value>`.
- **For batch operations:** Use a Python script, not inline shell — HTML is too large for CLI args.
- **Reader size limits:** HTML under 500KB. Truncate if necessary.
- **Rate limits**: Reader API 50/min. Library API 240/min (20/min for LIST).

---

## Attribution
- API docs: https://readwise.io/api_deets
- Reader API docs: https://readwise.io/reader_api
- ar5iv (HTML rendering of arXiv): https://ar5iv.labs.arxiv.org
- MCP server: https://mcp2.readwise.io/mcp
