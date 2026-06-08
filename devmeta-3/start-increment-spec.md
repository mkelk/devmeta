# devmeta-3:start-increment-spec — author a new increment

Interactive (this is the one inherently-conversational step — workflows are headless).
Produces the durable **intent artifacts** that `devmeta-3:go` consumes. Shares the exact
`.devmeta/` layout and `NN-XXX` numbering of devmeta / devmeta-ng (drop-in compatible).

## Step 1 — Number & suffix
Read `.devmeta/current-increment.md`; parse the active `Increment <NN>[-<suffix>]` line; new number = leading integer + 1 (first increment → 1). Generate a 3-letter `[a-z]` suffix `<XXX>`; ensure `.devmeta/increments/increment-<NN>-<XXX>/` doesn't exist (regenerate on collision).

## Step 2 — Scaffold
```
mkdir -p .devmeta/increments/increment-<NN>-<XXX>/iterations
```
Write `<incrementDir>/base-branch` only if the user fixes it now; otherwise `go` asks on first run.

## Step 3 — `_overview.md` (the spec)
Write `.devmeta/increments/increment-<NN>-<XXX>/_overview.md`:
```markdown
# Increment <NN>-<XXX> — <Title>
**Status:** NOT STARTED
**Goal:** <1-2 sentences: what the user can do after this increment>

## What This Increment Produces
### On screen
- ...
### Under the hood
- ...
### Testing delivered
- ...

## Iteration Map
| # | Title | Status | What Gets Built | Parallel frontier |
|:--:|-------|--------|-----------------|-------------------|
| <NN>.1 | <title> | NOT STARTED | <deliverables> | <which features are independent> |
| <NN>.2 | <title> | NOT STARTED | <deliverables> | <...> |

## Detailed Iterations
### Iteration <NN>.1 — <title>
**Deliverables:** ...
**Verify on screen:** <these become the iteration's acceptance criteria — make each checkable>

## Exit Criteria
- [ ] typecheck / lint / unit tests green
- [ ] migrations apply on a fresh reset
- [ ] no regressions
```
**The `Status` column on each Iteration Map row is the ledger `go` reads/advances. The "Verify on screen" bullets become the acceptance criteria the workflow's reflect phase attacks — author them as concrete, checkable statements.**

## Step 4 — Point `current-increment.md` at it
`**Active:** Increment <NN>-<XXX> — <Title>: <one line>. Status: NOT STARTED.`

## Step 5 — Interactive scope (effort: high)
Dialogue to fill the overview. **Prefer FEWER, LARGER iterations** (2–4): each iteration pays fixed ceremony (a workflow run = plan + build fan-out + integrate + gates + reflect). Add an iteration only when (a) a genuine **dependency wall** forces it (later features can't start until an earlier slice lands) or (b) a **natural checkpoint** makes validating a coherent slice worthwhile before building on it. Within an iteration, pack as many **independent** features as fit (a wide parallel frontier) — the workflow's plan phase will partition them and declare the integration contract. A single-feature iteration is a smell unless (a) or (b) applies.

## Step 6 — Finalize
Confirm the overview is complete and the iteration "Verify on screen" criteria are testable. Report:
```
## Increment <NN>-<XXX> Created
**Overview:** .devmeta/increments/increment-<NN>-<XXX>/_overview.md
**Iterations:** <N>
**Next:** /devmeta-3:go
```
Do NOT plan or build — that is `go` (which runs the per-iteration workflow). Planning the *feature partition* is the workflow's Plan phase, not this step; here you only shape iterations + acceptance.
