---
name: thread-close
description: "Auto-commit, push, lint, and verify CI when closing a thread or coding session."
version: 2.0.0
author: Hermes Agent
license: MIT
tags: [git, cleanup, workflow, discord, ci]
---

# Thread Close Skill

Run this when closing a thread or ending a coding session to ensure a clean, pushed, CI-passing state.

## When to Run

- User says "close thread", "done", "wrap up", or types `/close`
- Thread is being archived or deleted
- End of a coding session before switching context

## Steps

### 1. Check for uncommitted changes
```bash
cd /workspace && git status --short
```

If clean, skip to step 4.

### 2. Stage and commit
```bash
cd /workspace && git add -A && git commit -m "thread: <descriptive-summary>"
```

Use the thread name or topic as the summary. Keep it under 72 chars.

### 3. Push to remote
```bash
cd /workspace && git push origin master
```

If push fails (conflict, auth), report the error and stop.

### 4. Run linter (if configured)
```bash
cd /workspace && bun run lint 2>/dev/null || echo "No lint script configured"
```

If lint fails, report errors but don't block.

### 5. Verify CI status
```bash
# Check if GitHub Actions is running
gh run list --limit 1 2>/dev/null || echo "gh CLI not available — check GitHub manually"
```

If `gh` is available, watch the latest run:
```bash
gh run watch 2>/dev/null || true
```

### 6. Report status
Output:
- Files changed (count)
- Commit SHA (short)
- Push status (success/fail)
- Lint status (pass/errors)
- CI status (pass/fail/unknown)

Format:
```
Thread closed.
Commit: abc1234 — "thread: <summary>"
Push: ✓ pushed to origin/master
Lint: ✓ clean
CI: ✓ passing (or ⏳ pending / ✗ failing)
```

## Pitfalls

- **Never force-push** — just push normally
- **Don't delete uncommitted files** — they might be intentional
- **Don't run tests separately** — CI handles that
- **Skip lint if no lint config** — don't fail on missing tooling
- **If push fails, don't retry blindly** — report the error
- **No git binary in sandbox** — Docker containers often lack git; use fallback path below
- **Token scope verification** — A GitHub PAT can authenticate successfully (returns username) but lack `repo` scope. Always verify BEFORE attempting commits. Quick test: `POST /user/repos` with the token — 201 means `repo` scope is present, 403 means regenerate with `repo` checkbox. The token returning your username from `GET /user` only proves authentication, not authorization to write.

## No-Git-Binary Fallback (Sandbox)

The Docker sandbox frequently has no `git` binary installed and no sudo to install one. The `.git/` directory exists (mounted from host) but you can't run `git` commands.

### Detection

```bash
which git 2>/dev/null || echo "NO GIT BINARY"
```

### Option A: git-ops.ts (preferred — if available)

`src/git-ops.ts` wraps `isomorphic-git` for commit+push without native git. This is the primary method.

```bash
# Check what changed
source .env && bun src/git-ops.ts status

# Stage + commit + push (one-shot)
source .env && bun src/git-ops.ts sync "thread: <summary>" --force

# Or selective: stage specific files, then commit+push
source .env && bun src/git-ops.ts add src/file1.ts src/file2.ts
source .env && bun src/git-ops.ts commit "thread: <summary>"
source .env && bun src/git-ops.ts push --force
```

Requirements:
- `GITHUB_TOKEN` in `.env` with `repo` scope
- `src/git-ops.ts` exists

#### ⚠️ Stale Index Pitfall
isomorphic-git's `statusMatrix` may list files that were deleted from disk but remain in the index. Calling `sync` or `addAll` will crash with `Could not find <filename>`. **Fix: filter by `fs.existsSync()` before adding.**

```typescript
// Safe addAll that skips deleted files
const statusMatrix = await git.statusMatrix({ fs, dir: REPO_DIR });
for (const [filepath, , workdir, stage] of statusMatrix) {
  if (workdir !== stage && fs.existsSync(filepath)) {
    await git.add({ fs, dir: REPO_DIR, filepath });
  }
}
```

If `sync`/`addAll` fails, fall back to this inline script instead of retrying the same command.

### Option B: GitHub API (if git-ops.ts missing)

If `GITHUB_TOKEN` is set but `git-ops.ts` doesn't exist, use the GitHub Contents API:

```typescript
const token = process.env.GITHUB_TOKEN;
const repo = 'akshay326/evobot';
const path = 'src/file.ts';
const content = Buffer.from(fileContent).toString('base64');

const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const sha = existing.ok ? (await existing.json()).sha : undefined;

await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'thread: <summary>', content, sha, branch: 'master' }),
});
```

⚠️ Only works for single-file commits. For multi-file changes, use Option A.

### Option C: Report and defer

If neither option works, report the modified files and let the user commit from EC2:

```
⚠ No git binary or git-ops.ts in sandbox. Modified files:
- src/research-discovery.ts (heuristic removed)
- src/cli.ts (screaming failure banner)
Commit manually: cd /workspace && git add -A && git commit -m "..." && git push
```

## Verification

After closing:
- `git status` shows clean working tree
- `git log --oneline -1` shows the new commit
- `git remote -v` confirms push went to correct remote

## References

- See `references/self-update-audit.md` for sandbox environment audit (no-git-binary setup, token scope verification, isomorphic-git testing)
