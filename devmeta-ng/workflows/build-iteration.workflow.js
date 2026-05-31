// devmeta-ng build workflow — wraps ONE iteration's feature fan-out (the build).
//
// LAUNCH MODEL:
//   /devmeta-ng:go Phase 3 is the SOLE launcher and decision point. On the opted-in
//   path (the `workflow`/`ultracode` signal present) it serializes the iteration's
//   feature manifest into the plain-data `args` below, emits this script, and launches
//   it. Otherwise it runs the documented fan-out fallback (workflows are not launched
//   here; /devmeta-ng:run is ONLY that fallback procedure, never a second launcher).
//   The per-feature agent prompt is identical on both paths, so the two are A/B-comparable.
//
// HARD CONSTRAINTS honored:
//   - `meta` is a PURE literal (no expressions, no env, no clock).
//   - The SCRIPT BODY never touches git / fs / shell / tk — every such action happens
//     INSIDE a spawned agent; only the returned value comes back to the session.
//   - No Date / clock / random globals in the body — the run timestamp arrives via
//     `args.runStamp` (determinism; spawned agents may still read the clock).
//   - Resumable / journaled across checkpoints: a resumed run skips completed waves.
//   - Concurrency cap is the platform's min(16, cores-2), total agents <= 1000; a real
//     iteration is a handful of features, so we stay far under.
//
// SCOPE OF THIS WORKFLOW:
//   It is a thin EXECUTION SUBSTRATE. It owns wave ordering, fan-out, the per-feature
//   isolation boundary, and the in-loop GENERIC L4 verify. It owns nothing that defines
//   *what correct means* for the iteration — the adversarial acceptance check against the
//   iteration's "Verify on screen" criteria is devmeta's SEPARATE reflect workflow, and
//   `verifyOnScreen` is deliberately NOT in these args. It owns nothing that crosses
//   feature boundaries — cross-feature merge / integration / ledger reconciliation /
//   memory promotion all stay in /devmeta-ng:go's resumable outer loop, AFTER this
//   workflow returns its single value.

export const meta = {
  name: "devmeta-ng-build-iteration",
  description:
    "Build one iteration: feature fan-out across dependency waves, one agent per feature (own branch, tasks-in-order, surgical tests, commit-per-task, PR), then an in-loop generic verify per feature. Returns a per-feature build manifest only; no merge, no acceptance, no ledger mutation.",
  phases: [
    { title: "Build", detail: "One agent per feature: create+checkout its own branch off the base, complete tasks in order, surgical tests, commit per task, open a PR (do not merge)." },
    { title: "Verify", detail: "Generic L4 critic per feature: read the diff/PR, confirm tasks are closed AND present in the diff, re-run surgical tests, surface false-victory. Generic correctness only — NOT acceptance." }
  ]
};

// ---- result contracts (validate agent output; an invalid/failed agent -> null) ----
const buildSchema = {
  type: "object",
  required: ["featureId", "branch", "status", "tasks", "prUrl"],
  properties: {
    featureId: { type: "string" },
    branch:    { type: "string" },
    status:    { type: "string", enum: ["complete", "partial", "blocked"] },
    tasks: {
      type: "array",
      items: {
        type: "object",
        required: ["taskId", "state", "commit"],
        properties: {
          taskId: { type: "string" },
          state:  { type: "string", enum: ["closed", "open", "escalated"] },
          commit: { type: "string" },        // sha or "" if none
          note:   { type: "string" }
        }
      }
    },
    prUrl:        { type: "string" },          // "" if no PR opened
    headSha:      { type: "string" },
    contextNotes: { type: "string" },          // what it appended to context-log.md
    blockers:     { type: "array", items: { type: "string" } }
  }
};

const verifySchema = {
  type: "object",
  required: ["featureId", "verdict", "findings"],
  properties: {
    featureId: { type: "string" },
    verdict:   { type: "string", enum: ["pass", "fail", "inconclusive"] },
    findings:  { type: "array", items: { type: "string" } },
    reTestCmd: { type: "string" }              // the surgical command the critic actually ran
  }
};

// ---- per-feature agent prompts (ALL git/fs/tk work lives in here) ----

function buildPrompt(feature, ctx) {
  return [
    `## Build assignment — Feature [${feature.featureId}] ${feature.title}`,
    ``,
    `You are the sole worker for this feature. Work autonomously; do not ask questions.`,
    ``,
    `### Branch (create it yourself — the orchestrator does NOT pre-create branches)`,
    `Base branch: \`${ctx.baseBranch}\`  (authoritative, read from <increment-dir>/base-branch)`,
    `Run: \`git fetch origin && git checkout -b ${feature.branch} origin/${ctx.baseBranch} && git push -u origin ${feature.branch}\``,
    ``,
    `### Feature description`,
    feature.description,
    ``,
    `### Feature spec — READ THIS FILE IN FULL before coding`,
    feature.spec ? `Open and read: ${feature.spec}` : "(none — work from the description and tasks below)",
    feature.spec ? `If that file does NOT exist on your branch, STOP — the base was not published with the plan and your branch is stale. Do NOT guess, infer, or reconstruct scope, and never conclude the feature is "already done" from a missing spec. Return status "blocked" with a note like "spec missing at ${feature.spec}; base likely stale" and exit.` : "",
    ``,
    `### Tasks — complete IN ORDER (they build on each other)`,
    feature.tasks.map((t, i) =>
      `${i + 1}. [${t.taskId}] ${t.title}\n   Acceptance: ${t.acceptance}\n   Detail: ${t.detail}`
    ).join("\n"),
    ``,
    `### Surgical test command for this feature`,
    feature.test || "(none specified — derive the narrowest command that exercises the touched code)",
    ``,
    `### Shared context log (read-only snapshot at fan-out)`,
    ctx.contextLog || "(empty)",
    ``,
    `### Feature notes from previous runs`,
    feature.notes || "(none)",
    ``,
    `### Orientation to read first`,
    `- CLAUDE.md`,
    `- docs/current/principles-and-choices.md  (architectural decisions — do not contradict)`,
    `- .devmeta/lessons-learned.md  (do not repeat known mistakes)`,
    `- .devmeta/devmeta.md if present  (project test commands + extra rules)`,
    ``,
    `### Procedure — per task`,
    `a. \`tk update <task-id> --status in_progress\``,
    `b. Implement the change AND its tests together.`,
    `c. Run the SURGICAL test command for the touched code (never the full suite). Fix and re-run until green.`,
    `d. \`git commit -m "[<task-id>] <what changed>"\`  (one commit per task)`,
    `e. \`tk close <task-id> --reason "<summary>"\``,
    ``,
    `### After all tasks`,
    `- Append your learnings + any cross-feature signals to context-log.md.`,
    `- \`tk note ${feature.featureId} "FEATURE COMPLETE: <summary>"\``,
    `- Open a PR TARGETING \`${ctx.baseBranch}\`: \`gh pr create --base ${ctx.baseBranch} --head ${feature.branch} --title "..." --body "..."\``,
    `- Do NOT merge. Do NOT touch other feature branches. Merge/integration is devmeta's job after this workflow returns.`,
    ``,
    `### Self-check scope (IMPORTANT)`,
    `Self-check ONLY via your surgical tests for this feature. Do NOT verify against the iteration's`,
    `"Verify on screen" / acceptance criteria — that adversarial acceptance verdict is devmeta's`,
    `separate reflect workflow, by design. Those criteria are not provided to you here.`,
    ``,
    `### Hard rules`,
    `- NEVER close a task with failing tests. There is no "close with known failures."`,
    `- NEVER reduce scope. If it's hard, work harder; if blocked, try to unblock it. Only a human cuts a feature.`,
    `- If a task is genuinely blocked: \`tk update <task-id> --awaiting escalation\`, \`tk note\` why, continue to any task that does not depend on it.`,
    `- Use tk commands; never edit .tick/issues/ by hand.`,
    `- Run timestamp for any dated note: ${ctx.runStamp}.`,
    ``,
    `### Return`,
    `Return ONLY a JSON object matching the build result schema: featureId, branch, status`,
    `(complete | partial | blocked), the per-task array (taskId, state, commit sha, note),`,
    `prUrl, headSha, contextNotes, blockers[].`
  ].join("\n");
}

function verifyPrompt(featureId, branch, baseBranch, runStamp) {
  return [
    `## Generic build verification — Feature [${featureId}]`,
    ``,
    `You are an independent generic critic (in-loop L4). You did NOT build this. Trust nothing;`,
    `verify on the actual artifact, not on the builder's self-report.`,
    ``,
    `You start in a FRESH worktree on \`${baseBranch}\` — check out the feature branch FIRST, or you will be testing base, not the feature.`,
    ``,
    `Do this:`,
    `1. \`git fetch origin && git checkout ${branch}\` (the feature branch [${branch}]). Then inspect its PR for [${featureId}] and its diff against \`${baseBranch}\`.`,
    `2. Confirm every task tk lists under [${featureId}] is closed AND visibly implemented in the diff.`,
    `3. Re-run the surgical tests for the changed surface yourself. Record the exact command.`,
    `4. Look for false-victory: empty/skipped/weakened tests, TODOs, stubs, hard-coded returns,`,
    `   acceptance criteria that the diff does not actually satisfy at the unit level.`,
    ``,
    `This is the GENERIC correctness lens only. Do NOT judge against the iteration's domain`,
    `acceptance criteria ("Verify on screen") — that adversarial L5 check is devmeta's separate`,
    `reflect workflow, by design, and those criteria are intentionally not given to you here.`,
    ``,
    `Run timestamp: ${runStamp}.`,
    ``,
    `Return ONLY JSON: featureId, verdict (pass | fail | inconclusive), findings[], reTestCmd.`
  ].join("\n");
}

// ---- workflow body: WAVES, each awaited pipeline() result IS the wave barrier ----
// RUNTIME FORM: `export const meta` + this TOP-LEVEL body (NOT `export default`). The
// runtime injects `args` and (verified) delivers it as a JSON STRING, so parse it
// defensively — this works whether the launcher passes an object or a stringified object.
const input = typeof args === "string" ? JSON.parse(args) : (args || {}); // <<< INLINE POINT — /devmeta-ng:go replaces THIS entire line at launch with: const input = { ...build-args... }
  // input (parsed from the injected args) = {
  //   iteration, runStamp, baseBranch, contextLog,
  //   waves: [ [ {featureId, title, description, branch, tasks:[{taskId,title,acceptance,detail}],
  //               test, spec, notes} , ... ], ... ]
  // }   — pure data; the script NEVER reads it from disk. /devmeta-ng:go Phase 3 put it here
  //         (the flat-manifest -> build-args transform: name->title, scope->description,
  //          epicId->featureId, wave+dependsOn collapsed into the waves[][] grouping).
  //
  // NOTE: `verifyOnScreen` is deliberately ABSENT. Build agents self-check via surgical
  // tests only; the acceptance verdict against "Verify on screen" is reflect's alone.

  const ctx = { baseBranch: input.baseBranch, contextLog: input.contextLog, runStamp: input.runStamp };
  const waves = input.waves || [];
  const allResults = [];

  // Each WAVE fans out independent features in parallel. Wave W+1 begins only after the
  // awaited pipeline() result for wave W resolves — that awaited completion IS the wave
  // barrier, which is exactly the cross-feature dependency ordering. Within a wave there
  // are no dependencies by construction, so all build agents run concurrently (subject to
  // the platform cap min(16, cores-2)). The journal checkpoints at each barrier, so a
  // resumed run skips already-finished waves.
  for (let w = 0; w < waves.length; w++) {
    const wave = waves[w];
    phase("Build");
    log(`Wave ${w + 1}/${waves.length}: ${wave.length} feature(s) in parallel`);

    // build -> verify is a two-stage pipeline PER FEATURE with NO barrier BETWEEN the two
    // stages, so a fast feature is verified while a slow sibling is still building. Awaiting
    // the whole pipeline() collects the wave and provides the barrier before the next wave.
    const waveResults = await pipeline(
      wave,

      // stage 1: build the feature
      (feature) =>
        agent(buildPrompt(feature, ctx), {
          label: `build ${feature.featureId}`,
          phase: "Build",
          schema: buildSchema,
          isolation: "worktree",        // each feature agent gets its own worktree -> no checkout collisions
          agentType: "tk-worker"
        }),

      // stage 2: generic L4 verify of what stage 1 produced
      async (build) => {
        if (!build) return { build: null, verify: null };   // failed/invalid build agent -> null thunk
        const verify = await agent(
          verifyPrompt(build.featureId, build.branch, ctx.baseBranch, ctx.runStamp),
          {
            label: `verify ${build.featureId}`,
            phase: "Verify",
            schema: verifySchema,
            isolation: "worktree",
            agentType: "general-purpose"
          }
        );
        return { build, verify };
      }
    );

    // pipeline returns one entry per feature (null where a stage failed). Fold into the ledger-shaped result.
    for (const r of waveResults) {
      if (!r || !r.build) { allResults.push({ status: "agent-failed", build: null, verify: null }); continue; }
      allResults.push({
        featureId: r.build.featureId,
        branch:    r.build.branch,
        status:    r.build.status,
        prUrl:     r.build.prUrl,
        headSha:   r.build.headSha,
        tasks:     r.build.tasks,
        blockers:  r.build.blockers,
        verifyVerdict:  r.verify ? r.verify.verdict  : "inconclusive",
        verifyFindings: r.verify ? r.verify.findings : ["verify agent failed"]
      });
    }
    log(`Wave ${w + 1} done.`);
  }

  // The ONLY thing that crosses back to the session. devmeta's go loop reads this,
  // reconciles tk, merges in wave order, then runs the reflect acceptance workflow.
  // No merge, no acceptance verdict, no ledger mutation here.
  return {
    iteration:  input.iteration,
    runStamp:   input.runStamp,
    baseBranch: input.baseBranch,
    features:   allResults,
    summary: {
      total:    allResults.length,
      complete: allResults.filter(r => r.status === "complete").length,
      partial:  allResults.filter(r => r.status === "partial").length,
      blocked:  allResults.filter(r => r.status === "blocked").length,
      verifyFailures: allResults.filter(r => r.verifyVerdict === "fail").length
    }
  };
