# devmeta-3:status — progress (no tk)

Report increment/iteration progress from the **intent ledger + git** (devmeta-3 keeps no `tk`).

1. Read `.devmeta/current-increment.md` → active increment dir.
2. Read `<incrementDir>/_overview.md` → the Iteration Map table. Report each iteration's **Status** (NOT STARTED / IN PROGRESS / DONE) and title.
3. Read `<incrementDir>/base-branch`; `git log --oneline -8 <base>` to show recent integrate/fix commits; `git worktree list` to surface any un-cleaned build worktrees.
4. From `.devmeta/project-history.md`, summarize what shipped per completed iteration (head sha, gate results).
5. Identify the **active iteration** (lowest not-DONE) and the next action:
   - active iteration exists → `Next: /devmeta-3:go` (runs that iteration's workflow).
   - all DONE → increment complete; `Next: /devmeta-3:start-increment-spec` for the next increment.
6. If a workflow run is in flight (check `/workflows`), report it rather than relaunching.

Keep it short: a status read is mechanical (effort: low). Do not modify anything.
