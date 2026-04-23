---
description: Create ticks from a specification for trackable, test-driven implementation
argument-hint: [spec-file-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Spec file: $ARGUMENTS
- Ticks initialized: !`test -d .tick && echo "yes" || echo "no"`

## Your Task

You are transforming a specification into ticks (tasks) using the `tk` CLI. Ticks are designed for AI agent execution - each tick should be atomic, testable, and independently completable.

**Key principle: Task-level dependencies enable cross-epic parallelization.** When you register dependencies at the task level (not just epic level), the run-all command can compute global waves across all epics, maximizing parallel execution.

### Step 0: Verify Ticks is Initialized

Check if ticks is set up in this repository:

```bash
tk list 2>/dev/null || echo "NOT_INITIALIZED"
```

If not initialized, run:
```bash
tk init
```

### Step 1: Locate the Spec File

Specs live in subdirectories of `/docs/projects/` following the pattern:
`/docs/projects/<date>-<project-name>/<date>-<project-name>-spec.md`

If no spec file path was provided (`$ARGUMENTS` is empty):

1. List available spec directories in `/docs/projects/` (folders matching `YYYY-MM-DD-*/`)
2. Look for `*-spec.md` files within those directories
3. Ask the user which spec to use:
   > Which specification would you like me to create ticks for? [list the available specs]

### Step 2: Validate Spec Readiness

Before creating ticks, verify the spec is ready:
- Status should be "Ready for Implementation" (not "Draft" or "Needs Revision")
- Testing strategy must be defined (see `/checkspec`)
- No unresolved critical issues or blocking open questions

If the spec isn't ready:
> This spec has status "[status]". Run `/checkspec` first to validate it before creating ticks.

### Step 3: Analyze Implementation Scope

Read the spec thoroughly and explore the codebase to understand:

1. **Change Footprint**: Which files need modification? Which need creation?
2. **Dependencies**: What order must changes happen in?
3. **Risk Areas**: Which changes are most likely to cause issues?
4. **Test Infrastructure**: How does this project run tests?
   - What test command? (`go test`, `npm test`, `pytest`, etc.)
   - What test file patterns? (`*_test.go`, `*.test.ts`, `test_*.py`)
   - Any existing test helpers or fixtures to reuse?
   - How to run specific tests? (`-run`, `--grep`, `-k`, etc.)
5. **Test Points**: Where can we verify correctness automatically?
6. **Human Tasks**: What requires human intervention (credentials, external setup, manual testing)?

**Understanding test infrastructure is critical** - you'll need this to write good acceptance criteria.

### Step 4: Design the Epic Structure

Group work into **epics** (parent containers). Each epic should:
- Represent a coherent feature or phase
- Contain 3-5 tasks (optimal for parallelization)
- Be independently valuable when complete

**Naming convention for epics:**
```
<spec-name>: <phase-description>
```

Example epics for a "user-auth" spec:
- `user-auth: Database schema and models`
- `user-auth: API endpoints`
- `user-auth: Frontend components`
- `user-auth: Manual setup tasks`

### Step 5: Design Individual Ticks

Each tick must be:

1. **Atomic**: One deliverable, completable in a single focused session
2. **Testable**: Clear acceptance criteria an agent can verify
3. **Independent**: Minimize dependencies (use `--blocked-by` when necessary)
4. **AI-friendly**: Sufficient context for autonomous completion

**Good tick structure:**
- **Title**: Action-oriented, specific (e.g., "Add JWT validation middleware")
- **Description** (`-d`): What to implement, which files to modify, relevant context
- **Acceptance** (`--acceptance`): How to verify completion - specific test commands or checks

### Step 5a: Test-First Tick Design (CRITICAL)

**⚠️ MANDATORY TESTING REQUIREMENTS ⚠️**

**Testing is NOT optional.** Every implementation tick that modifies code MUST:
1. **Include automated tests** as part of the deliverable
2. **Run the tests** before considering the tick complete
3. **Fix failures and re-run** until all tests pass - no exceptions

**Agents MUST NOT close a tick until tests pass.** The execution loop is:
```
1. Write/modify code
2. Write/modify tests
3. Run TARGETED tests (not the full suite!)
4. If tests fail → fix and go to step 3
5. Only when tests pass → close the tick
```

**This is non-negotiable.** A tick with failing tests is NOT complete, regardless of whether the implementation "looks right."

### Step 5b: Surgical vs Full Test Suites (IMPORTANT)

**⚠️ Full test suites are expensive. Use surgical testing by default.**

| Test Type | When to Use | Example |
|-----------|-------------|---------|
| **Surgical** | Every tick - validate new/changed code | `npm test -- --grep "UserAuth"` |
| **Full suite** | End of epic, end of project, or suspected regressions | `npm test` |

**Ticks should use SURGICAL tests:**
- Run only tests related to the code being changed
- Use test filtering flags (`-run`, `--grep`, `-k`, `--testNamePattern`)
- Target specific test files or directories

**Full test suite runs are reserved for:**
1. **Environment validation epic** (once at project start to establish baseline)
2. **End of each epic** (optional - as a final validation tick)
3. **End of the entire project** (mandatory - before PR/merge)
4. **When you suspect regressions** (e.g., refactoring shared code)

**Example surgical acceptance criteria:**
```
✅ GOOD (surgical):
   npm test -- --grep "validateUser" passes
   go test ./internal/auth/... -run TestValidate -v passes
   pytest tests/auth/test_validate.py -v passes

❌ AVOID in regular ticks (full suite):
   npm test passes
   go test ./... passes
   pytest passes
```

**Why this matters:** A full test suite might take minutes (or longer). Running it for every tick wastes time and creates bottlenecks. Surgical tests give fast feedback on the specific code being changed.

---

**Additional context:** Acceptance criteria are NOT automatically enforced. They are presented to the agent as guidance, but nothing prevents the agent from closing a task without verification. Therefore:

**Every implementation tick MUST include writing tests as part of the deliverable:**

```
❌ BAD: Separate ticks for implementation and tests
   - Tick 1: "Add ParentBranch field"
   - Tick 2: "Add tests for ParentBranch"  ← Agent might skip this

✅ GOOD: Tests bundled with implementation
   - Tick 1: "Add ParentBranch field with tests"
     Description includes: "Add tests in worktree_test.go for..."
     Acceptance: "go test ./internal/worktree/... -run TestParentBranch passes"
```

**Acceptance criteria must be:**
1. **Executable commands** the agent can run (not prose descriptions)
2. **Specific test patterns** that target the new code (`-run TestNewFeature`)
3. **Verifiable by the agent** before closing the tick

**Test-first tick pattern:**
```bash
tk create "Add feature X with tests" \
  --parent <epic-id> \
  -d "Implement feature X.

Files to modify:
- src/feature.go (implementation)
- src/feature_test.go (tests)

Implementation:
1. [what to implement]

Tests to write:
1. TestFeature_HappyPath - verify normal operation
2. TestFeature_EdgeCase - verify edge case handling
3. TestFeature_ErrorCase - verify error handling

Write the tests FIRST or alongside the implementation.

⚠️ IMPORTANT: Do not close this tick until the acceptance criteria pass.
Run the TARGETED test command (not the full suite). If it fails, fix and re-run until green." \
  --acceptance "go test ./src/feature/... -run TestFeature -v passes with all 3 tests visible in output"
```

**Note:** The acceptance criteria uses a surgical test command (`-run TestFeature`) targeting only the new tests. Do NOT use `go test ./...` (full suite) in regular tick acceptance criteria.

**Why this matters:**
- Agent sees "tests to write" in description → writes them
- Agent sees specific test command in acceptance → runs it before closing
- Test output shows specific test names → agent verifies they exist and pass

### Step 5c: E2E Testing Integration (For UI Features)

**⚠️ If the spec involves UI changes, integrate E2E testing into the epic structure.**

**Key principle:** E2E testing is integrated, not bolted on. Every UI tick includes E2E verification.

### ⚠️ E2E SERIALIZATION CONSTRAINT (CRITICAL)

**E2E tests CANNOT run in parallel.** They use the Android emulator/iOS simulator, which is a shared resource. Only ONE E2E test can run at a time.

**When creating E2E ticks, you MUST chain them with dependencies:**

```bash
# First E2E tick - no E2E blocker
tk create "E2E: Verify infrastructure" --parent <epic-id> ...

# Second E2E tick - blocked by first
tk create "E2E: Verify feed selector" --parent <epic-id> --blocked-by <first-e2e-id> ...

# Third E2E tick - blocked by second
tk create "E2E: Verify categories screen" --parent <epic-id> --blocked-by <second-e2e-id> ...
```

**Why this matters:**
- Emulator is a shared resource - only one test can use it at a time
- Parallel E2E tests will fight for the emulator and both fail
- Serial execution ensures reliable, reproducible results

**Non-E2E tasks CAN run in parallel with E2E tasks:**
- Unit tests, code review, documentation can run alongside E2E
- Only E2E-to-E2E must be serialized

**Reference the E2E knowledge base:**
- Hub: `docs/current/e2e/README.md`
- UI epic structure: `docs/current/e2e/ui-epic-structure.md`
- Project directory pattern: `docs/current/e2e/project-e2e-directory.md`
- Tick quick reference: `docs/current/e2e/tick-quick-reference.md`
- Maestro patterns: `docs/current/e2e/maestro-patterns.md`

**Step 1: Create the project e2e/ directory**

The first tick in a UI epic should create the project's e2e directory:

```
docs/projects/<date>-<feature>/e2e/
├── README.md        # Quick reference for this project's E2E
├── SCRATCHPAD.md    # Living doc - what's working, what's not
├── COOKBOOK.md      # Project-specific patterns
├── LOG.md           # Test run history
└── flows/           # Project-specific YAML test files
```

**Step 2: Include e2e/ context in UI epics**

Every UI epic description should reference:

```bash
tk create "<spec-name>: <ui-phase>" -t epic -d "Description

## Context

**Spec:** \`docs/projects/<date>-<feature>/SPEC.md\`

**E2E Directory:** \`docs/projects/<date>-<feature>/e2e/\`

**Before any tick:**
1. Read \`e2e/SCRATCHPAD.md\` for current status
2. Read \`e2e/COOKBOOK.md\` for project patterns

**After every tick:**
1. Update \`e2e/SCRATCHPAD.md\` with findings
2. Log test runs in \`e2e/LOG.md\`

**E2E Knowledge Base:** \`docs/current/e2e/\`"
```

**Step 3: Include e2e/ context in UI ticks**

Every UI tick description should include:

```markdown
## E2E Context

**Scratchpad:** docs/projects/<date>-<feature>/e2e/SCRATCHPAD.md (READ FIRST)
**Cookbook:** docs/projects/<date>-<feature>/e2e/COOKBOOK.md
**Log:** docs/projects/<date>-<feature>/e2e/LOG.md
**Test file:** docs/projects/<date>-<feature>/e2e/flows/<feature>.yaml

**Quick reference:** docs/current/e2e/tick-quick-reference.md

Check the scratchpad for what previous ticks learned about E2E in this project.
```

**Step 4: Standing rule for E2E epics**

After creating each UI epic:

```bash
tk note <epic-id> "STANDING RULE: Every tick MUST read e2e/SCRATCHPAD.md before starting and update it with findings before closing. Log all test runs in e2e/LOG.md. Add reusable patterns to e2e/COOKBOOK.md."
```

**Why this matters:**
- Ticks share knowledge about what's working/not working
- Previous tick discoveries help next tick succeed
- Project-specific quirks are documented in one place
- Global patterns can be promoted to the knowledge base

### Step 6: Identify Human Tasks

Some tasks require human intervention. Mark these with `--awaiting work`:

- Setting up credentials or API keys
- Configuring external services
- Manual testing on physical devices
- Decisions requiring user input
- App store submissions, deployments

These are skipped by `tk next` (agent queue) and must be completed by humans.

#### ⚠️ CRITICAL: Test Dependencies Requiring Human Setup

**First, exhaust all options to avoid human intervention.**

Before creating a human task, ask:
- Can I install this myself with a package manager? (`npm install`, `apt-get`, `brew`, etc.)
- Can I use a mock or stub instead of the real service?
- Can I run a subset of tests that don't need this dependency?
- Can I use Docker or a container to provide the dependency?
- Can I configure this programmatically instead of manually?
- Is there an API or CLI that can do what a human would do?

**Things agents SHOULD do themselves (not human tasks):**
- Start test servers (`npm run test:server`, `python -m pytest --server`, etc.)
- Start API servers for integration tests (run in background, wait for ready)
- Start databases with Docker (`docker run -d postgres`)
- Install npm/pip/cargo dependencies
- Run build commands
- Set up test fixtures and seed data
- Create temporary files, directories, and configs
- Run linters, formatters, type checkers

**Be creative and resourceful.** Human tasks create bottlenecks - minimize them aggressively.

**Only create human tasks when truly unavoidable:**
- E2E tests requiring a physical device or emulator
- Tests requiring installed tools (Android SDK, Xcode, etc.)
- Tests requiring credentials or API keys
- Tests requiring external service configuration
- Integration tests requiring database/service setup

**Create blocking human tasks for these dependencies:**

```bash
# Human setup tick - blocks the implementation tick
tk create "Install Android SDK and configure emulator" \
  --parent <epic-id> \
  --awaiting work \
  -d "Manual setup required for E2E tests:
1. Install Android SDK
2. Configure AVD (Android Virtual Device)
3. Verify 'adb devices' shows the emulator
4. Confirm device is accessible for test runs"

# Implementation tick - blocked until human completes setup
tk create "Add E2E tests for login flow" \
  --parent <epic-id> \
  --blocked-by <human-setup-tick-id> \
  -d "Write E2E tests for the login flow.

Requires: Android emulator configured (see blocker tick).

Tests to write:
1. User can enter credentials
2. Login button submits form
3. Error shown for invalid credentials

⚠️ Do not close until tests pass on the emulator." \
  --acceptance "npm run test:e2e -- --grep 'login' passes on Android emulator"
```

**During execution:** If an agent encounters a test it cannot run due to missing setup:
1. Create a blocking human task for the setup
2. Mark the current tick as blocked by that task
3. Move on to other work (do not close the blocked tick)
4. The human completes setup and closes the human task
5. The agent can then resume and complete the original tick

### Step 7: Create the Epics and Ticks

Create epics first, then tasks under them.

**Create an epic with context references:**

Each epic MUST include references to the spec and relevant files so agents have full context:

```bash
tk create "<spec-name>: <phase>" -t epic -d "Description of this phase

## Context

**Spec:** \`<path-to-spec-file>\`

**Key files for this epic:**
- \`<path/to/relevant/file1>\` - brief description
- \`<path/to/relevant/file2>\` - brief description

**Related docs:** (if any)
- \`<path/to/doc>\` - what it covers"
```

**Example epic with full context:**
```bash
tk create "user-auth: API endpoints" -t epic -d "Implement authentication API endpoints

## Context

**Spec:** \`docs/projects/2026-01-15-user-auth/2026-01-15-user-auth-spec.md\`

**Key files for this epic:**
- \`src/api/routes.ts\` - existing route definitions to extend
- \`src/middleware/auth.ts\` - authentication middleware to integrate
- \`src/services/userService.ts\` - user service for data access

**Related docs:**
- \`docs/current/api-patterns.md\` - API conventions to follow"
```

This ensures any agent working on the epic can immediately access the full specification and understand which existing code is relevant.

### Step 7a: Cross-Epic Dependencies (CRITICAL for Parallelization)

**⚠️ TASK-LEVEL DEPENDENCIES ENABLE CROSS-EPIC PARALLELIZATION**

The run-all command computes global waves across ALL epics. This means tasks from different epics can run in parallel if they don't depend on each other. To enable this:

1. **Register dependencies at the TASK level, not the epic level**
2. **Be precise about what actually depends on what**
3. **Don't over-block** - only add dependencies for real requirements

**Dependency Analysis Questions:**

For each task, ask:
- What specific tasks (in any epic) must complete before this can start?
- What code/data does this task need that another task produces?
- What files does this task modify that might conflict with another task?

**Cross-Epic Dependency Patterns:**

| Pattern | Dependency Registration |
|---------|------------------------|
| Task B uses code written by Task A | `tk block <B> <A>` |
| Task B validates Task A's output | `tk block <B> <A>` |
| Task B imports from Task A's new module | `tk block <B> <A>` |
| Tasks A and B modify unrelated files | No dependency (can run in parallel!) |
| Tasks A and B both read the same file | No dependency (reads don't conflict) |
| Tasks A and B both modify same file | `tk block <B> <A>` (serialize to avoid conflicts) |

**Example: Three epics with cross-epic parallelization:**

```
Epic 1: Backend API
  └── api-schema (no deps)
  └── api-handlers (blocked by api-schema)
  └── api-tests (blocked by api-handlers)

Epic 2: Frontend Components
  └── ui-components (no deps) ← CAN RUN WITH api-schema!
  └── ui-integration (blocked by api-handlers, ui-components)
  └── ui-tests (blocked by ui-integration)

Epic 3: Documentation
  └── api-docs (blocked by api-handlers) ← CAN RUN WITH ui-components!
  └── ui-docs (blocked by ui-components)
  └── final-review (blocked by api-tests, ui-tests, api-docs, ui-docs)
```

**Global Wave Analysis (what run-all computes):**
```
Wave 1: [api-schema, ui-components] ← Two epics running in parallel!
Wave 2: [api-handlers, ui-docs] ← Cross-epic parallelization
Wave 3: [api-tests, ui-integration, api-docs]
Wave 4: [ui-tests]
Wave 5: [final-review]
```

**Registering the dependencies:**
```bash
# Within Epic 1
tk block <api-handlers> <api-schema>
tk block <api-tests> <api-handlers>

# Within Epic 2
tk block <ui-integration> <ui-components>
tk block <ui-tests> <ui-integration>

# Cross-epic: ui-integration needs the API
tk block <ui-integration> <api-handlers>

# Within Epic 3
tk block <api-docs> <api-handlers>
tk block <ui-docs> <ui-components>

# Cross-epic: final-review needs everything
tk block <final-review> <api-tests>
tk block <final-review> <ui-tests>
tk block <final-review> <api-docs>
tk block <final-review> <ui-docs>
```

**When NOT to add cross-epic dependencies:**
- Epics work on completely independent code paths
- Tasks only READ from shared code (no writes)
- "Nice to have" ordering that isn't strictly required

**Create tasks under the epic (with bundled tests):**
```bash
tk create "Add user validation with tests" \
  --parent <epic-id> \
  -d "Implement user validation logic with comprehensive tests.

Files to modify:
- src/auth/validate.ts (implementation)
- src/auth/validate.test.ts (tests)

Implementation:
1. Add validateUser() function that checks email format and password strength
2. Return ValidationResult with success/errors

Tests to write in validate.test.ts:
1. 'validates correct email format' - test valid emails pass
2. 'rejects invalid email format' - test invalid emails fail
3. 'enforces password minimum length' - test short passwords rejected
4. 'returns all validation errors' - test multiple errors collected

Write tests FIRST, then implement to make them pass.

⚠️ Use surgical test command below - do NOT run full test suite." \
  --acceptance "npm test -- validate.test.ts passes with all 4 test names visible"
```

**Note:** The acceptance criteria targets only `validate.test.ts`, not the full test suite.

**Create a task with dependencies:**
```bash
tk create "Task that depends on another" \
  --parent <epic-id> \
  --blocked-by <blocker-tick-id> \
  -d "Description..." \
  --acceptance "Verification steps..."
```

**Create a human task:**
```bash
tk create "Set up Firebase project and add credentials" \
  --parent <epic-id> \
  --awaiting work \
  -d "Manual setup required:
1. Create Firebase project at console.firebase.google.com
2. Enable Authentication
3. Download service account key
4. Add to .env as FIREBASE_CREDENTIALS"
```

### Step 8: Generate Dependency Summary (REQUIRED)

After creating all tasks, generate a dependency summary that shows the global wave structure. This helps verify that dependencies are correctly registered and shows the parallelization opportunities.

**Run the global dependency analysis:**
```bash
# List all open tasks with their blockers
tk list --status open --json | jq '.[] | {id, title, blocked_by}'
```

**Create a visual dependency map in your response:**

```markdown
## Dependency Map

### Global Waves (Cross-Epic Parallelization)

| Wave | Tasks | Epics |
|------|-------|-------|
| 1 | task-a, task-d, task-g | Epic 1, Epic 2, Epic 3 |
| 2 | task-b, task-e | Epic 1, Epic 2 |
| 3 | task-c, task-f, task-h | Epic 1, Epic 2, Epic 3 |
| ... | ... | ... |

### Dependency Edges

```
task-a ─┬─> task-b ──> task-c
        │
task-d ─┼─> task-e ──┬─> task-f
        │            │
task-g ─┴────────────┴─> task-h
```

### Cross-Epic Dependencies

| Dependent Task | Blocked By | Reason |
|---------------|------------|--------|
| ui-integration | api-handlers | Needs API endpoints to integrate |
| final-review | api-tests, ui-tests | Must verify all tests pass |
```

**Why this matters:**
- Verifies dependencies are correctly set up
- Shows the maximum parallelization achievable
- Identifies bottlenecks (tasks that block many others)
- Documents the execution order for human review

### Step 9: Optional Final Validation Epic (PROJECT END)

**Consider adding a final validation epic at the end of the project** that runs the full test suite one more time. This catches any regressions that surgical tests might have missed.

```bash
tk create "<spec-name>: Final validation" -t epic -d "Run full test suite and verify no regressions

## Context

**Spec:** \`<path-to-spec-file>\`

This epic runs AFTER all implementation is complete."

tk create "Run full test suite" \
  --parent <epic-id> \
  --blocked-by <last-implementation-tick-id> \
  -d "Run the complete test suite to verify no regressions were introduced.

Commands to run:
- npm run build
- npm test (full suite)
- npx tsc --noEmit (if TypeScript)

If new failures exist that weren't in the baseline, investigate and fix." \
  --acceptance "Full test suite passes"
```

**When to create this epic:**
- Always recommended for projects with 3+ implementation epics
- Required for projects touching shared/core code
- Can be skipped for very small, isolated changes

**When to run full tests mid-project (rare):**
- Refactoring shared utilities or core modules
- Changing database schemas or migrations
- Modifying test infrastructure itself
- Strong suspicion that changes caused regressions

### Step 10: Present the Created Ticks

After creating all ticks, show a summary:

```markdown
## Ticks Created for: <spec-name>

**Spec:** `<path to spec>`

### Epics Overview

| Epic | Tasks | Human Tasks | Description |
|------|-------|-------------|-------------|
| <id> | X     | Y           | Phase 1: ... |
| <id> | X     | Y           | Phase 2: ... |

### Global Wave Structure (Cross-Epic Parallelization)

| Wave | Tasks (across all epics) | Max Parallel |
|------|--------------------------|--------------|
| 1 | <task-ids> | N |
| 2 | <task-ids> | N |
| ... | ... | ... |

**Critical Path:** Wave 1 → Wave 2 → ... → Wave N (minimum sequential steps)
**Total Parallelization:** X tasks across Y waves = Z% parallelization efficiency

### Cross-Epic Dependencies

| From (blocks) | To (blocked by) | Reason |
|---------------|-----------------|--------|
| api-handlers | ui-integration | UI needs API to integrate |
| ... | ... | ... |

### Human Tasks Requiring Attention

These tasks are marked `--awaiting work` and must be completed before dependent work can proceed:

| ID | Title | Blocks | In Wave |
|----|-------|--------|---------|
| <id> | Set up credentials | <blocked-tick-ids> | Wave N |
```

### Step 11: Explain How to Run and Monitor

End by explaining how to execute the ticks:

```markdown
## Running Your Ticks

### Option 1: Run with AI Agent (Autonomous)

```bash
# Run agent on an epic
tk run <epic-id>

# Run on multiple epics sequentially
tk run <epic-id-1> <epic-id-2>

# Auto-select next ready epic
tk run --auto

# Watch mode - restart when tasks become ready
tk run <epic-id> --watch

# Limit cost or iterations
tk run <epic-id> --max-cost 5.00
tk run <epic-id> --max-iterations 10
```

### Option 2: Manual Execution

```bash
# Get the next unblocked task
tk next

# Get next task within a specific epic
tk next --parent <epic-id>

# See all ready tasks
tk ready

# View a specific tick's details
tk show <tick-id>

# Close a tick when done (ONLY after tests pass!)
tk close <tick-id> --reason "Completed: description of what was done"

# Add notes during implementation
tk note <tick-id> "Decision: chose X because Y"
```

**⚠️ REMINDER: Before closing any tick:**
1. Run the acceptance criteria commands from the tick
2. If tests fail, fix the code and re-run
3. Only close when ALL tests pass
4. Include test results in the close reason

### Monitoring Progress

```bash
# Visual board view (live updating)
tk board

# List all open ticks
tk list

# List completed ticks
tk list --status closed

# See what's blocked
tk blocked

# See human tasks needing attention
tk list --awaiting work
```

### When You're Done

Run `/checkin-and-pr` to commit your changes and create a pull request.
```

### Step 12: Offer Next Steps

Ask:
> Would you like me to:
> 1. Adjust the tick breakdown or dependencies?
> 2. Add more detail to specific ticks?
> 3. Help complete any human tasks before you start?
> 4. See the dependency graph visualized differently?

---

## Tick Quality Guidelines

### ⚠️ MANDATORY: No Closing Until Tests Pass

**This is the most important rule for tick execution:**

An agent executing a tick with tests MUST:
1. Run the acceptance criteria commands
2. If they fail, fix the code
3. Run again
4. Repeat until ALL tests pass
5. Only THEN close the tick

**A tick closed with failing tests is a FAILED tick**, even if the agent claims it's complete. The agent must iterate - there is no "close and move on" if tests are red.

When writing tick descriptions, include explicit reminders:
```
⚠️ Do not close this tick until the acceptance criteria commands pass.
   If tests fail, fix the issues and re-run until green.
```

---

### Good Tick Design

**DO:**
- Make each tick atomic (one deliverable)
- **Bundle tests with implementation** (never separate "add tests" ticks)
- Include specific file paths in descriptions
- **List specific test names** to write in the description
- Write acceptance criteria as **executable commands**
- **Include expected output** in acceptance (e.g., "with TestFoo visible")
- **Use surgical/targeted test commands** (e.g., `--grep`, `-run`, `-k`)
- Use `--blocked-by` for true dependencies only
- Keep descriptions concise but complete

**DON'T:**
- Create ticks that are too large (split them)
- Create ticks that are too small (combine related changes)
- **Create separate ticks for tests** (bundle with implementation)
- Use vague acceptance criteria ("it works", "tests pass")
- Write acceptance criteria that can't be copy-pasted to terminal
- **Use full test suite in regular tick acceptance** (reserve for milestones)
- Over-specify dependencies (only block when necessary)
- Create ticks for future phases that may change
- **NEVER close a tick without running the acceptance criteria tests**
- **NEVER close a tick if tests are failing** - fix and re-run until green

### Acceptance Criteria Examples

**Excellent (surgical, specific, executable):**
```
go test ./internal/worktree/... -run TestManager_Create -v passes with TestManager_Create_RecordsParentBranch visible
npm test -- --grep "UserAuth" --reporter=spec passes with "should validate JWT token" visible
go build ./... succeeds with no errors
curl -s localhost:3000/api/health returns {"status":"ok"}
pytest tests/auth/test_validate.py::TestValidateUser -v passes
```

**Good (surgical, executable):**
```
npm test -- UserAuth.test.ts passes
go test ./internal/auth/... passes
npm run build succeeds
```

**Reserved for epic-end or final validation ONLY:**
```
npm test passes (full suite - only at milestones)
go test ./... passes (full suite - only at milestones)
pytest passes (full suite - only at milestones)
```

**Bad (not executable, agent can't verify):**
```
It works
Tests pass
Looks good
Code is clean
Feature is implemented
```

**Key principle:** If the agent can't copy-paste the acceptance criteria into a terminal and see pass/fail, it's not good enough. For regular ticks, always use surgical/targeted test commands.

### Epic Sizing

- **3-5 tasks per epic** is optimal for parallel execution
- If an epic has 10+ tasks, split it
- If an epic has 1 task, merge with another epic
- Keep dependent task chains together
- Split independent tasks across epics for parallelization

### Human Task Identification

Mark as `--awaiting work` when the task requires:
- Credentials, API keys, or secrets
- External service configuration
- Physical device testing
- User decisions or approvals
- Manual verification that can't be automated
- Deployments or releases
