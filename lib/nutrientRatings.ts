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
  salt: 'Salt',
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
// Keys must match the health_conditions / allergies / dietary_preferences strings stored in profiles.
export const CONDITION_OVERRIDES: Record<string, Partial<Record<NutrientKey, Partial<Threshold>>>> = {
  // ── Health conditions ──
  'Chronic Kidney Disease': {
    salt:         { low: 0.1, moderate: 0.3 },
    proteins:     { low: 3,   moderate: 8 },
    saturatedFat: { low: 1,   moderate: 3 },
    sugars:       { low: 2,   moderate: 5 },
  },
  'Diabetes': {
    sugars:    { low: 2,   moderate: 5 },
    carbs:     { low: 3,   moderate: 15 },
    netCarbs:  { low: 3,   moderate: 15 },
    fiber:     { low: 5,   moderate: 10, inverted: true },
  },
  'Heart Disease': {
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    salt:        { low: 0.2, moderate: 0.8 },
    fiber:       { low: 5,   moderate: 10, inverted: true },
  },
  'High Cholesterol': {
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    fiber:       { low: 5,   moderate: 10, inverted: true },
  },
  'Hypertension': {
    salt: { low: 0.1, moderate: 0.6 },
  },
  'IBS': {
    fiber: { low: 1.5, moderate: 3, inverted: true },
  },
  "Chron's Disease": {
    fiber: { low: 1.5, moderate: 3, inverted: true },
    fat:   { low: 2,   moderate: 10 },
  },
  'Ulcerative Colitis': {
    fiber: { low: 1.5, moderate: 3, inverted: true },
    fat:   { low: 2,   moderate: 10 },
  },
  'SIBO': {
    fiber:  { low: 1.5, moderate: 3, inverted: true },
    sugars: { low: 2,   moderate: 5 },
  },
  'Leaky Gut Syndrome': {
    sugars: { low: 2,  moderate: 8 },
    fiber:  { low: 2,  moderate: 5, inverted: true },
  },
  'GERD / Acid Reflux': {
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  'Metabolic Syndrome': {
    sugars:   { low: 2,   moderate: 5 },
    carbs:    { low: 3,   moderate: 15 },
    netCarbs: { low: 3,   moderate: 15 },
    fat:      { low: 2,   moderate: 10 },
    salt:     { low: 0.1, moderate: 0.6 },
  },
  'PCOS': {
    sugars:   { low: 2,   moderate: 5 },
    carbs:    { low: 3,   moderate: 15 },
    netCarbs: { low: 3,   moderate: 15 },
  },
  'Eczema / Psoriasis': {
    sugars: { low: 3, moderate: 10 },
  },
  'Migraine / Chronic Headaches': {
    sugars: { low: 3, moderate: 10 },
    salt:   { low: 0.2, moderate: 0.8 },
  },
  'Lupus': {
    salt:        { low: 0.2, moderate: 0.8 },
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  'Rheumatoid Arthritis': {
    saturatedFat:{ low: 1.5, moderate: 5 },
    sugars:      { low: 3,   moderate: 10 },
  },
  'Multiple Sclerosis': {
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  'ME / Chronic Fatigue': {
    sugars: { low: 3, moderate: 10 },
  },
  'ADHD': {
    sugars: { low: 3, moderate: 10 },
  },
  'Autism': {
    sugars: { low: 3, moderate: 10 },
  },
  'Coeliac Disease': {
    // Gluten-free products often high in sodium; flag salt more strictly
    salt: { low: 0.2, moderate: 0.8 },
  },
  'Hypothyroidism': {
    // Monitor iodine/selenium via ingredients; stricter sugar to support metabolism
    sugars: { low: 3, moderate: 10 },
  },
  "Hashimoto's Thyroiditis": {
    // Similar to hypothyroidism + gluten awareness (handled via ingredients)
    sugars: { low: 3, moderate: 10 },
  },
  'NAFLD': {
    sugars:      { low: 2,   moderate: 5 },
    saturatedFat:{ low: 1.5, moderate: 5 },
    fat:         { low: 2,   moderate: 10 },
  },
  'Pre-diabetes': {
    sugars:   { low: 3,   moderate: 8 },
    carbs:    { low: 5,   moderate: 18 },
    netCarbs: { low: 5,   moderate: 18 },
    fiber:    { low: 4,   moderate: 8, inverted: true },
  },
  'Insulin Resistance': {
    sugars:   { low: 2,   moderate: 6 },
    carbs:    { low: 4,   moderate: 16 },
    netCarbs: { low: 4,   moderate: 16 },
    fiber:    { low: 4,   moderate: 8, inverted: true },
  },
  'Gout': {
    // High purine flagged via ingredients; stricter on sugar/fructose
    sugars: { low: 2, moderate: 5 },
  },
  'Diverticular Disease': {
    // Positive fibre emphasis
    fiber: { low: 5, moderate: 10, inverted: true },
  },
  'Endometriosis': {
    // Inflammation focus: stricter sat fat and sugar
    saturatedFat:{ low: 1.5, moderate: 5 },
    sugars:      { low: 3,   moderate: 10 },
  },

  // ── Allergies / intolerances ──
  'Fructose Intolerance': {
    sugars: { low: 1, moderate: 3 },
  },

  // ── Dietary preferences (keyed by DIETARY_LABELS display string) ──
  'Diabetic': {
    sugars:    { low: 2,   moderate: 5 },
    carbs:     { low: 3,   moderate: 15 },
    netCarbs:  { low: 3,   moderate: 15 },
    fiber:     { low: 5,   moderate: 10, inverted: true },
  },
  'Keto': {
    carbs:    { low: 2,  moderate: 8 },
    netCarbs: { low: 2,  moderate: 8 },
    sugars:   { low: 1,  moderate: 3 },
    fat:      { low: 10, moderate: 25, inverted: true, labels: ['Low', 'Moderate', 'Good'] },
  },
  'High-Protein / Fitness': {
    proteins: { low: 10, moderate: 20, inverted: true, labels: ['Low', 'Moderate', 'Good'] },
  },
  'Weight Loss': {
    energyKcal:  { low: 80,  moderate: 200 },
    sugars:      { low: 3,   moderate: 10 },
    fat:         { low: 2,   moderate: 10 },
    saturatedFat:{ low: 1.5, moderate: 5 },
  },
  'Post-Bariatric Surgery': {
    energyKcal: { low: 60,  moderate: 150 },
    sugars:     { low: 2,   moderate: 5 },
    fat:        { low: 2,   moderate: 8 },
    proteins:   { low: 10,  moderate: 20, inverted: true, labels: ['Low', 'Moderate', 'Good'] },
  },
  'FODMAP Diet': {
    fiber:  { low: 1.5, moderate: 3, inverted: true },
    sugars: { low: 1,   moderate: 3 },
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
