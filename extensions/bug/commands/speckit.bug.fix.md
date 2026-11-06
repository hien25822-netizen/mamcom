---
description: "Apply the remediation from an assessment and write .specify/bugs/<slug>/fix.md"
---

# Fix Bug

Apply the remediation described in an existing bug assessment, then record what changed.

## Input

```text
$ARGUMENTS
```

May contain `slug=<slug>` or a path to the bug directory.

## Prerequisite

`BUG_DIR/assessment.md` MUST exist. If it does not, stop and tell the user to run
`/speckit-bug-assess` first.

If `BUG_DIR/fix.md` already exists, confirm before overwriting.

## Steps

1. Read `BUG_DIR/assessment.md` completely.
2. Read every file the remediation names, in full, before editing.
3. Apply the **smallest** change that resolves the root cause. Keep the change inside
   the project workspace.
4. Add or update a regression check where one is meaningful (for this repo: an
   assertion in the browser, a check in `supabase/schema.sql`, or a documented manual
   verification step — there is no automated test runner).
5. Run the relevant local checks that do not require network access to the backend.
   Do not run destructive or network-dependent commands without consent.

## Guardrails

- Do NOT edit `assessment.md`.
- Do NOT delete files that are not part of the fix.
- Do NOT modify anything outside the workspace.
- Do NOT claim a check passed unless you actually ran it and saw the output.

## Output

Write `BUG_DIR/fix.md`:

```markdown
# Bug Fix: <title>

**Slug**: <slug>
**Date**: <YYYY-MM-DD>
**Status**: <applied|partial|not-applied>

## Changes
- `path:line` — what changed and why

## Diff Highlights
<the meaningful before/after>

## Tests
- <check> — <result>

## Local Verification
<how the user or a reviewer can confirm>

## Deviations
<anything done differently from the assessment, and why>

## Follow-ups
- ...
```

## Hooks

Run any `before_bug_fix` / `after_bug_fix` hooks registered in `.specify/extensions.yml`.

## Final response

Report the slug, the report path, and the status. Suggest:
`/speckit-bug-test slug=<BUG_SLUG>`
