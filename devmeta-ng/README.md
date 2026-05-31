# DevMeta — Development Metadata Framework (Global: devmeta-ng)

> **Note:** This is the **global** (`devmeta-ng`) version of the DevMeta commands, installed at `~/.claude/commands/devmeta-ng/`. Projects may also have a local `/devmeta-ng:` command set in `.claude/commands/devmeta-ng/` that takes precedence for project-specific customizations.

A Claude Code slash-command framework for autonomous, increment-driven software delivery. DevMeta manages the full lifecycle: scoping, planning, parallel execution via subagents, and structured reflection.

## Core Loop

```
/devmeta-ng:go            # Start here. Parallel-Agent execution; no opt-in needed.
/devmeta-ng:go workflow   # Same loop, but builds each iteration via a Dynamic Workflow.
```

`/devmeta-ng:go` reads project state, figures out what to do next, and does it — no prompting required. It loops: **Plan → Execute → Inspect & Adapt → next iteration**.

## Commands

### Normal use — only two commands

In day-to-day use you should only ever need these:

| Command | Purpose |
|---------|---------|
| `/devmeta-ng:start-increment-spec` | Create a new increment (scope of work) via interactive dialogue |
| `/devmeta-ng:go` | Autonomous driver — assesses state, executes next work, loops until done |

The workflow is: run `start-increment-spec` once to define the work, then run `go` and let it drive. `go` handles planning, execution, reflection, and moving between iterations on its own.

### Internal commands (invoked by `/devmeta-ng:go`, not by the user)

These are orchestration primitives that `/devmeta-ng:go` calls internally. You can run them manually for debugging, but in normal use you should not — calling them outside the autonomous loop breaks the flow and forces you to stitch iteration boundaries by hand.

| Command | Purpose |
|---------|---------|
| `/devmeta-ng:plan-iteration N` | Break an iteration into features and tasks, optimized for parallel execution |
| `/devmeta-ng:run [--all]` | Execute features — one subagent per feature, parallel across independent waves |
| `/devmeta-ng:reflect N` | Inspect & Adapt cycle — adversarial acceptance verification, docs audit, plan reassessment |
| `/devmeta-ng:status` | Read-only progress report with suggested next action (safe to run anytime) |

## Concepts

- **Increment** — A major scope of work (e.g., "Document management + audit export"). Contains multiple iterations.
- **Iteration** — A deliverable slice within an increment. Produces a PR. Followed by an I&A cycle.
- **Feature** — The unit of parallel execution. One subagent runs one feature. Tasks within are sequential.
- **I&A Cycle** — Inspect & Adapt. Runs after every iteration: verifies scope against acceptance criteria, updates docs, reassesses the plan.

## Running with or without workflows

`/devmeta-ng:go` builds each iteration through one of two interchangeable substrates. **You choose per run, from the invocation:**

| You run | Substrate | What happens |
|---------|-----------|--------------|
| `/devmeta-ng:go` (plain) | **Parallel-Agent** (no opt-in) | `go` spawns one subagent per feature directly, in a single batch per wave — the `/devmeta-ng:run` procedure. Works anywhere; no Dynamic-Workflows access required. |
| `/devmeta-ng:go workflow` | **Dynamic Workflow** | `go` launches the reviewed `workflows/build-iteration.workflow.js` with the iteration's manifest, fanning features across dependency waves as parallel subagents with checkpoint-resume and an independent per-feature verify stage. |

The opt-in is the literal **`workflow`** keyword anywhere in the invocation (an active **`ultracode`** session setting opts in too). Without it, `go` uses the parallel-Agent path automatically — the Dynamic Workflows tool requires explicit per-run opt-in by design, so `go` never launches one silently.

Both paths run the **identical** per-feature agent prompt and write the **identical** `.devmeta/` + `tk` state. The only difference is *who schedules the fan-out* — which is exactly what makes them A/B-comparable: drive one increment plain and the next with `workflow`, then compare cost, wall-clock, and rigor.

The **I&A step follows the same opt-in**: `/devmeta-ng:reflect` runs its adversarial acceptance verification as a Dynamic Workflow (`workflows/reflect-iteration.workflow.js`) when opted in, else inline in the session. Either way devmeta owns the acceptance criteria and the memory-promotion step.

### Why the workflow scripts are pre-built (and when we'd go dynamic)

The scripts in `workflows/` are **pre-built and reviewed**, not generated fresh each run. `go`/`reflect` launch them via the Workflow tool's `scriptPath` and pass the iteration data as `args` (which the runtime delivers as a JSON *string*, so each script parses it defensively).

This is deliberate. The power of the workflow engine — parallel fan-out, the 16/1000-agent caps, checkpoint-resume, structured-output schemas, adversarial verify — is *runtime* behavior, available to a static script just as much as a freshly-authored one. Authoring on-the-fly would only add per-run **structural improvisation**, and devmeta's orchestration shape never improvises: every iteration is "waves of independent features → build → verify → return a manifest." Only the *data* changes, and the manifest already carries it.

For an engine that runs **unattended**, a tested orchestration is a safety property — a regeneration bug would be a silent broken run mid-flight. (When first authored, these scripts had format, `args`, and verify-checkout bugs — all caught precisely *because* they're reviewable, smoke-testable artifacts.) A static file can be diffed and hardened over time; an ephemeral generated script can't.

**When we would go dynamic:** for a genuinely novel, one-off sub-task whose *shape* is bespoke (a special audit, an unusual migration). Crystallize the recurring loop; improvise only the novel. Dynamic generation is the exploration mode; a reviewed script is the production mode — and the recurring delivery loop is production.

## Project Structure

DevMeta stores artifacts in `.devmeta/` at the project root:

```
.devmeta/
  devmeta.md                # Project-specific config (test commands, env checks, rules)
  current-increment.md      # Pointer to active increment
  project-history.md        # Narrative record of what was built
  lessons-learned.md        # Accumulated learnings
  increments/
    increment-01-abc/       # <NN>-<XXX>: integer for sorting + 3-letter random suffix
      _overview.md           # Scope, iteration map, exit criteria
      iterations/            # Per-iteration status files
      ia-cycles/             # Per-iteration I&A reports for this increment
  projects/                  # Feature specs and context logs
```

Increment directories use a numeric prefix for sorting plus a 3-letter random suffix
(e.g. `increment-76-abc/`). The suffix prevents merge conflicts when two parallel
branches/worktrees both create the next increment. Iteration numbers within an
increment are unsuffixed (`76.1`, `76.1R`) — they're already namespaced by the
unique parent directory.

Task tracking uses `tk` (tick tracker). Features are epics, work items are tasks.

## Typical Workflow

Two commands per increment, repeated.

```bash
# 1. Start a new increment (interactive scope definition)
/devmeta-ng:start-increment-spec "My Feature"

# 2. Let the autonomous driver take this increment to completion
/devmeta-ng:go
# It will: plan iteration 1 → execute features in parallel →
#          reflect → plan iteration 2 → execute → reflect → ...
#          → close the increment (PR, merge, update current-increment.md) → STOP
# If the loop ever stops mid-increment (interrupt, crash, end of session),
# just run /devmeta-ng:go again — it resumes from tick state, no setup required.

# 3. When the current increment is done, pick the next one:
#    - new scope:       /devmeta-ng:start-increment-spec "Next Feature"  →  /devmeta-ng:go
#    - pre-spec'd one:  edit .devmeta/current-increment.md to point at it  →  /devmeta-ng:go
```

`/devmeta-ng:go` drives **a single increment** to completion. Increment completion is a natural stopping point — the next increment is a priority call the user owns, so the loop exits cleanly when the current one is done and waits for the user to re-invoke. Do NOT manually run `plan-iteration`, `run`, or `reflect` between iterations *within* an increment — `/devmeta-ng:go` calls them itself and will break the autonomous loop if you pre-empt it. `/devmeta-ng:status` is safe to run at any time for a read-only progress check.

## Per-Project Configuration

Drop a `devmeta.md` file in your project's `.devmeta/` directory to customize DevMeta's behavior for that project. Every command reads `.devmeta/devmeta.md` before acting.

Four sections are recognized:

| Section | Purpose | Example |
|---------|---------|---------|
| `## Testing` | Test commands the agent should use | `npm test`, `pnpm vitest`, surgical per-package commands |
| `## Environment` | Pre-flight checks before first iteration | `node --version`, `docker info`, required CLI tools |
| `## Additional Rules` | Project-specific constraints | "Use the `fc` CLI for all operations", "Never modify migrations directly" |
| `## Effort` | Task-type → effort-tier lookup (see below) | the declarative table shipped as a tunable template |

If no `.devmeta/devmeta.md` exists, DevMeta falls back to `package.json` scripts for testing and skips environment checks.

## Effort

DevMeta sets the Opus 4.8 **effort dial** per phase rather than running everything at one setting. The dial is the only routing surface in the engine — there is no custom router, token-budget accountant, or cost-vs-quality heuristic. The `## Effort` section of `.devmeta/devmeta.md` is a flat, declarative **task-type → tier** lookup (about twenty lines a human can read and tune); the engine reads it when it spawns an agent or launches a workflow and writes nothing else.

The tier ladder, lowest to highest, is:

| Tier | When |
|------|------|
| `low` | Mechanical reads of `tk` + a single file: assess ledger state, establish the base branch, environment checks. |
| `medium` | Mechanical seams: the metadata commit, status/history writes, the ledger advance, tag/prune. The floor for any non-code-logic work. |
| `high` | Default. Real code against real acceptance criteria: feature implementation, integrate (PR/merge), and outside-in gap-fixes. |
| `xhigh` | The two highest-leverage decisions: **the partition cut** (a bad cut silently serializes an entire iteration) and **the reflect acceptance fan-out** (cheap skeptics rubber-stamp a false victory). |
| `max` | Reserved for high-cost-of-failure work (e.g. release/finalize iterations, or a build feature flagged high-risk: migrations, auth, money, concurrency). |

Per-phase assignment as `/devmeta-ng:go` drives an increment:

| Phase / activity | Tier |
|------------------|------|
| Assess ledger, establish base branch, environment check | `low` |
| Metadata commit, status, ledger advance, tag/prune | `medium` |
| Plan the iteration, integrate (PR/merge) | `high` |
| Feature implementation (build) | `high` (per feature; bumped to `xhigh`/`max` for high-risk specs) |
| **The partition cut** (in `plan-iteration`) | `xhigh` |
| **The reflect acceptance fan-out** (skeptics + consistency lens) | `xhigh` (`max` on a finalize/release iteration) |

`plan-iteration` stamps a resolved tier onto each feature at plan time (defaulting from feature-implementation, overridable by a spec risk flag); the build substrate — agent-per-feature or the dynamic workflow — reads that stamp and sets the dial per feature. A missing `## Effort` section defaults to `high`, with mechanical steps at `medium`. If a future need looks like "pick the effort dynamically based on signal X," the answer is to add a row to the table or bump one inline — not to write routing logic. The dial is the routing.

## Key Principles

- **Scope never shrinks.** Only the human can cut scope. The agent works harder or asks for help.
- **Tests must pass.** No task or iteration closes with failing tests.
- **Commit per task, PR per iteration.** Merge before the I&A cycle runs.
- **Self-learning.** Each I&A cycle updates docs so the next iteration is easier than the last.
- **`tk next` drives everything.** The tick structure encodes what to do — the agent follows it.
