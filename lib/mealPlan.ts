/**
 * Meal plan library — date/time helpers, nutrition math and CRUD for
 * meals and their items.
 *
 * A meal (public.meals) has a day, a time and a name. Its items live in
 * public.meal_plan_entries, one row per recipe or product.
 *
 * Schema: supabase/migrations/20260930120000_meal_plan.sql and
 *         supabase/migrations/20260930180000_meal_plan_meals.sql.
 * Types live in lib/types.ts.
 *
 * All functions operate on the authenticated user's own rows. RLS
 * enforces that users can only touch their own data.
 */
import { supabase } from './supabase';
import { computeNutriscore, type NutriscoreGrade } from './nutriscore';
import { getRecipe, createRecipe, ingredientNutrition, quantityToGrams } from './recipes';
import type { NewIngredientInput } from './recipes';
import type {
  Meal,
  MealItemDraft,
  MealNutrition,
  MealPlanEntry,
  NutritionValues,
  ProductSnapshot,
  QuantityUnit,
  Recipe,
} from './types';

// ── Meal names ───────────────────────────────────────────────────────────────

/** Quick-pick times offered where a full time picker would be overkill
 *  (the "Add to meal plan" sheet on a recipe). */
export const MEAL_PRESETS: Array<{ name: string; time: string }> = [
  { name: 'Breakfast', time: '08:00' },
  { name: 'Lunch', time: '12:30' },
  { name: 'Snack', time: '15:30' },
  { name: 'Dinner', time: '18:30' },
];

/** Name a meal from its time when the user hasn't typed one. */
export function defaultMealName(time: string): string {
  const minutes = timeToMinutes(time);
  if (minutes < 11 * 60) return 'Breakfast';
  if (minutes < 15 * 60) return 'Lunch';
  if (minutes < 17 * 60) return 'Snack';
  if (minutes < 22 * 60) return 'Dinner';
  return 'Late snack';
}

// ── Times ────────────────────────────────────────────────────────────────────
//
// meal_time is a Postgres `time` — local wall-clock, no zone. Supabase
// returns it as 'HH:MM:SS'; the app works in 'HH:MM'.

/** 'HH:MM' from 'HH:MM' or 'HH:MM:SS'. */
export function normaliseTime(time: string): string {
  return time.slice(0, 5);
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/** The current time rounded to the nearest quarter hour, as 'HH:MM'. */
export function nowRoundedTime(now: Date = new Date()): string {
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutesToTime(Math.round(minutes / 15) * 15);
}

// ── Dates ────────────────────────────────────────────────────────────────────
//
// plan_date is the user's *local* calendar day. Never build it with
// toISOString() — that converts to UTC and shifts the day for anyone
// planning late in the evening west of Greenwich (or early morning east).

/** Local 'YYYY-MM-DD' for a Date. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local-midnight Date for a 'YYYY-MM-DD' key. */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday of the week containing `d` (weeks run Mon–Sun, same as the
 *  dashboard's "week in numbers"). */
export function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

/** The seven date keys of the week starting at `weekStart`. */
export function weekDateKeys(weekStart: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(weekStart, i)));
}

// Hardcoded English, same as the history screen's date tabs.
export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Today" / "Tomorrow" / "Yesterday", else "Sat 12". */
export function relativeDayLabel(key: string, now: Date = new Date()): string {
  if (key === toDateKey(now)) return 'Today';
  if (key === toDateKey(addDays(now, 1))) return 'Tomorrow';
  if (key === toDateKey(addDays(now, -1))) return 'Yesterday';
  const d = fromDateKey(key);
  return `${WEEKDAY_SHORT[d.getDay()]} ${d.getDate()}`;
}

/** Mid-sentence wording for toasts: "today at 18:30" / "Sat 12 at 08:00". */
export function dayAtTimeLabel(key: string, time: string, now: Date = new Date()): string {
  const day = relativeDayLabel(key, now);
  const lowered = day === 'Today' || day === 'Tomorrow' || day === 'Yesterday' ? day.toLowerCase() : day;
  return `${lowered} at ${normaliseTime(time)}`;
}

/** "7 – 13 Sep" / "28 Sep – 4 Oct" for the week starting at `weekStart`. */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const endPart = `${end.getDate()} ${MONTH_SHORT[end.getMonth()]}`;
  if (weekStart.getMonth() === end.getMonth()) return `${weekStart.getDate()} – ${endPart}`;
  return `${weekStart.getDate()} ${MONTH_SHORT[weekStart.getMonth()]} – ${endPart}`;
}

// ── Nutrition ────────────────────────────────────────────────────────────────

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrition for `servings` servings of a recipe (the recipe row caches
 *  per-serving totals). */
export function recipeNutrition(recipe: Recipe, servings: number): MealNutrition {
  const s = servings;
  const scale = (v: number | null) => (v == null ? undefined : round1(Number(v) * s));
  return {
    kcal: recipe.total_kcal == null ? undefined : Math.round(Number(recipe.total_kcal) * s),
    fat_g: scale(recipe.total_fat_g),
    sat_fat_g: scale(recipe.total_sat_fat_g),
    carbs_g: scale(recipe.total_carbs_g),
    sugars_g: scale(recipe.total_sugars_g),
    fiber_g: scale(recipe.total_fiber_g),
    protein_g: scale(recipe.total_protein_g),
    salt_g: scale(recipe.total_salt_g),
  };
}

/** Nutrition for a product portion. Values the snapshot doesn't carry
 *  stay undefined so the UI can show "–" instead of a misleading 0. */
export function productNutrition(
  snapshot: ProductSnapshot,
  quantityValue: number,
  quantityUnit: QuantityUnit,
): MealNutrition {
  const per100 = snapshot.nutrition_per_100g ?? {};
  const n = ingredientNutrition(snapshot, quantityToGrams(quantityValue, quantityUnit));
  return {
    kcal: per100.energy_kcal == null ? undefined : Math.round(n.kcal),
    fat_g: per100.fat_g == null ? undefined : round1(n.fat),
    sat_fat_g: per100.saturated_fat_g == null ? undefined : round1(n.saturated_fat),
    carbs_g: per100.carbs_g == null ? undefined : round1(n.carbs),
    sugars_g: per100.sugars_g == null ? undefined : round1(n.sugars),
    fiber_g: per100.fiber_g == null ? undefined : round1(n.fiber),
    protein_g: per100.protein_g == null ? undefined : round1(n.protein),
    salt_g: per100.salt_g == null ? undefined : round1(n.salt),
  };
}

/** Multiplies every value in a nutrition object by `factor`. */
export function scaleNutrition(nutrition: MealNutrition, factor: number): MealNutrition {
  const out: MealNutrition = {};
  for (const key of Object.keys(nutrition ?? {}) as Array<keyof MealNutrition>) {
    const v = nutrition[key];
    if (v == null) continue;
    out[key] = key === 'kcal' ? Math.round(Number(v) * factor) : round1(Number(v) * factor);
  }
  return out;
}

/** Sums nutrition across items. A key is only present in the result
 *  when at least one item carried it. */
export function sumNutrition(items: Array<{ nutrition: MealNutrition }>): MealNutrition {
  const out: MealNutrition = {};
  for (const item of items) {
    const n = item.nutrition ?? {};
    for (const key of Object.keys(n) as Array<keyof MealNutrition>) {
      const v = n[key];
      if (v == null) continue;
      out[key] = round1((out[key] ?? 0) + Number(v));
    }
  }
  if (out.kcal != null) out.kcal = Math.round(out.kcal);
  return out;
}

/** "1 serving" / "2 servings" / "150 g" / "1 pack" — the portion line
 *  under an item's title. */
export function portionLabel(item: {
  kind: 'recipe' | 'product';
  servings: number;
  quantity_value: number | null;
  quantity_unit: QuantityUnit | null;
}): string {
  if (item.kind === 'recipe') {
    const s = Number(item.servings);
    return `${s} ${s === 1 ? 'serving' : 'servings'}`;
  }
  const v = Number(item.quantity_value ?? 100);
  const u = item.quantity_unit ?? 'g';
  if (u === 'g' || u === 'ml') return `${v} ${u}`;
  if (u === 'unit') return `${v} ${v === 1 ? 'item' : 'items'}`;
  return `${v} ${u}${v === 1 ? '' : 's'}`;
}

// ── Draft items ──────────────────────────────────────────────────────────────
//
// The meal builder works on MealItemDraft rows held in DraftMealProvider.
// `unit_nutrition` is the nutrition for one serving (recipes) so changing
// the servings can rescale without refetching the recipe.

let draftKeySeq = 0;
function nextDraftKey(): string {
  draftKeySeq += 1;
  return `item-${Date.now()}-${draftKeySeq}`;
}

export function draftItemFromRecipe(recipe: Recipe, servings: number): MealItemDraft {
  const unit = recipeNutrition(recipe, 1);
  return {
    key: nextDraftKey(),
    kind: 'recipe',
    recipe_id: recipe.id,
    servings,
    barcode: null,
    scan_id: null,
    quantity_value: null,
    quantity_unit: null,
    product_snapshot: null,
    title: recipe.name,
    image_url: recipe.cover_image_url,
    nutriscore_grade: recipe.nutriscore_grade,
    unit_nutrition: unit,
    nutrition: scaleNutrition(unit, servings),
  };
}

export function draftItemFromProduct(input: {
  barcode?: string | null;
  scan_id?: string | null;
  quantity_value: number;
  quantity_unit: QuantityUnit;
  product_snapshot: ProductSnapshot;
}): MealItemDraft {
  const snap = input.product_snapshot;
  return {
    key: nextDraftKey(),
    kind: 'product',
    recipe_id: null,
    servings: 1,
    barcode: input.barcode ?? null,
    scan_id: input.scan_id ?? null,
    quantity_value: input.quantity_value,
    quantity_unit: input.quantity_unit,
    product_snapshot: snap,
    title: snap.product_name,
    image_url: snap.image_url,
    nutriscore_grade: snap.nutriscore_grade,
    unit_nutrition: null,
    nutrition: productNutrition(snap, input.quantity_value, input.quantity_unit),
  };
}

export function draftItemFromEntry(entry: MealPlanEntry): MealItemDraft {
  const servings = Number(entry.servings) || 1;
  return {
    key: nextDraftKey(),
    kind: entry.kind,
    recipe_id: entry.recipe_id,
    servings,
    barcode: entry.barcode,
    scan_id: entry.scan_id,
    quantity_value: entry.quantity_value == null ? null : Number(entry.quantity_value),
    quantity_unit: entry.quantity_unit,
    product_snapshot: entry.product_snapshot,
    title: entry.title,
    image_url: entry.image_url,
    nutriscore_grade: entry.nutriscore_grade,
    unit_nutrition: entry.kind === 'recipe' ? scaleNutrition(entry.nutrition ?? {}, 1 / servings) : null,
    nutrition: entry.nutrition ?? {},
  };
}

/** Applies a new portion to a draft item and recomputes its nutrition. */
export function withPortion(
  item: MealItemDraft,
  portion: { servings?: number; quantity_value?: number; quantity_unit?: QuantityUnit },
): MealItemDraft {
  if (item.kind === 'recipe') {
    const servings = portion.servings ?? item.servings;
    return {
      ...item,
      servings,
      nutrition: scaleNutrition(item.unit_nutrition ?? {}, servings),
    };
  }
  const value = portion.quantity_value ?? item.quantity_value ?? 100;
  const unit = portion.quantity_unit ?? item.quantity_unit ?? 'g';
  return {
    ...item,
    quantity_value: value,
    quantity_unit: unit,
    nutrition: item.product_snapshot
      ? productNutrition(item.product_snapshot, value, unit)
      : item.nutrition,
  };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

function sortMeal(meal: Meal): Meal {
  return {
    ...meal,
    meal_time: normaliseTime(meal.meal_time),
    items: [...(meal.items ?? [])].sort((a, b) => a.position - b.position),
  };
}

/** Lists meals (with their items) between two date keys, inclusive. */
export async function listMeals(userId: string, fromKey: string, toKey: string): Promise<Meal[]> {
  const { data, error } = await supabase
    .from('meals')
    .select('*, items:meal_plan_entries(*)')
    .eq('user_id', userId)
    .gte('plan_date', fromKey)
    .lte('plan_date', toKey)
    .order('plan_date', { ascending: true })
    .order('meal_time', { ascending: true });

  if (error) {
    console.warn('[mealPlan] listMeals error:', error.message);
    throw new Error(error.message);
  }
  return ((data ?? []) as unknown as Meal[]).map(sortMeal);
}

function itemRows(userId: string, mealId: string, dateKey: string, items: MealItemDraft[]) {
  return items.map((item, position) => ({
    user_id: userId,
    meal_id: mealId,
    plan_date: dateKey,
    position,
    kind: item.kind,
    recipe_id: item.recipe_id,
    servings: item.kind === 'recipe' ? item.servings : 1,
    barcode: item.barcode,
    scan_id: item.scan_id,
    quantity_value: item.quantity_value,
    quantity_unit: item.quantity_unit,
    product_snapshot: item.product_snapshot,
    title: item.title,
    image_url: item.image_url,
    nutriscore_grade: item.nutriscore_grade,
    nutrition: item.nutrition,
  }));
}

export interface SaveMealInput {
  /** Set when editing an existing meal. */
  id?: string | null;
  dateKey: string;
  time: string;
  name: string;
  items: MealItemDraft[];
}

/**
 * Creates or updates a meal and replaces its items. Returns the meal id,
 * or null on failure. A new meal whose items fail to insert is rolled
 * back so it doesn't linger as an empty block on the timeline.
 */
export async function saveMeal(userId: string, input: SaveMealInput): Promise<string | null> {
  const name = input.name.trim() || defaultMealName(input.time);
  let mealId = input.id ?? null;
  const isNew = !mealId;
  // On an edit, the old items are only removed once the new ones are in,
  // so a failed save never leaves the meal empty.
  let oldItemIds: string[] = [];

  if (mealId) {
    const { error } = await supabase
      .from('meals')
      .update({ plan_date: input.dateKey, meal_time: input.time, name })
      .eq('id', mealId);
    if (error) {
      console.warn('[mealPlan] saveMeal update error:', error.message);
      return null;
    }
    const { data: old, error: oldErr } = await supabase
      .from('meal_plan_entries')
      .select('id')
      .eq('meal_id', mealId);
    if (oldErr) {
      console.warn('[mealPlan] saveMeal read items error:', oldErr.message);
      return null;
    }
    oldItemIds = (old ?? []).map((r: { id: string }) => r.id);
  } else {
    const { data, error } = await supabase
      .from('meals')
      .insert({ user_id: userId, plan_date: input.dateKey, meal_time: input.time, name })
      .select('id')
      .single();
    if (error || !data) {
      console.warn('[mealPlan] saveMeal insert error:', error?.message);
      return null;
    }
    mealId = (data as { id: string }).id;
  }

  if (input.items.length > 0) {
    const { error } = await supabase
      .from('meal_plan_entries')
      .insert(itemRows(userId, mealId, input.dateKey, input.items));
    if (error) {
      console.warn('[mealPlan] saveMeal items error:', error.message);
      if (isNew) await supabase.from('meals').delete().eq('id', mealId);
      return null;
    }
  }
  if (oldItemIds.length > 0) {
    const { error: delErr } = await supabase.from('meal_plan_entries').delete().in('id', oldItemIds);
    // The new items are saved; leftover old ones would double up, so say so.
    if (delErr) console.warn('[mealPlan] saveMeal clear old items error:', delErr.message);
  }
  return mealId;
}

/** Marks a meal as eaten now, or clears the mark when `eaten` is false. */
export async function setMealEaten(mealId: string, eaten: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('meals')
    .update({ eaten_at: eaten ? new Date().toISOString() : null })
    .eq('id', mealId);
  if (error) {
    console.warn('[mealPlan] setMealEaten error:', error.message);
    return false;
  }
  return true;
}

/** Deletes a meal (items cascade via FK). */
export async function deleteMeal(mealId: string): Promise<boolean> {
  const { error } = await supabase.from('meals').delete().eq('id', mealId);
  if (error) {
    console.warn('[mealPlan] deleteMeal error:', error.message);
    return false;
  }
  return true;
}

// ── Save as recipe ───────────────────────────────────────────────────────────

/**
 * Turns a meal's items into a one-serving recipe in the user's recipe
 * book. Product items become ingredients as they are. Recipe items are
 * unpacked into that recipe's own ingredients, scaled to the servings
 * planned, because a recipe can't contain another recipe.
 * Returns the new recipe id, or null on failure.
 */
export async function saveItemsAsRecipe(
  userId: string,
  name: string,
  items: MealItemDraft[],
): Promise<string | null> {
  const ingredients: NewIngredientInput[] = [];

  for (const item of items) {
    if (item.kind === 'product' && item.product_snapshot) {
      ingredients.push({
        position: ingredients.length,
        barcode: item.barcode,
        scan_id: item.scan_id,
        quantity_value: item.quantity_value ?? 100,
        quantity_unit: item.quantity_unit ?? 'g',
        product_snapshot: item.product_snapshot,
      });
    } else if (item.kind === 'recipe' && item.recipe_id) {
      const source = await getRecipe(item.recipe_id);
      if (!source) continue;
      const factor = item.servings / Math.max(1, source.servings);
      for (const ing of source.ingredients) {
        ingredients.push({
          position: ingredients.length,
          barcode: ing.barcode,
          scan_id: ing.scan_id,
          quantity_value: Math.round(Number(ing.quantity_value) * factor * 100) / 100,
          quantity_unit: ing.quantity_unit,
          product_snapshot: ing.product_snapshot,
        });
      }
    }
  }

  if (ingredients.length === 0) return null;
  return createRecipe(userId, { name, servings: 1 }, ingredients);
}

// ── Nutrition for the NutritionPanel ─────────────────────────────────────────

/** "Per serving" is the meal as planned. Per 100g needs the meal's weight,
 *  which only products give us — recipes don't store theirs — so it's
 *  left out (null) once a recipe is in the meal. */
/** True when an item carries at least one nutrition value. */
export function hasNutrition(item: { nutrition: MealNutrition }): boolean {
  return Object.values(item.nutrition ?? {}).some((v) => v != null);
}

type SummaryItem = Pick<
  MealItemDraft,
  'kind' | 'title' | 'barcode' | 'recipe_id' | 'quantity_value' | 'quantity_unit' | 'nutrition' | 'nutriscore_grade'
>;

export function mealNutritionSummary(items: SummaryItem[]): {
  perServing: NutritionValues;
  per100: NutritionValues | null;
  grade: NutriscoreGrade | null;
  /** Items with no nutrition at all — the totals leave them out. */
  missing: SummaryItem[];
} {
  const t = sumNutrition(items);
  const perServing: NutritionValues = {
    kcal: t.kcal ?? null,
    fat: t.fat_g ?? null,
    satFat: t.sat_fat_g ?? null,
    carbs: t.carbs_g ?? null,
    sugars: t.sugars_g ?? null,
    fiber: t.fiber_g ?? null,
    protein: t.protein_g ?? null,
    salt: t.salt_g ?? null,
  };
  const missing = items.filter((i) => !hasNutrition(i));
  const withData = items.filter(hasNutrition);

  // Per 100g needs weights, which only products have. Each nutrient is
  // scaled over just the products that list it, so a gap doesn't dilute it.
  const allProducts = withData.length > 0 && withData.every((i) => i.kind === 'product');
  if (!allProducts) {
    // Nothing to work a score out from — a lone recipe keeps its own.
    const lone = items.length === 1 ? (items[0].nutriscore_grade as NutriscoreGrade | null) : null;
    return { perServing, per100: null, grade: lone, missing };
  }
  const per100For = (key: keyof MealNutrition): number | null => {
    let grams = 0;
    let total = 0;
    for (const i of withData) {
      const v = i.nutrition?.[key];
      if (v == null) continue;
      grams += quantityToGrams(Number(i.quantity_value ?? 100), i.quantity_unit ?? 'g');
      total += Number(v);
    }
    return grams > 0 ? (total / grams) * 100 : null;
  };
  const per100: NutritionValues = {
    kcal: per100For('kcal'),
    fat: per100For('fat_g'),
    satFat: per100For('sat_fat_g'),
    carbs: per100For('carbs_g'),
    sugars: per100For('sugars_g'),
    fiber: per100For('fiber_g'),
    protein: per100For('protein_g'),
    salt: per100For('salt_g'),
  };
  const grade = computeNutriscore({
    energy_kcal_100g: per100.kcal ?? undefined,
    sat_fat_g_100g: per100.satFat ?? undefined,
    sugars_g_100g: per100.sugars ?? undefined,
    salt_g_100g: per100.salt ?? undefined,
    fiber_g_100g: per100.fiber ?? undefined,
    protein_g_100g: per100.protein ?? undefined,
  });
  return { perServing, per100, grade, missing };
}
