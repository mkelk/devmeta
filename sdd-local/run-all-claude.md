---
description: Run all epics using Claude-native orchestration with tk-worker subagents and persistent memory
argument-hint: [epic-id(s) or --all]
---

## Execution Model

**Claude-native orchestration with tk-worker subagents.**

Instead of delegating to `tk run --pool` (Go binary spawning external Claude processes), YOU are the orchestrator. You compute global dependency waves across all epics and spawn `tk-worker` subagents directly via the Task tool. Workers have persistent memory and full project context via CLAUDE.md.

### Key Advantages Over Standard `/run-all`

| Aspect | Standard (`tk run --pool`) | Cloud (this command) |
|--------|----------------------------|----------------------|
| Orchestrator | Go binary (tk) | You (Claude lead session) |
| Workers | Cold-start Claude processes | `tk-worker` subagents with persistent memory |
| Context | Pre-generated epic context file | CLAUDE.md + spec + memory (no pre-generation) |
| Communication | tk notes only | tk notes + Task tool result |
| Scheduling | tk's internal wave analysis | Your global wave computation with resource tags |
| E2E detection | Keyword heuristic | Explicit `[E2E]` title tag |
| Cross-epic parallel | No (epics run serially) | Yes (global waves across all epics) |

### Resource-Tag Serialization

Tasks tagged in their title determine serialization:
- **`[E2E]`** — Needs exclusive emulator access. Only one at a time.
- **`[EXCLUSIVE:<name>]`** — Needs named exclusive resource. Serialize by name.
- **No tag** — Runs freely in parallel.

## Context

- Today's date: !`date +%Y-%m-%d`
- Target: $ARGUMENTS
- Open epics: !`tk list --type epic --status open 2>/dev/null | head -20 || echo "No open epics"`

## Your Task

You are the orchestrator. Compute global waves, spawn workers, track progress, handle failures.

### Phase 1: Identify Target Scope

**If `$ARGUMENTS` contains epic ID(s):**
- Verify each: `tk show <epic-id>`
- Work on those epics only

**If `$ARGUMENTS` is `--all` or empty:**
- Get all open epics: `tk list --type epic --status open --json`
- Work across all of them (global waves)

### Phase 2: Compute Global Dependency Graph

**Step 1: Gather all open tasks:**
```bash
tk list --status open --json
```

**Step 2: Build the dependency graph.** For each task, identify:
- `blocked_by` — direct dependencies
- Which tasks it blocks
- Resource tags in title (`[E2E]`, `[EXCLUSIVE:*]`)

**Step 3: Compute global waves:**
```
Wave 1 = tasks with NO open blockers
Wave 2 = tasks whose ALL blockers are in Wave 1
Wave 3 = tasks whose ALL blockers are in Wave 1 or 2
...and so on
```

Tasks from different epics CAN be in the same wave if they don't depend on each other.

**Step 4: Identify resource serialization within waves:**

For each wave, separate tasks by resource needs:
- **Unrestricted tasks** — launch all in parallel
- **`[E2E]` tasks** — launch one at a time, sequentially
- **`[EXCLUSIVE:X]` tasks** — one per resource name at a time
- Unrestricted tasks run in parallel WITH serialized tasks

**Step 5: Present the plan:**

```markdown
## Execution Plan

### Global Waves

| Wave | Parallel Tasks | Serialized Tasks | Max Workers |
|------|---------------|------------------|-------------|
| 1 | task-a, task-b | [E2E] task-c | 2 + 1 serial |
| 2 | task-d | [E2E] task-e, [E2E] task-f | 1 + 2 serial |

### Resource Serialization
- [E2E]: task-c → task-e → task-f (one at a time)

Proceeding with execution...
```

### Phase 3: Wave Execution Loop

```
REPEAT until all tasks complete or all blocked:
  1. Get ready tasks: all open tasks with no open blockers
  2. If no ready tasks and all closed → DONE
  3. If no ready tasks but some awaiting human → REPORT and STOP
  4. Separate ready tasks by resource tags
  5. Launch workers for unrestricted tasks (all in parallel)
  6. Launch workers for serialized tasks (one per resource at a time)
  7. Wait for all workers in this wave to complete
  8. Collect results, check for epic completions
  9. Report wave progress
  10. Loop (re-compute ready tasks)
```

### Phase 4: Spawning Workers

For each task in a wave, spawn a `tk-worker` subagent using the Task tool.

**CRITICAL: Launch ALL independent workers in a SINGLE message with multiple Task tool calls.** This maximizes parallelism.

**For unrestricted tasks — launch all in parallel:**

Use the Task tool with `subagent_type: "tk-worker"` for each task. If `tk-worker` is not available as a subagent type, use `subagent_type: "general-purpose"` and include the worker instructions below.

**Worker prompt template:**

```
## Your Assignment

**Task:** [<task-id>] <task-title>
**Epic:** [<epic-id>] <epic-title>
**Spec:** `<path-to-spec-file>`

### Task Details

<full task description from tk show>

### Acceptance Criteria

<acceptance criteria from tk show>

### Epic Notes (learnings from previous workers)

<output of tk notes <epic-id>>

## Instructions

1. Mark in progress: `tk update <task-id> --status in_progress`
2. Read the spec section referenced in the task
3. Check epic notes above for previous worker learnings
4. Implement the changes described in the task
5. Write tests alongside implementation
6. Run acceptance criteria. If tests fail, fix and re-run until green
7. Close: `tk close <task-id> --reason "<summary of what was done>"`
8. Add epic note: `tk note <epic-id> "<key insight for next worker>"`

## Rules

- Complete only THIS task
- Be autonomous — don't ask questions
- NEVER close with failing tests
- Use surgical test commands (not full suite)
- Leave useful notes for future workers
- Use `tk` commands, never edit .tick/issues/ directly
```

**For `[E2E]` tasks — launch ONE at a time, wait, then launch next:**

Add to the worker prompt:
```
## E2E Context

This task uses the Android emulator (exclusive resource).

**Before starting:**
1. Read the project e2e/SCRATCHPAD.md for previous learnings
2. Read e2e/COOKBOOK.md for project-specific patterns

**After completing:**
1. Update e2e/SCRATCHPAD.md with your findings
2. Log the test run in e2e/LOG.md
3. Add reusable patterns to e2e/COOKBOOK.md

**Reference:** docs/current/e2e/tick-quick-reference.md
```

Wait for the E2E worker to finish before launching the next E2E task. Non-E2E tasks can run concurrently with the current E2E task.

**For `[EXCLUSIVE:<name>]` tasks — same as E2E: one per resource at a time.**

### Phase 5: Handling Worker Results

When a worker completes (Task tool returns), check the result:

**Success indicators:**
- Worker reports task closed with reason
- `tk show <task-id>` shows status `closed`

**Failure indicators:**
- Worker reports awaiting human (`--awaiting approval/input/review/escalation`)
- Worker hit an error and couldn't complete
- Task is still `in_progress` after worker returns

**For failed/blocked tasks:**
1. Check task notes: `tk notes <task-id>`
2. Record the issue for your wave report
3. Do NOT retry immediately — move to next wave
4. Failed tasks may become retryable after other tasks complete

**For stale tasks** (in_progress but worker returned without closing):
```bash
tk update <task-id> --status open
tk note <task-id> "Worker returned without completing. Reset to open for retry."
```

### Phase 6: Wave Completion Reporting

After each wave:

**1. Check for completed epics:**
```bash
# For each epic that had tasks in this wave:
tk list --parent <epic-id> --status open --json
# If empty → epic is complete
```

**2. Close completed epics:**
```bash
tk note <epic-id> "EPIC COMPLETE: <summary>"
tk close <epic-id> --reason "All tasks completed: <summary>"
```

**3. Report progress:**

```markdown
## Wave <N> Complete

### Results
| Task | Epic | Title | Result |
|------|------|-------|--------|
| <id> | <epic> | <title> | Closed / Awaiting <type> / Failed |

### Progress
- Completed this wave: X tasks
- Total completed: Y / Z tasks
- Awaiting human: W tasks
- Remaining: R tasks

### Epics Status
| Epic | Progress | Status |
|------|----------|--------|
| <id> | X/Y | In Progress / Complete / Blocked |

### Next Wave Preview
| Task | Epic | Title | Resource |
|------|------|-------|----------|
| <id> | <epic> | <title> | (none) / [E2E] |
```

### Phase 7: Final Summary

After all waves complete:

```markdown
## Execution Complete

### Summary
| Epic | Title | Status | Tasks |
|------|-------|--------|-------|
| <id> | <title> | Complete / Partial | X/Y |

### Totals
- Epics: X complete, Y partial
- Tasks: X complete, Y failed, Z awaiting human
- Waves executed: N
- Max parallelism achieved: M workers

### Needs Attention (if any)
| Task | Epic | Issue |
|------|------|-------|
| <id> | <epic> | Awaiting <type>: <summary from notes> |

### Next Steps
- Run `/checkin-and-pr` to commit and create PR
- Or: address blocked tasks and run `/run-all-claude` again
```

---

## Error Handling

**Worker fails to spawn:**
- Log the error
- Reset task to open: `tk update <task-id> --status open`
- Continue with remaining tasks in the wave

**All tasks blocked on human:**
- Report which tasks need attention and why
- List the specific human actions needed
- Stop execution

**Circular dependencies detected:**
- Report the cycle
- Suggest: `tk unblock <id>` to break the cycle
- Stop and ask user

**Worker edits same file as another worker (merge conflict risk):**
- This should be prevented by task-level `--blocked-by` dependencies from `/createplan-claude`
- If it happens: the second worker will see the first worker's changes (they work sequentially by wave)
- If within the same wave: both workers see the pre-wave state. The second to write "wins." This is why `/createplan-claude` should serialize tasks that modify the same file.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `tk list --status open --json` | All open tasks |
| `tk show <id> --json` | Full task details |
| `tk list --parent <epic> --json` | Tasks in an epic |
| `tk notes <id>` | Notes for epic/task |
| `tk close <id> --reason "..."` | Complete task/epic |
| `tk note <id> "..."` | Record learnings |
| `tk update <id> --status open` | Reset stale task |
| `tk update <id> --awaiting <type>` | Hand off to human |
| `tk board` | Web board on :3000 |

---

## Fallback

If Claude-native orchestration encounters issues, fall back to standard execution:

```bash
# Standard tk pool runner (per-epic, no cross-epic parallelism)
tk run <epic-id> --pool
```

Or use the standard `/run-all` command which delegates to `tk run --pool` directly.
