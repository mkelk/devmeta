# devmeta-3 — Critique & Improvements: reaching devmeta's quality bar

> **Purpose.** devmeta-3 made the engine more elegant and more *reliably enforced*, but in
> collapsing devmeta's prose-and-`tk` machine into one workflow it dropped whole dimensions of
> **content quality** that devmeta treated as non-negotiable. This document specifies, concretely,
> how to restore that quality **without reverting devmeta-3's architecture** — i.e. how to put the
> missing rigor back *in devmeta-3's own idiom* (schemas, gates, adversarial skeptics, durable
> `.devmeta/` homes) rather than as forgettable prompt prose.
>
> Scope, per the commissioning discussion: the **insistence on tests and testing mechanics**, the
> **running upgrade of knowledge** (where test/engineering knowledge is filed and found), **self-improvement
> within an increment and beyond**, and any other quality mechanics lost in the transition.
>
> This is a *specification*, not a changelog. Each section states the Problem, the Target, the
> Concrete change (files / schemas / prompts), how it is **enforced**, and its Acceptance test.

---

## 0. The core thesis (read this first)

devmeta-3 did not lower quality uniformly. It **narrowed and hardened** it:

- **Hardened** — the things it still checks are enforced *in code* (the Gate phase is a hard stop; reflect uses independent adversarial skeptics with `file:line` citations). This is strictly better than devmeta's prose rules that a forgetful agent could skip. **Do not regress these wins.**
- **Narrowed** — two whole dimensions devmeta treated as essential fell off the edge:
  1. **Test *authoring*** as a first-class, per-unit obligation (devmeta: "Write them, run them, fix them. Never defer." — `devmeta/run.md:159`).
  2. **The inside-out half of reflection** — code-quality/drift review (devmeta's explicitly "most important step", `devmeta/reflect.md:68`) *and* the self-learning harvest that routed new knowledge to durable, findable homes.

The fix is therefore **not** "paste devmeta's prose back." That would be weaker than what devmeta had *and* inconsistent with devmeta-3's enforce-in-code philosophy. The fix is to encode the missing rigor as **schema obligations, gate agents, reflect skeptics, and durable knowledge homes with explicit routing rules.**

### Design principles for every change below

1. **Enforce in schema/code, not prose.** A schema-required array the agent literally cannot return empty beats a prompt sentence. A gate that fails the iteration beats an exhortation. This is devmeta-3's own thesis — apply it to the things it forgot to apply it to.
2. **Reintroduce sub-feature granularity without reintroducing `tk`.** devmeta got per-task test bars *for free* from the task ledger; devmeta-3 deleted tasks. Restore the granularity as **arrays on the feature** (`testObligations[]`, `testsAdded[]`), carried in the workflow's structured returns — not as a parallel task plane.
3. **Every durable knowledge type needs three things: a HOME (a file), a ROUTER (who writes it), and a READER (who consumes it next iteration).** A home with no router decays; a router with no home has nowhere to put things; a home no one reads is dead weight. devmeta-3 kept some readers but deleted the routers — that is the flywheel break.
4. **Preserve "one control plane."** Durable knowledge lives in git-tracked `.devmeta/` markdown (still the *artifacts* plane — not a new ledger). The harvest *substrate* travels through the workflow's structured agent returns (`learnings[]` fields), **not** a resurrected `context-log.md` or `tk`. This keeps devmeta-3's defining property intact.
5. **Adversarial / independent verification over self-report.** Where devmeta-3 already does this (acceptance skeptics) it is excellent. Extend the same pattern to test-quality and drift, rather than trusting a builder's own "I tested it."

---

## 1. The gap at a glance

| Capability (devmeta had it) | devmeta-3 today | Target |
|---|---|---|
| Test **authoring** mandated per unit of work | Build "runs your surgical test *if it resolves*"; no instruction to *write* tests | **§2.1** schema-required `testsAdded[]` evidence per feature |
| Test granularity = per behavior | One `surgicalTest` *string* per whole feature | **§2.1** `testObligations[]` (behavior→assertion) per feature |
| No typecheck-as-substitute; no silent skip | "if pure UI/schema, use typecheck"; "note it if tooling unavailable" | **§2.2** typed test per feature class; skip → surfaced escalation |
| A test bar that can actually fail | `unit` gate is **vacuous-pass-able** (suite green with 0 new tests) | **§2.3** coverage gate that fails on uncovered new code |
| Test-quality / anti-gaming review | none | **§2.4** adversarial test-quality skeptic per feature |
| **Where test info is found** (static lookup) | `.devmeta/devmeta.md > ## Testing` kept ✅ | **§2.5** keep + make per-feature obligations durable |
| **Where recurring test failures are filed** (router + home) | **gone** — no `troubleshooting.md`, no routing rule | **§2.5 / §4** restore home + router |
| Inside-out **code-quality / drift review** (the "most important step") | **gone** — gates check passing, not craftsmanship | **§3** drift skeptic panel in Reflect |
| Cross-feature **pattern detection** | gone | **§3 / §6** fold into drift + harvest |
| **Living-docs audit** (`docs/current/`) | gone | **§6** periodic audit hook |
| **Learning harvest & promotion** (categorize → CLAUDE.md / docs / principles / troubleshooting) | reduced to "append gotchas to lessons-learned" by the launcher | **§4** Harvest phase with the routing table |
| **Plan reassessment** each iteration (split/merge/reorder/inject) | only "scope can grow" on NEEDS_WORK | **§5** reassessment on PASS too |
| Narrative **project history** + per-iteration I&A report | one-line history entry; **no** `ia-cycles/` report | **§5 / §8** restore narrative + report artifact |
| **Engine-level** self-improvement | lessons hardcoded & frozen into the workflow prompts by hand | **§5** `engine-notes.md` feedback loop |
| Scope immutability (grow, never shrink) | **kept** ✅ (`devmeta-3/go.md:37`) | keep |
| Adversarial outside-in acceptance check | **kept & improved** ✅ | keep |

---

## 2. Testing — insistence + mechanics

This is the highest-priority theme and the one most clearly regressed. The current state:

- Plan assigns one `surgicalTest` **string** per feature, explicitly allowing `typecheck` as a substitute for "pure UI/schema" features (`workflow.js:183-185`).
- Build is told to "Run your surgical test … **until green if it resolves; note it if tooling is unavailable**" (`workflow.js:248-250`) — an explicit skip hatch devmeta forbade.
- The `unit` Gate (`workflow.js:309-314`) runs the project suite — which passes green even if the iteration added **zero** new tests.

Net: nothing **requires** a build agent to write tests, and nothing **checks** that it did. devmeta's emphatic, multi-layered insistence (`run.md:142,159`; `go.md:199,207`; per-task `--acceptance` in `plan-iteration.md:170-173`) has no equivalent.

### 2.1 Test authoring as a structural obligation

**Problem.** Test *writing* is neither mandated nor verified. The bar lives at the feature (coarse) not the behavior (fine).

**Target.** Every feature carries an explicit list of behaviors that must be tested; every build agent must return *evidence* of the tests it wrote; the schema makes returning that evidence non-optional.

**Concrete change — Plan (`MANIFEST_SCHEMA`, `workflow.js:64-79`).** Replace the single `surgicalTest: string` on each feature with:

```js
// per-feature, in MANIFEST_SCHEMA.properties.features.items.properties
testObligations: {
  type: "array",
  minItems: 1,                      // a feature with no testable behavior is a planning smell — justify it
  items: {
    type: "object",
    additionalProperties: false,
    required: ["behavior", "assertion", "kind"],
    properties: {
      behavior:  { type: "string" },  // "rejects an expired token"
      assertion: { type: "string" },  // "POST /x with expired jwt -> 401"
      kind:      { type: "string", enum: ["unit", "component", "integration", "migration", "e2e"] }
    }
  }
},
surgicalCmd: { type: "string" }      // the single fast command that runs THIS feature's tests
```

Update the Plan prompt (`workflow.js:163-187`) to derive `testObligations` from each feature's slice of the iteration's deliverables and **"Verify on screen"** — the same way it already lifts acceptance criteria. Add: *"Every feature MUST have at least one test obligation. typecheck is NOT a test — see §2.2 for how UI/schema features are tested. A feature you cannot name a single behavioral assertion for is mis-cut; split or merge it."*

**Concrete change — Build (`BUILD_SCHEMA`, `workflow.js:108-121`).** Add required test evidence:

```js
testsAdded: {
  type: "array",
  minItems: 1,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["file", "testName", "coversBehavior"],
    properties: {
      file:           { type: "string" },  // path to the test file the agent wrote
      testName:       { type: "string" },  // the test/describe block name
      coversBehavior: { type: "string" }   // which testObligation.behavior this satisfies
    }
  }
},
surgicalOutput: { type: "string" }         // tail of the passing test run (proof, not a claim)
```

Update the Build prompt (`workflow.js:228-251`) — replace "Run your surgical test … if it resolves; note it" with:

> For **each** test obligation assigned to your feature, **write** a test (`kind` tells you what sort) in your owned files, then run `surgicalCmd` until green. Return `testsAdded` mapping each test to the behavior it covers and paste the passing tail into `surgicalOutput`. You may **not** return an empty `testsAdded`, substitute typecheck for a test, or defer a test to "later" — devmeta's rule applies: *tests are your responsibility; write them, run them, fix them.* If the test genuinely cannot run in the worktree (missing service), still **write** it, mark it, and surface the blocker per §2.2 — do not silently skip.

**Enforcement.** `minItems: 1` on `testsAdded` means a build agent **cannot produce a valid structured return without test evidence**. That is the schema-level enforcement devmeta achieved with per-task `--acceptance`, reborn without `tk`.

**Acceptance.** Run a clean-room iteration; assert every `built[i].testsAdded` is non-empty and each entry's `coversBehavior` maps to a real `testObligation`. A feature shipping with no authored test is now structurally impossible.

### 2.2 Close the typecheck loophole

**Problem.** `workflow.js:184` lets whole feature classes degrade their "test" to `typecheck`. devmeta never allowed that.

**Target.** Each feature class has a *real* test modality; "no automated test possible" is a **surfaced human escalation**, never a silent pass.

**Concrete change.** In the Plan prompt, define the modality per `kind`:

- UI/presentational → **component/render/interaction test** (the project's component-test command, resolved from `.devmeta/devmeta.md > ## Testing`).
- Schema/migration → **round-trip or migration-apply test** (insert→read, or migrate-reset green with the new shape).
- Pure types/config → at minimum a **typed-contract test** (a test that imports and exercises the contract), not bare `typecheck`.

If the Plan agent believes a feature truly has no testable behavior, it must emit it as `testObligations: []` **with a `justification` field**, which `go` surfaces at the human gate rather than the workflow swallowing it. Add to `MANIFEST_SCHEMA`: `untestableJustification: { type: "string" }` (only permitted when `testObligations` is empty).

**Enforcement.** The empty-obligations path is the *only* way past §2.1's `minItems`, and it is routed to a human, matching devmeta's "set it up or ask — do NOT skip the test" (`go.md:199`).

### 2.3 A coverage gate that can actually fail

**Problem.** The `unit` gate runs the whole suite, which is green even with zero new tests — it verifies "didn't break existing tests," not "covered the new code."

**Target.** A gate that fails the iteration when new/changed source has no covering test.

**Concrete change — Gate (`gateDefs`, `workflow.js:309-314`).** Add a `coverage` gate agent (parallel with the others) that:

1. Computes the iteration diff: `git diff --name-only <BASE>...<HEAD>` filtered to source (non-test) files.
2. For each new/changed source file, confirms a corresponding test in `testsAdded` (from the build returns, passed into the gate) exercises it — and, where the project has a coverage tool, that the new lines are covered.
3. `pass=false` if any new source file has no covering test. Output lists the uncovered files.

If a per-line coverage tool isn't configured, fall back to the **file-correspondence** check (new `src/foo.ts` ⇒ expect a test referencing `foo`) — coarse but enough to catch "shipped feature, wrote no test." Note the limitation in the gate output (no silent caps — §6).

**Enforcement.** Failing the `coverage` gate enters the existing bounded fix loop (`workflow.js:339-365`); a fix agent must add the missing tests, not weaken the check.

**Acceptance.** Introduce a feature that ships source with no test → the coverage gate goes red → fix loop adds the test → green. Verify the gate cannot be satisfied by deleting the source or skipping the test.

### 2.4 Test-quality / anti-gaming review (adversarial)

**Problem.** Even mandated tests can be hollow — `it.skip(...)`, `expect(true).toBe(true)`, assertions so broad they never fail. devmeta's reflect Step 3 explicitly hunted "Test files that skip tests or have overly broad assertions" (`reflect.md:92`). devmeta-3 has nothing here.

**Target.** An independent skeptic refutes that each feature's tests actually exercise the claimed behavior.

**Concrete change — Reflect phase (`workflow.js:367-387`).** Add a parallel skeptic per feature (alongside the acceptance skeptics):

```
You are a TEST-QUALITY SKEPTIC in the devmeta-3 reflect phase. For feature "<name>",
its declared testObligations were: <...>. The agent claims testsAdded: <...>.
On branch <BASE>, READ those test files. REFUTE that the tests genuinely exercise the
behavior: look for skipped/only/todo tests, vacuous or tautological assertions, mocks
that stub out the very logic under test, assertions that would pass against a no-op
implementation. Cite test file:line and the asserted behavior. Set pass=true ONLY if
the tests would fail against a broken implementation. Return the structured verdict.
```

Reuse `VERDICT_SCHEMA` (add `severity`). Feed failures into the same NEEDS_WORK path as acceptance gaps.

**Enforcement.** Independent reader + refutation framing (default to disbelief), exactly the pattern devmeta-3 already trusts for acceptance. A hollow test now blocks PASS.

**Acceptance.** Plant a `expect(true).toBe(true)` test for a real obligation → the skeptic returns `pass=false` citing the line.

### 2.5 The testing information architecture (where test info is found)

devmeta had **two** mechanics; devmeta-3 kept one.

- **Static lookup (KEPT, keep it).** `.devmeta/devmeta.md > ## Testing` is read by `go` Phase 1 and resolved into the gate slots; the fallback to `package.json` is intact. This is the canonical "how do you run tests in this repo." Preserve the `## Testing` / `## Environment` / `## Additional Rules` contract from `devmeta/README.md:100-108`.
- **Per-feature test strategy (DOWNGRADED → restore durability).** It now lives only as the ephemeral `surgicalTest` string in the journal. Write the iteration's `testObligations` + `testsAdded` into the durable per-iteration report (§8, `ia-cycles/iteration-<N>.md`) so the next planner can see what was tested and how.
- **Recurring-failure home + router (GONE → restore).** devmeta filed recurring test failures in `docs/current/troubleshooting.md` and *routed* them there via reflect's categorization table (`reflect.md:64,145`). devmeta-3 has neither. Restore both — see §4 (the router) and §8 (the home, `.devmeta/testing-notes.md` or `docs/current/troubleshooting.md`). **This is the regression your testing question and your self-learning question share:** the first time a failure mode recurs in devmeta-3, there is no place it was recorded and no place an agent is told to look.

---

## 3. Inside-out code quality — the dropped "most important step"

**Problem.** devmeta-3's Reflect is purely **outside-in** (does the code meet the acceptance criteria?). The gates check typecheck/lint/test-pass. **Nothing reads the merged code asking "is this idiomatic, drift-free, maintainable?"** devmeta's reflect Step 3 — its self-described "most important step" (`reflect.md:68`) — is absent. Green types + passing tests ≠ clean code.

**Target.** A drift-review panel in the Reflect phase that reads the merged diff against an explicit checklist and surfaces craftsmanship problems.

**Concrete change — Reflect phase.** Add a parallel **drift skeptic** (or a small panel split by area: error-handling, dependencies, duplication, defensive-coding). Each reads `git diff <BASE>...<HEAD>` for the iteration and returns:

```js
const DRIFT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: { type: "array", items: {
      type: "object", additionalProperties: false,
      required: ["file", "kind", "severity", "why", "fix"],
      properties: {
        file:     { type: "string" },
        kind:     { type: "string" },   // from the checklist below
        severity: { type: "string", enum: ["minor", "major", "blocker"] },
        why:      { type: "string" },
        fix:      { type: "string" }
      }
    }}
  }
};
```

**The checklist (ported verbatim from `devmeta/reflect.md:82-92`** — keep it in the prompt so the engine is self-contained):

- Deeply nested try/catch or error suppression
- Monkey-patching / runtime behavior modification
- Copy-pasted blocks with slight variations
- Config flags that exist only to work around bugs
- `// TODO`, `// HACK`, `// FIXME`, `// workaround` comments
- Wrapper functions that exist only to paper over another layer
- Patterns that don't match the rest of the codebase
- Excessive defensive coding (redundant null checks/validation)
- Dependencies added for a problem that shouldn't need one
- Test files that skip tests or assert too broadly (overlaps §2.4)

**Wiring the outcome.**
- `severity: "blocker"` or `"major"` → contributes to **NEEDS_WORK** (human gate), same as an acceptance gap.
- `severity: "minor"` → recorded as a **cleanup deliverable** on the next iteration in `_overview.md` (scope-can-grow, never shrink — `go.md:37`). This is devmeta's "create cleanup tasks for next iteration" (`reflect.md:99`) without `tk`.

**Acceptance.** Merge a feature with a `// HACK` workaround flag and a nested error-suppression → the drift panel flags both with `fix` suggestions; a minor one lands as a next-iteration cleanup deliverable.

---

## 4. The running upgrade of knowledge (the self-learning flywheel)

**Problem.** devmeta's thesis (`reflect.md:26`): *"Iteration N+1 should be easier than N because the project accumulated knowledge about itself."* devmeta-3 kept the **consumption** side (Plan/Build read `lessons-learned.md`, `devmeta.md`, `CLAUDE.md`) but **gutted the production side** — `go` only appends gotchas to `lessons-learned.md` (`go.md:36`). There is no categorization, no promotion to `CLAUDE.md` / `docs/current/` / `principles-and-choices.md` / `troubleshooting.md`, and the substrate devmeta harvested from (`context-log.md`, `tk notes`) no longer exists. The flywheel has fuel injection but no refinery.

**Target.** A dedicated **Harvest** step that gathers what was learned this iteration from the workflow's structured returns and **routes each learning to the correct durable home** — so the next iteration's agents read it.

### 4.1 Provide the substrate (without resurrecting context-logs)

Add a `learnings[]` field to the agent returns that produce knowledge — **this is the structured replacement for `context-log.md`, keeping one control plane (Principle 4):**

- `BUILD_SCHEMA.learnings[]` — `{ insight, scope: "project" | "engine", suggestedHome }`
- `INTEGRATE_SCHEMA.learnings[]` — same (wiring gotchas, migration-diff drops, etc.)
- the fix-loop agent (`workflow.js:349-362`) returns `learnings[]` too (what the failure taught).

### 4.2 The Harvest phase (new) and its router

Add **Phase 6 — Harvest** to `drive-iteration.workflow.js`, run on the PASS path (or always, recording NEEDS_WORK learnings too). One agent receives the full structured result (build/integrate/fix `learnings[]`, gate outputs, drift findings, reflect verdicts) and **routes each item** using devmeta's categorization table — ported from `devmeta/reflect.md:59-66`:

| Category | Home | Criterion |
|---|---|---|
| How agents should write code | `CLAUDE.md` (Critical Rules) | Would prevent a mistake if seen at session start |
| How the codebase works | `docs/current/<file>` | Permanent architectural knowledge |
| A decision proven wrong / nuanced | `docs/current/principles-and-choices.md` (stamp `Updated YYYY-MM-DD:`) | A principle needs change |
| Recurring build/**test** issue | `docs/current/troubleshooting.md` **or** `.devmeta/testing-notes.md` | Hit by ≥2 features or iterations |
| One-off solution | `.devmeta/lessons-learned.md` | Useful, not worth promoting higher |
| Outdated/wrong doc | fix or delete the doc | Doc contradicts what we learned |

The Harvest agent **writes** these promotions (it has Edit/Write), then returns a structured summary of what it filed where. `go` commits the doc edits on the base branch with `--no-verify` (as it already does for metadata, `go.md:36`).

> **Date handling.** The workflow substrate forbids `Date.now()`/`new Date()`. Pass the current date into the inlined `input` (e.g. `today: "YYYY-MM-DD"`) so Harvest can stamp `principles-and-choices.md` updates. Update `go.md` Phase 2 and the INLINE POINT contract accordingly.

### 4.3 Close the loop (the "easier next time" guarantee)

Harvest writes to exactly the homes Plan and Build already read at the *start* of the next iteration (`workflow.js:170-173, 247`). Make this explicit in the Plan prompt: *"Before partitioning, read `troubleshooting.md` / `testing-notes.md` / `principles-and-choices.md` for known failure modes in this area and pre-empt them in the feature scopes and test obligations."* That sentence is what turns a pile of notes into compounding improvement.

**Acceptance.** Run two iterations where iteration 1 hits a non-obvious failure (e.g. the migration-diff dropping `security_invoker`). Assert: (a) Harvest filed it under a recurring/troubleshooting home, (b) iteration 2's Plan/Build prompts surfaced it, (c) iteration 2 did not repeat it. That is the flywheel, demonstrated.

---

## 5. Self-improvement — within an increment and beyond

Three nested scopes. devmeta-3 only weakly does the first.

### 5.1 Within an increment (iteration → iteration): plan reassessment on PASS

**Problem.** devmeta reassessed the *remaining* plan after every iteration — split/merge/reorder/inject iterations as reality diverged from the spec (`reflect.md:237-247`). devmeta-3 only grows scope on **NEEDS_WORK** (`go.md:37`); on PASS it advances blindly to the next pre-written iteration.

**Target.** After each PASS, a lightweight reassessment of the remaining `_overview.md` iterations against what was just learned.

**Concrete change.** Add to the Harvest phase (or as a `go` Phase 5.4) a reassessment agent that reads the remaining Iteration Map rows and the harvest output and proposes edits to `_overview.md`:

- Is a remaining iteration now partly done (drift cleanup absorbed it)?
- Did this iteration reveal a missing prerequisite → inject an iteration?
- Should two remaining iterations merge (a dependency wall dissolved) or one split (it grew)?

It **proposes**; the human gate (default ON, `go.md:39`) approves. On `go auto`, apply low-risk reorders/injections and log them. Record changes in `project-history.md`. **Scope still only grows or reshapes — never shrinks (only the human cuts).**

### 5.2 Beyond an increment (increment → increment): narrative history + retrospective

**Problem.** devmeta wrote a **narrative** project-history entry per iteration (struggles, surprises, what the framework got right/wrong — `reflect.md:224-235`) and a per-iteration I&A report artifact (`reflect.md:298`). devmeta-3 writes a one-line history entry and **no** `ia-cycles/` report.

**Target.** Restore both as durable cross-increment memory.

**Concrete change.**
- Harvest writes a **narrative** paragraph to `.devmeta/project-history.md` (not just "what shipped, head sha") — where the agents struggled, where they exceeded expectations, surprising failures.
- Harvest writes the per-iteration report to **`<incrementDir>/ia-cycles/iteration-<N>.md`** (restore the artifact devmeta produced at `reflect.md:298`), containing: gate results, drift findings, gaps verified, tests authored, learnings routed, plan changes. `devmeta-3:status` should surface it.
- At **increment close** (`go.md:42-43`, Phase 6), write a short **retrospective**: did iteration N+1 actually get easier than N? Which knowledge homes paid off?

### 5.3 Beyond the project (engine → engine): the frozen-lessons problem

**Problem — and this is subtle.** devmeta-3's workflow prompts already **hardcode** several hard-won engine lessons: re-add `security_invoker`/grants after migration-diff (`workflow.js:294`), `git merge <BASE>` first in the worktree (`workflow.js:234`), `--no-verify` + restore hook-regenerated files (`workflow.js:250`), the cosmetic 404 / Prettier-CRLF carve-outs in the gate (`workflow.js:324`). That is real engine self-improvement — but it is **manual, frozen, and project-specific**, baked into a generic engine. There is no mechanism by which a *new* recurring engine failure becomes a prompt fix; a human noticed these and edited the script.

**Target.** A feedback channel for **engine-level** learnings (distinct from project-level ones).

**Concrete change.**
- The `learnings[].scope: "engine"` tag (from §4.1) routes those items to a new **`.devmeta/engine-notes.md`** — "things that should change the *workflow*, not the project docs."
- Periodically (a human cadence, or at increment close), these are reviewed and folded into `drive-iteration.workflow.js`'s prompts. Document this loop in `SPEC.md` so the frozen-lessons are understood as *harvested*, not magic.
- **Guard against project-specific bleed:** flag engine-notes that are actually project-specific (the 404 carve-out is *this* project's CLI) so the generic engine doesn't accrete one project's quirks. Generic carve-outs belong in the engine; specific ones belong in that project's `.devmeta/devmeta.md > ## Additional Rules` and should be *read* by the gate, not hardcoded.

---

## 6. Other missing mechanics (sweep-up)

- **Cross-feature pattern detection** (`reflect.md:140-148`). Fold into the drift panel + Harvest: when the same `kind` of finding appears in ≥2 features, escalate it from per-feature cleanup to a `CLAUDE.md` critical rule (it is systemic, not local).
- **Living-documentation audit** (`reflect.md:150-164`). devmeta-3 consumes `docs/current/` but never maintains it. Add a **periodic** (not every-iteration — that is wasteful) audit: every Kth iteration or at increment close, an agent asks "would a fresh agent understand the codebase from `docs/current/` alone?" and fills gaps. Cheaper than devmeta's per-iteration audit, preserves the intent.
- **"Testing delivered" is authored but never enforced.** `start-increment-spec.md:29` adds a `### Testing delivered` section to `_overview.md`, but only "Verify on screen" is lifted into `acceptanceCriteria`. Either lift "Testing delivered" into the Plan's `testObligations` derivation (§2.1) or have the increment-close retrospective verify it was delivered. Don't let it be aspirational text.
- **Integrate is a single agent** doing merge+wire+migration (already in `SPEC.md` Known limits). This is *mechanics*, not content quality — lower priority — but note that a wiring error here is exactly the kind of thing the drift panel (§3) should catch.
- **No-silent-caps discipline.** Where the coverage gate (§2.3) falls back to coarse file-correspondence, or the docs audit runs only every Kth iteration, `log()` the limitation so "green" never overstates coverage.

---

## 7. The upgraded phase contract

The revised `drive-iteration.workflow.js` shape (additions in **bold**):

| Phase | Substrate | Output |
|---|---|---|
| Plan | 1 agent (schema) | manifest + **`testObligations[]` per feature** + `integrationPoints[]` + `acceptanceCriteria[]` |
| Build | `parallel` per wave, worktrees | per-feature branch + **`testsAdded[]` evidence + `surgicalOutput`** + **`learnings[]`** |
| Integrate | 1 agent | merge + execute contract + migration + **`learnings[]`** |
| Gate | `parallel` gates + bounded fix | typecheck/unit/lint/migrate **+ coverage** green; fix agent returns **`learnings[]`** |
| Reflect | `parallel` skeptics | acceptance verdicts **+ test-quality verdicts (§2.4) + drift findings (§3)** |
| **Harvest** | **1 agent (Write)** | **route learnings to typed homes; narrative history; `ia-cycles/iteration-N.md`; plan-reassessment proposals** |

`go` (`devmeta-3/go.md`) changes: pass `today` into `input`; on PASS, consume the Harvest result, commit the doc promotions, apply/se­ek-approval for plan-reassessment edits, then advance. The thin-launcher property is preserved — Harvest does the writing, `go` only commits + advances.

---

## 8. New / changed durable artifacts (the "homes")

| File | Status | Role | Reader |
|---|---|---|---|
| `.devmeta/devmeta.md > ## Testing` | kept | how to run tests (static lookup) | `go` Phase 1, Plan, Build |
| `.devmeta/lessons-learned.md` | kept | one-off gotchas | Plan, Build |
| `docs/current/troubleshooting.md` **or** `.devmeta/testing-notes.md` | **restore** | recurring build/**test** failures + fixes | Plan (pre-empt), Build |
| `docs/current/principles-and-choices.md` | **restore as promotion target** | changed/ nuanced decisions (dated) | Plan, Build |
| `docs/current/*` + `_overview.md`-style index | **restore audit** | architecture knowledge | Plan, Build |
| `CLAUDE.md` (Critical Rules) | **restore as promotion target** | systemic "write code this way" rules | every agent at session start |
| `.devmeta/project-history.md` | **upgrade to narrative** | cross-increment story | humans, status |
| `<incrementDir>/ia-cycles/iteration-<N>.md` | **restore artifact** | per-iteration I&A record | `status`, next planner |
| `.devmeta/engine-notes.md` | **new** | engine-level lessons → fold into workflow | human / SPEC maintainer |

All are git-tracked markdown — the *artifacts* plane. **No new ledger; no `tk`; one control plane preserved.**

---

## 9. Prioritization

**P0 — testing (your stated top concern; closes the clearest regression).**
- §2.1 `testObligations[]` + `testsAdded[]` schema obligations *(schema + prompt change)*
- §2.2 close the typecheck loophole *(prompt change)*
- §2.3 coverage gate that can fail *(new gate agent)*
- §2.4 adversarial test-quality skeptic *(new reflect skeptic)*

**P1 — code quality + the flywheel (restores the dropped "most important step" and the running knowledge upgrade).**
- §3 drift skeptic panel + checklist *(new reflect agent + DRIFT_SCHEMA)*
- §4 `learnings[]` substrate + Harvest phase + routing table *(schema + new phase + go consume)*
- §2.5 recurring-failure home + router *(falls out of §4)*

**P2 — self-improvement breadth (compounding, lower urgency).**
- §5.1 plan reassessment on PASS
- §5.2 narrative history + `ia-cycles/` report + increment retrospective
- §5.3 `engine-notes.md` feedback loop
- §6 pattern detection, periodic docs audit, "Testing delivered" enforcement

Each P0 item is a localized change to `drive-iteration.workflow.js` (a schema field or one `agent()` slot) — high value, low blast radius. P1's Harvest phase is the one genuinely new piece of machinery; everything else is additions to existing phases.

---

## 10. Acceptance — has devmeta-3 reached devmeta's bar?

The engine matches devmeta on content quality when **all** hold:

- [ ] **No feature ships without an authored, behavior-mapped test** — `testsAdded[]` non-empty for every built feature; typecheck is never a substitute; "untestable" is a surfaced human decision, not a silent pass. *(devmeta: `run.md:159`, `go.md:199`)*
- [ ] **The test bar can fail** — the coverage gate goes red on new source with no covering test, and a hollow/skipped test is caught by the test-quality skeptic. *(devmeta: per-task `--acceptance`, `reflect.md:92`)*
- [ ] **Merged code gets an inside-out drift review** against the ported checklist; majors block, minors become next-iteration cleanup. *(devmeta: `reflect.md:68-109`)*
- [ ] **Recurring test/build failures have a durable home and a router** — the second occurrence of a failure mode lands in `troubleshooting.md`/`testing-notes.md` and the next planner reads it. *(devmeta: `reflect.md:64,145`)*
- [ ] **Each iteration's learnings are categorized and promoted** to typed homes (`CLAUDE.md` / `docs/current/` / `principles-and-choices.md` / troubleshooting / lessons-learned), not dumped in one file. *(devmeta: `reflect.md:55-66`)*
- [ ] **The remaining plan is reassessed each iteration** (split/merge/reorder/inject), human-gated; scope grows or reshapes, never shrinks. *(devmeta: `reflect.md:237-247`)*
- [ ] **Cross-increment memory persists** — narrative `project-history.md`, per-iteration `ia-cycles/` reports, increment-close retrospective. *(devmeta: `reflect.md:224-235,298`)*
- [ ] **Engine lessons have a harvested channel** (`engine-notes.md`), not just hand-frozen prompt edits.
- [ ] **Meta-acceptance:** in a 2+ iteration increment, iteration N+1 demonstrably re-uses knowledge harvested in N and does not repeat N's non-obvious failures. *That* is "self-learning," and it is the property devmeta-3 most needs to win back.

**Preserve throughout (devmeta-3's wins — do not regress):** enforce-in-code over prose, adversarial/independent verification, the integration contract, one control plane (journal + `_overview` + git + `.devmeta/` docs; no `tk`), scope-grows-never-shrinks, and the human gate at iteration boundaries.
