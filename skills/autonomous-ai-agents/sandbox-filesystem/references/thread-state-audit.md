# Thread State Audit

How to determine what's committed, what's uncommitted, and what's lost across threads.

## Quick Audit (git available)

```bash
cd /workspace

# 1. Current state
git status                    # uncommitted changes
git log --oneline -10         # recent commits
git remote -v                 # remote tracking

# 2. What's ahead of remote
git log origin/master..HEAD --oneline   # local commits not pushed

# 3. What's uncommitted
git diff                      # modified tracked files
git diff --cached             # staged but not committed
git ls-files --others --exclude-standard  # untracked files
```

## Deep Audit (git NOT available)

When git CLI isn't installed, read the git internals directly:

```bash
# 1. Find current HEAD
cat /workspace/.git/HEAD
# → ref: refs/heads/master

# 2. Find local commit SHA
cat /workspace/.git/refs/heads/master
# → 9df7f9bf314c4e19f2f73d8d13171859dfbd0b5a

# 3. Find remote tracking SHA
grep "refs/remotes/origin/master" /workspace/.git/packed-refs
# → ea0c69320c0412c2ef4bbb7c17c1581372546716

# 4. Compare SHAs — if different, local is ahead/behind

# 5. Full commit history (reflog)
cat /workspace/.git/logs/HEAD
# Shows all commits with messages and timestamps

# 6. Files modified since last commit
find /workspace -newer /workspace/.git/index -type f | grep -v node_modules | grep -v .git
```

## Interpreting Results

### Local ahead of remote
```
Local SHA:  9df7f9bf...
Remote SHA: ea0c6932...
```
→ Local has commits that haven't been pushed. Run `git push` from host.

### Local behind remote
```
Local SHA:  ea0c6932...
Remote SHA: 9df7f9bf...
```
→ Remote has newer commits. Run `git pull` from host.

### Uncommitted files exist
```
find -newer .git/index shows files
```
→ These are thread outputs that were never committed. Review and commit manually.

## Recovery Patterns

### Uncommitted work from closed threads
1. Run the audit above to find uncommitted files
2. Review each file to determine if it's valuable
3. `git add` the valuable ones
4. `git commit -m "recover: thread work from [date/context]"`
5. `git push`

### Overwritten work
If Thread B overwrote Thread A's uncommitted work:
1. Check if Thread A's work was ever committed (reflog)
2. If committed, `git checkout <sha> -- <file>` to restore
3. If never committed, the work is lost — check session transcripts for context

## Common Scenarios

| Scenario | What happened | Fix |
|----------|---------------|-----|
| "I closed 90 threads, where's the code?" | Files on filesystem, not in git | Audit + commit from host |
| "Thread B broke Thread A's code" | Shared filesystem, no isolation | Use branches or commit between threads |
| "Git push failed" | No credentials in container | Push from host machine |
| "Commits show but remote is behind" | Packed-refs stale | `git fetch` or push from host |
