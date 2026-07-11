---
name: github-workflow
description: "Complete GitHub workflow: authentication, repositories, PRs, code review, issues, and CI/CD. Covers gh CLI, git, and curl fallback for every operation."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [GitHub, Git, CI/CD, Pull-Requests, Code-Review, Issues, Authentication, Repositories]
    related_skills: [thread-close]
---

# GitHub Workflow

Unified skill for all GitHub operations. Every section shows the `gh` CLI method first, then the `git` + `curl` fallback for environments without `gh`.

## Prerequisites

- Git installed
- GitHub account with a personal access token (PAT) or SSH key
- `gh` CLI recommended but optional

## Auth Detection (Run First)

Before any GitHub operation, determine which method to use:

```bash
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  AUTH="gh"
else
  AUTH="git"
  if [ -z "$GITHUB_TOKEN" ]; then
    if _hermes_env="${HERMES_HOME:-$HOME/.hermes}/.env"; [ -f "$_hermes_env" ] && grep -q "^GITHUB_TOKEN=" "$_hermes_env"; then
      GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$_hermes_env" | head -1 | cut -d= -f2 | tr -d '\n\r')
    elif grep -q "github.com" ~/.git-credentials 2>/dev/null; then
      GITHUB_TOKEN=$(grep "github.com" ~/.git-credentials 2>/dev/null | head -1 | sed 's|https://[^:]*:\([^@]*\)@.*|\1|')
    fi
  fi
fi
echo "Using: $AUTH"
```

---

## 1. Authentication

### Detection Flow

```bash
git --version
gh --version 2>/dev/null || echo "gh not installed"
gh auth status 2>/dev/null || echo "gh not authenticated"
```

**Decision tree:**
1. `gh auth status` shows authenticated → use `gh` for everything
2. `gh` installed but not authenticated → use gh auth method
3. `gh` not installed → use git-only method

### Method 1: Git-Only Authentication

**HTTPS with Personal Access Token (Recommended):**

1. Create token at https://github.com/settings/tokens — select scopes: `repo`, `workflow`, `read:org`
2. Configure credential helper:
   ```bash
   git config --global credential.helper store
   git ls-remote https://github.com/<user>/<repo>.git  # prompts once, then cached
   ```
3. Set git identity:
   ```bash
   git config --global user.name "Name"
   git config --global user.email "email@example.com"
   ```

**SSH Key Authentication:**

1. Generate key: `ssh-keygen -t ed25519 -C "email@example.com" -f ~/.ssh/id_ed25519 -N ""`
2. Add public key at https://github.com/settings/keys
3. Test: `ssh -T git@github.com`
4. Auto-rewrite HTTPS to SSH: `git config --global url."git@github.com:".insteadOf "https://github.com/"`

### Method 2: gh CLI Authentication

```bash
# Interactive (desktop)
gh auth login

# Token-based (headless)
echo "<TOKEN>" | gh auth login --with-token
gh auth setup-git
```

### API Access Without gh

```bash
export GITHUB_TOKEN="<token>"
curl -s -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `git push` asks for password | Use PAT as password, or switch to SSH |
| `Permission to X denied` | Token may lack `repo` scope |
| `Authentication failed` | Stale credentials — `git credential reject` then re-auth |
| Port 22 blocked | SSH over HTTPS: add `Host github.com` with `Port 443` to `~/.ssh/config` |

---

## 2. Repository Management

### Cloning

```bash
git clone https://github.com/owner/repo.git          # HTTPS
git clone git@github.com:owner/repo.git               # SSH
git clone --depth 1 https://github.com/owner/repo.git # Shallow
gh repo clone owner/repo                              # gh shorthand
```

### Creating

```bash
gh repo create my-project --public --clone
gh repo create my-project --private --description "Desc" --license MIT --clone
gh repo create my-project --source . --public --push  # from existing dir
```

Via curl:
```bash
curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/user/repos \
  -d '{"name":"my-project","private":false,"auto_init":true,"license_template":"mit"}'
```

### Forking

```bash
gh repo fork owner/repo --clone
```

Keep fork in sync:
```bash
git fetch upstream && git checkout main && git merge upstream/main && git push origin main
```

### Repository Info & Settings

```bash
gh repo view owner/repo
gh repo list --limit 20
gh repo edit --description "Updated" --visibility public
gh repo edit --add-topic "ml,python"
```

### Secrets Management (Actions)

```bash
gh secret set API_KEY --body "value"
gh secret list
gh secret delete API_KEY
```

### Releases

```bash
gh release create v1.0.0 --title "v1.0.0" --generate-notes
gh release create v2.0.0-rc1 --draft --prerelease --generate-notes
gh release list
gh release download v1.0.0 --dir ./downloads
```

### Gists

```bash
gh gist create script.py --public --desc "Useful script"
gh gist list
```

---

## 3. Pull Request Workflow

### Branch Creation

```bash
git fetch origin
git checkout main && git pull origin main
git checkout -b feat/add-user-auth
```

Branch naming: `feat/`, `fix/`, `refactor/`, `docs/`, `ci/`

### Making Commits (Conventional Commits)

```
type(scope): short description

Longer explanation if needed.
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `ci`, `chore`, `perf`

```bash
git add src/auth.py tests/test_auth.py
git commit -m "feat: add JWT-based user authentication

- Add login/register endpoints
- Add User model with password hashing
- Closes #42"
```

### Pushing and Creating PR

```bash
git push -u origin HEAD

# With gh:
gh pr create --title "feat: add auth" --body "## Summary
Adds login and register API endpoints.

Closes #42"

# With curl:
curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls \
  -d '{"title":"feat: add auth","body":"...","head":"feat/add-auth","base":"main"}'
```

### Monitoring CI Status

```bash
# gh:
gh pr checks --watch

# curl: poll combined status
SHA=$(git rev-parse HEAD)
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/commits/$SHA/status
```

### Auto-Fixing CI Failures

1. `gh run view <RUN_ID> --log-failed` — get failure details
2. Fix code with `patch`/`write_file`
3. `git add . && git commit -m "fix: ..." && git push`
4. Re-check CI (up to 3 attempts, then ask user)

### Merging

```bash
# gh:
gh pr merge --squash --delete-branch
gh pr merge --auto --squash --delete-branch  # auto-merge when green

# curl:
curl -s -X PUT -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/$PR_NUMBER/merge \
  -d '{"merge_method":"squash","commit_title":"feat: auth (#42)"}'
```

---

## 4. Code Review

### Pre-Push Review (Local)

```bash
git diff main...HEAD --stat       # scope
git diff main...HEAD              # full diff

# Check for issues:
git diff main...HEAD | grep -n "print(\|console\.log\|TODO\|FIXME\|HACK"
git diff main...HEAD | grep -in "password\|secret\|api_key\|token.*=\|private_key"
git diff main...HEAD | grep -n "<<<<<<\|>>>>>>\|======="
```

Review checklist: Correctness, Security, Code Quality, Testing, Performance, Documentation.

Present findings as: Critical → Warnings → Suggestions → Looks Good.

### PR Review (Remote)

```bash
# gh:
gh pr view 123
gh pr diff 123
gh pr checkout 123

# curl:
curl -s -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/123/files
```

### Submitting Reviews

```bash
# gh:
gh pr review 123 --approve --body "LGTM!"
gh pr review 123 --request-changes --body "See inline comments."

# curl (atomic with inline comments):
curl -s -X POST -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/pulls/123/reviews \
  -d '{"commit_id":"<SHA>","event":"REQUEST_CHANGES","body":"...","comments":[...]}'
```

---

## 5. Issues Management

### Viewing & Searching

```bash
gh issue list --state open --label "bug"
gh issue list --assignee @me
gh issue view 42
gh issue list --search "auth error" --state all
```

### Creating Issues

```bash
gh issue create --title "Login redirect bug" --body "## Description
After logging in, users land on /dashboard instead of /settings.

## Steps to Reproduce
1. Navigate to /settings while logged out
2. Log in
3. Redirected to /dashboard (expected: /settings)" \
  --label "bug,backend" --assignee "user"
```

Templates: `templates/bug-report.md`, `templates/feature-request.md`

### Managing Issues

```bash
gh issue edit 42 --add-label "priority:high,bug"
gh issue edit 42 --add-assignee username
gh issue comment 42 --body "Working on a fix."
gh issue close 42 --reason "not planned"
gh issue reopen 42
```

### Issue Triage Workflow

1. List untriaged: `gh issue list --label "needs-triage" --state open`
2. Read and categorize each issue
3. Apply labels and priority
4. Assign if clear
5. Comment with triage notes

### Linking Issues to PRs

Issues auto-close when PR merges with: `Closes #42`, `Fixes #42`, `Resolves #42`

---

## 6. CI/CD (GitHub Actions)

### Detecting the Project Stack

Check for: `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, lock files, existing `.github/workflows/`.

### Creating Workflows

Via Composio:
```python
run_composio_tool("GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS", {
    "owner": "<owner>", "repo": "<repo>",
    "path": ".github/workflows/ci.yml",
    "branch": "main",
    "message": "ci: add CI workflow",
    "content": "<YAML>"
})
```

Via gh/git:
```bash
mkdir -p .github/workflows
# write ci.yml
git add .github/workflows/ci.yml && git commit -m "ci: add CI" && git push
```

### CI Verification Loop

1. Confirm trigger: `gh run list --limit 1`
2. Wait 90s, then poll (CI takes 60-120s)
3. Check conclusion: `success` ✅ or `failure` ❌
4. Debug: `gh run view <RUN_ID> --log-failed`

### Testing Both Pass and Fail

1. Push clean code → verify CI passes ✅
2. Inject deliberate error → push → verify CI fails ❌
3. Revert → push → verify CI passes again ✅

### Common CI Patterns

**Bun/TypeScript:** See `templates/bun-ci.yml`

**Python:**
```yaml
- uses: actions/setup-python@v5
  with: { python-version: '3.12' }
- run: pip install -e ".[dev]"
- run: ruff check . && mypy . && pytest
```

**Node.js:**
```yaml
- uses: actions/setup-node@v4
  with: { node-version: '20' }
- run: npm ci && npm run lint && npm test
```

### Branch Protection

Both legacy Branch Protection Rules and Rulesets API require **GitHub Pro** for private repos on free plan.

When Pro IS available:
```yaml
required_status_checks:
  contexts: ["lint", "eval", "integration"]
  strict: true
required_pull_request_reviews:
  required_approving_review_count: 1
```

### Pitfalls

- Poll at 90s intervals — faster wastes API rate limit
- Always use lockfile pinning (`--frozen-lockfile`) in CI
- Verify default branch (`main` vs `master`) before committing
- Composio tool slugs are `GITHUB_` (uppercase with underscores)
- Base64 content from API needs whitespace normalization before decoding
- Branch protection on free plan: requires Pro for private repos
