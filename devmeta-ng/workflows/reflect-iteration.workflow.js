// workflows/reflect-iteration.workflow.js
//
// Adversarial acceptance-verification fan-out for ONE iteration's I&A (NN.1R).
// /devmeta-ng:reflect launches this AFTER the iteration's build workflow has
// merged into the base branch. It is the L5/L4-domain verification substrate.
//
// SCOPE OF THIS WORKFLOW (deliberately narrow):
//   (a) An adversarial acceptance fan-out: N skeptics per scope item attempt to
//       REFUTE delivery against the iteration's "Verify on screen" criteria.
//       The criteria are PASSED IN by devmeta and never invented here.
//   (b) ONE consistency-vs-principles lens over the changed files, fed
//       docs/current/principles-and-choices.md.
//   Generic correctness / drift lenses are NOT run here: that generic critic is
//   absorbed and already runs once per feature inside the BUILD workflow's verify
//   stage. Re-running it here would re-absorb a layer this engine deletes.
//
// READ-ONLY BY DESIGN: every spawned agent inspects and reports; none edits,
// commits, or mutates tracked state. The single returned value is the structured
// findings. Fixing gaps and promoting memory are devmeta's job AFTER this returns.
//
// HARD CONSTRAINTS honored:
//   - `meta` is a PURE literal ({name, description, phases:[{title,detail}]}).
//   - The script BODY never touches the filesystem / shell / git — only spawned
//     agents may, and here even the agents are kept read-only.
//   - No clock or randomness in the body (those globals are unavailable). The report stamp
//     arrives via input.runStamp; the ref under test arrives pinned via
//     input.verifyRef; changedFiles are gathered by devmeta and passed in.
//   - Runs are resumable/journaled across checkpoints.
//   - Only the final returned value comes back to the session.
//   - Concurrency stays under min(16, cores-2) and <= 1000 agents
//     (typically scopeItems * 3 + 1).

export const meta = {
  name: "devmeta-ng-reflect-iteration",
  description:
    "Adversarial acceptance verification for one iteration: N diverse skeptics per scope item refute delivery against devmeta-supplied 'Verify on screen' criteria, plus one consistency-vs-principles lens. Read-only; returns structured findings; changes nothing.",
  phases: [
    { title: "Skeptic fan-out", detail: "N independent skeptics per scope item, each on a DISTINCT angle (happy-path / edge-error / artifact-exists-and-runs), attempt to refute delivery against the supplied acceptance criteria at the pinned verifyRef." },
    { title: "Consistency lens", detail: "One lens checks the changed files against this project's documented principles-and-choices.md. The generic correctness/drift critic is intentionally omitted (it runs per-feature in the build verify stage)." },
    { title: "Converge", detail: "Majority verdict per scope item (ties break to not-closed; a crashed skeptic counts pessimistic); no-criteria items route to a human; assemble structured findings." }
  ]
};

// ---- tunables (plain literals only; no clock / no randomness available) ----
const SKEPTICS_PER_ITEM = 3;
// NOTE: per-agent effort is not a workflow agent() opt; the xhigh tier for the
// reflect acceptance fan-out is set at the /devmeta-ng:reflect command/session level.

// The N diverse adversarial angles (N5: identical adversaries correlate and miss
// the same gap). Index k selects the angle; if SKEPTICS_PER_ITEM exceeds the list
// length the angles cycle, so every skeptic still carries a concrete stance.
const SKEPTIC_ANGLES = [
  {
    name: "happy-path delivery",
    focus:
      "Run the supplied 'Verify on screen' commands EXACTLY as written on the nominal/expected input. Confirm the real on-screen output matches the stated expectation byte-for-byte (right file written, right exit code, right values). Refute if the command does not actually do what the criterion claims, or only superficially appears to."
  },
  {
    name: "edge / error path",
    focus:
      "Attack the edges the happy path skips: empty input, missing file, bad flag, large/boundary values, concurrent/second invocation, partial state. Refute if any criterion passes by luck on the nominal case but mishandles a realistic edge or swallows an error that hides failure."
  },
  {
    name: "does-the-artifact-actually-exist-and-run",
    focus:
      "Trust nothing that was merely 'marked done'. Confirm the deliverable physically EXISTS at the pinned ref and RUNS: the binary/CLI/endpoint is present, the build/install succeeds from clean, the entrypoint the criterion names is reachable, and the 'Verify on screen' command runs end-to-end without hand-editing. Refute if it only exists in a task note, a stub, or a test double."
  }
];

// RUNTIME FORM: `export const meta` + this TOP-LEVEL body (NOT `export default`). The
// runtime injects `args` and (verified) delivers it as a JSON STRING, so parse it
// defensively — works whether the launcher passes an object or a stringified object.
const input = typeof args === "string" ? JSON.parse(args) : (args || {}); // <<< INLINE POINT — /devmeta-ng:reflect replaces THIS entire line at launch with: const input = { ...reflect inputs... }
  // args is devmeta-OWNED. devmeta-ng:reflect reads scope + criteria from the
  // increment _overview.md / iteration scope and gathers the merged ref/diff
  // BEFORE launching this, and passes them in verbatim. Expected shape:
  //   input.iteration            e.g. "76.1"   (the EXECUTION iteration whose output is
  //                             verified; the I&A cycle's own tick id is 76.1R)
  //   input.runStamp             ISO string passed in (the script has no clock)
  //   input.verifyRef            pinned merged base-branch HEAD after the iteration
  //                             merge (a sha or ref string). Skeptics verify THIS ref.
  //   input.changedFiles         [ "src/foo.ts", ... ]  (from git, gathered by devmeta)
  //   input.principlesText       contents of docs/current/principles-and-choices.md
  //   input.scopeItems           [ { id, title, description } ]
  //   input.acceptanceCriteria   { [scopeItemId]: ["Verify on screen" command/expectation, ...] }
  //
  // The criteria are INPUT. The workflow does NOT read scope from disk and does
  // NOT invent an acceptance bar. If a criterion is absent, it is not tested —
  // the item is routed to a human criteria-authoring step, not silently passed.

  const items = input.scopeItems || [];
  const criteria = input.acceptanceCriteria || {};
  const changed = input.changedFiles || [];
  const verifyRef = input.verifyRef;
  const filesBlock = changed.length ? changed.map((f) => "- " + f).join("\n") : "(none reported)";

  // ------------------------------------------------------------------
  // GUARD (N7): a harness that verifies NOTHING must not look like
  // "all closed." Empty scopeItems => a BLOCKED result, never {findings:[]}.
  // This returns early without spawning a single agent.
  // ------------------------------------------------------------------
  if (items.length === 0) {
    log("No scope items supplied -> blocked (a verifier of nothing is not a clean pass).");
    return {
      iteration: input.iteration,
      runStamp: input.runStamp,
      verifyRef: verifyRef || null,
      status: "blocked",
      reason:
        "No scope items were supplied to the reflect workflow. devmeta must pass the iteration's scope items and their 'Verify on screen' criteria; verifying nothing is not an acceptance pass.",
      acceptanceFindings: [],
      lensFindings: { consistency: [] }
    };
  }

  // ------------------------------------------------------------------
  // GUARD (N6): the ref to verify is part of the contract — it must be the
  // pinned merged base-branch HEAD after the iteration merge, supplied by
  // devmeta-ng:reflect. Verifying against an UNPINNED / missing ref is the same
  // "verify nothing real" failure as empty scope: skeptics would inspect their
  // own scratch state and could falsely concede delivery. Block instead.
  // ------------------------------------------------------------------
  if (!verifyRef) {
    log("No verifyRef supplied -> blocked (cannot pin the merged ref under test; refusing to verify scratch state).");
    return {
      iteration: input.iteration,
      runStamp: input.runStamp,
      verifyRef: null,
      status: "blocked",
      reason:
        "No verifyRef was supplied. devmeta must pass the pinned merged base-branch HEAD (the ref after the iteration merge); without it the skeptics cannot verify the delivered artifact and the result would not be a sound acceptance pass.",
      acceptanceFindings: [],
      lensFindings: { consistency: [] }
    };
  }

  // ============================================================
  // PHASE 1+3: adversarial skeptic fan-out, per scope item.
  // pipeline() runs each scope item through stage1 (spawn N diverse
  // skeptics concurrently) then stage2 (converge by majority) with NO
  // barrier between items, so independent items overlap.
  // ============================================================
  phase("Skeptic fan-out");

  const refuteOne = async (item) => {
    const itemCriteria = criteria[item.id] || [];

    // N7: no supplied criteria => NOT a code problem and NOT a clean pass.
    // You cannot fix code to satisfy a bar that does not exist, and the
    // workflow must never author the bar itself. Short-circuit to a
    // human-criteria-authoring verdict, OUTSIDE devmeta's code-fix loop.
    if (itemCriteria.length === 0) {
      log(`Scope item ${item.id}: no acceptance criteria supplied -> not-closed (route to human criteria authoring)`);
      return { item, skepticVotes: [], noCriteria: true };
    }

    const criteriaBlock = itemCriteria.map((c, i) => `  ${i + 1}. ${c}`).join("\n");

    const skepticThunks = [];
    for (let k = 0; k < SKEPTICS_PER_ITEM; k++) {
      const angle = SKEPTIC_ANGLES[k % SKEPTIC_ANGLES.length];
      skepticThunks.push(() =>
        agent(
          `You are SKEPTIC #${k + 1} of ${SKEPTICS_PER_ITEM} for iteration ${input.iteration}.
Your assigned adversarial angle is: ${angle.name.toUpperCase()}.

Your job is to REFUTE the claim that the following scope item has been truly delivered.
You are adversarial. Default to NOT DELIVERED. Concede delivery ONLY if the evidence is undeniable from your angle.
If you are uncertain, the verdict is "not-closed". Charity is not allowed.

SCOPE ITEM (${item.id}): ${item.title}
${item.description || ""}

ACCEPTANCE CRITERIA — the "Verify on screen" bar devmeta defined for this item. These are AUTHORITATIVE. Do NOT substitute, weaken, or invent your own bar:
${criteriaBlock}

VERIFY AT THIS PINNED REF (the merged base-branch HEAD after the iteration merge):
  ${verifyRef}
Check out / inspect that exact ref. Do not judge a different commit, your scratch state, or uncommitted work.

Files changed this iteration (start here, but read whatever you must to judge):
${filesBlock}

YOUR ANGLE — ${angle.name}:
${angle.focus}

How to work:
- Actually RUN the "Verify on screen" commands above against the pinned ref. Read the REAL output. Do not trust that a task was marked done.
- READ-ONLY: you may run commands and read code, but you MUST NOT edit files, commit, push, or modify any tracked state. You verify; you do not fix.
- If a "Verify on screen" command starts a server or binds a port, you may be running alongside other skeptics — run such commands SERIALLY (start, observe, stop) and do not assume an exclusive port. (Read-only verification is not worktree-isolated, and worktrees would not isolate ports anyway.)
- Hunt for the gap your angle targets: a criterion that passes by luck, a case that is unhandled, output that only superficially matches, a deliverable that does not actually run.

Return a verdict for THIS item:
  verdict: "closed"     only if every criterion is undeniably met from your angle and you could not refute it
           "partial"    if some criteria are met but at least one is not, or only partially
           "not-closed" if you refuted delivery OR you are uncertain
  evidence: the concrete observation that justifies the verdict (command output, the unhandled case, the missing artifact, the line of code)
  suggestedFix: if not "closed", the smallest change that would actually satisfy the criteria`,
          {
            label: `skeptic-${item.id}-${k + 1}-${angle.name.replace(/[^a-z]+/gi, "-")}`,
            phase: "Skeptic fan-out",
            agentType: "general-purpose",
            schema: {
              type: "object",
              required: ["verdict", "evidence"],
              properties: {
                verdict: { type: "string", enum: ["closed", "partial", "not-closed"] },
                evidence: { type: "string" },
                suggestedFix: { type: "string" }
              }
            }
          }
        )
      );
    }

    // parallel() is a barrier: wait for all skeptics on this item.
    // A failed/crashed skeptic resolves to null -> a pessimistic non-vote
    // (counts toward not-delivered, never toward closed).
    const votes = await parallel(skepticThunks);
    return { item, skepticVotes: votes, noCriteria: false };
  };

  const convergeOne = async (carried) => {
    const { item, skepticVotes, noCriteria } = carried;

    // N7: no-criteria item -> not-closed, flagged for a HUMAN criteria-authoring
    // step OUTSIDE the code-fix loop. needsHumanCriteria distinguishes it from a
    // code gap so devmeta does NOT attempt a code fix.
    if (noCriteria) {
      return {
        item: item.id,
        title: item.title,
        verdict: "not-closed",
        needsHumanCriteria: true,
        evidence: "No acceptance criteria were supplied for this scope item; delivery cannot be verified, and the workflow does not invent a bar.",
        suggestedFix: "HUMAN STEP: author the 'Verify on screen' criteria for this item, then re-run verification. This is outside the automated code-fix loop.",
        skepticBreakdown: { closed: 0, partial: 0, "not-closed": 0, crashed: 0 }
      };
    }

    // Buckets are DISJOINT and sum to skepticVotes.length: a crash is counted in
    // `crashed` only, never also in `notClosed`. For the VERDICT, a crash still
    // counts pessimistically (toward not-closed) via notClosedForVerdict below —
    // so the report stays honest while the decision stays pessimistic.
    let closed = 0, partial = 0, notClosed = 0, crashed = 0;
    const evidence = [];
    const fixes = [];
    for (const v of skepticVotes) {
      if (!v) { crashed++; continue; } // crash => no real vote; counted pessimistically for the verdict, not double-counted in the breakdown
      if (v.verdict === "closed") closed++;
      else if (v.verdict === "partial") { partial++; if (v.evidence) evidence.push(v.evidence); if (v.suggestedFix) fixes.push(v.suggestedFix); }
      else { notClosed++; if (v.evidence) evidence.push(v.evidence); if (v.suggestedFix) fixes.push(v.suggestedFix); }
    }

    // A crashed skeptic is a pessimistic non-vote: it counts toward not-closed for
    // the decision (never toward closed), so a crash can only ever block a pass.
    const notClosedForVerdict = notClosed + crashed;

    // Majority; ties break PESSIMISTIC (a tie is not a clean pass).
    let verdict;
    if (closed > partial && closed > notClosedForVerdict) verdict = "closed";
    else if (notClosedForVerdict >= partial) verdict = "not-closed";
    else verdict = "partial";

    log(`Scope item ${item.id}: closed=${closed} partial=${partial} not-closed=${notClosed} (crashed=${crashed}, pessimistic-not-closed=${notClosedForVerdict}) -> ${verdict}`);

    return {
      item: item.id,
      title: item.title,
      verdict,
      needsHumanCriteria: false,
      evidence: verdict === "closed" ? "All skeptics failed to refute delivery against the supplied criteria at the pinned ref." : evidence.join(" | "),
      suggestedFix: verdict === "closed" ? "" : fixes.join(" | "),
      skepticBreakdown: { closed, partial, "not-closed": notClosed, crashed }
    };
  };

  const acceptanceFindings = await pipeline(items, refuteOne, convergeOne);

  // ============================================================
  // PHASE 2: ONE consistency-vs-principles lens (the SURVIVING part of
  // the old critic). NOT a generic checklist, and NOT the generic
  // correctness/drift lenses — those are absorbed and already run once
  // per feature inside the BUILD workflow's verify stage. This single
  // lens is fed our principles text, so it encodes OUR domain rules
  // (L4-domain), which the model weights do not absorb.
  // ============================================================
  phase("Consistency lens");

  const consistency = await agent(
    `You are the CONSISTENCY-WITH-PRINCIPLES lens for iteration ${input.iteration}.
Judge the changed files ONLY against THIS project's documented principles. Flag any code that violates or quietly contradicts them.
Do NOT run a generic correctness or style sweep — that critic already ran per-feature in the build's verify stage. Report ONLY principle violations.

PRINCIPLES (docs/current/principles-and-choices.md, authoritative):
${input.principlesText || "(none supplied)"}

Inspect at the pinned ref: ${verifyRef}
Changed files:
${filesBlock}

READ-ONLY: do not edit, commit, or modify any tracked state. If you run any command, run server/port commands serially.
Return findings: a list of { file, issue, severity ("high"|"medium"|"low"), suggestedFix }. Reference the SPECIFIC principle violated in each issue. Empty list if fully consistent.`,
    {
      label: "lens-consistency",
      phase: "Consistency lens",
      agentType: "general-purpose",
      schema: {
        type: "object",
        required: ["findings"],
        properties: {
          findings: {
            type: "array",
            items: {
              type: "object",
              required: ["file", "issue", "severity"],
              properties: {
                file: { type: "string" },
                issue: { type: "string" },
                severity: { type: "string", enum: ["high", "medium", "low"] },
                suggestedFix: { type: "string" }
              }
            }
          }
        }
      }
    }
  );

  phase("Converge");

  // Only the final returned value comes back to the session. devmeta-ng:reflect
  // reads this, applies "fix gaps now / scope immutable" to every partial /
  // not-closed (EXCEPT items where needsHumanCriteria is true — those route to a
  // human criteria-authoring step, NOT a code fix), then does the L2
  // memory-promotion step ITSELF (outside the workflow, where fs/tk are allowed).
  return {
    iteration: input.iteration,
    runStamp: input.runStamp,
    verifyRef,
    status: "complete",
    acceptanceFindings, // [{ item, title, verdict, needsHumanCriteria, evidence, suggestedFix, skepticBreakdown }]
    lensFindings: {
      // Only the consistency lens runs here (N4). correctness/drift are absorbed
      // into the build verify stage and intentionally omitted.
      consistency: (consistency && consistency.findings) || []
    }
  };
