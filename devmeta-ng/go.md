---
description: DevMeta-NG Delivery Engine (global) — drives one increment to completion
argument-hint: "[N] [workflow]   # optional iteration hint; add 'workflow' to use the build workflow substrate"
---

## Project Context

Read `.devmeta/devmeta.md` from the project root if it exists. It provides
project-specific test commands, environment checks, and additional rules.

If no `.devmeta/devmeta.md` exists:
- Testing: look for `package.json` test scripts
- Environment: skip checks
- Additional rules: none

> **tk mapping:** tk -t epic = DevMeta Feature, tk -t task = DevMeta Task

> **Shared state (do not fork):** `.devmeta/` artifacts, `devmeta.md`, the `tk`
> ledger, and increment numbering (`increment-NN-XXX`, iterations `NN.1` / `NN.1R`)
> are identical to the legacy `/devmeta:` engine. Only the engine *behaviour*
> differs (effort dial, hybrid execution substrate, adversarial reflect).

---

## Purpose

This is the single command that drives one increment to completion. Run it to start. Run it again to continue. It assesses where the increment is from the `tk` ledger and does the next thing, autonomously, until it closes all gaps in the active increment or hits a genuine external blocker.

**Current increment:** Defined in `.devmeta/current-increment.md`. Follow the pointer to the active increment's `_overview.md` for scope, iterations, and gap analysis. The active line names the increment as `Increment <NN>-<XXX>` (integer + 3-letter random suffix added to avoid parallel-branch collisions); its directory is `.devmeta/increments/increment-<NN>-<XXX>/`. Iteration numbers within use the integer only (`<NN>.1` for execution, `<NN>.1R` for the paired Inspect & Adapt iteration).

**You are the project driver.** You assess the state and act — you do not ask the user what to do. The single permitted question is establishing the base branch on the first run of an increment (Phase 0.5). The only mid-run stop is when you need something that requires human action on their physical machine (installing software, creating accounts, providing API keys) or when a scope item has no acceptance criteria and a human must author them.

This loop is **thin**: it owns the increment ledger (in `tk`) and the cross-iteration seams (plan → build → PR/merge → reflect → advance). Everything *inside* an iteration's build is delegated either to a **per-iteration build workflow** or to a **parallel feature fan-out**. The loop is fully resumable: every state transition is committed to `tk`, so re-invoking `go` always resumes from the true next step. **Increment completion is the only stopping point** — and that is now a structural property of the loop, not an instruction you must remember to obey.

## Execution substrate (hybrid)

The work inside an iteration is fanned out one of two ways, chosen per `go` run with no extra questions:

- **Dynamic Workflow (opt-in).** If the invocation arguments contain the **`workflow`** keyword (e.g. `/devmeta-ng:go workflow`), or an **`ultracode`** opt-in is active for this run (surfaced as a system-reminder), Phase 3 launches the reviewed, pre-built `workflows/build-iteration.workflow.js` — it does **not** author a workflow script (see 3.2a). The workflow is checkpoint-resumable and returns a single per-feature build manifest. This is the **sole launcher** — there is no other place that starts the workflow.
- **Parallel-Agent fallback.** Otherwise, Phase 3 follows the fallback fan-out procedure documented in `/devmeta-ng:run`: one Agent per feature per wave, with all git/PR/`tk` side effects inside the agents. `run.md` is *only* the documented fallback procedure — never a second workflow launcher.

The ledger, planning, the PR/merge seam, and reflect are byte-for-byte identical on both paths — that is what makes the two engines A/B comparable. The script body of a workflow can never touch the filesystem, shell, or git; only spawned agents can. Phase 3 therefore writes nothing to git/fs itself on the workflow path.

## Effort

Each phase runs at a deliberate effort tier rather than one global setting. The ladder is **`low` / `medium` / `high` / `xhigh` / `max`** (`max` reserved for high-cost-of-failure refactors).

| Phase / activity | Tier | Rationale |
|---|---|---|
| 0 Assess ledger, 0.5 Base branch, 1 Env check | **low** | Mechanical reads of `tk` + one file; cheap, deterministic. |
| Metadata commit, status writes, ledger advance | **medium** | Bounded mechanical seams. |
| 2 Plan iteration | **high** | Scope partitioning / feature-boundary design is high-leverage thinking. (The partition *cut* inside `plan-iteration` runs at **xhigh**.) |
| 3 Execute build | **high** | Per-feature build reasoning; feature agents inherit `high`. |
| 4 Integrate (PR / merge / metadata) | **high** | Merge-order and conflict reasoning matters but is bounded. |
| 5 Reflect (acceptance fan-out) | **xhigh** | Adversarial multi-skeptic acceptance verification is where false victory is caught — spend here. |
| 5.3 Advance ledger, 6 Stop | **low → medium** | A single `tk` transition + a short report. |

## Phase 0: Assess Ledger State (effort: low)

**The `tk` ledger is the single source of truth for state.** Do not interpret markdown to decide what to do — the tick structure already encodes the answer.

```bash
tk list --all --status all    # Full ledger — iterations, features, tasks
tk next                       # The single next action
tk next <iteration-id>        # What's next within the current iteration
```

Then read context files as needed:
1. `CLAUDE.md` (already loaded)
2. `.devmeta/current-increment.md` — which increment is active → the active increment directory
3. The active increment's `_overview.md` — scope, iterations, gap analysis
4. The current iteration's `status.md` in the increment's `iterations/` directory

### 0.4 — Classify the resume point (from `tk next`, NOT from prose)

| `tk next` yields | Action |
|---|---|
| a **TASK** | Execute it (`tk show <id>` → do the work → `tk close <id>`), then re-run `tk next`. Rare seam tasks only — see note below. |
| an iteration **WITH children, still open** | It is mid-build → go to **Phase 3** (EXECUTE). |
| an execution iteration **WITHOUT children** | → go to **Phase 2** (PLAN). |
| an **I&A iteration `NN.1R` WITH children** | → go to **Phase 5** (REFLECT). |
| an **I&A iteration `NN.1R` WITHOUT children yet** | Create its single child task `Run /devmeta-ng:reflect N`, then proceed (`tk next` → Phase 5). |
| **nothing**, all increment iterations closed | → go to **Phase 6** (STOP). |
| **no ticks at all** | BOOTSTRAP: read `_overview.md`, create one top-level iteration epic per planned iteration, then `tk next`. |

> **Seam tasks note:** PR / merge / metadata are executed by `go` itself in **Phase 4**, not as separate tick tasks. The "rare TASK" branch exists only for backward-compatible resume and for any project-specific seam tasks `plan-iteration` chose to materialize. The default DevMeta-NG plan does **not** create "Create PR" / "Merge PR" / "Commit metadata" / "Re-ground" task ticks at all.

## Phase 0.5: Establish Base Branch (effort: low)

The base branch for the current increment is persisted in `<increment-dir>/base-branch` (a plain text file containing just the branch name). This is the **single source of truth** for which branch feature branches are cut from, which branch PRs target, and which branch the I&A iteration runs on.

1. Read `.devmeta/current-increment.md` to find the active increment directory.
2. Check if `<increment-dir>/base-branch` exists:

**If the file exists:** Read it. That's the base branch. Verify it exists locally with `git rev-parse --verify <branch>`. If the branch doesn't exist, error and ask the user.

**If the file does NOT exist (first run for this increment):**

This is the ONE permitted question:

1. Detect the current branch: `git branch --show-current`
2. Ask the user:
   > Current branch is `<branch>`. Do you want to:
   > 1. Use `<branch>` as the base branch for this increment
   > 2. Create a new branch from `<branch>` to use as base (suggested name: `YYYY-MM-DD-<increment-name>`)
3. If option 2: create the branch (`git checkout -b <name>`), push with `-u origin`.
4. Write the chosen branch name to `<increment-dir>/base-branch`.

Every later phase reads the base branch from this file — **never assume `main`**.

## Phase 1: Environment Check (iteration 1, or on demand; effort: low)

Before doing any work, verify the development environment. **Test, don't ask.** Run the environment checks from `.devmeta/devmeta.md > Environment` if present; otherwise skip.

---

── ITERATION LOOP (repeat Phase 2 → 3 → 4 → 5 until Phase 6 fires) ──────────────

This is an explicit loop, not a sequence of waypoints you must will yourself through. When the build returns, you proceed to Phase 4 → 5 → 2 by structure. There is no in-loop decision point at which to stop, summarize, or ask "shall I continue?".

## Phase 2: Plan Iteration N (effort: high)

1. Invoke `/devmeta-ng:plan-iteration N`. It graph-partitions the iteration's scope into independent features and creates the build tick structure:
   - one Feature epic per feature under the iteration,
   - ordered Task ticks under each feature,
   - cross-feature `tk block` edges at **feature** granularity (the execution-wave graph),
   - the feature specs and the shared `context-log.md`.
   Its single deliverable to `go` is the **flat Feature Manifest** (see Phase 3.2).
2. Create the paired I&A iteration tick `NN.1R` (epic, `blocked_by` iteration N) with a **single** child task: `Run /devmeta-ng:reflect N`. The `NN.1R` iteration carries no "Plan Iteration N+1" task — Phase 2 of the next loop turn does the planning, driven by the loop.
3. `tk next` → fall through to Phase 3.

## Phase 3: Execute the Build ★ the fork ★ (effort: high)

This is the **sole launcher**. Detect the workflow opt-in (the `workflow` keyword in the invocation args, or an active `ultracode` opt-in). Record the chosen substrate: `log("substrate=workflow|agents")` and a `tk note` on the iteration epic, so a resumed run can report which path produced the existing branches.

**Resume continuity (you arrived here from Phase 0.4 on an open iteration that already has children).** Before launching anything, read the iteration epic's `tk note` for a recorded `substrate=…`. If one exists, **honor it** — the substrate is fixed for the life of the iteration, so a resume that omits the `workflow` keyword must not flip an in-flight workflow build to the Agent fallback (or vice-versa). On the workflow path specifically, do not re-launch from scratch: re-attach to / replay the journaled `build-iteration.workflow.js` for this iteration so already-completed features are not re-spawned (the journal is the resume unit; `tk` task state is the cross-check). Only when there is no recorded substrate (a genuinely fresh iteration) do you select the substrate from the current invocation.

### 3.1 — Publish the base before fanning out (CRITICAL — do this first)

Feature agents run in **isolated worktrees and cut their branch from `origin/<base>`** (the *remote* base). So **anything not pushed to `origin/<base>` is invisible to them** — the increment scope, the iteration plan, the feature specs (`.devmeta/projects/.../*-spec.md`), the `context-log.md`, and the `.tick/` structure that bootstrap and `plan-iteration` just wrote. A feature agent that branches from a stale `origin/<base>` cannot see its own spec or the increment and will misread or duplicate scope — a real, observed failure mode.

Before launching the build (3.2a) **or** the fallback fan-out (3.2b), and again on any resume that injected new tick/spec state:

1. Read the base from `<increment-dir>/base-branch`; ensure you are on it.
2. Commit everything the plan produced onto the base (skip if nothing is pending):
   ```bash
   git add .devmeta/ .tick/ docs/        # plus any spec/source files the plan wrote
   git commit -m "Plan iteration <NN.M>: scope, feature specs, tick structure"
   ```
3. **Push the base:** `git push origin <base>`.
4. **Verify origin is current:** `git rev-parse <base> origin/<base>` must print the **same** sha. If they differ, agents would branch from stale state — do **not** fan out until they match.

This is not optional, and it is the first thing Phase 3 does.

### 3.2 — The flat-manifest → build-args transform (workflow path)

`plan-iteration` emits a **flat** manifest:

```jsonc
{
  "increment": "76-abc",
  "iteration": "76.1",
  "baseBranch": "2026-05-31-doc-management",
  "contextLog": ".devmeta/projects/2026-05-31-doc-export/context-log.md",
  "features": [
    { "name": "foundation", "epicId": "tk-1042", "wave": 1,
      "scope": "Shared types, audit schema, storage layer",
      "files": ["src/types/export.ts", "src/db/exportStore.ts"],
      "dependsOn": [], "test": "pnpm vitest run src/db/exportStore.test.ts",
      "spec": ".devmeta/projects/2026-05-31-export-foundation/...-spec.md" },
    { "name": "pdf-renderer", "epicId": "tk-1043", "wave": 2,
      "scope": "Render export records to PDF", "files": ["src/render/pdf.ts"],
      "dependsOn": ["foundation"], "test": "pnpm vitest run src/render/pdf.test.ts",
      "spec": ".devmeta/projects/2026-05-31-pdf-renderer/...-spec.md" }
  ]
}
```

**`go` Phase 3 owns the serialize-and-group transform** that turns this flat manifest into the build workflow's `args`. The transform:

- reads each feature's ordered tasks from `tk` (each task → `{ taskId, title, acceptance, detail }`);
- derives the branch name per feature (`feature/<baseBranch-date>-<name>` or the project convention);
- groups features into `waves[][]` by `dependsOn` (one parallel frontier per element), validating `wave` against the `dependsOn` graph;
- renames the flat fields to the build vocabulary: `name → title`, `scope → description`, `epicId → featureId`.

**Canonical build-args shape (the only shape the build workflow consumes):**

```jsonc
{
  "iteration": "76.1",
  "runStamp": "<ISO timestamp>",        // injected by go; workflow script bodies have no clock
  "baseBranch": "2026-05-31-doc-management",
  "contextLog": ".devmeta/projects/.../context-log.md",
  "waves": [                            // grouped; one parallel frontier per element
    [ { "featureId": "tk-1042",         // == tk epic id
        "title": "foundation",
        "description": "Shared types, audit schema, storage layer",
        "branch": "feature/2026-05-31-foundation",
        "tasks": [ { "taskId": "tk-1051", "title": "...", "acceptance": "...", "detail": "..." } ],
        "test": "pnpm vitest run src/db/exportStore.test.ts",
        "spec": ".devmeta/projects/.../spec.md",
        "notes": "" } ],
    [ { "featureId": "tk-1043", "title": "pdf-renderer", "...": "..." },
      { "featureId": "tk-1044", "...": "..." } ]
  ]
}
```

Field-name law: **`featureId`** (= tk epic id), **`title`**, **`description`**, **`branch`**, **`tasks[]`**, **`test`**, **`spec`**. The acceptance criteria (`verifyOnScreen`) are **not** in the build args — the build agents self-check via their surgical tests only; the acceptance verdict belongs to Phase 5 / reflect.

### 3.2a — OPT-IN → launch the build workflow

**Do NOT write a workflow script.** The build orchestration is the reviewed, smoke-tested `build-iteration.workflow.js`; authoring a fresh one per iteration reintroduces bugs (wrong runtime form; `args` not arriving). Launch the canonical script with the build-args **inlined** — the `args` parameter does NOT reliably reach a workflow, so never depend on it:

1. **Read** the canonical script by absolute path: `~/.claude/commands/devmeta-ng/workflows/build-iteration.workflow.js` (expand `~` to the home dir; if this project has a local `.claude/commands/devmeta-ng/`, prefer that). If the read fails, that is an install problem — surface it; do **not** hand-author a substitute.
2. In the text you read, find the single line marked `// <<< INLINE POINT` and replace **that entire line** with your build-args as a JS literal (the `runStamp` is the current ISO time — the script body has no clock):
   `const input = { iteration: "<NN.M>", runStamp: "<ISO now>", baseBranch: "<base>", contextLog: "<path>", waves: [ [ { featureId, title, description, branch, tasks: [ { taskId, title, acceptance, detail } ], test, spec, notes }, … ], … ] };`
   Change nothing else.
3. **Launch** the edited text: `Workflow({ script: <the edited text> })`. Do **not** pass `args`; do **not** use `scriptPath` (you edited the text in memory).
4. Await the single returned value: the per-feature build manifest (`featureId → { branch, prUrl|"" , tasks[], status, headSha, contextNotes, blockers[] }`). Awaiting each wave's pipeline result is the wave barrier inside the script.

### 3.2b — FALLBACK → parallel feature fan-out

Follow the fallback procedure in `/devmeta-ng:run`: for each dependency wave in `waves[][]`, spawn one Agent per feature in a single parallel batch (each agent cuts and pushes its own branch, completes its tasks in order with surgical tests, commits per task, opens a PR targeting the base branch, updates `tk`), await the wave barrier, then start the next wave. Collect the **same** manifest shape as 3.2a. The agent prompt is identical to the workflow's feature-agent prompt — that is what keeps the paths comparable.

### 3.3 — Postcondition (both paths)

Either path leaves: `tk` updated by the feature agents, one feature branch (and usually one PR) per feature, surgical tests green per feature. `go` itself wrote nothing to git/fs on the workflow path (3.2a) — only spawned agents did.

## Phase 4: Integrate — PR + Merge + Metadata (effort: high; go's own session)

1. For any feature whose agent did not already open a PR, open it (targeting the base branch from `<increment-dir>/base-branch`).
2. Ensure CI is green on each PR; merge each with `--merge` (preserve branch history — **never** `--squash` / `--rebase`) into the base branch, in wave/dependency order.
3. Return to the base branch. Commit accumulated metadata directly on base (effort: medium):
   ```bash
   git add .tick/ .devmeta/
   git status --short                 # verify only metadata files staged
   git commit -m "Update .tick/ and .devmeta/ metadata for iteration N"
   git push origin <base>             # publish base — the NEXT iteration's agents branch from origin/<base>
   ```
   `.tick/` and `.devmeta/` change during the run but live on base, not in feature PRs — committing them here prevents dozens of dirty files accumulating across iterations. This commit goes directly on base; no PR is needed for metadata-only changes. **Push the base** so `origin/<base>` stays current; the next iteration's worktree agents branch from it, and 3.1 will refuse to proceed if it is stale. (If you merged the feature PRs on GitHub rather than locally, `git pull` the base first so the merge commits and the metadata commit travel together.)
4. Close the iteration epic N in `tk`. `tk next` → the I&A iteration `NN.1R`.
5. **Full typecheck/build ONCE here (not per feature):** after the merges, run the project's full build/typecheck (e.g. `yarn build` / `tsc`) on the base and fix any cross-feature type errors before closing the iteration. Feature agents run only their surgical tests, so this is the single place the whole tree is type-checked — far cheaper than N redundant per-feature builds.

**Integration safety (worktrees + staging — learned the hard way):**
- **Reconcile tk from the returned build manifest** as a backstop: for each feature, ensure its closed tasks are closed in `tk` on base. Feature agents commit their `.tick/` closures on-branch, but verify after merge — a tk closure left only in a pruned worktree is lost.
- **Stage only scoped paths** (`git add .tick/ .devmeta/` and named source). **NEVER `git add -A` / `git add .`** during integrate — it sweeps feature worktrees and other untracked files into the commit.
- **Remove feature worktrees with `git worktree remove <path>`** (or `git worktree prune`). **NEVER `rm -rf` a worktree** — a `node_modules` junction inside it can make `rm -rf` follow back into the parent repo.
- Ensure the project's `.gitignore` excludes the worktree directory (e.g. `.claude/worktrees/`).

## Phase 5: Reflect / I&A (effort: xhigh)

1. Run `/devmeta-ng:reflect N` — the adversarial acceptance-verification cycle: N skeptics per scope item versus the iteration's "Verify on screen" criteria, plus one consistency-vs-principles lens; it converges and returns findings. **DevMeta owns the criteria** — they are passed into reflect, never invented by it.
2. `go` consumes the returned findings and performs the memory promotion (effort: high): update `.devmeta/project-history.md`, `.devmeta/lessons-learned.md`, and `docs/current/principles-and-choices.md`. The criteria ownership and the memory-promotion + scope decision belong to DevMeta, not to any workflow.
3. **Advance the ledger** (effort: medium):
   - findings clean & scope remains → close I&A iteration `NN.1R`; loop to Phase 2 for iteration N+1.
   - findings reveal a gap → **inject a remediation iteration** (scope can grow, never shrink); close `NN.1R`; loop.
   - a scope item has **no acceptance criteria** → it is **not closed**; route it to a **human criteria-authoring step** (outside the code-fix loop — you cannot fix code to satisfy a missing bar). Surface it in the completion report.
   - no scope items remain in the increment → fall to Phase 6.

## Phase 6: Increment Complete → STOP (the ONLY stop; effort: low)

1. Verify every current-increment iteration is closed against `_overview.md` exit criteria.
2. Write a short completion report: what shipped, PRs merged, any human-in-the-loop items (e.g. live verification that needs the user's machine; any scope items routed to human criteria-authoring).
3. **STOP.** Do NOT bootstrap or pick the next increment — that is a human priority call (often `/devmeta-ng:start-increment-spec`). The user re-invokes `go` for the next one.

## Core Rules

**Scope cannot shrink.** You may split, merge, reorder, or inject iterations and features. You may NOT remove scope items. If something is hard, work harder or ask for help; if it takes longer, it takes longer. Only the human cuts scope. Scope can grow (bugs, discovered gaps) but never shrink.

**Tests gate, in two owned places.** Per-feature green-before-commit lives inside the build (each agent runs its surgical test until green and never closes a task with failing tests — there is no "known failure" state). The acceptance gate is the reflect cycle in Phase 5. There is no separate `go`-level "keep testing" pulse — verification is structural.

**Always read the base branch from `<increment-dir>/base-branch`** — never assume `main`. Feature branches are cut from it, PRs target it, and the I&A iteration runs on it. Always merge with `--merge` so branch history stays visible in the git graph.

**The increment is the unit of the run; its completion is the only stop.** Iteration boundaries, PR merges, and I&A cycles are waypoints handled by the loop's structure, not stopping points. When the increment closes, stop and report; do not select the next increment.
