---
description: Start a new specification document with interactive dialogue
argument-hint: [project-name]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Current directory: !`pwd`
- Current git branch: !`git branch --show-current 2>/dev/null || echo ""`
- Project name argument: $ARGUMENTS

## Your Task

You are starting a new specification document. Follow these steps:

### Step 1: Determine the Naming Pattern

**Option A: Explicit argument provided**

If `$ARGUMENTS` is not empty, use it as the project name. Generate a new naming pattern:
1. Form the naming pattern: `<today's date>-<project-name>`

**Option B: Infer from worktree or branch name**

If `$ARGUMENTS` is empty, try to infer the project name from the environment:

1. **From worktree directory:** Check if the current directory name matches `<repo>-YYYY-MM-DD-<project-name>`
   - Extract the full naming pattern: `2026-01-09-dark-mode`

2. **From branch name with date:** Check if branch matches `feature/YYYY-MM-DD-<project-name>`
   - Extract the full naming pattern: `2026-01-09-dark-mode`

3. **From branch name without date:** Check if branch matches `feature/<project-name>` or just `<project-name>`
   - Extract the project name and form new pattern: `<today's date>-<project-name>`
   - Examples: `feature/dark-mode` → `2026-01-21-dark-mode`, `melk-misc` → `2026-01-21-melk-misc`

If a pattern is inferred:
- Use this for the spec directory and file names
- Inform the user: "Inferred project name from branch: `<branch>`. Using naming pattern: `<pattern>`."

**Option C: No argument and cannot infer**

If `$ARGUMENTS` is empty AND no pattern can be inferred, ask:
> What would you like to call this spec? (e.g., "dark-mode", "user-auth", "api-refactor")

Then generate a new naming pattern as in Option A.

Convert the project name to kebab-case if needed.

### Step 2: Create the Spec Directory and File

Use the naming pattern determined in Step 1 (inferred from worktree/branch or newly generated).

1. Create the directory: `/docs/projects/<naming-pattern>/`
2. Create the spec file: `/docs/projects/<naming-pattern>/<naming-pattern>-spec.md`

Example structure:
```
docs/projects/
  2026-01-09-dark-mode/
    2026-01-09-dark-mode-spec.md      # The main specification
    2026-01-09-dark-mode-research.md  # Additional documents use same prefix
    2026-01-09-dark-mode-notes.md
```

Create the spec file with this template:

```markdown
# <Project Name> Specification

**Created:** <today's date>
**Status:** Draft

## Braindump / introductory thoughts

[To be defined]

## Overview

[To be defined]

## Open Questions

- [ ]

## References
[To be defined]

```
### Step 3: Start the Dialogue

After creating the file, begin a dialogue on the spec and continue until the spec is ready.

### Step 4: Iterate until satisfactory

Continue the dialogue until the spec is good.

### Step 5: Remove braindump

Upon spec ready, remove the Braindump section, making sure that everything important from there is now recorded elsewhere in the spec.