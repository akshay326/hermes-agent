# Readwise API v2 — Direct Access via Bun

Token: `/workspace/.env` → `READWISE_TOKEN`
Auth header: `Authorization: Token <token>`
Base URL: `https://readwise.io/api/v2/`

## Key Endpoints

### Search Documents (books/articles/tweets)
```bash
source /workspace/.env && bun -e '
const t = process.env.READWISE_TOKEN;
const r = await fetch("https://readwise.io/api/v2/books/?search=QUERY&num_results=20", {
  headers: { "Authorization": "Token " + t }
});
const d = await r.json();
for (const b of d.results) {
  console.log(b.id, "|", b.title, "|", b.author, "|", b.num_highlights, "highlights");
}
'
```

Returns: `id`, `title`, `author`, `category` (articles/tweets/books), `num_highlights`, `source_url`, `tags`.

### Get Highlights for a Document
```bash
source /workspace/.env && bun -e '
const t = process.env.READWISE_TOKEN;
const r = await fetch("https://readwise.io/api/v2/highlights/?book_id=BOOK_ID&num_results=50", {
  headers: { "Authorization": "Token " + t }
});
const d = await r.json();
for (const h of d.results) {
  console.log("---");
  console.log("Text:", h.text?.substring(0, 120));
  console.log("Note:", h.note?.substring(0, 200));
}
'
```

Returns: `id`, `text` (highlighted passage), `note` (user's annotation), `highlighted_at`, `book_id`, `tags`.

### Pagination
- `books/`: `?page=2` via `next` field in response
- `highlights/`: `?page=2` via `next` field
- `count` field shows total results

## Use Cases
- **Learning assessment**: Read user's highlights on a topic → identify knowledge gaps → quiz on gaps
- **Content synthesis**: Aggregate highlights across multiple articles on a theme
- **Review tracking**: Find recently highlighted articles to follow up on

## Pitfalls
- `num_results` defaults to 20 for books, 20 for highlights — bump to 50+ for large collections
- Highlight `text` can be an image URL (`![](...)`) — check for markdown image syntax
- `note` field is the user's annotation (their thinking), `text` is the highlighted passage
- Token format is `Token <value>`, NOT `Bearer <value>`
