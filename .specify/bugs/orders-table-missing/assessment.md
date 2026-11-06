# Bug Assessment: The `orders` table does not exist in the live database, so orders never sync across devices

**Slug**: orders-table-missing
**Date**: 2026-11-06
**Severity**: blocking (for cross-device order sharing; the app itself still works locally)

## Report

The order-card system (owner-mandated constraint #4) stores each customer's
order locally in `localStorage` and pushes it to Supabase via
`sharedStore.saveOrder`. The live database was found to have no `orders`
table: PostgREST answers every `GET /rest/v1/orders` with **HTTP 404**.

## Symptom

A customer places an order on their phone. On the owner's other device the
order does not appear. The customer sees their own order card; the owner
sees nothing. The browser network log shows:

```text
GET https://sdlpldhldyyytkbpujdk.supabase.co/rest/v1/orders?... → 404
```

repeating on every sync cycle. The `syncOrdersFromServer` fetch is wrapped in
`.catch(function(){ /* bảng orders chưa tồn tại — giữ bản local */ })`
(index.html:3064), so the page does not break — the failure is silent, which
is exactly why it went unnoticed.

## Reproduction

1. Open the app with Supabase reachable (the production configuration).
2. Place an order through the order form → `✓ Đã tạo đơn MC…`, the card
   renders locally from `mamcom.orders.v1`.
3. Observe the network panel: `GET /rest/v1/orders` returns **404**.
4. The insert (`POST /rest/v1/orders`) also fails for the same reason.

## Suspected Code Paths

- `index.html:2602` — `sharedStore.saveOrder` → `SUPABASE.from("orders").insert(...)`.
- `index.html:2627` — `sharedStore.loadOrders` → `SUPABASE.from("orders").select(...)`.
- `index.html:3026-3064` — `syncOrdersFromServer` → the failing GET, swallowed by `.catch`.
- `supabase/schema.sql:49-66` — the `public.orders` DDL, which exists in the
  repo but was never applied to the live project.

## Root Cause Hypothesis

The `orders` table was added to the codebase as part of the order-card
feature, but the migration was never applied to the live Supabase project.
The sandbox has no Supabase access token, so `supabase db push` cannot run
from here; the DDL ships in `supabase/schema.sql` for the owner to execute.

Secondary issue: the 404 is swallowed by a bare `.catch`, so the failure is
invisible to the owner. The comment in the catch block does document the
known cause, so this is a deliberate, understandable choice — but the
underlying missing table is a real gap.

## Proposed Remediation

1. Owner runs the `public.orders` DDL and its RLS policies from
   `supabase/schema.sql` (lines 49-66 and 106-114) in the Supabase SQL
   editor. This is the actual fix; it cannot be applied from the sandbox
   (no access token, no network egress to the Supabase management API).
2. Verify the app stops seeing the 404 and that a newly placed order
   appears on a second device.

## Risks

- The anon key is a publishable key and the RLS policies for `orders` are
  best-effort (see the note at `supabase/schema.sql:69-73`): anyone holding
  the anon key can insert or update an order. This matches the pre-existing
  `server.py` design, which had no authentication at all, so it is not a
  regression — but the owner should know that order rows are not private.
- Until the DDL is run, orders remain device-local. No data is lost (the
  local copy persists), but nothing is shared.

## Open Questions

- Whether the owner wants real authentication on the `orders` table before
  launch. Out of scope for this fix; recorded for the owner.
