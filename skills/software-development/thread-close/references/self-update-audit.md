# Self-Update Capability Audit

**Date:** 2026-07-07
**Project:** evobot (Hermes Agent sandbox)

## Environment

| Component | Status |
|-----------|--------|
| Git binary | ❌ Not installed, no sudo |
| `isomorphic-git` | ✅ In `package.json` (v1.38.6) |
| GitHub token | ✅ In `.env` as `GITHUB_TOKEN` |
| Token scope | ⚠️ Must have `repo` scope — verify with POST /user/repos |
| Workspace | ✅ Mounted rw at `/workspace` |
| Repo remote | `https://github.com/akshay326/evobot.git` |

## Key Findings

1. **No git binary** — can't run `git add/commit/push` directly
2. **isomorphic-git installed** — pure JS alternative, but bun import resolution may fail on `isomorphic-git/http/node/index.js`
3. **GitHub Contents API** — most reliable fallback for single-file commits (Option A in thread-close skill)
4. **Token auth ≠ token authorization** — `GET /user` returns username (proves auth), but `POST /user/repos` returns 403 without `repo` scope (proves no write access)
5. **Repo must exist** — `GET /repos/owner/repo` returns 404 for nonexistent repos (same as private without auth)

## Verification Commands

```bash
# Check token works
bun -e "const r = await fetch('https://api.github.com/user', {headers:{Authorization:'token '+process.env.GITHUB_TOKEN}}); const d = await r.json(); console.log('User:', d.login);"

# Check repo exists
bun -e "const r = await fetch('https://api.github.com/repos/akshay326/evobot', {headers:{Authorization:'token '+process.env.GITHUB_TOKEN}}); console.log('Status:', r.status);"

# Check token has repo scope (creates + deletes test repo)
bun -e "const r = await fetch('https://api.github.com/user/repos', {method:'POST', headers:{Authorization:'token '+process.env.GITHUB_TOKEN,'Content-Type':'application/json'}, body:JSON.stringify({name:'_scope-test',private:true})}); console.log(r.status===201?'SCOPE OK':'NO REPO SCOPE'); if(r.status===201) await fetch('https://api.github.com/repos/akshay326/_scope-test',{method:'DELETE',headers:{Authorization:'token '+process.env.GITHUB_TOKEN}});"
```

## What's Needed for Full Self-Update

1. **GitHub PAT with `repo` scope** — user must create at https://github.com/settings/tokens
2. **Target repo must exist** — either create `evobot` on GitHub or use existing repo
3. **Git-ops script** — wrapper around isomorphic-git or GitHub API for commit+push
4. **Skill** — teach Hermes the self-update flow
