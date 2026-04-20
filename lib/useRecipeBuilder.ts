/**
 * useRecipeBuilder — manages the local state for the Recipe Builder screen.
 *
 * Handles: recipe fields, ingredient list with inline edits, live nutrition
 * preview, and save/update handoff.
 *
 * The hook is deliberately design-agnostic — returns state + setters only.
 * Any UI shell (current minimal placeholder, future polished design) can
 * plug in.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  computeRecipeTotals,
  computeTotalWeightGrams,
  computeRecipeNutriscore,
  createRecipe,
  updateRecipe,
} from './recipes';
import type {
  NewIngredientInput,
  NewRecipeInput,
} from './recipes';
import type {
  ProductSnapshot,
  QuantityUnit,
  RecipeWithIngredients,
} from './types';

export interface BuilderIngredient extends NewIngredientInput {
  // Stable id so React list keys don't churn on edit
  _localId: string;
}

export interface UseRecipeBuilderResult {
  // ── State
  name: string;
  servings: number;
  coverImageUrl: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  method: string[];
  tags: string[];
  ingredients: BuilderIngredient[];

  // ── Setters
  setName: (v: string) => void;
  setServings: (v: number) => void;
  setCoverImageUrl: (v: string | null) => void;
  setPrepTimeMin: (v: number | null) => void;
  setCookTimeMin: (v: number | null) => void;
  setMethod: (v: string[]) => void;
  setTags: (v: string[]) => void;

  // ── Ingredient operations
  addIngredient: (input: Omit<NewIngredientInput, 'position'>) => void;
  removeIngredient: (localId: string) => void;
  updateIngredient: (
    localId: string,
    patch: Partial<Pick<NewIngredientInput, 'quantity_value' | 'quantity_unit' | 'quantity_display' | 'product_snapshot'>>,
  ) => void;
  reorderIngredient: (fromIndex: number, toIndex: number) => void;

  // ── Computed
  totals: ReturnType<typeof computeRecipeTotals>;
  totalWeightG: number;
  nutriscore: string | null;
  canSave: boolean;

  // ── Persistence
  save: (userId: string) => Promise<string | null>;
  saveAsUpdate: (recipeId: string) => Promise<boolean>;

  // ── Seed from existing recipe (for edit mode)
  hydrateFromRecipe: (recipe: RecipeWithIngredients) => void;

  // ── Reset to blank state
  reset: () => void;
}

function genLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useRecipeBuilder(initial?: {
  name?: string;
  seedIngredients?: Array<{
    snapshot: ProductSnapshot;
    quantity_value?: number;
    quantity_unit?: QuantityUnit;
    barcode?: string | null;
    scan_id?: string | null;
  }>;
}): UseRecipeBuilderResult {
  const [name, setName] = useState(initial?.name ?? '');
  const [servings, setServings] = useState(1);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [prepTimeMin, setPrepTimeMin] = useState<number | null>(null);
  const [cookTimeMin, setCookTimeMin] = useState<number | null>(null);
  const [method, setMethod] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [ingredients, setIngredients] = useState<BuilderIngredient[]>(() =>
    (initial?.seedIngredients ?? []).map((s, idx) => ({
      _localId: genLocalId(),
      position: idx,
      barcode: s.barcode ?? null,
      scan_id: s.scan_id ?? null,
      quantity_value: s.quantity_value ?? 100,
      quantity_unit: s.quantity_unit ?? 'g',
      quantity_display: null,
      product_snapshot: s.snapshot,
    })),
  );

  // ── Ingredient ops
  const addIngredient = useCallback((input: Omit<NewIngredientInput, 'position'>) => {
    setIngredients((prev) => [
      ...prev,
      { ...input, _localId: genLocalId(), position: prev.length },
    ]);
  }, []);

  const removeIngredient = useCallback((localId: string) => {
    setIngredients((prev) =>
      prev
        .filter((i) => i._localId !== localId)
        .map((i, idx) => ({ ...i, position: idx })),
    );
  }, []);

  const updateIngredient = useCallback(
    (localId: string, patch: Partial<Pick<NewIngredientInput, 'quantity_value' | 'quantity_unit' | 'quantity_display' | 'product_snapshot'>>) => {
      setIngredients((prev) =>
        prev.map((i) => (i._localId === localId ? { ...i, ...patch } : i)),
      );
    },
    [],
  );

  const reorderIngredient = useCallback((fromIndex: number, toIndex: number) => {
    setIngredients((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next.map((i, idx) => ({ ...i, position: idx }));
    });
  }, []);

  // ── Computed values
  const totals = useMemo(
    () => computeRecipeTotals(ingredients, servings),
    [ingredients, servings],
  );
  const totalWeightG = useMemo(
    () => computeTotalWeightGrams(ingredients),
    [ingredients],
  );
  const nutriscore = useMemo(
    () => computeRecipeNutriscore(totals, servings, totalWeightG),
    [totals, servings, totalWeightG],
  );
  const canSave = name.trim().length > 0 && ingredients.length > 0 && servings > 0;

  // ── Persistence
  const save = useCallback(
    async (userId: string): Promise<string | null> => {
      if (!canSave) return null;
      const recipeInput: NewRecipeInput = {
        name: name.trim(),
        servings,
        cover_image_url: coverImageUrl,
        prep_time_min: prepTimeMin,
        cook_time_min: cookTimeMin,
        method,
        tags,
      };
      // Strip _localId before persisting
      const ingredientInputs: NewIngredientInput[] = ingredients.map(
        ({ _localId: _drop, ...rest }) => rest,
      );
      return createRecipe(userId, recipeInput, ingredientInputs);
    },
    [canSave, name, servings, coverImageUrl, prepTimeMin, cookTimeMin, method, tags, ingredients],
  );

  const saveAsUpdate = useCallback(
    async (recipeId: string): Promise<boolean> => {
      if (!canSave) return false;
      const ingredientInputs: NewIngredientInput[] = ingredients.map(
        ({ _localId: _drop, ...rest }) => rest,
      );
      return updateRecipe(
        recipeId,
        {
          name: name.trim(),
          servings,
          cover_image_url: coverImageUrl,
          prep_time_min: prepTimeMin,
          cook_time_min: cookTimeMin,
          method,
          tags,
        },
        ingredientInputs,
      );
    },
    [canSave, name, servings, coverImageUrl, prepTimeMin, cookTimeMin, method, tags, ingredients],
  );

  const hydrateFromRecipe = useCallback((r: RecipeWithIngredients) => {
    setName(r.name);
    setServings(r.servings);
    setCoverImageUrl(r.cover_image_url);
    setPrepTimeMin(r.prep_time_min);
    setCookTimeMin(r.cook_time_min);
    setMethod(r.method);
    setTags(r.tags);
    setIngredients(
      r.ingredients.map((i) => ({
        _localId: genLocalId(),
        position: i.position,
        barcode: i.barcode,
        scan_id: i.scan_id,
        quantity_value: Number(i.quantity_value),
        quantity_unit: i.quantity_unit,
        quantity_display: i.quantity_display,
        product_snapshot: i.product_snapshot,
      })),
    );
  }, []);

  const reset = useCallback(() => {
    setName('');
    setServings(1);
    setCoverImageUrl(null);
    setPrepTimeMin(null);
    setCookTimeMin(null);
    setMethod([]);
    setTags([]);
    setIngredients([]);
  }, []);

  return {
    name,
    servings,
    coverImageUrl,
    prepTimeMin,
    cookTimeMin,
    method,
    tags,
    ingredients,
    setName,
    setServings,
    setCoverImageUrl,
    setPrepTimeMin,
    setCookTimeMin,
    setMethod,
    setTags,
    addIngredient,
    removeIngredient,
    updateIngredient,
    reorderIngredient,
    totals,
    totalWeightG,
    nutriscore,
    canSave,
    save,
    saveAsUpdate,
    hydrateFromRecipe,
    reset,
  };
}
