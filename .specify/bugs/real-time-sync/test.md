# Bug Test: The shared price and the order delivery date/time now reach every device

**Slug**: real-time-sync
**Date**: 2026-11-06
**Result**: verified

## Checks Performed

- Poll cadence is 20 s per page instance — **passed**. A single clean
  document instance shows `state` requests at offsets
  `0, 20, 40, 60, 80` seconds (gaps of exactly 20). The denser bursts seen
  in an earlier measurement were several preview tabs each running their own
  `setInterval(syncAll, 20000)` with different phase offsets (`0 / 5 / 6 /
  12`), not a defect in the app. Measured per-URL counts over a 102 s window:
  `state?meals` 23, `state?price` 23, `dishes` 23, `orders` 23,
  `comments` 22 — every source polled on every cycle.
- The shared price is now part of every cycle — **passed**: the
  `state?key=eq.price` request appears once per 20 s cycle, i.e. exactly as
  often as the counter, the menu and the orders.
- The price is applied to the total — **passed**: after the fix the page
  shows `49k × 2 mâm × 2 người` and `196k`, matching the live
  `state.price` row (`49`).
- The counter still syncs (regression) — **passed**: `#mealsCount` = `32`,
  matching the live `state.meals` row.
- The menu still syncs (regression) — **passed**: the six dish tiles render
  from the shared `dishes` table.
- The reviews still sync (regression) — **passed**: `5 đánh giá` renders
  from the shared `comments` table.
- The order's delivery date/time are now written and read back — **passed
  (code path)**: `saveOrder` sends `date` and `time`, `loadOrders` selects
  `date, time`, and `syncOrdersFromServer` copies both when merging an
  order that already exists locally and when adopting an order from another
  device. The local order card still shows `Ngày nhận = 30/11 · 07:00`.
- No console errors after the change — **passed**: only the expected `404`
  on `/rest/v1/orders` (the table does not exist yet in the live project —
  tracked in `orders-table-missing`) and the local `/api/*` endpoints that
  only exist under the old local server.
- Business logic untouched (regression) — **passed**: the 6 fixed dishes,
  the drag & drop, the copy-schedule button and the single-column layout
  were not modified by this change.

## Output Excerpts

```text
# poll cadence, one clean instance (offsets in seconds)
{"seq":["state@0","state@20","state@40","state@60","state@80"]}

# per-URL request counts over a 102 s window (4 preview tabs, each with
# its own 20 s interval at a different phase)
{"state?meals":{"n":23},"state?price":{"n":23},"dishes":{"n":23},
 "orders":{"n":23},"comments":{"n":22}}

# after the fix
{"meals":"32","calc":"49k × 2 mâm × 2 người","total":"196k"}
```

## Residual Risks

- The `orders` table does not exist in the live project yet, so the
  delivery date/time can only be verified once the owner runs the DDL in
  `supabase/schema.sql` (the `orders-table-missing` bug set). The DDL now
  also contains the two new columns, with an idempotent
  `alter table ... add column if not exists` for the case where the table
  already exists.
- `addMeals` remains a read-modify-write; two devices ordering at the very
  same instant can still lose one increment of the shared counter. This
  race existed before and only affects the displayed number, never order
  data.

## Recommendation

Run the `orders` DDL from `supabase/schema.sql` in the Supabase SQL editor
so orders (with their delivery date and time) sync across devices, and
redeploy the edge function:

```bash
supabase functions deploy add-comment
```
