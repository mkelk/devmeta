# DevMeta — Development Metadata Framework (Global: devmeta)

> **Note:** This is the **global** (`devmeta`) version of the DevMeta commands, installed at `~/.claude/commands/devmeta/`. Projects may also have a local `/devmeta:` command set in `.claude/commands/devmeta/` that takes precedence for project-specific customizations.

A Claude Code slash-command framework for autonomous, increment-driven software delivery. DevMeta manages the full lifecycle: scoping, planning, parallel execution via subagents, and structured reflection.

## Core Loop

```
/devmeta:go                         # Start here. Drives everything autonomously.
```

`/devmeta:go` reads project state, figures out what to do next, and does it — no prompting required. It loops: **Plan → Execute → Inspect & Adapt → next iteration**.

## Commands

| Command | Purpose |
|---------|---------|
| `/devmeta:go` | Autonomous driver — assesses state, executes next work, loops until done |
| `/devmeta:status` | Read-only progress report with suggested next action |
| `/devmeta:start-increment-spec` | Create a new increment (scope of work) via interactive dialogue |
| `/devmeta:plan-iteration N` | Break an iteration into features and tasks, optimized for parallel execution |
| `/devmeta:run [--all]` | Execute features — one subagent per feature, parallel across independent waves |
| `/devmeta:reflect N` | Inspect & Adapt cycle — code review, docs audit, gap verification, plan reassessment |
| `/devmeta:migrate-from-adapt` | One-time migration from ADAPT (.adapt/) to DevMeta (.devmeta/) |

## Concepts

- **Increment** — A major scope of work (e.g., "Document management + audit export"). Contains multiple iterations.
- **Iteration** — A deliverable slice within an increment. Produces a PR. Followed by an I&A cycle.
- **Feature** — The unit of parallel execution. One subagent runs one feature. Tasks within are sequential.
- **I&A Cycle** — Inspect & Adapt. Runs after every iteration: reviews code quality, verifies scope, updates docs, reassesses the plan.

## Project Structure

DevMeta stores artifacts in `.devmeta/` at the project root:

```
.devmeta/
  devmeta.md                # Project-specific config (test commands, env checks, rules)
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
/devmeta:start-increment-spec "My Feature"

# 2. Let the autonomous driver take over
/devmeta:go
# It will: plan iteration 1 → execute features in parallel →
#          reflect → plan iteration 2 → execute → reflect → ... → done

# 3. Check progress at any time
/devmeta:status
```

## Per-Project Configuration

Drop a `devmeta.md` file in your project's `.devmeta/` directory to customize DevMeta's behavior for that project. Every command reads `.devmeta/devmeta.md` before acting.

Three sections are recognized:

| Section | Purpose | Example |
|---------|---------|---------|
| `## Testing` | Test commands the agent should use | `npm test`, `pnpm vitest`, surgical per-package commands |
| `## Environment` | Pre-flight checks before first iteration | `node --version`, `docker info`, required CLI tools |
| `## Additional Rules` | Project-specific constraints | "Use the `fc` CLI for all operations", "Never modify migrations directly" |

If no `.devmeta/devmeta.md` exists, DevMeta falls back to `package.json` scripts for testing and skips environment checks.

## Key Principles

- **Scope never shrinks.** Only the human can cut scope. The agent works harder or asks for help.
- **Tests must pass.** No task or iteration closes with failing tests.
- **Commit per task, PR per iteration.** Merge before the I&A cycle runs.
- **Self-learning.** Each I&A cycle updates docs so the next iteration is easier than the last.
- **`tk next` drives everything.** The tick structure encodes what to do — the agent follows it.
