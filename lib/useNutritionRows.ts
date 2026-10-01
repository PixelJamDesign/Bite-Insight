/**
 * useNutritionRows — the NutritionPanel rows that matter to the signed-in
 * user (see nutritionRowsFor). Reads the shared profile cache, so it's
 * usually instant.
 */
import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { fetchAndCacheProfile, getCachedProfile } from './profileCache';
import { nutritionRowsFor } from './mealDanger';
import type { NutrientRowKey } from './types';

export function useNutritionRows(): NutrientRowKey[] {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [rows, setRows] = useState<NutrientRowKey[]>(() =>
    nutritionRowsFor(getCachedProfile()?.profile ?? null),
  );

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchAndCacheProfile(userId).then((cached) => {
      if (!cancelled && cached) setRows(nutritionRowsFor(cached.profile));
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return rows;
}
