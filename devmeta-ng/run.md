---
description: Execute features (fallback fan-out, global) — one Agent per feature, parallel across execution waves. The non-workflow build path of /devmeta-ng:go Phase 3.
argument-hint: [feature-id(s) or --all]
---

## Project Context

Read `.devmeta/devmeta.md` from the project root if it exists. It provides
project-specific test commands, environment checks, and additional rules.

If no `.devmeta/devmeta.md` exists:
- Testing: look for `package.json` test scripts
- Environment: skip checks
- Additional rules: none

> **tk mapping:** tk -t epic = DevMeta Feature, tk -t task = DevMeta Task

---

## What this is (and is not)

This file documents the **fallback fan-out procedure** for building one iteration:
one Agent per feature, run in parallel across independent execution waves, with all
git / PR / tk side effects living **inside** the feature Agents. It is the
**non-workflow** build substrate.

`/devmeta-ng:go` Phase 3 is the **sole launcher and decision point** for the build.
On a workflow opt-in (`workflow`/`ultracode`) it emits and launches the per-iteration
build workflow (`workflows/build-iteration.workflow.js`). When there is **no** opt-in,
Phase 3 runs *this* procedure instead. So:

- This is **not** a second workflow launcher. It launches nothing.
- This is the path `go` Phase 3 follows on its non-workflow branch.
- The Agent prompt below is deliberately the **same shape** as the workflow's
  per-feature build prompt, so the two substrates are A/B-comparable: the only thing
  that differs between them is *who* fans the features out (a Dynamic Workflow versus
  this direct parallel-Agent batch). The ledger, branch-naming, the per-feature tests,
  and the downstream PR/merge seam are identical on both paths.

You may also invoke this procedure directly to (re-)run specific features, but in
normal operation `go` drives it.

## Design

**The feature is the unit of context.** One Agent per feature. Sequential tasks within a
feature. Parallel across independent features. `context-log.md` for inter-feature
communication. You (the orchestrator) are a thin scheduler: you compute waves, pre-create
each wave's branches, spawn the wave's Agents in a single batch, await the barrier, and
collect results. **You implement nothing yourself.**

## Effort

This procedure runs at **high** effort. Per-feature build work is the bounded,
high-leverage thinking of the engine — enough to design the change and its surgical tests
correctly, not the maximal tier (which is reserved for the partition cut and the reflect
acceptance fan-out, both of which happen elsewhere). The full effort ladder is
`low / medium / high / xhigh / max`; `go` sets the tier per phase and this build phase is
`high`.

## Context

- Run timestamp: passed in by `go` (e.g. as `runStamp`). Do not invent a clock value —
  use the timestamp `go` supplies for any dated note.
- Target: $ARGUMENTS
- Open features: !`tk list --type epic --status open 2>/dev/null | head -20 || echo "No open features"`

## Your Task

You are a thin orchestrator. Compute the feature dependency order, spawn one Agent per
feature per wave, and collect results. You do NOT implement anything yourself, you do NOT
merge, and you do NOT run acceptance verification — that is `go`'s Phase 4/5.

### Phase 1: Identify Scope

**If `$ARGUMENTS` contains feature ID(s):** Run those features only.
**If `$ARGUMENTS` is `--all` or empty:** Run all open features for the active iteration.

### Phase 2: Compute Feature Dependency Graph

```bash
tk list --type epic --status open --json
```

For each feature, read its tasks to find cross-feature `blocked_by` edges:
```bash
tk list --parent <epic-id> --json
```

Build the feature-level dependency graph and group it into waves (the parallel frontier):
```
Wave 1 = features with no open feature-level blockers (the foundation)
Wave 2 = features whose blocker-features are all in Wave 1
...
```

Independent features share a wave and run concurrently; dependent features serialize across
waves. Dependencies are feature-level only — never task-to-task choreography across features.

### Phase 3: Locate the Shared Context Log and Base Branch

- Find the `context-log.md` path from the feature descriptions / iteration plan. Read it —
  you'll include a read-only snapshot of its contents in each Agent prompt.
- Resolve the active increment via `.devmeta/current-increment.md`, then read the
  authoritative base branch from `<increment-dir>/base-branch`. **Never assume `main`.**
  Every feature branches from this base branch.

### Phase 4: Execute Waves

```
FOR each wave (in dependency order):
  1. Gather the features in this wave and, for each, its ordered tasks:
       tk list --parent <epic-id> --json
  2. For each feature in the wave, pre-create and push its branch off the base branch:
       git fetch origin
       git checkout -b feature/YYYY-MM-DD-<feature-name> origin/<base-branch>
       git push -u origin feature/YYYY-MM-DD-<feature-name>
  3. Spawn one Agent per feature — ALL IN A SINGLE MESSAGE (a single parallel batch),
     each isolated in its own worktree so the parallel git checkouts cannot collide.
     Include the feature's branch name in its prompt.
  4. Await the batch barrier: wait for every Agent in the wave to return before starting
     the next wave. (Awaiting the whole wave's batch IS the wave barrier — it enforces the
     cross-feature dependency ordering.)
  5. Collect each Agent's returned result into the per-feature build manifest (Phase 6).
  6. Proceed to the next wave.
```

**CRITICAL: Launch all of a wave's feature Agents in a SINGLE message with multiple Agent
tool calls (one parallel batch). Isolate each in its own worktree.** A wave is a barrier:
the next wave starts only after the current wave's batch fully resolves. There is no
inter-stage barrier inside a feature — its tasks run sequentially within that one Agent.

### Phase 5: Feature Agent Prompt Template

Spawn with `subagent_type: "tk-worker"` (fallback: `"general-purpose"`), each in its own
worktree off the base branch.

```
## Your Assignment — Feature [<epic-id>] <epic-title>

You are the sole worker for this feature. Work autonomously; do not ask questions.

**Branch:** feature/YYYY-MM-DD-<feature-name> (already created and pushed — check it out
and work here, in your own worktree).
**Base branch:** <base-branch> (authoritative; PRs target this).

### Feature Description

<full description from `tk show <epic-id>`>

### Tasks — complete IN ORDER (they build on each other)

1. [<task-1-id>] <title>
   Acceptance: <criteria>
2. [<task-2-id>] <title>
   Acceptance: <criteria>
...

### Task Details

<full description for each task from `tk show <task-id>`>

### Shared Context Log (read-only snapshot at fan-out)

<contents of context-log.md>

### Feature Notes (from previous runs)

<output of `tk notes <epic-id>`>

## Orientation — read first

1. CLAUDE.md — project orientation
2. docs/current/principles-and-choices.md — architectural decisions; do not contradict
3. .devmeta/lessons-learned.md — do not repeat known mistakes
4. context-log.md — context from sibling/previous features
5. .devmeta/devmeta.md if present — project test commands and additional rules
6. **Staleness guard:** if the increment scope or the foundation this feature builds on is NOT present on your branch, your base is stale — STOP, report `blocked: base likely stale`, and do NOT guess scope or conclude the feature is "already shipped".

## Procedure — per task

a. `tk update <task-id> --status in_progress`
b. Implement the change AND its tests together.
c. Run the SURGICAL test command for the touched code (never the full suite). Fix and
   re-run until green.
d. `git commit -m "[<task-id>] <what changed>"`  (one commit per task)
e. `tk close <task-id> --reason "<summary>"`

## After ALL tasks

a. Append your learnings and any cross-feature signals to context-log.md.
b. `tk note <epic-id> "FEATURE COMPLETE: <summary>"`
c. Open a PR TARGETING the base branch — do NOT merge:
   `gh pr create --base <base-branch> --head feature/YYYY-MM-DD-<feature-name> --title "..." --body "..."`
d. Do NOT merge. Do NOT touch other feature branches. Merge/integration is devmeta's job
   after this fan-out returns.

## Rules

- Complete tasks in order. Be autonomous — don't ask questions.
- NEVER close a task with failing tests. If tests fail: debug, fix, re-run. Loop until
  green. There is no "close with known failures."
- Tests are YOUR responsibility. Write them, run them, fix them. Never defer testing to a
  later task or iteration.
- Use SURGICAL test commands for the code you touched — self-check your own work. Do NOT
  run the iteration's "Verify on screen" acceptance criteria — that adversarial acceptance
  verdict is owned by devmeta's separate reflect step, not by you.
- When you solve a non-obvious problem, also write it to .devmeta/lessons-learned.md.
- Use tk commands; never edit .tick/issues/ by hand.
- Work on your feature branch in your own worktree. Commit after each task with
  `[<task-id>] <summary>`. Open a PR targeting the base branch when all tasks are done.
- NEVER reduce scope. If something is hard, work harder. If something is blocked, try to
  unblock it. Only the human can cut a feature.
- If a task is genuinely blocked: `tk update <task-id> --awaiting escalation`,
  `tk note <task-id> "<what's blocking and what was tried>"`, then continue to any task
  that does not depend on it.

## Return

Return ONLY a JSON object for this feature:
  { "featureId": "<epic-id>", "branch": "feature/...", "status": "complete|partial|blocked",
    "tasks": [ { "taskId": "...", "state": "closed|open|escalated", "commit": "<sha or ''>",
                 "note": "" } ],
    "prUrl": "<url or ''>", "headSha": "<sha>", "contextNotes": "<what you appended>",
    "blockers": [ ] }
```

### Phase 6: Collect the Build Manifest

Fold each Agent's returned result into one per-feature build manifest — the **same shape**
the build workflow returns, so `go` consumes either path identically:

```jsonc
{
  "iteration": "<N.1>",
  "baseBranch": "<base-branch>",
  "features": [
    { "featureId": "<epic-id>", "branch": "feature/...", "status": "complete|partial|blocked",
      "prUrl": "<url or ''>", "headSha": "<sha>",
      "tasks": [ { "taskId": "...", "state": "closed|open|escalated", "commit": "<sha>" } ],
      "blockers": [ ] }
    // ...one per feature, across all waves
  ]
}
```

An Agent that fails to spawn or returns invalid output becomes an `agent-failed` row
(`status: "agent-failed"`, no PR) rather than crashing the batch — `go` decides whether to
reset and re-run it.

### Phase 7: Reconcile tk, Then Hand Back to go

- **All tasks closed for a feature:** `tk close <epic-id> --reason "All tasks completed"`.
- **Some tasks open:** check `tk list --parent <epic-id> --awaiting --json` and
  `tk notes <task-id>`; reset stale `in_progress` tasks with `tk update <task-id> --status open`.

Then **return the build manifest to `go`** and stop here. This procedure's contract ends at
"every feature in this iteration has a branch, per-task commits, a PR, and a reconciled tk
state." Everything past that is `go`'s own loop, **after** this returns:

- **PR aggregation + merge into the base branch, in wave/dependency order**, plus the
  metadata commit on the base branch — this is `go` **Phase 4**. Parallel Agents must never
  merge each other's branches, so merge is never done here.
- **Adversarial acceptance verification against the iteration's "Verify on screen" criteria**
  — this is `/devmeta-ng:reflect` (`go` **Phase 5**), owned by devmeta. It is deliberately
  NOT part of this build path; the feature Agents self-check with surgical tests only.
- **The ledger advance / next-iteration decision** — `go` Phase 5.3 onward.

Do NOT, from this procedure, pick up "Create PR for iteration", "Merge PR", or
"Plan Iteration N+1" work, and do NOT bootstrap the next increment. This is a fan-out
substrate inside `go`'s loop, not the loop itself. `go` owns the seam and the only stop
(increment completion).

## Error Handling

- **Agent fails to spawn:** log it, reset that feature's tasks, continue with the rest of
  the wave's features.
- **All features in a wave blocked:** record what needs attention in tk and return the
  manifest with those features marked `blocked`; `go` decides the consequence.
- **Partial completion:** completed tasks stay closed; reset incomplete tasks to open. The
  next run (workflow or this fallback) resumes from the reconciled tk state.
