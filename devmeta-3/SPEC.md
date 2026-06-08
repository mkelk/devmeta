# devmeta-3 — design spec & rationale

## Thesis
The devmeta *rhythm* (spec → plan → build → integrate → reflect → loop) is a **workflow**
in Anthropic's sense — "LLMs and tools orchestrated through predefined code paths." The
*judgment* steps (plan, build, reflect) are **agentic**. Earlier generations put the
rhythm in prose and tracked execution in a separate `tk` ledger; devmeta-3 puts the
rhythm in a durable **workflow script** and uses the **journal** as the execution ledger.

Grounding:
- **Workflows vs agents / orchestrator-workers / evaluator-optimizer / parallelization** — Anthropic, *Building Effective Agents*. devmeta-3's build = orchestrator-workers; reflect = evaluator-optimizer; the wave = parallelization; the phases = prompt-chaining with gates. ("Start simple; add machinery only when it demonstrably improves outcomes.")
- **Durable execution / journal-as-source-of-truth** — Temporal/Restate/DBOS/LangGraph. The Claude Code Workflow substrate is exactly this (cached `agent()` results, `resumeFromRunId`). So the journal *can be* the ledger; a separate `tk` is redundant.
- **Checkpoint-caching over strict replay** — the substrate re-runs from the top and returns cached `agent()` outputs, tolerating code edits between runs (no strict-determinism trap).
- **Spec-driven development** (GitHub Spec Kit, Kiro) — the versioned spec + reflection gates are the validated direction; devmeta-3 keeps the spec/artifacts as the moat.

## The one idea that makes generic integration work: the integration contract
The hard part of any fan-out engine is **integration** — wiring the independently-built
features into shared files (resource registries, providers, dashboards, grants). A naive
engine makes integrate "discover" the seams blind, which is unreliable.

devmeta-3's Plan phase **declares the integration contract up front**: every file that more
than one feature must touch is an *integration point*, removed from all features' owned
files, with each feature's contribution recorded (`{file, contributions:[{feature, change}]}`).
Build agents then build only disjoint owned files and **export** their pieces; the Integrate
phase **executes the declared contract** rather than guessing. This is what lets a generic
engine integrate without project-specific hardcoding.

## Control planes
- **Intent:** `_overview.md` (iterations + per-iteration Status + "Verify on screen" acceptance).
- **Execution:** the workflow journal (resumable; the single source of in-flight state).
- **Artifacts:** git (branches, merges, commits) + the durable `.devmeta/` docs.
- **No `tk`.** A task view, if wanted, is a projection emitted from the workflow result — never a maintained parallel plane.

## Phase contract of `drive-iteration.workflow.js`
| Phase | Substrate | Output |
|---|---|---|
| Plan | 1 agent (schema) | manifest: features[] (owned disjoint files, waves), integrationPoints[] (the contract), acceptanceCriteria[] |
| Build | `parallel` per wave, worktree isolation | per-feature branch + surgical-test-green |
| Integrate | 1 agent | merge in wave order + execute contract + combined migration |
| Gate | `parallel` gate agents + bounded fix loop | typecheck/unit/lint/migrate green |
| Reflect | `parallel` skeptics vs acceptanceCriteria | verdicts; gaps → `go` |

`go` is a thin launcher (pick iteration → inline args → launch → consume → advance), human-gateable at iteration boundaries.

## What is proven vs not (be honest)
- **Proven (this repo, iteration 1.2):** the execution substrate — a single workflow drove plan→build→integrate→gates→reflect to green autonomously, one control plane, no `tk`; agents self-applied project lessons (security_invoker, --no-verify, worktree-base merge, worktree cleanup).
- **Newly generalized (validate before trusting):** generic Plan (deriving the partition from the spec, not hardcoded) and generic Integrate (executing a *derived* contract, not a hardcoded one). The prototype short-circuited both by hardcoding; this engine moves them into the Plan agent + the integration contract. **The clean-room test is: run on a fresh increment where the partition and wiring were never pre-computed.**

## Known limits
- Integrate is still a single agent for merge+wire (gates are parallelized; a future split could parallelize wiring per integration point).
- Spec authoring is interactive (headless workflows can't do it) — it stays in `start-increment-spec`.
- Worktree isolation branches from the repo default branch; build agents must merge the base first (encoded in the build prompt).
