---
description: Plan an iteration (global) — graph-partition scope into independent features, emit the flat Feature Manifest
argument-hint: [iteration-number]
---

## Project Context

Read `.devmeta/devmeta.md` from the project root if it exists. It provides
project-specific test commands, environment checks, additional rules, and the
`## Effort` tier table.

If no `.devmeta/devmeta.md` exists:
- Testing: look for `package.json` test scripts
- Environment: skip checks
- Effort: default tier `high`, mechanical steps `medium`
- Additional rules: none

> **tk mapping:** tk -t epic = DevMeta Feature, tk -t task = DevMeta Task.
> The `.devmeta/` artifacts, `devmeta.md`, the tk ledger, and the increment
> numbering (`increment-NN-XXX`, iterations `NN.1` / `NN.1R`) are SHARED state —
> read and written identically by the legacy engine.

---

## Context

- Today's date: !`date +%Y-%m-%d`
- Target iteration: $ARGUMENTS
- Ticks initialized: !`test -d .tick && echo "yes" || echo "no"`

## What this command produces

`/devmeta-ng:plan-iteration N` turns an iteration's rough scope into a **partition
the build can run in parallel**. Its single machine-facing deliverable is a **flat
Feature Manifest** — the structured value `/devmeta-ng:go` Phase 3 consumes to drive
the build (it groups the manifest into the per-iteration build workflow's args, or
iterates it directly on the fallback fan-out). Alongside the manifest it writes the
durable artifacts (feature specs, context-log, iteration status, the iteration's
acceptance set, and the tk structure), then continues straight into `go`'s loop
without pausing.

The redesign keeps the domain constraints on the partition and the acceptance
authoring; it **deletes the step-by-step recipe for deriving the cut** and hands the
graph partition itself to the model at high effort.

## Design Philosophy

**The feature is the unit of context.** Each feature runs in one subagent session
sized to ~60–70% of a ~200k-token budget — *not* the full window. Tasks within a
feature are sequential steps, not independent workers.

> **Why cap the feature at ~200k even on a 1M-token window?** Window *size* is not
> context-handling *quality*. Retrieval and reasoning fidelity degrade well before the
> window fills; the reliable working-attention zone sits around ~200k regardless of
> the ceiling. Raising effort buys more reasoning passes, not a larger reliable
> context — so the cut stays the same whether the feature runs as a standalone agent
> or as a node in the build workflow, and whether the dial is `high` or `max`.

**Your primary job is finding feature boundaries that maximize independence.** More
independence = a wider parallel frontier = faster wall-clock time.

**Workers are smart.** They have CLAUDE.md, the spec, the codebase, and
`docs/current/`. Task descriptions guide; they do not micromanage.

**This project uses AI-agentic development.** All code is written by agents.
Prioritize consistency, mainstream patterns, and well-known libraries. See
`docs/current/principles-and-choices.md`.

## Effort

This command runs at distinct tiers per activity, off the ladder
`low / medium / high / xhigh / max`:

| Activity | Tier | Why |
|---|---|---|
| Read state, init tk | low | Mechanical reads of files + tk. |
| Scope check / restructure `_overview.md` | high | Scope ownership is real planning, not mechanics. |
| **The partition cut (finding the feature boundaries)** | **xhigh** | The highest-leverage decision in the engine — a weak cut silently serializes the entire iteration. Bump to `max` for high-cost-of-failure scope (migrations, auth, money, concurrency). |
| Author the acceptance set ("Verify on screen" → executable evals) | high | Defining the bar that reflect will attack. |
| Emit artifacts, write tk structure, self-check | medium | Mechanical seams. |

Read the `## Effort` table from `.devmeta/devmeta.md` if present and prefer its
project-tuned tiers; the partition cut is `xhigh` by default either way.

## The domain constraints on the partition (non-negotiable)

These are the rules the partition **must satisfy**. They are constraints to satisfy,
not a procedure to follow:

- **Independence is the objective.** Maximize the parallel frontier — the number of
  features that can run concurrently once the foundation lands. Fewer waves, wider
  waves.
- **No file is modified by two independent features.** A write-write overlap means
  the two features are not independent; either merge them or pull the shared file into
  the foundation. This invariant is hard — the manifest is rejected if it is violated.
- **Extract shared foundations.** Schemas, types, shared utilities, config/env
  loading, and the storage/persistence layer go into a single foundation feature
  (wave 1). Consumers depend on it, never the reverse.
- **Context sizing (~200k).** Each feature must fit one subagent session at ~60–70% of
  the window, with headroom for the codebase, specs, and context-log. Split anything
  larger; merge anything trivial.
- **Cross-feature dependencies are minimal and feature-level only.** Express
  dependencies as waves, never as task-to-task choreography across features.

## What is deleted (do not reintroduce)

- The numbered **partitioning recipe** ("cluster by shared files → extract foundations
  → check independence → check sizing → maximize frontier" as ordered sub-steps), the
  explicit work-to-file matrix template, and the dependency-ordering heuristics list.
  These are absorbed: a high-effort model owns the *how*; the constraints above are the
  spec for the cut.
- The hand-managed internal scratch formats for that analysis.
- The per-feature **"Re-ground after Feature X"** task. Per-feature isolation + the
  spec + `context-log.md` (and the build workflow's checkpoint-resume on the opt-in
  path) replace it. Do not manufacture it.
- Restating CLAUDE.md / principles inside feature specs — agents already read those.

## Your Task

### Step 0: Read state and initialize

```bash
tk list 2>/dev/null || tk init
```

Resolve the active increment via `.devmeta/current-increment.md` and read:

- The increment's `_overview.md` (scope, iteration map, exit criteria, and the
  iteration's rough "Verify on screen" criteria).
- The iteration's `iterations/iteration-<N>/plan.md` if it exists; if not, draft a
  refined scope from the overview's rough scope.
- `CLAUDE.md` — project orientation.
- `docs/current/principles-and-choices.md` — all architectural decisions.
- `.devmeta/lessons-learned.md` — do not repeat past mistakes.
- Any spec/architecture docs referenced in the overview.

### Step 1: Scope check — does this iteration still make sense?

Before partitioning, evaluate the iteration's scope against what actually exists.
This is scope ownership and it stays:

1. **Too large?** 8+ features or a massive foundation alone → **split the iteration.**
   Update `_overview.md` directly and renumber downstream iterations.
2. **Already partly delivered?** Remove deliverables prior work covered.
3. **New deliverables that belong here?** Cleanup from the previous reflection,
   discoveries, or unanticipated prerequisites.
4. **Order still right?** If this iteration depends on something from a later one,
   reorder.

If you restructure, update `_overview.md` and note the change in
`.devmeta/project-history.md`. Scope can grow, never shrink — only the human cuts
scope. Then continue.

### Step 2: Cut the partition (at xhigh effort)

This is THE critical step. Hand the iteration scope + the domain constraints above to
the model at **`xhigh` effort** (`max` for high-cost-of-failure scope). Return the
feature graph directly: for each feature, its name, scope (one paragraph), file
footprint, wave assignment, the features it depends on, a **surgical** test command,
and a one-line spec stub.

The constraints are the spec for the cut; the algorithm to reach them is yours. Do not
emit a work-to-file matrix or a heuristics walkthrough — produce the graph.

### Step 3: Author the iteration's acceptance set ("Verify on screen")

Lift the iteration's **"Verify on screen"** criteria from the increment `_overview.md`
/ iteration scope and **upgrade each line into an executable acceptance eval**: an
exact command plus its observable expected result (output / exit signal), or a named
manual observation when no command can express it.

Persist this as the iteration's **acceptance set** alongside `status.md` (Step 6) —
`<increment-dir>/iterations/iteration-<N>/acceptance.md`. This is the L5
definition-of-done; the human is the only party who may weaken it.

> This acceptance set is **devmeta's**, and it is **NOT** part of the Feature Manifest
> and **NOT** passed to the build. Build agents self-check via their surgical tests
> only. `/devmeta-ng:reflect N` later reads this acceptance set and passes it into the
> adversarial acceptance fan-out as the criteria its skeptics must attack — the
> acceptance *verdict* is reflect's alone, and the criteria are passed in, never
> invented by any workflow.

### Step 4: Emit durable artifacts

Written directly on the base branch (these are the moat and stay):

**Feature specs** — one per feature at
`.devmeta/projects/YYYY-MM-DD-<feature-name>/YYYY-MM-DD-<feature-name>-spec.md`. The
spec is the full guide the agent reads; the manifest only carries a pointer to it.
Keep specs thin — scope, files to create/modify, ordered implementation steps,
surgical test command. **No "Open questions" placeholder, no restating CLAUDE.md /
principles.**

**Shared context log** — one per iteration's feature set:

```
.devmeta/projects/YYYY-MM-DD-<feature-name>/context-log.md
```

```markdown
# Shared Context Log — <feature-name>

> Feature workers: read this before starting. Append your section when done.
> Captures patterns established, gotchas discovered, and decisions made.

---
```

Its path is carried in the manifest so every agent reads/appends the same file.

**Iteration status file** — `<increment-dir>/iterations/iteration-<N>/status.md`:

```markdown
# Iteration <N> Status

**Started:** YYYY-MM-DD
**Status:** In Progress

## Features

| Feature | ID | Tasks | Status | Depends On |
|---------|----|-------|--------|-----------|
| Foundation | <id> | N | Not started | — |
| Feature X | <id> | N | Not started | Foundation |
| Feature Y | <id> | N | Not started | Foundation |

## Feature Independence Map

        [Foundation]
        /          \
  [Feature X]  [Feature Y]   ← parallel

## Notes

<Updated as iteration progresses>
```

Keep the human-readable feature table + ASCII independence map; do not duplicate
per-task detail that already lives in tk and the spec.

**tk structure** — one epic per feature, ordered task children, cross-feature
`tk block` only at feature granularity. Capture each epic id back into the manifest
(it becomes the manifest's `epicId`).

**Feature format:**
```bash
tk create "<iteration>: <phase>" -t epic -d "## Scope
<What this feature delivers>

## Spec
\`.devmeta/projects/YYYY-MM-DD-<name>/YYYY-MM-DD-<name>-spec.md\`

## Worker Instructions
- Complete tasks in order
- Read \`.devmeta/projects/YYYY-MM-DD-<name>/context-log.md\` before starting
- Read \`.devmeta/lessons-learned.md\` before starting
- Append learnings to context-log.md when done"
```

**Task format:**
```bash
tk create "<title>" \
  --parent <epic-id> \
  -d "## Objective
<what this step delivers>

## Spec Reference
\`<path>\` — Section: \"<section>\"

## Scope
**Files:** \`path/to/file\` — what changes

## Implementation
1. Step
2. Step

## Tests
Run: \`<surgical test command>\`
Do NOT close until tests pass." \
  --acceptance "<test command> passes"
```

**Cross-feature dependencies (feature level only):**
```bash
tk block <epic-B-first-task-id> <epic-A-last-task-id>
```

Do NOT create "Re-ground after Feature X", "Create PR", "Merge PR", or
"Commit metadata" task ticks — those mechanics are owned by `/devmeta-ng:go` (PR/merge/
metadata in its integrate phase; re-grounding is absorbed). `plan-iteration` no longer
materializes them.

### Step 5: Emit the Feature Manifest (primary output)

The manifest is the contract between `plan-iteration` and the build. It is a **flat**
plain-data value: `/devmeta-ng:go` Phase 3 receives it and owns the transform that
groups it into the build workflow's wave-shaped args (renaming `name`→`title`,
`scope`→`description`, `epicId`→`featureId`, collapsing `wave`+`dependsOn` into the
`waves[][]` grouping, and deriving each branch name). Because the build workflow's
script body cannot touch the filesystem, **every path in the manifest is dereferenced
by the spawned agents, not by the script** — the manifest carries pointers; the agents
read them.

**Shape (flat — this exact field set):**

```jsonc
{
  "increment": "76-abc",
  "iteration": "76.1",
  "baseBranch": "2026-05-31-doc-management",   // mirrors <increment-dir>/base-branch; agents branch from it
  "contextLog": ".devmeta/projects/2026-05-31-doc-export/context-log.md",
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
      "wave": 2,                                 // same wave as pdf-renderer → parallel frontier = 2
      "scope": "Render export records to CSV",
      "files": ["src/render/csv.ts"],
      "dependsOn": ["foundation"],
      "test": "pnpm vitest run src/render/csv.test.ts",
      "spec": ".devmeta/projects/2026-05-31-csv-renderer/2026-05-31-csv-renderer-spec.md"
    }
  ]
}
```

**Field law (the flat manifest carries exactly these):** top level
`increment`, `iteration`, `baseBranch`, `contextLog`, `features[]`; each feature
`name`, `epicId`, `wave`, `scope`, `files`, `dependsOn`, `test`, `spec`.

Field notes:
- `wave` and `dependsOn` are redundant-by-design: `wave` is the precomputed schedule
  go groups its parallel barriers by; `dependsOn` is the source-of-truth graph the
  build (and the self-check) validates `wave` against.
- `epicId` and `baseBranch` exist precisely so the **agents** create branches, commit,
  open PRs, and update tk — the script never does.
- `test` is a **surgical** command per feature, not the full suite.
- **No `verifyOnScreen` field.** Acceptance lives in the iteration's acceptance set
  (Step 3), consumed by reflect — never threaded through the build.

### Step 6: Self-check the manifest (domain gate, not a generic critic)

Before handing off, validate the manifest against the invariants. This is a retained
domain check (it encodes the partition rules), distinct from any generic code critic:

- No file appears in two features whose `dependsOn` sets don't transitively order them
  (the write-write invariant).
- Every non-foundation feature's `dependsOn` resolves to an earlier wave; `wave` is
  consistent with `dependsOn`.
- Every feature has a non-empty `test` and a `spec` that exists on disk.
- Every `epicId` resolves in tk.

If a check fails, **re-cut** (back to Step 2) — do not hand a broken partition to the
build.

### Step 7: Continue immediately into the loop (no pause)

`plan-iteration` is a waypoint inside `/devmeta-ng:go`, never a stopping point. After
emitting artifacts and passing the self-check, return the manifest to `go` and let it
proceed to its execution phase (launch the build workflow if the user opted in, else
the per-feature fan-out fallback).

**DO NOT** summarize, present the independence map as a decision, or ask "shall I
proceed?" The manifest **is** the plan; execution starts now. If the human needs to
intervene, they will interrupt — your job is to keep moving.

## Quality Checklist

- [ ] No file modified by two independent features (write-write invariant)
- [ ] Shared code in the foundation feature
- [ ] Each feature fits in ~60–70% of context
- [ ] Tasks ordered and building on each other within each feature
- [ ] Every feature has a surgical test command
- [ ] Cross-feature deps are minimal and feature-level only
- [ ] `wave` consistent with `dependsOn`; every `epicId` resolves in tk
- [ ] context-log.md created for the feature set
- [ ] iteration status.md created
- [ ] iteration acceptance set ("Verify on screen" evals) written for reflect
- [ ] Parallel frontier is as wide as possible
- [ ] Flat Feature Manifest emitted (exact field set; no `verifyOnScreen`)
