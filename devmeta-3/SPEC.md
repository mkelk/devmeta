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
| Plan | 1 agent (schema) | manifest: features[] (owned disjoint files, waves, **`testObligations[]`**), integrationPoints[] (the contract), acceptanceCriteria[] |
| Build | `parallel` per wave, worktree isolation | per-feature branch + **`testsAdded[]` evidence + passing `surgicalOutput`** + `learnings[]` |
| Integrate | 1 agent | merge in wave order + execute contract + combined migration + `learnings[]` |
| Gate | `parallel` gate agents + bounded fix loop | typecheck/unit/lint/migrate **+ coverage** green; fix agent returns `learnings[]` |
| Reflect | `parallel` skeptics | acceptance verdicts **+ test-quality verdicts + code-drift findings** |
| **Harvest** | 1 agent (Write) | route `learnings[]` to typed homes; narrative `project-history.md`; `ia-cycles/iteration-N.md`; plan-reassessment proposals; minor-drift → next-iter cleanup |

`go` is a thin launcher (pick iteration → inline args incl. `today` → launch → consume → advance), human-gateable at iteration boundaries.

## v2 — content-quality upgrade (implements `critique-and-improvements.md`)
The v1 engine hardened *what it checked* but **narrowed** quality: test *authoring* wasn't mandated, and the inside-out half of reflection (drift review + the self-learning harvest) was missing. v2 restores devmeta's bar **in devmeta-3's enforce-in-code idiom**, not as prose:
- **Tests mandatory, enforced by schema** — `testObligations[]` (Plan) + `minItems`-style `testsAdded[]` evidence (Build) make shipping an untested feature structurally hard; the **coverage gate** can fail; a **test-quality skeptic** catches hollow tests. (critique §2)
- **Inside-out drift review** — a code-drift skeptic panel reads the merged diff against the ported craftsmanship checklist; majors block, minors become next-iteration cleanup. (critique §3)
- **Self-learning flywheel** — `learnings[]` on build/integrate/fix returns (the structured replacement for `context-log.md`, preserving one control plane) feed a **Harvest** phase that routes each to a typed durable home with an explicit router, so the next iteration's Plan/Build read it. (critique §4) Engine-scope learnings route to `.devmeta/engine-notes.md`, unfreezing the hand-baked engine lessons. (critique §5.3)
- **Self-improvement** — plan reassessment on PASS, narrative history, `ia-cycles/` reports. (critique §5)

## What is proven vs not (be honest)
- **Proven (this repo):** the execution substrate + generic Plan/Integrate drove fresh, unseen increments to green autonomously (Quotes 1.2 hardcoded-prototype; Task-priority clean-room — generic), one control plane, no `tk`.
- **Newly added in v2 (validate before fully trusting):** the testing obligations, coverage gate, test-quality + drift skeptics, and the Harvest flywheel. The meta-acceptance (critique §10) is the bar: in a 2+ iteration increment, iteration N+1 demonstrably reuses knowledge Harvest filed in N and does not repeat N's non-obvious failures.

## Known limits
- Integrate is still a single agent for merge+wire (gates and reflect are parallelized; a future split could parallelize wiring per integration point).
- The coverage gate falls back to file-correspondence when no per-line coverage tool is configured (it `log()`s the fallback — no silent caps).
- Spec authoring is interactive (headless workflows can't do it) — it stays in `start-increment-spec`.
- Worktree isolation branches from the repo default branch; build agents must merge the base first (encoded in the build prompt).
- Harvest's engine-scope learnings are *collected* in `engine-notes.md`; folding them into the workflow prompts is still a human cadence (documented, not yet automated).
