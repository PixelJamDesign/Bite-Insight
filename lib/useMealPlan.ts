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
import { addDays, listMeals, toDateKey } from './mealPlan';
import { fetchHousehold, type Household } from './householdMembers';
import { computeHouseholdImpact } from './householdImpact';
import type { Meal, RecipeIngredient } from './types';

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

// ── useMealPlanImpact — who in the household should watch each meal ──────────

export interface MealImpact {
  /** Names of members for whom the meal hits an allergy. */
  avoid: string[];
  /** Names of members with a dietary or condition conflict. */
  caution: string[];
}

/**
 * Runs the same household check the recipe detail screen uses against
 * every planned meal. Returns a map of meal id → flagged member names;
 * meals that are fine for everyone are absent.
 */
export function useMealPlanImpact(meals: Meal[]): Record<string, MealImpact> {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [household, setHousehold] = useState<Household | null>(null);
  const [recipeIngredients, setRecipeIngredients] = useState<Record<string, RecipeIngredient[]>>({});

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchHousehold(userId).then((h) => {
      if (!cancelled) setHousehold(h);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

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

  useEffect(() => {
    if (!recipeIdsKey) {
      setRecipeIngredients({});
      return;
    }
    let cancelled = false;
    supabase
      .from('recipe_ingredients')
      .select('*')
      .in('recipe_id', recipeIdsKey.split(','))
      .then(({ data }) => {
        if (cancelled || !data) return;
        const grouped: Record<string, RecipeIngredient[]> = {};
        for (const row of data as RecipeIngredient[]) {
          (grouped[row.recipe_id] ??= []).push(row);
        }
        setRecipeIngredients(grouped);
      });
    return () => {
      cancelled = true;
    };
  }, [recipeIdsKey]);

  return useMemo(() => {
    const out: Record<string, MealImpact> = {};
    if (!household) return out;

    for (const meal of meals) {
      // Everything in the meal is checked together, as one ingredient list.
      const ingredients: RecipeIngredient[] = [];
      for (const item of meal.items) {
        if (item.kind === 'recipe' && item.recipe_id) {
          ingredients.push(...(recipeIngredients[item.recipe_id] ?? []));
        } else if (item.product_snapshot) {
          ingredients.push({
            id: item.id,
            recipe_id: '',
            position: 0,
            barcode: item.barcode,
            scan_id: item.scan_id,
            quantity_value: Number(item.quantity_value ?? 100),
            quantity_unit: item.quantity_unit ?? 'g',
            quantity_display: null,
            product_snapshot: item.product_snapshot,
            created_at: item.created_at,
          });
        }
      }
      if (ingredients.length === 0) continue;

      const rows = computeHouseholdImpact(ingredients, household.self, household.family);
      const avoid = rows.filter((r) => r.status === 'avoid').map((r) => r.name);
      const caution = rows.filter((r) => r.status === 'caution').map((r) => r.name);
      if (avoid.length > 0 || caution.length > 0) out[meal.id] = { avoid, caution };
    }
    return out;
  }, [meals, household, recipeIngredients]);
}
