# OMP Canonical Architecture: Model Routing & Delegation

Source of truth: `github.com/open-multi-agent/open-multi-agent` (TypeScript, MIT, 6.5k★).
CLI binary: `oma` (`packages/core/src/cli/oma.ts`, JSON-first, shell/CI).

> Note: this is the *upstream* OMP framework. The Hermes `omp-routing` skill borrows
> OMP's planner/executor concept but implements it differently (prefix routing + Hermes
> config). When the user asks "how does OMP actually do routing," this is the answer.

## Monorepo layout (`packages/core/src/`)

| Path | Role |
|------|------|
| `orchestrator/orchestrator.ts` | `OpenMultiAgent` class — the brain. ~3.1k lines. |
| `agent/runner.ts` | `AgentRunner` — one LLM-conversation loop per agent. |
| `agent/pool.ts` | `AgentPool` — semaphore-gated concurrency + per-agent locks + `runEphemeral` for delegation. |
| `tool/built-in/delegate.ts` | `delegate_to_agent` built-in tool. |
| `types.ts` | Public types: `AgentConfig`, `TeamConfig`, `ModelRoutingPolicy`, `TeamInfo`, `DelegationPoolView`. |
| `cli/oma.ts` | `oma` CLI entrypoint (non-interactive shell/CI wrapper). |

## Five orchestration phases

A `runTeam` call walks these phases. Each is an independent routing target:

1. **`coordinator`** — temp agent decomposes the goal into a task DAG (fenced JSON).
2. **`worker`** — each task runs on an assigned agent (auto-assigned if no `assignee`).
3. **`delegated`** — a worker calls `delegate_to_agent` to hand a sub-prompt to a
   teammate; runs in a **fresh** `Agent` via `pool.runEphemeral` (bypasses per-agent
   lock to avoid A→B / B→A deadlock).
4. **`synthesis`** — coordinator re-runs to fold all task outputs into a final answer.
5. **`short-circuit`** — `isSimpleGoal()` heuristic skips the coordinator and runs the
   goal through a single best-match agent. Still routable as `'short-circuit'`.

## Model routing — `ModelRoutingPolicy`

Opt-in, deterministic, **non-mutating**. Pass `modelRouting` on `runTeam`/`runTasks`
options. A policy is an ordered `rules[]` of `{ match, route }`.

### Match dimensions (every set field must agree; empty `match: {}` = catch-all)

| Field | Matches when | Available on |
|-------|--------------|--------------|
| `phase` | call is for this phase (`coordinator` \| `synthesis` \| `short-circuit` \| `worker` \| `delegated`) | every call |
| `agent` | running agent's name equals this | every call |
| `taskRole` | task's `role` equals this | worker / delegated only |
| `taskPriority` | task's `priority` (`low` \| `normal` \| `high` \| `critical`) | worker / delegated only |
| `leaf` | task has no dependents in the execution graph | worker / delegated only |
| `hasDependencies` | task's `dependsOn` is non-empty | worker / delegated only |

`taskRole`, `taskPriority`, `leaf`, `hasDependencies` are task-scoped → only match
`worker` and `delegated` calls. The `coordinator`/`synthesis`/`short-circuit` phases
have no task attached; rules with task fields simply never match them.

### Route config (`ModelRouteConfig`)

| Field | Meaning |
|-------|---------|
| `model` | Model for the matched call. **Required.** |
| `provider` | Provider override (`anthropic`, `openai`, `gemini`, …). Falls back to agent's/default. |
| `baseURL` | Base URL for OpenAI-compatible / self-hosted endpoints. |
| `apiKey` | API key for the matched call. |
| `region` | AWS region, for Bedrock routes. |

### Core functions (`orchestrator.ts`)

```typescript
function routeMatches(policy, selection): ModelRouteConfig | undefined {
  if (!policy) return undefined
  const task = selection.task
  for (const rule of policy.rules) {
    const match = rule.match
    if (match.phase !== undefined && match.phase !== selection.phase) continue
    if (match.agent !== undefined && match.agent !== selection.agent) continue
    if (match.taskRole !== undefined && match.taskRole !== task?.role) continue
    if (match.taskPriority !== undefined && match.taskPriority !== task?.priority) continue
    if (match.leaf !== undefined && match.leaf !== selection.leaf) continue
    if (match.hasDependencies !== undefined
        && match.hasDependencies !== ((task?.dependsOn?.length ?? 0) > 0)) continue
    return rule.route  // first match wins
  }
  return undefined  // no match → keep default model
}

function withModelRoute(config: AgentConfig, route: ModelRouteConfig | undefined): AgentConfig {
  if (!route) return config
  return {
    ...config,
    model: route.model,
    provider: route.provider ?? config.provider,
    baseURL: route.baseURL ?? config.baseURL,
    apiKey: route.apiKey ?? config.apiKey,
    region: route.region ?? config.region,
  }
}
```

**First match wins.** No match → agent keeps its configured model (byte-identical to
no-policy behavior). `withModelRoute` builds an **ephemeral** effective config; the
original `Team`/`AgentConfig`s/defaults are never mutated, so the same team can run
under different policies across calls.

### Canonical planner/executor pattern

```typescript
const modelRouting: ModelRoutingPolicy = {
  rules: [
    // Flagship model decomposes the goal and synthesizes the final answer.
    { match: { phase: 'coordinator' }, route: { model: 'claude-opus-4-7' } },
    { match: { phase: 'synthesis' },   route: { model: 'claude-opus-4-7' } },
    // Everything that has no dependents runs on a cheap model.
    { match: { leaf: true }, route: { model: 'claude-haiku-4-5' } },
  ],
}
const result = await orchestrator.runTeam(team, goal, { modelRouting })
```

Reference example: `packages/core/examples/patterns/cost-tiered-pipeline.ts` runs the
same pipeline twice (all-flagship vs. tiered mix) and prints per-model token/USD
breakdown.

## Delegation — `delegate_to_agent` tool

Registered only during orchestrated pool runs (`includeDelegateTool: true` at
`buildAgent` time). Standalone `runAgent` does **not** register it.

### Guards (in `delegate.ts`)

1. `team.runDelegatedAgent` must be present → else error: only available during
   orchestrated team runs.
2. `targetAgent !== context.agent.name` → cannot delegate to yourself.
3. `team.agents.includes(targetAgent)` → must be a known roster member.
4. `!team.delegationChain.includes(targetAgent)` → blocks A→B→A cycles before they
   burn turns against `maxDelegationDepth`.
5. `team.delegationDepth < maxDelegationDepth` (default **3**) → depth cap.
6. `team.delegationPool.availableRunSlots >= 1` → pool not saturated (avoids
   semaphore deadlock on nested runs).

### Execution (`buildTaskAgentTeamInfo` in `orchestrator.ts`)

- Resolves target agent's base config.
- Applies a **`'delegated'`-phase route** via `routeMatches` + `withModelRoute`.
- Runs the prompt to completion in a **fresh conversation** via `pool.runEphemeral`
  (no per-agent lock — bypasses deadlock vector for mutual delegation).
- Nested `TeamInfo` is built recursively so a delegated agent can itself delegate
  (depth + 1, chain extended).
- Returns the target's final text as the tool result.
- Nested `tokenUsage` surfaced via `ToolResultMetadata.tokenUsage` so the parent
  runner aggregates it into its total (keeps `maxTokenBudget` accurate across
  delegation chains).
- Best-effort shared-memory audit write when the team has `sharedMemory` enabled.

## AgentPool (`pool.ts`)

- `Semaphore` gates total concurrency (`maxConcurrency`).
- Per-agent lock in `run()` so the second call for the same agent waits.
- `runEphemeral()` — **no per-agent lock**, designed for delegation. Each delegated
  call uses a fresh `Agent` instance (matching `delegate_to_agent`'s "fresh
  conversation" contract). The semaphore still gates total concurrency; per-agent
  lock is bypassed to avoid deadlock when A→B and B→A both happen.
- `availableRunSlots` exposes remaining semaphore capacity — checked by
  `delegate_to_agent` before starting a nested run.

## Key design principles

1. **Opt-in.** Omit `modelRouting` and model selection is byte-identical to before.
2. **No mutation.** Matched route builds an ephemeral effective config for that one
   call. `Team`, `AgentConfig`s, and orchestrator defaults are never modified.
3. **Deterministic.** Rules evaluated in array order; first match wins. No
   predicates, no callbacks — pure data.
4. **Fresh conversation per delegation.** Delegated agent runs are isolated; no
   shared state with the delegating agent except via shared memory (explicit opt-in).
5. **Cycle-safe.** Delegation chain is tracked; A→B→A is refused before it burns
   budget. Depth is capped (default 3).
6. **Pool-safe.** Delegation refuses when the pool is saturated (avoids semaphore
   deadlock on nested runs).