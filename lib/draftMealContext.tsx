/**
 * DraftMealContext — the meal being built, held above navigation.
 *
 * The meal builder (MealBuilderSheet) sends the user out to food search, the
 * scanner and the recipe / scan-history pickers to collect items. Those
 * screens write into this context, the same way the recipe builder's
 * pickers write into DraftRecipeContext.
 *
 * In memory only. A half-built meal is quick to redo, and a stale draft
 * reappearing on another day would be more confusing than helpful.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { draftItemFromEntry, withPortion } from './mealPlan';
import type { Meal, MealItemDraft, QuantityUnit } from './types';

let draftIdSeq = 0;
const nextDraftId = () => ++draftIdSeq;

export interface DraftMeal {
  /** New for every startNew/startEdit, so per-draft UI state (e.g. the
   *  Save as a recipe tick) resets even for the same day or meal. */
  id: number;
  /** Set when editing an existing meal. */
  editingMealId: string | null;
  dateKey: string;
  time: string;
  /** Empty string = name it from the time on save. */
  name: string;
  items: MealItemDraft[];
}

interface DraftMealContextValue {
  draft: DraftMeal | null;

  // Lifecycle
  startNew: (dateKey: string, time: string) => void;
  startEdit: (meal: Meal) => void;
  clear: () => void;

  // Fields
  setName: (name: string) => void;
  setTime: (time: string) => void;

  // Items
  addItem: (item: MealItemDraft) => void;
  updatePortion: (
    key: string,
    portion: { servings?: number; quantity_value?: number; quantity_unit?: QuantityUnit },
  ) => void;
  removeItem: (key: string) => void;
}

const DraftMealContext = createContext<DraftMealContextValue | null>(null);

export function DraftMealProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<DraftMeal | null>(null);

  const startNew = useCallback((dateKey: string, time: string) => {
    setDraft({ id: nextDraftId(), editingMealId: null, dateKey, time, name: '', items: [] });
  }, []);

  const startEdit = useCallback((meal: Meal) => {
    setDraft({
      id: nextDraftId(),
      editingMealId: meal.id,
      dateKey: meal.plan_date,
      time: meal.meal_time,
      name: meal.name,
      items: meal.items.map(draftItemFromEntry),
    });
  }, []);

  const clear = useCallback(() => setDraft(null), []);

  const setName = useCallback((name: string) => {
    setDraft((d) => (d ? { ...d, name } : d));
  }, []);

  const setTime = useCallback((time: string) => {
    setDraft((d) => (d ? { ...d, time } : d));
  }, []);

  const addItem = useCallback((item: MealItemDraft) => {
    setDraft((d) => (d ? { ...d, items: [...d.items, item] } : d));
  }, []);

  const updatePortion = useCallback<DraftMealContextValue['updatePortion']>((key, portion) => {
    setDraft((d) =>
      d ? { ...d, items: d.items.map((i) => (i.key === key ? withPortion(i, portion) : i)) } : d,
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setDraft((d) => (d ? { ...d, items: d.items.filter((i) => i.key !== key) } : d));
  }, []);

  const value = useMemo(
    () => ({ draft, startNew, startEdit, clear, setName, setTime, addItem, updatePortion, removeItem }),
    [draft, startNew, startEdit, clear, setName, setTime, addItem, updatePortion, removeItem],
  );

  return <DraftMealContext.Provider value={value}>{children}</DraftMealContext.Provider>;
}

export function useDraftMeal(): DraftMealContextValue {
  const ctx = useContext(DraftMealContext);
  if (!ctx) throw new Error('useDraftMeal must be used inside DraftMealProvider');
  return ctx;
}
