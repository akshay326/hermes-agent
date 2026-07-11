# Readwise API Reference

Token: `X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m` (same token works for both APIs)

## TWO Separate APIs (Critical Distinction)

| API | Base URL | Purpose | Documents appear in |
|-----|----------|---------|-------------------|
| **Library API** | `readwise.io/api/v2/` | Highlights, books, export | Main Readwise library |
| **Reader API** | `readwise.io/api/v3/save/` | Save URLs for reading | Readwise Reader (`read.readwise.io/later`) |

**Pitfall:** `read.readwise.io` is the SPA frontend — returns HTML for every request. The actual Reader API is at `readwise.io/api/v3/save/`, NOT `read.readwise.io/api/save`.

## Reader API — Save URL to Reader

```bash
curl -s -X POST "https://readwise.io/api/v3/save/" \
  -H "Authorization: Token X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://arxiv.org/abs/1805.00899", "tags": ["ml-research"]}'
```

Response (201 Created):
```json
{"id": "01kx7ahtjpr4qnpws91r9v1tjc", "url": "https://read.readwise.io/read/01kx7ahtjpr4qnpws91r9v1tjc"}
```

Parameters: `url` (required), `tags` (list of strings), `title`, `author`, `html`, `location` (new/later/archive/feed), `category` (article/pdf/epub/tweet/video), `summary`, `notes`.

If no `html` provided, Reader scrapes the URL automatically.

Rate limit: 50/minute per token.

## Library API — Create Highlights

```bash
curl -s -X POST "https://readwise.io/api/v2/highlights/" \
  -H "Authorization: Token X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m" \
  -H "Content-Type: application/json" \
  -d '{"highlights": [{"text": "...", "title": "...", "author": "...", "source_url": "...", "tags": ["..."]}]}'
```

Body MUST use `"highlights"` wrapper array. Flat object → `"highlights key not provided"` error.

Creates documents with `source: "api_article"` — appear in library but NOT in Reader.

## Deleting

- Highlights: `DELETE /api/v2/highlights/{id}/` → 204
- Books: `DELETE /api/v2/books/{id}/` → 405 (not supported by API — must delete manually in UI)

## Listing

- `GET /api/v2/books?page_size=200` — list all books/documents
- `GET /api/v2/books?source=reader` — filter by Reader-imported docs
- `GET /api/v2/highlights?book_id={id}` — highlights for a specific book
- `GET /api/v2/export/` — full export of all highlights

## Reader API — List Documents

```bash
curl -s "https://readwise.io/api/v3/list/" \
  -H "Authorization: Token X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m"
```

## Pitfalls

1. **`read.readwise.io` is NOT the API** — it's the SPA. API is at `readwise.io/api/v3/save/`.
2. Flat body on v2 → "highlights key not provided"
3. Books cannot be deleted via API — only highlights
4. `source: "api_article"` (v2 highlights) ≠ `source: "reader"` (v3 save) — user sees Reader docs in the reading app, library docs in the main library
5. Autonomous agents may fabricate fake entries — always use real source URLs
6. Search by title before creating to avoid duplicates
