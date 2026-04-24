/**
 * insightEngine — personalised nutrition insight definitions shared
 * across the app.
 *
 * Each insight is a severity computation keyed off a health condition,
 * allergy, or dietary preference. Given a nutrient snapshot and a profile
 * (conditions + allergies + prefs), `getActiveInsights` returns the top-N
 * insights ranked by relevance.
 *
 * Extracted from app/scan-result.tsx so the same engine can drive the
 * recipe detail's per-family-member impact sheet (Figma 4819-24288 etc).
 * Behaviour is unchanged — only the home of the code moved.
 *
 * Adding a new insight:
 *   1. Create 4 illustration SVGs in assets/icons/impact/<key>_<severity>.svg
 *      (severity = low | moderate | high | very_high). Optional PNG
 *      fallbacks for web live in assets/icons/impact/png/.
 *   2. Add an icons object + compute() entry to INSIGHT_DEFS below.
 *   3. Wire condition/preference weights into INSIGHT_WEIGHTS.
 */
import { Image, Platform } from 'react-native';
import { Colors } from '@/constants/theme';

// ── Types ────────────────────────────────────────────────────────────────
export type ImpactKey = 'low' | 'moderate' | 'high' | 'veryHigh';
export type ImpactResult = { label: string; color: string; iconKey: ImpactKey };

export type InsightKey =
  | 'glycemic'
  | 'sodium'
  | 'saturatedFat'
  | 'sugar'
  | 'fiber'
  | 'protein'
  | 'calorie'
  | 'inflammatoryFat'
  | 'digestiveLoad'
  | 'carbLoad'
  | 'additives';

/** Subset of a product's nutrient panel the engine can read. All fields
 * optional so callers only need to populate what they have. Values are
 * strings to accommodate OFF's raw responses — numbers work too. */
export type NutrientData = {
  sugars?: string;
  fiber?: string;
  carbs?: string;
  salt?: string;
  fat?: string;
  saturatedFat?: string;
  proteins?: string;
  energyKcal?: string;
  additiveCount?: number;
  /** Severity-weighted additive data for condition-aware insight */
  additiveHighCount?: number;
  additiveModerateCount?: number;
};

export type InsightDef = {
  key: InsightKey;
  label: string;
  iconWidth: number;
  iconHeight: number;
  /** Any of these tags on the active profile will surface this insight. */
  relevantTo: string[];
  compute: (data: NutrientData) => ImpactResult | null;
  icons: Record<ImpactKey, SvgComponent>;
};

export type SvgComponent = React.FC<{ width?: number; height?: number }>;

// ── Palette used by compute() functions ──────────────────────────────────
const palette = {
  positiveGreen: '#009a1f',
  okYellow: '#F5B811',
  poorOrange: '#ff8736',
  negativeRed: Colors.status.negative,
};

// ── Icon helpers ─────────────────────────────────────────────────────────
// Native uses the SVG component directly; web falls back to a PNG because
// react-native-svg's masks/clipPaths don't render reliably in the browser.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function impactIcon(svgModule: any, pngSource?: any): SvgComponent {
  const Svg = svgModule.default as SvgComponent;
  if (Platform.OS === 'web' && pngSource) {
    const WebImg: SvgComponent = ({ width, height }) => (
      <Image source={pngSource} style={{ width, height }} resizeMode="contain" />
    );
    WebImg.displayName = 'WebImpactIcon';
    return WebImg;
  }
  return Svg;
}

/* eslint-disable @typescript-eslint/no-require-imports */
const GlycemicIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/glycemic_low.svg'),       require('@/assets/icons/impact/png/glycemic_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/glycemic_moderate.svg'),  require('@/assets/icons/impact/png/glycemic_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/glycemic_high.svg'),      require('@/assets/icons/impact/png/glycemic_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/glycemic_very_high.svg'), require('@/assets/icons/impact/png/glycemic_very_high.png')),
};
const CalorieIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/calories_low.svg'),       require('@/assets/icons/impact/png/calories_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/calories_moderate.svg'),  require('@/assets/icons/impact/png/calories_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/calories_high.svg'),      require('@/assets/icons/impact/png/calories_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/calories_very_high.svg'), require('@/assets/icons/impact/png/calories_very_high.png')),
};
const AdditiveIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/additives_low.svg'),       require('@/assets/icons/impact/png/additives_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/additives_moderate.svg'),  require('@/assets/icons/impact/png/additives_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/additives_high.svg'),      require('@/assets/icons/impact/png/additives_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/additives_very_high.svg'), require('@/assets/icons/impact/png/additives_very_high.png')),
};
const DigestiveLoadIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/digestion_low.svg'),       require('@/assets/icons/impact/png/digestion_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/digestion_moderate.svg'),  require('@/assets/icons/impact/png/digestion_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/digestion_high.svg'),      require('@/assets/icons/impact/png/digestion_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/digestion_very_high.svg'), require('@/assets/icons/impact/png/digestion_very_high.png')),
};
const CarbLoadIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/carbs_low.svg'),       require('@/assets/icons/impact/png/carbs_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/carbs_moderate.svg'),  require('@/assets/icons/impact/png/carbs_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/carbs_high.svg'),      require('@/assets/icons/impact/png/carbs_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/carbs_very_high.svg'), require('@/assets/icons/impact/png/carbs_very_high.png')),
};
const SodiumIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/sodium_low.svg'),       require('@/assets/icons/impact/png/sodium_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/sodium_moderate.svg'),  require('@/assets/icons/impact/png/sodium_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/sodium_high.svg'),      require('@/assets/icons/impact/png/sodium_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/sodium_very_high.svg'), require('@/assets/icons/impact/png/sodium_very_high.png')),
};
const SugarIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/sugar_low.svg'),       require('@/assets/icons/impact/png/sugar_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/sugar_moderate.svg'),  require('@/assets/icons/impact/png/sugar_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/sugar_high.svg'),      require('@/assets/icons/impact/png/sugar_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/sugar_very_high.svg'), require('@/assets/icons/impact/png/sugar_very_high.png')),
};
const FibreIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/fibre_low.svg'),       require('@/assets/icons/impact/png/fibre_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/fibre_moderate.svg'),  require('@/assets/icons/impact/png/fibre_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/fibre_high.svg'),      require('@/assets/icons/impact/png/fibre_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/fibre_very_high.svg'), require('@/assets/icons/impact/png/fibre_very_high.png')),
};
const ProteinIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/protein_low.svg'),       require('@/assets/icons/impact/png/protein_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/protein_moderate.svg'),  require('@/assets/icons/impact/png/protein_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/protein_high.svg'),      require('@/assets/icons/impact/png/protein_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/protein_very_high.svg'), require('@/assets/icons/impact/png/protein_very_high.png')),
};
const SaturatedFatIcons: Record<ImpactKey, SvgComponent> = {
  low:      impactIcon(require('@/assets/icons/impact/saturated_fat_low.svg'),       require('@/assets/icons/impact/png/saturated_fat_low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/saturated_fat_moderate.svg'),  require('@/assets/icons/impact/png/saturated_fat_moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/saturated_fat_high.svg'),      require('@/assets/icons/impact/png/saturated_fat_high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/saturated_fat_very_high.svg'), require('@/assets/icons/impact/png/saturated_fat_very_high.png')),
};
/* eslint-enable @typescript-eslint/no-require-imports */

// ── Insight definitions ──────────────────────────────────────────────────
export const INSIGHT_DEFS: InsightDef[] = [
  {
    key: 'glycemic',
    label: 'Glycemic impact',
    iconWidth: 31,
    iconHeight: 44,
    relevantTo: ['diabetes', 'preDiabetes', 'insulinResistance', 'pcos', 'keto', 'weightLoss'],
    compute: (d) => {
      const sugars = d.sugars ? parseFloat(d.sugars) : NaN;
      if (isNaN(sugars)) return null;
      const fiber = d.fiber ? Math.max(0, parseFloat(d.fiber)) : 0;
      const carbs = d.carbs ? Math.max(0, parseFloat(d.carbs)) : sugars;
      const netCarbs = Math.max(0, carbs - fiber);
      const score = (sugars * 2 + netCarbs) / (fiber + 1);
      if (score > 30) return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (score > 15) return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (score > 5)  return { label: 'Moderate',  color: palette.okYellow,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: GlycemicIcons,
  },
  {
    key: 'sodium',
    label: 'Sodium',
    iconWidth: 28,
    iconHeight: 44,
    relevantTo: ['hypertension', 'heartDisease', 'lupus', 'ckd', 'coeliac'],
    compute: (d) => {
      const salt = d.salt ? parseFloat(d.salt) : NaN;
      if (isNaN(salt)) return null;
      if (salt > 3)   return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (salt > 1.5) return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (salt > 0.3) return { label: 'Moderate',  color: palette.okYellow,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: SodiumIcons,
  },
  {
    key: 'sugar',
    label: 'Sugar',
    iconWidth: 48,
    iconHeight: 48,
    relevantTo: ['diabetes', 'preDiabetes', 'insulinResistance', 'pcos', 'nafld', 'weightLoss', 'keto', 'childFriendly'],
    compute: (d) => {
      const sugars = d.sugars ? parseFloat(d.sugars) : NaN;
      if (isNaN(sugars)) return null;
      if (sugars > 22.5) return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (sugars > 12.5) return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (sugars > 5)    return { label: 'Moderate',  color: palette.okYellow,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: SugarIcons,
  },
  {
    key: 'saturatedFat',
    label: 'Saturated fat',
    iconWidth: 32,
    iconHeight: 44,
    relevantTo: ['heartDisease', 'highCholesterol', 'hypertension', 'nafld', 'weightLoss'],
    compute: (d) => {
      const satFat = d.saturatedFat ? parseFloat(d.saturatedFat) : NaN;
      if (isNaN(satFat)) return null;
      if (satFat > 5)   return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (satFat > 3)   return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (satFat > 1.5) return { label: 'Moderate',  color: palette.poorOrange,  iconKey: 'moderate' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: SaturatedFatIcons,
  },
  {
    key: 'fiber',
    label: 'Fibre',
    iconWidth: 32,
    iconHeight: 44,
    relevantTo: ['ibs', 'crohns', 'uc', 'diverticular', 'coeliac', 'leakyGut', 'diabetes', 'weightLoss'],
    compute: (d) => {
      const fiber = d.fiber ? parseFloat(d.fiber) : NaN;
      if (isNaN(fiber)) return null;
      // Inverted scale — more fibre is better.
      if (fiber >= 6) return { label: 'Very High', color: palette.positiveGreen, iconKey: 'veryHigh' };
      if (fiber >= 3) return { label: 'High',      color: palette.positiveGreen, iconKey: 'high' };
      if (fiber >= 1) return { label: 'Moderate',  color: palette.poorOrange,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.negativeRed, iconKey: 'low' };
    },
    icons: FibreIcons,
  },
  {
    key: 'protein',
    label: 'Protein',
    iconWidth: 32,
    iconHeight: 44,
    relevantTo: ['highProtein', 'weightLoss', 'postBariatric', 'diabetes', 'keto'],
    compute: (d) => {
      const proteins = d.proteins ? parseFloat(d.proteins) : NaN;
      if (isNaN(proteins)) return null;
      // Inverted scale — more protein is better.
      if (proteins >= 20) return { label: 'Very High', color: palette.positiveGreen, iconKey: 'veryHigh' };
      if (proteins >= 10) return { label: 'High',      color: palette.positiveGreen, iconKey: 'high' };
      if (proteins >= 5)  return { label: 'Moderate',  color: palette.poorOrange,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.negativeRed, iconKey: 'low' };
    },
    icons: ProteinIcons,
  },
  {
    key: 'calorie',
    label: 'Calorie density',
    iconWidth: 32,
    iconHeight: 44,
    relevantTo: ['weightLoss', 'postBariatric', 'nafld'],
    compute: (d) => {
      const kcal = d.energyKcal ? parseFloat(d.energyKcal) : NaN;
      if (isNaN(kcal)) return null;
      if (kcal > 400) return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (kcal > 250) return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (kcal > 100) return { label: 'Moderate',  color: palette.okYellow,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: CalorieIcons,
  },
  {
    key: 'digestiveLoad',
    label: 'Digestive load',
    iconWidth: 50,
    iconHeight: 44,
    relevantTo: ['gerd', 'ibs', 'crohns', 'uc', 'leakyGut', 'diverticular', 'coeliac', 'sibo'],
    compute: (d) => {
      const fat = d.fat ? parseFloat(d.fat) : NaN;
      const fiber = d.fiber ? parseFloat(d.fiber) : 0;
      if (isNaN(fat)) return null;
      const score = fat + fiber;
      if (score > 15) return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (score > 8)  return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (score > 4)  return { label: 'Moderate',  color: palette.okYellow,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: DigestiveLoadIcons,
  },
  {
    key: 'carbLoad',
    label: 'Carb load',
    iconWidth: 43,
    iconHeight: 44,
    relevantTo: ['keto', 'diabetes', 'preDiabetes', 'insulinResistance'],
    compute: (d) => {
      const carbs = d.carbs ? parseFloat(d.carbs) : NaN;
      if (isNaN(carbs)) return null;
      if (carbs > 30) return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (carbs > 15) return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (carbs > 5)  return { label: 'Moderate',  color: palette.okYellow,    iconKey: 'moderate' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: CarbLoadIcons,
  },
  {
    key: 'additives',
    label: 'Additives',
    iconWidth: 33,
    iconHeight: 44,
    relevantTo: ['childFriendly', 'adhd', 'autism', 'eczema', 'ibs', 'migraine', 'cleanEating'],
    compute: (d) => {
      const count = d.additiveCount ?? -1;
      if (count < 0) return null;
      const high = d.additiveHighCount ?? 0;
      const moderate = d.additiveModerateCount ?? 0;
      // Severity-aware: high-severity additives (Southampton Six etc.) dominate the rating.
      if (high >= 2) return { label: 'Very High', color: palette.negativeRed, iconKey: 'veryHigh' };
      if (high >= 1) return { label: 'High',      color: palette.poorOrange,  iconKey: 'high' };
      if (moderate >= 2) return { label: 'High',     color: palette.poorOrange, iconKey: 'high' };
      if (moderate >= 1) return { label: 'Moderate', color: palette.okYellow,   iconKey: 'moderate' };
      if (count >= 5)    return { label: 'Moderate', color: palette.okYellow,   iconKey: 'moderate' };
      if (count >= 1)    return { label: 'Low',      color: palette.positiveGreen, iconKey: 'low' };
      return { label: 'Low', color: palette.positiveGreen, iconKey: 'low' };
    },
    icons: AdditiveIcons,
  },
];

export const MAX_INSIGHTS = 3;

// Relevance weights — higher = more likely to surface. Missing entries default to 1.
export const INSIGHT_WEIGHTS: Record<string, Partial<Record<InsightKey, number>>> = {
  diabetes:          { glycemic: 10, sugar: 9, carbLoad: 8, calorie: 3 },
  weightLoss:        { calorie: 10, saturatedFat: 9, sugar: 7, protein: 6 },
  postBariatric:     { calorie: 10, protein: 9, sugar: 7 },
  heartDisease:      { saturatedFat: 10, sodium: 9, calorie: 5 },
  highCholesterol:   { saturatedFat: 10, inflammatoryFat: 7 },
  hypertension:      { sodium: 10 },
  ckd:               { sodium: 10, protein: 8, saturatedFat: 5 },
  pcos:              { sugar: 10, glycemic: 9, carbLoad: 7 },
  keto:              { carbLoad: 10, glycemic: 8, sugar: 7 },
  ibs:               { digestiveLoad: 10, fiber: 9, additives: 7 },
  crohns:            { digestiveLoad: 10, fiber: 9 },
  uc:                { digestiveLoad: 10, fiber: 9 },
  sibo:              { fiber: 10, sugar: 8 },
  leakyGut:          { digestiveLoad: 10, fiber: 8, sugar: 6 },
  gerd:              { digestiveLoad: 10, saturatedFat: 7 },
  fodmap:            { fiber: 10, sugar: 8 },
  ra:                { inflammatoryFat: 10, sugar: 6 },
  ms:                { inflammatoryFat: 10 },
  lupus:             { inflammatoryFat: 10, sodium: 8 },
  eczema:            { inflammatoryFat: 10, sugar: 7, additives: 8 },
  adhd:              { additives: 10, sugar: 8 },
  autism:            { additives: 10, sugar: 8 },
  migraine:          { additives: 10, sodium: 8, sugar: 5 },
  me:                { sugar: 10 },
  childFriendly:     { additives: 10, sugar: 7 },
  cleanEating:       { additives: 10, sugar: 6 },
  highProtein:       { protein: 10, calorie: 6 },
  preDiabetes:       { glycemic: 10, sugar: 9, carbLoad: 8 },
  insulinResistance: { glycemic: 10, sugar: 9, carbLoad: 8 },
  nafld:             { saturatedFat: 10, sugar: 9, calorie: 8 },
  coeliac:           { sodium: 9, digestiveLoad: 8, additives: 6 },
  diverticular:      { digestiveLoad: 10, fiber: 9 },
  endometriosis:     { inflammatoryFat: 10, sugar: 8, saturatedFat: 7 },
  gout:              { sugar: 10, inflammatoryFat: 8 },
  hypothyroidism:    { sugar: 8 },
  hashimotos:        { sugar: 8 },
  fructose:          { sugar: 10 },
};

/**
 * Returns the top-N insights ranked by relevance to the active profile's
 * focus. "Relevance" = max INSIGHT_WEIGHTS hit across the profile's tags.
 * Insights with no compute result (missing nutrient data) are dropped.
 *
 * @param maxResults overrides MAX_INSIGHTS (optional). Pass Infinity to
 *        return every matching insight, useful for long-form breakdowns.
 */
export function getActiveInsights(
  conditions: string[],
  allergies: string[],
  preferences: string[],
  nutrientData: NutrientData,
  defs: InsightDef[] = INSIGHT_DEFS,
  maxResults: number = MAX_INSIGHTS,
): { def: InsightDef; result: ImpactResult }[] {
  const tags = [...conditions, ...allergies, ...preferences];
  const tagSet = new Set(tags);
  const results: { def: InsightDef; result: ImpactResult; weight: number }[] = [];

  for (const def of defs) {
    if (!def.relevantTo.some((t) => tagSet.has(t))) continue;
    const result = def.compute(nutrientData);
    if (!result) continue;

    let maxWeight = 1;
    for (const tag of tags) {
      const w = INSIGHT_WEIGHTS[tag]?.[def.key];
      if (w != null && w > maxWeight) maxWeight = w;
    }
    results.push({ def, result, weight: maxWeight });
  }

  results.sort((a, b) => b.weight - a.weight);
  return results.slice(0, maxResults);
}

/**
 * Roll a set of insight results up into a single headline verdict for a
 * member/recipe pairing. Matches the Figma impact-sheet header chip:
 *   - any 'Very High' or 'High' (non-inverted scale) → Warning
 *   - any 'Moderate' → Ok
 *   - otherwise → Good
 */
export function summariseVerdict(
  insights: { def: InsightDef; result: ImpactResult }[],
): { label: 'Good' | 'Ok' | 'Warning'; color: string } {
  let worst: 'good' | 'ok' | 'warning' = 'good';
  for (const { result } of insights) {
    if (result.label === 'Very High' || result.label === 'High') {
      // Inverted scales (fibre, protein) mark High as green — good news.
      if (result.color === palette.positiveGreen) continue;
      worst = 'warning';
      break;
    }
    if (result.label === 'Moderate') {
      if (worst === 'good') worst = 'ok';
    }
  }
  if (worst === 'warning') return { label: 'Warning', color: palette.negativeRed };
  if (worst === 'ok')      return { label: 'Ok',      color: palette.poorOrange };
  return { label: 'Good', color: palette.positiveGreen };
}
