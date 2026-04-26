/**
 * React hooks for recipes — handles fetching, realtime updates, and
 * household impact computation.
 *
 * Usage:
 *   const { recipes, loading, refresh } = useRecipes();
 *   const { recipe, ingredients, household, loading } = useRecipe(id);
 */
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { listRecipes, getRecipe, listPublicRecipes } from './recipes';
import { fetchHousehold } from './householdMembers';
import { computeHouseholdImpact, summariseHouseholdImpact } from './householdImpact';
import type {
  Recipe,
  PublicRecipe,
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

// ── usePublicRecipes — community feed ────────────────────────────────────────

export interface UsePublicRecipesResult {
  recipes: PublicRecipe[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Lists community-shared recipes from other users, sorted by like
 * count. Excludes the caller's own recipes so the feed is purely
 * discovery. Plus-gating lives at the screen entry point, not here.
 * Returns PublicRecipe rows which include author profile data for
 * the card's "by [Author]" line and avatar.
 */
export function usePublicRecipes(): UsePublicRecipesResult {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [recipes, setRecipes] = useState<PublicRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Exclude the caller's own recipes — the community feed is for
      // discovery, and the user already sees their own shared
      // recipes on the My Recipes tab (with the likes pill on the
      // card to confirm the share is live).
      const data = await listPublicRecipes(userId);
      setRecipes(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load community recipes');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch when the screen regains focus so newly-shared recipes
  // surface immediately when the user navigates back from a share.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  // Refresh when the detail screen regains focus — e.g. after the
  // user taps Save in /recipes/{id}/edit and routes back. The detail
  // screen stays mounted in the stack on back navigation, so without
  // this it would still show the pre-edit data.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
