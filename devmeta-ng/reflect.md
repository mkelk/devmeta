---
description: I&A Cycle (global) — adversarial acceptance verification + memory promotion at an iteration boundary
argument-hint: [iteration-number] [workflow]
---

## Project Context

Read `.devmeta/devmeta.md` from the project root if it exists. It provides
project-specific test commands, environment checks, an `## Effort` table, and
additional rules.

If no `.devmeta/devmeta.md` exists:
- Testing: look for `package.json` test scripts
- Environment: skip checks
- Effort: default tier `high`, mechanical steps `medium`
- Additional rules: none

**tk mapping (shared, unchanged):** `tk -t epic` = a Feature (or an iteration);
`tk -t task` = a Task. The reflect/I&A iteration is written **`NN.1R`** (e.g.
`76.1R` is the I&A iteration paired with build iteration `76.1`). The cross-increment
`tk` ledger and the increment numbering (`increment-NN-XXX`, iterations `NN.1` /
`NN.1R`) are the shared substrate — read and write them exactly as the build phases do.

---

## Context

- Today's date: !`date +%Y-%m-%d`
- Target iteration: $ARGUMENTS
- Completed features: !`tk list --type epic --status closed 2>/dev/null | head -20 || echo "None"`

## Purpose

The project is a self-learning system. This command runs at iteration boundaries
to do two jobs and keep them cleanly separated:

1. **Adversarially verify acceptance** — prove (or refute) that the iteration's
   scope was actually delivered, judged against the iteration's **"Verify on screen"**
   criteria, run on a pinned merged ref. *This is the definition of correct for this
   iteration. devmeta owns the criteria; the verifier only attacks them.*
2. **Promote everything learned** to the permanent memory docs so iteration N+1 is
   easier than iteration N.

These are different layers and must not be conflated. Acceptance verification is a
read-only adversarial fan-out (skeptics + one principles lens) that **returns findings
and changes nothing**. Memory promotion, the gap fixes, the docs audit, ledger hygiene,
and plan reassessment all happen **here, in this command's own loop, AFTER** the
verification returns — because they write the filesystem and `tk`, which the verification
substrate is forbidden to do.

**What is gone (do not reintroduce it).** The old generic "code-quality drift" checklist
— hunt for nested try/catch, TODO/HACK/FIXME comments, copy-paste, monkey-patching,
excessive defensive coding — is **deleted**. A modern model self-flags those far better
than a hand-maintained smell list, and a single generic critic already runs per-feature
during the build. The only quality lens that survives here is the **consistency-vs-principles**
lens, because it encodes *this project's* `docs/current/principles-and-choices.md` — which
is yours, not generic. Do not run a generic correctness or drift sweep in this command.

## Execution substrate (hybrid)

The acceptance verification can run two ways. The *criteria, the verdict, and all
memory writes are identical on both paths* — only who fans out the skeptics differs,
which keeps the two engines comparable.

- **Opt-in → the reflect workflow.** If the invocation arguments contain the **`workflow`**
  keyword (e.g. `/devmeta-ng:reflect 76 workflow`), or an **`ultracode`** opt-in is active
  for this session, launch `workflows/reflect-iteration.workflow.js` (meta name
  `devmeta-ng-reflect-iteration`). It runs the adversarial skeptic fan-out plus the single
  principles lens and returns converged findings. Workflows require explicit per-run opt-in,
  so the *absence* of the signal is itself the fallback trigger — never launch a workflow silently.
- **Fallback → inline fan-out.** Otherwise, run the same adversarial verification inline
  (Step 4b): spawn the skeptics and the one lens yourself as parallel read-only sub-agents,
  converge with the same rules, and produce the same findings shape.

Either way, devmeta gathers the inputs (scope items, criteria, the pinned ref, principles
text) **before** launching, passes them in verbatim, consumes the returned findings, and
then does everything in Steps 5–14 itself.

## Effort

This command reads the `## Effort` table from `.devmeta/devmeta.md` and sets the dial
per phase on the ladder **`low / medium / high / xhigh / max`**:

| Phase | Tier | Why |
|-------|------|-----|
| Gather learnings, read scope, assemble inputs (Steps 1–3) | **low** | Mechanical reads of `tk`, context-logs, and a few files. |
| **Acceptance verification fan-out (Step 4)** | **xhigh** | Adversarial skeptics must try *hard* to break the build; cheap skeptics rubber-stamp false victories. `max` on a release/finalize iteration. |
| Fix gaps now (Step 5) | **high** | Fixing a missed scope item is real code work, not cleanup; it inherits the build tier. |
| Memory promotion, docs audit, plan reassessment (Steps 7–13) | **high** | The L2 moat investment — the highest-leverage thinking after the cut. |
| Status write, tag, prune, report (Steps 8, 11, 14) | **medium** | Pure mechanics (doc append, `git tag`, `tk delete`). |

Missing `## Effort` section ⇒ `high` default, mechanical steps `medium`. The acceptance
fan-out is the one place to spend the most: it is where false victory is caught.

---

## Your Task

### Step 1: Gather All Learnings (effort: low)

Read every source of learnings from this iteration:

1. **Implementation notes** from all features in this iteration:
   Read each `context-log.md` thoroughly.

2. **Feature notes** (tk note entries):
   ```bash
   tk list --type epic --status closed --json
   # For each: tk notes <epic-id>
   ```

3. **Task notes** (especially for tasks that were blocked or difficult):
   ```bash
   # For each feature: tk list --parent <epic-id> --json
   # For tasks with notes: tk notes <task-id>
   ```

4. **Current lessons-learned.md**:
   Read `.devmeta/lessons-learned.md`

5. **Current troubleshooting.md** (if exists):
   Read `docs/current/troubleshooting.md`

### Step 2: Categorize Learnings (effort: low)

Sort every learning into one of these categories. (Hold the routing for now —
you apply it in Step 7, *after* the acceptance findings come back, so skeptic-found
issues are categorized alongside the rest.)

| Category | Goes to | Criteria |
|----------|---------|----------|
| **How agents should write code** | CLAUDE.md (Critical Rules section) | Would prevent a mistake if seen at session start |
| **How the codebase works** | docs/current/ (appropriate file) | Permanent architectural knowledge |
| **Wrong or updated decision** | docs/current/principles-and-choices.md | A principle was proven wrong or needs nuance |
| **Recurring build/test issue** | docs/current/troubleshooting.md | Same problem hit by multiple features or iterations |
| **One-off solution** | `.devmeta/lessons-learned.md` | Useful but not worth promoting higher |
| **Outdated or wrong doc** | Fix or delete the doc | Doc contradicts what we learned |

### Step 3: Assemble the Acceptance Inputs — devmeta OWNS the criteria (effort: low)

**This is the L5 ownership boundary. The verifier never reads scope from disk and never
invents an acceptance bar. You gather the inputs here and pass them in verbatim. If a
criterion isn't in the inputs, it isn't tested.**

Assemble, in this command's own session:

1. **`scopeItems`** — the iteration's scope items. Read them from the current increment's
   `_overview.md` (resolve the increment via `.devmeta/current-increment.md`) and/or the
   iteration tick description. One `{ id, title, description }` per scope item.
2. **`acceptanceCriteria`** — for each scope item, its **"Verify on screen"** lines: the
   exact runnable command + expected output/exit signal, or a named manual observation when
   no command can express it. These come straight from the iteration's scope; do **not**
   author or soften them here. The human is the only party who may weaken a criterion.
3. **`verifyRef`** — the **pinned merged ref** to verify: the base-branch HEAD *after* this
   iteration's features were merged (the build/integrate phase produced it). Capture the
   exact sha so every skeptic verifies the same code:
   ```bash
   git rev-parse HEAD            # on the base branch, post-merge
   ```
   Pass this sha as `verifyRef`. The verifier checks out / inspects exactly this ref.
4. **`changedFiles`** — the files this iteration touched, gathered here via git (the
   verifier does not run git to discover scope):
   ```bash
   git log --name-only <iteration-start>..<verifyRef> --pretty=format: | sort -u
   ```
5. **`principlesText`** — the contents of `docs/current/principles-and-choices.md` (for the
   single consistency lens). Read it here; pass the text in.
6. **`runStamp`** — the current ISO timestamp (the workflow has no clock; you pass time in).

**Guardrails (enforce here, before launching):**
- **No scope items at all → STOP with a blocked result.** A verification that checks nothing
  must never look like "all closed." Do not proceed to a clean pass; report the iteration as
  blocked and surface why (missing scope).
- **A scope item with no "Verify on screen" criteria → it is `not-closed` and routed to a
  HUMAN criteria-authoring step, OUTSIDE the code-fix loop.** You cannot fix code to satisfy
  a bar that doesn't exist, and you must never write the bar yourself. Flag it for the human
  in the report (Step 14) and do **not** route it into Step 5's fix loop. (The verifier returns
  the same verdict for any item whose criteria array is empty — they agree.)

### Step 4: Adversarial Acceptance Verification (effort: xhigh)

Run the acceptance verification over the inputs from Step 3. The contract returned, on
**both** paths, is per scope item: a `verdict ∈ {closed, partial, not-closed}` plus
`evidence` and a `suggestedFix`, and a `skepticBreakdown`. The verifier (and you, on the
fallback) is **read-only** — it inspects and reports against `verifyRef`; it never edits,
commits, or modifies tracked state. Fixing is your job in Step 5.

#### Step 4a — Workflow path (opted in)

Launch `workflows/reflect-iteration.workflow.js` with:

```jsonc
{
  "iteration":      "76.1",  // execution iteration whose output is verified (NOT the I&A tick id 76.1R)
  "verifyRef":      "<pinned merged sha from Step 3.3>",
  "runStamp":       "<ISO timestamp>",
  "changedFiles":   ["src/foo.ts", "..."],
  "principlesText": "<contents of principles-and-choices.md>",
  "scopeItems":     [ { "id": "...", "title": "...", "description": "..." } ],
  "acceptanceCriteria": { "<scopeItemId>": ["node dist/cli.js export --format pdf → writes report.pdf, exit 0"] }
}
```

The workflow runs **only two domain-anchored checks** (nothing generic):

1. **Adversarial acceptance fan-out** — N skeptics per scope item, each told to *refute*
   delivery against that item's supplied "Verify on screen" criteria. The N skeptics get
   **distinct angles**, not identical prompts — e.g. (a) happy-path delivery, (b) edge/error
   path, (c) does-the-artifact-actually-exist-and-run — because identical adversaries correlate
   and miss the same gap. Each skeptic actually runs the criteria commands against `verifyRef`,
   reads real output, and resolves uncertainty to `not-closed` (charity is not allowed). Verdict
   per item is **majority**, **ties break to `not-closed`**, a **crashed skeptic counts as a
   pessimistic non-vote**, and an item with **no criteria short-circuits to `not-closed`**.
2. **One consistency-vs-principles lens** — a single lens fed `principlesText` that flags code
   in `changedFiles` which violates or quietly contradicts this project's documented principles.
   (There is no separate generic correctness or drift lens — those were absorbed.)

It returns `{ iteration, runStamp, acceptanceFindings:[{item, title, verdict, evidence,
suggestedFix, skepticBreakdown}], lensFindings:{consistency:[{file, issue, severity, suggestedFix}]} }`
and writes nothing. Read that value and go to Step 5.

> **Read-only + serial ports:** the skeptics are read-only, so they need **no** worktree
> isolation (worktrees isolate writes and reads-of-uncommitted, not ports). Any "Verify on
> screen" command that starts a server or binds a port must be run **serially** to avoid
> port collisions — note this in the criteria if relevant.

#### Step 4b — Inline fallback path (not opted in)

Do the identical verification yourself, in this session:

1. For each scope item, spawn **N skeptics (default 3) with distinct angles** (happy-path /
   edge-error / artifact-exists-and-runs) as parallel **read-only** sub-agents. Pass each the
   item, its criteria, `changedFiles`, and the pinned `verifyRef`. Each skeptic:
   - actually **runs** the "Verify on screen" commands against `verifyRef` and reads the real
     output — *don't trust that a tick was closed; trust the screen*;
   - reads the implementing code for both the happy path and edge cases;
   - defaults to **not delivered**; returns `verdict` / `evidence` / `suggestedFix`;
   - **does not edit, commit, or modify state**, and runs any server/port command serially.
2. Converge per item: **majority** verdict; **ties break to `not-closed`**; a skeptic that
   crashes counts as pessimistic; an item with no criteria is `not-closed`.
3. Run the **one consistency-vs-principles lens** over `changedFiles` against `principlesText`.
   No generic correctness/drift sweep.

Produce the same `{acceptanceFindings, lensFindings:{consistency}}` shape and go to Step 5.

### Step 5: Fix Gaps Now — scope is immutable (effort: high)

Apply devmeta's law to the returned `acceptanceFindings`, unchanged:

> **Fix gaps now, never defer, scope is immutable.**

- **`closed`** → record in the I&A report (Step 14), move on.
- **`partial` / `not-closed`** (and the item *has* criteria) → **do the fix in this same
  `reflect` invocation.** Do not file a "next iteration" task, do not relabel as post-MVP,
  do not shrink scope. The skeptics' `suggestedFix` seeds the fix. After fixing, **re-run the
  acceptance check on that touched item** (re-launch Step 4 scoped to it, or re-spawn its
  skeptics inline) until it reads `closed`. The iteration takes as long as it takes.
- **`not-closed` due to *no criteria*** → this is **not** a code fix. Route it to the human
  criteria-authoring step (Step 14) and leave it OUT of this fix loop. You cannot satisfy a
  bar that doesn't exist, and you must never author the bar yourself.

For the `lensFindings.consistency` results: each **harmful** finding (real maintenance burden
or fragility, not a cosmetic nit) becomes an **in-iteration cleanup you do now**, sourced from
the lens rather than a generic critic. Trivial nits can be noted and skipped.

**Scope is immutable.** If verification finds a scope item was not delivered, you do NOT have
the option of moving it to a future iteration or labeling it "post-MVP." You fix it. The only
person who can reduce scope is the human.

### Step 6: Check for Pattern Problems (effort: high)

Look for patterns across the iteration (this is domain judgment over the gathered learnings +
the converged findings, not a generic critique):

- **Same mistake in multiple features?** → Systemic issue. Needs a code-level fix or a CLAUDE.md warning.
- **Same test failure pattern?** → Testing infrastructure issue. Update troubleshooting.md.
- **Workers consistently confused about X?** → Documentation gap. Fill it in docs/current/.
- **A principle was violated repeatedly?** → Either the principle is wrong or it's not visible enough.
- **Workarounds accumulated?** → Code quality drift surfaced by the consistency lens. Fix it now.

### Step 7: Apply Updates — promote findings + learnings to memory (effort: high)

This is the L2 memory investment, and it happens **here, after the verification returned** —
it writes the filesystem, which the verification substrate cannot. Promote, using the Step 2
categorization table as the routing rule, **both** the learnings gathered in Step 1 **and** the
findings returned by the verification (skeptic evidence + consistency-lens issues).

For each item that needs promotion:

1. Read the target file.
2. Add the learning in the appropriate section, with provenance:
   `Updated YYYY-MM-DD (iter NN.1R): <what changed and why>` — use `runStamp` for the date so
   even verification-sourced findings carry a real timestamp.
3. Keep it concise — agents need signal, not prose.

**For CLAUDE.md:** Only add critical rules that prevent real mistakes. Keep it under 200 lines total.

**For principles-and-choices.md:** Update with `Updated YYYY-MM-DD: <what changed and why>`.

**For `.devmeta/lessons-learned.md`:** Add under the appropriate category header.

**For troubleshooting.md:** Format as Problem → Cause → Fix.

> Net effect: a gap a skeptic found in iteration N is *guaranteed* a routing decision
> (promote-and-where, or discard) instead of dying in a context-log nobody re-reads. That is
> the L2 investment — closing the leak between "what we learned" and "what the next session sees."

### Step 8: Update Iteration Status (effort: medium)

Update the current increment's `iterations/iteration-<N>/status.md`:

```markdown
**Completed:** YYYY-MM-DD
**Status:** Complete

## Summary
<2-3 sentences on what was delivered>

## Key Learnings
- <Learning 1>
- <Learning 2>

## Changes to Project Docs
- Updated CLAUDE.md: <what>
- Updated principles-and-choices.md: <what>
- Added to lessons-learned.md: <what>
```

### Step 9: Living Documentation Audit (docs/current/) (effort: high)

Before finalizing, step back and assess `docs/current/` as a whole.

1. **Read `docs/current/_overview.md`** — does it accurately list what's here?
2. **For each file in `docs/current/`**, ask:
   - **Is it still accurate?** Does it reflect what was actually built?
   - **Is it complete enough?** Are there topics that should be covered but aren't?
   - **Is it too verbose?** Cut anything that doesn't help the next agent.
3. **Organization check:**
   - Should any file be split or merged?
   - Are there files that should exist but don't?
   - Is `_overview.md` still the right routing guide?
4. **Gap analysis:** Would a fresh agent starting a new session understand the codebase from docs alone?
5. **Fix what you find.** Don't just list gaps — fill them.

### Step 10: Update Project History (effort: high)

Append an entry to `.devmeta/project-history.md` covering this iteration:

- What was built and how long it took
- Where the agent struggled or needed human help
- Where the agent exceeded expectations
- What the meta-framework got right and wrong
- Surprising discoveries or failures (including anything the skeptics caught that the build missed)
- How the self-learning system performed

Write in narrative form, not bullet points.

### Step 11: Tag and Prune (effort: medium)

**Tag the iteration in Git.** Include the increment suffix so parallel branches with the same
iteration number don't collide on the tag:

```bash
git tag iteration-<NN>-<XXX>.<M> -m "Iteration <N> complete: <summary>"
```

Example: for iteration 76.1 of increment 76-abc, the tag is `iteration-76-abc.1`. Read the
active increment's suffixed identifier from `.devmeta/current-increment.md`.

**Prune completed ticks:**
```bash
tk list --type epic --status closed --json
tk delete <epic-id>
```

Verify cleanup:
```bash
tk list  # Should show only open/in-progress items
```

### Step 12: Reassess and Restructure the Iteration Plan (effort: high)

1. Read the current increment's `_overview.md`.
2. For each remaining iteration, ask:
   - **Is the scope still right?**
   - **Is the order still right?**
   - **Is a new iteration needed?** (Including a remediation iteration if verification revealed
     a gap that grows scope — scope can grow, never shrink.)
   - **Should iterations be split or merged?**
3. **If changes are needed, make them directly** in `_overview.md`. Note the rationale inline.
4. **Update the tick structure to match.**
5. Record significant plan changes in `.devmeta/project-history.md`.

### Step 13: Close the I&A Iteration and Advance (effort: low)

This is the ledger consequence of the I&A cycle. devmeta — not the verifier — owns it.

- Close the I&A iteration `NN.1R` in `tk`.
- **All scope items `closed` and scope remains in the increment** → the next iteration is
  planned by the outer `/devmeta-ng:go` loop's plan phase. (Do **not** carry a disguised "Plan
  Iteration N+1" bridge task; the loop drives planning.)
- **A gap grew scope** → the remediation iteration injected in Step 12 is now in the ledger;
  the loop picks it up.
- **No scope items remain in the increment** → this was the final iteration; see Step 14.

### Step 14: Report (effort: medium)

```markdown
## I&A Cycle Complete — Iteration <N>

### Acceptance Verification (adversarial)
| Scope item | Verdict | Skeptics (closed/partial/not-closed/crashed) | Evidence / fix applied |
|------------|---------|----------------------------------------------|------------------------|
| <N.N> | Closed / Partial / Not closed | 2/1/0/0 | <what was observed; what you fixed> |

- Items fixed in this cycle (were partial/not-closed → now closed): <list or "none">
- **Items routed to HUMAN (no acceptance criteria supplied):** <list or "none"> — these need
  the human to author "Verify on screen" criteria before they can be verified; they are NOT
  code fixes and were not fixed here.

### Consistency-vs-Principles Lens
- Findings: <N> (harmful: <N>, cosmetic: <N>)
- Cleanups applied this cycle: <list or "none">

### Learnings Captured
- X learnings from implementation notes
- Y learnings from feature/task notes
- Z findings promoted from the acceptance verification

### Docs Updated
| File | Changes |
|------|---------|
| CLAUDE.md | Added: <what> |
| principles-and-choices.md | Updated: <what> |
| lessons-learned.md | Added: <N> entries |
| troubleshooting.md | Added: <N> entries |

### Pattern Problems Found
- <Pattern 1>: <Resolution>

### Git & Housekeeping
- Verified ref: `<verifyRef sha>`
- Tagged: `iteration-<NN>-<XXX>.<M>`
- Ticks pruned: <N> features, <N> tasks deleted
- Remaining open items: <N>

### Iteration Plan Reassessment
- Remaining iterations reviewed: <N>
- Changes made: <none / split / merged / reordered / injected remediation>
- Rationale: <why>

### Next Iteration Readiness
- Iteration <N+1>: <title>
- Scope adjustments: <none / what changed>
- Cleanup tasks carried forward: <N>
```

**Write the report to `<active-increment-dir>/ia-cycles/iteration-<N>.md`** (e.g.
`.devmeta/increments/increment-76-abc/ia-cycles/iteration-76.1.md`) so it persists as a
permanent record. Read the active increment directory from `.devmeta/current-increment.md`.
The flat `.devmeta/ia-cycles/` location is no longer used for new reports — historic reports
there stay in place.

After writing the report, the I&A cycle is complete. It is a waypoint inside
`/devmeta-ng:go`'s loop: control returns to the loop, which proceeds to plan and build the
next iteration. There is nothing for the user to drive between iterations.

**Increment boundary is the one stop.** If this was the I&A cycle for the final iteration of
the current increment — the increment's `_overview.md` scope is now fully delivered and there
is no Iteration N+1 — then after writing the report, close the increment (update
`current-increment.md`, ensure the PR/merge to base is complete), write a short completion
report (what shipped, PRs merged, any human-in-the-loop items such as the no-criteria scope
items above), and STOP. Do not bootstrap or pick the next increment — that is a human priority
call. The user re-invokes `/devmeta-ng:go` (or `/devmeta-ng:start-increment-spec` for fresh
scope) when ready.
