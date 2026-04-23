# ADAPT — Autonomous Delivery And Progress Tracking (Global: adapt-m-g)

> **Note:** This is the **global** (`adapt-m-g`) version of the ADAPT commands, installed at `~/.claude/commands/adapt-m-g/`. Projects may also have a local `/adapt:` command set in `.claude/commands/adapt/` that takes precedence for project-specific customizations.

A Claude Code slash-command framework for autonomous, increment-driven software delivery. ADAPT manages the full lifecycle: scoping, planning, parallel execution via subagents, and structured reflection.

## Core Loop

```
/adapt-m-g:go                         # Start here. Drives everything autonomously.
```

`/adapt-m-g:go` reads project state, figures out what to do next, and does it — no prompting required. It loops: **Plan → Execute → Inspect & Adapt → next iteration**.

## Commands

| Command | Purpose |
|---------|---------|
| `/adapt-m-g:go` | Autonomous driver — assesses state, executes next work, loops until done |
| `/adapt-m-g:status` | Read-only progress report with suggested next action |
| `/adapt-m-g:start-increment-spec` | Create a new increment (scope of work) via interactive dialogue |
| `/adapt-m-g:plan-iteration N` | Break an iteration into features and tasks, optimized for parallel execution |
| `/adapt-m-g:run [--all]` | Execute features — one subagent per feature, parallel across independent waves |
| `/adapt-m-g:reflect N` | Inspect & Adapt cycle — code review, docs audit, gap verification, plan reassessment |
| `/adapt-m-g:migrate-to-adapt` | One-time migration from devmeta framework to ADAPT |

## Concepts

- **Increment** — A major scope of work (e.g., "Document management + audit export"). Contains multiple iterations.
- **Iteration** — A deliverable slice within an increment. Produces a PR. Followed by an I&A cycle.
- **Feature** — The unit of parallel execution. One subagent runs one feature. Tasks within are sequential.
- **I&A Cycle** — Inspect & Adapt. Runs after every iteration: reviews code quality, verifies scope, updates docs, reassesses the plan.

## Project Structure

ADAPT stores artifacts in `.adapt/` at the project root:

```
.adapt/
  adapt.md                  # Project-specific config (test commands, env checks, rules)
  current-increment.md      # Pointer to active increment
  project-history.md        # Narrative record of what was built
  lessons-learned.md        # Accumulated learnings
  increments/
    increment-01/
      _overview.md           # Scope, iteration map, exit criteria
      iterations/            # Per-iteration status files
  ia-cycles/                 # Persisted I&A cycle reports
  projects/                  # Feature specs and context logs
```

Task tracking uses `tk` (tick tracker). Features are epics, work items are tasks.

## Typical Workflow

```bash
# 1. Start a new increment (interactive scope definition)
/adapt-m-g:start-increment-spec "My Feature"

# 2. Let the autonomous driver take over
/adapt-m-g:go
# It will: plan iteration 1 → execute features in parallel →
#          reflect → plan iteration 2 → execute → reflect → ... → done

# 3. Check progress at any time
/adapt-m-g:status
```

## Per-Project Configuration

Drop an `adapt.md` file in your project's `.adapt/` directory to customize ADAPT's behavior for that project. Every command reads `.adapt/adapt.md` before acting.

Three sections are recognized:

| Section | Purpose | Example |
|---------|---------|---------|
| `## Testing` | Test commands the agent should use | `npm test`, `pnpm vitest`, surgical per-package commands |
| `## Environment` | Pre-flight checks before first iteration | `node --version`, `docker info`, required CLI tools |
| `## Additional Rules` | Project-specific constraints | "Use the `fc` CLI for all operations", "Never modify migrations directly" |

If no `.adapt/adapt.md` exists, ADAPT falls back to `package.json` scripts for testing and skips environment checks.

## Key Principles

- **Scope never shrinks.** Only the human can cut scope. The agent works harder or asks for help.
- **Tests must pass.** No task or iteration closes with failing tests.
- **Commit per task, PR per iteration.** Merge before the I&A cycle runs.
- **Self-learning.** Each I&A cycle updates docs so the next iteration is easier than the last.
- **`tk next` drives everything.** The tick structure encodes what to do — the agent follows it.
