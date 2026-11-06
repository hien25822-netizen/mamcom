# Bug Assessment: The order card did not show all five owner-mandated fields

**Slug**: order-card-system
**Date**: 2026-11-06
**Severity**: degraded (constraint #4 partially satisfied before the fix)

## Report

Owner-mandated constraint #4 is verbatim: *"Cards MUST show: order ID,
status, product list, schedule, and notes."* The original order card was a
compact summary that showed the order ID and a status label, but did not
render the product list, the per-day schedule, or the customer's note.

## Symptom

After placing an order, the card in the orders panel showed only the order
number, a status pill and a relative timestamp. The customer could not see
what they had ordered, on which days, or the note they had typed — and the
owner could not see them either.

## Reproduction

1. Fill in the order form (name/people, phone, address, date, time, note)
   and drag at least one dish onto a day.
2. Submit → `✓ Đã tạo đơn MC…`.
3. The rendered `.ordercard` had no product list, no schedule block and no
   note row.

## Suspected Code Paths

- `index.html:1966` — `renderOrders(list)` — builds each `.ordercard`; it
  rendered only the top row (id, badge, timestamp) plus a short summary.
- `index.html:1890` — `collectOrderContent()` — already computed
  `products` (unique dish names) and `schedule` (per-day entries) but the
  data was never put on the card.
- `index.html:1915` — `submitOrder()` — already stored `products`,
  `schedule` and `note` on the order object.
- `index.html:377-430` — the `.orders` / `.ordercard` CSS block.

## Root Cause Hypothesis

`collectOrderContent` was written to collect the product list and the
schedule into the order record, and `submitOrder` persisted them, but
`renderOrders` never rendered them back. The data was present in
localStorage the whole time; only the display was missing.

## Proposed Remediation

Extend `renderOrders` to render, for each order: order ID, status badge,
product list, per-day schedule, note, customer fields, total, and a status
selector for the owner. Add the `.orders` / `.ordercard` CSS (single
column). Reuse the data `collectOrderContent` already produces — no change
to the business logic of collecting or storing orders.

Verification: place a real order and assert the card contains all five
mandated fields.

## Risks

- `.ordercard__row` uses a 74 px label column plus a value column. This is
  a label/value row *within* one card, not two columns of cards, so it does
  not conflict with the single-column card rule.
- Adding a status `<select>` per card adds a control the visitor can
  change; it is owner-gated (the owner panel is the only place the status
  is edited) — see `fix.md` for how it is guarded.

## Open Questions

- None.
