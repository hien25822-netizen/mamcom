# Bug Assessment: sharedStore.getPrice returns a non-Promise in local mode, aborting the boot script

**Slug**: getprice-promise-contract
**Date**: 2026-11-06
**Severity**: blocking (when Supabase is unavailable/unconfigured)

## Report

While auditing the `sharedStore` object (index.html:2428-2655) for return-type
consistency, it was found that `getPrice` violates the interface every other
`sharedStore` method honours: all 13 public methods return a Promise on both
their Supabase branch and their local fallback branch, except `getPrice`,
whose local branch returned a plain value.

## Symptom

With `USE_SUPABASE` false (or Supabase unreachable and the caller's branch
taking the local fallback), the boot-time call

    sharedStore.getPrice().then(function(n){...})      // index.html:2997

throws `TypeError: Cannot read properties of null (reading 'then')` because
`getPrice` returned `null` (no local price stored) or a number. The throw
aborts the rest of the boot script, violating Constitution Principle III
("Backend Is Optional, Never Required").

Reproduced in-browser: with a test copy that nulls `SUPABASE`, the console
reported `Uncaught TypeError: Cannot read properties of null (reading
'then')` at line 2997 and the harness hook inserted just before `startSync()`
was never installed, proving the boot script aborted.

## Reproduction

1. Force the no-Supabase path (temporarily `SUPABASE = null` in a local test copy).
2. Open the page; localStorage has no `mamcom.price`.
3. `getPrice` (index.html:2466-2468) returns `null` (plain value, not a Promise).
4. Caller at index.html:2996-2997 does `.then(...)` on it → TypeError, boot script dies.

## Suspected Code Paths

- `index.html:2458` — `getPrice: function(){` declaration.
- `index.html:2466-2468` — local-mode branch `return isFinite(v) && v > 0 ? v : null;` (plain value).
- `index.html:2996-2997` — caller `sharedStore.getPrice().then(...)`, expects a Promise.

All 12 other `sharedStore` methods (`loadState`, `savePrice`, `addMeals`,
`addComment`, `deleteComment`, `loadMenu`, `saveMenu`, `saveOrder`,
`updateOrderStatus`, `loadOrders`, `uploadImage`) were audited and return
Promises on both branches — `getPrice` was the only inconsistency.

## Root Cause Hypothesis

The local fallback was written to mirror a synchronous `localStorage` read
and returned the raw value; the Promise contract of the Supabase branch was
not preserved.

## Proposed Remediation

Wrap the local return in `Promise.resolve(...)` at index.html:2468 so both
branches return a Promise. One-line change, no other files touched.

Verification: re-run the no-Supabase reproduction in the browser; the boot
script must complete (a marker installed just before `startSync()` is
reachable) and no TypeError must appear.

## Risks

- Callers of `.then` on the result are unchanged; only the missing Promise
  wrapper is added. Negligible risk.

## Open Questions

- None.
