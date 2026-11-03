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
  updated_at timestamptz not null default now()
);

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

-- state: anon can read + upsert the counter row. A read-modify-write upsert
-- fires both an INSERT and an UPDATE, so allow both (no ON CONFLICT clause in
-- policies — that's insert-statement syntax, not RLS syntax).
create policy "state anon read" on public.state
  for select to anon, public using (true);
create policy "state anon insert" on public.state
  for insert to anon, public with check (true);
create policy "state anon update" on public.state
  for update to anon, public using (true) with check (true);

-- comments: anon can read + insert; delete is allowed (owner flow) —
-- keep the delete open to anon so the existing ✕ button works without auth.
create policy "comments anon read" on public.comments
  for select to anon, public using (true);
create policy "comments anon insert" on public.comments
  for insert to anon, public with check (true);
create policy "comments anon delete" on public.comments
  for delete to anon, public using (true);

-- dishes: anon can read + upsert the 6 slots (separate INSERT + UPDATE
-- policies; the app upserts with onConflict=slot, so a row insert OR
-- conflict-update must both succeed).
create policy "dishes anon read" on public.dishes
  for select to anon, public using (true);
create policy "dishes anon insert" on public.dishes
  for insert to anon, public with check (slot between 1 and 6);
create policy "dishes anon update" on public.dishes
  for update to anon, public using (slot between 1 and 6) with check (slot between 1 and 6);

-- ============================================================
-- Storage — dish-images bucket (public read, anon upload)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('dish-images', 'dish-images', true)
on conflict (id) do nothing;

create policy "dish-images public read" on storage.objects
  for select to anon, public
  using (bucket_id = 'dish-images');
create policy "dish-images anon upload" on storage.objects
  for insert to anon, public
  with check (bucket_id = 'dish-images' and (owner is null));

-- ============================================================
-- Seed — shared counter starts at 27; first two reviews.
-- (Idempotent: only inserts if absent.)
-- ============================================================
insert into public.state (key, value) values ('meals', '27')
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
