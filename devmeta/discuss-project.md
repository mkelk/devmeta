---
description: Discuss a project (global) — open exploration of how it could be carried out, precursor to start-increment-spec
argument-hint: [discussion-topic]
---

## Project Context

Read `.devmeta/devmeta.md` from the project root if it exists. It provides
project-specific test commands, environment checks, and additional rules.

If no `.devmeta/devmeta.md` exists:
- Testing: look for `package.json` test scripts
- Environment: skip checks
- Additional rules: none

---

## Context

- Today's date: !`date +%Y-%m-%d`
- Discussion topic argument: $ARGUMENTS

## Purpose

Start an **open discussion** about how a specific project could be carried out. Use this
when the project's content or execution path is **not yet clear** — when the question is
still "how *could* we do this?" rather than "what exactly are we building?". The output is
a durable thinking document under `docs/thoughts/`, not a spec.

This is the precursor to `/devmeta:start-increment-spec`:

| Command | Use when |
|---------|----------|
| `/devmeta:discuss-project` | Content or approach still unclear — explore options, surface questions, converge on a direction |
| `/devmeta:start-increment-spec` | Work well understood — write the scoped increment spec |

A discussion produces no code, no branches, no ticks — only the document (plus any
supporting resources) in `docs/thoughts/`.

## Your Task

### Step 1: Frame the discussion

From `$ARGUMENTS` (or by asking the user), establish:

1. **What** project or idea is under discussion
2. **What's unclear** — the content (what should it do?), the execution (how do we build
   it?), or both
3. **What a good outcome looks like** — a chosen direction? a set of options for a human
   decision? a go/no-go? enough clarity to write the increment spec?

Choose a short kebab-case slug for the topic — call it `<slug>` for the rest of this
command. **Check `docs/thoughts/` for an existing discussion on this topic first** (any
date prefix): if one exists, resume it — reread it, pick up its open questions — instead
of starting a new document.

### Step 2: Ground the discussion — docs first, then source

An opinion is only worth having here if it's grounded. Before discussing:

1. **Read the project docs.** Base your understanding on `docs/current/` where it exists —
   the overview, glossary/conventions, and the full project docs for everything the
   discussion touches — plus any rules in `.devmeta/devmeta.md`.
2. **Identify the repos that matter.** Determine which repos are important to understand
   for this discussion (in multi-repo mode: propose candidates from the project docs and
   dependency maps, confirm the set with the user). For each, check it is available
   locally and reasonably current. If one is missing, ask the user whether to clone it or
   proceed docs-only — and record that gap as an open question in the document.
3. **Explicitly inspect those repos.** Docs orient; code is truth. Confirm the specific
   facts the discussion rests on (objects, flows, integrations, extension points) against
   the actual source before presenting options built on them.

### Step 3: Create the discussion artifact

**Default — a single document:**

```
docs/thoughts/<YYYY-MM-DD>-<slug>.md
```

**When extra resources are involved** (screenshots, graphics, specs downloaded from
elsewhere, data exports, etc) — make a folder instead and put everything in it:

```
docs/thoughts/<YYYY-MM-DD>-<slug>/
  _discussion.md          # the main document
  <resource files...>     # screenshots, graphics, downloaded specs, ...
```

Start as a single document unless resources are already on the table. If resources show
up mid-discussion, convert: create the folder, move the document into it as
`_discussion.md`, add the resources alongside.

Document template:

```markdown
# Discussion — <Topic>

**Started:** <YYYY-MM-DD>
**Status:** OPEN | PARKED | CONCLUDED — <direction / handoff>

## What we're trying to figure out

<The unclarity from Step 1 — what question(s) this discussion exists to answer>

## Background

<What we know, from docs/current/ and from inspecting the repos — with the load-bearing
facts confirmed against source. Note which repos were inspected.>

## Options considered

### Option A — <name>

<Sketch of the approach, what it touches, pros/cons, risks, open unknowns>

### Option B — <name>

...

## Open questions

- [ ] <Question — and who/what can answer it>

## Resources

<Links, or files placed alongside this document in the folder form>

## Emerging direction

<Where the discussion is converging — may be empty early on>

## Next steps

<Concrete follow-ups; when concluded, typically:
`/devmeta:start-increment-spec "<title>"` — link this discussion from the spec>
```

### Step 4: Discuss

Run an open, interactive dialogue with the user. This is a conversation, not a form:

- Contribute grounded substance: propose options with real trade-offs based on what the
  repos actually contain, challenge assumptions, estimate rough size/risk of each path.
- Ask the questions that reduce uncertainty fastest; park the ones only others can
  answer under **Open questions**.
- Capture resources the user brings (or that you fetch) into the folder form as needed.
- **Update the document continuously** — the document is the record of the discussion,
  not a summary written at the end. It must stand on its own when read weeks later.

### Step 5: Pause or conclude

A discussion doesn't have to finish in one sitting — set **Status** accordingly:

- **OPEN** — actively being discussed; re-running this command on the topic resumes it.
- **PARKED** — waiting on answers to open questions; note what unblocks it.
- **CONCLUDED** — direction chosen. Fill in **Emerging direction** and **Next steps**;
  the normal handoff is `/devmeta:start-increment-spec "<title>"`, and the increment spec
  should link back to this document.

Report:

```markdown
## Discussion — <Topic> (<STATUS>)

**Document:** `docs/thoughts/<YYYY-MM-DD>-<slug>.md` (or `.../<YYYY-MM-DD>-<slug>/_discussion.md`)
**Repos inspected:** <list, or "none yet">
**Direction:** <one line, or "still open">
**Open questions:** <N>
**Next:** <resume discussion / answer open questions / `/devmeta:start-increment-spec "<title>"`>
```
