-- Mealkit Prep & Assembly System Schema
-- Created on 2026-11-13

-- 1. Create prep_ingredients
create table if not exists public.prep_ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  unit text not null default 'g',
  category text not null default 'Rau củ',
  default_prep text not null default '',
  created_at timestamptz not null default now()
);

-- 2. Create prep_recipes
create table if not exists public.prep_recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null default '',
  category text not null default 'Món chính',
  description text not null default '',
  servings_base int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create prep_recipe_ingredients
create table if not exists public.prep_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.prep_recipes(id) on delete cascade,
  ingredient_id uuid not null references public.prep_ingredients(id) on delete restrict,
  quantity numeric(10,2) not null check (quantity > 0),
  unit text not null default 'g',
  prep_instruction text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_prep_recipe_ing_recipe on public.prep_recipe_ingredients(recipe_id);
create index if not exists idx_prep_recipe_ing_ingredient on public.prep_recipe_ingredients(ingredient_id);

-- 4. Create prep_orders
create table if not exists public.prep_orders (
  id uuid primary key default gen_random_uuid(),
  order_date date not null default current_date,
  tray_number int not null,
  customer_name text not null default '',
  customer_phone text not null default '',
  special_notes text not null default '',
  status text not null default 'pending' check (status in ('pending', 'prepping', 'ready', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_prep_orders_date_tray on public.prep_orders(order_date, tray_number);

-- 5. Create prep_order_items
create table if not exists public.prep_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.prep_orders(id) on delete cascade,
  recipe_id uuid not null references public.prep_recipes(id) on delete restrict,
  quantity int not null default 1 check (quantity > 0),
  item_notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists idx_prep_order_items_order on public.prep_order_items(order_id);

-- 6. Create prep_order_checklist
create table if not exists public.prep_order_checklist (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.prep_orders(id) on delete cascade,
  ingredient_id uuid not null references public.prep_ingredients(id) on delete restrict,
  recipe_id uuid references public.prep_recipes(id) on delete set null,
  total_quantity numeric(10,2) not null check (total_quantity > 0),
  unit text not null default 'g',
  prep_instruction text not null default '',
  is_batch_prepped boolean not null default false,
  is_assembled boolean not null default false,
  issue_type text not null default '' check (issue_type in ('', 'missing', 'substituted', 'custom')),
  issue_note text not null default '',
  assembled_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_prep_checklist_order on public.prep_order_checklist(order_id);
create index if not exists idx_prep_checklist_ingredient on public.prep_order_checklist(ingredient_id);

-- Enable RLS
alter table public.prep_ingredients enable row level security;
alter table public.prep_recipes enable row level security;
alter table public.prep_recipe_ingredients enable row level security;
alter table public.prep_orders enable row level security;
alter table public.prep_order_items enable row level security;
alter table public.prep_order_checklist enable row level security;

-- Policies for anon & authenticated
create policy "prep_ingredients_all" on public.prep_ingredients for all using (true) with check (true);
create policy "prep_recipes_all" on public.prep_recipes for all using (true) with check (true);
create policy "prep_recipe_ingredients_all" on public.prep_recipe_ingredients for all using (true) with check (true);
create policy "prep_orders_all" on public.prep_orders for all using (true) with check (true);
create policy "prep_order_items_all" on public.prep_order_items for all using (true) with check (true);
create policy "prep_order_checklist_all" on public.prep_order_checklist for all using (true) with check (true);
