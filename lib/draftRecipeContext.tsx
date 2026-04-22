/**
 * DraftRecipeContext — the in-flight recipe state that survives navigation.
 *
 * Any screen that wants to contribute ingredients to a recipe the user is
 * building (food search pick mode, scanner pick mode, scan-result
 * "Add to recipe") reads/writes this context instead of carrying state
 * in local hooks.
 *
 * Persisted to AsyncStorage so drafts survive app restarts. Clearing only
 * happens on explicit "Save recipe" or "Discard draft".
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeRecipeTotals,
  computeTotalWeightGrams,
  computeRecipeNutriscore,
  createRecipe,
  updateRecipe,
  type NewIngredientInput,
} from './recipes';
import type { ProductSnapshot, QuantityUnit, RecipeWithIngredients } from './types';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A single ingredient row inside the draft. `_localId` gives us a stable
 * React key that doesn't depend on DB uuids (which don't exist yet for
 * new rows) or array index (which would break when items are removed).
 */
export interface DraftIngredient extends NewIngredientInput {
  _localId: string;
}

/**
 * The draft itself. `mode` distinguishes a brand new recipe from editing
 * an existing one — on save, the former creates, the latter updates.
 */
export interface DraftRecipe {
  mode: 'new' | 'edit';
  editingRecipeId?: string;            // only set in 'edit' mode
  name: string;
  servings: number;
  coverImageUrl: string | null;
  prepTimeMin: number | null;
  cookTimeMin: number | null;
  method: string[];
  tags: string[];
  ingredients: DraftIngredient[];
  /** Stamped when the draft is first created — helps debug stale drafts */
  createdAt: string;
}

interface DraftContextValue {
  draft: DraftRecipe | null;
  hasDraft: boolean;

  // Lifecycle
  startNew: (seed?: Partial<Pick<DraftRecipe, 'name' | 'servings'>>) => void;
  startEdit: (recipe: RecipeWithIngredients) => void;
  clear: () => void;

  // Field setters
  setName: (v: string) => void;
  setServings: (v: number) => void;
  setCoverImageUrl: (v: string | null) => void;
  setPrepTimeMin: (v: number | null) => void;
  setCookTimeMin: (v: number | null) => void;
  setMethod: (v: string[]) => void;
  setTags: (v: string[]) => void;

  // Ingredient ops
  addIngredient: (input: Omit<NewIngredientInput, 'position'>) => void;
  updateIngredient: (
    localId: string,
    patch: Partial<Pick<NewIngredientInput, 'quantity_value' | 'quantity_unit' | 'quantity_display' | 'product_snapshot'>>,
  ) => void;
  removeIngredient: (localId: string) => void;
  reorderIngredient: (fromIndex: number, toIndex: number) => void;

  // Computed
  totals: ReturnType<typeof computeRecipeTotals>;
  totalWeightG: number;
  nutriscore: string | null;
  canSave: boolean;

  // Persistence — commit to DB
  save: (userId: string) => Promise<string | null>;      // returns recipe id or null
  saveAsUpdate: () => Promise<boolean>;                   // uses editingRecipeId
}

const STORAGE_KEY = '@biteinsight/draft_recipe/v1';

function genLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyDraft(): DraftRecipe {
  return {
    mode: 'new',
    name: '',
    servings: 1,
    coverImageUrl: null,
    prepTimeMin: null,
    cookTimeMin: null,
    method: [],
    tags: [],
    ingredients: [],
    createdAt: new Date().toISOString(),
  };
}

// ── Context ──────────────────────────────────────────────────────────────────

const DraftRecipeContext = createContext<DraftContextValue | null>(null);

export function DraftRecipeProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DraftRecipe | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ── Hydrate from AsyncStorage on mount ─────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && raw) {
          const parsed: DraftRecipe = JSON.parse(raw);
          // Sanity check before rehydrating
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.ingredients)) {
            setDraft(parsed);
          }
        }
      } catch (e) {
        console.warn('[draftRecipe] hydrate failed:', e);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Persist draft to AsyncStorage on every change ──────────────────────────
  // We use a ref to skip the initial write from hydration itself.
  const skipNextPersistRef = useRef(true);
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersistRef.current) {
      skipNextPersistRef.current = false;
      return;
    }
    (async () => {
      try {
        if (draft) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.warn('[draftRecipe] persist failed:', e);
      }
    })();
  }, [draft, hydrated]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  const startNew = useCallback(
    (seed?: Partial<Pick<DraftRecipe, 'name' | 'servings'>>) => {
      setDraft({
        ...emptyDraft(),
        ...(seed?.name != null ? { name: seed.name } : {}),
        ...(seed?.servings != null ? { servings: seed.servings } : {}),
      });
    },
    [],
  );

  const startEdit = useCallback((recipe: RecipeWithIngredients) => {
    setDraft({
      mode: 'edit',
      editingRecipeId: recipe.id,
      name: recipe.name,
      servings: recipe.servings,
      coverImageUrl: recipe.cover_image_url,
      prepTimeMin: recipe.prep_time_min,
      cookTimeMin: recipe.cook_time_min,
      method: recipe.method,
      tags: recipe.tags,
      ingredients: recipe.ingredients.map((i) => ({
        _localId: genLocalId(),
        position: i.position,
        barcode: i.barcode,
        scan_id: i.scan_id,
        quantity_value: Number(i.quantity_value),
        quantity_unit: i.quantity_unit,
        quantity_display: i.quantity_display,
        product_snapshot: i.product_snapshot,
      })),
      createdAt: new Date().toISOString(),
    });
  }, []);

  const clear = useCallback(() => {
    setDraft(null);
  }, []);

  // ── Field setters ─────────────────────────────────────────────────────────
  const setField = useCallback(
    <K extends keyof DraftRecipe>(field: K, value: DraftRecipe[K]) => {
      setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
    },
    [],
  );

  const setName = useCallback((v: string) => setField('name', v), [setField]);
  const setServings = useCallback((v: number) => setField('servings', v), [setField]);
  const setCoverImageUrl = useCallback(
    (v: string | null) => setField('coverImageUrl', v),
    [setField],
  );
  const setPrepTimeMin = useCallback((v: number | null) => setField('prepTimeMin', v), [setField]);
  const setCookTimeMin = useCallback((v: number | null) => setField('cookTimeMin', v), [setField]);
  const setMethod = useCallback((v: string[]) => setField('method', v), [setField]);
  const setTags = useCallback((v: string[]) => setField('tags', v), [setField]);

  // ── Ingredient ops ────────────────────────────────────────────────────────
  const addIngredient = useCallback(
    (input: Omit<NewIngredientInput, 'position'>) => {
      setDraft((prev) => {
        // If no draft exists yet, spin one up — so "add to recipe" from
        // scan-result can seed a new draft without a pre-step.
        const base = prev ?? emptyDraft();
        const newIng: DraftIngredient = {
          ...input,
          _localId: genLocalId(),
          position: base.ingredients.length,
        };
        return { ...base, ingredients: [...base.ingredients, newIng] };
      });
    },
    [],
  );

  const updateIngredient = useCallback(
    (
      localId: string,
      patch: Partial<Pick<NewIngredientInput, 'quantity_value' | 'quantity_unit' | 'quantity_display' | 'product_snapshot'>>,
    ) => {
      setDraft((prev) =>
        prev
          ? {
              ...prev,
              ingredients: prev.ingredients.map((i) =>
                i._localId === localId ? { ...i, ...patch } : i,
              ),
            }
          : prev,
      );
    },
    [],
  );

  const removeIngredient = useCallback((localId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            ingredients: prev.ingredients
              .filter((i) => i._localId !== localId)
              .map((i, idx) => ({ ...i, position: idx })),
          }
        : prev,
    );
  }, []);

  const reorderIngredient = useCallback((fromIndex: number, toIndex: number) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = [...prev.ingredients];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return {
        ...prev,
        ingredients: next.map((i, idx) => ({ ...i, position: idx })),
      };
    });
  }, []);

  // ── Computed values ───────────────────────────────────────────────────────
  const totals = useMemo(
    () =>
      draft
        ? computeRecipeTotals(draft.ingredients, draft.servings)
        : computeRecipeTotals([], 1),
    [draft],
  );
  const totalWeightG = useMemo(
    () => (draft ? computeTotalWeightGrams(draft.ingredients) : 0),
    [draft],
  );
  const nutriscore = useMemo(
    () =>
      draft ? computeRecipeNutriscore(totals, draft.servings, totalWeightG) : null,
    [draft, totals, totalWeightG],
  );
  const canSave = Boolean(
    draft &&
      draft.name.trim().length > 0 &&
      draft.ingredients.length > 0 &&
      draft.servings > 0,
  );

  // ── Persistence — commit to Supabase ───────────────────────────────────────
  const save = useCallback(
    async (userId: string): Promise<string | null> => {
      if (!draft || !canSave) return null;
      const ingredientInputs: NewIngredientInput[] = draft.ingredients.map(
        ({ _localId: _drop, ...rest }) => rest,
      );
      const id = await createRecipe(
        userId,
        {
          name: draft.name.trim(),
          servings: draft.servings,
          cover_image_url: draft.coverImageUrl,
          prep_time_min: draft.prepTimeMin,
          cook_time_min: draft.cookTimeMin,
          method: draft.method,
          tags: draft.tags,
        },
        ingredientInputs,
      );
      if (id) setDraft(null);
      return id;
    },
    [draft, canSave],
  );

  const saveAsUpdate = useCallback(async (): Promise<boolean> => {
    if (!draft || !canSave || draft.mode !== 'edit' || !draft.editingRecipeId) {
      return false;
    }
    const ingredientInputs: NewIngredientInput[] = draft.ingredients.map(
      ({ _localId: _drop, ...rest }) => rest,
    );
    const ok = await updateRecipe(
      draft.editingRecipeId,
      {
        name: draft.name.trim(),
        servings: draft.servings,
        cover_image_url: draft.coverImageUrl,
        prep_time_min: draft.prepTimeMin,
        cook_time_min: draft.cookTimeMin,
        method: draft.method,
        tags: draft.tags,
      },
      ingredientInputs,
    );
    if (ok) setDraft(null);
    return ok;
  }, [draft, canSave]);

  // ── Provider value ────────────────────────────────────────────────────────
  const value = useMemo<DraftContextValue>(
    () => ({
      draft,
      hasDraft: Boolean(draft),
      startNew,
      startEdit,
      clear,
      setName,
      setServings,
      setCoverImageUrl,
      setPrepTimeMin,
      setCookTimeMin,
      setMethod,
      setTags,
      addIngredient,
      updateIngredient,
      removeIngredient,
      reorderIngredient,
      totals,
      totalWeightG,
      nutriscore,
      canSave,
      save,
      saveAsUpdate,
    }),
    [
      draft,
      startNew,
      startEdit,
      clear,
      setName,
      setServings,
      setCoverImageUrl,
      setPrepTimeMin,
      setCookTimeMin,
      setMethod,
      setTags,
      addIngredient,
      updateIngredient,
      removeIngredient,
      reorderIngredient,
      totals,
      totalWeightG,
      nutriscore,
      canSave,
      save,
      saveAsUpdate,
    ],
  );

  return (
    <DraftRecipeContext.Provider value={value}>{children}</DraftRecipeContext.Provider>
  );
}

export function useDraftRecipe(): DraftContextValue {
  const ctx = useContext(DraftRecipeContext);
  if (!ctx) {
    throw new Error('useDraftRecipe must be used within DraftRecipeProvider');
  }
  return ctx;
}
