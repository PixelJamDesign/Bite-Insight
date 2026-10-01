/**
 * React hooks for the meal planner — loads one week of meals, keeps
 * them fresh via realtime + focus, and runs the household check.
 *
 * Usage:
 *   const { meals, byDate, loading, error, refresh } = useMealPlanWeek(weekStart);
 *   const impact = useMealPlanImpact(meals);
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { addDays, listMeals, productNutrition, toDateKey } from './mealPlan';
import { snapshotFromOff } from './recipes';
import { cardMetricsFor, scoreMeal, type MealImpact, type MealMetric } from './mealDanger';
import type { Meal, MealPlanEntry, RecipeIngredient, UserProfile } from './types';

export interface UseMealPlanWeekResult {
  meals: Meal[];
  /** Meals grouped by 'YYYY-MM-DD', each day sorted by time. Days with
   *  nothing planned are absent. */
  byDate: Record<string, Meal[]>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMealPlanWeek(weekStart: Date): UseMealPlanWeekResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const fromKey = toDateKey(weekStart);
  const toKey = toDateKey(addDays(weekStart, 6));

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setMeals([]);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setMeals(await listMeals(userId, fromKey, toKey));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  }, [userId, fromKey, toKey]);

  // Show the loader when the week changes, but not on background refreshes.
  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Realtime — meals can be added from recipe detail or another device.
  // Item changes always come with a write to the parent meal's day, but
  // listen to both tables so an edit on another device shows up too.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`meal-plan-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meals', filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meal_plan_entries', filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  // Refresh when the planner regains focus (e.g. back from the builder).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const byDate = useMemo(() => {
    const out: Record<string, Meal[]> = {};
    for (const meal of meals) {
      (out[meal.plan_date] ??= []).push(meal);
    }
    return out;
  }, [meals]);

  return { meals, byDate, loading, error, refresh: load };
}

// ── useMealPlanImpact — how each meal sits with the signed-in user ───────────

export type { MealImpact, MealMetric } from './mealDanger';

export interface MealPlanImpact {
  /** Meal id → danger. Meals that are fine for the user are absent. */
  byMeal: Record<string, MealImpact>;
  /** The numbers to show on each card, picked from the user's profile. */
  metrics: MealMetric[];
}

/**
 * Scores every planned meal against the signed-in user's own profile (not
 * the household) — see lib/mealDanger.ts for how.
 */
export function useMealPlanImpact(meals: Meal[]): MealPlanImpact {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<Record<string, RecipeIngredient[]>>({});
  const [recipeServings, setRecipeServings] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
        .then(({ data }) => {
          if (!cancelled && data) setProfile(data as UserProfile);
        });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  // Stable key so we only refetch ingredients when the set of recipes changes.
  const recipeIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          meals.flatMap((m) => m.items.map((i) => i.recipe_id)).filter(Boolean) as string[],
        ),
      )
        .sort()
        .join(','),
    [meals],
  );

  // Bumped each time the screen comes back into view, so a recipe edited
  // elsewhere (new ingredient, different servings) is re-checked.
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setFocusTick((t) => t + 1);
    }, []),
  );

  useEffect(() => {
    if (!recipeIdsKey) {
      setRecipeIngredients({});
      setRecipeServings({});
      return;
    }
    let cancelled = false;
    const ids = recipeIdsKey.split(',');
    Promise.all([
      supabase.from('recipe_ingredients').select('*').in('recipe_id', ids),
      supabase.from('recipes').select('id, servings').in('id', ids),
    ]).then(([ingRes, recipeRes]) => {
      if (cancelled) return;
      const grouped: Record<string, RecipeIngredient[]> = {};
      for (const row of (ingRes.data ?? []) as RecipeIngredient[]) {
        (grouped[row.recipe_id] ??= []).push(row);
      }
      const servings: Record<string, number> = {};
      for (const row of (recipeRes.data ?? []) as { id: string; servings: number }[]) {
        servings[row.id] = row.servings;
      }
      setRecipeIngredients(grouped);
      setRecipeServings(servings);
    });
    return () => {
      cancelled = true;
    };
  }, [recipeIdsKey, focusTick]);

  useRepairMissingNutrition(meals);

  const metrics = useMemo(() => cardMetricsFor(profile), [profile]);

  const byMeal = useMemo(() => {
    const out: Record<string, MealImpact> = {};
    if (!profile) return out;
    for (const meal of meals) {
      const impact = scoreMeal(meal, profile, recipeIngredients, recipeServings);
      if (impact) out[meal.id] = impact;
    }
    return out;
  }, [meals, profile, recipeIngredients, recipeServings]);

  return { byMeal, metrics };
}

// ── Nutrition repair ─────────────────────────────────────────────────────────

function hasNoNutrition(item: MealPlanEntry): boolean {
  const per100 = item.product_snapshot?.nutrition_per_100g ?? {};
  return Object.values(per100).every((v) => v == null);
}

/**
 * Products added from scan history used to be saved with no nutrition when
 * the phone's product cache missed. Look each one up on Open Food Facts
 * once and save it back, so the meal can be scored and totalled. The
 * planner's realtime feed (or the next focus) picks up the change.
 */
/** Shared by every screen using the hook (dashboard and planner), so an
 *  item is only looked up once per app session. */
const repairTried = new Set<string>();

function useRepairMissingNutrition(meals: Meal[]) {

  useEffect(() => {
    const broken = meals
      .flatMap((m) => m.items)
      .filter((i) => i.kind === 'product' && i.barcode && i.product_snapshot && hasNoNutrition(i))
      .filter((i) => !repairTried.has(i.id));
    for (const item of broken) {
      repairTried.add(item.id);
      const snap = item.product_snapshot!;
      snapshotFromOff({
        barcode: item.barcode!,
        product_name: snap.product_name,
        brand: snap.brand,
        image_url: snap.image_url,
        nutriscore_grade: snap.nutriscore_grade,
      }).then((fresh) => {
        if (!fresh || Object.values(fresh.nutrition_per_100g).every((v) => v == null)) return;
        // Keep what was saved (ingredients, allergens) and fill in the gaps.
        const product_snapshot = {
          ...snap,
          nutrition_per_100g: fresh.nutrition_per_100g,
          allergens: snap.allergens?.length ? snap.allergens : fresh.allergens,
          ingredients: snap.ingredients?.length ? snap.ingredients : fresh.ingredients,
          ingredients_text: snap.ingredients_text ?? fresh.ingredients_text,
        };
        const nutrition = productNutrition(
          product_snapshot,
          Number(item.quantity_value ?? 100),
          item.quantity_unit ?? 'g',
        );
        return supabase
          .from('meal_plan_entries')
          .update({ product_snapshot, nutrition })
          .eq('id', item.id)
          .then(({ error }) => {
            if (error) console.warn('[useMealPlan] nutrition repair failed:', error.message);
          });
      });
    }
  }, [meals]);
}
