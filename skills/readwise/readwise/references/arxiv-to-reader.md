# arXiv → Readwise Reader Pipeline

## Problem
arXiv papers are PDFs. Readwise Reader can't scrape PDFs — it only gets the abstract (~200 words).

## Solution
ar5iv.labs.arxiv.org renders arXiv papers as full HTML. Fetch from ar5iv, send to Reader API via `html` parameter.

## Pipeline

### 1. Check if ar5iv has the paper
```bash
curl -s -o /dev/null -w "%{http_code}" "https://ar5iv.labs.arxiv.org/html/1805.00899"
# 200 = exists, 404 = too new
```

### 2. Fetch and clean HTML
```python
import requests, re

def fetch_arxiv_html(arxiv_id):
    """Fetch full paper HTML from ar5iv, clean for Reader."""
    resp = requests.get(f"https://ar5iv.labs.arxiv.org/html/{arxiv_id}", timeout=30)
    if resp.status_code != 200 or len(resp.text) < 1000:
        return None  # Paper not on ar5iv
    html = resp.text
    html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
    return html[:500000]  # Reader has size limits
```

### 3. Save to Reader
```python
def save_to_reader(html, arxiv_id, title, tags):
    """Save paper to Readwise Reader with full content."""
    resp = requests.post(
        "https://readwise.io/api/v3/save/",
        headers={"Authorization": f"Token {TOKEN}", "Content-Type": "application/json"},
        json={
            "url": f"https://arxiv.org/abs/{arxiv_id}",
            "html": html,
            "title": title,
            "tags": tags,
            "location": "later"
        },
        timeout=60
    )
    return resp.status_code, resp.json()
```

### 4. Verify
```python
# Check the saved document has real content
resp = requests.get("https://readwise.io/api/v3/list/",
    headers={"Authorization": f"Token {TOKEN}"})
for doc in resp.json().get("results", []):
    if doc.get("word_count", 0) > 1000:
        print(f"✅ {doc['title']}: {doc['word_count']} words")
    else:
        print(f"⚠️ {doc['title']}: only {doc.get('word_count', 0)} words")
```

## Known Limitations

- **Very new papers** (last few weeks) may not be on ar5iv yet. Fall back to abstract.
- **Some papers** have formatting issues on ar5iv (equations, figures). The text content is usually fine.
- **Size limit**: Reader API accepts up to ~500KB of HTML. Longer papers may need truncation.
- **Duplicate entries**: If you save the same URL twice, Reader returns 200 (not 201) and updates the existing entry.

## Verified Paper IDs (2026-07-11)

| Paper | arXiv ID | ar5iv? | Words |
|-------|----------|--------|-------|
| AI Safety via Debate | 1805.00899 | ✅ | 15,329 |
| SPIN: Self-Play Fine-Tuning | 2401.01335 | ✅ | 20,600 |
| Generativism | 2606.12441 | ❌ (too new) | 687 (abstract only) |
| Cognitive Framework for LLM Learning | 2506.13464 | ✅ | 20,826 |
