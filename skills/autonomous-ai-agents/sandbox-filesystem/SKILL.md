---
name: sandbox-filesystem
description: "Hermes Agent Docker backend filesystem model — shared /workspace, git state, uncommitted work, and how code persists across threads."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux]
metadata:
  hermes:
    tags: [sandbox, docker, filesystem, git, workspace, threads]
    related_skills: [hermes-agent, subagent-ops, github-repo-management]
---

# Sandbox Filesystem Architecture

How the Hermes Agent backend manages files, git, and code across threads.

## Two Modes: Docker vs Bare EC2

### Docker mode (legacy)
- All threads share one `/workspace` directory (bind-mounted from host)
- Container user is `bun` with `HOME=/home/bun`
- Scripts, skills, and cron outputs live under `/workspace/`
- `.env` with credentials lives at `/workspace/.env`

### Bare EC2 mode (current, since 2026-07-09)
The primary runtime. Hermes gateway runs as a systemd user service on the host.

**Key paths:**
- Scripts: `~/.hermes/scripts/`
- Skills: `~/.hermes/skills/`
- Cron config: `~/.hermes/cron/jobs.json`
- Cron outputs: `~/.hermes/cron/output/<job_id>/`
- `.env` with credentials: `~/.hermes/.env`
- Progress data: `~/.hermes/<project>/` (e.g. `~/.hermes/cp-sparring/progress.json`)
- Hermes core source: `~/.hermes/hermes-agent/` (Python, fork of NousResearch)
- Evobot CLI tools: `~/akshay-projects/evobot/` (TypeScript/Bun)
- Product code: `~/civerify/` (separate Docker Compose deploy)

**The hermes-evobot relationship:**
```
hermes core (Python)     evobot CLI (TypeScript)
  gateway, cron,            research ingestion,
  sessions, tools           embedding, notion indexing,
       │                    diagram feedback, deploy
       │                           │
       └──── cron jobs call ───────┘
             via `cd ~/akshay-projects/evobot && evobot research`
             or `cd /workspace && bun scripts/...`
```
- Hermes cron jobs invoke evobot scripts as subprocesses on the host
- Evobot provides the research/embedding toolbelt; hermes provides the agent runtime
- They share credentials via `.env` files (must stay in sync)
- Docker containers bind-mount evobot as `/workspace` but run `sleep infinity` — idle sandboxes from past sessions

**Idle Docker containers:**
Hermes sandbox sessions create Docker containers (`oven/bun:1`) that mount evobot as `/workspace`. These persist as `sleep infinity` after the session ends. Safe to delete:
```bash
docker ps --format '{{.Names}} {{.Status}}' | grep hermes
docker stop <name> && docker rm <name>
```

**`cwd: /workspace` in config:**
The hermes config has `terminal.cwd: /workspace` — this works inside Docker containers (where evobot is mounted at `/workspace`) but resolves to nothing on the bare host. On bare EC2, use absolute paths or `~/akshay-projects/evobot/`.

**Migration checklist (Docker → bare EC2):**
1. Scan all cron prompts for `/workspace/` and `/home/bun/` → replace with absolute host paths
2. Scan all skills for `/workspace/` references → update paths
3. Recreate missing scripts (e.g. `discord-post-thread.ts`, `reminder-check.sh`)
4. Re-add credentials to `~/.hermes/.env` (they don't migrate automatically)
5. Create missing directories (`~/.hermes/data/`, `~/.hermes/cp-sparring/`)
6. Fire all cron jobs manually to verify: `cronjob run <id>` for each
7. Test `discord-post-thread.ts` end-to-end (summary + thread + details)
8. Delete idle Docker containers: `docker ps -a --filter "status=exited" --filter "ancestor=oven/bun:1"`

## Core Model

**All threads share one `/workspace` directory.** There is no isolation between threads — no separate directories, no worktrees, no per-thread sandboxes.

```
Thread A writes file.py → /workspace/file.py
Thread B writes file.py → /workspace/file.py (overwrites A's work)
```

This is by design: the Docker container mounts a single host directory (`/workspace`) and all agent sessions write to it.

## Git State

### What's typically true
- A git repo exists at `/workspace` (e.g., pointing to a GitHub remote)
- Git may or may not be installed in the container
- If git IS available, commits persist to the host via the bind mount
- If git is NOT available, work sits as uncommitted changes on the filesystem

### How to check state
```bash
# Check if git is available
which git

# If available, check status
cd /workspace && git status
cd /workspace && git log --oneline -5

# Check remote sync
cd /workspace && git remote -v
```

### If git is NOT available
You can still verify state by reading git internals:
```bash
cat /workspace/.git/HEAD                    # current branch
cat /workspace/.git/refs/heads/master       # local HEAD SHA
cat /workspace/.git/packed-refs             # remote tracking refs
cat /workspace/.git/logs/HEAD               # full reflog (commit history)
```

Compare the SHA in `refs/heads/master` with the remote SHA in `packed-refs` to determine if local is ahead/behind.

## The Uncommitted Work Problem

When threads write code but don't explicitly commit, work accumulates as uncommitted changes:

1. Thread writes files to `/workspace`
2. No `git add && git commit` happens
3. Files exist on the filesystem but aren't in git
4. Next thread may overwrite those files
5. User closes the thread, work is "lost" (still on filesystem, but not tracked)

### Detection pattern
```bash
# Find files modified after last git commit
find /workspace -newer /workspace/.git/index -type f | grep -v node_modules | grep -v .git
```

### Prevention pattern
When writing code in a thread, ALWAYS commit if the work is valuable:
```bash
cd /workspace
git add -A
git commit -m "descriptive message"
git push  # if credentials are available
```

## Thread Isolation Myths

| Myth | Reality |
|------|---------|
| Each thread gets its own directory | All threads share `/workspace` |
| Code in Thread A is isolated from Thread B | No isolation — same filesystem |
| Closing a thread deletes its work | Files persist until manually deleted or overwritten |
| Git commits happen automatically | Manual commit required; no auto-commit |
| Git is always available | May not be installed in the container |

## Host vs Container

The Docker container mounts `/workspace` from the host. This means:
- Files written to `/workspace` in the container ARE visible on the host
- Git commits in the container DO persist to the host (if git is available)
- `systemctl` and other host-level commands are NOT available from the container
- The host's `~/.hermes/` is NOT mounted — only `/workspace`

## Practical Implications

### For users
- After a coding thread, check `/workspace` for uncommitted changes
- Commit from the host machine if git isn't available in the container
- Review what's on the filesystem before assuming it's "in the repo"

### For agents
- Always commit valuable work before ending a thread
- If git isn't available, tell the user what files were created/modified
- Don't assume work is persisted just because files were written
- When starting a thread, check git state first to understand the baseline

## Tooling Workarounds

The container often lacks system packages (no root/sudo). These are the known working patterns:

### Browser tools (Chromium)
```bash
bunx playwright install chromium
bunx playwright install-deps chromium
```
Both commands are needed. The first downloads the browser binary; the second installs OS-level dependencies (fonts, libs). Without `install-deps`, `browser_navigate` will time out silently.

**Note:** `install-deps` may partially fail without root — some packages can't be installed. If `browser_navigate` still times out after both commands, the container is missing system libraries that require root. Fall back to `bun fetch` + API calls.

### File downloads without curl/wget
```bash
bun -e "
const resp = await fetch('https://example.com/file.tar.gz');
const buf = await resp.arrayBuffer();
require('fs').writeFileSync('/tmp/file.tar.gz', Buffer.from(buf));
console.log('Downloaded:', buf.byteLength, 'bytes');
"
```
Works for any URL. Handles redirects automatically. Useful when curl/wget aren't installed.

### Git operations without system git
For public repos, download the tarball via GitHub API:
```bash
# URL pattern: https://api.github.com/repos/{owner}/{repo}/tarball
# Then extract: tar xzf file.tar.gz -C /tmp && mv /tmp/owner-repo-* /target/
```

For commit+push, use `src/git-ops.ts` (wraps `isomorphic-git`):
```bash
source .env && bun src/git-ops.ts sync "commit message" --force
```

**isomorphic-git gotchas (solved):**
- Import: use `import httpNode from 'isomorphic-git/http/node'` then `const http = httpNode.default || httpNode`
- `fs` parameter: pass the full `fs` module (e.g. `import fs from 'node:fs'`), NOT just `readFileSync`
- Push on diverged branches: pass `force: true` to override fast-forward rejection

**⚠️ Extraction gotcha:** The tarball extracts to `owner-repo-<hash>/` inside the target dir. If you `rm -rf` the parent to rename, you lose the clone. Always extract to `/tmp` first, then `mv` the inner directory to the final path:
```bash
# CORRECT
mkdir -p /workspace/repo-name
tar xzf /tmp/repo.tar.gz -C /tmp
mv /tmp/owner-repo-* /workspace/repo-name

# WRONG — rm -rf on parent deletes the clone
mkdir -p /workspace/civerify
tar xzf /tmp/repo.tar.gz -C /workspace/civerify  # extracts inside
rm -rf /workspace/civerify  # deletes everything
```

### Private repo cloning
Private repos return 404 without auth. Use a PAT:
```typescript
const token = process.env.GITHUB_PAT;
const resp = await fetch('https://api.github.com/repos/{owner}/{repo}/tarball', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  },
  redirect: 'follow'
});
```
⚠️ Never save PATs to memory or files. Use env vars only. The `X-GitHub-Api-Version` header is required — without it, the API may return unexpected responses.

### Checking repo existence
```bash
bun -e "
const r = await fetch('https://api.github.com/repos/{owner}/{repo}');
console.log(r.status);  // 200 = exists, 404 = not found/private
"
```
Public repos return 200; private/nonexistent both return 404. Use auth to distinguish (see above).

## Pitfalls

1. **Silent overwrites**: Thread B can overwrite Thread A's uncommitted work without warning
2. **False confidence**: Writing files ≠ committing to git. Users may think work is "done" when it's just on the filesystem
3. **Stale refs**: The `.git/packed-refs` file may be stale if git operations happened outside the container
4. **No auto-commit**: There is no mechanism that automatically commits work when a thread ends
5. **Playwright half-installed**: Running `playwright install chromium` without `install-deps` produces a browser binary that crashes on launch — `browser_navigate` times out with no useful error

## References

- See `references/thread-state-audit.md` for how to audit what's committed vs uncommitted
