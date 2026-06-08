export const meta = {
  name: "devmeta3-drive-iteration",
  description:
    "devmeta-3 generic iteration engine: plan -> parallel build -> integrate (merge+wire) -> parallel gates (+bounded fix) -> adversarial reflect -> gate. One control plane (the workflow journal); no tk.",
  phases: [
    {
      title: "Plan",
      detail:
        "derive feature partition + integration contract + acceptance from the spec",
    },
    {
      title: "Build",
      detail: "one agent per feature per wave, isolated worktrees",
    },
    {
      title: "Integrate",
      detail: "merge in wave order + execute integration contract + migration",
    },
    {
      title: "Gate",
      detail: "parallel typecheck/test/lint/migrate, bounded fix loop",
    },
    {
      title: "Reflect",
      detail: "parallel adversarial skeptics vs acceptance criteria",
    },
  ],
};

// ---------------------------------------------------------------------------
// RUNTIME FORM: `export const meta` + this TOP-LEVEL body. devmeta-3:go replaces
// the INLINE POINT line below with a concrete `const input = {...}` literal at launch
// (the `args` parameter is not reliably delivered to workflows, so go never relies on it).
//
// input shape:
//   { increment, iteration, baseBranch, incrementDir, briefPath,
//     test: { typecheck, unit, lint, migrateReset } }
// ---------------------------------------------------------------------------
const input = typeof args === "object" && args ? args : {}; // <<< INLINE POINT — devmeta-3:go replaces THIS entire line with: const input = { increment, iteration, baseBranch, incrementDir, briefPath, test: {...} }

const BASE = input.baseBranch;
const ITER = input.iteration;
const DIR = input.incrementDir;
const BRIEF = input.briefPath || "(no brief; use the increment _overview)";
const T = input.test || {};

// ----- schemas -----
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
          "surgicalTest",
        ],
        properties: {
          name: { type: "string" },
          wave: { type: "integer" },
          dependsOn: { type: "array", items: { type: "string" } },
          scope: { type: "string" },
          ownedFiles: { type: "array", items: { type: "string" } },
          surgicalTest: { type: "string" },
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
const BUILD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["feature", "branch", "committed", "status"],
  properties: {
    feature: { type: "string" },
    branch: { type: "string" },
    committed: { type: "boolean" },
    headSha: { type: "string" },
    status: { type: "string", enum: ["ok", "partial", "failed"] },
    surgicalTest: { type: "string" },
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
  required: ["criterion", "pass", "findings"],
  properties: {
    criterion: { type: "string" },
    pass: { type: "boolean" },
    severity: { type: "string", enum: ["none", "minor", "major", "blocker"] },
    findings: { type: "array", items: { type: "string" } },
  },
};

// =================== PHASE 1: PLAN (derive the partition + integration contract) ===================
phase("Plan");
log(
  "devmeta3: planning iteration " +
    ITER +
    " — deriving partition + integration contract from the spec",
);
const planPrompt = [
  "You are the PLAN phase of the devmeta-3 engine. Repo cwd is the project root, base branch " +
    BASE +
    ".",
  "Read these for scope: " +
    DIR +
    "/_overview.md (the section for iteration " +
    ITER +
    ', its deliverables and "Verify on screen"), the brief ' +
    BRIEF +
    ", .devmeta/lessons-learned.md, .devmeta/devmeta.md, and CLAUDE.md/AGENTS.md. Inspect the codebase enough to choose real file paths and mirror existing conventions.",
  "Partition iteration " +
    ITER +
    " into INDEPENDENT features under these NON-NEGOTIABLE constraints:",
  "- Maximize the parallel frontier (fewer, wider waves). Wave-1 features have dependsOn [].",
  "- WRITE-WRITE INVARIANT: no file may be in two features' ownedFiles. If a file must be touched by >1 feature, it is an INTEGRATION POINT — do NOT put it in any feature; instead each feature EXPORTS its piece in its own owned file, and you record the wiring in integrationPoints.",
  "- Extract shared types/schema/config into a wave-1 foundation feature that the others depend on.",
  "- Each feature must fit comfortably in one agent session (~200k context). Split larger; merge trivial.",
  'INTEGRATION CONTRACT: integrationPoints is the list of shared files the integrate phase (not the build agents) will edit. For each, list contributions = which feature contributes what change (e.g. {feature:"x", change:"register <Resource name=...> in CRM.tsx"} or {feature:"y", change:"wire <Widget/> into Dashboard.tsx"} or {feature:"z", change:"add fakerest lifecycle callback + getList branch"}). Be specific enough that integrate can execute it without re-deriving scope.',
  'ACCEPTANCE: lift the iteration\'s "Verify on screen" bullets into acceptanceCriteria (the bar reflect will attack). Each must be checkable.',
  'Give every feature a SURGICAL test command (a single fast unit test for its core logic; if a feature is pure UI/schema with no unit, use "' +
    (T.typecheck || "npm run typecheck") +
    '").',
  "Output ONLY the structured manifest. Do NOT write any code or files in this phase.",
].join("\n");
const plan = await agent(planPrompt, {
  schema: MANIFEST_SCHEMA,
  label: "plan:" + ITER,
  phase: "Plan",
});

// group features into waves
const waves = [];
for (const f of plan.features) {
  const w = f.wave || 1;
  if (!waves[w]) waves[w] = [];
  waves[w].push(f);
}
const integrationFiles = plan.integrationPoints.map((p) => p.file);
log(
  "devmeta3: plan = " +
    plan.features.length +
    " features across " +
    waves.filter(Boolean).length +
    " wave(s); " +
    plan.integrationPoints.length +
    " integration point(s); " +
    plan.acceptanceCriteria.length +
    " acceptance criteria",
);

// =================== PHASE 2: BUILD (parallel per wave, isolated worktrees) ===================
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
    const prompt = [
      'You are a BUILD agent in the devmeta-3 engine, building feature "' +
        f.name +
        '" of iteration ' +
        ITER +
        ". You are in an ISOLATED WORKTREE.",
      "CRITICAL BASE: the harness branches your worktree from the repo DEFAULT branch, which may LACK this increment's prior work. FIRST run: git merge " +
        BASE +
        " --no-edit  and verify the foundation it depends on is present. Then create + commit on a branch named exactly: feature/devmeta3-" +
        ITER +
        "-" +
        f.name,
      "Scope: " + f.scope,
      "Your OWNED files (build ONLY these): " + JSON.stringify(f.ownedFiles),
      "INTEGRATION POINTS you must NOT touch (the integrate phase wires them): " +
        JSON.stringify(integrationFiles) +
        ". Instead, EXPORT whatever the integrate phase needs to wire (a component, a provider method, a schema object) from your own owned files.",
      "Read the brief " +
        BRIEF +
        ", .devmeta/lessons-learned.md, and mirror existing project conventions. Do NOT generate DB migrations (integrate owns the combined migration).",
      "Run your surgical test ( " +
        f.surgicalTest +
        " ) until green if it resolves; note it if tooling is unavailable in the worktree. Commit with git commit --no-verify (restore any hook-regenerated files afterward). Return the structured result with the ACTUAL branch name.",
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

// =================== PHASE 3: INTEGRATE (merge in wave order + execute the integration contract) ===================
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
    " IN THIS ORDER (wave/dependency order) with git merge --no-ff --no-edit <branch>: " +
    JSON.stringify(orderedBranches) +
    ". Features own disjoint files so merges should be clean; if a conflict appears, keep both sides' additions.",
  "Then EXECUTE THE INTEGRATION CONTRACT — edit each shared file per its contributions:",
  JSON.stringify(plan.integrationPoints, null, 0),
  "For each integration point, open the file and apply every listed contribution (import + wire the exported pieces the build agents created). Keep edits minimal and consistent with existing patterns.",
  "If any feature changed the declarative DB schema, generate the combined migration with ( " +
    (T.migrateReset
      ? "the project migration-diff command"
      : "the project migration tooling") +
    " ) and apply it. IMPORTANT (from .devmeta/lessons-learned.md): the diff tool may DROP view options like `with (security_invoker = on)` and grants — re-add them to the generated migration. Do not hand-edit unrelated migrations.",
  "Clean up: git worktree remove --force each worktree under .claude/worktrees and git worktree prune; ensure .claude/worktrees/ is gitignored.",
  'Stage ONLY the integration files + migration you changed (never git add -A), then commit with git commit --no-verify -m "devmeta3 integrate iteration ' +
    ITER +
    '" (restore any hook-regenerated files). Do NOT run the full gate suite here (the Gate phase does that).',
  "Return the structured integrate result with the head sha.",
].join("\n");
const integrate = await agent(integratePrompt, {
  schema: INTEGRATE_SCHEMA,
  label: "integrate:" + ITER,
  phase: "Integrate",
});

// =================== PHASE 4: GATE (parallel) + bounded fix loop ===================
phase("Gate");
const gateDefs = [
  { gate: "typecheck", cmd: T.typecheck },
  { gate: "unit", cmd: T.unit },
  { gate: "lint", cmd: T.lint },
  { gate: "migrate", cmd: T.migrateReset },
].filter((g) => g.cmd);

async function runGates(roundLabel) {
  const thunks = gateDefs.map(
    (g) => () =>
      agent(
        "You are a GATE agent in the devmeta-3 engine. On branch " +
          BASE +
          ", run EXACTLY this command in the FOREGROUND and report the result: " +
          g.cmd +
          " . Set pass=true only if it succeeds with no errors (for lint, pre-existing repo-wide Prettier/CRLF failures are NOT your concern — judge only ESLint errors; for migrate, the trailing vector/ListVectorBuckets 404 is a cosmetic CLI error, not a failure). Put the last ~15 lines in output. Read-only except running the command. gate label: " +
          g.gate,
        {
          schema: GATE_SCHEMA,
          label: "gate:" + g.gate + roundLabel,
          phase: "Gate",
        },
      ),
  );
  return (await parallel(thunks)).filter(Boolean);
}

let gates = await runGates("");
let red = gates.filter((g) => !g.pass);
let fixRound = 0;
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
    "You are a FIX agent in the devmeta-3 engine, iteration " +
      ITER +
      ", on branch " +
      BASE +
      ". The following gates FAILED:",
    red.map((g) => "### " + g.gate + "\n" + (g.output || "")).join("\n\n"),
    'Diagnose and FIX the root cause across the merged code (do not weaken tests or skip checks). Re-run each failed command to confirm green. Commit the fix with git commit --no-verify -m "devmeta3 fix iteration ' +
      ITER +
      " (round " +
      fixRound +
      ')" (restore hook-regenerated files). Report what you changed.',
  ].join("\n");
  await agent(fixPrompt, { label: "fix:r" + fixRound, phase: "Gate" });
  gates = await runGates(":r" + fixRound);
  red = gates.filter((g) => !g.pass);
}

// =================== PHASE 5: REFLECT (adversarial skeptics vs acceptance) ===================
phase("Reflect");
log(
  "devmeta3: reflect — " +
    plan.acceptanceCriteria.length +
    " adversarial skeptics",
);
const verdictThunks = plan.acceptanceCriteria.map(
  (c) => () =>
    agent(
      "You are an ADVERSARIAL SKEPTIC in the devmeta-3 reflect phase. On branch " +
        BASE +
        ", REFUTE that this acceptance criterion for iteration " +
        ITER +
        ' is genuinely met IN THE CODE: "' +
        c +
        '". Read the actual implementation/test files; cite file:line. Set pass=true ONLY if the criterion is truly satisfied by code you read (not by assumption). Return the structured verdict.',
      { schema: VERDICT_SCHEMA, label: "reflect", phase: "Reflect" },
    ),
);
const verdicts = (await parallel(verdictThunks)).filter(Boolean);
const gaps = verdicts.filter((v) => !v.pass);
const gatesPass = red.length === 0;

log(
  "devmeta3 iteration " +
    ITER +
    " done. gates=" +
    (gatesPass ? "GREEN" : "RED") +
    " reflect=" +
    (gaps.length === 0 ? "CLEAN" : gaps.length + " gap(s)"),
);
return {
  iteration: ITER,
  plan,
  built,
  integrate,
  gates,
  verdicts,
  gatesPass,
  reflectClean: gaps.length === 0,
  outcome: gatesPass && gaps.length === 0 ? "PASS" : "NEEDS_WORK",
};
