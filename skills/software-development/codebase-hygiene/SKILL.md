---
name: codebase-hygiene
description: "Keep code pure logic. Instructions live in external systems (Notion), not in code. Clean git state on every thread close."
version: 1.0.0
author: Hermes Agent
license: MIT
tags: [git, workflow, notion, cleanup, code-quality]
---

# Codebase Hygiene

User preference (durable): **Code = pure logic. Instructions = Notion.**

The agent has a tendency to embed plans, research findings, templates, and behavioral rules directly in code files (AGENTS.md, comments, markdown). This bloats the codebase and makes code hard to read for someone who doesn't read code.

## Core Rules

### 1. Instructions belong in Notion, not in code

- CBT rules, research templates, intervention protocols → Notion pages
- Behavioral guidelines the user needs to read/comment on → Notion
- Operational logic (architecture, deployment, session model) → stays in code
- If it's an instruction the user should see and iterate on, it goes to Notion

**Test:** Can the user read this in Notion and leave comments? If yes, it belongs there, not in code.

### 2. Code files contain only what's needed to run

- No embedded plans or TODOs in production code
- No research findings in code comments
- No templates in code (templates go to Notion or `references/` in skills)
- AGENTS.md stays slim: architecture + key files + session model + deployment

### 3. Delete, don't archive

- Stale plans, research markdowns, one-off documents → delete directly
- If content was moved to Notion, the local file is redundant — remove it
- Only archive if the content has NO external backup and might be needed later
- User preference: clean filesystem over safe filesystem

## Thread-Close Workflow

When closing a thread or ending a coding session:

### Step 1: Check for uncommitted changes
```bash
cd /workspace && git status --short
```
If clean, skip to step 4.

### Step 2: Stage all changes
```bash
cd /workspace && git add -A
```

### Step 3: Commit with context
```bash
cd /workspace && git commit -m "thread: <descriptive-summary>"
```
Use the thread name or topic as the summary. Keep under 72 chars.

### Step 4: Run linter (if configured)
```bash
cd /workspace && bun run lint 2>/dev/null || echo "No lint script configured"
```

### Step 5: Report status
- Files changed (count)
- Commit SHA (short)
- Any lint errors/warnings
- Confirmation: "Thread closed. Workspace clean."

### Step 6: Push (always, not optional)

Push to remote automatically. Don't ask — just do it.

**If git is available:**
```bash
cd /workspace && git push origin master
```

**If git is NOT available (Docker container, no binary):**
Use GitHub API via Composio `GITHUB_COMMIT_MULTIPLE_FILES`:
1. `GITHUB_GET_A_BRANCH` → get current HEAD SHA
2. Read modified files from filesystem
3. `GITHUB_COMMIT_MULTIPLE_FILES` → commit directly to remote
4. Report: commit SHA, files changed

The user expects full automation. Never hand off "go commit this" as a task.

## Pitfalls

- **Don't embed research in code comments** — the user doesn't read code, they read Notion
- **Don't create plans in `.hermes/plans/`** — those accumulate and become stale
- **Don't leave uncommitted work when closing threads** — use the thread-close workflow
- **Don't overstuff AGENTS.md** — keep it to architecture and operational logic only
- **Never force-push** — just commit locally
- **Don't delete untracked files without checking** — verify they're not needed before removing
- **Don't hand off tasks to the user** — if it can be done via API, do it. "Go commit this" is a failure.
- **Don't archive when you should delete** — if content exists in Notion, the local file is redundant

## Verification

After closing a thread:
- `git status` shows clean working tree
- No uncommitted changes remain
- Commit is visible in `git log --oneline -1`
- Instructions are in Notion (if any were created during the session)
