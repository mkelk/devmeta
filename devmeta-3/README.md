# devmeta-3 — Workflow-native delivery engine

devmeta-3 is the third-generation devmeta engine. It keeps the proven devmeta moat —
**a versioned spec, iterative planning, adversarial reflection, durable artifacts** —
but moves the **execution spine into a single durable workflow** instead of a
prose-driven main-loop + a `tk` ledger.

## Why (vs devmeta / devmeta-ng)
- **devmeta**: main agent builds everything inline, serially. No fan-out, no adversarial reflect.
- **devmeta-ng**: a thin prose `go` loop owns a `tk` ledger + git + markdown and delegates the *build* to agents/a workflow. Powerful, but it runs **four state planes** (tk + git + md + journal) that must be kept in sync — the agent re-derives "where am I" from prose every turn.
- **devmeta-3**: the **iteration itself is one durable workflow**. The deterministic spine (plan → build → integrate → gates → reflect → gate) lives in JS; only the judgment + side-effect *slots* are agents. **One execution ledger** (the workflow journal) + **one intent ledger** (`_overview.md`) + git. No `tk`.

See `SPEC.md` for the design rationale and the research it is grounded in.

## Commands
- **`/devmeta-3:start-increment-spec`** — interactive: author the increment `_overview.md` (iterations + "Verify on screen" acceptance). Shares the `.devmeta/` layout + `NN-XXX` numbering with devmeta/devmeta-ng.
- **`/devmeta-3:go`** — drive the active increment: per iteration, inline its scope into `workflows/drive-iteration.workflow.js`, launch it, consume the structured result, advance the `_overview` status, and (by default) return at the iteration gate for a human checkpoint. `go auto` runs to completion.
- **`/devmeta-3:status`** — report increment/iteration progress from `_overview.md` + git (no `tk`).

## The engine (`workflows/drive-iteration.workflow.js`)
One generic, project-agnostic workflow drives any iteration:
1. **Plan** — derives the feature partition from the spec, **declares the integration contract** (shared files + each feature's contribution — what makes generic integration work), and assigns each feature non-empty **`testObligations[]`** (behavior→assertion→kind; typecheck is never a test).
2. **Build** — one agent per feature per wave, isolated worktrees, disjoint owned files (write-write-free). **Authoring tests is mandatory**: the schema requires `testsAdded[]` evidence + passing `surgicalOutput` — a feature cannot return valid output with no test. Agents also return `learnings[]`.
3. **Integrate** — merge branches in wave order, **execute the declared integration contract**, generate+apply the combined migration.
4. **Gate** — typecheck / unit / lint / migrate **+ a coverage gate that fails on untested new source**, run in parallel, with a bounded fix loop.
5. **Reflect** — parallel adversarial skeptics: **acceptance** + **test-quality** (catches hollow/skipped/tautological tests) + an inside-out **code-drift** panel (the ported craftsmanship checklist). Majors block; minors become next-iteration cleanup.
6. **Harvest** — routes every `learnings[]` item to a typed durable home (`CLAUDE.md` / `docs/current/` / `principles-and-choices.md` / `troubleshooting`|`testing-notes` / `lessons-learned` / `engine-notes`), writes a **narrative** `project-history.md` entry + an `ia-cycles/iteration-N.md` report, and proposes **plan reassessment** of the remaining iterations. This is the self-learning flywheel: iteration N+1 reads what N filed.

See `critique-and-improvements.md` for the spec these v2 quality mechanics implement, and `SPEC.md` for the phase contract.

## Drop-in compatibility
Same `.devmeta/` artifacts, same `increment-NN-XXX` directories, same `current-increment.md`. You can author with any generation's `start-increment-spec` and drive with `devmeta-3:go`. devmeta-3 does **not** require or maintain `tk`.

## Install
Lives at `~/.claude/commands/devmeta-3/` (or a project-local `.claude/commands/devmeta-3/`). The workflow is read by `go` at launch.
