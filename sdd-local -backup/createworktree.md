---
description: Create a git worktree for isolated feature development
argument-hint: [spec-name-or-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Current directory: !`pwd`
- Spec reference: $ARGUMENTS

## Your Task

You are creating a git worktree for isolated feature development. The worktree will be created as a sibling to the current repository directory, with a feature branch for the spec.

### Step 1: Determine the Spec

**Option A: From an existing spec**

If `$ARGUMENTS` references an existing spec (path or name pattern like `2026-01-09-small-fixes`):

1. Extract the naming pattern from the spec directory name
2. Use that for the worktree and branch names

Example: Spec at `docs/projects/2026-01-09-small-fixes/` creates:
- Branch: `feature/2026-01-09-small-fixes`
- Worktree: `<repo>-2026-01-09-small-fixes`

**Option B: From a new project name**

If `$ARGUMENTS` is a project name (e.g., "dark-mode") that doesn't match an existing spec:

1. Use today's date
2. Form the naming pattern: `<date>-<project-name>`

This allows starting with the worktree first, then creating the spec inside it.

**Option C: No arguments provided**

If `$ARGUMENTS` is empty:

1. List available spec directories in `/docs/projects/` (folders matching `YYYY-MM-DD-*/`)
2. Ask the user:
   > Would you like to create a worktree for an existing spec, or start fresh?
   >
   > **Existing specs:**
   > [list available specs]
   >
   > Or provide a new project name (e.g., "dark-mode") to start fresh.

### Step 2: Verify Git State is Clean

Before creating the worktree, the working directory must be clean:

```bash
git status
```

**Requirements:**
1. **No uncommitted changes** - All work must be committed
2. **No untracked files** that should be committed

If there are uncommitted changes, **do not proceed**. Inform the user:
> Cannot create worktree: uncommitted changes detected.
>
> Please commit or stash your changes first:
> - `git add . && git commit -m "..."` to commit
> - `git stash` to stash temporarily
>
> Then run this command again.

### Step 3: Push Current Branch to Remote

Before creating the worktree, ensure the current branch is pushed:

```bash
git push -u origin <current-branch>
```

This ensures:
- The base branch exists on remote
- PRs will compare against a pushed state
- No local-only commits are lost

If push fails due to auth or remote issues, warn and ask whether to proceed.

### Step 4: Create the Worktree

Determine paths:
- **Current repo directory name:** Extract from current path (e.g., `claude-bg-chat`)
- **Parent directory:** One level up from current repo
- **Worktree path:** `<parent>/<current-repo-name>-<naming-pattern>`

Example:
- Current: `/home/user/projects/claude-bg-chat`
- Worktree: `/home/user/projects/claude-bg-chat-2026-01-11-dark-mode`

Check if the branch already exists:
```bash
git branch --list "feature/<naming-pattern>"
```

Create the worktree:
```bash
# If branch doesn't exist, create it with the worktree
git worktree add "<worktree-path>" -b "feature/<naming-pattern>"

# If branch already exists, just add the worktree
git worktree add "<worktree-path>" "feature/<naming-pattern>"
```

### Step 5: Confirm Success

After creating the worktree, output:

```markdown
## Worktree Created

**Worktree path:** `<worktree-path>`
**Branch:** `feature/<naming-pattern>`
**Base branch:** `<previous-branch>` (pushed to remote)
**PR target:** `<previous-branch>`

### Next Steps

Claude Code cannot change its working directory mid-session. To work in the new worktree:

1. Exit this Claude session (Ctrl+C or type `/exit`)
2. Navigate to the worktree:
   ```bash
   cd "<worktree-path>"
   ```
3. Start a new Claude session:
   ```bash
   claude
   ```

### Ticks Workflow

Once in the worktree, the typical flow is:

**If you started from an existing spec:**
1. `/checkspec` - Validate the spec (if not done)
2. `/createplan` - Create ticks from the spec
3. Run ticks with `tk run <epic-id>` or manually with `tk next`
4. Commit regularly with descriptive messages
5. `/checkin-and-pr` - Create PR when complete

**If you started fresh (new project name):**
1. `/startspec` - Create the spec first (will infer name from branch)
2. Then follow the flow above

### Ticks Commands

```bash
# Initialize ticks (if not done)
tk init

# See your ticks
tk list

# See what's ready to work on
tk ready

# Get next task
tk next

# View the board
tk board
```

### Related Files

- Spec: `docs/projects/<naming-pattern>/<naming-pattern>-spec.md`
- Ticks: `.tick/` directory (managed by `tk` CLI)

### Worktree Management

When you're done with the worktree:
```bash
# From the main repo, remove the worktree
git worktree remove "<worktree-path>"

# The branch remains and can be checked out normally
```
```

### Error Handling

**Worktree path already exists:**
> The worktree path already exists: `<path>`
>
> This could mean:
> 1. A worktree was already created for this spec
> 2. A directory with that name exists
>
> Would you like me to show the existing worktree status?

**Branch is already checked out in another worktree:**
> The branch `feature/<naming-pattern>` is already checked out in another worktree.
>
> Existing worktree: `<path>`
>
> You may want to work in that worktree instead.
