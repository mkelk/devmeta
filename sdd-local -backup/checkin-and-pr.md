---
description: Commit completed work and create a pull request with ticks summary
argument-hint: [spec-name or epic-id]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Project reference: $ARGUMENTS
- Completed ticks: !`tk list --status closed 2>/dev/null | head -10 || echo "No ticks found"`

## Your Task

You are finalizing completed implementation work by creating a well-documented commit and pull request. Follow these steps:

### Step 1: Identify the Completed Work

**If `$ARGUMENTS` specifies an epic ID:**
- Get the epic details: `tk show <epic-id>`
- List completed ticks: `tk list --parent <epic-id> --status closed`

**If `$ARGUMENTS` specifies a spec name:**
- Look for the spec in `/docs/projects/<spec-name>/`
- Find related epics by naming convention

**If `$ARGUMENTS` is empty:**
- List recent completed ticks: `tk list --status closed`
- List open epics to identify which project: `tk list -t epic`
- Ask which project to check in

### Step 2: Verify Readiness

Before committing, verify:

1. **Check git status** - Review all changed files
   ```bash
   git status
   git diff --stat
   ```

2. **Verify ticks are complete:**
   ```bash
   # Check epic status
   tk show <epic-id>

   # List any remaining open ticks
   tk list --parent <epic-id> --status open
   ```

3. **Run final tests:**
   ```bash
   npm run build && npm test
   ```

If work is incomplete:
> Implementation doesn't appear complete:
> - Open ticks: [list]
> - Failing tests: [list]
>
> Would you like to proceed anyway, or address these first?

### Step 3: Gather Context for Commit Message

Collect information from:

1. **Spec file** (if exists): `/docs/projects/<project>/<project>-spec.md`
2. **Completed ticks:** `tk list --parent <epic-id> --status closed`
3. **Tick notes:** `tk notes <tick-id>` for key decisions
4. **Git diff:** What files changed and why

### Step 4: Create the Commit

Stage all relevant files and create a commit with this format:

```
<type>(<scope>): <summary>

<body - what was done and why>

Ticks: <epic-id> (<count> tasks completed)
Spec: docs/projects/<project-folder>/<project>-spec.md

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

**Type** should be one of:
- `feat` - New feature
- `fix` - Bug fix
- `refactor` - Code restructuring
- `docs` - Documentation only
- `style` - Formatting, styling
- `test` - Adding tests
- `chore` - Maintenance

**Scope** is the area of the codebase affected (e.g., `ui`, `api`, `cli`, `auth`)

### Step 5: Identify the Base Branch

Determine where the PR should target:

1. Check current branch name for clues (e.g., `feature/dark-mode` → base is likely `main` or `master`)
2. Check git log to see where this branch diverged from
3. If unclear, ask the user:
   > Which branch should this PR target? (e.g., `main`, `master`, `develop`)

### Step 6: Push and Create Pull Request

Push the branch and create a PR with this format:

```markdown
## Summary

[2-3 sentence overview of what this PR accomplishes]

## Changes

- [Bullet list of major changes, derived from completed ticks]

## Ticks Completed

| ID | Title |
|----|-------|
| <id> | <title> |
| <id> | <title> |

View full details: `tk list --parent <epic-id> --status closed`

## Specification

- **Spec:** `docs/projects/<project-folder>/<project>-spec.md`

## Test Plan

[How was this tested? Reference acceptance criteria from ticks]

- [ ] All tick acceptance criteria verified
- [ ] Build passes
- [ ] Tests pass
- [ ] Manual verification completed (if applicable)

## Screenshots (if applicable)

[For UI changes, include before/after or key states]

---

🤖 Generated with [Claude Code](https://claude.ai/code)
```

Use `gh pr create` with the title and body.

### Step 7: Report Completion

After the PR is created, report:

```markdown
## Check-in Complete

**Commit:** `<commit-hash>` - <commit-summary>
**PR:** <pr-url>
**Target:** <base-branch>

### Ticks Summary

- **Epic:** <epic-id> - <epic-title>
- **Completed:** X ticks
- **Status:** All closed

### What's Next

- [ ] Request code review
- [ ] Address review feedback
- [ ] Merge when approved

### Project Documents

- Spec: `<path>` (if exists)
- Ticks: `tk list --parent <epic-id>`
```

---

## Guidelines

### Commit Message Quality

**DO:**
- Summarize the "what" in the first line (50 chars max)
- Explain the "why" in the body
- Reference the epic/ticks and spec
- Use conventional commit format

**DON'T:**
- List every file changed
- Include implementation details in the summary
- Write vague messages like "updates" or "fixes"

### PR Description Quality

**DO:**
- Lead with the user-facing impact
- List completed ticks with their titles
- Link to specification documents
- Include test verification steps
- Mention any known limitations or follow-up work

**DON'T:**
- Copy-paste entire tick descriptions
- Include internal notes or TODOs
- Skip the test plan section

### Handling Incomplete Work

If some ticks remain open but you want to create a partial PR:

1. List what's complete vs. remaining
2. Create PR with `[WIP]` prefix if needed
3. Note which ticks are deferred:
   ```markdown
   ## Deferred to Follow-up

   | ID | Title | Reason |
   |----|-------|--------|
   | <id> | <title> | <why deferred> |
   ```
