# Bug Fix: The `orders` table does not exist in the live database, so orders never sync across devices

**Slug**: orders-table-missing
**Date**: 2026-11-06

## Change Applied

**Source code: none.** The code is correct; the database schema is missing.
The DDL for `public.orders` (columns, index, RLS) is already present and
staged in `supabase/schema.sql` (lines 49-66) together with its RLS
policies (lines 106-114). The fix is an **owner action**, because the
sandbox has no Supabase access token and no egress to the Supabase
management API:

```sql
create table if not exists public.orders (
  id          text primary key,
  status      text not null default 'pending'
                check (status in ('pending','confirmed','preparing','done','cancelled')),
  people      text not null default '',
  phone       text not null default '',
  address     text not null default '',
  note        text not null default '',
  products    jsonb not null default '[]'::jsonb,
  schedule    jsonb not null default '[]'::jsonb,
  total       int  not null default 0,
  visitor_id  text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
alter table public.orders enable row level security;
create policy "orders anon read"    on public.orders for select to anon, public using (true);
create policy "orders anon insert"  on public.orders for insert to anon, public with check (true);
create policy "orders anon update"  on public.orders for update to anon, public using (true) with check (true);
```

Run it in: Supabase project `sdlpldhldyyytkbpujdk` → **SQL editor** → paste
→ Run.

No `index.html` change is required: `sharedStore.saveOrder`/`loadOrders`
(index.html:2602, 2627) and `syncOrdersFromServer` (index.html:3026-3064)
already target the exact column names in the DDL.

## Why This Is The Root Cause

PostgREST only returns `404` for a table that is not exposed in the
schema cache; the app's own REST client built the correct URL and the
correct anon key. Every `GET /rest/v1/orders` returned 404 while every
`GET /rest/v1/comments` in the same cycle returned 200 — the difference is
entirely that `comments` exists in the database and `orders` does not.

## Files Touched

- `supabase/schema.sql` — already contained the DDL (staged in a previous
  session; re-checked this session, lines 49-66 and 106-114). No edit.
- `index.html` — no edit. The 404-swallowing `.catch` at index.html:3064
  was reviewed and kept: once the table exists the 404 disappears, and
  keeping the catch preserves the local-only fallback for Principle III.

## Checks Required By The Fix

1. `GET /rest/v1/orders` returns 200 with an (initially empty) array.
2. `POST /rest/v1/orders` for a new order returns 201; the row appears in
   the Supabase table editor.
3. A second device (second browser session) shows the order within one
   sync cycle (20 s).
4. The 404 entries in the network log stop.

## Owner Action Required

Also: the `add-comment` edge function in
`supabase/functions/add-comment/index.ts` was fixed in a previous session
(`.select("id, rating, text, ts, name")`) and still needs a redeploy:

```bash
supabase functions deploy add-comment
```

until then, comments posted through the function lack the `name` field in
the response list.
