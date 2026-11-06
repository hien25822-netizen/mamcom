# Bug Fix: The order card did not show all five owner-mandated fields

**Slug**: order-card-system
**Date**: 2026-11-06

## Change Applied

**`index.html:1966` — `renderOrders(list)`** now renders every mandated
field on each `.ordercard`, in this order:

1. **Order ID** — `Mã đơn: MC20261106-144802` (`.ordercard__id`), plus a
   relative timestamp (`.ordercard__when`).
2. **Status** — a coloured badge (`.ordercard__badge` +
   `statusClass(o.status)`) reading `STATUS_VI[o.status]`, e.g.
   "Chờ xác nhận", with a colour variant per status
   (`.is-confirmed`, `.is-preparing`, `.is-done`, `.is-cancelled`).
3. **Customer fields** — rows for `Số người`, `Điện thoại`, `Địa chỉ`,
   `Ngày nhận` (date + time).
4. **Product list** — a `<ul class="ordercard__list">` under the
   `Món ăn` label, one `<li>` per dish in `o.products`.
5. **Schedule** — a `<div class="ordercard__sched">` under the `Lịch trình`
   label, one line per scheduled day:
   `week — range` / `day · date` / the dish names for that day.
6. **Notes** — a `Ghi chú` row carrying `o.note`.
7. **Total** — `.ordercard__total` (`196k`) in the card footer.
8. **Status selector** — an `<select class="ordercard__statusSel">` with the
   five statuses, rendered **only when the owner is unlocked**
   (`if(isOwner())`), so a visitor can read the status but not change it.

**`index.html:377-430` — new CSS** for `.orders`, `.orders__head`,
`.orders__list` (single column: `grid-template-columns:1fr`),
`.orders__empty`, `.ordercard` and its parts.

**No change** was made to `collectOrderContent` (index.html:1890) or
`submitOrder` (index.html:1915) — they already collected and stored
`products`, `schedule` and `note`. The fix is display-only, so the order
business logic is untouched.

## Why This Is The Root Cause

The data was never missing. `collectOrderContent` computed the product list
and the per-day schedule, `submitOrder` put them on the order object, and
`saveOrders` persisted them to `mamcom.orders.v1`. Only the renderer
ignored them, so the card displayed less than the record actually held.

## Files Touched

- `index.html` — `renderOrders` rendering + `.orders`/`.ordercard` CSS.

## Checks Required By The Fix

1. Place a real order; assert the card contains: the order ID, a status
   badge, a product list with the chosen dishes, a schedule with the day
   and the dishes, and the note.
2. Assert the card list is one column.
3. Assert the status selector is absent for a visitor and present for the
   owner, and that changing it updates the stored status.
4. Assert the order survives a reload (localStorage round-trip).
