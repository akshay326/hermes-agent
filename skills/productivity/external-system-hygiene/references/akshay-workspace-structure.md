# Akshay's Notion Workspace Structure

**Last verified:** 2026-07-02

## Top-Level Pages

| Page | ID | Purpose |
|---|---|---|
| llm-wiki | 38910db4-1d13-819c-8c98-f0305f79b493 | Main wiki — WRITE HERE ONLY |
| LLM Training Fundamentals | 39110db4-1d13-812c-8cca-d0018fa07560 | Learning roadmap |
| research-db | 38910db4-1d13-808d-8e74-000b9378dce8 | Research papers |
| diary-db | c5c5c1e6-2201-4b87-933c-45e5de8e6911 | Personal diary |
| prompts | 38f10db4-1d13-81af-94de-000babaf8b17 | Prompt templates |

## LLM Wiki Children (38910db4-1d13-819c-8c98-f0305f79b493)

- Readwise Vault
- Open Problems in Convexity & Optimization
- Satisficing AI candidates
- prompts (child_database)
- question-db (child_page)

## LLM Wiki (alternate page) — 39010db4-1d13-8143-bcc0-f6fd30b91e46

- Trace Review pages (auto-generated)
- LLM Training Todo (inline database, ID: 178f1a89-09e8-4ec8-810d-4e2350d96d33)
  - Schema: Name (title), Priority (select), Status (select), Tags (multi-select), Deadline (date)
  - Data source ID: 21cc29e9-a38d-4b72-9837-5adaeec44375

## DO NOT CREATE

- Standalone "LLM Training Todo" database (was rogue duplicate, user caught this)
- Any database outside the documented hierarchy
- Anything named similarly to existing resources
- Any database that duplicates an existing one's function

## Integration Token

- **Primary location (Hermes docker):** `/workspace/.env` — vars: `NOTION_TOKEN`, `NOTION_RESEARCH_DB_ID`
- **Legacy location:** `/home/ubuntu/akshay-projects/evobot/.env` as `NOTION_TOKEN`
- Env var name: `NOTION_TOKEN` (not `NOTION_API_KEY`)
- Token format: `ntn_...` prefix
- Access pattern: `source /workspace/.env && bun -e '...'` (bun has fetch(), curl/python3 may not be available)
