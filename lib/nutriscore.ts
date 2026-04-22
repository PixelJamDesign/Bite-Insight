/**
 * Simplified Nutri-score computation for recipes.
 *
 * Real OFF Nutri-score factors in fruit/veg/nuts content, fibre, protein,
 * sat fat, sugars, sodium, energy etc. — beyond scope for recipe aggregation
 * where we don't have the component data reliably.
 *
 * This function approximates using what we have (per-100g totals for the
 * recipe): energy, sat fat, sugars, salt as "negatives" and fibre + protein
 * as "positives". Good enough for a first pass visual cue — can be upgraded
 * later if we compute recipe totals per 100g properly (not per-serving).
 */

export type NutriscoreGrade = 'a' | 'b' | 'c' | 'd' | 'e';

export interface NutriscoreInput {
  /** per 100g of the finished recipe */
  energy_kcal_100g?: number | null;
  sat_fat_g_100g?: number | null;
  sugars_g_100g?: number | null;
  salt_g_100g?: number | null;
  fiber_g_100g?: number | null;
  protein_g_100g?: number | null;
}

// ── Points tables (OFF-inspired, simplified) ─────────────────────────────────

/** Negative points — higher = worse */
function energyPoints(kcal: number): number {
  if (kcal <= 80) return 0;
  if (kcal <= 160) return 1;
  if (kcal <= 240) return 2;
  if (kcal <= 320) return 3;
  if (kcal <= 400) return 4;
  if (kcal <= 480) return 5;
  if (kcal <= 560) return 6;
  if (kcal <= 640) return 7;
  if (kcal <= 720) return 8;
  if (kcal <= 800) return 9;
  return 10;
}
function satFatPoints(g: number): number {
  return Math.min(10, Math.floor(g));
}
function sugarsPoints(g: number): number {
  if (g <= 4.5) return 0;
  if (g <= 9) return 1;
  if (g <= 13.5) return 2;
  if (g <= 18) return 3;
  if (g <= 22.5) return 4;
  if (g <= 27) return 5;
  if (g <= 31) return 6;
  if (g <= 36) return 7;
  if (g <= 40) return 8;
  if (g <= 45) return 9;
  return 10;
}
function saltPoints(g: number): number {
  // Salt is reported in g; convert to mg and use OFF thresholds
  const mg = g * 1000;
  if (mg <= 90) return 0;
  if (mg <= 180) return 1;
  if (mg <= 270) return 2;
  if (mg <= 360) return 3;
  if (mg <= 450) return 4;
  if (mg <= 540) return 5;
  if (mg <= 630) return 6;
  if (mg <= 720) return 7;
  if (mg <= 810) return 8;
  if (mg <= 900) return 9;
  return 10;
}
function fiberPoints(g: number): number {
  if (g <= 0.9) return 0;
  if (g <= 1.9) return 1;
  if (g <= 2.8) return 2;
  if (g <= 3.7) return 3;
  if (g <= 4.7) return 4;
  return 5;
}
function proteinPoints(g: number): number {
  if (g <= 1.6) return 0;
  if (g <= 3.2) return 1;
  if (g <= 4.8) return 2;
  if (g <= 6.4) return 3;
  if (g <= 8.0) return 4;
  return 5;
}

/**
 * Computes a Nutri-score grade from per-100g values.
 * Returns null if insufficient data (all inputs null/undefined).
 */
export function computeNutriscore(input: NutriscoreInput): NutriscoreGrade | null {
  const hasAny =
    input.energy_kcal_100g != null ||
    input.sat_fat_g_100g != null ||
    input.sugars_g_100g != null ||
    input.salt_g_100g != null;
  if (!hasAny) return null;

  const neg =
    energyPoints(input.energy_kcal_100g ?? 0) +
    satFatPoints(input.sat_fat_g_100g ?? 0) +
    sugarsPoints(input.sugars_g_100g ?? 0) +
    saltPoints(input.salt_g_100g ?? 0);

  const pos = fiberPoints(input.fiber_g_100g ?? 0) + proteinPoints(input.protein_g_100g ?? 0);

  const score = neg - pos;

  if (score <= -1) return 'a';
  if (score <= 2) return 'b';
  if (score <= 10) return 'c';
  if (score <= 18) return 'd';
  return 'e';
}

/** Human-readable verdict per grade */
export const NUTRISCORE_VERDICT: Record<NutriscoreGrade, string> = {
  a: 'Excellent',
  b: 'Good',
  c: 'OK',
  d: 'Poor',
  e: 'Bad',
};

/** Hex colours matching existing app scan-result patterns */
export const NUTRISCORE_COLORS: Record<NutriscoreGrade, string> = {
  a: '#009a1f',
  b: '#b8d828',
  c: '#ffc72d',
  d: '#ff8736',
  e: '#ff3f42',
};
