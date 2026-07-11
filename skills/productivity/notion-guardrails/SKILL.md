---
name: notion-guardrails
description: "Strict guardrails for Notion — prevents duplicate databases, enforces existing structure, requires approval for new content."
version: 1.0.0
author: hermes-agent
license: MIT
platforms: [linux, macos, windows]
tags: [notion, guardrails, data-integrity, productivity]
metadata:
  hermes:
    tags: [notion, guardrails, data-integrity]
    created_by: agent
---

# Notion Guardrails

**Zero tolerance for duplicate databases or unapproved structure changes.**

## Canonical Database Inventory

Every Notion write operation MUST check this list first. If a database exists, USE IT — never create a new one.

| Database | ID (no dashes) | Parent Page ID | Properties |
|---|---|---|---|
| **research-db** | `38910db41d138008a491d8091db7914e` | `38910db41d1380e6bed0cc41924914ba` | lesson (title), Tags (multi_select), Year (number), rational evidence (rich_text), source_transcript (rich_text) |
| **Questions** | `39010db41d138163a252f09442c4b256` | `39010db41d13816bb47cd7c434969d61` | Question (title), Date (date), Highlight Text (rich_text), Source (select: Readwise, Notion Comment), Tags (multi_select), URL (url) |
| **prompts** | `38f10db41d138162b083e9ab3676604c` | `38910db41d13819c8c98f0305f79b493` | Name (title), Active (checkbox), System Prompt (rich_text), Time Window (select), Trigger (rich_text) |
| **diary-db/thoughts-db** | `5f77be0fdea643b7930f18a561c4ff95` | `38910db41d1380e6bed0cc41924914ba` | Name (title) — title IS the date; independent thoughts |
| **LLM Training Todo** | `178f1a8909e84ec8810d4e2350d96d33` | `39010db41d138143bcc0f6fd30b91e46` | Name (title), Status (select), Priority (select), Deadline (date), Tags (multi_select) |
| **Chronology** | `39910db41d1381899acbcec6f60c16cf` | `38910db41d1380e6bed0cc41924914ba` | Event (title), Date (date), Source (select: Readwise/Notion/Manual), Tags (multi_select), URL (url), Summary (rich_text) |

**Duplicate LLM Training Todo databases exist** (IDs: `5272460c...`, `bdc2da9f...`, `0b1b9d1f...`). Ignore these — they are test artifacts.

## Programmatic Enforcement

### Layer 1: Guardrail Proxy (100% enforcement)

An HTTP proxy intercepts ALL Notion API calls at the network level. The agent cannot bypass it.

**Start proxy:** `bun scripts/notion-proxy.js` (runs on port 3099)
**Use wrapper:** `bun scripts/guardrail-notion.js <command> [options]`

The wrapper auto-starts the proxy if not running.

```bash
# Search (safe, read-only)
bun scripts/guardrail-notion.js search "questions"

# Create page in existing database (safe, passes guardrail)
bun scripts/guardrail-notion.js create-page --database 39010db4-... --props '{"Question":{"title":[{"text":{"content":"my question"}}]},"Source":{"select":{"name":"Notion Comment"}}}'

# Create database (BLOCKED if duplicate exists)
bun scripts/guardrail-notion.js create-db --title "Questions" --parent 39010db4-...
# → Returns 409 with guardrail_duplicate_blocked

# List canonical databases
bun scripts/guardrail-notion.js inventory
```

**Proxy endpoints:**
- `http://localhost:3099/_guardrail/health` — health check
- `http://localhost:3099/_guardrail/inventory` — canonical database list
- `http://localhost:3099/v1/*` — proxied Notion API (all guardrailed)

### Layer 2: Pre-check script (backup)

```bash
bun scripts/notion_guardrail.js check "questions"
bun scripts/notion_guardrail.js validate-create "my new db"
bun scripts/notion_guardrail.js list
```

Exit codes: 0=PASS, 1=BLOCK, 2=ERROR

## Mandatory Pre-Write Checklist

Before ANY Notion write operation (create page, create database, append blocks):

### Step 1: SEARCH first
```
NOTION_SEARCH_NOTION_PAGE with filter_value="database", query="<relevant keyword>"
```
If a matching database exists → use it. STOP. Do not create anything new.

### Step 2: If no match found
```
NOTION_SEARCH_NOTION_PAGE with filter_value="database", query=""
```
Scan ALL databases. Check if any existing database can serve the purpose.

### Step 3: If still no match — ASK THE USER
Before creating ANY new database or page:
- Tell the user: "No existing database matches. I found these: [list]. Should I create a new one, or add to an existing one?"
- Wait for explicit approval.
- NEVER silently create a new database.

### Step 4: When creating new content
- New pages go INTO existing databases (use `parent.database_id`).
- New standalone databases require explicit user approval AND get added to this inventory.
- Never create inline databases unless the user explicitly requests it.

## Hard Rules

1. **NEVER create a database without user approval.** Always search first, present options, wait for confirmation.
2. **NEVER create duplicate databases for the same purpose.** If "questions" exists, add to it — don't create "Questions DB" or "question bank".
3. **NEVER archive or modify database structure without user approval.**
4. **ALWAYS use the exact database ID from this inventory.** Never guess or fabricate IDs.
5. **When in doubt, ASK.** Better to ask and be told "just create it" than to silently duplicate.

## Querying Existing Databases

```bash
# Search by keyword
NOTION_SEARCH_NOTION_PAGE with query="questions", filter_value="database"

# Browse all databases
NOTION_FETCH_DATA with fetch_type="databases"

# Query rows in a database
NOTION_QUERY_DATABASE with database_id="<id from inventory>"

# Create a page IN a database (not a new database)
NOTION_CREATE_DATABASE_ROW with database_id="<id>", properties={...}
```

## Overlap Note

This skill overlaps with the bundled `notion` skill (which covers general Notion API usage). This skill is the **guardrails-specific** subset: canonical inventory, duplicate prevention, and enforcement. The `notion` skill covers the broader API surface (property types, Workers, markdown endpoints). When both are loaded, this skill's inventory and hard rules take precedence for write operations.

## Pitfalls

1. **Soft vs hard guardrails.** A SKILL.md with rules is a SOFT guardrail — it relies on the agent choosing to follow it. Under context compression or in different sessions, it can be skipped. For true enforcement, use the proxy (Layer 1). The user explicitly challenged "is this 100% provably enforceable?" — the answer must be a programmatic mechanism, not policy text.

2. **Notion API filter value.** As of API version `2025-09-03`, search/filter endpoints use `data_source` NOT `database` as the filter value. Using `"database"` returns `400 validation_error`. The proxy and scripts use the correct value.

3. **Bun runtime.** The proxy runs under Bun. `expandTilde` does not exist in `node:os`. Use `process.env.HOME` + string concat for home directory paths. `import.meta.dir` gives the script's directory — count `..` carefully for parent paths.

4. **Proxy log directory.** LOG_DIR resolves relative to `import.meta.dir`. If the script is at `/workspace/scripts/`, `join(import.meta.dir, "..", "logs")` = `/workspace/logs/` (correct). An extra `..` would hit `/logs/` (permission denied). Always verify the resolved path.

5. **Composio tools bypass proxy.** The Composio MCP tools (`NOTION_SEARCH_NOTION_PAGE`, etc.) call Notion directly from Composio's servers — they do NOT go through the local proxy. For true 100% enforcement, the agent must use `bun scripts/guardrail-notion.js` instead of Composio for Notion writes.

## Vault Auditing: Discovering Inventory & Identifying Pruning Opportunities

When the user says "my Notion has too many pages" or "help me prune/survey/reconcile my vault," use this workflow.

### Step 1: Discover all databases
```
NOTION_SEARCH_NOTION_PAGE with filter_value="database", query="", page_size=100
```
Extract: id, title, last_edited_time. Note duplicates (same title, different IDs).

### Step 2: Discover all pages (paginate)
```
NOTION_SEARCH_NOTION_PAGE with filter_value="page", query="", page_size=100
```
Loop with `start_cursor=next_cursor` until `has_more=false`. Group by `parent.database_id` to understand which databases hold the most content.

### Step 3: Categorize content
For each page, extract the title and classify:
- **Domain-relevant**: belongs to the user's core topic (e.g., LLM training)
- **Cross-domain**: health/medical papers in a research DB that also holds LLM content
- **Orphaned**: standalone pages not in any database
- **Duplicate**: near-identical content across databases

### Step 4: Read key pages
Use `NOTION_GET_PAGE_MARKDOWN` on the most important pages to understand actual content (not just titles). Titles can be misleading — especially for Readwise-sourced pages where the title is a truncated highlight.

### Step 5: Present findings
Show the user:
1. Database count with duplicate flags
2. Pages per database (sorted by count)
3. Domain breakdown (how many LLM vs health vs misc)
4. Specific pruning recommendations (which duplicates to merge, which misplaced pages to move)

**Framing insight**: Pruning IS a Kolmogorov complexity experiment — removing duplicates and irrelevant content reveals the minimum description length of the knowledge base. This reframing helps the user see pruning as intellectual work, not janitorial.

See `references/vault-audit-notion-2026-07-10.md` for a concrete audit example (9 databases, 100+ pages, 4 duplicates found).

## Recovery: If a Duplicate Was Created

If you discover a duplicate database was created:
1. Tell the user immediately.
2. Ask if they want to merge content into the canonical database and archive the duplicate.
3. Never silently delete — always confirm.
