# Mâm Cơm Constitution

## Core Principles

### I. Single-File Deployment
The production app is `index.html` — one file containing markup, styles and logic. No
build step, no bundler, no framework runtime.

**Why**: the site is hosted as static files on Vercel; a build step adds a failure mode
for a non-technical owner who cannot debug it.

**How to apply**: never introduce a `package.json`, a bundler, or a required external
asset. Assets may live in `assets/`, but the app must still work when opened directly.

### II. Business Logic Is Frozen
The five owner-mandated rules are non-negotiable and must survive every refactor:

1. Meal-plan customisation stays minimal — no extra features beyond what exists.
2. Exactly six fixed dishes, full drag-and-drop, plus a "copy schedule" button.
3. UI cards render as a **single vertical column** on desktop AND mobile.
4. Every order card shows: order ID, status, product list, schedule, and notes.
5. Real-time saving/synchronisation works correctly across browsers and devices.

**How to apply**: before changing layout or behaviour, check it against this list. A
change that improves one card type but breaks the single-column rule is a regression.

### III. Backend Is Optional, Never Required
The app must remain fully usable when Supabase is unreachable or a table is missing.
The owner gate (PIN) is client-side, best-effort only.

**How to apply**: every network call has a `catch`/`fallback` path; a 404 from
PostgREST degrades to local-only behaviour rather than a broken page.

### IV. Evidence Over Claims
No change is reported as fixed without an observed check: a browser verification, a
command's actual output, or a cited `file:line`.

**How to apply**: the Spec Kit bug cycle is the reporting format — assessment, fix,
test — and a `verified` result requires the reproduction to have actually been run.

## Additional Constraints

- Vietnamese-language UI copy; the owner reads Vietnamese, not English.
- No emoji in code comments; emoji in UI chrome only where the owner already used them.
- `supabase/schema.sql` is the source of truth for the database. Schema changes ship as
  SQL in that file for the owner to run; the sandbox cannot push migrations.

## Development Workflow

1. Assess (`/speckit-bug-assess`) — no source edits, evidence with `file:line`.
2. Fix (`/speckit-bug-fix`) — smallest change, fix report written.
3. Test (`/speckit-bug-test`) — reproduction re-run, result `verified|partial|failed`.
4. Repeat until verified.

## Governance

This constitution supersedes other practices. Amendments require the owner's approval and
a note in the commit that introduces them.

**Version**: 1.0.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-06
