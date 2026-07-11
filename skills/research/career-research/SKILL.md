---
name: career-research
description: "Programmatic job market research — analyze company hiring patterns, map roles against user skills, identify skill gaps and career on-ramps. Uses Greenhouse API for companies on that platform."
version: 1.0
author: Hermes
tags: [career, job-market, hiring, skills-gap, greenhouse]
---

# Career Research

Programmatic analysis of company hiring to answer: "What are they hiring for, and where do I fit?"

## Core Technique: Greenhouse API

Most tech companies use Greenhouse for their job boards. The API is public and requires no auth.

### Step 1: Fetch all roles

```bash
curl -sL "https://boards-api.greenhouse.io/v1/boards/{company_slug}/jobs" | python3 -m json.tool
```

Company slugs are the subdomain: `anthropic`, `openai`, `google`, `meta`, `stripe`, etc. (not all use Greenhouse — check the URL pattern on their careers page first).

**Output shape:**
```json
{
  "jobs": [
    {
      "id": 123456,
      "title": "Machine Learning Engineer",
      "absolute_url": "https://job-boards.greenhouse.io/{company}/jobs/123456",
      "location": {"name": "San Francisco, CA"},
      "departments": [{"name": "Research"}],
      "metadata": [{"name": "Location Type", "value": "On-Site"}]
    }
  ],
  "meta": {"total": 389}
}
```

### Step 2: Categorize and filter

Group roles by department, team, or keyword patterns. Common categories for AI companies:

| Category | Keywords in title |
|----------|-------------------|
| Research | research, scientist |
| ML Training | machine learning, pretraining, post-training, reinforcement learning, alignment, fine-tuning |
| Infrastructure | software engineer, inference, data center, compute, TPU, kernel |
| Safety | safety, safeguard, compliance, security, red team |
| Applied/Product | architect, product manager, developer relations |
| Business | account executive, sales, partnerships, finance |

### Step 3: Pull specific JDs

```bash
curl -sL "https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{job_id}" | python3 -c "
import json, sys, re
data = json.load(sys.stdin)
text = re.sub(r'<[^>]+>', '\\n', data.get('content', ''))
text = re.sub(r'\\n{3,}', '\\n\\n', text)
print(data.get('title', ''))
print(text[:3000])
"
```

### Step 4: Map against user skills

For each relevant role, extract:
1. **Key responsibilities** — what they'd actually do day-to-day
2. **Required qualifications** — hard gates (degree, years, specific tools)
3. **Nice-to-haves** — what separates good from great
4. **Skill gap analysis** — compare against user's stated background

## Presentation Pattern

When presenting results to the user:
- **Group by fit level** (🟢 close / 🟡 build skills needed / 🔴 major pivot)
- **Be specific about gaps** — don't say "needs more experience," say "needs PyTorch training runs at scale"
- **Identify on-ramps** — fellowships, internships, adjacent roles that build toward the target
- **Apply productive-struggle** — map the landscape, then ask what the user has already tried before suggesting a learning plan

## Pitfalls

- **Not all companies use Greenhouse.** Check the careers page URL first. Some use Lever, Workday, Ashby, or custom solutions. The API pattern differs per platform.
- **Greenhouse API has no rate limits** on the public boards endpoint, but don't hammer it — single request returns all jobs.
- **Job descriptions are HTML.** Strip tags before analysis. The regex approach above works but won't handle all edge cases.
- **Roles get posted and removed frequently.** Snapshot matters — note the date when presenting results.
- **Job titles are inconsistent across companies.** "Research Engineer" at Anthropic ≠ "Research Engineer" at Google. Always read the JD, not just the title.

## Creating Notion Pages (common follow-up)

Users often ask for a Notion page with the roadmap. Use the block API for rich formatting:

```bash
# 1. Find parent page via search
curl -s -X POST "https://api.notion.com/v1/search" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"query": "vault-name", "filter": {"value": "page", "property": "object"}}'

# 2. Create page with children blocks (callouts, toggles, lists)
curl -s -X POST "https://api.notion.com/v1/pages" \
  -H "Authorization: Bearer $NOTION_TOKEN" \
  -H "Notion-Version: 2022-06-28" \
  -H "Content-Type: application/json" \
  -d '{"parent":{"page_id":"..."},"properties":{"title":[{"text":{"content":"Title"}}]},"icon":{"emoji":"🎯"},"children":[...]}'
```

**Rich blocks:** `callout` (highlighted boxes), `heading_N` with `"is_toggleable": true` (collapsible sections), `bulleted_list_item` / `numbered_list_item` with inline links via `"href"`, `divider`.

**Pitfall:** Some Notion integrations use older API versions. If `2025-09-03` returns errors, fall back to `2022-06-28`.

## Non-Greenhouse Alternatives

For companies not on Greenhouse:
- **Lever:** `https://api.lever.co/v0/postings/{company}?mode=json`
- **Ashby:** Check for `/api/...` endpoints on careers page
- **Workday:** Heavily JS-rendered, usually needs browser tools
- **Custom:** May need web scraping
