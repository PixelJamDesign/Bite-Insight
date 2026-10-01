/**
 * MealTotalsList — a day's (or meal's) nutrition totals as the same macro
 * stack the NutritionPanel uses (NutritionRows): the rows that matter to
 * the user first, "See full nutritional values" for the rest, "–" where
 * nothing carried a value. Used by the meal planner's count card.
 */
import { NutritionRows } from '@/components/NutritionPanel';
import { useNutritionRows } from '@/lib/useNutritionRows';
import type { MealNutrition } from '@/lib/types';

export function MealTotalsList({ totals }: { totals: MealNutrition }) {
  const focusRows = useNutritionRows();
  return (
    <NutritionRows
      focusRows={focusRows}
      values={{
        kcal: totals.kcal ?? null,
        fat: totals.fat_g ?? null,
        satFat: totals.sat_fat_g ?? null,
        carbs: totals.carbs_g ?? null,
        sugars: totals.sugars_g ?? null,
        fiber: totals.fiber_g ?? null,
        protein: totals.protein_g ?? null,
        salt: totals.salt_g ?? null,
      }}
    />
  );
}
