-- Let a product portion be given in servings ("2 servings"), using the
-- product's own serving size stored on its snapshot (serving_g).
-- Adds 'serving' to the allowed units for planned meals and recipes.

alter table public.meal_plan_entries
  drop constraint if exists meal_plan_entries_quantity_unit_check;
alter table public.meal_plan_entries
  add constraint meal_plan_entries_quantity_unit_check
  check (quantity_unit in ('g', 'ml', 'unit', 'pack', 'tbsp', 'tsp', 'cup', 'serving'));

alter table public.recipe_ingredients
  drop constraint if exists recipe_ingredients_quantity_unit_check;
alter table public.recipe_ingredients
  add constraint recipe_ingredients_quantity_unit_check
  check (quantity_unit in ('g', 'ml', 'unit', 'pack', 'tbsp', 'tsp', 'cup', 'serving'));
