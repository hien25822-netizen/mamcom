# Bug Assessment: The 20-second sync poll fires on schedule, but two shared values never reach other devices

**Slug**: real-time-sync
**Date**: 2026-11-06
**Severity**: high (owner-mandated constraint #5 — real-time sync across browsers/devices)

## Report

Owner-mandated: *"Real-time saving and synchronization must work correctly on
all browsers/devices."* The polling loop itself works, but two pieces of shared
state were not part of it, so a value changed on one device stayed invisible
on every other device until the page was reloaded.

## Symptom

- The owner changes the price in **Cài đặt chủ** on the shop tablet. Other
  phones keep showing the old price until they refresh the page manually.
- An order placed on device A shows its **Ngày nhận** (delivery date + time)
  on device A, but the same order on device B shows `Ngày nhận: —` because
  the date/time columns are never written to or read from the shared
  `orders` table.

## Reproduction

### Price

1. Device A (owner, PIN unlocked): open Cài đặt chủ → set the price to a new
   value → **Lưu giá**.
2. Device B: keep the page open for more than 60 s. The order total still
   shows the old price.
3. Device B: reload the page → the new price appears (proving the read path
   works, and that only the *push* was missing).

### Delivery date / time

1. Device A: fill the order form including **Ngày nhận** and **Giờ nhận**
   and submit. The card on device A shows `30/11 · 07:00`.
2. The row written to Supabase has no `date` / `time` columns at all —
   `sharedStore.saveOrder` (index.html:2606) does not send them.
3. `sharedStore.loadOrders` (index.html:2631) does not select them either, and
   `syncOrdersFromServer` (index.html:3043) does not copy them into the
   merged order. So on device B the row reads `Ngày nhận: —`.

## Suspected Code Paths

- `index.html:3030` — `syncAll()` — polls `loadServerState()`,
  `loadSharedMenu()` and `syncOrdersFromServer()` only. The shared price is
  read once at boot (`index.html:3000-3007`) and never again.
- `index.html:2606` — `sharedStore.saveOrder` — the insert omits
  `date` / `time`.
- `index.html:2631` — `sharedStore.loadOrders` — the select omits
  `date` / `time`.
- `index.html:3043` — `syncOrdersFromServer` — the merge omits
  `date` / `time`.

## Root Cause Hypothesis

The sync loop was written around three sources (counter, menu, orders) and the
two later additions — the owner-settable shared price and the delivery
date/time on the order — were never wired into it. The polling *mechanism* is
correct; the *coverage* was incomplete.

## Proposed Remediation

1. Add a `syncSharedPrice()` step to `syncAll()` so the shared price is
   re-read every cycle and applied to the total calculation.
2. Write `date` / `time` in `saveOrder`, select them in `loadOrders`, and
   merge them in `syncOrdersFromServer`; add the two columns to
   `supabase/schema.sql` (plus idempotent `alter table ... add column if not
   exists` for a database where `orders` already exists).

## Risks

- Low. The polling interval, the fallback behaviour and the business logic
  (6 fixed dishes, drag & drop, single column, order-card fields) are
  untouched. The price sync only *applies* the value when it differs, so it
  cannot fight the owner typing into the settings field.
- Adding two columns to `orders` requires the owner to run the DDL — the
  same owner action already outstanding in the `orders-table-missing` bug
  set.

## Open Questions

- None.
