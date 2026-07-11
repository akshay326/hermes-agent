---
name: self-update
description: Commit and push code changes to the evobot GitHub repo from within the sandbox
category: devops
---

# Self-Update Skill

Commit and push code changes to GitHub without native git binary. Uses `isomorphic-git` via `src/git-ops.ts`.

## Prerequisites

- `GITHUB_TOKEN` in `.env` with `repo` scope
- `src/git-ops.ts` exists in workspace

## Commands

```bash
# Check what's changed
source .env && bun src/git-ops.ts status

# Stage specific files
source .env && bun src/git-ops.ts add src/file1.ts src/file2.ts

# Stage ALL changed files
source .env && bun src/git-ops.ts add-all

# Commit (files must be staged first)
source .env && bun src/git-ops.ts commit "feat: description"

# Push (fast-forward only)
source .env && bun src/git-ops.ts push

# Push (force, for diverged branches)
source .env && bun src/git-ops.ts push --force

# One-shot: stage + commit + push
source .env && bun src/git-ops.ts sync "feat: description"

# One-shot with force
source .env && bun src/git-ops.ts sync "feat: description" --force

# View recent commits
source .env && bun src/git-ops.ts log 5

# See changed files
source .env && bun src/git-ops.ts diff
```

## Workflow for Code Changes

1. Edit files using `write_file` or `patch`
2. Run `bun src/git-ops.ts status` to verify changes
3. Run `bun src/git-ops.ts sync "type: description"` to commit+push
4. Verify with `bun src/git-ops.ts log 1`

## Commit Message Convention

Use conventional commits:
- `feat:` — new feature
- `fix:` — bug fix
- `refactor:` — code restructuring
- `chore:` — maintenance
- `docs:` — documentation

## Gotchas

- `sync` with no args stages ALL changed files (use `add` for selective staging)
- Push fails on diverged branches — use `--force` when workspace has diverged from remote
- Always `source .env` before running to load GITHUB_TOKEN
- The author is `evobot <evobot@hermes.nousresearch.com>`

## Troubleshooting

If isomorphic-git operations fail, see `references/isomorphic-git-gotchas.md` for debugging gotchas (import paths, fs parameter, force push, token scope verification).
