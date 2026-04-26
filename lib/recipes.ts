/**
 * Recipes library — CRUD helpers for user-created recipes.
 *
 * Schema lives in supabase/migrations/20260417_recipes.sql.
 * Types live in lib/types.ts.
 *
 * All functions operate on the authenticated user's own recipes. RLS
 * policies enforce that users can only access their own rows (and public
 * recipes once Phase 3 Community ships).
 */
import { supabase } from './supabase';
import { computeNutriscore } from './nutriscore';
import { getCachedProduct } from './productCache';
import type { CachedProduct } from './productCache';
import type {
  Recipe,
  PublicRecipe,
  RecipeIngredient,
  RecipeWithIngredients,
  ProductSnapshot,
  QuantityUnit,
  Scan,
} from './types';

// ── Nutrition math ───────────────────────────────────────────────────────────

/**
 * Converts a quantity to grams using simple heuristics.
 *   - g / ml  → value as-is (ml ≈ g for most liquids, good enough for MVP)
 *   - tbsp    → 15g
 *   - tsp     → 5g
 *   - cup     → 240g
 *   - unit    → 100g default (overridden if product has typical weight later)
 *   - pack    → 100g default (should ideally use product serving_quantity)
 */
export function quantityToGrams(value: number, unit: QuantityUnit): number {
  switch (unit) {
    case 'g':
    case 'ml':
      return value;
    case 'tbsp':
      return value * 15;
    case 'tsp':
      return value * 5;
    case 'cup':
      return value * 240;
    case 'unit':
    case 'pack':
    default:
      return value * 100;
  }
}

/**
 * Computes the nutrition contribution of a single ingredient row using its
 * snapshot's per-100g data, scaled by its quantity in grams.
 */
export function ingredientNutrition(
  snapshot: ProductSnapshot,
  grams: number,
): {
  kcal: number;
  fat: number;
  saturated_fat: number;
  carbs: number;
  sugars: number;
  fiber: number;
  protein: number;
  salt: number;
} {
  const per100 = snapshot.nutrition_per_100g ?? {};
  const factor = grams / 100;
  return {
    kcal: (per100.energy_kcal ?? 0) * factor,
    fat: (per100.fat_g ?? 0) * factor,
    saturated_fat: (per100.saturated_fat_g ?? 0) * factor,
    carbs: (per100.carbs_g ?? 0) * factor,
    sugars: (per100.sugars_g ?? 0) * factor,
    fiber: (per100.fiber_g ?? 0) * factor,
    protein: (per100.protein_g ?? 0) * factor,
    salt: (per100.salt_g ?? 0) * factor,
  };
}

/**
 * Aggregates nutrition totals across all ingredients, divided by servings
 * to give per-serving values. These are what we cache on the recipe row.
 */
export function computeRecipeTotals(
  ingredients: Array<{ quantity_value: number; quantity_unit: QuantityUnit; product_snapshot: ProductSnapshot }>,
  servings: number,
): {
  total_kcal: number;
  total_fat_g: number;
  total_sat_fat_g: number;
  total_carbs_g: number;
  total_sugars_g: number;
  total_fiber_g: number;
  total_protein_g: number;
  total_salt_g: number;
} {
  const sum = { kcal: 0, fat: 0, saturated_fat: 0, carbs: 0, sugars: 0, fiber: 0, protein: 0, salt: 0 };

  for (const ing of ingredients) {
    const grams = quantityToGrams(ing.quantity_value, ing.quantity_unit);
    const nut = ingredientNutrition(ing.product_snapshot, grams);
    sum.kcal += nut.kcal;
    sum.fat += nut.fat;
    sum.saturated_fat += nut.saturated_fat;
    sum.carbs += nut.carbs;
    sum.sugars += nut.sugars;
    sum.fiber += nut.fiber;
    sum.protein += nut.protein;
    sum.salt += nut.salt;
  }

  const s = Math.max(1, servings);
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    total_kcal: Math.round(sum.kcal / s),
    total_fat_g: round(sum.fat / s),
    total_sat_fat_g: round(sum.saturated_fat / s),
    total_carbs_g: round(sum.carbs / s),
    total_sugars_g: round(sum.sugars / s),
    total_fiber_g: round(sum.fiber / s),
    total_protein_g: round(sum.protein / s),
    total_salt_g: round(sum.salt / s),
  };
}

/**
 * Computes total weight of the recipe (all ingredient grams summed) so we
 * can derive per-100g values for Nutri-score.
 */
export function computeTotalWeightGrams(
  ingredients: Array<{ quantity_value: number; quantity_unit: QuantityUnit }>,
): number {
  return ingredients.reduce(
    (sum, ing) => sum + quantityToGrams(ing.quantity_value, ing.quantity_unit),
    0,
  );
}

/**
 * Computes a Nutri-score grade for a recipe. Requires per-serving totals
 * (pass in what `computeRecipeTotals` returns), the servings count, and the
 * total grams of the recipe.
 */
export function computeRecipeNutriscore(
  totals: {
    total_kcal: number;
    total_sat_fat_g: number;
    total_sugars_g: number;
    total_salt_g: number;
    total_fiber_g: number;
    total_protein_g: number;
  },
  servings: number,
  totalWeightGrams: number,
): string | null {
  const finishedWeight = totalWeightGrams;
  if (finishedWeight <= 0) return null;

  // Back out total-for-whole-recipe, then divide by (weight/100) for per-100g
  const per100g = (perServing: number) =>
    (perServing * servings) / (finishedWeight / 100);

  return computeNutriscore({
    energy_kcal_100g: per100g(totals.total_kcal),
    sat_fat_g_100g: per100g(totals.total_sat_fat_g),
    sugars_g_100g: per100g(totals.total_sugars_g),
    salt_g_100g: per100g(totals.total_salt_g),
    fiber_g_100g: per100g(totals.total_fiber_g),
    protein_g_100g: per100g(totals.total_protein_g),
  });
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** Lists the current user's recipes, most recently updated first.
 *  Embeds each ingredient's product_snapshot so the card can derive
 *  dietary tags client-side without a follow-up fetch per recipe.
 *  Snapshots are JSONB blobs so the embed is cheap; we don't pull
 *  the rest of the recipe_ingredients row. */
export async function listRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*, ingredients:recipe_ingredients(product_snapshot)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('[recipes] listRecipes error:', error.message);
    return [];
  }
  return (data ?? []) as Recipe[];
}

/** Fetches a single recipe with its ingredients (ordered by position). */
export async function getRecipe(recipeId: string): Promise<RecipeWithIngredients | null> {
  const [recipeRes, ingredientsRes] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', recipeId).single(),
    supabase
      .from('recipe_ingredients')
      .select('*')
      .eq('recipe_id', recipeId)
      .order('position', { ascending: true }),
  ]);

  if (recipeRes.error || !recipeRes.data) {
    console.warn('[recipes] getRecipe error:', recipeRes.error?.message);
    return null;
  }

  return {
    ...(recipeRes.data as Recipe),
    ingredients: (ingredientsRes.data ?? []) as RecipeIngredient[],
  };
}

export interface NewRecipeInput {
  name: string;
  servings: number;
  cover_image_url?: string | null;
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  method?: string[];
  tags?: string[];
  /** If this recipe was saved/duplicated from another user's public
   *  recipe, this points back to the source so we can show attribution
   *  and power remix-style signals later. */
  source_recipe_id?: string | null;
}

export interface NewIngredientInput {
  position: number;
  barcode?: string | null;
  scan_id?: string | null;
  quantity_value: number;
  quantity_unit: QuantityUnit;
  quantity_display?: string | null;
  product_snapshot: ProductSnapshot;
}

/**
 * Creates a recipe with its ingredients in a single logical transaction.
 * Totals are computed client-side and cached on the recipe row.
 * Returns the created recipe id, or null on failure.
 */
export async function createRecipe(
  userId: string,
  recipe: NewRecipeInput,
  ingredients: NewIngredientInput[],
): Promise<string | null> {
  const totals = computeRecipeTotals(
    ingredients.map((i) => ({
      quantity_value: i.quantity_value,
      quantity_unit: i.quantity_unit,
      product_snapshot: i.product_snapshot,
    })),
    recipe.servings,
  );
  const totalWeight = computeTotalWeightGrams(ingredients);
  const nutriscore = computeRecipeNutriscore(totals, recipe.servings, totalWeight);

  // Insert recipe first
  const { data: inserted, error: recipeErr } = await supabase
    .from('recipes')
    .insert({
      user_id: userId,
      name: recipe.name,
      servings: recipe.servings,
      cover_image_url: recipe.cover_image_url ?? null,
      prep_time_min: recipe.prep_time_min ?? null,
      cook_time_min: recipe.cook_time_min ?? null,
      method: recipe.method ?? [],
      tags: recipe.tags ?? [],
      source_recipe_id: recipe.source_recipe_id ?? null,
      ...totals,
      nutriscore_grade: nutriscore,
    })
    .select('id')
    .single();

  if (recipeErr || !inserted) {
    console.warn('[recipes] createRecipe error:', recipeErr?.message);
    return null;
  }

  const recipeId = (inserted as { id: string }).id;

  // Insert ingredients
  if (ingredients.length > 0) {
    const rows = ingredients.map((i) => ({
      recipe_id: recipeId,
      position: i.position,
      barcode: i.barcode ?? null,
      scan_id: i.scan_id ?? null,
      quantity_value: i.quantity_value,
      quantity_unit: i.quantity_unit,
      quantity_display: i.quantity_display ?? null,
      product_snapshot: i.product_snapshot,
    }));

    const { error: ingErr } = await supabase.from('recipe_ingredients').insert(rows);
    if (ingErr) {
      // Roll back by deleting the recipe — RLS lets the user do this
      console.warn('[recipes] createRecipe ingredients error, rolling back:', ingErr.message);
      await supabase.from('recipes').delete().eq('id', recipeId);
      return null;
    }
  }

  return recipeId;
}

/**
 * Replaces a recipe's ingredients and updates its totals.
 * Used when editing — simpler than diffing individual rows.
 */
export async function updateRecipe(
  recipeId: string,
  patch: Partial<NewRecipeInput>,
  ingredients?: NewIngredientInput[],
): Promise<boolean> {
  let totals = {};
  if (ingredients && patch.servings != null) {
    totals = computeRecipeTotals(
      ingredients.map((i) => ({
        quantity_value: i.quantity_value,
        quantity_unit: i.quantity_unit,
        product_snapshot: i.product_snapshot,
      })),
      patch.servings,
    );
  }

  const { error: recipeErr } = await supabase
    .from('recipes')
    .update({
      ...patch,
      ...totals,
    })
    .eq('id', recipeId);

  if (recipeErr) {
    console.warn('[recipes] updateRecipe error:', recipeErr.message);
    return false;
  }

  if (ingredients) {
    // Replace all ingredients
    await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipeId);
    if (ingredients.length > 0) {
      const rows = ingredients.map((i) => ({
        recipe_id: recipeId,
        position: i.position,
        barcode: i.barcode ?? null,
        scan_id: i.scan_id ?? null,
        quantity_value: i.quantity_value,
        quantity_unit: i.quantity_unit,
        quantity_display: i.quantity_display ?? null,
        product_snapshot: i.product_snapshot,
      }));
      const { error: ingErr } = await supabase.from('recipe_ingredients').insert(rows);
      if (ingErr) {
        console.warn('[recipes] updateRecipe ingredients error:', ingErr.message);
        return false;
      }
    }
  }

  return true;
}

/** Deletes a recipe (cascades to recipe_ingredients via FK). */
export async function deleteRecipe(recipeId: string): Promise<boolean> {
  const { error } = await supabase.from('recipes').delete().eq('id', recipeId);
  if (error) {
    console.warn('[recipes] deleteRecipe error:', error.message);
    return false;
  }
  return true;
}

/**
 * Duplicates a recipe for the same user — useful for "Duplicate" action on
 * the detail view and for importing a public recipe into "My Recipes".
 */
export async function duplicateRecipe(
  userId: string,
  sourceRecipeId: string,
): Promise<string | null> {
  const source = await getRecipe(sourceRecipeId);
  if (!source) return null;

  return createRecipe(
    userId,
    {
      name: `${source.name} (copy)`,
      servings: source.servings,
      cover_image_url: source.cover_image_url,
      prep_time_min: source.prep_time_min,
      cook_time_min: source.cook_time_min,
      method: source.method,
      tags: source.tags,
    },
    source.ingredients.map((i) => ({
      position: i.position,
      barcode: i.barcode,
      scan_id: i.scan_id,
      quantity_value: i.quantity_value,
      quantity_unit: i.quantity_unit,
      quantity_display: i.quantity_display,
      product_snapshot: i.product_snapshot,
    })),
  );
}

// ── Community / public recipes ───────────────────────────────────────────────

/**
 * Lists public community recipes (visibility = 'public') including the
 * caller's own — users should see their own shared recipes alongside
 * other people's so they can confirm a successful share and get a
 * sense of how their recipe lives in the feed. Joins the author's
 * profile so each card can show the creator's display name + avatar.
 * Ordered by like_count desc so trending content surfaces first.
 *
 * RLS:
 *  • recipes: "Anyone can view public recipes" permits the SELECT
 *  • profiles: "Authors of public recipes are visible" permits the
 *    cross-user author join (migration 20260425_public_author_profiles)
 *
 * (The optional excludeUserId param is kept for callers that explicitly
 * want pure-discovery feeds — not used by the community tab any more.)
 */
export async function listPublicRecipes(excludeUserId?: string): Promise<PublicRecipe[]> {
  let query = supabase
    .from('recipes')
    .select(
      '*, ' +
        'author:profiles!recipes_user_id_fkey(full_name, avatar_url), ' +
        'ingredients:recipe_ingredients(product_snapshot)',
    )
    .eq('visibility', 'public')
    .order('like_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(100);

  if (excludeUserId) {
    query = query.neq('user_id', excludeUserId);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[recipes] listPublicRecipes error:', error.message);
    return [];
  }
  // Supabase's generated types fight the embedded join + alias here,
  // so route through `unknown` to land on PublicRecipe[].
  return ((data ?? []) as unknown) as PublicRecipe[];
}

/**
 * Clone a community-shared recipe into the signed-in user's own book.
 *
 * Works just like duplicateRecipe but:
 *  • doesn't append "(copy)" to the name — the saver wants a clean
 *    title in their own collection
 *  • writes source_recipe_id so the save keeps attribution back to the
 *    original author / recipe
 *  • keeps the visibility at the default ('private') even though the
 *    source was public. Saving != re-sharing.
 */
export async function saveRecipeFromSource(
  userId: string,
  sourceRecipeId: string,
): Promise<string | null> {
  const source = await getRecipe(sourceRecipeId);
  if (!source) return null;

  return createRecipe(
    userId,
    {
      name: source.name,
      servings: source.servings,
      cover_image_url: source.cover_image_url,
      prep_time_min: source.prep_time_min,
      cook_time_min: source.cook_time_min,
      method: source.method,
      tags: source.tags,
      source_recipe_id: source.id,
    },
    source.ingredients.map((i) => ({
      position: i.position,
      barcode: i.barcode,
      scan_id: i.scan_id,
      quantity_value: i.quantity_value,
      quantity_unit: i.quantity_unit,
      quantity_display: i.quantity_display,
      product_snapshot: i.product_snapshot,
    })),
  );
}

// ── Navigation helpers ───────────────────────────────────────────────────────

/**
 * Build the URL params for /scan-result from a saved ProductSnapshot.
 * Used when the user taps an ingredient row in a recipe — we route
 * them to the scan-result screen so they can see the full
 * household-impact / dietary breakdown for that product, then back
 * out to the recipe.
 *
 * scan-result re-fetches missing nutrition from OFF when carbs is
 * absent, so passing whatever the snapshot has is enough — anything
 * we don't have here gets filled in by the OFF fetch.
 */
export function scanResultParamsFromSnapshot(
  snap: ProductSnapshot,
  barcode: string | null,
): Record<string, string> {
  const n = snap.nutrition_per_100g ?? {};
  const params: Record<string, string> = {
    scanId: '',
    productName: snap.product_name ?? '',
    brand: snap.brand ?? '',
    imageUrl: snap.image_url ?? '',
    barcode: barcode ?? '',
    nutriscoreGrade: snap.nutriscore_grade ?? '',
    energyKcal: n.energy_kcal != null ? String(n.energy_kcal) : '',
    carbs: n.carbs_g != null ? String(n.carbs_g) : '',
    sugars: n.sugars_g != null ? String(n.sugars_g) : '',
    fiber: n.fiber_g != null ? String(n.fiber_g) : '',
    fat: n.fat_g != null ? String(n.fat_g) : '',
    saturatedFat: n.saturated_fat_g != null ? String(n.saturated_fat_g) : '',
    proteins: n.protein_g != null ? String(n.protein_g) : '',
    salt: n.salt_g != null ? String(n.salt_g) : '',
    ingredientsText: snap.ingredients_text ?? '',
    // Defensive: older snapshots have allergens stored as strings or
    // unexpected shapes — coerce to a real array before .join.
    allergens: Array.isArray(snap.allergens) ? snap.allergens.join(',') : '',
    // Tells scan-result NOT to write a row to the user's scan history
    // — opening from a recipe ingredient is a "view it" gesture, not
    // a "scan it" event. Without this every tappable ingredient would
    // pollute the history with a phantom entry.
    noSave: '1',
  };
  return params;
}

// ── Snapshot helper ──────────────────────────────────────────────────────────

/**
 * Builds a ProductSnapshot from a CachedProduct (the SQLite cache that
 * scanner.tsx writes to). This is the primary source when adding ingredients
 * from scan history — the cache has per-100g nutrition, allergens, and
 * traces.
 */
function snapshotFromCached(cached: CachedProduct, scanIngredients: Scan['ingredients'] = []): ProductSnapshot {
  // Prefer the scan's structured ingredient list when it's populated (that
  // wires up canonical ingredient ids from the ingredients table). Fall
  // back to parsing the cache's raw OFF text — most scans reach us with
  // just the text, so this is the common path.
  const structured = (scanIngredients ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    is_flagged: i.is_flagged,
    dietary_tags: i.dietary_tags,
  }));

  const ingredients =
    structured.length > 0
      ? structured
      : parseIngredientText(cached.ingredientsText ?? '');

  return {
    product_name: cached.productName,
    brand: cached.brand,
    image_url: cached.imageUrl,
    nutriscore_grade: cached.nutriscoreGrade,
    nutrition_per_100g: {
      energy_kcal: cached.energyKcal ?? undefined,
      fat_g: cached.fat ?? undefined,
      saturated_fat_g: cached.saturatedFat ?? undefined,
      carbs_g: cached.carbs ?? undefined,
      sugars_g: cached.sugars ?? undefined,
      fiber_g: cached.fiber ?? undefined,
      protein_g: cached.proteins ?? undefined,
      salt_g: cached.salt ?? undefined,
    },
    allergens: cached.allergens
      ? cached.allergens.split(',').map((a) => a.trim()).filter(Boolean)
      : [],
    ingredients,
    // Keep the raw text too — gives the recipe impact matcher a second
    // chance if the structured list ends up sparse or outdated.
    ingredients_text: cached.ingredientsText ?? null,
  };
}

/**
 * Split an OFF-style "ingredients_text" into entries. Input looks like:
 *   "Beef (90%), Water, Salt, Flavourings (contain: milk), Sulphites"
 * Output: [{ name: "beef", ... }, { name: "water", ... }, ...]
 *
 * Strips percentages/parenthesised sub-lists, splits on the top-level
 * separator characters (commas, semicolons, middle-dot), normalises
 * whitespace. Intentionally simple — the matcher does case-insensitive
 * substring checks so we don't need perfect canonicalisation.
 */
function parseIngredientText(text: string): ProductSnapshot['ingredients'] {
  if (!text || !text.trim()) return [];
  // Remove parenthesised sub-content ("Flavourings (contain: milk)" → "Flavourings")
  const stripped = text.replace(/\([^)]*\)/g, ' ');
  return stripped
    .split(/[,;·]/)
    .map((raw) => raw.replace(/\s+/g, ' ').trim())
    // Remove percentages and common OFF markers
    .map((s) => s.replace(/\s*\d+(?:[.,]\d+)?\s*%/g, '').trim())
    .filter((s) => s.length > 0)
    .map((name) => ({ name, is_flagged: false }));
}

/**
 * Async snapshot builder from a Scan — looks up the product cache so we
 * populate nutrition data. Falls back to a bare snapshot (no nutrition)
 * if the cache has no entry. Use this from the recipe builder.
 */
export async function snapshotFromScanAsync(scan: Scan): Promise<ProductSnapshot> {
  try {
    const cached = await getCachedProduct(scan.barcode);
    if (cached) {
      return snapshotFromCached(cached, scan.ingredients);
    }
  } catch (e) {
    console.warn('[recipes] snapshotFromScanAsync cache lookup failed:', e);
  }
  // Fallback — no cache hit, minimal snapshot
  return {
    product_name: scan.product_name,
    brand: scan.brand,
    image_url: scan.image_url,
    nutriscore_grade: scan.nutriscore_grade,
    nutrition_per_100g: {},
    allergens: [],
    ingredients: (scan.ingredients ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      is_flagged: i.is_flagged,
      dietary_tags: i.dietary_tags,
    })),
  };
}

/**
 * Sync snapshot from a Scan — used when you already have nutrition data
 * attached (rare). Prefer snapshotFromScanAsync() for most cases.
 */
export function snapshotFromScan(scan: Scan): ProductSnapshot {
  return {
    product_name: scan.product_name,
    brand: scan.brand,
    image_url: scan.image_url,
    nutriscore_grade: scan.nutriscore_grade,
    nutrition_per_100g: {},
    allergens: [],
    ingredients: (scan.ingredients ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      is_flagged: i.is_flagged,
      dietary_tags: i.dietary_tags,
    })),
  };
}

/**
 * Builds a ProductSnapshot from a scan or OFF API response.
 * Centralised so every entry point (scan history, food search) produces
 * consistent snapshots.
 */
export function buildProductSnapshot(input: {
  product_name: string;
  brand?: string | null;
  image_url?: string | null;
  nutriscore_grade?: string | null;
  nutriments?: Record<string, number | undefined> | null;
  allergens?: string[] | null;
  ingredients?: Array<{ id?: string; name: string; is_flagged?: boolean; dietary_tags?: string[] }> | null;
  /** Raw ingredient text (e.g. OFF's `ingredients_text`). Used as a
   *  fallback when the structured list is absent/sparse, and persisted
   *  on the snapshot so the impact sheet can search it later. */
  ingredients_text?: string | null;
}): ProductSnapshot {
  const n = input.nutriments ?? {};

  const structured = (input.ingredients ?? []).map((i) => ({
    id: i.id,
    name: i.name,
    is_flagged: i.is_flagged ?? false,
    dietary_tags: (i.dietary_tags ?? []) as ProductSnapshot['ingredients'][number]['dietary_tags'],
  }));

  // Derive structured entries from raw text when the caller didn't
  // supply them — scanner pick-mode and direct OFF fetches both hit this
  // path, so we always get *something* into snap.ingredients as long as
  // OFF gave us an ingredient line.
  const ingredients = structured.length > 0
    ? structured
    : parseIngredientText(input.ingredients_text ?? '');

  return {
    product_name: input.product_name,
    brand: input.brand ?? null,
    image_url: input.image_url ?? null,
    nutriscore_grade: input.nutriscore_grade ?? null,
    nutrition_per_100g: {
      energy_kcal: n['energy-kcal_100g'] ?? n.energy_kcal ?? undefined,
      fat_g: n.fat_100g ?? n.fat_g ?? undefined,
      saturated_fat_g: n['saturated-fat_100g'] ?? n.saturated_fat_g ?? undefined,
      carbs_g: n.carbohydrates_100g ?? n.carbs_g ?? undefined,
      sugars_g: n.sugars_100g ?? n.sugars_g ?? undefined,
      fiber_g: n.fiber_100g ?? n.fiber_g ?? undefined,
      protein_g: n.proteins_100g ?? n.protein_g ?? undefined,
      salt_g: n.salt_100g ?? n.salt_g ?? undefined,
    },
    allergens: input.allergens ?? [],
    ingredients,
    ingredients_text: input.ingredients_text ?? null,
  };
}
