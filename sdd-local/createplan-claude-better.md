---
description: Create epics optimized for maximum independence and single-session execution per epic
argument-hint: [spec-file-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Spec file: $ARGUMENTS
- Ticks initialized: !`test -d .tick && echo "yes" || echo "no"`

## Design Philosophy

**The epic is the unit of context.** Each epic runs in one subagent session with a large context window (200k tokens). Tasks within an epic are sequential steps in that session — not independent workers.

**The createplan's primary job is finding epic boundaries that maximize independence.** More independence = more parallelism = faster wall-clock time. Everything downstream (runner simplicity, context coherence, token efficiency) flows from getting the cuts right.

**Workers are smart.** They have CLAUDE.md, the spec, the full codebase, and a project scratchpad. Task descriptions guide — they don't micromanage.

## Your Task

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

Or in `UX Research/` for older specs.

If no spec file path was provided (`$ARGUMENTS` is empty):
1. List available spec directories
2. Look for `*-spec.md` or `*SPEC*.md` files
3. Ask the user which spec to use

### Step 2: Validate Spec Readiness

- Status should be "Ready for Implementation"
- Testing strategy must be defined
- No unresolved critical issues

If not ready:
> This spec has status "[status]". Run `/checkspec` first.

### Step 3: Map the Work

Read the spec thoroughly and explore the codebase. Build a complete picture:

1. **List all deliverables** — every feature, component, function, test the spec requires
2. **Map file footprints** — for each deliverable, which files will be created or modified
3. **Identify shared code** — files or modules that multiple deliverables depend on
4. **Note the test strategy** — test commands, file patterns, how to run targeted tests

**Output a work-to-file matrix** (internal, for your analysis):

```
Deliverable A → creates: file1, file2 | modifies: file3
Deliverable B → creates: file4 | modifies: file3, file5
Deliverable C → creates: file6, file7 | modifies: file5
...
Shared files: file3 (A, B), file5 (B, C)
```

### Step 4: Find the Cuts (THE CRITICAL STEP)

This is where the value is. You're solving a graph partitioning problem:

**Goal:** Group deliverables into epics such that:
1. **Cross-epic file overlap is zero** (or as close to zero as possible)
2. **Intra-epic work is cohesive** (related things stay together)
3. **Each epic fits comfortably in one context session** (~60-70% of 200k tokens)

**Algorithm:**

1. **Cluster by shared files.** Deliverables that modify the same files belong together. Look at your work-to-file matrix — connected components of deliverables (through shared files) are natural epic candidates.

2. **Extract shared foundations.** If multiple clusters all depend on the same base code (schemas, types, utilities, shared components), pull that shared work into a **foundation epic** that runs first. This breaks the dependency and lets downstream epics run independently.

3. **Check independence.** After extraction, ask: can each non-foundation epic run without any other non-foundation epic's output? If not, either:
   - Move more shared work into the foundation epic, OR
   - Add the minimal cross-epic dependency (accept reduced parallelism)

4. **Check sizing.** Is any epic too large for one session? Split it along internal seams. Is any epic trivially small? Merge it into an adjacent one.

5. **Maximize the parallel frontier.** Count how many epics can run simultaneously after the foundation. This number is your payoff metric. Optimize for it.

**Heuristic for shared files:**

| Situation | Action |
|-----------|--------|
| File modified by 2+ epics | Extract to foundation epic |
| File created by one epic, read by others | Fine — creation epic is a dependency, or put in foundation |
| File read by multiple epics | No conflict — ignore |
| Shared types/schemas | Almost always belong in foundation |

### Step 5: Design Epic Structure

Each epic should have:

- **A clear scope** — "the board page and everything it needs" not "misc UI work"
- **Ordered tasks** — sequential steps for one worker session
- **3-6 tasks** — enough structure to track progress, not so many it's micromanagement
- **Self-contained tests** — each task includes tests, run with surgical commands

**Epic sizing guide:**

| Signal | Guidance |
|--------|----------|
| Files touched | 5-12 per epic |
| Spec sections covered | 1-3 related sections |
| Conceptual scope | One feature area or one page with its components |
| Tasks within | 3-6 ordered steps |
| Context estimate | Foundation epic can be smaller; feature epics fill ~60-70% of window |

### Step 6: Design Tasks Within Each Epic

Tasks are **sequential steps for one worker**, not independent work items. This changes how you write them:

- Later tasks CAN reference work from earlier tasks ("extend the component from task 1")
- No need to repeat context — the worker remembers everything from previous tasks
- Keep descriptions focused on what THIS step adds

**Task description format:**

```markdown
## Objective

<1-2 sentences: what this step delivers>

## Spec Reference

**Spec:** `<path>` — Section: "<section name>"

## Scope

**Files to create/modify:**
- `path/to/file` — what changes

## Implementation

1. <High-level step>
2. <High-level step>

## Tests

1. TestName — what it verifies

Run: `<surgical test command>`

Do NOT close until tests pass.
```

**Task ordering within an epic:**
1. Core data structures / types first
2. Business logic / utilities next
3. UI components that use the above
4. Integration / wiring
5. Edge cases and polish

### Step 7: Set Up the Implementation Notes

The inter-epic communication file lives in the project directory alongside the spec:

```
docs/projects/<date>-<project-name>/implementation-notes.md
```

Create it if it doesn't exist:

```markdown
# Implementation Notes — <spec-name>

> Epic workers: read this before starting. Append your section when done.
> Captures patterns established, gotchas discovered, and decisions made across epics.

---
```

Record the full path — you'll reference it in every epic description and the runner needs it too.

### Step 8: Create Epics and Tasks

Create epics first, then tasks under them.

**Epic format:**
```bash
tk create "<spec-name>: <phase>" -t epic -d "## Scope

<What this epic delivers>

## Spec Reference

\`<path-to-spec>\` — Sections: \"<section1>\", \"<section2>\"

## Key Files

- \`path/to/file\` — description

## Worker Instructions

- Complete tasks in order (they build on each other)
- Read \`<path-to-project-dir>/implementation-notes.md\` before starting
- Append your learnings to \`<path-to-project-dir>/implementation-notes.md\` when all tasks are done
- Check epic notes: \`tk notes <this-epic-id>\`"
```

**Task format:**
```bash
tk create "<title>" \
  --parent <epic-id> \
  -d "<task description per Step 6 format>" \
  --acceptance "<surgical test command> passes"
```

**Cross-epic dependencies** (epic level only):
```bash
# If Epic B needs Epic A's code to exist first:
tk block <epic-B-first-task-id> <epic-A-last-task-id>
```

Be conservative with cross-epic deps. The whole point is independence.

### Step 9: E2E Testing (if applicable)

Check for E2E config:
```bash
test -f docs/current/e2e/e2e-config.md && echo "E2E_CONFIG_EXISTS" || echo "NO_E2E_CONFIG"
```

If E2E is needed:
- E2E tasks go in their own epic (they need exclusive emulator access)
- This epic depends on all implementation epics
- Tasks within the E2E epic are sequential (one emulator)
- Include scratchpad/cookbook/log context per E2E conventions

### Step 10: Optional Final Validation Epic

For projects with 3+ implementation epics:

```bash
tk create "<spec-name>: Final validation" -t epic -d "Run full test suite after all implementation. Verify no regressions."

tk create "Full test suite validation" \
  --parent <epic-id> \
  --blocked-by <last-task-ids-from-all-epics> \
  -d "Run complete test suite, type checker, and linter.

Commands:
- npm test (full suite)
- npx tsc --noEmit
- npm run lint

Investigate and fix any failures." \
  --acceptance "npm test && npx tsc --noEmit passes"
```

### Step 11: Present the Plan

```markdown
## Plan Created: <spec-name>

**Spec:** `<path>`
**Execution:** `/run-all-claude-better`

### Epic Independence Map

        [A: Foundation]
        /      |       \
  [B: Feature] [C: Feature] [D: Feature]   ← parallel
        \      |       /
       [E: Validation]

### Epics

| Epic | Tasks | Depends On | Scope |
|------|-------|-----------|-------|
| A | 3 | — | Data layer, schemas, shared components |
| B | 4 | A | Kanban board page |
| C | 3 | A | Vendor detail page |
| D | 4 | A | Tasks page |
| E | 1 | B,C,D | Full suite validation |

### Parallelism

- Max parallel epics: 3 (B, C, D after A completes)
- Estimated total context sessions: 5
- Foundation runs first, then 3 parallel, then validation

### Tasks by Epic

**Epic A: Foundation**
1. [id] <title>
2. [id] <title>
3. [id] <title>

**Epic B: ...**
1. [id] <title>
...
```

### Step 12: Offer Next Steps

> Would you like me to:
> 1. Adjust epic boundaries or task scope?
> 2. Start execution with `/run-all-claude-better`?
> 3. Review the independence map for tighter cuts?

---

## Quality Checklist

Before presenting the plan, verify:

- [ ] No file is modified by two independent epics (zero cross-epic file overlap)
- [ ] Shared code is in the foundation epic
- [ ] Each epic fits in ~60-70% of context window
- [ ] Tasks within epics are ordered and build on each other
- [ ] Every task has surgical test commands in acceptance criteria
- [ ] Cross-epic dependencies are minimal
- [ ] `implementation-notes.md` is created in the project directory
- [ ] The parallel frontier is as wide as possible
