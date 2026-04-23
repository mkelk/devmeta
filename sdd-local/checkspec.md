---
description: Validate a specification document against the codebase and best practices
argument-hint: [spec-file-path]
---

## Context

- Today's date: !`date +%Y-%m-%d`
- Spec file: $ARGUMENTS

## Your Task

You are validating a specification document to ensure it's well-defined and implementable. Follow these steps:

### Step 1: Locate the Spec File

Specs live in subdirectories of `/docs/projects/` following the pattern:
`/docs/projects/<date>-<project-name>/<date>-<project-name>-spec.md`

If no spec file path was provided (`$ARGUMENTS` is empty):

1. List available spec directories in `/docs/projects/` (folders matching `YYYY-MM-DD-*/`)
2. Look for `*-spec.md` files within those directories
3. Ask the user which spec to validate:
   > Which specification would you like me to validate? [list the available specs, or provide a path]

### Step 2: Read and Parse the Spec

Read the specification file thoroughly. Identify:
- The stated goals and requirements
- Any technical decisions or assumptions made
- Referenced files, modules, or systems
- Proposed changes or additions

### Step 3: Codebase Analysis

Explore the relevant parts of the codebase to check for:

#### 3a. Technical Consistency
- Do referenced files/modules actually exist?
- Are the described APIs, functions, or interfaces accurate?
- Does the spec use correct naming conventions matching the codebase?

#### 3b. Technology Alignment
- Does the spec propose technologies already in use, or new ones?
- If new technologies, are there conflicts with existing choices?
- Are there existing patterns in the codebase the spec should follow?

#### 3c. Architecture Fit
- Does the proposed design fit the existing architecture?
- Are there existing utilities or components that should be reused?
- Does it follow established patterns in the codebase?

#### 3d. Testing Strategy

**This is critical.** Before implementation begins, the spec must define how the changes will be verified. Review the project's existing test infrastructure by checking `/docs/current/test.md`, `package.json` scripts, and existing test files.

Evaluate whether the spec adequately addresses:

- **Testing approach per feature area:** How will each major aspect of the spec be tested? (unit tests, integration tests, manual verification, E2E tests)
- **What needs automated tests:** Which parts require new automated tests vs. can rely on existing tests?
- **What needs manual testing:** Which parts require manual verification and what should be checked?
- **Edge cases and error scenarios:** How will failure modes and edge cases be verified?
- **Regression prevention:** How will we ensure existing functionality isn't broken?

The spec does NOT need to list every individual test case. It DOES need to describe:
- The overall testing approach for each major component/feature
- Which testing tools/frameworks to use (based on what exists in the project)
- Any test data or fixtures needed
- How to verify the implementation is complete

**If the testing strategy is weak or missing:**
- Mark this as a **Critical** issue
- Challenge the user directly:
  > The spec lacks a clear testing strategy. Before implementation, we need to define:
  > - How will [feature X] be tested?
  > - What manual verification is needed for [feature Y]?
  > - Are there edge cases that need specific test coverage?
  >
  > A spec without a testing strategy leads to untested code or ad-hoc testing that misses important scenarios.

### Step 4: Environment Health Check

Before marking a spec as ready, verify the codebase is in a healthy state:

1. Check `/docs/current/` for environment validation commands
2. If validation docs exist, note them in the report
3. If validation docs are missing, flag this as a gap

This ensures implementation won't be blocked by pre-existing issues.

### Step 5: Gap Analysis

Identify any gaps that could cause implementation uncertainty:
- Undefined edge cases or error handling
- Missing details about data flow or state management
- Unclear integration points with existing code
- Ambiguous requirements that need clarification
- Missing environment validation documentation in `/docs/current/`
- **Inadequate or missing testing strategy** (see 3d above)

### Step 6: Report Findings

Present a structured validation report:

```markdown
## Spec Validation Report: <spec-name>

**Validated:** <today's date>
**Status:** [READY | NEEDS REVISION | BLOCKED]

### Summary
[1-2 sentence overall assessment]

### Consistency Check
- [ ] Referenced files exist
- [ ] APIs/interfaces are accurate
- [ ] Naming conventions match codebase

### Technology Alignment
- [ ] Uses existing tech stack appropriately
- [ ] No conflicts with current choices
- [ ] Follows established patterns

### Environment Validation
- [ ] `/docs/current/` contains validation commands
- [ ] Validation commands documented in this report (or flagged as missing)

### Testing Strategy
- [ ] Spec defines testing approach for each major feature area
- [ ] Clear distinction between automated vs. manual testing needs
- [ ] Edge cases and error scenarios addressed
- [ ] Testing tools/frameworks identified (using project's existing infrastructure)

**Testing Assessment:** [ADEQUATE | NEEDS WORK | MISSING]

[If not adequate, list what's missing and challenge the user to define it]

### Issues Found

#### Critical (Must Fix)
[List issues that would block implementation]

#### Warnings (Should Address)
[List issues that could cause problems]

#### Suggestions (Nice to Have)
[List improvements that would strengthen the spec]

### Missing Information
[List any gaps that need clarification before implementation]

### Recommendations
[Specific next steps to make the spec implementation-ready]
```

### Step 7: Offer Next Steps

After presenting the report, ask:
> Would you like me to:
> 1. Update the spec with fixes for the issues found?
> 2. Explore any specific concern in more detail?
> 3. Create follow-up tasks for unresolved items?
