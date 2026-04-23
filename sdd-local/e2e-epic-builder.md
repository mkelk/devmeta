---
description: Create E2E testing epics with proper tick structure, cookbook, testing log, and autonomous execution support
argument-hint: [feature-name or project-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Current branch: !`git branch --show-current 2>/dev/null || echo "unknown"`
- Project argument: $ARGUMENTS

## Your Task

You are creating a complete E2E testing epic structure. This command is **framework-agnostic** — it reads E2E configuration from the project's `docs/current/e2e/e2e-config.md` file to determine the testing framework, runner command, test patterns, and other settings.

The output is:
- A `tk` epic with proper context references
- Child ticks for verification, test infrastructure, and (optionally) human setup
- Project e2e/ documentation (cookbook, log, scratchpad, readme)
- Proper tick dependencies (serialized if config requires it)

All ticks are designed for **autonomous execution by subagents**. Subagents can run tests, visually verify screenshots (Claude is multimodal), check device logs, create bug ticks, and update documentation — all without human intervention.

## Reference Documentation

Before proceeding, read these docs:
- `docs/current/e2e/README.md` - Hub index and quick navigation
- `docs/current/e2e/ui-epic-structure.md` - How to structure UI tasks as epics with E2E
- `docs/current/e2e/tick-quick-reference.md` - Minimal E2E knowledge for individual ticks
- `docs/current/e2e/autonomous-execution.md` - What subagents can do
- `docs/current/e2e/epic-writing-guide.md` - Tick templates and dependency patterns
- `docs/current/e2e/cookbook-template.md` - Cookbook template to copy
- `docs/current/e2e/project-e2e-directory.md` - Project e2e/ directory structure

---

### Step 1: Read E2E Configuration

Read `docs/current/e2e/e2e-config.md` and extract these fields:

| Field | Variable | Description |
|-------|----------|-------------|
| **framework** | `$FRAMEWORK` | E2E testing framework name (e.g., Maestro, Detox, Appium) |
| **runner_command** | `$RUNNER_CMD` | Command to run a single test file (e.g., `maestro.bat test <file>`) |
| **test_file_pattern** | `$TEST_PATTERN` | Where test files live (e.g., `e2e/flows/<category>/*.yaml`) |
| **orchestration** | `$ORCHESTRATION` | Orchestration script pattern (e.g., `PowerShell scripts in e2e/scripts/*.ps1`) |
| **shared_resource** | `$SHARED_RESOURCE` | What resource is exclusive (e.g., `Android emulator`) |
| **serialization_required** | `$SERIALIZED` | Whether E2E ticks must be chained (`true`/`false`) |
| **screenshot_method** | `$SCREENSHOT_METHOD` | How screenshots are captured and where they're stored |
| **e2e_docs_path** | `$E2E_DOCS` | Path to E2E knowledge base (e.g., `docs/current/e2e/`) |
| **env_vars** | `$ENV_VARS` | Environment variables needed for test runs |

**If `e2e-config.md` does not exist:**
1. Warn the user: "No E2E configuration found at `docs/current/e2e/e2e-config.md`."
2. Ask: "Would you like me to create a starter e2e-config.md? I'll need to know your E2E framework, runner command, and test file pattern."
3. If yes, create the config file using the format from `docs/current/e2e/e2e-config.md` as a template, then continue.
4. If no, abort.

### Step 2: Gather Context

Determine the following (ask the user if not clear from `$ARGUMENTS`):

- **Feature name** — what is being tested (e.g., "agent onboarding flow")
- **Branch name** — current git branch (auto-detected from context)
- **What is being verified** — numbered list of E2E verification points
- **Spec location** — path to the project spec (e.g., `docs/projects/<date>-<feature>/SPEC.md`)
- **Which screens/flows** are involved in the test
- **Whether a backend API** is needed (affects orchestration script requirements)
- **Whether existing test flows** can be extended or new ones are needed
- **Whether existing orchestration scripts** can be reused

Also determine the project directory. Look for an existing project dir matching the feature:
```bash
ls docs/projects/ | grep -i "<feature-keyword>"
```

If no project directory exists, determine the naming: `docs/projects/<today's-date>-<feature-name>/`

### Step 3: Create Project E2E Documentation

Create the project's `e2e/` subdirectory with documentation files. Follow the structure from `docs/current/e2e/project-e2e-directory.md`.

#### 3a. Create directory structure

```bash
PROJECT_DIR="docs/projects/<date>-<feature>"
mkdir -p "$PROJECT_DIR/e2e/flows"
```

#### 3b. Create README.md

```markdown
# E2E Testing - <Feature Name>

## Quick Start

1. Read the scratchpad: `SCRATCHPAD.md`
2. Run: `<$RUNNER_CMD with actual test file path>`
3. Screenshots: <location from $SCREENSHOT_METHOD>

## Key Files

| File | Purpose |
|------|---------|
| `SCRATCHPAD.md` | Current status, blockers, discoveries |
| `COOKBOOK.md` | Patterns that work for this project |
| `LOG.md` | Every test run recorded |
| `flows/<name>.<ext>` | Test file(s) |

## References

- Knowledge base: `<$E2E_DOCS>`
- Quick reference: `<$E2E_DOCS>/tick-quick-reference.md`
```

#### 3c. Create SCRATCHPAD.md

```markdown
# E2E Scratchpad - <Feature Name>

## Current Status

IN PROGRESS - Setting up E2E testing

## Latest Findings

(none yet)

## Known Issues

(none yet)

## What's Working

(to be determined)

## What's NOT Working

(to be determined)
```

#### 3d. Create COOKBOOK.md

Copy `docs/current/e2e/cookbook-template.md` to `$PROJECT_DIR/e2e/COOKBOOK.md`.

Fill in:
- Feature name in header
- Architecture diagram (customize for this feature's stack)
- Test file path using `$TEST_PATTERN`
- Orchestration script path using `$ORCHESTRATION`
- Environment details from `$ENV_VARS` and config
- Runner commands from `$RUNNER_CMD`

**Important:** Use the actual values from e2e-config.md, not hardcoded framework-specific paths.

#### 3e. Create LOG.md

```markdown
# E2E Test Log - <Feature Name>

## Test File
`<test file path from $TEST_PATTERN>`

## Orchestration Script
`<script path from $ORCHESTRATION>`

## Environment

<Table populated from e2e-config.md environment_setup and env_vars sections>

## Key Learnings

(Numbered, added as discovered during test runs)

## Test Run History

(Append entries as tests are run)
```

### Step 4: Create Epic

```bash
tk create "E2E: <what is being verified>" -t epic -p 1
```

Then update with description:

```bash
tk update <epic-id> -d "End-to-end test epic for verifying <feature>.

## Context

**Project:** <Feature Name>
**Spec:** docs/projects/<date>-<feature>/SPEC.md
**Branch:** <branch-name>
**E2E Directory:** docs/projects/<date>-<feature>/e2e/ (READ FIRST)
**Cookbook:** docs/projects/<date>-<feature>/e2e/COOKBOOK.md
**Log:** docs/projects/<date>-<feature>/e2e/LOG.md
**Scratchpad:** docs/projects/<date>-<feature>/e2e/SCRATCHPAD.md
**Framework:** <$FRAMEWORK>
**Config:** docs/current/e2e/e2e-config.md

## What we are verifying

1. <First verification point>
2. <Second verification point>
3. <Third verification point>

## Process

- ALWAYS read the cookbook and scratchpad before starting any tick
- ALWAYS take process notes in the log
- UPDATE the cookbook when you learn something new
- UPDATE the scratchpad with current status
- Each test run takes several minutes. Use pre-initiated setup to speed iteration."
```

### Step 5: Add Standing Rule

```bash
tk note <epic-id> "STANDING RULE FOR ALL TICKS: Every tick MUST update the cookbook with any new learnings before closing. New workarounds, timing discoveries, framework quirks, debugging techniques - all go in the cookbook. Also log every test run attempt in the E2E LOG. Update the SCRATCHPAD with current status."
```

### Step 6: Create Ticks

Use the decision tree below. For each tick, substitute config values from Step 1 into the descriptions.

#### Does the test file exist?

**NO** -> Create a **Type C: Test Infrastructure** tick:

```bash
tk create "Create E2E test for <feature>" --parent <epic-id> \
  --acceptance "Test file exists at <$TEST_PATTERN path> and passes smoke test"
```

Description should include:
- Phases to create
- testIDs/selectors to add to components
- Reference to framework patterns doc from `$E2E_DOCS` (e.g., `<$E2E_DOCS>/maestro-patterns.md` or equivalent)
- The runner command from `$RUNNER_CMD` for smoke testing

**YES** -> Skip to orchestration.

#### Does an orchestration script exist?

**NO** and the test needs setup (API/bundler/emulator/simulator) -> Create a **Script** tick:

```bash
tk create "Create orchestration script for <feature> E2E" --parent <epic-id> \
  --acceptance "Script runs end-to-end and produces E2E_RESULT output"
```

Description should reference existing orchestration scripts from `$ORCHESTRATION` pattern as examples.

**YES** or the test can run directly with `$RUNNER_CMD` -> Skip to verification.

#### Always create: Type A Verification tick(s)

```bash
tk create "Run E2E test and verify <what>" --parent <epic-id> \
  --acceptance "<specific criteria tied to screenshots and logs>"
```

Description MUST include the full autonomous execution steps, using config values:

```
Run the E2E test and verify <feature> works correctly through screenshot analysis.

## Context

**E2E Directory:** docs/projects/<date>-<feature>/e2e/ (READ FIRST)
**Cookbook:** docs/projects/<date>-<feature>/e2e/COOKBOOK.md
**Log:** docs/projects/<date>-<feature>/e2e/LOG.md
**Scratchpad:** docs/projects/<date>-<feature>/e2e/SCRATCHPAD.md
**Test file:** <path from $TEST_PATTERN>
**Orchestration:** <path from $ORCHESTRATION>
**Quick reference:** <$E2E_DOCS>/tick-quick-reference.md

## Step 1: Read the e2e directory
Read the scratchpad and cookbook from docs/projects/<date>-<feature>/e2e/

## Step 2: Run the E2E test
    <exact command from $ORCHESTRATION or $RUNNER_CMD>
Timeout: 600000ms (10 minutes)

## Step 3: Check exit code
- Exit code 0 = all phases passed
- Non-zero = check output for failure phase

## Step 4: Verify via screenshots
<$SCREENSHOT_METHOD instructions for finding and viewing screenshots>

Read screenshot files using the Read tool (supports images):
- Screenshot <N>: Should show <expected state>
- Screenshot <M>: Should show <expected state>

## Step 5: Check device logs
<device log commands appropriate for the framework and platform>

## Step 6: Log results
Append to docs/projects/<date>-<feature>/e2e/LOG.md

## Step 7: Update documentation
- Update docs/projects/<date>-<feature>/e2e/COOKBOOK.md if new learnings
- Update docs/projects/<date>-<feature>/e2e/SCRATCHPAD.md with current status

## If test FAILS
- Analyze failure screenshots
- Determine: test infra issue vs app code bug
- If app code bug: create a blocking bug tick under this epic
- If test infra: fix and re-run
- Leave this tick open with findings note
```

See `docs/current/e2e/autonomous-execution.md` for the full autonomous execution template.

#### Optionally: Type D Human Setup tick

Only if one-time environment setup is needed:

```bash
tk create "<Setup description>" --parent <epic-id> --awaiting work \
  --acceptance "<verification command from e2e-config.md environment_setup>"
```

#### Optionally: Final Verification tick

If multiple things need verifying separately:

```bash
tk create "Full E2E pass: all N phases green" --parent <epic-id> \
  --acceptance "Test completes with E2E_RESULT=PASS and all screenshots verified"
```

#### Serialization

**If `$SERIALIZED` is `true`:** Chain all E2E ticks with `--blocked-by` dependencies so only one runs at a time. The `$SHARED_RESOURCE` is exclusive.

```bash
# Each E2E tick blocked by the previous one
tk block <tick-2-id> <tick-1-id>
tk block <tick-3-id> <tick-2-id>
```

**If `$SERIALIZED` is `false`:** E2E ticks can run in parallel. Only set logical dependencies (infrastructure before verification).

### Step 7: Set Dependencies

```bash
# Infrastructure before verification
tk block <verification-id> <infrastructure-id>

# Orchestration script before verification
tk block <verification-id> <script-id>

# Human setup before anything (if applicable)
tk block <first-tick-id> <human-setup-id>

# Final verification after all others
tk block <final-id> <verification-id>
```

### Step 8: Present Summary

Show the user:
- Epic ID and title
- All ticks with IDs, types, and dependency arrows
- E2E directory path and key file paths
- Framework and runner command from config
- How to start execution

Example:

```
Epic: q8n - E2E: Verify agent onboarding flow works end-to-end

Framework: Maestro (from e2e-config.md)
Runner: maestro.bat test <file>

Ticks:
  dme (task) - Create E2E test YAML for onboarding
    |
  tpd (task) - Create orchestration script [blocked by: dme]
    |
  ldx (task) - Run E2E test and verify flow completes [blocked by: tpd]
    |
  ng0 (task) - Full E2E pass: all phases green [blocked by: ldx]

E2E Directory: docs/projects/2026-01-30-agent-onboarding/e2e/
  README.md    - Quick reference
  SCRATCHPAD.md - Current status (READ/WRITE)
  COOKBOOK.md   - Patterns and workarounds (READ/WRITE)
  LOG.md       - Test run history (APPEND)

To start: tk list --parent q8n --status open
```

---

## Autonomous Execution Emphasis

All E2E verification ticks are designed for autonomous subagent execution. When writing tick descriptions:

- **Always include a reference to `<$E2E_DOCS>/tick-quick-reference.md`** — this is the minimal knowledge any tick needs
- Include exact commands to run (from config, not hardcoded)
- Describe what each screenshot should show (so the agent can visually verify)
- Include device log grep patterns for the feature
- Include step-by-step instructions for what to do on failure
- Reference the e2e/ directory paths explicitly

Human intervention is ONLY needed for:
- One-time environment setup (use `--awaiting work` tick)
- Physical device testing (rare)
- Approving PRs

For the full autonomous execution guide, see: `docs/current/e2e/autonomous-execution.md`

## UI Epic = E2E Scope Principle

When this command is used for UI features, follow the pattern in `docs/current/e2e/ui-epic-structure.md`:

- Each UI "chunk" (user-visible piece of functionality) becomes its own epic
- Every UI tick within that epic includes E2E verification
- E2E is integrated, not bolted on at the end

Every UI tick description should include:

```markdown
## E2E Verification

**Quick reference:** <$E2E_DOCS>/tick-quick-reference.md
**E2E directory:** docs/projects/<date>-<feature>/e2e/
**Test file:** <path from $TEST_PATTERN>

After implementing, run: <$RUNNER_CMD with test file>
Screenshot to verify: Screenshot <N> should show <expected state>
```

## Updating Epics and Ticks with Learned Experiences

### During Execution

Every tick that runs an E2E test MUST:
1. **Read the scratchpad** — see what previous ticks discovered
2. **Log the run** in `LOG.md` (pass or fail, with details)
3. **Update the cookbook** with new workarounds, timing discoveries, or framework quirks
4. **Update the scratchpad** with current status
5. **Add an epic note** summarizing what was learned: `tk note <epic-id> "<tick-id> complete: <key finding>"`

### When E2E Reveals Code Bugs

1. Create a bug tick: `tk create "Fix <root cause>" -t bug --parent <epic-id>`
2. Add evidence from screenshots and device logs to the description
3. Block the verification tick: `tk block <verification-id> <bug-id>`
4. Add epic note: `tk note <epic-id> "Bug found: <bug-id> - <description>. Blocks <verification-id>."`
5. Fix the bug (or leave for next agent wave)
6. After fix: close the bug tick, unblocked verification tick runs next

### After Epic Completion

Add a final epic note summarizing:
- Total test runs performed
- Key bugs found and fixed
- Cookbook improvements made
- Test infrastructure created (test files, scripts, testIDs)
