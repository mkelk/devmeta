# devmeta-ng â€” Engine Rework for Opus 4.8

**Status:** Draft spec for review. This is a design document, not the command files.
**Scope:** Improve the devmeta *engine* (`go`, `plan-iteration`, `run`, `reflect`) and adapt it to Opus 4.8 + Dynamic Workflows. The increment-definition workflow (numbering, `_overview.md`, `start-increment-spec`, `status`) and the memory docs are **kept unchanged** â€” they are the retained moat.
**Namespace:** `devmeta-ng` is a placeholder (rename to `devmeta48` or similar at build time â€” it is only a directory name + slash prefix).

## Provenance & how to read this

This spec was drafted by 7 parallel agents (one per section) and then reviewed by 3 adversarial verifiers (build-script API check, reflect-script + moat-protection check, cross-section coherence review). The verifiers found cross-section drift and four high-severity integration issues. **Part I below is normative and records the canonical resolution of every flagged issue. Part II is the detailed per-section design. Where Part II conflicts with Part I, Part I governs.**

The guiding frame is Han Heloir's five-layer harness model applied to Opus 4.8:

| Layer | 4.8 status | devmeta-ng treatment |
|---|---|---|
| L1 Constraint (effort/routing) | **absorbed** (effort dial) | adopt the dial; build no routing |
| L2 Context (memory/retrieval) | **moat** | keep + strengthen memory docs |
| L3 Execution (orchestration) | **absorbed** (Dynamic Workflows) | hand fan-out to a workflow |
| L4 Verification (generic critic) | **absorbed** (weights + loop) | delete generic critic; keep domain checks |
| L5 Lifecycle (acceptance/def-of-done) | **moat** | keep; reflect *powers* it, never owns the criteria |

---

# Part I â€” Normative reconciliation (governs Part II)

### N1. Effort ladder (canonical) â€” resolves the 3-vocabulary drift
The L1 dial uses one ladder everywhere: **`low / medium / high / xhigh / max`**. Replace every `extra` in Part II with `xhigh`; ignore Section 3's `xhigh`-only subset.

| Phase / activity | Tier |
|---|---|
| Assess ledger, base branch, env checks | `low` |
| Mechanical seams (metadata commit, status, ledger advance) | `medium` |
| Plan iteration, integrate (PR/merge) | `high` |
| **The partition cut**, **the reflect acceptance fan-out** | `xhigh` |
| Reserved for high-cost-of-failure refactors | `max` |

> Honesty caveat: the exact literal tier names must be confirmed against the installed Claude Code version. The Opus 4.8 article names the Claude Code tiers `low / high / extra / max`; this spec standardizes on the `medium`/`xhigh` naming used by the config section (Section 6). If the build uses the article's literals, map `mediumâ†’`(omit)/`xhighâ†’extra` at implementation time. The *assignment of effort to phase* is what matters and is fixed above.

### N2. Launcher model (canonical) â€” resolves the go-vs-run contradiction
**`go` Phase 3 is the single launcher and decision point.** On opt-in it emits + launches the build workflow; otherwise it runs the fan-out fallback. **`run.md` is retained only as the documented fallback fan-out procedure** that Phase 3's non-workflow branch follows â€” it is **not** a second workflow launcher. Section 4's opening ("`/devmeta-ng:run` â€¦ launches the script") is superseded: read it as "**go Phase 3** emits/launches the script."

### N3. Feature Manifest â†’ build-args contract (canonical) â€” resolves the un-buildable mismatch
There is **one** plan artifact and **one** named transform owner:

- **`plan-iteration` emits the flat manifest** (the human/tk-facing artifact in Section 3.4): `{ increment, iteration, baseBranch, contextLog, verifyOnScreen, features:[{name, epicId, wave, scope, files, dependsOn, test, spec}] }`.
- **`go` Phase 3 owns the serialize-and-group transform** that turns the flat manifest into the build workflow's `args`. The transform: reads each feature's ordered tasks from tk, derives the branch name, groups features into waves by `dependsOn`, and renames fields to the build vocabulary.

**Canonical build-args shape (the only shape the build workflow consumes):**
```jsonc
{
  "iteration": "76.1",
  "runStamp": "2026-05-31T...",        // injected; workflows have no clock (N9)
  "baseBranch": "2026-05-31-doc-management",
  "contextLog": ".devmeta/projects/.../context-log.md",
  "waves": [                            // grouped; one parallel frontier per element
    [ { "featureId": "tk-1042",        // == tk epic id (was "epicId"/"name" drift)
        "title": "foundation",
        "description": "Shared types, audit schema, storage layer",
        "branch": "feature/2026-05-31-foundation",
        "tasks": [ { "taskId": "tk-1051", "title": "...", "acceptance": "...", "detail": "..." } ],
        "test": "pnpm vitest run src/db/exportStore.test.ts",
        "spec": ".devmeta/projects/.../spec.md",
        "notes": "" } ],
    [ { "featureId": "tk-1043", "title": "pdf-renderer", ... }, { "featureId": "tk-1044", ... } ]
  ]
}
```
Field-name law: **`featureId`** (= tk epic id), **`title`**, **`description`**, **`branch`**, **`tasks[]`**, **`test`**, **`spec`**. The flat manifest's `name`â†’`title`, `scope`â†’`description`, `epicId`â†’`featureId`; `wave`+`dependsOn` collapse into the `waves[][]` grouping.

### N4. Reflect lenses (canonical) â€” resolves the moat violation (the important one)
The reflect workflow runs **only domain-anchored checks**:
1. **Adversarial acceptance fan-out** â€” skeptics vs. the iteration's `verifyOnScreen` criteria. Criteria are **passed in, never invented** by the workflow (inventing them re-absorbs the L5 moat).
2. **One consistency-vs-principles lens** â€” fed `docs/current/principles-and-choices.md`.

**DROP the generic `correctness` and `drift` lenses from reflect.** Those are the absorbed generic critic; a single generic critic pass already runs per-feature inside the **build** workflow's verify stage (Section 4.1, `verifySchema`). Section 5's prose claiming all three lenses are "L4-domain" is corrected: only the consistency lens is.

### N5. Diverse skeptics â€” strengthens the adversarial pass
The N acceptance skeptics per scope item get **distinct angles**, not identical prompts: e.g. (a) happy-path delivery, (b) edge/error path, (c) does-the-artifact-actually-exist-and-run. Keep the implemented `default-to-refuted`, `crashâ†’pessimistic`, `tieâ†’not-closed` rules. (Per the Workflow tool's perspective-diverse-verify guidance â€” identical adversaries correlate and miss the same gap.)

### N6. Read-only verifiers + pinned ref
Reflect skeptics/lenses are **read-only** â†’ do **not** use `isolation:'worktree'` for them (worktrees isolate writes, not reads, and not ports). The ref to verify (the merged base-branch HEAD after the iteration merge) is passed in `args.verifyRef` and pinned. `verifyOnScreen` commands that start servers/bind ports are run **serially**, or the port-collision risk is noted (worktrees don't isolate ports).

### N7. Empty/absent criteria are failures, not clean passes
- `args.scopeItems` empty â†’ the workflow returns a **`blocked`/error** result, never a clean `{findings:[]}`. A harness that verifies nothing must not look like "all closed."
- A scope item with **no acceptance criteria** â†’ verdict `not-closed`, routed to the **human criteria-authoring step** (an L5 act), explicitly **outside** devmeta's code-fix loop. You cannot fix code to satisfy a missing bar, and the workflow must never author the bar itself.

### N8. `verifyOnScreen` stays out of the build
It is **not** passed to the build workflow args. Build feature-agents self-check via their **surgical tests** only; the acceptance **verdict** against `verifyOnScreen` is reflect's alone. Remove the vestigial `verifyOnScreen` from build args in Sections 2/3. (This keeps the L4-generic / L5-domain boundary crisp â€” the entire point of the rework.)

### N9. Canonical names
- Files: `workflows/build-iteration.workflow.js`, `workflows/reflect-iteration.workflow.js`.
- `meta.name`: `devmeta-ng-build-iteration`, `devmeta-ng-reflect-iteration`.
- Injected timestamp arg: **`runStamp`** everywhere (was `date`/`runTimestamp`). The clock ban applies to the **script body only**; spawned agents may read the clock â€” `runStamp` is for determinism, not because agents can't.
- `agentType`: build feature-agents `tk-worker`; reflect skeptics/lenses + build verify-agent `general-purpose`.
- Reflect/I&A iteration is written **`NN.1R`** everywhere (not bare `NR`).

### N10. pipeline-as-barrier (clarification â€” the code is correct)
`await pipeline(wave, build, verify)` resolves only after every feature in the wave clears **both** stages; that awaited completion **is** the wave barrier (the next wave starts after it). Section 4's code is correct; only its prose mislabels it a "`parallel()` barrier." Canonical wording: "awaiting the wave's pipeline result is the barrier." The buildâ†’verify pipeline still has no *inter-stage* barrier, so a fast feature is verified while a slow sibling still builds.

### N11. Resume-classifier gap
`go` Phase 0.4: landing on a reflect iteration `NN.1R` **with no children yet** â†’ create its single `Run /devmeta-ng:reflect N` task, then proceed. (Restores the dropped "create its tasks" branch.)

### N12. `migrate-from-adapt.md`
Intentionally **not** carried into devmeta-ng â€” migration is the legacy engine's one-time concern.

## Build order (when you green-light implementation)
1. Copy `start-increment-spec.md`, `status.md`, `README.md` (re-headed) â€” the unchanged moat surface.
2. Write `go.md` (Part II Â§2) with the Phase-3 launcher + the N3 transform.
3. Write `plan-iteration.md` (Â§3) emitting the flat manifest; keep the partition constraints, drop the recipe.
4. Write `workflows/build-iteration.workflow.js` (Â§4) with the N8/N10 corrections.
5. Write `workflows/reflect-iteration.workflow.js` (Â§5) with the N4â€“N7 corrections.
6. Add the `## Effort` block to `.devmeta/devmeta.md` (Â§6, N1 ladder).

---

# Part II â€” Detailed design (generated sections)

> The following seven sections are the per-agent drafts, lightly assembled. Read them through the lens of Part I â€” the normative decisions above supersede any drift here (effort vocab, launcher, manifest shape, reflect lenses, names).

## 1. Command set, file layout, and coexistence

### 1.1 Namespace

The new engine ships as a parallel command set under the placeholder namespace **`devmeta-ng`**, installed at `~/.claude/commands/devmeta-ng/`. Commands are therefore invoked as `/devmeta-ng:go`, `/devmeta-ng:plan-iteration`, etc.

The namespace is **renameable** Ã¢â‚¬â€ it is a directory name and a slash-prefix, nothing more. The intended final name is **`devmeta48`** (signalling the Opus 4.8 harness rework), but any single token works. Renaming is a directory move plus a find-and-replace of the `devmeta-ng:` prefix in the four cross-referencing command bodies; no artifact, ledger, or numbering change is implied (see Ã‚Â§1.4). Throughout this SPEC `devmeta-ng` is used; substitute the final token at build time.

The existing `devmeta/` directory is **left byte-for-byte untouched**. Both command sets are installed simultaneously and resolve independently, which is what makes the A/B comparison possible (Ã‚Â§1.3).

### 1.2 File-by-file layout

The new command set lives entirely in `~/.claude/commands/devmeta-ng/`. Four engine files are reworked; three are reused verbatim from `devmeta/`.

| File | Status | Harness layer touched | Note |
|------|--------|----------------------|------|
| `go.md` | **REWRITTEN** | L1 dial + L3 launch seam | Stays a plain, resumable outer loop driving one increment. Strips the anti-drift willpower prose (never-stop / re-ground / last-task-=-first-task) now covered by workflow checkpoint-resume. Execution step gains a fork: launch the per-iteration **build workflow** on opt-in, else fall back to parallel per-feature Agents. Adds the effort dial (low/high/extra/max). Loop, ledger reads, base-branch handling, increment-close/STOP semantics unchanged in spirit. |
| `plan-iteration.md` | **REWRITTEN** | L2 (context) reinvestment | Same job Ã¢â‚¬â€ graph-partition scope into independent features + sequential tasks. Reworked to emit a clean, machine-consumable iteration plan (feature list, dependency waves, per-feature spec pointer, the iteration's "Verify on screen" criteria) that both execution paths and the reflect workflow consume. No micromanaged orchestration prose. |
| `run.md` | **REWRITTEN** | L3 (execution) deletion | The fallback (non-workflow) executor: one subagent per feature, parallel across independent waves, sequential tasks within. Micromanaged wave-orchestration prose deleted; the model self-orchestrates the fan-out. Git/PR/tk side effects stay inside feature agents. This is the path taken when the user has **not** opted into a workflow. |
| `reflect.md` | **REWRITTEN** | L4-domain + L5 reinvestment | Becomes the I&A engine that, on opt-in, launches the **reflect workflow**: an adversarial acceptance-verification fan-out (N skeptics per scope item against "Verify on screen", plus a code-quality lens panel) that converges and returns findings. The generic code-critic is deleted (model self-flags 4x better). devmeta retains ownership of the acceptance criteria and the memory-promotion step (history / lessons / principles), which run in the loop after the workflow returns. Falls back to inline I&A when not opted in. |
| `workflows/build-iteration.workflow.js` | **NEW** | L3 substrate | Dynamic Workflow wrapping a **single iteration's** feature fan-out. Launched by `go.md`. Body is pure-literal `meta` + `parallel`/`pipeline` over features; all FS/git/tk effects occur inside spawned agents. See execution-substrate section. |
| `workflows/reflect-iteration.workflow.js` | **NEW** | L4-domain / L5 substrate | Dynamic Workflow for the adversarial reflect fan-out launched by `reflect.md`. Returns converged findings only; criteria ownership + memory promotion stay in `reflect.md`. |
| `start-increment-spec.md` | **REUSED-UNCHANGED** | L5 moat | Copied verbatim from `devmeta/`. Defines increments, numbering (`increment-NN-XXX`, iterations `NN.1`/`NN.1R`), `_overview.md`, exit criteria. Only the `devmeta-ng:` self-references in its closing "Ready forÃ¢â‚¬Â¦" report differ (thin edit, Ã‚Â§1.5). |
| `status.md` | **REUSED-UNCHANGED** | (read-only) | Copied verbatim. Read-only progress report over the same `.devmeta/` + tk state; safe to run against either engine. Only its suggested-next-action commands name the namespace (thin edit, Ã‚Â§1.5). |
| `README.md` | **REUSED-UNCHANGED (lightly re-headed)** | docs | Same content/structure as `devmeta/README.md`; title, install path, and command examples renamed to the new namespace, plus one added paragraph noting the hybrid execution substrate and the opt-in `workflow`/`ultracode` keyword. |

There is **no** `migrate-from-adapt.md` in the new set Ã¢â‚¬â€ migration is a one-time historical concern owned by the existing `devmeta/` engine and is out of scope here.

### 1.3 Coexistence model

The two engines are **siblings over one shared state**. Nothing in the new engine forks the data plane:

- **Same `.devmeta/` artifacts.** `current-increment.md`, `project-history.md`, `lessons-learned.md`, `docs/current/principles-and-choices.md`, `increments/increment-NN-XXX/_overview.md`, the `iterations/` and `ia-cycles/` status files, `projects/` feature specs + `context-log.md`, and `<increment-dir>/base-branch` are all read and written by both engines, in the same formats and locations.
- **Same `tk` ledger.** Identical mapping (`tk -t epic` = Feature, `tk -t task` = Task), identical cross-increment ledger, identical iteration/feature/task hierarchy. A run started by one engine is resumable by the other, because state lives in `tk`, not in either command.
- **Same increment numbering.** `increment-NN-XXX`; iterations `NN.1` / `NN.1R`. Both engines increment, name, and close increments identically.

Because the data plane is shared and the numbering is identical, a user can drive the **same project** with either engine and compare them directly Ã¢â‚¬â€ e.g. run increment 12 with `/devmeta:go` and increment 13 with `/devmeta-ng:go`, or pause one engine mid-increment and resume with the other. The only divergence is the **engine behaviour** (effort dial, workflow vs. inline fan-out, adversarial reflect), never the recorded state. This is the A/B harness: a controlled experiment with the artifacts as the shared substrate.

One operational note for A/B integrity: do not run both engines concurrently against the same increment/branch (they would race on `tk` and git). A/B comparison is sequential or per-increment, not simultaneous.

### 1.4 Thin wrappers needed

- **Namespace self-references.** `go.md`, `plan-iteration.md`, `run.md`, and `reflect.md` cross-invoke each other and name commands in prose (e.g. "Run `/devmeta:plan-iteration N`"). Each such reference is rewritten to `/devmeta-ng:Ã¢â‚¬Â¦`. This is the only edit the rewritten files inherit purely from the rename; their substantive changes are described in Ã‚Â§1.2.
- **Workflow launch shims.** `go.md` and `reflect.md` each need a small, explicit "if the user opted in (`workflow`/`ultracode` keyword present), launch `<file>.workflow.js` with these args; else run the inline path" block. These are thin routing wrappers in the command body Ã¢â‚¬â€ they hold no domain logic and no FS/git/tk side effects (those are forbidden in the script body and live in agents / the post-return loop).
- **Reused-file re-heading.** `start-increment-spec.md` and `status.md` need only their trailing suggested-command/report lines re-namespaced (one to three lines each). `README.md` needs its title/path/examples re-namespaced plus the one hybrid-substrate paragraph. No logic changes.

### 1.5 Out of scope (the kept moat)

Explicitly **not** redesigned or duplicated with new behaviour in this SPEC Ã¢â‚¬â€ these are the retained L2 + L5 moat and are reused verbatim (modulo the namespace re-heading above):

- Increment definition, numbering, and suffix scheme (`increment-NN-XXX`; iterations `NN.1` / `NN.1R`).
- `_overview.md` structure, scope/exclusion tables, iteration map, and exit criteria.
- `start-increment-spec` and `status` command logic.
- The memory documents: `project-history.md`, `lessons-learned.md`, `docs/current/principles-and-choices.md`.
- The cross-increment ledger in `tk` and the `tk`Ã¢â€ â€™devmeta entity mapping.

These layers define "what to build" and "what counts as done"; the rework in Ã‚Â§1.2 only changes "how the engine builds and verifies it."

---

## 2. The `go` Loop (Redesigned)

`/devmeta-ng:go` is the **outer loop** and the only command the user invokes directly. It is deliberately *thin*: it owns the increment ledger (in tk) and the cross-iteration seams (plan Ã¢â€ â€™ build Ã¢â€ â€™ PR/merge Ã¢â€ â€™ reflect Ã¢â€ â€™ advance), and it delegates everything inside an iteration's build either to a **per-iteration workflow** or to a **parallel feature fan-out**. It is fully resumable: every state transition is committed to tk, so re-invoking `go` always resumes from the true next step.

The increment is the unit of a `go` run. **Increment completion is the only stopping point.** Iteration boundaries, PR merges, and I&A cycles are waypoints, not stops Ã¢â‚¬â€ but unlike the current engine, this is now a *structural* property of the loop (each iteration's build is a checkpoint-resumable workflow, and the ledger advance is a single tk transition), not a willpower instruction the model must obey.

### 2.1 What the loop owns vs. delegates

| Concern | Owner |
|---|---|
| Increment ledger, iteration ordering, resume point | **go (this loop)** Ã¢â‚¬â€ via tk |
| Base branch (per-increment `base-branch` file) | **go** Ã¢â‚¬â€ Phase 0.5 (unchanged) |
| Iteration planning (scope Ã¢â€ â€™ feature specs Ã¢â€ â€™ tick structure) | `/devmeta-ng:plan-iteration` (Section 3) |
| Iteration **build** (feature fan-out, branch/commit/PR-per-feature) | **Hybrid**: per-iteration *workflow* OR *parallel Agents* (Section 4) |
| PR aggregation + merge to base + metadata commit | **go** (the seam between build and reflect Ã¢â‚¬â€ runs in `go`'s own session, after the build returns) |
| Adversarial acceptance verification + memory promotion | `/devmeta-ng:reflect` workflow (Section 6) |
| Effort tier per phase | **go** selects; see 2.5 |

The build substrate (workflow vs. Agents) is the *only* thing that varies between the two paths. The ledger, planning, the PR/merge seam, and reflect are byte-for-byte identical on both Ã¢â‚¬â€ which is what makes the two engines A/B comparable.

### 2.2 The loop as numbered pseudo-steps

```
/devmeta-ng:go

  Phase 0 Ã¢â‚¬â€ ASSESS LEDGER STATE (effort: low)
    0.1 Read .devmeta/current-increment.md Ã¢â€ â€™ active increment dir.
    0.2 tk list --all --status all        Ã¢â€ â€™ full ledger (iterations/features/tasks).
    0.3 tk next                            Ã¢â€ â€™ the single next action.
    0.4 Classify the resume point from tk next (NOT from prose/markdown):
          - a TASK            Ã¢â€ â€™ execute it, then re-run tk next  (rare seam tasks only; see note)
          - an iteration WITH children, open     Ã¢â€ â€™ it is mid-build Ã¢â€ â€™ go to Phase 3 (EXECUTE)
          - an iteration WITHOUT children         Ã¢â€ â€™ go to Phase 2 (PLAN)
          - an I&A iteration                       Ã¢â€ â€™ go to Phase 5 (REFLECT)
          - nothing, all increment iterations closed Ã¢â€ â€™ go to Phase 6 (STOP)
          - no ticks at all                         Ã¢â€ â€™ BOOTSTRAP: read _overview.md,
                                                       create one top-level iteration epic
                                                       per planned iteration, then tk next.

  Phase 0.5 Ã¢â‚¬â€ ESTABLISH BASE BRANCH (effort: low)   [UNCHANGED from current engine]
    0.5.1 If <increment-dir>/base-branch exists Ã¢â€ â€™ read it; git rev-parse --verify it.
    0.5.2 If absent (first run for this increment) Ã¢â€ â€™ the ONE permitted question:
            ask user to use current branch or cut a new one; write the choice to
            <increment-dir>/base-branch.
    (Every later phase reads the base branch from this file Ã¢â‚¬â€ never assume `main`.)

  Phase 1 Ã¢â‚¬â€ ENVIRONMENT CHECK (iteration 1 / on demand, effort: low)
    Run .devmeta/devmeta.md > Environment checks if present; else skip. Test, don't ask.

  Ã¢â€â‚¬Ã¢â€â‚¬ ITERATION LOOP (repeat until Phase 6 fires) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

  Phase 2 Ã¢â‚¬â€ PLAN ITERATION N (effort: high)
    2.1 Invoke /devmeta-ng:plan-iteration N.
        It creates the build tick structure: Feature epics under the iteration,
        ordered Task ticks under each feature, cross-feature blocked_by edges
        (the execution-wave graph), and the feature specs + context-log.md.
    2.2 Create the paired I&A iteration tick NR (epic, blocked_by N) with a single
        child task: "Run /devmeta-ng:reflect N".
        (NOTE: NR no longer carries a "Plan Iteration N+1" task Ã¢â‚¬â€ see 2.4 / Deletions.)
    2.3 tk next Ã¢â€ â€™ fall through to Phase 3.

  Phase 3 Ã¢â‚¬â€ EXECUTE THE BUILD (hybrid; effort: high or extra) Ã¢Ëœâ€¦ the fork Ã¢Ëœâ€¦
    3.1 Detect workflow opt-in (see 2.3).
    3.2a OPT-IN  Ã¢â€ â€™ launch the PER-ITERATION BUILD WORKFLOW (Section 4) with args =
                   { incrementDir, baseBranch, iterationId, features:[{epicId, branch,
                   tasks, specRef}], contextLogPath, testCmd, verifyOnScreen, date }.
                   Wait for its single returned value: the per-feature build manifest
                   (feature Ã¢â€ â€™ {branch, prNumber|null, tasksClosed, status, notes}).
    3.2b FALLBACK Ã¢â€ â€™ run the parallel feature fan-out (Section 4): for each execution
                   wave, create+push each feature branch, spawn one Agent per feature
                   in a single batch (isolation:'worktree'), await the barrier, collect
                   the same manifest shape.
    3.3 Either path leaves: tk updated by the feature agents, one feature branch (and
        usually one PR) per feature, tests green per feature. go ITSELF wrote nothing
        to git/fs in 3.2a (workflow script bodies cannot Ã¢â‚¬â€ only spawned agents can).

  Phase 4 Ã¢â‚¬â€ INTEGRATE: PR + MERGE + METADATA (effort: high)   [go's own session]
    4.1 For any feature whose agent did not already open a PR, open it (targeting the
        base branch from <increment-dir>/base-branch).
    4.2 Ensure CI is green on each PR; merge each with `--merge` (preserve branch history;
        never --squash/--rebase) into the base branch, in wave/dependency order.
    4.3 Return to base branch. Commit accumulated metadata directly on base:
            git add .tick/ .devmeta/ ; git commit -m "Update metadata for iteration N"
        (.tick/ and .devmeta/ changed during the run but live on base, not in feature PRs.)
    4.4 Close the iteration epic N in tk. tk next Ã¢â€ â€™ the I&A iteration NR.

  Phase 5 Ã¢â‚¬â€ REFLECT / I&A (workflow; effort: extra)
    5.1 Run /devmeta-ng:reflect N Ã¢â‚¬â€ the adversarial acceptance-verification workflow
        (Section 6): N skeptics per scope item vs. the iteration's "Verify on screen"
        criteria + a code-quality lens panel; returns converged findings.
    5.2 go consumes the returned findings: promote learnings to the memory docs
        (project-history.md, lessons-learned.md, principles-and-choices.md), andÃ¢â‚¬â€
        cruciallyÃ¢â‚¬â€DECIDE the ledger consequence (5.3). devmeta, not the workflow,
        owns the criteria and the memory-promotion + scope decision.
    5.3 ADVANCE THE LEDGER (effort: low):
          - findings clean & scope remains   Ã¢â€ â€™ close I&A iteration NR; loop to Phase 2
                                                for iteration N+1.
          - findings reveal a gap            Ã¢â€ â€™ inject a remediation iteration (scope can
                                                grow, never shrink); close NR; loop.
          - no scope items remain in increment Ã¢â€ â€™ fall to Phase 6.

  Phase 6 Ã¢â‚¬â€ INCREMENT COMPLETE Ã¢â€ â€™ STOP (effort: low)   [the ONLY stop]
    6.1 Verify every current-increment iteration is closed against _overview.md exit criteria.
    6.2 Write a short completion report: what shipped, PRs merged, any human-in-the-loop
        items (e.g. live verification that needs the user's machine).
    6.3 STOP. Do NOT bootstrap or pick the next increment Ã¢â‚¬â€ that is a human priority call
        (often /devmeta-ng:start-increment-spec). The user re-invokes go for the next one.
```

> **Seam tasks note (0.4):** PR/merge/metadata are executed by `go` *in Phase 4*, not as separate tick tasks the way the current engine encodes them. The "rare TASK" branch in 0.4 exists only for backward-compatible resume and for any project-specific seam tasks `plan-iteration` chose to materialize; the default `devmeta-ng` plan does not create "Create PR" / "Merge PR" / "Commit metadata" / "Re-ground" task ticks at all (see Deletions).

### 2.3 Detecting the workflow opt-in (the fork in Phase 3)

The substrate is chosen **per `go` run**, deterministically, with no extra questions:

1. **Workflow path** is taken if *either* signal is present:
   - the invocation arguments to `go` contain the **`workflow`** keyword (e.g. `/devmeta-ng:go workflow`); **or**
   - an **`ultracode`** opt-in is active for this run (surfaced as a system-reminder in the session).
2. **Otherwise** Ã¢â€ â€™ the **Agent fan-out fallback**.

`go` records the chosen substrate in the run log (`log("substrate=workflow|agents")`) and in a tk note on the iteration epic, so a resumed run on a different invocation can report which path produced the existing branches. The choice does **not** change the ledger, the tick structure, the branch-naming convention, the PR/merge seam, or reflect Ã¢â‚¬â€ only *who* fans the features out. Because Workflows require explicit per-run user opt-in by design, the absence of the keyword/`ultracode` is itself the fallback trigger; `go` never silently launches a workflow.

### 2.4 Within-run continuity: what structurally replaces the willpower

The current engine keeps the agent from stopping mid-increment with **prose willpower**. The redesign removes that prose and replaces each instruction with a *structural* mechanism:

| Old willpower instruction (current `go.md`) | Structural replacement in `devmeta-ng` |
|---|---|
| "**Never stop** / work continues until it succeeds" (within-increment) | The iteration build is a **checkpoint-resumable workflow** (or a barrier'd Agent batch); the iteration loop in 2.2's pseudo-steps is an explicit `FOR`. There is no in-loop decision point to stop at. |
| "**Never summarize / never present a status update** within an increment" | The workflow returns **only its final manifest value** to the session; intermediate progress lives in the journal, not as chat summaries. There is nothing to "present" between waves. The Agent fallback's `parallel()` barrier likewise yields one collected result, not a per-wave hand-back. |
| "**Re-ground after every feature**" (a mandatory last task in every feature) | Deleted. Per-feature isolation (`isolation:'worktree'`) + the feature spec + `context-log.md` already scope each feature's context; the workflow boundary re-establishes ground truth at the *iteration* level when it returns. No per-feature re-ground task. |
| "**Last I&A task = first task of next iteration**" (continuity hack to bridge the boundary the agent stopped at) | Deleted. The **per-iteration workflow boundary** is the new seam: when the build workflow returns, `go`'s own `FOR` loop proceeds to Phase 4Ã¢â€ â€™5Ã¢â€ â€™2 without a tick "bridge". I&A iteration NR carries only "Run /devmeta-ng:reflect N"; **Phase 2 of the next loop turn does the planning**, driven by the loop, not by a disguised task. |
| "If you haven't run tests in 3 tasks, something is wrong" / "tests are the heartbeat" | Deleted as a `go`-level nag. Verification moves to two owned places: per-feature green-before-commit (inside the build), and the **reflect acceptance workflow** (Section 6) as the gate. The generic "keep testing" pulse is absorbed. |

**Cross-session resume** is unchanged in spirit and is the third leg: tk is the durable ledger. Re-invoking `go` after a crash/quit re-enters at Phase 0 and `tk next` yields the true resume point. *Within* a single run, the workflow journal handles resume of an interrupted build (re-launching `go` re-attaches to or replays the journaled workflow rather than re-spawning completed features).

### 2.5 Effort tiers per phase (the L1 dial)

`go` selects an effort tier per phase rather than running everything at one setting:

| Phase | Tier | Rationale |
|---|---|---|
| 0 Assess, 0.5 Base branch, 1 Env | **low** | Mechanical reads of tk + one file; cheap, deterministic. |
| 2 Plan iteration | **high** | Scope partitioning / feature-boundary design is the highest-leverage thinking. |
| 3 Execute build | **high** (per feature) / **extra** for the whole iteration when `ultracode`/`workflow` opt-in is present | The opt-in signal that selects the workflow substrate also raises the build tier; individual feature agents inherit `high` via the workflow `model`/effort opts. |
| 4 Integrate (PR/merge/metadata) | **high** | Merge-order and conflict reasoning matters, but it is bounded mechanical work. |
| 5 Reflect | **extra** | Adversarial multi-skeptic acceptance verification is where false-victory is caught; spend here. |
| 5.3 Advance ledger / 6 Stop | **low** | A single tk transition + a short report. |

### 2.6 Deletions from the current `go.md` (deletion-first)

Removed outright (absorbed layers Ã¢â‚¬â€ willpower and micromanagement the model/workflow now handle):

- **The entire "Iteration Rhythm" willpower block** describing "the boundary where the agent historically stops" and the *last-I&A-task-equals-first-task-of-next-iteration* trick (current `go.md` lines ~45Ã¢â‚¬â€œ113). Replaced by the explicit iteration `FOR` loop + per-iteration workflow boundary (2.2, 2.4).
- **"Re-ground after Feature X" as a mandatory last task in every feature** (current feature tick template). Worktree isolation + spec + context-log replace it.
- **The "Never stop / Never ask should-I-continue / Never present a summary within an increment" Critical Rules** (current `go.md` lines ~187Ã¢â‚¬â€œ195, the willpower paragraphs). The structural loop + single-return-value workflow make these unnecessary; only the *increment is the stop* rule survives, now expressed as Phase 6.
- **"Run tests constantly / tests are the heartbeat / if you haven't tested in 3 tasksÃ¢â‚¬Â¦"** as a `go`-level pulse (current `go.md` lines ~207). Verification is relocated to per-feature green-gates and the reflect workflow.
- **The micromanaged PR/Merge/Commit-metadata *task ticks*** as items `plan-iteration` must inject into every iteration. The mechanics survive as `go`'s **Phase 4** (so they still happen, deterministically, and after the workflow returns Ã¢â‚¬â€ they cannot live in a workflow script body), but they are no longer prose-managed tick tasks the agent must remember to create and not-skip.

Retained verbatim (the moat Ã¢â‚¬â€ L2 context/memory + L5 acceptance/definition-of-done):

- The increment pointer + numbering (`increment-NN-XXX`, iterations `NN`/`NN.1R`), Phase 0.5 base-branch mechanism, the "scope cannot shrink (only grow)" rule, the memory docs and their promotion in Phase 5, and the increment-is-the-only-stop boundary.

---

## 3. plan-iteration (Redesigned)

`/devmeta-ng:plan-iteration N` turns an iteration's rough scope into a partition the build can run in parallel. Its single deliverable is a **Feature Manifest** Ã¢â‚¬â€ the structured `args` the build workflow (or the fallback fan-out) consumes. It also writes the durable artifacts (feature specs, context-log, status, tk structure) and then continues straight into `go`'s loop without pausing.

The redesign keeps the L1 domain constraints on the partition, **deletes the step-by-step micromanagement of how to derive it**, and hands the actual graph cut to the model at high effort.

### 3.1 What stays (domain constraints Ã¢â‚¬â€ the L1 moat, non-negotiable)

These are the rules the partition must satisfy. They are stated as constraints to satisfy, not as a procedure to follow:

- **Independence is the objective.** Maximize the parallel frontier Ã¢â‚¬â€ the number of features that can run concurrently after the foundation lands. Fewer waves, wider waves.
- **No file is modified by two independent features.** A write-write overlap means the two features are not independent; either merge them or pull the shared file into the foundation. This invariant is hard Ã¢â‚¬â€ the manifest is rejected if it's violated.
- **Extract shared foundations.** Schemas, types, shared utilities, config/env loading, and the storage/persistence layer go into a single foundation feature (wave 1). Consumers depend on it, never the reverse.
- **Context sizing (~200k).** Each feature must fit one subagent session at ~60-70% of the window with headroom for the codebase, specs, and context-log. Split anything larger; merge anything trivial.
- **Cross-feature dependencies are minimal and feature-level only.** Dependencies are expressed as waves, never as task-to-task choreography across features.

### 3.2 What's deleted (absorbed L3 scaffolding)

Removed from the old prose, because Dynamic Workflows + a high-effort model now own the "how":

- The numbered **Step 2 / Step 3 partitioning recipe** ("cluster by shared files Ã¢â€ â€™ extract foundations Ã¢â€ â€™ check independence Ã¢â€ â€™ check sizing Ã¢â€ â€™ maximize frontier" as ordered sub-steps, plus the explicit work-to-file matrix template and the dependency-ordering heuristics list).
- The hand-managed internal scratch formats for that analysis.

In their place: a single high-effort decomposition call. **Run the partition at `xhigh`/`max` effort** (the cut is the highest-leverage decision in the engine and the place a weak partition silently serializes the whole iteration). The model is told the constraints in 3.1 and the iteration scope, and returns the feature graph directly. The constraints are the spec for the cut; the algorithm to reach them is the model's.

### 3.3 Procedure (thin)

1. **Read state.** Resolve the active increment via `.devmeta/current-increment.md`; read its `_overview.md`, the iteration's `plan.md` if present, `CLAUDE.md`, `docs/current/principles-and-choices.md`, and `.devmeta/lessons-learned.md`. Run `tk list 2>/dev/null || tk init`.
2. **Scope check (kept, condensed).** If the iteration is too large (8+ features or a massive foundation), too small, already partly delivered, or mis-ordered, restructure `_overview.md` directly, renumber downstream iterations, and note it in `project-history.md`. This is a moat (L5 scope ownership) and stays.
3. **Partition at high effort.** Hand the scope + the 3.1 constraints to the model at `xhigh`/`max`; it returns features with scope, file footprint, wave assignment, surgical test command, and a one-line spec stub each.
4. **Emit artifacts** (3.5) and the **Feature Manifest** (3.4).
5. **Self-check the manifest** against the invariants (3.6), then continue into `go`'s loop Ã¢â‚¬â€ no pause (3.7).

### 3.4 The Feature Manifest (primary output Ã¢â€ â€™ workflow `args`)

The manifest is the contract between `plan-iteration` and the build. It is the value the build workflow receives as `args`, and the same structure the fallback per-feature fan-out iterates. Because the workflow script body cannot touch the filesystem, **every path in the manifest is read by the spawned agents, not by the script** Ã¢â‚¬â€ the manifest carries pointers, the agents dereference them.

Shape:

```jsonc
{
  "increment": "76-abc",
  "iteration": "76.1",
  "baseBranch": "2026-05-31-doc-management",   // mirrors <increment-dir>/base-branch; agents branch from it
  "contextLog": ".devmeta/projects/2026-05-31-doc-export/context-log.md",
  "verifyOnScreen": [                            // L5 acceptance, carried for build + handed to reflect
    "node dist/cli.js export --format pdf  Ã¢â€ â€™ writes report.pdf, exit 0"
  ],
  "features": [
    {
      "name": "foundation",
      "epicId": "tk-1042",                       // tk epic id (so agents update state, not the script)
      "wave": 1,
      "scope": "Shared types, audit schema, storage layer for export records",
      "files": ["src/types/export.ts", "src/db/exportStore.ts"],
      "dependsOn": [],
      "test": "pnpm vitest run src/db/exportStore.test.ts",
      "spec": ".devmeta/projects/2026-05-31-export-foundation/2026-05-31-export-foundation-spec.md"
    },
    {
      "name": "pdf-renderer",
      "epicId": "tk-1043",
      "wave": 2,
      "scope": "Render export records to PDF",
      "files": ["src/render/pdf.ts"],
      "dependsOn": ["foundation"],
      "test": "pnpm vitest run src/render/pdf.test.ts",
      "spec": ".devmeta/projects/2026-05-31-pdf-renderer/2026-05-31-pdf-renderer-spec.md"
    },
    {
      "name": "csv-renderer",
      "epicId": "tk-1044",
      "wave": 2,                                 // same wave as pdf-renderer Ã¢â€ â€™ parallel frontier = 2
      "scope": "Render export records to CSV",
      "files": ["src/render/csv.ts"],
      "dependsOn": ["foundation"],
      "test": "pnpm vitest run src/render/csv.test.ts",
      "spec": ".devmeta/projects/2026-05-31-csv-renderer/2026-05-31-csv-renderer-spec.md"
    }
  ]
}
```

Field notes:
- `wave` and `dependsOn` are redundant-by-design: `wave` is the precomputed schedule the workflow groups its `parallel()` barriers by; `dependsOn` is the source-of-truth graph the build (and the self-check) validates `wave` against.
- `epicId` and `baseBranch` exist precisely so the **agents** create branches, commit, open PRs, and update `tk` Ã¢â‚¬â€ the script never does (hard constraint).
- `verifyOnScreen` originates here (lifted from the increment's scope) so a single structure feeds both the build's done-check and `reflect`'s adversarial acceptance fan-out.
- `test` is a **surgical** command per feature, not the full suite.

### 3.5 Durable artifacts (what still gets written Ã¢â‚¬â€ and what thins out)

Written by `plan-iteration` directly on the base branch (these are the L2/L5 moat and stay):

- **Feature specs** Ã¢â‚¬â€ `.devmeta/projects/YYYY-MM-DD-<name>/YYYY-MM-DD-<name>-spec.md`, one per feature (scope, files to create/modify, ordered implementation steps, surgical test command). The manifest's `spec` field points here; the agent reads the full spec, the manifest only carries the pointer.
- **context-log.md** Ã¢â‚¬â€ one shared log per iteration's feature set (created empty with the append-on-completion header). Path is carried in the manifest so every agent reads/appends the same file.
- **Iteration `status.md`** Ã¢â‚¬â€ `<increment-dir>/iterations/iteration-<N>/status.md` with the feature table + independence map.
- **tk structure** Ã¢â‚¬â€ one epic per feature (with `epicId` captured back into the manifest), tasks as ordered children, cross-feature `tk block` only at feature granularity.

**What gets thinner (deletions land here):**
- Feature specs drop the "Open questions" placeholder and any restating of CLAUDE.md/principles Ã¢â‚¬â€ agents already read those. Specs become: scope, files, ordered steps, test. Less prose, more pointer.
- The per-feature **"Re-ground after Feature X" task is removed** from the tk structure. Re-grounding was inner-L5 anti-drift willpower; on the workflow path it's a checkpoint-resume concern, and on the fallback path it's covered by context-log append + `reflect`. `plan-iteration` no longer manufactures it.
- The work-to-file matrix and dependency-heuristics scaffolding are gone (3.2); the manifest *is* the partition artifact, so there's no parallel internal format to maintain.
- `status.md` keeps the human-readable feature table + ASCII independence map (cheap L2 orientation) but stops duplicating per-task detail that already lives in tk and the spec.

### 3.6 Self-check (domain gate, not generic critic)

Before handing off, validate the manifest against the invariants Ã¢â‚¬â€ this is a **retained L4-domain check** (it encodes devmeta's partition rules), distinct from the absorbed generic code-critic:

- No file appears in two features whose `dependsOn` sets don't transitively order them (the write-write invariant).
- Every non-foundation feature's `dependsOn` resolves to an earlier wave; `wave` is consistent with `dependsOn`.
- Every feature has a non-empty `test` and a `spec` that exists on disk.
- Every `epicId` resolves in tk.

If a check fails, re-cut (back to 3.3 step 3) Ã¢â‚¬â€ do not hand a broken partition to the build.

### 3.7 Continue into the loop (no pause)

`plan-iteration` is a waypoint inside `/devmeta-ng:go`, never a stopping point. After emitting artifacts and passing the self-check, it returns the manifest to `go` and `go` proceeds to its execution step (launch the iteration workflow if the user opted in, else the per-feature fan-out). Do not summarize, do not present the independence map as a decision, do not ask "shall I proceed?" Ã¢â‚¬â€ the manifest **is** the plan, and execution starts immediately.

---

## 4. The build execution workflow

`/devmeta-ng:go` Phase 3, on the opted-in path, launches the build workflow with the iteration's manifest as `args`; on the fallback path `/devmeta-ng:run` spawns the same per-feature agents directly. The agent prompts are identical, so the two paths are A/B-comparable.

**Canonical implementation:** [`workflows/build-iteration.workflow.js`](workflows/build-iteration.workflow.js) — reviewed and smoke-tested. It is the source of truth; this section summarizes its shape rather than duplicating it (so the two cannot drift).

### 4.1 Shape

- **Runtime form.** `export const meta = {…}` (a pure literal) + a **top-level body** (NOT `export default`). The runtime injects `args` as a **JSON string**, so the body opens with `const input = typeof args === "string" ? JSON.parse(args) : (args || {})`.
- **Input** (`input`): `{ iteration, runStamp, baseBranch, contextLog, waves: [ [ {featureId, title, description, branch, tasks:[{taskId,title,acceptance,detail}], test, spec, notes} … ] … ] }` — the grouped build-args produced by go's manifest→args transform (N3). `verifyOnScreen` is deliberately **absent** (N8).
- **Waves.** A `for` loop over `input.waves`; each wave is `await pipeline(wave, build, verify)`. **Awaiting that pipeline result is the wave barrier** — wave W+1 starts only after every feature in W has cleared both stages (N10). The journal checkpoints at each barrier, so a resumed run skips finished waves.
- **Per feature, two stages, no barrier between them:** `build` (agentType `tk-worker`, `isolation: "worktree"`) then `verify` (agentType `general-purpose`, `isolation: "worktree"`). A fast feature is verified while a slow sibling still builds; a failed/`null` build short-circuits its verify and becomes an `agent-failed` row.
- **Returns** a per-feature manifest + summary only — no merge, no acceptance verdict, no `tk` mutation.

### 4.2 What lives INSIDE the agents (the script body cannot touch fs/git/tk)

- **Build agent:** creates/checks out/pushes its **own** feature branch off the base, `tk update/close` per task, implements + **surgical** tests, **one commit per task**, appends to `context-log.md`, opens a PR with `gh pr create --base <baseBranch>` **without merging**. Self-checks via its surgical tests only — **not** against "Verify on screen" (that is reflect's, by design).
- **Verify agent (in-loop generic L4):** starts in a fresh worktree on the base, so it **first checks out the feature branch** (`git fetch origin && git checkout <branch>`) — otherwise it would test base, not the feature — then confirms tasks are closed *and* present in the diff, **re-runs** the surgical tests, and flags false-victory (skipped/weakened tests, stubs, TODOs). Generic correctness only.

### 4.3 What STAYS in devmeta's `go` loop (after the workflow returns)

Cross-feature **merge/integration**, the **PR → merge → reflect seam**, **`tk` ledger reconciliation** from `result.features[*]`, the **adversarial L5 acceptance check** (the separate reflect workflow), and **opt-in/effort routing**. The workflow's contract ends at "every feature has a branch, per-task commits, a PR, and a generic verdict"; everything that crosses features or defines *acceptance* is the outer loop's — the script can't touch git, and the acceptance moat must never be absorbed into the build run.

---

## 5. `reflect` as a Workflow (the addition)

### What changes vs. the current `reflect`

Today's `reflect.md` folds three jobs into one command: a generic **code-quality review** (Step 3), an outside-in **acceptance verification** (Step 4), and a **memory-promotion** pass (the rest). In `devmeta-ng` these split by harness layer:

- **The generic code-critic (Step 3) is dropped.** Opus 4.8 self-flags ~4x better, and a per-feature generic verify already runs inside the *build* workflow. Re-running it in reflect would re-absorb a deleted layer (N4).
- **Acceptance verification (Step 4) becomes the workflow** — an adversarial fan-out of skeptics that try to *refute* delivery against the iteration's "Verify on screen" criteria. This is the retained **L5**.
- **Memory promotion + housekeeping stays in `devmeta-ng:reflect` itself, AFTER the workflow returns** — the **L2** investment, which must touch fs/`tk` (forbidden in the script body anyway).

**Canonical implementation:** [`workflows/reflect-iteration.workflow.js`](workflows/reflect-iteration.workflow.js) — reviewed and smoke-tested; summarized here, not duplicated.

### 5.1 Shape

- **Runtime form.** `export const meta` (pure literal) + top-level body + the same defensive `const input = typeof args === "string" ? JSON.parse(args) : (args || {})`.
- **Input:** `{ iteration` (the EXECUTION iteration verified, e.g. `76.1` — NOT the I&A tick id `76.1R`)`, runStamp, verifyRef` (pinned merged HEAD)`, changedFiles, principlesText, scopeItems:[{id,title,description}], acceptanceCriteria:{[id]:[…]} }`.
- **Two domain-anchored checks only** (N4):
  1. **Adversarial acceptance fan-out** — per scope item, **N=3 skeptics on DISTINCT angles** (happy-path / edge-error / artifact-exists-and-runs; N5), each prompted to *refute* against the supplied criteria. Verdict by **majority**; **ties → not-closed**; a **crashed skeptic counts pessimistically** (bucketed separately so the breakdown stays honest).
  2. **One consistency-vs-principles lens** fed `principlesText`. The generic correctness/drift lenses are **gone** — absorbed into the build verify stage.
- **Guards (return `blocked` / route-to-human, never a silent pass):** empty `scopeItems` → `blocked` (N7); missing `verifyRef` → `blocked` (N6); a scope item with **no criteria** → `not-closed` with `needsHumanCriteria: true`, routed to a human criteria-authoring step **outside** the code-fix loop.
- **Read-only.** Skeptics and the lens inspect and report; they do **not** use `isolation: "worktree"` (read-only agents don't collide on files, and worktrees wouldn't isolate ports anyway — port-binding "Verify on screen" commands run serially). Returns `{ iteration, runStamp, verifyRef, status, acceptanceFindings, lensFindings:{ consistency } }` and changes nothing.

### 5.2 How findings feed the immutable-scope rule

`devmeta-ng:reflect` reads the returned findings and applies devmeta's existing law unchanged — **fix gaps now, never defer, scope is immutable:**

- `closed` → record in the I&A report, move on.
- `partial` / `not-closed` (and harmful consistency findings) → **fix in this same `reflect` invocation**, re-verifying the touched item until it reads `closed`. No "next iteration" task, no post-MVP relabel, no scope cut. Only the human may reduce scope.
- `needsHumanCriteria` items are the exception — they route to a human to author the missing bar, **not** into the code-fix loop (you cannot fix code to satisfy a bar that does not exist).

Then `devmeta-ng:reflect` performs the **L2** memory promotion itself (learnings → `CLAUDE.md` / principles / `lessons-learned.md`), the `docs/current/` audit, `tk` prune, and plan reassessment — the part the workflow is structurally forbidden to do.

---

## 6. Investment Layers and Configuration (L1 Effort, L2 Memory, L5 Acceptance)

The deletion exercise (Section [Deletion-First]) strips the absorbed scaffolding. This section specifies what gets built back in its place: the three reinvestment moves the article prescribes Ã¢â‚¬â€ adopt the L1 dial, deepen the L2 memory layer, harden the L5 acceptance definition Ã¢â‚¬â€ plus the config surface that carries them. The principle throughout: spend the tokens freed by deletion on the two layers that stayed the developer's moat (L2, L5), and let the dial Ã¢â‚¬â€ not custom code Ã¢â‚¬â€ own the one absorbed layer we still touch (L1).

### 6.1 (L1) Effort Ã¢â‚¬â€ adopt the dial, do not build routing

A new fourth section, `## Effort`, is added to `.devmeta/devmeta.md`. It is the only L1 surface in the engine. It maps a **task type** to an **effort tier** (`low` / `high` / `xhigh` / `max`, the Opus 4.8 effort dial). The engine reads it and sets the dial when it spawns an agent or launches a workflow; it writes nothing else.

**Default config block** (shipped as the template; projects tune it):

```markdown
## Effort

Default tier: high

| Task type                          | Tier   | Why |
|------------------------------------|--------|-----|
| Iteration plan / the plan-cut      | xhigh  | Graph-partitioning the feature boundaries is the highest-leverage decision in the loop; a bad cut costs an entire iteration. |
| Acceptance-verification (reflect)  | xhigh  | Adversarial skeptics must try hard to break the build; cheap skeptics rubber-stamp. max for release/finalize iterations. |
| Feature implementation (build)     | high   | Default. Real code against real acceptance criteria. |
| Re-ground / status / history write | medium | Summarization and doc-append; low-stakes, mechanical. |
| Metadata commit, tag, prune        | medium | Pure mechanics (git add, tk delete). No reasoning. |
| Outside-in gap-fix when found      | high   | Inherits build tier Ã¢â‚¬â€ fixing a missed scope item is real work, not cleanup. |

> `medium` is the floor for mechanical work; never `low` for anything that touches code logic.
> Bump a build feature to `xhigh` inline when its spec is flagged high-risk (migrations, auth, money, concurrency).
```

**Resolution rules (engine side):**
- `go`, `plan-iteration`, `run`, and `reflect` each read `## Effort` from `.devmeta/devmeta.md` at start. Missing section Ã¢â€¡â€™ `Default tier: high`, mechanical steps Ã¢â€¡â€™ `medium`.
- `plan-iteration` stamps a resolved tier onto **each feature** at plan time (defaulting from "Feature implementation", overridable by spec risk flags). The build path (agent-per-feature **or** the dynamic workflow) reads that stamp and sets the dial per feature.
- The two workflows take their tier from the table directly: `plan-cut` work runs at `xhigh`; the reflect workflow's skeptic and lens agents run at `xhigh` (or `max` on a finalize/release iteration).

**What is explicitly NOT built Ã¢â‚¬â€ the dial wins.** Per the article, L1 (routing / token-budget / compute-vs-quality) is the layer Opus 4.8 *absorbed* via the effort dial. So devmeta builds **no custom router**: no per-task model selector, no token-budget accountant, no cost-vs-quality scoring heuristic, no dynamic effort-escalation engine. The `## Effort` table is a flat, declarative typeÃ¢â€ â€™tier lookup Ã¢â‚¬â€ about twenty lines a human can read and tune Ã¢â‚¬â€ not a routing system. If a future need looks like "we should pick the model/effort dynamically based on signal X," the answer is to add a row to the table or bump one inline, not to write routing logic. The dial is the routing.

### 6.2 (L2) Memory Ã¢â‚¬â€ strengthen the retained layer

L2 (context / retrieval / what enters the window) is a retained moat and *more* valuable now that execution is absorbed. The reinvestment has two halves: a stronger **promotion pipeline** (transient signal Ã¢â€ â€™ permanent docs) and a defended **unit-of-context principle**.

#### 6.2.1 Promotion pipeline Ã¢â‚¬â€ reflect-workflow findings + context-logs Ã¢â€ â€™ permanent docs

Today, learnings live in two transient places: per-feature `context-log.md` files (written by build agents) and the reflect step's own reading of tk notes. Both are at risk of evaporating. The new pipeline makes promotion a first-class, owned step:

- **Sources (transient, per-iteration):** every feature's `.devmeta/projects/.../context-log.md`; tk feature/task notes; **and now the structured findings returned by the reflect workflow** (the converged skeptic + code-lens output defined in Section [Reflect]).
- **Sinks (permanent, cross-iteration):** the moat docs, unchanged in identity Ã¢â‚¬â€ `CLAUDE.md` (Critical Rules), `docs/current/*` (incl. `principles-and-choices.md`), `docs/current/troubleshooting.md`, and `.devmeta/lessons-learned.md`. The categorization table from the existing `reflect.md` Step 2 is retained verbatim as the routing rule.
- **The reflect workflow feeds promotion; it does not perform it.** Per the boundary decision, the workflow is an adversarial *fan-out that produces findings*; the **promotion / memory-write step stays in devmeta's own loop** (in `reflect`, after the workflow returns). This keeps the L2 memory-write Ã¢â‚¬â€ the moat Ã¢â‚¬â€ out of the opaque, journaled run and under devmeta's control. The workflow returns a typed findings object; `reflect` reads it, applies the categorization table, and writes the docs.
- **Each promoted line records provenance:** `Updated YYYY-MM-DD (iter NN.M): <what changed and why>`. The date is passed in via `args` (the workflow has no clock; see substrate constraints) so even workflow-sourced findings carry a real timestamp.

Net effect: a finding discovered by a skeptic in iteration N is *guaranteed* a routing decision (promote-and-where, or discard) instead of dying in a context-log nobody re-reads. That is the L2 investment Ã¢â‚¬â€ closing the leak between "what we learned" and "what the next session sees."

#### 6.2.2 Keep the "feature = ~200k unit of context" principle

`plan-iteration`'s design philosophy Ã¢â‚¬â€ **"the feature is the unit of context (~200k tokens); each feature runs in one agent session; tasks within are sequential steps"** Ã¢â‚¬â€ is **retained unchanged**, and the spec states *why* explicitly so a future reader on a 1M-window model does not "optimize" it away:

> **Why cap the feature at ~200k even on a 1M-token window?** Context-window *size* is not context-handling *quality*. Retrieval and reasoning fidelity degrade well before the window is full Ã¢â‚¬â€ the real working-attention cliff sits around ~200k tokens, and a 1M ceiling does not move it. Sizing a feature to ~60Ã¢â‚¬â€œ70% of a ~200k budget keeps every build agent inside its reliable zone. This is an **L2 (context) decision, independent of the L1 effort dial**: raising effort buys more reasoning passes, not a larger reliable context. So the cut stays the same whether the feature runs as a standalone agent or as a node in the dynamic workflow, and whether the dial is `high` or `max`.

Concretely this preserves, with no change: the `~60-70% of context` sizing check in `plan-iteration` Step 3, the per-feature `context-log.md`, and "one subagent per feature, sequential tasks within." The hybrid substrate inherits it on both paths Ã¢â‚¬â€ a workflow node is sized exactly like a standalone feature agent.

### 6.3 (L5) Acceptance Ã¢â‚¬â€ "Verify on screen" becomes executable evals

L5 (lifecycle / acceptance criteria / "definition of correct for *your* problem") is the other retained moat. The investment turns acceptance from prose the agent *reads* into criteria a fan-out *executes*.

- **Source of truth, unchanged in ownership:** each iteration's **"Verify on screen"** block (authored in the increment `_overview.md` / iteration scope, owned by devmeta + human). This is the L5 definition-of-done and the human is the only party who may weaken it.
- **`plan-iteration` upgrades each "Verify on screen" line into an executable acceptance eval.** At plan time, every line is rewritten (where it isn't already) into a concrete, runnable check with an observable expected result: an exact command + the expected output/exit signal, or a named manual observation when no command can express it. These executable evals are persisted with the iteration (alongside `status.md`) as the iteration's **acceptance set**.
- **The reflect workflow consumes the acceptance set as its skeptics' criteria.** Per Section [Reflect], the workflow fans out **N skeptics per scope item against that iteration's executable "Verify on screen" evals**, plus the code-quality lens panel. The evals are the *contract the skeptics are paid to break*: a skeptic runs the eval, and a build is accepted for that item only when the eval passes on screen Ã¢â‚¬â€ not when a tick is closed. "Don't trust tick status. Trust code. Trust the screen." (existing `reflect.md` Step 4) is now enforced by the fan-out rather than by a single reviewer's diligence.
- **Ownership stays with devmeta, judging is delegated.** The generic "is this code good?" critic is gone (absorbed Ã¢â‚¬â€ see deletion table). What remains and is *invested in* is the domain definition of done: devmeta authors the criteria, the workflow executes/attacks them, and devmeta owns the verdict and the memory-promotion that follows. This is the L4-domain / L5 slice the article says stays yours.
- **Scope immutability is unchanged:** a failed acceptance eval is a *fix-now*, never a scope cut or a deferral (existing `reflect.md` Steps 4Ã¢â‚¬â€œ5). The eval makes the failure objective and visible; it does not grant permission to move the bar.

### 6.4 Deletion-vs-Investment Summary

Per engine piece Ã¢â‚¬â€ its dominant harness layer, whether Opus 4.8 + Dynamic Workflows absorbed that layer, and the resulting action. Actions: **DELETE** (remove absorbed scaffolding), **SIMPLIFY** (thin to the non-absorbed residue), **MOVE-TO-WORKFLOW** (re-express as a dynamic-workflow fan-out), **INVEST** (build up the retained moat), **ADOPT** (wire in the dial).

| Engine piece | Primary layer | Absorbed / Retained | Action |
|---|---|---|---|
| **`go`** (outer driver loop) | L3 execution + L5 inner-willpower | Mostly absorbed (L3 by workflows; the "never stop / re-ground / last-task=first-task" anti-drift by the workflow's checkpoint-resume) | **SIMPLIFY** Ã¢â‚¬â€ keep the plain, resumable increment loop and the ledger/PR/I&A seams; **DELETE** the willpower prose; **ADOPT** the dial when spawning the build/workflow. |
| **`plan-iteration`** | L2 context (the feature cut) + L5 (acceptance authoring) | Retained (moat) | **INVEST** Ã¢â‚¬â€ keep the ~200k feature-cut and graph-partitioning; **add** "Verify on screen" Ã¢â€ â€™ executable acceptance evals (6.3) and per-feature effort stamping (6.1). |
| **`run`** (wave orchestration) | L3 execution | Absorbed (Dynamic Workflows) | **MOVE-TO-WORKFLOW** Ã¢â‚¬â€ the per-iteration build fan-out becomes the dynamic workflow on opt-in (agent-per-feature fallback otherwise); **DELETE** the micromanaged wave-orchestration prose. Branch/commit/PR/tk stay inside the feature agents. |
| **`reflect`** | L4 verification + L2 memory + L5 acceptance | Split: generic critic absorbed (L4); domain acceptance + memory promotion retained (L4-domain/L5/L2) | **DELETE** the generic code-critic checklist; **MOVE-TO-WORKFLOW** the adversarial acceptance/lens fan-out (6.3); **INVEST** in the memory-promotion step that consumes the findings (6.2.1) Ã¢â‚¬â€ kept in devmeta's loop, not the workflow. |
| **Effort config** (`## Effort` in `devmeta.md`) | L1 constraint | Absorbed (the effort dial) | **ADOPT** Ã¢â‚¬â€ add the declarative typeÃ¢â€ â€™tier table (6.1); **DELETE-by-omission** any custom router / token-budget / cost-quality logic. The dial wins. |
| **Memory docs** (`project-history.md`, `lessons-learned.md`, `docs/current/principles-and-choices.md`, `_overview.md`) | L2 context + L5 lifecycle | Retained (moat) | **INVEST** Ã¢â‚¬â€ unchanged in identity/format; strengthen the promotion *pipeline* feeding them (6.2.1) and document the ~200k unit-of-context rationale (6.2.2). Keep the existing categorization/routing table verbatim. |

---

## Section 7: Deletion Inventory

Classification legend: **CUT-absorbed** = generic scaffolding now handled by the model weights or Dynamic Workflow runtime; delete it. **KEEP-moat** = encodes devmeta's L2 (context/memory) or L5 (acceptance/definition-of-done) edge; carry over verbatim. **MOVE-to-workflow** = becomes a JS workflow script + agent prompts (per-iteration build workflow, or reflect's adversarial fan-out). **SIMPLIFY** = keep the intent but collapse the prose to a constraint/contract the workflow or model enforces.

### `go.md`

| Section / passage (snippet) | Classification | Layer | Rationale |
|---|---|---|---|
| Frontmatter + "Project Context" (`.devmeta/devmeta.md` test cmds, env, tk mapping) | KEEP-moat | L2 | Project-specific retrieval contract; defines what context loads. Unchanged. |
| "Purpose" Ã¢â‚¬â€ *"Run it to start. Run it again to continueÃ¢â‚¬Â¦ figures out where the project is"* | KEEP-moat | L5 | The resumable outer-loop identity. Decision 4 keeps go a plain resumable loop. Keep. |
| "Current increment" pointer + `increment-<NN>-<XXX>` / `<NN>.1R` naming | KEEP-moat | L2 | Increment numbering scheme is the explicit moat (Decision 2). Keep verbatim. |
| Phase 0 "Assess State" Ã¢â‚¬â€ `tk list / tk next / tk next <iteration-id>` + read context files; *"if `tk next` returns a task, do that task"* | KEEP-moat | L2/L5 | tk-as-source-of-truth ledger drives the loop on both paths (Decision 4). Keep. |
| "Iteration Rhythm: Execute Ã¢â€ â€™ Inspect & Adapt" diagram | KEEP-moat | L5 | The incrementÃ¢â€ â€™iterationÃ¢â€ â€™I&A lifecycle seam is devmeta's outer loop (Decision 5). Keep. |
| "Execution Iteration Structure" tree, the line `Re-ground after Feature A (task) Ã¢â€ Â ALWAYS LAST IN EVERY FEATURE` | **CUT-absorbed** | L5 (inner) | Per-feature re-ground is anti-drift willpower Ã¢â‚¬â€ the feature agent fighting context decay mid-build. The per-iteration workflow's journaled checkpoint-resume replaces it; on fallback the feature subagent is single-session and doesn't need a self-imposed re-ground task. Remove the task from the tree. |
| Tree lines `Create PR for iteration N` / `Merge PR and return to base branch Ã¢â€ Â MERGE BEFORE I&A` / `Kick off I&A Cycle NR Ã¢â€ Â ALWAYS LAST` | KEEP-moat | L5 | PR/merge/I&A seams live in go's loop AFTER the workflow returns (Decision 5). Keep these tasks. |
| Tree line `Commit metadata to base branch Ã¢â€ Â COMMIT .tick/ AND .devmeta/ FILES` | KEEP-moat | L5 | Ledger durability. Stays in go's loop, not the script body (script can't touch git Ã¢â‚¬â€ workflow API implication). Keep. |
| "I&A Cycle Structure" tree (`Run /devmeta:reflect N`, `Plan Iteration N+1`) | KEEP-moat | L5 | I&A lifecycle. The `Run /devmeta:reflect N` task now launches the reflect workflow (Decision 6) but the task itself stays. Keep. |
| "Re-grounding Task (after every feature)" subsection Ã¢â‚¬â€ the 4-step checklist (update project-history, status.md, lessons-learned, `tk list --parent`) | **CUT-absorbed** | L5 (inner) | The willpower ritual. Memory-doc updates that matter are promoted by reflect (L5 moat). The mid-iteration re-ground exists only to keep a drifting long-running agent grounded Ã¢â‚¬â€ absorbed by workflow checkpoint-resume. Delete the subsection. |
| "Commit Metadata to Base Branch (after every merge)" subsection + `git add .tick/ .devmeta/ Ã¢â‚¬Â¦` block | KEEP-moat | L5 | Concrete ledger-durability procedure in go's own loop. Keep (it explicitly notes these files are NOT in the feature PR). |
| "Last I&A Cycle Task = First Task of Next Iteration" subsection | **SIMPLIFY** | L5 (inner) | This is the *"last task = first task"* willpower hack designed to defeat the boundary-stop instinct. With workflow checkpoint-resume + a plain resumable go loop, the boundary-stop problem is gone. Collapse to a one-line ledger fact ("the I&A cycle's terminal task is Plan Iteration N+1") and delete the motivational framing. |
| Phase 0.5 "Establish Base Branch" Ã¢â‚¬â€ `<increment-dir>/base-branch`, the one-time ask, `git checkout -b` | KEEP-moat | L5 | Base-branch-as-source-of-truth + the single sanctioned human-in-loop pause. Lives in go's loop (script body can't touch git). Keep. |
| Phase 1 "Environment Check Ã¢â‚¬Â¦ Test, don't ask." | SIMPLIFY | L1/L5 | Keep the env-check intent; trim the "test, don't ask" exhortation (model default now). One line. |
| Phase 2 "If `tk next` returns an execution iteration: PLAN IT" Ã¢â‚¬â€ bullets requiring `Re-ground after Feature X` and `Commit metadata` tasks | **SIMPLIFY** | L5 | Remove the `Re-ground after Feature X` task-creation bullet (CUT above). Keep PR/Merge/Commit-metadata/Kick-off-I&A bullets. Keep the `/devmeta-ng:plan-iteration N` invocation. |
| Phase 2 "If `tk next` returns nothing: CHECK STATE" + "If NO TICKS EXIST: BOOTSTRAP" | KEEP-moat | L5 | Increment-completion = stop, scope-verification against `_overview.md`, bootstrap from overview. Definition-of-done for the run. Keep. |
| Critical Rule: *"Never ask permission to proceedÃ¢â‚¬Â¦ Never ask 'should I continue?'"* | **SIMPLIFY** | L5 (inner) | Anti-drift willpower against the defer-to-user instinct. The resumable loop + workflow opt-in handle continuation structurally. Keep one terse line ("go is autonomous between increment boundaries"); delete the repeated exhortations. |
| Critical Rule: *"Never stop to present a summary or status update within an incrementÃ¢â‚¬Â¦ stays in 'doing work' mode at all timesÃ¢â‚¬Â¦ resist this."* | **CUT-absorbed** | L5 (inner) | The single most concentrated anti-drift willpower passage. Pure inner-L5 motivation to prevent premature stopping Ã¢â‚¬â€ exactly what workflow checkpoint-resume + the resumable outer loop absorb. Delete entirely. |
| Critical Rule: *"The exception: completing an increment IS a stopping point."* | KEEP-moat | L5 | This is the *real* lifecycle boundary (outer-L5), not willpower. Keep the rule; strip the embedded re-justification of why iterations aren't stops. |
| Critical Rule: *"Tests are autonomous and must passÃ¢â‚¬Â¦ no 'known failure' stateÃ¢â‚¬Â¦ 'Verify on screen' is the acceptance test"* | KEEP-moat | L5 | Definition-of-correct / acceptance gate = retained L5 moat. Keep, especially the "Verify on screen = acceptance test" clause (powers the reflect workflow's criteria). |
| Critical Rule: *"Scope cannot shrinkÃ¢â‚¬Â¦ Only the human can cut scope."* | KEEP-moat | L5 | Immutable-scope is a core acceptance-criterion invariant. Keep. |
| Critical Rule: *"Work continues until it succeedsÃ¢â‚¬Â¦ 'I couldn't figure it out' is never valid"* | **SIMPLIFY** | L5 (inner) | Persistence willpower. Keep the load-bearing part (the closed list of legitimate stop reasons: missing API keys / hardware / ambiguous spec); cut the motivational padding. |
| Critical Rule: *"Commit and push regularlyÃ¢â‚¬Â¦ use `--merge` not `--squash`/`--rebase`Ã¢â‚¬Â¦ don't assume base is `main`"* | KEEP-moat | L5 | Concrete git/merge policy in go's loop. Keep (the `--merge` and base-branch-from-file rules are load-bearing). |
| Critical Rule: *"Run tests constantlyÃ¢â‚¬Â¦ Tests are the heartbeatÃ¢â‚¬Â¦ last 3 tasks"* | **SIMPLIFY** | L4 (generic) | Generic "run tests often" critic-nagging the weights now self-enforce. Fold into the one acceptance-gate rule above; delete the "heartbeat / 3 tasks" prose. |

### `run.md`

Whole-file disposition: run becomes **two** things Ã¢â‚¬â€ the per-iteration **build workflow** (JS script, when opted in) and a slimmed fallback path (one Agent per feature). The orchestration prose below is the L3 substrate now absorbed by Dynamic Workflows.

| Section / passage (snippet) | Classification | Layer | Rationale |
|---|---|---|---|
| Frontmatter + "Project Context" + tk mapping | KEEP-moat | L2 | Retrieval contract. Keep. |
| "Design" Ã¢â‚¬â€ *"The feature is the unit of context. One subagent per featureÃ¢â‚¬Â¦ You (the orchestrator) are a thin scheduler."* | KEEP-moat | L2 | Feature = unit of parallel execution is the partition invariant (carries to both workflow `parallel`/`pipeline` fan-out and fallback). Keep as the workflow's stated contract. |
| "Context" block Ã¢â‚¬â€ `!`dateÃ¢â‚¬Â¦``, `tk list Ã¢â‚¬Â¦ \| head -20` shell-substitution | **CUT-absorbed** | L3 | Inline shell substitution can't run inside a workflow script body (HARD CONSTRAINT: script body can't touch shell). Date must be passed via `args`; tk reads move into agent prompts. Cut from the engine surface. |
| Phase 2 "Compute Feature Dependency Graph" + `Wave 1 = features with no open blockersÃ¢â‚¬Â¦` algorithm | **MOVE-to-workflow** | L3 | Wave computation = orchestration. On the workflow path it's expressed by how thunks are grouped into `parallel([...])` barriers / `pipeline` stages; on fallback it's a short scheduler step. Move the logic into the script structure; delete the hand-rolled wave prose. |
| Phase 3 "Locate Shared Context Log Ã¢â‚¬Â¦ include its contents in worker prompts" | KEEP-moat | L2 | `context-log.md` is the inter-feature memory channel (L2). Keep Ã¢â‚¬â€ but the *read* happens in a spawned agent, and contents are threaded into peer prompts. |
| Phase 4 "Present Execution Plan" table + *"Proceeding with executionÃ¢â‚¬Â¦"* | **CUT-absorbed** | L3 | Presenting a plan table to the user is absorbed-L3 ceremony; the workflow's `meta.phases` + `log()`/`phase()` provide visibility. No user-facing plan gate. Delete. |
| Phase 5 "Execute Waves" Ã¢â‚¬â€ the `FOR each wave` pseudo-loop incl. `git checkout -b` / `git push -u` inside step 2 | **MOVE-to-workflow** | L3 | Core wave-scheduling micromanagement (Decision 7: "micromanaged wave-orchestration prose"). The loop becomes `parallel`/`pipeline` structure. CRITICAL relocation: branch create/push currently shown in the orchestrator step MUST move INSIDE each feature agent (script body can't touch git). |
| Phase 5 *"CRITICAL: Launch all feature workers in a wave in a SINGLE message with multiple Task tool calls."* | **CUT-absorbed** | L3 | The manual fan-out mechanic. On the workflow path `parallel(thunks)` *is* the barrier; on fallback it reduces to "spawn the wave's agents concurrently." Delete the single-message instruction. |
| Phase 6 "Worker Prompt Template" Ã¢â‚¬â€ `## Your Assignment`, Feature/Branch/Tasks/Task Details | **MOVE-to-workflow** | L3 | This becomes the `agent(prompt, Ã¢â‚¬Â¦)` prompt builder. Keep the structure; relocate it into the script/agent layer. |
| Phase 6 Instructions 1-5: read CLAUDE.md, principles-and-choices.md, lessons-learned.md, context-log.md, devmeta.md | KEEP-moat | L2 | The per-agent context-retrieval contract Ã¢â‚¬â€ the L2 moat. Keep verbatim in every feature-agent prompt (both paths). |
| Phase 6 Instructions 6-7 (a-g): work tasks in order; per-task in_progress Ã¢â€ â€™ implement Ã¢â€ â€™ test Ã¢â€ â€™ commit Ã¢â€ â€™ `tk close` | **SIMPLIFY** | L3/L4 | The intra-feature task loop. Keep the tk-update and commit-per-task ledger actions; the implement/test/fix micro-choreography is now model-default. Compress steps c-e to "implement and verify." git/tk stay in the agent. |
| Phase 6 Instruction 8 (a-c): append context-log, `tk note Ã¢â‚¬Â¦ FEATURE COMPLETE`, `gh pr create` | KEEP-moat | L2/L5 | context-log append (L2 memory) + PR creation by the agent (must be in-agent per workflow constraint). Keep. (Note: per Decision 5, increment-level PR/merge is in go's loop; feature-PR creation here stays in-agent.) |
| Phase 6 Instruction 9 (a-c): escalation via `--awaiting escalation` + note | KEEP-moat | L5 | Failure/escalation handling = part of definition-of-done routing. Keep. |
| Phase 6 "Rules" Ã¢â‚¬â€ *"NEVER close a task with failing testsÃ¢â‚¬Â¦ no 'close with known failures'"* + "Tests are YOUR responsibility" | KEEP-moat | L5 | Acceptance gate restated at the agent level. Keep. |
| Phase 6 "Rules" Ã¢â‚¬â€ *"After completing all tasks, run the iteration's 'Verify on screen' commandsÃ¢â‚¬Â¦ the iteration is not done"* | KEEP-moat | L5 | "Verify on screen" acceptance criterion Ã¢â‚¬â€ the retained L5 definition-of-done, and the exact criteria the reflect workflow's skeptics attack. Keep. |
| Phase 6 "Rules" Ã¢â‚¬â€ "Use surgical test commands", "Leave useful notes", "write to lessons-learned" | KEEP-moat | L2 | Memory-write discipline (L2). Keep. |
| Phase 6 "Rules" Ã¢â‚¬â€ *"NEVER reduce scopeÃ¢â‚¬Â¦ Only the human can cut features"* | KEEP-moat | L5 | Immutable-scope invariant. Keep. |
| Phase 7 "Handling Results" (close epic, check awaiting/notes, reset stale in_progress) | **SIMPLIFY** | L3 | Result reconciliation. On the workflow path the returned value carries per-feature status and go reconciles tk after the run; collapse to a short post-return reconciliation step. |
| Phase 8 "Wave Reporting" table | **CUT-absorbed** | L3 | Per-wave status tables = absorbed-L3 progress ceremony (`log()`/phases cover it). Delete. |
| Phase 9 "Final Summary and Continue" table + Totals + "Needs Attention" | **SIMPLIFY** | L3 | Only the final returned value comes back from a workflow (API constraint). Reduce to a compact machine-usable result (per-feature status + escalations) that go consumes; drop the human-formatted summary tables. |
| Phase 9 *"DO NOT pause, summarize with 'Next Steps', or hand control backÃ¢â‚¬Â¦ stays in 'doing work' mode"* + *"Run `tk next`Ã¢â‚¬Â¦ Begin executing immediately"* | **CUT-absorbed** | L5 (inner) | Anti-drift willpower; continuation is structural (workflow returns Ã¢â€ â€™ go's loop calls `tk next`). Delete. |
| Phase 9 "Exception: increment completion is a stopping point" | KEEP-moat | L5 | Real lifecycle boundary. Keep (or relocate to go where the boundary actually lives). |
| "Error Handling" Ã¢â‚¬â€ worker-fail / all-blocked / partial-completion | **SIMPLIFY** | L3/L4 | Retry/partial-resume is absorbed by the journaled, resumable workflow (a failed thunk resolves to `null`). Keep only the domain decisions (what counts as a genuine blocker; partial work stays closed); delete generic retry prose. |

### `reflect.md`

Whole-file disposition: reflect becomes the **adversarial acceptance-verification workflow** (Decision 6). The outside-in verification + memory-promotion is the L5 moat it powers; the generic code-quality drift checklist is the absorbed L4 critic to cut.

| Section / passage (snippet) | Classification | Layer | Rationale |
|---|---|---|---|
| Frontmatter + "Project Context" + "Context" (`date`, `tk list Ã¢â‚¬Â¦ closed`) | SIMPLIFY | L2 | Keep retrieval intent; the `!`date`` / inline tk substitution can't sit in a workflow body Ã¢â‚¬â€ pass date via `args`, move tk reads into agents. |
| "Purpose" Ã¢â‚¬â€ *"self-learning systemÃ¢â‚¬Â¦ Iteration N+1 should be easier than iteration N"* | KEEP-moat | L2 | The memory-compounding thesis Ã¢â‚¬â€ the L2 reason reflect exists. Keep. |
| Step 1 "Gather All Learnings" (context-log.md, tk notes, task notes, lessons-learned.md, troubleshooting.md) | KEEP-moat | L2 | Learning-source retrieval map = L2 moat. Keep; runs as the workflow's gather agent(s). |
| Step 2 "Categorize Learnings" table (CLAUDE.md / docs-current / principles-and-choices / troubleshooting / lessons-learned routing) | KEEP-moat | L2 | The memory-promotion routing table Ã¢â‚¬â€ devmeta's ownership of the memory step (Decision 6). Keep verbatim. |
| **Step 3 "Code Quality Review (CRITICAL)"** Ã¢â‚¬â€ *"signs of drift": deeply nested try/catch, monkey-patching, copy-paste, TODO/HACK/FIXME, wrapper functions, excessive defensive codingÃ¢â‚¬Â¦* | **CUT-absorbed** | L4 (generic) | The generic code-quality drift checklist Ã¢â‚¬â€ explicitly the absorbed-L4 critic (Decision 7). Opus 4.8 self-flags ~4x better; a hand-maintained smell list is now noise. Delete the checklist. |
| Step 3 substeps 1-2 (`git log --name-only --since=Ã¢â‚¬Â¦ `; "would an experienced dev recognize this") | **SIMPLIFY** | L4 | Replace with one code-quality *lens* agent in the reflect workflow's panel (Decision 6) reviewing the iteration diff against `principles-and-choices.md` Ã¢â‚¬â€ not an enumerated smell hunt. |
| Step 3 substeps 4-5 (judge harm; *"create cleanup tasks for next iteration"* via `tk create "Refactor:Ã¢â‚¬Â¦"`) | **SIMPLIFY** | L5 | Keep the *outcome* (findings Ã¢â€ â€™ cleanup ticks owned by devmeta); drive it from the workflow's converged findings rather than the generic-critic walkthrough. |
| **Step 4 "Verify Gaps Closed Ã¢â‚¬â€ Outside-In (CRITICAL)"** Ã¢â‚¬â€ read scope, read actual code per item, *"Run the 'Verify on screen' commandsÃ¢â‚¬Â¦ this is the acceptance test"*, classify Closed/Partial/Not-closed, *"FIX IT NOWÃ¢â‚¬Â¦ don't defer"* | **MOVE-to-workflow** + KEEP-moat | L5 | The retained L5 acceptance-verification core. This becomes the workflow's adversarial fan-out: N skeptics per scope item attacking the "Verify on screen" criteria. Keep the criteria + the classification + the fix-now/no-defer rule (devmeta owns them); relocate execution into the workflow. |
| Step 4 *"don't trust tick status. Trust code. Trust the screen."* + *"Scope is immutableÃ¢â‚¬Â¦ only the human can reduce scope"* | KEEP-moat | L5 | Core acceptance philosophy + immutable-scope invariant. Keep verbatim. |
| Step 5 "Check for Pattern Problems" (same mistake across features, repeated test failures, principle violated) | KEEP-moat | L5 | Cross-feature systemic analysis = domain judgment, not generic critique. Keep (can be a synthesis agent). |
| Step 6 "Living Documentation Audit (docs/current/)" | KEEP-moat | L2 | docs/current/ curation = L2 memory maintenance. Keep. |
| Step 7 "Apply Updates" (incl. *"CLAUDE.md under 200 lines"*, principles "Updated YYYY-MM-DD") | KEEP-moat | L2 | Memory-write procedure devmeta owns. Keep. (Note: the workflow returns *findings*; the actual file writes happen in agents or in reflect's own post-return step, never the script body.) |
| Step 8 "Update Iteration Status" (`status.md` template) | KEEP-moat | L5 | Iteration definition-of-done record. Keep. |
| Step 9 "Tag and Prune" Ã¢â‚¬â€ `git tag iteration-<NN>-<XXX>.<M>`, `tk delete` closed epics | KEEP-moat | L5 | Suffixed-tag scheme (the moat numbering) + ledger hygiene. Keep; git/tk run in an agent or reflect's loop, not the script body. |
| Step 10 "Update Project History" (narrative entry) | KEEP-moat | L2 | project-history.md is a named moat memory doc. Keep. |
| Step 11 "Reassess and Restructure the Iteration Plan" (edit `_overview.md`, update ticks) | KEEP-moat | L5 | Plan-adaptation = the "Adapt" half of I&A, owned by devmeta. Keep. |
| Step 12 "Report" template + *"Write the report to `<increment-dir>/ia-cycles/iteration-<N>.md`"* | KEEP-moat | L5 | I&A cycle report is a permanent lifecycle artifact. Keep; this is the natural home for the workflow's returned converged findings. |
| Step 13 "Continue Immediately Ã¢â‚¬â€ unless the increment is done" + *"DO NOT pauseÃ¢â‚¬Â¦ DO NOT write 'ready to continue with /devmeta:go'"* | **CUT-absorbed** | L5 (inner) | Anti-drift willpower; continuation is structural after the workflow returns to go's loop. Delete the motivational prose. |
| Step 13 "Exception: increment boundaries ARE stopping points" | KEEP-moat | L5 | Real lifecycle boundary + close-increment procedure. Keep. |

### `plan-iteration.md`

Whole-file disposition: largely **KEEP-moat** Ã¢â‚¬â€ planning produces the feature partition + specs + context-log + tk structure that *feed* the workflow; it is not itself a workflow (Decision 5: workflow boundary = the build, not planning). Cut only the willpower tail and trim micromanagement.

| Section / passage (snippet) | Classification | Layer | Rationale |
|---|---|---|---|
| Frontmatter + "Project Context" + tk mapping | KEEP-moat | L2 | Retrieval contract. Keep. |
| "Context" Ã¢â‚¬â€ `!`date``, `!`test -d .tickÃ¢â‚¬Â¦`` | SIMPLIFY | L2 | plan-iteration runs in-session (not a workflow body), so shell substitution still works here Ã¢â‚¬â€ but standardize to pass-in date for consistency with the workflow paths. Minor. |
| "Design Philosophy" Ã¢â‚¬â€ *"feature is the unit of contextÃ¢â‚¬Â¦ ~200k tokens"* | KEEP-moat | L2 | The partition philosophy that defines feature boundaries. Keep. |
| Design Philosophy Ã¢â‚¬â€ *"Workers are smartÃ¢â‚¬Â¦ Task descriptions guide Ã¢â‚¬â€ they don't micromanage."* | KEEP-moat | L2 | This is the *anti-micromanagement principle itself* Ã¢â‚¬â€ directly aligned with the deletion thesis. Keep and treat as the rule the rest of the file must honor. |
| Design Philosophy Ã¢â‚¬â€ *"AI-agentic developmentÃ¢â‚¬Â¦ prioritize consistency, mainstream patterns"* | KEEP-moat | L2 | Architectural-context invariant (links to principles-and-choices). Keep. |
| Step 0 "Initialize" (`tk list \|\| tk init`) | KEEP-moat | L2 | Ledger init. Keep. |
| Step 1 "Read the Iteration Plan" (overview, plan.md, CLAUDE.md, principles-and-choices, lessons-learned) | KEEP-moat | L2 | Planning's context-retrieval map = L2 moat. Keep. |
| Step 1.5 "Scope Check Ã¢â‚¬â€ Does This Iteration Still Make Sense?" (split if 8+ features, remove done work, reorder) | KEEP-moat | L5 | Scope-adaptation judgment (definition of *this* iteration). Keep Ã¢â‚¬â€ note it edits `_overview.md`, the moat artifact. |
| Step 2 "Map the Work" + work-to-file matrix | KEEP-moat | L5 | File-footprint analysis is the *input* to the independence partition Ã¢â‚¬â€ a domain constraint, not orchestration. Keep. |
| **Step 3 "Find the Cuts (THE CRITICAL STEP)"** Ã¢â‚¬â€ cluster by shared files, extract foundation, check independence/sizing, *"maximize the parallel frontier"* | KEEP-moat | L5 | This is the **partition constraint** (Decision 7: keep), not partition micromanagement. It defines what makes features independently parallelizable Ã¢â‚¬â€ exactly what the workflow's `parallel`/`pipeline` fan-out depends on. Keep verbatim. |
| Step 3 "dependency ordering heuristics" (shared types/config/storage Ã¢â€ â€™ foundation; services parallel after) | KEEP-moat | L5 | Domain partition heuristics. Keep. |
| Step 4 "Create Feature Specs" (spec file per feature: scope/architecture/impl-guide/tests) | KEEP-moat | L2 | Feature spec = the context payload each feature agent receives. Keep. |
| Step 5 "Create Shared Context Log" (`context-log.md` template) | KEEP-moat | L2 | Inter-feature memory channel. Keep. |
| Step 6 "Create Features and Tasks in tk" Ã¢â‚¬â€ feature `tk create Ã¢â‚¬Â¦ -t epic` format | KEEP-moat | L5 | Defines the tk structure the workflow fans out over. Keep. |
| Step 6 **Task format** Ã¢â‚¬â€ the full `tk create Ã¢â‚¬Â¦ -d "## Objective / ## Spec Reference / ## Scope / ## Implementation 1. Step 2. Step / ## Tests"` template with prescriptive per-task implementation steps | **SIMPLIFY** | L3 | This is the **partition micromanagement** (Decision 7: cut). The numbered `## Implementation` step-list inside every task description over-specifies what smart agents derive Ã¢â‚¬â€ and contradicts the file's own "don't micromanage" principle. Keep `## Objective`, `## Spec Reference`, `## Tests` + `--acceptance`; drop/optional-ize the prescriptive `## Implementation 1./2.` choreography. |
| Step 6 *"Cross-feature dependencies (feature level only)"* Ã¢â‚¬â€ `tk block Ã¢â‚¬Â¦` | KEEP-moat | L5 | Feature-level dep edges = the partition graph that becomes `parallel` barriers / `pipeline` ordering. The "feature level only" constraint is load-bearing. Keep. |
| Step 7 "Create Iteration Status File" (`status.md` + Feature Independence Map ASCII) | KEEP-moat | L5 | Iteration tracking artifact + the independence map (the partition made visible). Keep. |
| Step 8 "Continue Immediately to Execution" Ã¢â‚¬â€ *"DO NOT pause, summarize, or askÃ¢â‚¬Â¦ DO NOT write 'here's the plan, shall I proceed?'Ã¢â‚¬Â¦ DO NOT present the feature independence map as a decision point"* | **CUT-absorbed** | L5 (inner) | Anti-drift willpower against the plan-and-defer instinct. With the resumable go loop driving planÃ¢â€ â€™build, continuation is structural. Delete the prose; one line: "planning completes; go proceeds to the build." |
| "Quality Checklist" Ã¢â‚¬â€ *"No file modified by two independent features / shared code in foundation / fits in ~60-70% context / cross-feature deps minimal / parallel frontier as wide as possible"* | KEEP-moat | L5 | The **partition acceptance criteria** Ã¢â‚¬â€ the definition-of-correct for a plan, and the precondition the build workflow assumes (independent features Ã¢â€¡â€™ safe `parallel` fan-out). Keep verbatim. |
| Quality Checklist Ã¢â‚¬â€ *"Tasks ordered and building on each other / every task has surgical test commands"* | KEEP-moat | L5 | Intra-feature sequencing + per-task acceptance. Keep. |

### Cross-cutting notes for mechanical application

- **Every `!`Ã¢â‚¬Â¦`` shell substitution and inline `git`/`tk`/`date` call** in any passage marked MOVE-to-workflow must relocate **into a spawned agent prompt** (or into go/reflect's own post-return loop) Ã¢â‚¬â€ the workflow script body cannot touch fs/shell/git (HARD CONSTRAINT). Timestamps come in via `args`.
- **All anti-drift willpower** (every CUT-absorbed L5-inner row: go's "stays in 'doing work' mode", the per-feature re-ground ritual, run's "DO NOT pause", reflect's Step 13 prose, plan's Step 8 prose) is removed for the same reason Ã¢â‚¬â€ checkpoint-resume + a plain resumable outer loop make continuation structural. The *real* lifecycle boundaries (increment-completion stops) are KEEP-moat and stay.
- **The two genuine L5 stop-conditions survive everywhere:** (1) increment complete Ã¢â€ â€™ stop + completion report; (2) the closed list of legitimate blockers (missing API key / hardware / ambiguous spec). Strip only the motivational framing around them.
- **"Verify on screen"** appears in go (Critical Rules), run (Phase 6 Rules), and reflect (Step 4) Ã¢â‚¬â€ it is the single thread tying the acceptance gate together and the exact target of reflect's adversarial skeptic fan-out. KEEP all three occurrences.
- **The generic critic to delete** is precisely reflect Step 3's drift smell-list; the **domain critic to keep** is reflect Step 4's outside-in scope verification + plan-iteration Step 3's partition constraints + the Quality Checklist.
