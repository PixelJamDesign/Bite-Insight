/**
 * React hooks for recipes — handles fetching, realtime updates, and
 * household impact computation.
 *
 * Usage:
 *   const { recipes, loading, refresh } = useRecipes();
 *   const { recipe, ingredients, household, loading } = useRecipe(id);
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { listRecipes, getRecipe } from './recipes';
import { fetchHousehold } from './householdMembers';
import { computeHouseholdImpact, summariseHouseholdImpact } from './householdImpact';
import type {
  Recipe,
  RecipeWithIngredients,
  HouseholdImpactRow,
  UserProfile,
  FamilyProfile,
} from './types';

// ── useRecipes — list all of the user's recipes ──────────────────────────────

export interface UseRecipesResult {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecipes(): UseRecipesResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listRecipes(userId);
      setRecipes(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load recipes');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription — refresh the list on any insert/update/delete
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`recipes-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'recipes', filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, load]);

  return { recipes, loading, error, refresh: load };
}

// ── useRecipe — single recipe with ingredients + household impact ────────────

export interface UseRecipeResult {
  recipe: RecipeWithIngredients | null;
  loading: boolean;
  error: string | null;
  household: {
    self: UserProfile | null;
    family: FamilyProfile[];
    impact: HouseholdImpactRow[];
    summary: ReturnType<typeof summariseHouseholdImpact>;
  };
  refresh: () => Promise<void>;
}

export function useRecipe(recipeId: string | null | undefined): UseRecipeResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selfProfile, setSelfProfile] = useState<UserProfile | null>(null);
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);

  const load = useCallback(async () => {
    if (!recipeId || !userId) {
      setRecipe(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [r, h] = await Promise.all([
        getRecipe(recipeId),
        fetchHousehold(userId),
      ]);
      setRecipe(r);
      if (h) {
        setSelfProfile(h.self);
        setFamilyProfiles(h.family);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load recipe');
    } finally {
      setLoading(false);
    }
  }, [recipeId, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const impact =
    recipe && selfProfile
      ? computeHouseholdImpact(recipe.ingredients, selfProfile, familyProfiles)
      : [];

  return {
    recipe,
    loading,
    error,
    household: {
      self: selfProfile,
      family: familyProfiles,
      impact,
      summary: summariseHouseholdImpact(impact),
    },
    refresh: load,
  };
}
