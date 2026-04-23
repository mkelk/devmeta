---
description: Run epics with one subagent per epic, sequential tasks within, parallel across independent epics
argument-hint: [epic-id(s) or --all]
---

## Design

**The epic is the unit of context.** One subagent per epic. Sequential tasks within. Parallel across independent epics. `implementation-notes.md` in the project directory for inter-epic communication. The orchestrator (you) is a thin scheduler.

## Context

- Today's date: !`date +%Y-%m-%d`
- Target: $ARGUMENTS
- Open epics: !`tk list --type epic --status open 2>/dev/null | head -20 || echo "No open epics"`

## Your Task

You are a thin orchestrator. Compute epic dependency order, spawn one worker per epic, track progress. You do NOT implement anything yourself.

### Phase 1: Identify Scope

**If `$ARGUMENTS` contains epic ID(s):**
- Verify each: `tk show <epic-id>`
- Run those epics only

**If `$ARGUMENTS` is `--all` or empty:**
- Get all open epics: `tk list --type epic --status open --json`
- Run all of them

### Phase 2: Compute Epic Dependency Graph

```bash
tk list --type epic --status open --json
```

For each epic, check its tasks for cross-epic `blocked_by` references:
```bash
tk list --parent <epic-id> --json
```

Build the epic-level dependency graph:
- Epic B depends on Epic A if any task in B is blocked by any task in A
- Epics with no cross-epic blockers are independent

**Compute waves at the EPIC level:**
```
Wave 1 = epics with no open epic-level blockers
Wave 2 = epics whose blocker-epics are all in Wave 1
...
```

### Phase 3: Locate Implementation Notes

The `implementation-notes.md` file should already exist in the project directory — created by `/createplan-claude-better`. Find its path from the epic descriptions (look for the `implementation-notes.md` reference in any epic's description).

```bash
tk show <first-epic-id>
# Look for the implementation-notes.md path in the Worker Instructions
```

If it's missing, locate the project directory from the spec path in the epic description and create it:

```markdown
# Implementation Notes — <spec-name>

> Epic workers: read this before starting. Append your section when done.
> Captures patterns established, gotchas discovered, and decisions made across epics.

---
```

### Phase 4: Present Execution Plan

```markdown
## Execution Plan

### Epic Waves

| Wave | Epics (parallel) | Depends On |
|------|-------------------|-----------|
| 1 | Epic A (foundation) | — |
| 2 | Epic B, Epic C, Epic D | Wave 1 |
| 3 | Epic E (validation) | Wave 2 |

### Max Parallelism: N epics in Wave 2

Proceeding with execution...
```

### Phase 5: Execute Waves

```
FOR each wave:
  1. Gather all epics in this wave
  2. For each epic, gather its tasks (ordered): tk list --parent <epic-id> --json
  3. Spawn one subagent per epic — ALL epics in this wave in a SINGLE message (parallel)
  4. Wait for all subagents in this wave to complete
  5. Collect results
  6. Check for completed epics, update status
  7. Report wave results
  8. Proceed to next wave
```

**CRITICAL: Launch all epic workers in a wave in a SINGLE message with multiple Task tool calls.** This is how you get parallelism.

### Phase 6: Spawning Epic Workers

For each epic, spawn a subagent using the Task tool with `subagent_type: "tk-worker"`. If `tk-worker` is not available, use `subagent_type: "general-purpose"`.

**Worker prompt template:**

```
## Your Assignment

**Epic:** [<epic-id>] <epic-title>
**Spec:** `<path-to-spec-file>`

### Epic Description

<full epic description from tk show>

### Tasks (complete in order)

1. [<task-1-id>] <title>
   Acceptance: <acceptance criteria>

2. [<task-2-id>] <title>
   Acceptance: <acceptance criteria>

3. [<task-3-id>] <title>
   Acceptance: <acceptance criteria>

### Task Details

<For each task, include full description from tk show>

### Implementation Notes

<contents of implementation-notes.md — read it and include here>

### Epic Notes (from previous runs)

<output of tk notes <epic-id>>

## Instructions

1. Read `<project-dir>/implementation-notes.md` for context from previous epics
2. Work through tasks IN ORDER — they build on each other
3. For each task:
   a. `tk update <task-id> --status in_progress`
   b. Read the spec section referenced
   c. Implement the changes
   d. Write tests alongside implementation
   e. Run acceptance criteria. Fix and re-run until green
   f. `tk close <task-id> --reason "<summary>"`
4. After ALL tasks are done:
   a. Append your learnings to `<project-dir>/implementation-notes.md` (patterns established, gotchas found, decisions made)
   b. `tk note <epic-id> "EPIC COMPLETE: <summary>"`
5. If a task cannot be completed:
   a. `tk update <task-id> --awaiting escalation`
   b. `tk note <task-id> "<what's blocking and what was tried>"`
   c. Continue to next task if possible, or stop if blocked

## Rules

- Complete tasks in order — later tasks may depend on earlier ones
- Be autonomous — don't ask questions
- NEVER close a task with failing tests
- Use surgical test commands (not full suite) for individual tasks
- Leave useful notes in `<project-dir>/implementation-notes.md` for workers in other epics
- Use `tk` commands, never edit .tick/issues/ directly
```

### Phase 7: Handling Results

When a worker returns, check the result:

**Check epic status:**
```bash
tk list --parent <epic-id> --status open --json
```

**If all tasks closed:** Epic is complete.
```bash
tk close <epic-id> --reason "All tasks completed"
```

**If some tasks still open:**
- Check which tasks are awaiting human: `tk list --parent <epic-id> --awaiting --json`
- Check notes for context: `tk notes <task-id>`
- Record for wave report
- Reset any stale in_progress tasks:
```bash
tk update <task-id> --status open
tk note <task-id> "Worker returned without completing. Reset for retry."
```

### Phase 8: Wave Reporting

After each wave:

```markdown
## Wave <N> Complete

| Epic | Title | Tasks Done | Status |
|------|-------|-----------|--------|
| <id> | <title> | X/Y | Complete / Partial / Blocked |

### Progress
- Epics completed this wave: X
- Total completed: Y / Z
- Remaining: R

### Issues (if any)
- <epic-id>/<task-id>: <what's blocking>

### Next Wave
| Epic | Title | Tasks |
|------|-------|-------|
| <id> | <title> | N tasks |
```

### Phase 9: Final Summary

```markdown
## Execution Complete

| Epic | Title | Status | Tasks |
|------|-------|--------|-------|
| <id> | <title> | Complete / Partial | X/Y |

### Totals
- Epics: X complete, Y partial
- Tasks: X complete, Y blocked
- Waves: N
- Max parallelism: M epics

### Needs Attention (if any)
| Epic | Task | Issue |
|------|------|-------|
| <id> | <id> | <summary from notes> |

### Next Steps
- Run `/checkin-and-pr` to commit and create PR
- Or: address blocked tasks and run `/run-all-claude-better` again
```

---

## Error Handling

**Worker fails to spawn:**
- Log the error
- Reset epic tasks to open
- Continue with remaining epics in the wave

**All epics blocked on human:**
- Report which tasks need attention and why
- Stop execution

**Worker returned with partial completion:**
- Close completed tasks stay closed
- Reset incomplete tasks to open
- On next run, the epic will resume from where it left off (completed tasks won't re-run)

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `tk list --type epic --status open --json` | All open epics |
| `tk list --parent <epic> --json` | Tasks in an epic |
| `tk show <id> --json` | Full details |
| `tk notes <id>` | Notes for epic/task |
| `tk close <id> --reason "..."` | Complete epic/task |
| `tk note <id> "..."` | Record learnings |
| `tk update <id> --status open` | Reset stale task |

---

## Fallback

If orchestration encounters issues:
```bash
# Standard tk pool runner (per-epic)
tk run <epic-id> --pool
```
