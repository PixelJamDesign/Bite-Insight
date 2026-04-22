-- ============================================================
-- BiteInsight — Recipes feature schema
-- Phase 1: My Recipes (user-created recipes from scan history)
-- ============================================================

-- ── recipes ────────────────────────────────────────────────
-- One row per user-created recipe. Nutrition totals are
-- denormalised on write (computed by the client or a DB
-- function) so list views don't need to scan every ingredient.
create table if not exists public.recipes (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references public.profiles(id) on delete cascade not null,
  name                text not null,
  servings            int not null default 1 check (servings > 0),
  cover_image_url     text,

  -- Optional metadata
  prep_time_min       int,
  cook_time_min       int,
  method              jsonb default '[]'::jsonb,  -- array of step strings
  tags                text[] default '{}',        -- e.g. ['breakfast', 'meal-prep']

  -- Denormalised nutrition totals per serving (for list views + sorting)
  total_kcal          numeric,
  total_fat_g         numeric,
  total_sat_fat_g     numeric,
  total_carbs_g       numeric,
  total_sugars_g      numeric,
  total_fiber_g       numeric,
  total_protein_g     numeric,
  total_salt_g        numeric,
  nutriscore_grade    text,                        -- computed 'a'..'e'

  -- Future-proofing for Phase 3 Community — 'private' is the only valid
  -- value in Phase 1; RLS will expand when community ships
  visibility          text default 'private' not null
    check (visibility in ('private', 'household', 'public')),

  created_at          timestamptz default now() not null,
  updated_at          timestamptz default now() not null
);

create index if not exists recipes_user_id_idx on public.recipes(user_id);
create index if not exists recipes_visibility_idx on public.recipes(visibility)
  where visibility != 'private';

-- ── recipe_ingredients ─────────────────────────────────────
-- Each row is one ingredient in a recipe. We snapshot the
-- product data at add-time so recipes stay stable even if the
-- OFF product is delisted or updated.
create table if not exists public.recipe_ingredients (
  id                  uuid primary key default uuid_generate_v4(),
  recipe_id           uuid references public.recipes(id) on delete cascade not null,
  position            int not null default 0,      -- display order

  -- Source product (nullable for freeform / manual entries)
  barcode             text,                        -- OFF barcode if applicable
  scan_id             uuid references public.scans(id) on delete set null,

  -- Quantity
  quantity_value      numeric not null default 100,
  quantity_unit       text not null default 'g'
    check (quantity_unit in ('g', 'ml', 'unit', 'pack', 'tbsp', 'tsp', 'cup')),
  quantity_display    text,                        -- e.g. "1 medium", "1/2 pack"

  -- Snapshot of product at add-time — stability if OFF changes/delists
  -- Shape:
  --   {
  --     "product_name": "Chicken breast",
  --     "brand": "Tesco",
  --     "image_url": "...",
  --     "nutriscore_grade": "a",
  --     "nutrition_per_100g": { "energy_kcal": 165, "fat_g": 3.6, ... },
  --     "allergens": ["milk", "soybeans"],
  --     "ingredients": [{"id": "...", "name": "...", "is_flagged": false}]
  --   }
  product_snapshot    jsonb not null,

  created_at          timestamptz default now() not null
);

create index if not exists recipe_ingredients_recipe_id_idx
  on public.recipe_ingredients(recipe_id);
create index if not exists recipe_ingredients_barcode_idx
  on public.recipe_ingredients(barcode)
  where barcode is not null;

-- ── Auto-update updated_at on recipes ──────────────────────
create or replace function public.handle_recipe_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists recipes_updated_at on public.recipes;
create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.handle_recipe_updated();

-- ── Row Level Security ─────────────────────────────────────
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

-- recipes: users CRUD their own. Public recipes visible to all (Phase 3 prep)
create policy "Users can view own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Anyone can view public recipes"
  on public.recipes for select
  using (visibility = 'public');

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- recipe_ingredients: follow parent recipe's visibility
create policy "Users can view ingredients of accessible recipes"
  on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and (r.user_id = auth.uid() or r.visibility = 'public')
    )
  );

create policy "Users can insert ingredients into own recipes"
  on public.recipe_ingredients for insert
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can update ingredients of own recipes"
  on public.recipe_ingredients for update
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  );

create policy "Users can delete ingredients of own recipes"
  on public.recipe_ingredients for delete
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_ingredients.recipe_id
        and r.user_id = auth.uid()
    )
  );
