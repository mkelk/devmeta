export const meta = {
  name: "devmeta3-drive-iteration",
  description:
    "devmeta-3 generic iteration engine (v2): plan -> parallel build (tests mandatory) -> integrate -> parallel gates incl coverage (+bounded fix) -> adversarial reflect (acceptance + test-quality + drift) -> harvest (route learnings, narrative history, ia-cycle report, plan reassessment). One control plane (journal + .devmeta docs + git); no tk.",
  phases: [
    {
      title: "Plan",
      detail:
        "partition + integration contract + per-feature testObligations + acceptance",
    },
    {
      title: "Build",
      detail:
        "one agent per feature per wave; MUST author tests (testsAdded evidence)",
    },
    {
      title: "Integrate",
      detail: "merge in wave order + execute integration contract + migration",
    },
    {
      title: "Gate",
      detail:
        "parallel typecheck/unit/lint/migrate + coverage; bounded fix loop",
    },
    {
      title: "Reflect",
      detail: "parallel skeptics: acceptance + test-quality + code-drift",
    },
    {
      title: "Harvest",
      detail:
        "route learnings to typed homes; narrative history; ia-cycle report; plan reassessment",
    },
  ],
};

// ---------------------------------------------------------------------------
// RUNTIME FORM: `export const meta` + this TOP-LEVEL body. devmeta-3:go replaces
// the INLINE POINT line below with a concrete `const input = {...}` literal at launch.
// input shape:
//   { increment, iteration, baseBranch, incrementDir, briefPath, today,
//     test: { typecheck, unit, lint, migrateReset } }
// ---------------------------------------------------------------------------
const input = typeof args === "object" && args ? args : {}; // <<< INLINE POINT — devmeta-3:go replaces THIS entire line with: const input = { increment, iteration, baseBranch, incrementDir, briefPath, today, test: {...} }

const BASE = input.baseBranch;
const ITER = input.iteration;
const DIR = input.incrementDir;
const BRIEF = input.briefPath || "(no brief; use the increment _overview)";
const TODAY = input.today || "(unknown; do not date-stamp)";
const T = input.test || {};

// ----------------------------- schemas -----------------------------
const TEST_OBLIGATION = {
  type: "object",
  additionalProperties: false,
  required: ["behavior", "assertion", "kind"],
  properties: {
    behavior: { type: "string" },
    assertion: { type: "string" },
    kind: {
      type: "string",
      enum: ["unit", "component", "integration", "migration", "e2e"],
    },
  },
};
const MANIFEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "iteration",
    "features",
    "integrationPoints",
    "acceptanceCriteria",
  ],
  properties: {
    iteration: { type: "string" },
    features: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "wave",
          "dependsOn",
          "scope",
          "ownedFiles",
          "testObligations",
          "surgicalCmd",
        ],
        properties: {
          name: { type: "string" },
          wave: { type: "integer" },
          dependsOn: { type: "array", items: { type: "string" } },
          scope: { type: "string" },
          ownedFiles: { type: "array", items: { type: "string" } },
          testObligations: { type: "array", items: TEST_OBLIGATION },
          untestableJustification: { type: "string" },
          surgicalCmd: { type: "string" },
        },
      },
    },
    integrationPoints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "contributions"],
        properties: {
          file: { type: "string" },
          contributions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["feature", "change"],
              properties: {
                feature: { type: "string" },
                change: { type: "string" },
              },
            },
          },
        },
      },
    },
    acceptanceCriteria: { type: "array", items: { type: "string" } },
  },
};
const LEARNING = {
  type: "object",
  additionalProperties: false,
  required: ["insight", "scope"],
  properties: {
    insight: { type: "string" },
    scope: { type: "string", enum: ["project", "engine"] },
    suggestedHome: { type: "string" },
  },
};
const BUILD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["feature", "branch", "committed", "status", "testsAdded"],
  properties: {
    feature: { type: "string" },
    branch: { type: "string" },
    committed: { type: "boolean" },
    headSha: { type: "string" },
    status: { type: "string", enum: ["ok", "partial", "failed"] },
    testsAdded: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "testName", "coversBehavior"],
        properties: {
          file: { type: "string" },
          testName: { type: "string" },
          coversBehavior: { type: "string" },
        },
      },
    },
    surgicalOutput: { type: "string" },
    learnings: { type: "array", items: LEARNING },
    notes: { type: "string" },
  },
};
const INTEGRATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["merged", "headSha", "status"],
  properties: {
    merged: { type: "boolean" },
    headSha: { type: "string" },
    migration: { type: "string" },
    status: { type: "string", enum: ["ok", "conflicts", "failed"] },
    learnings: { type: "array", items: LEARNING },
    notes: { type: "string" },
  },
};
const GATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["gate", "pass"],
  properties: {
    gate: { type: "string" },
    pass: { type: "boolean" },
    output: { type: "string" },
  },
};
const VERDICT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "pass", "findings"],
  properties: {
    subject: { type: "string" },
    pass: { type: "boolean" },
    severity: { type: "string", enum: ["none", "minor", "major", "blocker"] },
    findings: { type: "array", items: { type: "string" } },
  },
};
const DRIFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["findings"],
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "kind", "severity", "why", "fix"],
        properties: {
          file: { type: "string" },
          kind: { type: "string" },
          severity: { type: "string", enum: ["minor", "major", "blocker"] },
          why: { type: "string" },
          fix: { type: "string" },
        },
      },
    },
  },
};
const HARVEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["filed", "reportPath", "committed"],
  properties: {
    filed: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["home", "item"],
        properties: { home: { type: "string" }, item: { type: "string" } },
      },
    },
    reportPath: { type: "string" },
    reassessment: { type: "array", items: { type: "string" } },
    cleanupForNextIteration: { type: "array", items: { type: "string" } },
    committed: { type: "boolean" },
    notes: { type: "string" },
  },
};

// =================== PHASE 1: PLAN ===================
phase("Plan");
log(
  "devmeta3: planning iteration " +
    ITER +
    " — partition + integration contract + per-feature test obligations",
);
const planPrompt = [
  "You are the PLAN phase of the devmeta-3 engine. cwd is the project root; base branch " +
    BASE +
    ".",
  "Read for scope: " +
    DIR +
    "/_overview.md (the section for iteration " +
    ITER +
    ': its deliverables, "Verify on screen", and "Testing delivered"), the brief ' +
    BRIEF +
    ", and CLAUDE.md/AGENTS.md. Inspect the codebase to choose real paths and mirror conventions.",
  "Read for KNOWN FAILURE MODES before partitioning (pre-empt them in feature scopes and test obligations): .devmeta/lessons-learned.md, .devmeta/devmeta.md, and if present docs/current/troubleshooting.md, .devmeta/testing-notes.md, docs/current/principles-and-choices.md.",
  "Partition iteration " +
    ITER +
    " into INDEPENDENT features (NON-NEGOTIABLE):",
  "- Maximize the parallel frontier; wave-1 features have dependsOn []. WRITE-WRITE INVARIANT: no file in two features' ownedFiles. A file >1 feature must touch is an INTEGRATION POINT (not owned by any feature) recorded in integrationPoints with each feature's contribution. Extract shared types/schema/config into a wave-1 foundation feature.",
  'TEST OBLIGATIONS (mandatory): give EVERY feature a non-empty testObligations[] derived from its slice of the deliverables + "Verify on screen" + "Testing delivered". Each is {behavior, assertion, kind}. typecheck is NOT a test. Test modality by kind: UI/presentational -> component/render/interaction test (the project component-test cmd); schema/migration -> a round-trip or migrate-apply test; pure types/config -> a typed-contract test that imports and exercises the contract (never bare typecheck). A feature you cannot name a single behavioral assertion for is mis-cut: split or merge it. ONLY if a feature genuinely has no testable behavior, return testObligations: [] WITH untestableJustification set (go surfaces this to a human).',
  "Give each feature surgicalCmd: the single fast command that runs THAT feature's tests (resolve real commands from .devmeta/devmeta.md > Testing).",
  'INTEGRATION CONTRACT: integrationPoints[] = shared files the integrate phase edits; each contribution = {feature, change} specific enough to execute without re-deriving scope (e.g. "register <Resource name=x>", "wire <Widget/> into Dashboard.tsx", "add fakerest getList branch + beforeCreate default").',
  'ACCEPTANCE: lift the iteration\'s "Verify on screen" into acceptanceCriteria[] (each checkable).',
  "Output ONLY the structured manifest. Write no code in this phase.",
].join("\n");
const plan = await agent(planPrompt, {
  schema: MANIFEST_SCHEMA,
  label: "plan:" + ITER,
  phase: "Plan",
});

const waves = [];
for (const f of plan.features) {
  const w = f.wave || 1;
  if (!waves[w]) waves[w] = [];
  waves[w].push(f);
}
const integrationFiles = plan.integrationPoints.map((p) => p.file);
const untestable = plan.features.filter(
  (f) => (f.testObligations || []).length === 0,
);
if (untestable.length)
  log(
    "devmeta3: WARNING — features with no test obligations (human review): " +
      untestable
        .map(
          (f) =>
            f.name +
            " [" +
            (f.untestableJustification || "NO JUSTIFICATION") +
            "]",
        )
        .join("; "),
  );
log(
  "devmeta3: plan = " +
    plan.features.length +
    " features / " +
    waves.filter(Boolean).length +
    " wave(s); " +
    plan.integrationPoints.length +
    " integration point(s); " +
    plan.acceptanceCriteria.length +
    " acceptance criteria",
);

// =================== PHASE 2: BUILD (tests mandatory) ===================
phase("Build");
const built = [];
for (let w = 1; w < waves.length; w++) {
  const wave = waves[w];
  if (!wave || !wave.length) continue;
  log(
    "devmeta3: build wave " +
      w +
      " — " +
      wave.map((f) => f.name).join(", ") +
      " (parallel)",
  );
  const thunks = wave.map((f) => () => {
    const depBranches = (f.dependsOn || []).map(
      (d) => "feature/devmeta3-" + ITER + "-" + d,
    );
    const mergeCmds = [BASE]
      .concat(depBranches)
      .map((b) => "git merge " + b + " --no-edit")
      .join(" ; ");
    const prompt = [
      'You are a BUILD agent in the devmeta-3 engine, building feature "' +
        f.name +
        '" of iteration ' +
        ITER +
        ". You are in an ISOLATED WORKTREE.",
      "CRITICAL BASE: the harness branches your worktree from the repo DEFAULT branch, which LACKS this increment's prior work AND the sibling features you depend on (integrate merges feature branches LATER, not now — so they are NOT yet on the base). FIRST bring in everything you build against by running:  " +
        mergeCmds +
        "  — i.e. merge the increment base " +
        BASE +
        (depBranches.length
          ? " AND your dependency feature branch(es) " +
            JSON.stringify(depBranches) +
            " (built in an EARLIER wave, so they already exist as branches)"
          : "") +
        ". Then VERIFY the exact symbols you import from those features exist before building. Then create + commit on a branch named exactly: feature/devmeta3-" +
        ITER +
        "-" +
        f.name,
      "Scope: " + f.scope,
      "Your OWNED files (build ONLY these): " + JSON.stringify(f.ownedFiles),
      "INTEGRATION POINTS you must NOT touch (integrate wires them): " +
        JSON.stringify(integrationFiles) +
        ". Instead EXPORT whatever integrate needs (a component, a provider method, a schema object) from your own owned files.",
      "TESTS ARE MANDATORY. Your test obligations: " +
        JSON.stringify(f.testObligations) +
        ". For EACH obligation, WRITE a real test (its kind tells you the sort) in your owned files, then run  " +
        f.surgicalCmd +
        "  until green. devmeta rule applies: tests are your responsibility — write them, run them, fix them; never defer. You may NOT return an empty testsAdded, substitute typecheck for a test, or skip a test. If a test genuinely cannot run in the worktree (missing service), still WRITE it and say so in notes — do not delete or .skip it.",
      "Return testsAdded[] mapping each test {file,testName,coversBehavior} to a real obligation behavior, and paste the passing test-run tail into surgicalOutput (proof, not a claim).",
      'Capture learnings[]: anything non-obvious you discovered (scope:"project" for repo facts; scope:"engine" for things that should change the devmeta-3 workflow itself), each with a suggestedHome.',
      "Read the brief " +
        BRIEF +
        " and .devmeta/lessons-learned.md; mirror project conventions. Do NOT generate DB migrations (integrate owns the combined migration). Commit with git commit --no-verify (restore any hook-regenerated files). Return the structured result with the ACTUAL branch name.",
    ].join("\n");
    return agent(prompt, {
      schema: BUILD_SCHEMA,
      isolation: "worktree",
      label: "build:" + f.name,
      phase: "Build",
    });
  });
  const res = (await parallel(thunks)).filter(Boolean);
  for (const r of res) built.push(r);
}
const noTests = built.filter((b) => !(b.testsAdded || []).length);
if (noTests.length)
  log(
    "devmeta3: WARNING — features returned with NO testsAdded: " +
      noTests.map((b) => b.feature).join(", "),
  );

// =================== PHASE 3: INTEGRATE ===================
phase("Integrate");
log(
  "devmeta3: integrate — merge " +
    built.length +
    " branches in wave order + execute integration contract",
);
const orderedBranches = [];
for (let w = 1; w < waves.length; w++) {
  if (!waves[w]) continue;
  for (const f of waves[w]) {
    const b = built.find((x) => x.feature === f.name);
    if (b && b.branch) orderedBranches.push(b.branch);
  }
}
const integratePrompt = [
  "You are the INTEGRATE phase of the devmeta-3 engine. Run: git checkout " +
    BASE +
    "  first.",
  "Merge these feature branches into " +
    BASE +
    " IN THIS ORDER with git merge --no-ff --no-edit <branch>: " +
    JSON.stringify(orderedBranches) +
    ". Disjoint files -> clean merges; on conflict keep both sides' additions.",
  "EXECUTE THE INTEGRATION CONTRACT — edit each shared file per its contributions:",
  JSON.stringify(plan.integrationPoints, null, 0),
  "For each integration point, open the file and apply every listed contribution (import + wire the exported pieces). Keep edits minimal and idiomatic.",
  "If any feature changed the declarative DB schema, generate the combined migration and apply it. From .devmeta/lessons-learned.md: the diff tool may DROP view options (with security_invoker = on) and grants — re-add them in the generated migration. Do not hand-edit unrelated migrations.",
  "Clean up: git worktree remove --force each worktree under .claude/worktrees and git worktree prune; ensure .claude/worktrees/ is gitignored.",
  'Stage ONLY the integration files + migration you changed (never git add -A), then commit with git commit --no-verify -m "devmeta3 integrate iteration ' +
    ITER +
    '" (restore hook-regenerated files). Do NOT run the gate suite here (the Gate phase does).',
  "Capture learnings[] (wiring gotchas, migration-diff drops, etc.) with scope + suggestedHome. Return the structured integrate result with the head sha.",
].join("\n");
const integrate = await agent(integratePrompt, {
  schema: INTEGRATE_SCHEMA,
  label: "integrate:" + ITER,
  phase: "Integrate",
});

// =================== PHASE 4: GATE (parallel + coverage + bounded fix) ===================
phase("Gate");
const cmdGates = [
  { gate: "typecheck", cmd: T.typecheck },
  { gate: "unit", cmd: T.unit },
  { gate: "lint", cmd: T.lint },
  { gate: "migrate", cmd: T.migrateReset },
].filter((g) => g.cmd);
const allTestsAdded = built.flatMap((b) =>
  (b.testsAdded || []).map((t) => t.file),
);

async function runGates(roundLabel) {
  const cmdThunks = cmdGates.map(
    (g) => () =>
      agent(
        "You are a GATE agent in devmeta-3. On branch " +
          BASE +
          ", run EXACTLY this in the FOREGROUND and report: " +
          g.cmd +
          " . pass=true only if it succeeds with no errors (lint: ignore pre-existing repo-wide Prettier/CRLF noise, judge only ESLint errors; migrate: a trailing vector/ListVectorBuckets 404 is cosmetic). Put the last ~15 lines in output. gate=" +
          g.gate,
        {
          schema: GATE_SCHEMA,
          label: "gate:" + g.gate + roundLabel,
          phase: "Gate",
        },
      ),
  );
  const coverageThunk = () =>
    agent(
      [
        "You are the COVERAGE gate agent in devmeta-3 (this gate can FAIL the iteration — it verifies new code is tested, not just that the suite is green). On branch " +
          BASE +
          ":",
        "1. Compute the iteration source diff: git diff --name-only " +
          BASE +
          " (vs the merge-base with the repo default branch if needed) limited to NON-TEST source files added/changed this iteration.",
        "2. The tests authored this iteration are: " +
          JSON.stringify(allTestsAdded) +
          ". For EACH new/changed source file, confirm a test exercises it — prefer a real coverage tool if the project has one; else use file-correspondence (new src/foo.ts expects a test referencing foo). ",
        "3. pass=false if any new/changed source file has no covering test. List uncovered files in output. If you fell back to file-correspondence (no coverage tool), SAY SO in output (no silent caps).",
        "gate=coverage",
      ].join("\n"),
      {
        schema: GATE_SCHEMA,
        label: "gate:coverage" + roundLabel,
        phase: "Gate",
      },
    );
  return (await parallel(cmdThunks.concat([coverageThunk]))).filter(Boolean);
}

let gates = await runGates("");
let red = gates.filter((g) => !g.pass);
let fixRound = 0;
const fixLearnings = [];
while (red.length && fixRound < 2) {
  fixRound++;
  log(
    "devmeta3: " +
      red.length +
      " gate(s) red — fix round " +
      fixRound +
      ": " +
      red.map((g) => g.gate).join(", "),
  );
  const fixPrompt = [
    "You are a FIX agent in devmeta-3, iteration " +
      ITER +
      ", branch " +
      BASE +
      ". These gates FAILED:",
    red.map((g) => "### " + g.gate + "\n" + (g.output || "")).join("\n\n"),
    'Diagnose and FIX the root cause (do NOT weaken tests, skip checks, or delete source to satisfy coverage — add the missing tests instead). Re-run each failed command to confirm green. Commit with git commit --no-verify -m "devmeta3 fix iteration ' +
      ITER +
      " (round " +
      fixRound +
      ')" (restore hook-regenerated files). Capture learnings[] about what the failure taught (scope + suggestedHome). Report what you changed and the learnings.',
  ].join("\n");
  const fix = await agent(fixPrompt, {
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary"],
      properties: {
        summary: { type: "string" },
        learnings: { type: "array", items: LEARNING },
      },
    },
    label: "fix:r" + fixRound,
    phase: "Gate",
  });
  if (fix && fix.learnings) for (const l of fix.learnings) fixLearnings.push(l);
  gates = await runGates(":r" + fixRound);
  red = gates.filter((g) => !g.pass);
}
const gatesPass = red.length === 0;

// =================== PHASE 5: REFLECT (acceptance + test-quality + drift) ===================
phase("Reflect");
log(
  "devmeta3: reflect — acceptance(" +
    plan.acceptanceCriteria.length +
    ") + test-quality(" +
    built.length +
    ") + drift",
);
const acceptanceThunks = plan.acceptanceCriteria.map(
  (c) => () =>
    agent(
      "You are an ADVERSARIAL ACCEPTANCE SKEPTIC in devmeta-3 reflect. On branch " +
        BASE +
        ", REFUTE that this acceptance criterion for iteration " +
        ITER +
        ' is met IN THE CODE: "' +
        c +
        '". Read the actual impl/test files; cite file:line. pass=true ONLY if truly satisfied. If pass=false, CALIBRATE severity: "blocker" only if the criterion is genuinely unmet (real, demonstrable gap); "major" if substantially incomplete; "minor" if it is a nitpick OR you are not fully certain the gap is real (when uncertain, prefer minor — only major/blocker stops the run for a human; minor becomes queued cleanup). subject="acceptance: ' +
        c.slice(0, 60) +
        '". Return the verdict.',
      { schema: VERDICT_SCHEMA, label: "reflect:accept", phase: "Reflect" },
    ),
);
const testQualityThunks = built
  .filter((b) => (b.testsAdded || []).length)
  .map(
    (b) => () =>
      agent(
        'You are a TEST-QUALITY SKEPTIC in devmeta-3 reflect. Feature "' +
          b.feature +
          '" claims testsAdded: ' +
          JSON.stringify(b.testsAdded) +
          ". On branch " +
          BASE +
          ', READ those test files. REFUTE that they genuinely exercise the behavior: look for skipped/only/todo tests, vacuous/tautological assertions (expect(true)), mocks that stub the logic under test, or assertions that would pass against a no-op implementation. Cite test file:line. pass=true ONLY if the tests would FAIL against a broken implementation. If pass=false, CALIBRATE severity: "blocker"/"major" for a hollow, skipped, or tautological test of a real behavior (a genuine quality gap that must be fixed); "minor" for a style nit or a low-confidence concern (when uncertain, prefer minor — minor becomes queued cleanup, not a human stop). subject="test-quality: ' +
          b.feature +
          '". Return the verdict.',
        { schema: VERDICT_SCHEMA, label: "reflect:testq", phase: "Reflect" },
      ),
  );
const driftThunk = () =>
  agent(
    [
      "You are a CODE-DRIFT SKEPTIC in devmeta-3 reflect (this is the inside-out craftsmanship review). On branch " +
        BASE +
        ", read the iteration diff (git diff against the merge-base with the repo default branch, or the per-feature commits). Flag craftsmanship problems against THIS checklist:",
      "- deeply nested try/catch or error suppression; monkey-patching/runtime mutation; copy-pasted blocks with slight variations; config flags that only paper over bugs; TODO/HACK/FIXME/workaround comments; wrapper functions that only paper over a layer; patterns that do not match the codebase; excessive defensive coding; dependencies added for a problem that should not need one; tests that skip or assert too broadly.",
      "For each finding return {file, kind (from the checklist), severity (minor|major|blocker), why, fix}. Be concrete and cite paths. Empty findings is allowed if the diff is clean.",
    ].join("\n"),
    { schema: DRIFT_SCHEMA, label: "reflect:drift", phase: "Reflect" },
  );

const reflectResults = await parallel(
  acceptanceThunks.concat(testQualityThunks).concat([driftThunk]),
);
const verdicts = reflectResults
  .slice(0, acceptanceThunks.length + testQualityThunks.length)
  .filter(Boolean);
const driftResult = reflectResults[reflectResults.length - 1] || {
  findings: [],
};
const driftFindings = (driftResult && driftResult.findings) || [];

// Severity-graded reflect: a failed verdict (or drift finding) BLOCKS only if it is
// major/blocker; minor failures become queued cleanup (not a human stop). A failed
// verdict with no severity defaults to blocking (fail safe). This is v2.1's fix for
// "NEEDS_WORK is too binary" — a low-confidence/minor skeptic flag no longer stalls.
const isBlocking = (sev) => sev === undefined || sev === "blocker" || sev === "major";
const failedVerdicts = verdicts.filter((v) => !v.pass);
const blockingVerdicts = failedVerdicts.filter((v) => isBlocking(v.severity));
const minorVerdicts = failedVerdicts.filter((v) => !isBlocking(v.severity));
const driftBlocking = driftFindings.filter(
  (f) => f.severity === "blocker" || f.severity === "major",
);
const driftMinor = driftFindings.filter((f) => f.severity === "minor");
// cleanup queue (minor, shippable) vs blocking (real gap, human checkpoint)
const cleanupItems = minorVerdicts
  .map((v) => "reflect(minor): " + (v.subject || "") + " — " + (v.findings || []).join("; "))
  .concat(driftMinor.map((f) => "drift(minor): " + f.file + " — " + f.why + " | fix: " + f.fix));
const blocking = blockingVerdicts.length + driftBlocking.length;
const reflectClean = blocking === 0;
// three tiers: PASS (clean) | PASS_WITH_CLEANUP (gates green, only minor issues) | NEEDS_WORK (gates red or a real gap)
const outcome = !gatesPass || blocking > 0 ? "NEEDS_WORK" : cleanupItems.length ? "PASS_WITH_CLEANUP" : "PASS";
log(
  "devmeta3: gates=" +
    (gatesPass ? "GREEN" : "RED") +
    " blocking(verdict+drift)=" +
    blocking +
    " minor-cleanup=" +
    cleanupItems.length +
    " -> " +
    outcome,
);

// =================== PHASE 6: HARVEST (route learnings + memory + reassessment) ===================
phase("Harvest");
const allLearnings = [];
for (const b of built) for (const l of b.learnings || []) allLearnings.push(l);
for (const l of integrate.learnings || []) allLearnings.push(l);
for (const l of fixLearnings) allLearnings.push(l);
log(
  "devmeta3: harvest — routing " +
    allLearnings.length +
    " learning(s), narrative history, ia-cycle report" +
    (cleanupItems.length
      ? ", " + cleanupItems.length + " minor cleanup item(s)"
      : ""),
);
const harvestPrompt = [
  "You are the HARVEST phase of the devmeta-3 engine — the running-knowledge upgrade. cwd = project root, branch " +
    BASE +
    ". Today is " +
    TODAY +
    ". You have Edit/Write/Bash. iteration " +
    ITER +
    " outcome=" +
    outcome +
    ".",
  "INPUTS:",
  "- learnings (build+integrate+fix): " + JSON.stringify(allLearnings),
  "- drift findings: " + JSON.stringify(driftFindings),
  "- failed reflect verdicts: " +
    JSON.stringify(
      failedVerdicts.map((v) => ({ subject: v.subject, findings: v.findings })),
    ),
  "- gate outputs (tails): " +
    JSON.stringify(gates.map((g) => ({ gate: g.gate, pass: g.pass }))),
  "- tests authored: " +
    JSON.stringify(built.flatMap((b) => b.testsAdded || [])),
  "- remaining iterations: read " +
    DIR +
    "/_overview.md Iteration Map (rows not DONE).",
  "TASKS (write the files; you may commit with git commit --no-verify at the end):",
  "0. AUTHORITY (do NOT overstep): you may NOT mark the iteration DONE, and you may NOT change the top-level **Status:** line of _overview.md or any iteration's Status. The DONE/advance decision belongs to devmeta-3:go at the human gate (it reads this iteration's outcome=" +
    outcome +
    "). You ONLY: route knowledge to homes, write the narrative history + ia-cycle report, QUEUE minor cleanup onto the NEXT not-DONE iteration, and PROPOSE plan reassessment. Leave all status/DONE marking to go.",
  '1. ROUTE each learning + recurring gate/drift issue to its typed HOME and WRITE it there: CLAUDE.md Critical Rules (how agents should write code — would prevent a mistake at session start); docs/current/<file> (how the codebase works); docs/current/principles-and-choices.md (a decision proven wrong/nuanced — stamp "Updated ' +
    TODAY +
    ':"); docs/current/troubleshooting.md OR .devmeta/testing-notes.md (a recurring build/TEST failure — hit by >=2 features/iterations); .devmeta/lessons-learned.md (one-off gotcha); fix/delete an outdated doc. Engine-scope learnings (scope:"engine") go to .devmeta/engine-notes.md (things that should change the WORKFLOW, not the project) — flag any that are actually project-specific so the generic engine does not accrete this project\'s quirks.',
  "2. NARRATIVE history: append a short narrative paragraph to .devmeta/project-history.md for iteration " +
    ITER +
    " (what shipped + where agents struggled/surprised/exceeded — not just a one-liner), with head sha and gate results.",
  "3. IA-CYCLE report: write " +
    DIR +
    "/ia-cycles/iteration-" +
    ITER +
    ".md with: gate results, drift findings, gaps verified (failed verdicts), tests authored (obligations vs testsAdded), learnings routed (and to where), and any plan changes. Return this path as reportPath.",
  "4. MINOR cleanup -> next-iteration (minor reflect verdicts + minor drift): " +
    JSON.stringify(cleanupItems) +
    ". If non-empty, add them as explicit cleanup deliverables on the NEXT not-DONE iteration section in " +
    DIR +
    "/_overview.md (scope grows, never shrinks) — but do NOT mark the current iteration DONE (see task 0). List them in cleanupForNextIteration.",
  "5. PLAN REASSESSMENT: read the remaining (not-DONE) iterations; propose edits (split/merge/reorder/inject; absorbed-by-drift; missing prerequisite). PROPOSE in reassessment[] (one line each). Apply only low-risk reorders/injections directly to _overview.md; leave anything material for the human gate. Never shrink scope.",
  'Then: stage your doc changes (named paths only, never git add -A), git commit --no-verify -m "devmeta3 harvest iteration ' +
    ITER +
    '", restore registry.json if dirtied. Return the structured harvest result (filed[], reportPath, reassessment[], cleanupForNextIteration[], committed).',
].join("\n");
const harvest = await agent(harvestPrompt, {
  schema: HARVEST_SCHEMA,
  label: "harvest:" + ITER,
  phase: "Harvest",
});

log(
  "devmeta3 iteration " +
    ITER +
    " complete. outcome=" +
    outcome +
    "; harvested " +
    (harvest.filed || []).length +
    " item(s); reassessment " +
    (harvest.reassessment || []).length +
    " proposal(s)",
);
return {
  iteration: ITER,
  outcome,
  gatesPass,
  reflectClean,
  blocking,
  cleanupItems,
  plan,
  built,
  integrate,
  gates,
  verdicts,
  driftFindings,
  harvest,
};
