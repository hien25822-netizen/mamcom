# Bug Test: The `orders` table does not exist in the live database, so orders never sync across devices

**Slug**: orders-table-missing
**Date**: 2026-11-06
**Result**: partial

## Checks Performed

- Root cause confirmed in the live database — **passed**: every
  `GET /rest/v1/orders` in the production configuration returns **404**,
  while `GET /rest/v1/comments`, `/rest/v1/state` and `/rest/v1/dishes` in
  the same sync cycle return **200**. The app builds the correct URL and
  sends the correct anon key, so the failure is the missing table, not the
  client.
- The DDL is present and correct in the repo — **passed**:
  `supabase/schema.sql:49-66` (`create table if not exists public.orders`
  with `id/status/people/phone/address/note/products/schedule/total/
  visitor_id/created_at` + `orders_created_at_idx`) and lines 106-114 (the
  four RLS policies).
- Column names match the client — **passed**: `sharedStore.saveOrder`
  (index.html:2602) and `syncOrdersFromServer` (index.html:3026-3064)
  address exactly `id, status, people, phone, address, note, products,
  schedule, total, created_at` plus `visitor_id`.
- The app survives the missing table — **passed**: with the 404 present,
  the local order card still renders and the page keeps working (the
  `.catch` at index.html:3064 keeps the local copy). Verified in the
  browser: 1 order stored in `mamcom.orders.v1`, 1 `.ordercard` rendered,
  badge "Chờ xác nhận", total "196k".
- The table is created and the order appears on a second device — **skipped**:
  this requires applying the DDL to the live project. The sandbox has no
  Supabase access token and no egress to the Supabase management API, so
  `supabase db push` cannot run here. This step is an **owner action**.

## Output Excerpts

```text
# production config, one sync cycle
GET .../rest/v1/state?select=value&key=...      → 200
GET .../rest/v1/dishes?select=slot,name,emoji,img&order=slot.asc → 200
GET .../rest/v1/orders?select=id,status,people,phone,address,note,products,schedule,total,created_at&order=created_at.desc&limit=50 → 404
GET .../rest/v1/comments?select=id,rating,text,ts,name&order=ts.desc,id.desc → 200

# local order still fine
{"stored":1,"cards":1,"firstId":"MC20261106-144802",
 "labels":["Số người","Điện thoại","Địa chỉ","Ngày nhận","Món ăn","Lịch trình","Ghi chú"],
 "hasBadge":"Chờ xác nhận","hasTotal":"196k"}
```

## Residual Risks

- **Orders are not shared between devices until the owner runs the DDL.**
  Until then every order lives only in the browser that placed it. No data
  is lost, but the owner will not see incoming orders on other devices.
- The `orders` RLS policies are best-effort: with only a publishable anon
  key, anyone can insert or update any order row. This mirrors the
  pre-existing `server.py` behaviour (no auth at all) and is not a
  regression, but it should be an informed decision before launch.
- The `add-comment` edge function still needs
  `supabase functions deploy add-comment` for the `name` field to appear in
  the refreshed comment list.

## Recommendation

Owner action, then re-run this test:

1. Supabase → SQL editor → run the `public.orders` DDL + RLS from
   `supabase/schema.sql` (lines 49-66 and 106-114).
2. Redeploy the edge function: `supabase functions deploy add-comment`.
3. Re-run `/speckit-bug-test slug=orders-table-missing` to confirm
   `GET /rest/v1/orders` returns 200 and a new order appears on a second
   device within one 20-second sync cycle.
