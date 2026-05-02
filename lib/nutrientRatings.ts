import { Colors } from '@/constants/theme';

// ── Local design tokens (shared with scan-result.tsx) ────────────────────────
const Extra = {
  positiveGreen: '#009a1f',
  poorOrange: '#ff8736',
};

// ── DRI reference values (EU / WHO adult) ─────────────────────────────────────
export const DRI: Record<string, number> = {
  energyKcal: 2000,
  fat: 70,
  saturatedFat: 20,
  carbs: 260,
  sugars: 90,
  fiber: 25,
  proteins: 50,
  salt: 6,
};

// ── Nutrient rows config ──────────────────────────────────────────────────────
export type NutrientKey =
  | 'energyKcal'
  | 'fat'
  | 'saturatedFat'
  | 'carbs'
  | 'sugars'
  | 'fiber'
  | 'proteins'
  | 'netCarbs'
  | 'salt';

export const NUTRIENT_LABELS: Record<NutrientKey, string> = {
  energyKcal: 'Calories',
  fat: 'Fat',
  saturatedFat: 'Saturated Fat',
  carbs: 'Carbohydrates',
  sugars: 'Sugars',
  fiber: 'Fibre',
  proteins: 'Protein',
  netCarbs: 'Net Carbs',
  salt: 'Sodium',
};

export const NUTRIENT_UNITS: Record<NutrientKey, string> = {
  energyKcal: 'kcal',
  fat: 'g',
  saturatedFat: 'g',
  carbs: 'g',
  sugars: 'g',
  fiber: 'g',
  proteins: 'g',
  netCarbs: 'g',
  salt: 'g',
};

// Nutrient rating thresholds — { low, moderate }.
// "inverted" nutrients (fiber, proteins) treat higher values as better.
export type Threshold = {
  low: number;
  moderate: number;
  inverted?: boolean;
  labels?: [string, string, string]; // [low, moderate, high] label overrides
};

export const DEFAULT_THRESHOLDS: Record<NutrientKey, Threshold> = {
  energyKcal:  { low: 100,  moderate: 300 },
  fat:         { low: 3,    moderate: 17.5 },
  saturatedFat:{ low: 3,    moderate: 17.5 },
  carbs:       { low: 5,    moderate: 22.5 },
  sugars:      { low: 5,    moderate: 22.5 },
  netCarbs:    { low: 5,    moderate: 22.5 },
  fiber:       { low: 3,    moderate: 6,   inverted: true },
  proteins:    { low: 5,    moderate: 10,  inverted: true, labels: ['Low', 'Moderate', 'Good'] },
  salt:        { low: 0.3,  moderate: 1.5 },
};

// Condition-specific threshold overrides.
// Each entry provides partial overrides that are merged on top of defaults.
// Keys use the camelCase DB key format matching profileOptions.ts.
export const CONDITION_OVERRIDES: Record<string, Partial<Record<NutrientKey, Partial<Threshold>>>> = {
  // ── Health conditions ──
  ckd: {
    salt:         { low: 0.1, moderate: 0.3 },
    proteins:     { low: 3,   moderate: 8 },
    saturatedFat: { low: 1,   moderate: 3 },
    sugars:       { low: 2,   moderate: 5 },
  },
  diabetes: {
    sugars:    { low: 2,   moderate: 5 },
    carbs:     { low: 3,   moderate: 15 },
    netCarbs:  { low: 3,   moderate: 15 },
    fiber:     { low: 5,   moderate: 10, inverted: true },
  },
  heartDisease: {
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    salt:        { low: 0.2, moderate: 0.8 },
    fiber:       { low: 5,   moderate: 10, inverted: true },
  },
  highCholesterol: {
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    fiber:       { low: 5,   moderate: 10, inverted: true },
  },
  hypertension: {
    salt: { low: 0.1, moderate: 0.6 },
  },
  ibs: {
    fiber: { low: 1.5, moderate: 3, inverted: true },
  },
  // ── Cancer (baseline — applies to all subtypes) ──
  // WCRF/AICR: limit saturated fat, added sugars, processed foods, alcohol.
  // Boost: dietary fibre (≥30g/day target), antioxidant-rich plant foods.
  cancer: {
    saturatedFat: { low: 1.5,  moderate: 5 },
    sugars:       { low: 3,    moderate: 10 },
    salt:         { low: 0.25, moderate: 0.75 },
    fiber:        { low: 2,    moderate: 4,   inverted: true },
  },
  // Colorectal subtype: stricter saturated fat (red meat linkage); fibre
  // threshold lowered to strongly reward high-fibre products.
  cancerColorectal: {
    saturatedFat: { low: 1,    moderate: 3 },
    sugars:       { low: 3,    moderate: 10 },
    salt:         { low: 0.25, moderate: 0.75 },
    fiber:        { low: 1.5,  moderate: 3,   inverted: true },
  },
  // Stomach subtype: salt is the dominant concern (matches hypertension level).
  cancerStomach: {
    saturatedFat: { low: 1.5,  moderate: 5 },
    sugars:       { low: 3,    moderate: 10 },
    salt:         { low: 0.1,  moderate: 0.3 },
    fiber:        { low: 2,    moderate: 4,   inverted: true },
  },
  // ── Cystic Fibrosis — Standard subtype ──────────────────────────────────────
  // CF inverts the usual logic: high fat and calories are NEEDED, salt is
  // actively supplemented (2-4× higher sweat losses). Fat is inverted so
  // higher fat = better rating; salt thresholds are set extremely high so
  // products effectively never trigger a salt warning for CF users.
  // Sugar is mildly relaxed because sugar still provides usable calories.
  cfStandard: {
    fat:          { low: 10,  moderate: 20,  inverted: true },
    saturatedFat: { low: 5,   moderate: 15,  inverted: true },
    salt:         { low: 999, moderate: 999 },
    sugars:       { low: 10,  moderate: 25 },
    fiber:        { low: 1,   moderate: 3,   inverted: true },
  },
  // ── Cystic Fibrosis — CFTR Modulator subtype ───────────────────────────────
  // Trikafta/Kaftrio/Alyftrek have normalised absorption. Fat is no longer
  // a calorie shortage problem; weight management is now a real concern.
  // Use near-default thresholds. Salt still relaxed (still higher losses
  // than the general population, just not as severe as untreated CF).
  cfModulator: {
    fat:          { low: 3,    moderate: 17.5 },
    saturatedFat: { low: 3,    moderate: 17.5 },
    salt:         { low: 1.0,  moderate: 2.5 },
    sugars:       { low: 5,    moderate: 22.5 },
  },
  // ── Cystic Fibrosis — CF-Related Diabetes (CFRD) subtype ───────────────────
  // High calorie / high fat maintained — CFRD diet stays high-fat, but
  // adds carbohydrate awareness for insulin dosing (NOT carb restriction).
  // Sugars mildly tighter than standard CF to flag empty-calorie products.
  cfCfrd: {
    fat:          { low: 8,    moderate: 18,  inverted: true },
    saturatedFat: { low: 4,    moderate: 12,  inverted: true },
    salt:         { low: 999,  moderate: 999 },
    sugars:       { low: 8,    moderate: 20 },
    carbs:        { low: 10,   moderate: 30 },
  },
  // ── Cystic Fibrosis — All of the above (modulator + CFRD) ─────────────────
  // For users who manage all three: standard CF baseline, on a modulator,
  // AND have CFRD. Modulator's normalised absorption dominates (no fat
  // inversion, weight-aware), with CFRD's carb threshold layered on.
  // Salt is relaxed (still higher losses than the general population, but
  // not as severe as untreated CF) to match the modulator profile.
  cfAll: {
    fat:          { low: 3,    moderate: 17.5 },
    saturatedFat: { low: 3,    moderate: 17.5 },
    salt:         { low: 1.0,  moderate: 2.5 },
    sugars:       { low: 5,    moderate: 22.5 },
    carbs:        { low: 10,   moderate: 30 },
  },
  crohns: {
    fiber: { low: 1.5, moderate: 3, inverted: true },
    fat:   { low: 2,   moderate: 10 },
  },
  uc: {
    fiber: { low: 1.5, moderate: 3, inverted: true },
    fat:   { low: 2,   moderate: 10 },
  },
  sibo: {
    fiber:  { low: 1.5, moderate: 3, inverted: true },
    sugars: { low: 2,   moderate: 5 },
  },
  leakyGut: {
    sugars: { low: 2,  moderate: 8 },
    fiber:  { low: 2,  moderate: 5, inverted: true },
  },
  gerd: {
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  metabolicSyndrome: {
    // Legacy key — kept for existing users migrated before key rename
    sugars:   { low: 2,   moderate: 5 },
    carbs:    { low: 3,   moderate: 15 },
    netCarbs: { low: 3,   moderate: 15 },
    fat:      { low: 2,   moderate: 10 },
    salt:     { low: 0.1, moderate: 0.6 },
  },
  pcos: {
    sugars:   { low: 2,   moderate: 5 },
    carbs:    { low: 3,   moderate: 15 },
    netCarbs: { low: 3,   moderate: 15 },
  },
  eczema: {
    sugars: { low: 3, moderate: 10 },
  },
  migraine: {
    sugars: { low: 3, moderate: 10 },
    salt:   { low: 0.2, moderate: 0.8 },
  },
  lupus: {
    salt:        { low: 0.2, moderate: 0.8 },
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  ra: {
    saturatedFat:{ low: 1.5, moderate: 5 },
    sugars:      { low: 3,   moderate: 10 },
  },
  ms: {
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  me: {
    sugars: { low: 3, moderate: 10 },
  },
  adhd: {
    sugars: { low: 3, moderate: 10 },
  },
  autism: {
    sugars: { low: 3, moderate: 10 },
  },
  coeliac: {
    // Gluten-free products often high in sodium; flag salt more strictly
    salt: { low: 0.2, moderate: 0.8 },
  },
  hypothyroidism: {
    // Monitor iodine/selenium via ingredients; stricter sugar to support metabolism
    sugars: { low: 3, moderate: 10 },
  },
  hashimotos: {
    // Similar to hypothyroidism + gluten awareness (handled via ingredients)
    sugars: { low: 3, moderate: 10 },
  },
  nafld: {
    sugars:      { low: 2,   moderate: 5 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    fat:         { low: 2,   moderate: 10 },
  },
  noGallbladder: {
    // Fat is the biggest driver of post-cholecystectomy discomfort. Tighter
    // than heartDisease because the mechanism is direct digestive failure
    // (bile doesn't release in a bolus), not long-term cardiovascular risk.
    fat:         { low: 1.5, moderate: 8 },
    saturatedFat:{ low: 1,   moderate: 4 },
  },
  pregnancy: {
    // Tighter on added sugars and salt, encourage higher fibre to counter
    // pregnancy-related constipation.
    sugars:      { low: 3,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    salt:        { low: 0.2, moderate: 1.0 },
    fiber:       { low: 4,   moderate: 8, inverted: true },
  },
  // Applied when pregnancy_status = 'breastfeeding'. Reads like pregnancy
  // but slightly more permissive on caffeine-adjacent intake via salt.
  breastfeeding: {
    sugars:      { low: 3,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    salt:        { low: 0.2, moderate: 1.2 },
    fiber:       { low: 4,   moderate: 8, inverted: true },
  },
  preDiabetes: {
    sugars:   { low: 3,   moderate: 8 },
    carbs:    { low: 5,   moderate: 18 },
    netCarbs: { low: 5,   moderate: 18 },
    fiber:    { low: 4,   moderate: 8, inverted: true },
  },
  insulinResistance: {
    sugars:   { low: 2,   moderate: 6 },
    carbs:    { low: 4,   moderate: 16 },
    netCarbs: { low: 4,   moderate: 16 },
    fiber:    { low: 4,   moderate: 8, inverted: true },
  },
  gout: {
    // High purine flagged via ingredients; stricter on sugar/fructose
    sugars: { low: 2, moderate: 5 },
  },
  diverticular: {
    fiber: { low: 5, moderate: 10, inverted: true },
  },
  endometriosis: {
    saturatedFat:{ low: 1.5, moderate: 5 },
    sugars:      { low: 3,   moderate: 10 },
  },
  fibromyalgia: {
    // Anti-inflammatory focus; sugar spikes and processed fats worsen pain and fatigue
    sugars:      { low: 3,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    fiber:       { low: 4,   moderate: 8, inverted: true },
  },
  osteoporosis: {
    // High sodium increases urinary calcium excretion (~40 mg Ca lost per 2,300 mg Na)
    salt: { low: 0.2, moderate: 0.8 },
  },

  // ── Allergies / intolerances ──
  fructose: {
    sugars: { low: 1, moderate: 3 },
  },

  // ── Dietary preferences ──
  lowFiber: {
    // Flip the fibre scale: more fibre = worse rating (not inverted).
    // Default fibre was inverted (higher=better); here we want lower=better.
    // Values per 100g.
    fiber: { low: 1.5, moderate: 3 },
  },
  keto: {
    carbs:    { low: 2,  moderate: 8 },
    netCarbs: { low: 2,  moderate: 8 },
    sugars:   { low: 1,  moderate: 3 },
    fat:      { low: 10, moderate: 25, inverted: true, labels: ['Low', 'Moderate', 'Good'] },
  },
  highProtein: {
    proteins: { low: 10, moderate: 20, inverted: true, labels: ['Low', 'Moderate', 'Good'] },
  },
  weightLoss: {
    energyKcal:  { low: 80,  moderate: 200 },
    sugars:      { low: 3,   moderate: 10 },
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  postBariatric: {
    energyKcal: { low: 60,  moderate: 150 },
    sugars:     { low: 2,   moderate: 5 },
    fat:        { low: 2,   moderate: 8 },
    proteins:   { low: 10,  moderate: 20, inverted: true, labels: ['Low', 'Moderate', 'Good'] },
  },
  fodmap: {
    fiber:  { low: 1.5, moderate: 3, inverted: true },
    sugars: { low: 1,   moderate: 3 },
  },
  mediterraneanDiet: {
    // Reward whole foods; flag excess sat fat, sodium, and low fibre
    saturatedFat:{ low: 1.5, moderate: 5 },
    salt:        { low: 0.2, moderate: 0.8 },
    fiber:       { low: 4,   moderate: 8, inverted: true },
  },
};

// Merge defaults with the strictest (lowest) threshold from all active conditions.
export function buildThresholds(
  conditions: string[],
  allergies: string[],
  preferences: string[],
): Record<NutrientKey, Threshold> {
  const all = [...conditions, ...allergies, ...preferences];
  if (all.length === 0) return DEFAULT_THRESHOLDS;

  const merged = { ...DEFAULT_THRESHOLDS };
  for (const key of Object.keys(merged) as NutrientKey[]) {
    merged[key] = { ...merged[key] };
  }

  for (const tag of all) {
    const overrides = CONDITION_OVERRIDES[tag];
    if (!overrides) continue;
    for (const [nutrient, patch] of Object.entries(overrides) as [NutrientKey, Partial<Threshold>][]) {
      const current = merged[nutrient];
      // Use the strictest (lowest) threshold across all conditions
      if (patch.low != null && patch.low < current.low) current.low = patch.low;
      if (patch.moderate != null && patch.moderate < current.moderate) current.moderate = patch.moderate;
      if (patch.inverted != null) current.inverted = patch.inverted;
      if (patch.labels) current.labels = patch.labels;
    }
  }

  // ── CF override pass ───────────────────────────────────────────────────────
  // CF's nutritional logic is genuinely inverted — high fat is encouraged
  // and salt is actively supplemented. The "strictest wins" merge above
  // would pin CF users to default salt thresholds (0.3 / 1.5) regardless
  // of CF's relaxed values (999 / 999). Run a second pass for fat / salt /
  // saturatedFat that REPLACES the merged value with CF's value when CF
  // is active. Modulator subtype is excluded because modulator users have
  // normalised absorption and shouldn't get the inverted-fat treatment.
  const cfReplaceKey = all.includes('cfCfrd')
    ? 'cfCfrd'
    : all.includes('cfStandard')
      ? 'cfStandard'
      : null;
  if (cfReplaceKey) {
    const cfOverride = CONDITION_OVERRIDES[cfReplaceKey];
    if (cfOverride) {
      for (const nutrient of ['salt', 'fat', 'saturatedFat'] as NutrientKey[]) {
        const cfPatch = cfOverride[nutrient];
        if (cfPatch) {
          merged[nutrient] = { ...merged[nutrient], ...cfPatch };
        }
      }
    }
  }

  return merged;
}

export function getRating(
  key: NutrientKey,
  value: number,
  thresholds: Record<NutrientKey, Threshold>,
): { label: string; color: string } {
  const t = thresholds[key];
  const [lowLabel, modLabel, highLabel] = t.labels ?? ['Low', 'Moderate', 'High'];

  if (t.inverted) {
    if (value >= t.moderate) return { label: highLabel, color: Extra.positiveGreen };
    if (value >= t.low)      return { label: modLabel,  color: Extra.poorOrange };
    return { label: lowLabel, color: Colors.status.negative };
  }

  if (value <= t.low)      return { label: lowLabel,  color: Extra.positiveGreen };
  if (value <= t.moderate)  return { label: modLabel,  color: Extra.poorOrange };
  return { label: highLabel, color: Colors.status.negative };
}

export function fmtVal(raw: string | undefined, unit: string): string {
  if (!raw) return '-';
  const num = parseFloat(raw);
  if (isNaN(num)) return '-';
  if (unit === 'kcal') return `${Math.round(num)}${unit}`;
  if (num < 0.1) return `<0.1${unit}`;
  if (num < 10) return `${num.toFixed(1)}${unit}`;
  return `${Math.round(num)}${unit}`;
}

export function fmtDri(rawStr: string | undefined, key: NutrientKey): string {
  if (!rawStr || !(key in DRI)) return '-';
  const val = parseFloat(rawStr);
  if (isNaN(val)) return '-';
  return `${Math.round((val / DRI[key]) * 100)}%`;
}
