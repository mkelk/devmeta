---
description: Run all epics and ticks to completion using parallel subagents
argument-hint: [epic-id(s) or --all]
---

## Run Epics Serially, Tasks in Parallel

Executes epics one at a time. Within each epic, `tk run --pool` handles parallel task execution with atomic claiming, dependency awareness, epic context generation, and stale recovery.

## Context

- Today's date: !`date +%Y-%m-%d`
- Target: $ARGUMENTS
- Open epics: !`tk list --type epic --status open 2>/dev/null | head -20 || echo "No open epics"`

## Your Task

### Step 1: Determine Scope

**If `$ARGUMENTS` contains epic ID(s):**
- Verify they exist: `tk show <epic-id>` for each
- Run those epics in the order given

**If `$ARGUMENTS` is `--all` or empty:**
- Get all open epics: `tk list --type epic --status open --json`
- Run them in priority/creation order

### Step 2: Execute Epics Serially

For each epic, run:

```bash
tk run <epic-id> --pool
```

This gives `tk run` full control over:
- **Task claiming**: Atomic, dependency-aware via `query.Ready()`
- **Pool sizing**: Auto-determined from wave analysis (capped at 10)
- **Epic context**: Generated once, injected into all worker prompts
- **File conflicts**: Predicted and serialized via auto `blocked_by`
- **Failures**: Released back to `open` for retry (up to 3 retries)
- **Stale recovery**: Abandoned `in_progress` tasks reset on startup

**Optional flags** — append based on user request:

| Flag | Default | Purpose |
|------|---------|---------|
| `--pool N` | auto | Explicit worker count instead of auto |
| `--max-cost N` | unlimited | Budget cap in USD |
| `--max-iterations N` | 50 | Max iterations per task |
| `--max-task-retries N` | 3 | Retry limit for failed tasks |
| `--stale-timeout 1h` | 1h | Threshold for resetting abandoned tasks |
| `--skip-dep-analysis` | false | Skip file conflict prediction |
| `--board` | false | Start board UI on :3000 |
| `--cloud` | false | Real-time cloud sync (implies --board) |
| `--watch` | false | Restart when new tasks become ready |

### Step 3: Report After Each Epic

When `tk run` finishes an epic, report:

```markdown
## Epic Complete: <epic-id> — <title>

- Tasks completed: X
- Tasks failed: Y
- Tasks awaiting human: Z
- Cost: $N.NN

### Issues (if any)
- <task-id>: awaiting <type> — <note summary>
```

Then proceed to the next epic.

### Step 4: Final Summary

After all epics:

```markdown
## All Epics Complete

| Epic | Title | Status | Tasks | Cost |
|------|-------|--------|-------|------|
| <id> | <title> | Complete / Partial | X/Y | $N.NN |

### Total
- Epics: X complete, Y partial
- Tasks: X complete, Y failed, Z awaiting human
- Total cost: $N.NN

### Needs Attention (if any)
- <epic-id>/<task-id>: <what's needed>
```

### Step 5: Handle Blocked Epics

If `tk run` exits with tasks still open:
- Check what's blocked: `tk list --parent <epic-id> --status open --json`
- Report awaiting tasks and their notes
- Ask user whether to skip this epic and continue to the next, or stop

---

## Error Handling

**If `tk run` is not found:**
- Report: `tk is not installed. Ensure it's on PATH.`

**If `tk run` exits with errors:**
- Check remaining tasks: `tk list --parent <epic-id> --status open`
- Check notes: `tk notes <task-id>` for failed tasks
- Report what completed and what remains
- Ask whether to continue with next epic

**If budget exceeded (`--max-cost`):**
- `tk run` stops automatically
- Report progress and remaining work across all epics
