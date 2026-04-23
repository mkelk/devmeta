---
description: "[ARCHIVED] Old orchestrator - replaced by tk run delegation. Run all epics and ticks to completion using parallel subagents"
argument-hint: [epic-id or --all]
---

## Execution Model

**⚠️ CROSS-EPIC PARALLELIZATION: Global waves across ALL epics**

This command computes a **global dependency graph** across all epics and identifies waves of tasks that can run in parallel, regardless of which epic they belong to.

**Key principle:** Tasks are executed based on their dependencies, NOT their epic membership. Two tasks from different epics can run in parallel if neither depends on the other.

### ⚠️ E2E SERIALIZATION CONSTRAINT

**E2E tests CANNOT run in parallel.** They use the Android emulator/iOS simulator, which is a shared resource. Only ONE E2E test can run at a time.

**Detection:** A task is an E2E task if:
- It mentions Maestro, E2E, emulator, or simulator
- Its epic or description references `e2e/` directory
- It runs PowerShell scripts from `e2e/scripts/`

**Handling:** When computing waves:
1. Identify all E2E tasks in the current wave
2. If multiple E2E tasks are ready, run them SEQUENTIALLY (one at a time)
3. Non-E2E tasks in the same wave can still run in parallel with each other
4. Non-E2E tasks can run in parallel with the CURRENT E2E task

**Example:**
```
Wave 2 ready tasks:
- task-a (E2E): Verify feed selector icon
- task-b (E2E): Verify categories screen
- task-c (unit test): Run iconService tests

Execution:
- Launch task-a (E2E) and task-c (unit test) in parallel
- Wait for task-a to complete
- Then launch task-b (E2E) - must wait because it's E2E
```

**Example:**
```
Epic 1: Backend     Epic 2: Frontend     Epic 3: Docs
  api-schema          ui-components        readme
       ↓                   ↓                  ↓
  api-handlers        ui-integration      api-docs
       ↓                   ↓
  api-tests           ui-tests
                           ↓
                      final-review (depends on api-tests, ui-tests)

Global Wave Analysis:
  Wave 1: [api-schema, ui-components, readme] ← 3 epics in parallel!
  Wave 2: [api-handlers, api-docs]
  Wave 3: [api-tests, ui-integration]
  Wave 4: [ui-tests]
  Wave 5: [final-review]
```

## Context

- Today's date: !`date +%Y-%m-%d`
- Target: $ARGUMENTS
- Open epics: !`tk list --type epic --status open 2>/dev/null | head -20 || echo "No open epics"`

## Your Task

You are an orchestrator that runs ticks (tasks) to completion using parallel subagents. You compute global waves across all epics and maximize parallelization.

### Phase 1: Identify Target Scope

**If `$ARGUMENTS` specifies an epic ID:**
- Work on that specific epic only
- Run: `tk show <epic-id>` to verify it exists and is open
- Compute waves within that epic only

**If `$ARGUMENTS` is `--all` or empty:**
- Get all open epics: `tk list --type epic --status open --json`
- **Compute GLOBAL waves across ALL epics**
- Tasks from different epics can run in parallel if they don't depend on each other
- Epics are closed individually as their tasks complete

### Phase 2: Compute Global Dependency Graph

**⚠️ CRITICAL: This phase computes waves ACROSS ALL epics, not within each epic.**

**Step 1: Gather all open tasks across all epics:**
```bash
# Get all open tasks (not just from one epic)
tk list --status open --json
```

**Step 2: Build the dependency graph:**

For each task, identify:
- What it's blocked by (direct dependencies)
- What it blocks (tasks waiting on it)

**Step 3: Compute global waves:**

A task is in Wave N if:
- All its blockers are in Wave N-1 or earlier
- Wave 1 contains all tasks with NO blockers

```
Wave 1 = tasks where blocked_by is empty
Wave 2 = tasks where all blockers are in Wave 1
Wave 3 = tasks where all blockers are in Wave 1 or Wave 2
...and so on
```

**Step 4: Present the global wave structure:**

```markdown
## Global Wave Structure

| Wave | Tasks | Epics Represented | Max Parallel |
|------|-------|-------------------|--------------|
| 1 | api-schema, ui-components, readme | Epic1, Epic2, Epic3 | 3 |
| 2 | api-handlers, api-docs | Epic1, Epic3 | 2 |
| 3 | api-tests, ui-integration | Epic1, Epic2 | 2 |
| ... | ... | ... | ... |

**Cross-Epic Parallelization:** Wave 1 runs tasks from 3 different epics simultaneously!
```

### Phase 3: Generate Epic Context (Once Per Epic)

Before starting tasks from an epic, check for existing context or generate new context. This is done ONCE per epic and stored in `.tick/logs/context/<epic-id>.md`.

**⚠️ For UI epics with E2E testing:** Also check for a project e2e/ directory at `docs/projects/<date>-<feature>/e2e/`. If it exists, include its location in the context.

**Context file location:** `.tick/logs/context/<epic-id>.md`

**Step 1: Check for existing context:**
```bash
cat .tick/logs/context/<epic-id>.md 2>/dev/null || echo "No context exists"
```

**Step 2: Validate context freshness (if context exists):**

Before using existing context, check if it's stale:
- Look for "BLOCKING", "Known Issues", or "BUG" sections
- Cross-reference with recent epic notes: `tk notes <epic-id>`
- If context mentions issues that have been **resolved** (per epic notes), UPDATE the context file

**Why this matters:** Stale context can mislead subagents about the current state. For example, a context file might say "BLOCKING BUG: icon generation doesn't work" when that bug was fixed in a previous wave.

**Step 3: If no context exists (or context is stale), generate/update it:**

1. Get epic and task details:
   ```bash
   tk show <epic-id> --json
   tk list --parent <epic-id> --json
   ```

2. Analyze the codebase for the epic's tasks and create a context document covering:
   - **Relevant Code** - Files and functions tasks will need to read/modify (with file paths)
   - **Architecture Notes** - How relevant parts work together, data flow
   - **Testing Patterns** - Test file locations, mocking patterns, how to run tests
   - **Conventions** - Error handling, logging, naming patterns

**Step 4: Save the context to the epic:**
```bash
mkdir -p .tick/logs/context
# Write context document to .tick/logs/context/<epic-id>.md
```
Use the Write tool to create/update the context file.

**Context document format:**
```markdown
# Epic Context: <epic-id> - <epic-title>

## Relevant Code
- `path/to/file.go` - Description of what's relevant
- `path/to/other.go:123` - Specific function/line

## Architecture
- How components interact
- Data flow description

## Testing
- Test command: `go test ./...` or `npm test`
- Test file patterns: `*_test.go` or `*.test.ts`
- Mocking approach used

## Conventions
- Error handling patterns
- Naming conventions
- Logging approach
```

### Phase 4: Global Wave-Based Execution Loop

**⚠️ Process tasks in GLOBAL waves (across all epics):**

```
REPEAT until all tasks complete:
  1. Get all open tasks: tk list --status open --json
  2. For each task, check if ALL blockers are closed
  3. Identify current wave = all tasks with no open blockers
  4. Check stats:
     - If no ready tasks and all tasks closed → ALL DONE!
     - If no ready tasks but awaiting_human > 0 → Report blocked tasks
  5. Ensure context exists for each epic represented in the wave
  6. Launch parallel subagents for ALL ready tasks (across ALL epics)
  7. Wait for all subagents to complete
  8. Check if any epics are now fully complete → close them
  9. Loop back to step 1 (re-compute ready tasks)
```

**Key difference from single-epic execution:**
- Wave tasks may come from DIFFERENT epics
- Generate context for each epic before its first task runs
- Close epics as they complete (don't wait for all epics)

### Phase 5: Subagent Execution

For each task in a wave, spawn a subagent using the Task tool with this prompt:

---

**SUBAGENT PROMPT TEMPLATE:**

```
## Epic Context

<READ FROM .tick/logs/context/<epic-id>.md AND INSERT HERE>

## Epic Notes

<RUN `tk notes <epic-id>` AND INSERT OUTPUT>

## Current Task

**[<task-id>] <task-title>**

<task-description>

### Acceptance Criteria

<acceptance-criteria from tk show>

## Instructions

1. **Mark task as in progress:**
   ```bash
   tk update <task-id> --status in_progress
   ```
   This enables crash recovery and provides accurate status visibility.

2. **Review epic notes first** - Check for learnings from previous tasks that might help you.

3. **Implement the task** - Make the required code changes to satisfy the acceptance criteria.

4. **Run tests** - Ensure your changes don't break existing functionality:
   ```bash
   # Adjust based on project type
   go test ./...
   # or: npm test
   # or: pytest
   ```

5. **Close the task when complete:**
   ```bash
   tk close <task-id> --reason "Brief summary of HOW you solved it"
   ```
   The reason should explain your approach, key changes made, files modified.

6. **Add epic note with learnings:**
   ```bash
   tk note <epic-id> "Key insight: <what future tasks should know>"
   ```
   Include gotchas, architectural decisions, or anything useful for the next task.

## Handoff Signals (If You Cannot Complete)

If you encounter a blocker requiring human intervention, DON'T close the task. Instead:

**For approval needed:**
```bash
tk update <task-id> --awaiting approval
tk note <task-id> "Needs approval: <full context for human to decide>"
```

**For input/clarification needed:**
```bash
tk update <task-id> --awaiting input
tk note <task-id> "Question: <specific question with options if possible>"
```

**For code review needed:**
```bash
tk update <task-id> --awaiting review
tk note <task-id> "PR: <url> - Key changes: <what to focus on>"
```

**For escalation (complex issue):**
```bash
tk update <task-id> --awaiting escalation
tk note <task-id> "Issue: <detailed description of the problem>"
```

## Rules

1. **One task only** - Complete only YOUR assigned task, nothing else
2. **Be autonomous** - Don't ask questions; make reasonable decisions
3. **Always leave notes** - Future iterations depend on your learnings
4. **Don't modify .tick/issues/** - Never edit tick JSON files directly; use `tk` commands
5. **Test your changes** - Run relevant tests before closing
6. **Commit if appropriate** - Small atomic commits are good

## E2E Testing Rules (For UI Tasks)

If the task involves E2E testing, follow these additional rules:

1. **Read the project scratchpad FIRST:**
   Check `docs/projects/<date>-<feature>/e2e/SCRATCHPAD.md` for what previous ticks learned.

2. **Update the scratchpad with your findings:**
   Before closing, add your discoveries to SCRATCHPAD.md:
   - What worked / didn't work
   - Timing issues discovered
   - testID accessibility findings
   - Any Maestro quirks specific to this project

3. **Log every test run:**
   Append to `docs/projects/<date>-<feature>/e2e/LOG.md` with date, command, result.

4. **Add reusable patterns to cookbook:**
   If you discover a pattern that works, add it to `e2e/COOKBOOK.md`.

5. **Reference the knowledge base:**
   - Quick reference: `docs/current/e2e/tick-quick-reference.md`
   - Maestro patterns: `docs/current/e2e/maestro-patterns.md`
   - Troubleshooting: `docs/current/e2e/troubleshooting.md`

**Why:** E2E testing has many pitfalls. By sharing knowledge via the scratchpad, subsequent ticks avoid repeating failures. The project e2e/ directory is the shared memory for all E2E work in this project.
```

---

### Phase 6: Global Parallel Execution Rules

**⚠️ MAXIMIZE PARALLELISM ACROSS ALL EPICS (with E2E constraint):**

- **Same wave = parallel** - Tasks in the same wave have no dependencies on each other, even if from different epics; launch ALL of them simultaneously
- **Different waves = sequential** - Wait for wave N to complete before starting wave N+1
- **Cross-epic parallelism** - A task from Epic 1 and a task from Epic 2 can run at the same time if neither depends on the other
- **Re-fetch after each wave** - Task readiness changes as blockers complete
- **⚠️ E2E SERIALIZATION** - E2E tasks must run ONE AT A TIME (see below)

**Launching parallel subagents (CRITICAL):**
```
Use the Task tool multiple times in a SINGLE message to launch parallel subagents.
Each subagent gets one task from the current wave.
Tasks may come from DIFFERENT EPICS - that's the point of global waves!
Launch ALL ready tasks at once - don't process them one at a time!

EXCEPTION: E2E tasks (using emulator/simulator) must run serially.
```

**E2E Task Serialization:**
```
E2E tests use the Android emulator or iOS simulator - a SHARED RESOURCE.
Only ONE E2E test can run at a time. Multiple E2E tests in parallel will fail.

Algorithm for waves with E2E tasks:
1. Separate ready tasks into: E2E tasks and non-E2E tasks
2. Launch ALL non-E2E tasks in parallel (as usual)
3. Launch only ONE E2E task at a time
4. When E2E task completes, launch the next E2E task
5. Repeat until all E2E tasks in wave are complete
```

**Example: Wave with mixed task types:**
```
Current Wave Ready Tasks:
- task-a from Epic 1 (E2E - feed selector verification)
- task-b from Epic 2 (E2E - categories screen verification)
- task-c from Epic 3 (unit test - iconService)

Execution order:
1. Launch task-a (E2E) + task-c (unit test) in parallel
2. Wait for task-a to complete
3. Launch task-b (E2E) - SERIAL because it's E2E
4. Wait for task-b to complete
5. Wave complete (task-c may finish before, during, or after)
```

**Remember: The goal is maximum parallelization ACROSS epics, but E2E tests are the exception - they MUST run serially.**

### Phase 7: Progress Reporting & Wave Notes

After each wave completes:

**1. Add notes to each epic that had tasks in this wave:**
```bash
# For each epic with completed tasks in this wave:
tk note <epic-id> "Wave <N> complete: <task> did X. Key findings: <insights>"
```

This creates a running log of progress that helps:
- Future waves understand what was accomplished
- Debugging if something goes wrong
- Human reviewers see the progression

**2. Report progress to the user:**

```markdown
## Global Wave <N> Complete

### Completed This Wave (Cross-Epic)
| Task | Epic | Title | Result |
|------|------|-------|--------|
| <id> | Epic 1 | <title> | Closed |
| <id> | Epic 2 | <title> | Closed |
| <id> | Epic 3 | <title> | Handed off |

### Overall Progress
- Total open tasks: X
- Completed this run: Y
- Remaining: Z
- Awaiting human: W

### Epics Status
| Epic | Progress | Status |
|------|----------|--------|
| Epic 1 | 3/5 tasks | In progress |
| Epic 2 | 2/2 tasks | ✅ COMPLETE |
| Epic 3 | 1/4 tasks | In progress |

### Next Wave
| Task | Epic | Title |
|------|------|-------|
| <id> | Epic 1 | <title> |
| <id> | Epic 3 | <title> |
```

### Phase 8: Epic Completion (During Global Execution)

**⚠️ Epics complete asynchronously during global wave execution.**

After each wave, check if any epics are now fully complete (all their tasks closed). If so, close them immediately:

1. **Check each epic's status:**
   ```bash
   # For each epic that had tasks in this wave:
   tk list --parent <epic-id> --status open --json
   # If empty → epic is complete!
   ```

2. **For each completed epic:**

   a. **Add completion summary note:**
   ```bash
   tk note <epic-id> "EPIC COMPLETE: <summary of what was built/changed>. Key files: <main files modified>."
   ```

   b. **Close the epic:**
   ```bash
   tk close <epic-id> --reason "All tasks completed: <brief summary of accomplishments>"
   ```

   c. **Report epic completion:**
   ```markdown
   ## Epic Complete: <epic-id>

   **Title:** <epic-title>
   **Tasks completed:** X
   **Completed in global waves:** Y-Z

   ### Summary of Work
   - <bullet points of major accomplishments>

   ### Key Learnings
   - <insights from epic notes>
   ```

3. **Continue with remaining epics** - other epics may still have open tasks

**Note:** Unlike serial execution, epics may complete out of order. Epic 3 might complete before Epic 2 if Epic 3's tasks had fewer dependencies.

---

## Command Reference

| Command | Purpose |
|---------|---------|
| `tk list --type epic --status open` | Find open epics |
| `tk graph <epic> --json` | Get waves & parallelism info |
| `tk show <id> --json` | Get full task details |
| `tk list --parent <epic> --json` | List tasks in epic |
| `tk notes <id>` | Get notes for epic/task |
| `tk close <id> --reason "..."` | Complete a task or epic |
| `tk note <id> "..."` | Record learnings |
| `tk update <id> --awaiting <type>` | Hand off to human |

### Epic Context Files

| Path | Purpose |
|------|---------|
| `.tick/logs/context/<epic-id>.md` | Read/write epic context document |

**Read context:** `cat .tick/logs/context/<epic-id>.md`
**Write context:** Use Write tool to create/update the file

## Error Handling

**If a subagent fails:**
1. Check the task status: `tk show <task-id>`
2. Review any notes left: `tk notes <task-id>`
3. Decide: retry, skip, or hand off to human

**If circular dependencies detected:**
- Graph will report them
- Cannot proceed until manually resolved
- Report to user and stop

**If all tasks blocked on human:**
- Report status and which tasks need attention
- Stop processing that epic
- Move to next epic if running --all

---

## Example Execution Flow (Cross-Epic Parallelization)

```
1. tk list --type epic --status open
   → Found: epic-abc "Backend API", epic-def "Frontend UI", epic-ghi "Documentation"

2. Get all open tasks and compute global dependency graph:
   tk list --status open --json
   → Tasks: api-schema, api-handlers, api-tests (from epic-abc)
            ui-components, ui-integration, ui-tests (from epic-def)
            readme, api-docs (from epic-ghi)

3. Compute Global Waves:
   → Wave 1: [api-schema, ui-components, readme] ← 3 EPICS IN PARALLEL!
   → Wave 2: [api-handlers, api-docs]
   → Wave 3: [api-tests, ui-integration]
   → Wave 4: [ui-tests]

4. Generate context for all epics in Wave 1:
   → .tick/logs/context/epic-abc.md (Backend API context)
   → .tick/logs/context/epic-def.md (Frontend UI context)
   → .tick/logs/context/epic-ghi.md (Documentation context)

5. Launch 3 parallel subagents for Wave 1 (CROSS-EPIC!):
   → api-schema (epic-abc): Closed ✓
   → ui-components (epic-def): Closed ✓
   → readme (epic-ghi): Closed ✓

6. Re-compute ready tasks:
   → Wave 2: [api-handlers, api-docs] now ready!

7. Launch 2 parallel subagents for Wave 2:
   → api-handlers (epic-abc): Closed ✓
   → api-docs (epic-ghi): Closed ✓

8. Check epic completion - epic-ghi is done!
   tk close epic-ghi --reason "All docs complete"
   → epic-ghi: Closed ✓

9. Continue with Wave 3:
   → api-tests (epic-abc): Closed ✓
   → ui-integration (epic-def): Closed ✓

10. Check epic completion - epic-abc is done!
    tk close epic-abc --reason "Backend API complete"
    → epic-abc: Closed ✓

11. Continue with Wave 4:
    → ui-tests (epic-def): Closed ✓

12. Check epic completion - epic-def is done!
    tk close epic-def --reason "Frontend UI complete"
    → epic-def: Closed ✓

13. ALL EPICS COMPLETE!

Summary:
- 3 epics completed
- 8 tasks completed
- Max parallelism achieved: 3 (Wave 1)
- Total waves: 4 (vs 12 if run serially!)
```

---

## Begin Execution

Start by:
1. Identifying your target scope based on `$ARGUMENTS`
2. **Computing the GLOBAL dependency graph across all epics**
3. Identifying which tasks can run in parallel (regardless of epic)
4. Launching subagents for ALL ready tasks in each wave

**Remember:** The key to maximizing parallelization is computing waves GLOBALLY, not per-epic. Tasks from different epics that don't depend on each other should run simultaneously.
