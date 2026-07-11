# isomorphic-git Debugging Gotchas

**Date:** 2026-07-07
**Context:** Building `src/git-ops.ts` in the evobot sandbox

## Problem: isomorphic-git imports fail under bun

The npm package is installed and works, but the import paths and module interfaces are non-obvious.

## Gotcha 1: HTTP module import

```typescript
// WRONG — doesn't resolve
import http from 'isomorphic-git/http/node/index.cjs';

// CORRECT
import httpNode from 'isomorphic-git/http/node';
const http = httpNode.default || httpNode;
```

The module exports `{ __esModule: true, default: { request: [AsyncFunction] }, request: [AsyncFunction] }`. You need the object with a `request` method.

## Gotcha 2: fs parameter

```typescript
// WRONG — crashes: "undefined is not an object (evaluating 'fs[command].bind')"
import { readFileSync } from 'node:fs';
await git.statusMatrix({ fs: readFileSync, dir: '/workspace' });

// CORRECT
import fs from 'node:fs';
await git.statusMatrix({ fs, dir: '/workspace' });
```

isomorphic-git needs the full `fs` module interface (readFile, writeFile, stat, etc.), not just `readFileSync`.

## Gotcha 3: Push on diverged branches

```
❌ Push rejected because it was not a simple fast-forward. Use "force: true" to override.
```

When the workspace has accumulated uncommitted changes that get committed locally while the remote has also moved ahead, push fails. Use `force: true`:

```typescript
await git.push({ fs, dir, http, force: true, onAuth: getOnAuth });
```

## Gotcha 4: Token scope

`GET /user` returns your username (proves auth) but `POST /user/repos` returns 403 without `repo` scope. Always verify write access separately:

```typescript
const r = await fetch('https://api.github.com/user/repos', {
  method: 'POST',
  headers: { Authorization: 'token ' + process.env.GITHUB_TOKEN, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: '_scope-test', private: true })
});
// 201 = repo scope present, 403 = need to regenerate token with repo checkbox
```

## Working configuration (evobot)

```typescript
import git from 'isomorphic-git';
import httpNode from 'isomorphic-git/http/node';
import fs from 'node:fs';

const http = httpNode.default || httpNode;

await git.push({
  fs,
  dir: '/workspace',
  http,
  force: true,
  onAuth: () => ({ username: 'token', password: process.env.GITHUB_TOKEN }),
});
```
