---
description: "Verify a previously fixed bug and write .specify/bugs/<slug>/test.md"
---

# Bug Test

Validate that a fixed bug is actually resolved, and record the verification.

## Input

```text
$ARGUMENTS
```

May contain `slug=<slug>`.

## Prerequisite

`BUG_DIR/assessment.md` AND `BUG_DIR/fix.md` MUST exist. If either is missing, stop and
tell the user which command to run first.

If `BUG_DIR/test.md` already exists, confirm before overwriting.

## Steps

1. Read `BUG_DIR/assessment.md` and `BUG_DIR/fix.md` completely.
2. Re-run the **original reproduction** from the assessment.
3. Run the fix-specific checks and the regression checks named in `fix.md`.
4. Run any further local checks that are relevant and available (there is no automated
   test runner in this repo; browser verification via the preview tools is the primary
   evidence).
5. Classify the outcome:
   - `verified` — the original reproduction no longer reproduces AND no regression was
     introduced. A `verified` result requires the reproduction to have actually been
     performed.
   - `partial` — the symptom is improved but something remains, or a required check
     could not be run.
   - `failed` — the symptom still reproduces, or a regression appeared.

## Guardrails

- Do NOT modify source code during testing.
- Do NOT report `verified` if the reproduction was not actually performed.

## Output

Write `BUG_DIR/test.md`:

```markdown
# Bug Test: <title>

**Slug**: <slug>
**Date**: <YYYY-MM-DD>
**Result**: <verified|partial|failed>

## Checks Performed
- <check> — <passed|failed|skipped> (<why skipped>)

## Output Excerpts
<the relevant evidence>

## Residual Risks
- ...

## Recommendation
<what happens next>
```

## Hooks

Run any `before_bug_test` / `after_bug_test` hooks registered in `.specify/extensions.yml`.

## Final response

Report the slug, the report path, and the result. If the result is `failed`, recommend
re-running `/speckit-bug-assess` with the new evidence.
