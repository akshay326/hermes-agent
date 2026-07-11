#!/usr/bin/env python3
"""Save arXiv papers to Readwise Reader with full content from ar5iv."""

import requests
import re
import json
import sys
import time

TOKEN = "X5qmejmGOFwJbkx7hv74M9cPCV6bfehu153stUaDEHCWCdzq8m"
HEADERS = {"Authorization": f"Token {TOKEN}", "Content-Type": "application/json"}


def fetch_arxiv_html(arxiv_id):
    """Fetch full paper HTML from ar5iv (renders arXiv papers as HTML)."""
    try:
        resp = requests.get(f"https://ar5iv.labs.arxiv.org/html/{arxiv_id}", timeout=30)
        if resp.status_code == 200 and len(resp.text) > 1000:
            html = re.sub(r'<script[^>]*>.*?</script>', '', resp.text, flags=re.DOTALL)
            html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
            return html[:500000]
    except Exception as e:
        print(f"  ar5iv error: {e}", file=sys.stderr)
    return None


def save_to_reader(url, html=None, title=None, tags=None, location="later"):
    """Save to Readwise Reader. Returns (status_code, response_dict)."""
    payload = {"url": url, "location": location}
    if html:
        payload["html"] = html
    if title:
        payload["title"] = title
    if tags:
        payload["tags"] = tags

    resp = requests.post(
        "https://readwise.io/api/v3/save/",
        headers=HEADERS, json=payload, timeout=60
    )
    return resp.status_code, resp.json()


def save_arxiv_paper(arxiv_id, tags=None):
    """Save an arXiv paper with full content to Readwise Reader."""
    print(f"Fetching {arxiv_id} from ar5iv...")
    html = fetch_arxiv_html(arxiv_id)
    url = f"https://arxiv.org/abs/{arxiv_id}"

    if html:
        word_count = len(re.sub(r'<[^>]+>', ' ', html).split())
        print(f"  Got {word_count} words from ar5iv")
    else:
        print(f"  ar5iv failed, saving with URL only (Reader will scrape)")

    status, resp = save_to_reader(url, html=html, tags=tags or ["ml-research"])
    print(f"  Reader API: HTTP {status}")
    if "url" in resp:
        print(f"  Link: {resp['url']}")
    return status, resp


def check_reader_exists(title_substring):
    """Check if a document with this title already exists in Reader."""
    resp = requests.get(
        "https://readwise.io/api/v3/list/?location=later",
        headers=HEADERS, timeout=30
    )
    if resp.status_code != 200:
        return False
    data = resp.json()
    for doc in data.get("results", []):
        title = (doc.get("title") or "").lower()
        if title_substring.lower() in title:
            return True
    return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 save_to_reader.py ARXIV_ID [tag1,tag2,...]")
        print("Example: python3 save_to_reader.py 1805.00899 ml-research,ai-safety")
        sys.exit(1)

    arxiv_id = sys.argv[1]
    tags = sys.argv[2].split(",") if len(sys.argv) > 2 else ["ml-research"]

    status, resp = save_arxiv_paper(arxiv_id, tags)
    print(json.dumps(resp, indent=2))
