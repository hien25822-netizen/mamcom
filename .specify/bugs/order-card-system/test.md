# Bug Test: The order card did not show all five owner-mandated fields

**Slug**: order-card-system
**Date**: 2026-11-06
**Result**: verified

## Checks Performed

- Order ID on the card — **passed**: `.ordercard__id` reads
  `Mã đơn: MC20261106-144802`.
- Status on the card — **passed**: `.ordercard__badge` reads
  `Chờ xác nhận` (first status of `STATUS_VI`).
- Product list — **passed**: `Món ăn` row lists
  `Thịt rang cháy cạnh & Canh rau muống` and `Cải cuộn thịt`, i.e. the
  two dishes that were dragged onto the plan.
- Schedule — **passed**: `Lịch trình` row reads
  `Thứ 2 02/11 — Thịt rang cháy cạnh & Canh rau muống, Cải cuộn thịt`,
  i.e. the weekday, the date and the dishes for that day.
- Notes — **passed**: `Ghi chú` row reads `Ghi chú thử`, the text typed in
  the form.
- All seven label rows present, in order — **passed**:
  `["Số người","Điện thoại","Địa chỉ","Ngày nhận","Món ăn","Lịch trình","Ghi chú"]`.
- Field values populated — **passed**:
  `Số người=2 người`, `Điện thoại=0901234567`, `Địa chỉ=123 Test`,
  `Ngày nhận=30/11 · 07:00`, `Ghi chú=Ghi chú thử`.
- Total rendered — **passed**: `.ordercard__total` reads `196k`.
- Single-column list — **passed**: `.orders__list` computes to 1 grid track
  (verified together with the `single-column-layout` bug set).
- Owner-only status selector — **passed**: `statusSelPresent:false` for a
  visitor; the `<select class="ordercard__statusSel">` is rendered only
  behind `isOwner()` (index.html:1966). The owner PIN was unlocked in the
  same session and the selector appeared in the owner panel.
- Order survives a reload — **passed**: `stored:1` — the record round-trips
  through `mamcom.orders.v1` and `renderOrders` redraws it.
- No regression on the submit path — **passed**: `collectOrderContent`
  (index.html:1890) and `submitOrder` (index.html:1915) were not modified
  by this fix; the card renders what they already stored.

## Output Excerpts

```text
{"id":"Mã đơn: MC20261106-144802","badge":"Chờ xác nhận",
 "labels":["Số người","Điện thoại","Địa chỉ","Ngày nhận","Món ăn","Lịch trình","Ghi chú"],
 "products":["Thịt rang cháy cạnh & Canh rau muống","Cải cuộn thịt"],
 "schedule":["Thứ 2 02/11 — Thịt rang cháy cạnh & Canh rau muống, Cải cuộn thịt"],
 "total":"196k","statusSelPresent":false}

{"rows":["Số người=2 người","Điện thoại=0901234567","Địa chỉ=123 Test",
 "Ngày nhận=30/11 · 07:00","Món ăn=","Lịch trình=","Ghi chú=Ghi chú thử"],
 "stored":1}
```

## Residual Risks

- The test order was created locally in the preview (localStorage +
  the `orders` REST endpoint), never published to the live shared
  `dishes` table, so no test data reached real visitors.
- The `orders` table does not exist in the live Supabase project yet, so
  the shared half of this feature is still pending the owner running the
  DDL in `supabase/schema.sql` — see the `orders-table-missing` bug set.

## Recommendation

No further action on the card. Run the `orders` DDL so the orders also
sync across devices.
