---
description: Create ticks from a specification optimized for Claude-native parallel execution with persistent worker memory
argument-hint: [spec-file-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Spec file: $ARGUMENTS
- Ticks initialized: !`test -d .tick && echo "yes" || echo "no"`

## What's Different (Cloud vs Standard)

This command creates a plan optimized for `/run-all-claude`, which uses Claude-native orchestration with custom `tk-worker` subagents instead of `tk run --pool`.

**Key differences from `/createplan`:**

| Aspect | Standard (`/createplan`) | Claude (`/createplan-claude`) |
|--------|--------------------------|-------------------------------|
| Task size | Small, atomic (one change) | Broader (one feature area) |
| Tasks per epic | 3-5 | 2-4 |
| Task descriptions | Full context injected | Reference spec + key files |
| Epic context | Generated at runtime for workers | Not needed (workers have CLAUDE.md + memory) |
| E2E serialization | Chained via `--blocked-by` | Chained + tagged `[E2E]` in title |
| Worker model | Cold start, no memory | Persistent memory across runs |
| Execution | `tk run --pool` (Go binary) | Claude-native via `/run-all-claude` |

**Why broader tasks work:** Claude workers have access to CLAUDE.md (full project patterns), the spec file, and persistent memory from previous runs. They don't need everything spelled out - they can explore the codebase themselves.

**Why we still use tk:** Persistent tracking, dependency management, audit trail, web board, resume/retry. tk is the plan backbone; Claude is the execution engine.

## Your Task

You are transforming a specification into ticks (tasks) using the `tk` CLI, structured for execution by `tk-worker` subagents via `/run-all-claude`.

### Step 0: Verify Ticks is Initialized

```bash
tk list 2>/dev/null || echo "NOT_INITIALIZED"
```

If not initialized:
```bash
tk init
```

### Step 1: Locate the Spec File

Specs live in subdirectories of `/docs/projects/` following the pattern:
`/docs/projects/<date>-<project-name>/<date>-<project-name>-spec.md`

If no spec file path was provided (`$ARGUMENTS` is empty):
1. List available spec directories in `/docs/projects/`
2. Look for `*-spec.md` files
3. Ask the user which spec to use

### Step 2: Validate Spec Readiness

- Status should be "Ready for Implementation"
- Testing strategy must be defined
- No unresolved critical issues

If not ready:
> This spec has status "[status]". Run `/checkspec` first.

### Step 3: Analyze Implementation Scope

Read the spec thoroughly and explore the codebase to understand:

1. **Change footprint**: Which files need modification/creation?
2. **Feature areas**: What are the 3-6 logical groupings of work?
3. **Dependencies**: What order must changes happen in?
4. **Risk areas**: Which changes are most likely to cause issues?
5. **Shared resources**: What can only be used by one worker at a time? (emulator, specific ports, etc.)
6. **Test infrastructure**: Test command, file patterns, how to run specific tests
7. **Human tasks**: What truly requires human intervention?

### Step 4: Design Epic Structure

Group work into **epics**. Each epic should:
- Represent a coherent feature area or phase
- Contain **2-4 tasks** (broader than standard plan)
- Be independently valuable when complete

**Naming convention:**
```
<spec-name>: <phase-description>
```

**Sizing guidance (claude variant):**
- Each task should represent a **feature area**, not a single file change
- A good task might be "Implement the notification scheduling system with tests" rather than "Add scheduleNotification function"
- Workers have full project context, so tasks like "implement + test + integrate feature X" are appropriate
- If a task would take a competent developer 1-3 hours of focused work, it's the right size

### Step 5: Design Individual Ticks

Each tick must be:

1. **Feature-scoped**: One coherent feature area, completable in a focused session
2. **Testable**: Clear acceptance criteria with executable commands
3. **Spec-referenced**: Points to the spec rather than duplicating context
4. **Resource-tagged**: Marks exclusive resources needed (E2E, ports, etc.)

#### Task Description Format (Claude-Optimized)

```markdown
## Objective

<1-2 sentences: what this task delivers>

## Spec Reference

**Spec:** `<path-to-spec-file>` — Section: "<relevant section name>"

## Scope

**Files to create/modify:**
- `path/to/file1` — what changes
- `path/to/file2` — what changes

**Key existing code to understand:**
- `path/to/existing` — why it's relevant

## Implementation

1. <High-level step - worker figures out details>
2. <High-level step>
3. <High-level step>

## Tests

Write these tests alongside implementation:
1. TestName1 — what it verifies
2. TestName2 — what it verifies

Run: `<surgical test command>`

Do NOT close until acceptance criteria pass. Fix and re-run if tests fail.
```

**Notice what's NOT here:** No architecture overview, no "how the store pattern works", no copy of CLAUDE.md conventions. Workers already know all that.

#### Resource Tags

For tasks that need exclusive access to a shared resource, prefix the title:

| Tag | Meaning | Orchestrator Behavior |
|-----|---------|----------------------|
| `[E2E]` | Needs Android emulator/iOS simulator | Serialize: only one at a time |
| `[EXCLUSIVE:<name>]` | Needs named exclusive resource | Serialize by resource name |
| (no tag) | No shared resources | Run in parallel freely |

**Example:**
```bash
tk create "[E2E] Verify feed navigation flow" --parent <epic-id> ...
tk create "[EXCLUSIVE:port-3000] Integration test with local API" --parent <epic-id> ...
tk create "Implement notification service with tests" --parent <epic-id> ...  # no tag = parallel
```

### Step 5a: Testing Requirements (CRITICAL)

**Every implementation tick MUST include tests as part of the deliverable.** This is non-negotiable.

The execution loop is:
```
1. Write/modify code + write/modify tests
2. Run TARGETED tests (not full suite)
3. If tests fail → fix and go to step 2
4. Only when tests pass → close the tick
```

**Acceptance criteria must be:**
- Executable commands (copy-paste to terminal)
- Surgical test targeting (not full suite)
- Specific about expected output when possible

**Examples:**
```
GOOD: npm test -- --grep "NotificationScheduler" passes with all 3 test names visible
GOOD: npx jest NotificationScheduler.test.ts passes
AVOID: npm test passes (full suite - reserve for final validation only)
BAD: Tests pass (not executable)
```

### Step 5b: E2E Testing Integration (For UI Features)

Check for E2E config:
```bash
test -f docs/current/e2e/e2e-config.md && echo "E2E_CONFIG_EXISTS" || echo "NO_E2E_CONFIG"
```

**If config exists:** Read it and extract `framework`, `serialization_required`, `shared_resource`, `e2e_docs_path`.

**If config does NOT exist:** Skip E2E integration. Warn the user.

**When E2E is needed:**

1. **Auto-create project e2e/ directory** using templates from `docs/current/e2e/project-e2e-directory.md`:
   ```
   docs/projects/<date>-<feature>/e2e/
   ├── README.md
   ├── SCRATCHPAD.md
   ├── COOKBOOK.md
   ├── LOG.md
   └── flows/
   ```

2. **Tag E2E ticks with `[E2E]`** in the title. This is how `/run-all-claude` detects serialization requirements.

3. **Chain E2E ticks** with `--blocked-by` when `serialization_required` is true (belt AND suspenders with the tag).

4. **Include e2e/ context in E2E tick descriptions:**
   ```markdown
   ## E2E Context

   **Scratchpad:** docs/projects/<date>-<feature>/e2e/SCRATCHPAD.md (READ FIRST)
   **Cookbook:** docs/projects/<date>-<feature>/e2e/COOKBOOK.md
   **Log:** docs/projects/<date>-<feature>/e2e/LOG.md
   **Quick reference:** docs/current/e2e/tick-quick-reference.md

   **BEFORE writing YAML:** Grep source code for every testID you plan to use.
   Do NOT guess testIDs from naming patterns — verify they exist.
   Agent onboarding uses `agent-onboarding-*` prefix, NOT `fo09-*`.
   ```

5. **Add standing rule to E2E epics:**
   ```bash
   tk note <epic-id> "STANDING RULE: Every E2E tick MUST read e2e/SCRATCHPAD.md before starting and update it before closing. Log all test runs in e2e/LOG.md."
   ```

### Step 6: Identify Human Tasks

Mark with `--awaiting work`. **Minimize aggressively** - exhaust all options first:

- Can I install this with a package manager?
- Can I mock/stub instead?
- Can I use Docker?
- Can I configure programmatically?

**Only human tasks when truly unavoidable:** credentials, physical devices, external service config, app store submissions.

### Step 7: Create the Epics and Ticks

Create epics first, then tasks under them.

**Epic format (cloud-optimized):**
```bash
tk create "<spec-name>: <phase>" -t epic -d "Description of this phase.

## Spec
\`<path-to-spec-file>\`

## Key Files
- \`path/to/file1\` — description
- \`path/to/file2\` — description

## Worker Notes
- Workers have CLAUDE.md context and persistent memory
- Check epic notes before starting (tk notes <epic-id>)
- Leave notes for the next worker after completing your task"
```

**Note:** No lengthy "epic context" section needed. Workers read the spec and CLAUDE.md directly.

**Task format (cloud-optimized):**
```bash
tk create "<title>" \
  --parent <epic-id> \
  -d "## Objective

<what this task delivers>

## Spec Reference

**Spec:** \`<path>\` — Section: \"<section>\"

## Scope

**Files to modify:**
- \`path/to/file\` — what changes

## Implementation

1. <step>
2. <step>

## Tests

1. TestName — what it verifies
2. TestName — what it verifies

Do NOT close until acceptance criteria pass." \
  --acceptance "<surgical test command> passes"
```

### Step 7a: Cross-Epic Dependencies

Register dependencies at the TASK level for cross-epic parallelization:

| Pattern | Action |
|---------|--------|
| Task B uses code from Task A | `tk block <B> <A>` |
| Tasks modify unrelated files | No dependency (parallel!) |
| Both read same file | No dependency (reads don't conflict) |
| Both modify same file | `tk block <B> <A>` (serialize) |
| Both are `[E2E]` | Chain with `--blocked-by` |

**Be conservative with dependencies.** Claude workers handle broader tasks, so there are fewer edge-to-edge dependencies. Over-blocking kills parallelism.

### Step 8: Generate Dependency Summary

After creating all tasks:

```bash
tk list --status open --json
```

Present a visual dependency map showing:
- Global wave structure (which tasks run in parallel)
- Cross-epic dependencies
- Resource-tagged tasks and their serialization chain
- Maximum parallelism per wave

### Step 9: Optional Final Validation Epic

For projects with 3+ implementation epics, add a final validation epic:

```bash
tk create "<spec-name>: Final validation" -t epic -d "Run full test suite and verify no regressions after all implementation."

tk create "Full test suite validation" \
  --parent <epic-id> \
  --blocked-by <last-task-ids> \
  -d "Run the complete test suite, type checker, and linter.

Commands:
- npm test (full suite)
- npx tsc --noEmit
- npm run lint

Investigate and fix any new failures." \
  --acceptance "npm test && npx tsc --noEmit passes"
```

### Step 10: Present Summary

```markdown
## Plan Created for: <spec-name>

**Spec:** `<path>`
**Execution:** `/run-all-claude` (Claude-native with tk-worker agents)

### Epics Overview

| Epic | Tasks | E2E? | Human? | Description |
|------|-------|------|--------|-------------|
| <id> | X | Y/N | Z | Phase: ... |

### Global Wave Structure

| Wave | Tasks | Epics | Max Parallel |
|------|-------|-------|--------------|
| 1 | <ids> | ... | N |
| 2 | <ids> | ... | N |

### Resource-Tagged Tasks

| Task | Tag | Serialized With |
|------|-----|-----------------|
| <id> | [E2E] | <other-e2e-ids> |

### Human Tasks

| ID | Title | Blocks |
|----|-------|--------|
| <id> | ... | <ids> |
```

### Step 11: Execution Instructions

```markdown
## Running Your Cloud Plan

### Execute with Claude-native orchestration:
/run-all-claude <epic-id>        # Single epic
/run-all-claude --all            # All epics

### Monitor progress:
tk list                          # All tasks
tk board                         # Web board on :3000
tk ready                         # What's unblocked

### Manual fallback (if needed):
tk run <epic-id> --pool          # Falls back to standard tk pool runner
```

### Step 12: Offer Next Steps

Ask:
> Would you like me to:
> 1. Adjust the plan (task scope, dependencies, resource tags)?
> 2. Add more detail to specific tasks?
> 3. Switch to standard `/createplan` for finer-grained tasks?
> 4. Start execution with `/run-all-claude`?

---

## Tick Quality Guidelines (Claude Variant)

### Good Task Design

**DO:**
- Scope tasks as feature areas (broader than standard)
- Reference the spec by path and section name
- List files to modify (but don't over-prescribe)
- Bundle tests with implementation always
- Use surgical test commands in acceptance criteria
- Tag exclusive resources in the title (`[E2E]`, `[EXCLUSIVE:x]`)
- Trust that workers have CLAUDE.md, persistent memory, and codebase access

**DON'T:**
- Duplicate CLAUDE.md content in descriptions
- Over-specify implementation steps (workers are capable)
- Create separate test-only tasks
- Use full test suite in regular acceptance criteria
- Over-block dependencies (kills parallelism)
- Create tasks so broad they're ambiguous (2-3 hours of work max)
- Forget resource tags on E2E tasks

### Task Sizing Guide

| Too Small | Just Right | Too Large |
|-----------|-----------|-----------|
| "Add field X to schema" | "Implement notification scheduling with tests" | "Build entire notification system" |
| "Write test for function Y" | "Add user preference store with persistence and tests" | "Implement all stores" |
| "Fix import in file Z" | "[E2E] Verify feed navigation and swipe interactions" | "E2E test entire app" |
