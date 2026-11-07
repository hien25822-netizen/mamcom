-- Mâm Cơm — Supabase schema
-- Run this once in Supabase → SQL editor (or: supabase db push via a migration).
-- All public access uses the anon key + RLS below. No Supabase Auth required.

-- ============================================================
-- Tables
-- ============================================================

-- Shared meal counter (single row, key='meals').
create table if not exists public.state (
  key   text primary key,
  value text not null
);

-- Shared reviews (kept forever, no auto-purge).
-- `name` is optional (the reviewer may skip it); kept short.
create table if not exists public.comments (
  id     bigint generated always as identity primary key,
  rating int  not null check (rating between 1 and 5),
  text   text not null check (char_length(text) between 1 and 500),
  ts     bigint not null default (extract(epoch from now())::bigint),
  name   text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists comments_ts_id_idx on public.comments (ts desc, id desc);

-- For an ALREADY-LIVE database that predates the `name` column:
-- add it if missing (idempotent, safe to re-run). The create-table above
-- covers fresh installs; this covers the migration path.
alter table public.comments add column if not exists name text not null default '';

-- Per-device anti-spam window for comments (enforced by the edge function).
create table if not exists public.rate_limits (
  visitor_id text primary key,
  last_ts    bigint not null
);

-- Shared dish menu: exactly 6 rows, one per slot.
create table if not exists public.dishes (
  slot       int primary key check (slot between 1 and 6),
  name       text not null check (char_length(trim(name)) between 1 and 80),
  emoji      text not null default '🍽️',
  img        text not null default '',   -- empty, a data:URL, or a Storage public URL
  description text not null default '',  -- mô tả ngắn, hiện khi khách chạm ảnh món
  updated_at timestamptz not null default now()
);

-- Orders placed by customers (thẻ đơn hàng).
-- `products` = danh sách món đã chọn; `schedule` = lịch trình theo ngày.
create table if not exists public.orders (
  id          text primary key,
  status      text not null default 'pending'
                check (status in ('pending','confirmed','preparing','done','cancelled')),
  people      text not null default '',
  phone       text not null default '',
  address     text not null default '',
  note        text not null default '',
  date        text not null default '',   -- ngày nhận (yyyy-mm-dd)
  time        text not null default '',   -- giờ nhận (hh:mm)
  products    jsonb not null default '[]'::jsonb,
  schedule    jsonb not null default '[]'::jsonb,
  total       int  not null default 0,
  visitor_id  text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- For an ALREADY-CREATED orders table that predates the date/time columns:
-- add them if missing (idempotent, safe to re-run).
alter table public.orders add column if not exists date text not null default '';
alter table public.orders add column if not exists time text not null default '';

-- ============================================================
-- RLS — anon key gets what it needs; owner actions are limited to
-- what the app exposes (delete comment, write menu/counter).
-- NOTE: the owner gate in the app is client-side (localStorage PIN),
-- so RLS here is best-effort; anyone holding the anon key can run
-- these. That matches the existing server.py, which had no auth.
-- ============================================================
alter table public.state    enable row level security;
alter table public.comments enable row level security;
alter table public.dishes   enable row level security;
alter table public.orders   enable row level security;

-- Mỗi policy được XOÁ trước rồi tạo lại, để file này chạy lại nhiều lần
-- không báo lỗi "policy already exists".
-- state: anon can read + upsert the counter row. A read-modify-write upsert
-- fires both an INSERT and an UPDATE, so allow both (no ON CONFLICT clause in
-- policies — that's insert-statement syntax, not RLS syntax).
drop policy if exists "state anon read" on public.state;
create policy "state anon read" on public.state
  for select to anon, public using (true);
drop policy if exists "state anon insert" on public.state;
create policy "state anon insert" on public.state
  for insert to anon, public with check (true);
drop policy if exists "state anon update" on public.state;
create policy "state anon update" on public.state
  for update to anon, public using (true) with check (true);

-- comments: anon can read + insert; delete is allowed (owner flow) —
-- keep the delete open to anon so the existing ✕ button works without auth.
drop policy if exists "comments anon read" on public.comments;
create policy "comments anon read" on public.comments
  for select to anon, public using (true);
drop policy if exists "comments anon insert" on public.comments;
create policy "comments anon insert" on public.comments
  for insert to anon, public with check (true);
drop policy if exists "comments anon delete" on public.comments;
create policy "comments anon delete" on public.comments
  for delete to anon, public using (true);

-- dishes: anon can read + upsert the 6 slots (separate INSERT + UPDATE
-- policies; the app upserts with onConflict=slot, so a row insert OR
-- conflict-update must both succeed).
drop policy if exists "dishes anon read" on public.dishes;
create policy "dishes anon read" on public.dishes
  for select to anon, public using (true);
drop policy if exists "dishes anon insert" on public.dishes;
create policy "dishes anon insert" on public.dishes
  for insert to anon, public with check (slot between 1 and 6);
drop policy if exists "dishes anon update" on public.dishes;
create policy "dishes anon update" on public.dishes
  for update to anon, public using (slot between 1 and 6) with check (slot between 1 and 6);

-- orders: anon can read + insert their own order; owner can update status.
drop policy if exists "orders anon read" on public.orders;
create policy "orders anon read" on public.orders
  for select to anon, public using (true);
drop policy if exists "orders anon insert" on public.orders;
create policy "orders anon insert" on public.orders
  for insert to anon, public with check (true);
drop policy if exists "orders anon update" on public.orders;
create policy "orders anon update" on public.orders
  for update to anon, public using (true) with check (true);
drop policy if exists "orders anon delete" on public.orders;
create policy "orders anon delete" on public.orders
  for delete to anon, public using (true);

-- ============================================================
-- Storage — dish-images bucket (public read, anon upload)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do nothing;

drop policy if exists "dish-images public read" on storage.objects;
create policy "dish-images public read" on storage.objects
  for select to anon, public
  using (bucket_id = 'dish-images');
drop policy if exists "dish-images anon upload" on storage.objects;
create policy "dish-images anon upload" on storage.objects
  for insert to anon, public
  with check (bucket_id = 'dish-images' and (owner is null));

-- ============================================================
-- Seed — shared counter starts at 23; first two reviews.
-- (Idempotent: only inserts if absent.)
-- ============================================================
insert into public.state (key, value) values ('meals', '23')
  on conflict (key) do nothing;

-- Default 6 dishes (match the app's DEFAULT_DISHES) so a fresh install
-- shows the menu immediately even before the owner customises it.
insert into public.dishes (slot, name, emoji, img) values
  (1, 'Gà chiên mắm',       '🍗', ''),
  (2, 'Cải cuộn thịt',      '🥬', ''),
  (3, 'Canh chua cá',       '🍲', ''),
  (4, 'Nấm xào tỏi',        '🍄', ''),
  (5, 'Đậu hũ nhồi thịt',   '🧆', ''),
  (6, 'Bò kho',             '🥘', '')
on conflict (slot) do nothing;

insert into public.comments (rating, text, ts) values
  (5, 'Ngon đó',                     1793634271),
  (4, 'Ngon, sạch sẽ, phần ăn vừa đủ.', 1793635324)
on conflict do nothing;
