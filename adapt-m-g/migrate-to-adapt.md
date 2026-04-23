---
description: Migrate a devmeta project to ADAPT (global) — moves artifacts to .adapt/, renames terminology
---

## Purpose

This command migrates a project from the devmeta framework to ADAPT. It discovers all devmeta artifacts, moves them to `.adapt/`, renames terminology (Epoch→Increment, Epic→Feature, Reflection→I&A Cycle), and produces a clean ADAPT project structure.

Run this once per project. It is idempotent — if `.adapt/` already exists with content, it will report what's already migrated and skip those steps.

## What devmeta leaves behind

Scan for these artifacts (all are optional — a project may have some or all):

| Artifact | Path |
|----------|------|
| Project config | `devmeta.md` (project root) |
| Current pointer | `docs/epochs/current.md` |
| Epoch directories | `docs/epochs/epoch-<NN>/` |
| Iteration statuses | `docs/epochs/epoch-<NN>/iterations/` |
| Diary | `docs/devmeta/diary.md` |
| Implementation log | `docs/devmeta/implementation-log.md` |
| Lessons learned | `docs/devmeta/lessons-learned.md` |
| Reflection reports | `docs/devmeta/reflections/` |
| Feature specs | `docs/projects/<date>-<name>/` |
| Agent backlog | `.tick/` |
| CLAUDE.md refs | `## Epochs` section, `devmeta.md` mentions |

---

## Phase 1: Discover

Scan the project for all artifacts listed above. For each, report whether it exists and its size (file count or line count).

```bash
# Check each artifact
test -f devmeta.md && echo "devmeta.md: $(wc -l < devmeta.md) lines"
test -f docs/epochs/current.md && echo "current.md: $(wc -l < docs/epochs/current.md) lines"
test -d docs/epochs && echo "epochs: $(ls -d docs/epochs/epoch-* 2>/dev/null | wc -l) directories"
test -f docs/devmeta/diary.md && echo "diary: $(wc -l < docs/devmeta/diary.md) lines"
test -f docs/devmeta/implementation-log.md && echo "impl-log: $(wc -l < docs/devmeta/implementation-log.md) lines"
test -f docs/devmeta/lessons-learned.md && echo "lessons: $(wc -l < docs/devmeta/lessons-learned.md) lines"
test -d docs/devmeta/reflections && echo "reflections: $(ls docs/devmeta/reflections/ 2>/dev/null | wc -l) files"
test -d docs/projects && echo "projects: $(ls -d docs/projects/*/ 2>/dev/null | wc -l) directories"
test -d .tick && echo "ticks: $(ls .tick/issues/ 2>/dev/null | wc -l) issues"
```

Present what was found and confirm with the user before proceeding.

## Phase 2: Create `.adapt/` structure

```bash
mkdir -p .adapt/increments .adapt/ia-cycles .adapt/projects
```

## Phase 3: Migrate project config

If `devmeta.md` exists at project root:

1. Read it
2. Replace terminology:
   - `epoch` → `increment`, `Epoch` → `Increment`
   - `docs/epochs/current.md` → `.adapt/current-increment.md`
   - `docs/epochs/` → `.adapt/increments/`
3. Write the updated content to `.adapt/adapt.md`
4. Delete `devmeta.md`

## Phase 4: Migrate epoch history (rename in place)

If `docs/epochs/` exists:

1. Move `docs/epochs/current.md` → `.adapt/current-increment.md`
   - Update content: `Epoch` → `Increment`, `epoch` → `increment`
   - Update path refs: `docs/epochs/epoch-<NN>/` → `.adapt/increments/increment-<NN>/`

2. For each `docs/epochs/epoch-<NN>/` directory:
   - Move to `.adapt/increments/increment-<NN>/`
   - Read `_overview.md` if it exists and update terminology:
     - `Epoch` → `Increment`, `epoch` → `increment`
     - `docs/epochs/` → `.adapt/increments/`
   - Leave iteration status files as-is (historical content)

3. Remove `docs/epochs/` (should be empty after moves)

```bash
# Example move commands (adapt for actual epoch numbers found)
mv docs/epochs/current.md .adapt/current-increment.md
for dir in docs/epochs/epoch-*/; do
  num=$(basename "$dir" | sed 's/epoch-//')
  mv "$dir" ".adapt/increments/increment-$num"
done
rmdir docs/epochs 2>/dev/null
```

## Phase 5: Migrate working memory (merge + move)

### 5a: Merge diary + implementation-log → project-history.md

If both `docs/devmeta/diary.md` and `docs/devmeta/implementation-log.md` exist:

1. Read both files fully
2. The implementation-log is the primary structure — it has the detailed per-milestone build record
3. Read diary entries and identify entries that add context NOT already covered in the implementation-log (narrative observations, agent struggles, surprises, meta-framework insights)
4. Interleave those unique diary entries chronologically into the implementation-log content
5. Discard diary entries that duplicate what's in the implementation-log
6. Add a header: `# Project History\n\nConsolidated from diary.md and implementation-log.md during ADAPT migration.\n\n---`
7. Write the merged result to `.adapt/project-history.md`

If only `docs/devmeta/implementation-log.md` exists: rename its header and move to `.adapt/project-history.md`
If only `docs/devmeta/diary.md` exists: rename its header and move to `.adapt/project-history.md`

### 5b: Move lessons-learned

If `docs/devmeta/lessons-learned.md` exists:
- Move to `.adapt/lessons-learned.md` (content unchanged)

### 5c: Move reflection reports

If `docs/devmeta/reflections/` exists and has content:
- Move contents to `.adapt/ia-cycles/`

### 5d: Clean up

Remove `docs/devmeta/` directory (should be empty after all moves).

## Phase 6: Migrate feature specs

If `docs/projects/` exists and has content:

1. Move all subdirectories to `.adapt/projects/`
2. In each moved directory, rename `implementation-notes.md` → `context-log.md` if it exists

```bash
test -d docs/projects && ls docs/projects/ | head -1 > /dev/null 2>&1 && {
  mv docs/projects/* .adapt/projects/ 2>/dev/null
  for f in .adapt/projects/*/implementation-notes.md; do
    test -f "$f" && mv "$f" "$(dirname "$f")/context-log.md"
  done
  rmdir docs/projects 2>/dev/null
}
```

## Phase 7: Update CLAUDE.md

If `CLAUDE.md` exists and contains epoch/devmeta references:

1. Find the `## Epochs` section header and rename to `## Increments`
2. In that section:
   - Replace `Epoch` → `Increment` (e.g., "Increment 01: Business development materials")
   - Replace `docs/epochs/` → `.adapt/increments/`
   - Replace `Current epoch pointer: docs/epochs/current.md` → `Current increment pointer: .adapt/current-increment.md`
3. Find any `devmeta.md` references and replace with `.adapt/adapt.md`
4. **Do NOT** replace `Epoch` in historical prose elsewhere in the file (e.g., "Proposal B visual treatment (Epoch 09)" — this is descriptive context, not a path or section name)

## Phase 8: Reset agent backlog

If `.tick/` exists:

1. Check for open ticks:
   ```bash
   tk list --status open 2>/dev/null | head -5
   ```
2. If there are open ticks: **STOP and report them to the user.** Do not delete active work.
3. If all ticks are closed (or no ticks exist):
   ```bash
   rm -rf .tick
   tk init
   ```

## Phase 9: Update .gitignore

1. Read `.gitignore`
2. Ensure `.adapt/` is NOT in the ignore list (it should be committed)
3. `.tick/` rules should remain as-is (tk manages its own .gitignore inside `.tick/`)

## Phase 10: Clean up empty directories

```bash
rmdir docs/devmeta 2>/dev/null
rmdir docs/epochs 2>/dev/null
rmdir docs/projects 2>/dev/null
# Don't remove docs/ itself — other content may live there
```

## Phase 11: Report

Present a summary of everything that was done:

```markdown
## ADAPT Migration Complete

### Moved
| From | To |
|------|----|
| `devmeta.md` | `.adapt/adapt.md` |
| `docs/epochs/epoch-<NN>/` | `.adapt/increments/increment-<NN>/` |
| `docs/epochs/current.md` | `.adapt/current-increment.md` |
| `docs/devmeta/lessons-learned.md` | `.adapt/lessons-learned.md` |
| `docs/devmeta/reflections/` | `.adapt/ia-cycles/` |

### Merged
| From | Into |
|------|------|
| `docs/devmeta/diary.md` + `docs/devmeta/implementation-log.md` | `.adapt/project-history.md` |

### Updated
- `CLAUDE.md`: `## Epochs` → `## Increments`, paths updated
- `.adapt/adapt.md`: terminology updated
- `.adapt/current-increment.md`: Epoch → Increment
- `.adapt/increments/increment-<NN>/_overview.md`: Epoch → Increment

### Reset
- `.tick/`: deleted and reinitialized (clean agent backlog)

### Removed
- `docs/devmeta/` (empty after moves)
- `docs/epochs/` (empty after moves)

### Next steps
- Run `/adapt-m-g:start-increment-spec` to begin a new increment
- Or run `/adapt-m-g:status` to check project state
```

## Rules

- **Don't rewrite historical prose** — entries in project-history.md and lessons-learned.md that say "Epoch 04" are historical records. Only update structural references (paths, section headers).
- **Don't touch application code** — this is a framework migration, not a code change.
- **Don't delete anything without moving it first** — everything gets preserved, just relocated.
- **Don't assume specific epoch numbers exist** — discover what's there, handle what's found.
- **Stop if open ticks exist** — report them to the user before deleting `.tick/`.
