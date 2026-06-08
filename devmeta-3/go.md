# devmeta-3:go — Workflow-native delivery engine

Drives one increment to completion by running **one generic durable workflow per
iteration**. The workflow (`workflows/drive-iteration.workflow.js`) owns the whole
build rhythm (plan → parallel build → integrate → parallel gates+fix → adversarial
reflect → gate); `go` is a **thin launcher** that picks the active iteration, inlines
its scope, launches the workflow, consumes the structured result, advances, and loops.

> **One control plane.** State lives in (a) the increment's `_overview.md` (intent +
> per-iteration status), (b) git (artifacts), and (c) the workflow journal (in-iteration
> execution, resumable). **There is no `tk` ledger.** `go` does not maintain a parallel
> task graph; the workflow's structured return IS the iteration result.

## Phase 0 — Locate the active increment & iteration (effort: low)
1. Read `.devmeta/current-increment.md` → active increment id `NN-XXX` → dir `.devmeta/increments/increment-NN-XXX/`.
2. Read its `_overview.md`. Each iteration row has a **Status** (NOT STARTED / IN PROGRESS / DONE). The **active iteration** is the lowest-numbered one not DONE.
3. If every iteration is DONE → the increment is complete → **Phase 6 (STOP)**.

## Phase 0.5 — Base branch (effort: low)
Read `<incrementDir>/base-branch`. Verify it exists (`git rev-parse --verify`). If the file is missing (first run), ask the user once: use the current branch, or create `YYYY-MM-DD-<increment>`; write the choice to `base-branch`. Never assume `main`. Ensure you are on the base branch.

## Phase 1 — Environment (effort: low)
Read `.devmeta/devmeta.md`. Resolve the project test commands into the four gate slots: `typecheck`, `unit`, `lint`, `migrateReset` (any that don't apply → omit). Test, don't ask. (If no `devmeta.md`, infer from `package.json`.)

## Phase 2..5 — Run the active iteration as ONE workflow (the loop body)
For the active iteration `ITER`:
1. **Inline the args.** Read `~/.claude/commands/devmeta-3/workflows/drive-iteration.workflow.js` (prefer a project-local `.claude/commands/devmeta-3/` copy if present). Find the single line ending `// <<< INLINE POINT` and replace **that entire line** with a concrete literal:
   ```js
   const input = { increment: "NN-XXX", iteration: "ITER", baseBranch: "<base>", incrementDir: ".devmeta/increments/increment-NN-XXX", briefPath: "<brief path or ''>", today: "<YYYY-MM-DD>", test: { typecheck: "<cmd>", unit: "<cmd>", lint: "<cmd>", migrateReset: "<cmd>" } };
   ```
   Change nothing else. `today` is required — the Harvest phase uses it to date-stamp `principles-and-choices.md` (the workflow body cannot call `Date.now()`). Do **not** author a new workflow — this canonical script is the engine. If the read fails, that is an install problem; surface it.
2. **Launch** the edited text: `Workflow({ script: <edited text> })`. Do not pass `args`; do not use `scriptPath` (you edited in memory). The workflow runs plan→build→integrate→gate→reflect→**harvest** itself; `go` writes nothing to git/fs during the run.
3. **Await** the single structured result: `{ iteration, outcome, gatesPass, reflectClean, plan, built, integrate, gates, verdicts, driftFindings, harvest }`.

## Phase 5.3 — Consume the result & advance the ledger (effort: medium)
The workflow's **Harvest phase already wrote and committed** the knowledge promotions (routed `learnings[]` to `CLAUDE.md`/`docs/current/`/`troubleshooting`/`testing-notes`/`lessons-learned`/`engine-notes`), the narrative `project-history.md` entry, the `ia-cycles/iteration-<N>.md` report, and any minor-drift cleanup deliverables on the next iteration. **`go` does not re-write those** — it consumes and advances.
- **`outcome === 'PASS'`** (gates green AND reflect clean): mark `ITER` **DONE** in `_overview.md` and commit that one-line status edit with `git commit --no-verify`. Surface to the user: `harvest.filed` (what knowledge landed where), `harvest.reportPath`, and any `harvest.reassessment[]` proposals — **material reassessments need human approval at the gate** (low-risk reorders/injections Harvest already applied). Also surface any **untestable-justification** features the Plan flagged (a human decision per the critique §2.2). Then proceed per the Human gate below.
- **`outcome === 'NEEDS_WORK'`**: do NOT mark DONE. Summarize the failing `verdicts` (acceptance + test-quality skeptics) and `driftFindings` with severity `major`/`blocker`. **Scope grows, never shrinks** — Harvest has recorded learnings; record the gap as an added deliverable on the next/remediation iteration in `_overview.md`. Then **STOP and report** (NEEDS_WORK is a human checkpoint, not an auto-retry; the bounded fix loop inside the workflow already tried the mechanical fixes).

## Human gate (default ON)
By default, after each iteration's result, **return to the conversation** with the result and the next planned iteration — do not silently chain into the next iteration. This preserves the SDD reflection checkpoint. If the user invoked `go auto` (or says "run to completion"), skip the pause and loop Phase 2..5 automatically until the increment completes or an iteration returns NEEDS_WORK.

## Phase 6 — Increment complete → STOP (the only auto-stop)
When all iterations are DONE: write a short completion report (what shipped per iteration, PRs/commits, gate results, any human-in-the-loop items such as live verification). Do NOT bootstrap the next increment — that is `devmeta-3:start-increment-spec` (a human priority call).

## Core rules
- **Thin loop, fat workflow.** `go` never builds, merges, or wires — the workflow's agents do. `go` only: pick iteration → inline → launch → consume → advance.
- **No `tk`.** If a human-readable task view is wanted, emit it as a projection from the workflow result at the end; never maintain it as the source of truth.
- **Resumable.** If a workflow run is interrupted, relaunch the same iteration; the journal returns completed agents' results (`resumeFromRunId`).
- **Never assume `main`.** Read the base branch from `<incrementDir>/base-branch`.
- Merges inside the workflow use `--no-ff` so branch history stays visible.
