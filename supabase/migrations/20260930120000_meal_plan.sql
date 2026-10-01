-- ============================================================
-- BiteInsight — Meal plan schema
-- Phase 1: the planner (day + slot entries, "eaten" log).
-- The glucose layer (Dexcom readings, computed responses) is a
-- later phase and will hang off meal_plan_entries.eaten_at.
-- ============================================================

-- ── meal_plan_entries ──────────────────────────────────────
-- One row per thing planned into a slot on a day. An entry is
-- either a recipe (recipe_id) or a single product (product_snapshot,
-- same shape as recipe_ingredients.product_snapshot).
--
-- title / image_url / nutriscore_grade / nutrition are captured at
-- plan time so a logged meal stays readable if the recipe is later
-- edited or deleted. While the recipe still exists the client
-- prefers its live values.
create table if not exists public.meal_plan_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,

  plan_date         date not null,               -- the user's local calendar day
  slot              text not null
                      check (slot in ('breakfast', 'lunch', 'snack', 'dinner')),
  position          int not null default 0,      -- order within the slot

  kind              text not null check (kind in ('recipe', 'product')),

  -- Recipe entries
  recipe_id         uuid references public.recipes(id) on delete set null,
  servings          numeric not null default 1 check (servings > 0),

  -- Product entries
  barcode           text,
  scan_id           uuid references public.scans(id) on delete set null,
  quantity_value    numeric,
  quantity_unit     text
                      check (quantity_unit in ('g', 'ml', 'unit', 'pack', 'tbsp', 'tsp', 'cup')),
  product_snapshot  jsonb,

  -- Denormalised display + nutrition for the planned portion
  --   nutrition: { "kcal": 485, "fat_g": 12, "sat_fat_g": 3, "carbs_g": 58,
  --                "sugars_g": 4, "fiber_g": 6, "protein_g": 38, "salt_g": 1.1 }
  title             text not null,
  image_url         text,
  nutriscore_grade  text,
  nutrition         jsonb not null default '{}'::jsonb,

  -- Set when the user taps "Eating now". Null = still just planned.
  eaten_at          timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint meal_plan_entries_product_has_snapshot
    check (kind <> 'product' or product_snapshot is not null)
);

create index if not exists meal_plan_entries_user_date_idx
  on public.meal_plan_entries (user_id, plan_date);
create index if not exists meal_plan_entries_recipe_id_idx
  on public.meal_plan_entries (recipe_id)
  where recipe_id is not null;

-- ── Auto-update updated_at ─────────────────────────────────
create or replace function public.handle_meal_plan_entry_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meal_plan_entries_updated_at on public.meal_plan_entries;
create trigger meal_plan_entries_updated_at
  before update on public.meal_plan_entries
  for each row execute function public.handle_meal_plan_entry_updated();

-- ── Row Level Security ─────────────────────────────────────
alter table public.meal_plan_entries enable row level security;

drop policy if exists "Users can view own meal plan" on public.meal_plan_entries;
create policy "Users can view own meal plan"
  on public.meal_plan_entries for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own meal plan" on public.meal_plan_entries;
create policy "Users can insert own meal plan"
  on public.meal_plan_entries for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own meal plan" on public.meal_plan_entries;
create policy "Users can update own meal plan"
  on public.meal_plan_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own meal plan" on public.meal_plan_entries;
create policy "Users can delete own meal plan"
  on public.meal_plan_entries for delete
  using (auth.uid() = user_id);

-- Realtime so the planner refreshes when an entry is added from
-- another screen (recipe detail, scan result) or another device.
do $$
begin
  alter publication supabase_realtime add table public.meal_plan_entries;
exception
  when duplicate_object then null;
  when undefined_object then null;
end;
$$;

comment on table public.meal_plan_entries is
  'Meal planner entries: one row per recipe or product planned into a day + slot. eaten_at is the "eating now" log that the future glucose layer keys off.';
