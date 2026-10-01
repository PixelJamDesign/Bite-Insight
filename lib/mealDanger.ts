/**
 * mealDanger — how risky a planned meal is for the signed-in user, and
 * which numbers they care about on its card.
 *
 * Danger is the average of the same personalised insights the scan result
 * shows ("Important for you"), run against the whole meal:
 *
 *   1. Every product in the meal (recipe ingredients included) is weighed
 *      in grams, and the meal's per-100g nutrients are the gram-weighted
 *      blend of their per-100g panels.
 *   2. Each insight relevant to the user's conditions, allergies and
 *      preferences scores that blend: green 0, yellow 1, orange 2, red 3.
 *      Inverted insights (fibre, protein) score by colour too, so plenty
 *      of protein counts as good.
 *   3. The scores are averaged, weighted by how much each insight matters
 *      to the user (INSIGHT_WEIGHTS), and the average picks the state.
 *
 * Density alone misses big portions (a sandwich is only moderately carby
 * per 100g, but 44 g of carbs in one meal is a lot on keto), so the meal's
 * actual totals are also checked against per-meal limits for the user's
 * profile (PORTION_LIMITS). The card takes the worse of the two.
 *
 * An allergy hit is always Avoid, and a dietary or condition conflict is
 * at least Caution, whatever the average says.
 *
 * This is the user's view only — family members don't change the colour.
 */
import { INSIGHT_DEFS, INSIGHT_WEIGHTS, getActiveInsights, type InsightKey, type NutrientData } from './insightEngine';
import { computeHouseholdImpact } from './householdImpact';
import { quantityToGrams } from './recipes';
import type { Meal, MealNutrition, NutrientRowKey, RecipeIngredient, UserProfile } from './types';

export type MealDangerLevel = 'planned' | 'caution' | 'avoid';

export interface MealImpact {
  level: MealDangerLevel;
  /** Short reason for the card, e.g. "Contains peanuts". Only set for
   *  allergy hits — the colour carries the rest. */
  reason: string | null;
  /** Why the meal is amber or red, as a sentence for the meal view's
   *  alert, e.g. "It's high in carbs and likely to spike blood sugar." */
  explanation: string | null;
}

/** How each insight reads when it's what makes a meal amber or red.
 *  Fibre and protein are inverted — a poor score means too little. */
const INSIGHT_PHRASE: Partial<Record<InsightKey, string>> = {
  glycemic: 'likely to spike blood sugar',
  sodium: 'high in salt',
  sugar: 'high in sugar',
  saturatedFat: 'high in saturated fat',
  fiber: 'low in fibre',
  protein: 'low in protein',
  calorie: 'high in calories',
  digestiveLoad: 'heavy to digest',
  carbLoad: 'high in carbs',
  additives: 'heavy on additives',
};
// ── Per-meal limits ──────────────────────────────────────────────────────────
//
// What one meal can carry before it's a poor fit, by profile tag. Values are
// the meal's totals; over `caution` makes the card amber, over `avoid` red.
// Keto follows the usual 20–50 g/day net-carb budget; the diabetes family
// the common 45–60 g carbs per meal guidance. Tune here.

type PortionNutrient = 'netCarbs' | 'carbs' | 'sugars' | 'kcal' | 'salt' | 'satFat';

interface PortionLimit {
  nutrient: PortionNutrient;
  caution: number;
  avoid: number;
}

const PORTION_LIMITS: Record<string, PortionLimit[]> = {
  keto: [{ nutrient: 'netCarbs', caution: 10, avoid: 20 }],
  diabetes: [
    { nutrient: 'carbs', caution: 45, avoid: 60 },
    { nutrient: 'sugars', caution: 15, avoid: 25 },
  ],
  preDiabetes: [
    { nutrient: 'carbs', caution: 45, avoid: 60 },
    { nutrient: 'sugars', caution: 15, avoid: 25 },
  ],
  insulinResistance: [
    { nutrient: 'carbs', caution: 45, avoid: 60 },
    { nutrient: 'sugars', caution: 15, avoid: 25 },
  ],
  pcos: [
    { nutrient: 'carbs', caution: 45, avoid: 60 },
    { nutrient: 'sugars', caution: 15, avoid: 25 },
  ],
  weightLoss: [{ nutrient: 'kcal', caution: 700, avoid: 900 }],
  hypertension: [{ nutrient: 'salt', caution: 1.5, avoid: 2.5 }],
  heartDisease: [
    { nutrient: 'salt', caution: 1.5, avoid: 2.5 },
    { nutrient: 'satFat', caution: 6, avoid: 10 },
  ],
  ckd: [{ nutrient: 'salt', caution: 1.5, avoid: 2.5 }],
  highCholesterol: [{ nutrient: 'satFat', caution: 6, avoid: 10 }],
  nafld: [{ nutrient: 'satFat', caution: 6, avoid: 10 }],
};

/** How each tag reads at the end of the sentence. */
const TAG_PHRASE: Record<string, string> = {
  keto: 'for keto',
  diabetes: 'with diabetes',
  preDiabetes: 'with prediabetes',
  insulinResistance: 'with insulin resistance',
  pcos: 'with PCOS',
  weightLoss: 'for weight loss',
  hypertension: 'with high blood pressure',
  heartDisease: 'with heart disease',
  ckd: 'with kidney disease',
  highCholesterol: 'with high cholesterol',
  nafld: 'with fatty liver',
};

const NUTRIENT_NAME: Record<PortionNutrient, string> = {
  netCarbs: 'net carbs',
  carbs: 'carbs',
  sugars: 'sugar',
  kcal: 'calories',
  salt: 'salt',
  satFat: 'saturated fat',
};

function mealTotals(meal: Meal): Partial<Record<PortionNutrient, number>> {
  const sum = (key: keyof MealNutrition) => {
    let total = 0;
    let any = false;
    for (const item of meal.items) {
      const v = item.nutrition?.[key];
      if (v == null) continue;
      total += Number(v);
      any = true;
    }
    return any ? total : undefined;
  };
  const carbs = sum('carbs_g');
  const fiber = sum('fiber_g') ?? 0;
  return {
    carbs,
    netCarbs: carbs == null ? undefined : Math.max(0, carbs - fiber),
    sugars: sum('sugars_g'),
    kcal: sum('kcal'),
    salt: sum('salt_g'),
    satFat: sum('sat_fat_g'),
  };
}

function formatAmount(n: PortionNutrient, v: number): string {
  if (n === 'kcal') return `${Math.round(v)} kcal`;
  const g = v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${g} g of ${NUTRIENT_NAME[n]}`;
}

/** The meal's totals against the user's per-meal limits: the worst level
 *  reached, and a sentence for each limit crossed (worst first). */
function checkPortions(meal: Meal, tags: string[]): { level: MealDangerLevel; sentences: string[] } {
  const totals = mealTotals(meal);
  const hits: { severity: number; over: number; sentence: string }[] = [];
  const seen = new Set<PortionNutrient>();
  // Strictest limit per nutrient wins when tags overlap.
  const limits = tags
    .flatMap((tag) => (PORTION_LIMITS[tag] ?? []).map((l) => ({ ...l, tag })))
    .sort((a, b) => a.caution - b.caution);
  for (const l of limits) {
    if (seen.has(l.nutrient)) continue;
    const v = totals[l.nutrient];
    if (v == null) continue;
    seen.add(l.nutrient);
    const severity = v > l.avoid ? 2 : v > l.caution ? 1 : 0;
    if (severity === 0) continue;
    hits.push({
      severity,
      over: v / l.caution,
      sentence: `${formatAmount(l.nutrient, v)} in one meal is a lot ${TAG_PHRASE[l.tag] ?? ''}`.trim() + '.',
    });
  }
  hits.sort((a, b) => b.severity - a.severity || b.over - a.over);
  const worst = hits[0]?.severity ?? 0;
  return {
    level: worst === 2 ? 'avoid' : worst === 1 ? 'caution' : 'planned',
    sentences: hits.map((h) => h.sentence.charAt(0).toUpperCase() + h.sentence.slice(1)),
  };
}

const LEVEL_RANK: Record<MealDangerLevel, number> = { planned: 0, caution: 1, avoid: 2 };

/** At most this many reasons go in the sentence. */
const MAX_REASONS = 2;

function joinReasons(parts: string[]): string {
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** Weighted average at or above these marks moves the card up a state. */
const CAUTION_FROM = 1.25;
const AVOID_FROM = 2;

/** Insight colours (insightEngine palette) → danger points. */
const DANGER_POINTS: Record<string, number> = {
  '#009a1f': 0, // green
  '#f5b811': 1, // yellow
  '#ff8736': 2, // orange
  '#ff3f42': 3, // red (Colors.status.negative)
};

// ── Meal → per-100g blend ────────────────────────────────────────────────────

type Per100 = RecipeIngredient['product_snapshot']['nutrition_per_100g'];

interface Portion {
  grams: number;
  per100: Per100;
}

/** Every product in the meal with the grams of it actually eaten. Recipe
 *  ingredients are scaled to the servings planned. */
export function mealPortions(
  meal: Meal,
  recipeIngredients: Record<string, RecipeIngredient[]>,
  recipeServings: Record<string, number>,
): Portion[] {
  const out: Portion[] = [];
  for (const item of meal.items) {
    if (item.kind === 'recipe' && item.recipe_id) {
      const share = Number(item.servings || 1) / (recipeServings[item.recipe_id] || 1);
      for (const ing of recipeIngredients[item.recipe_id] ?? []) {
        out.push({
          grams: quantityToGrams(Number(ing.quantity_value), ing.quantity_unit) * share,
          per100: ing.product_snapshot?.nutrition_per_100g ?? {},
        });
      }
    } else if (item.product_snapshot) {
      out.push({
        grams: quantityToGrams(Number(item.quantity_value ?? 100), item.quantity_unit ?? 'g'),
        per100: item.product_snapshot.nutrition_per_100g ?? {},
      });
    }
  }
  return out.filter((p) => p.grams > 0);
}

/** Gram-weighted per-100g blend, in the engine's NutrientData shape. A
 *  nutrient is only blended over the products that list it. */
export function blendPer100g(portions: Portion[]): NutrientData {
  const blend = (key: keyof Per100): string | undefined => {
    let grams = 0;
    let total = 0;
    for (const p of portions) {
      const v = p.per100[key];
      if (v == null || isNaN(Number(v))) continue;
      grams += p.grams;
      total += p.grams * Number(v);
    }
    return grams > 0 ? String(total / grams) : undefined;
  };
  return {
    energyKcal: blend('energy_kcal'),
    fat: blend('fat_g'),
    saturatedFat: blend('saturated_fat_g'),
    carbs: blend('carbs_g'),
    sugars: blend('sugars_g'),
    fiber: blend('fiber_g'),
    proteins: blend('protein_g'),
    salt: blend('salt_g'),
  };
}

// ── Scoring ──────────────────────────────────────────────────────────────────

function profileTags(profile: UserProfile) {
  return {
    conditions: profile.health_conditions ?? [],
    allergies: profile.allergies ?? [],
    preferences: (profile.dietary_preferences ?? []) as string[],
  };
}

/** The meal's danger for this user, or null when it's fine (or there's
 *  nothing to go on). */
export function scoreMeal(
  meal: Meal,
  profile: UserProfile,
  recipeIngredients: Record<string, RecipeIngredient[]>,
  recipeServings: Record<string, number>,
): MealImpact | null {
  const { conditions, allergies, preferences } = profileTags(profile);
  const tags = [...conditions, ...allergies, ...preferences];

  // Allergy, dietary and condition keyword checks — the user only.
  const ingredients = mealIngredientRows(meal, recipeIngredients);
  const self = ingredients.length > 0 ? computeHouseholdImpact(ingredients, profile, [])[0] : null;
  if (self?.status === 'avoid') {
    const allergyReason = self.reasons.find((r) => r.startsWith('Contains')) ?? null;
    const reason = allergyReason ? humanise(allergyReason) : null;
    return {
      level: 'avoid',
      reason,
      explanation: reason
        ? `${reason}, which is on your allergy list.`
        : 'It contains something on your allergy list.',
    };
  }

  // Insight average.
  let level: MealDangerLevel = 'planned';
  const offenders: { key: InsightKey; score: number }[] = [];
  const portions = mealPortions(meal, recipeIngredients, recipeServings);
  if (portions.length > 0 && tags.length > 0) {
    const insights = getActiveInsights(conditions, allergies, preferences, blendPer100g(portions), INSIGHT_DEFS, Infinity);
    let weighted = 0;
    let weights = 0;
    for (const { def, result } of insights) {
      const points = DANGER_POINTS[result.color.toLowerCase()];
      if (points == null) continue;
      const w = tagWeight(tags, def.key);
      weighted += points * w;
      weights += w;
      // Orange and red results are what pull the meal down.
      if (points >= 2) offenders.push({ key: def.key, score: points * w });
    }
    if (weights > 0) {
      const avg = weighted / weights;
      level = avg >= AVOID_FROM ? 'avoid' : avg >= CAUTION_FROM ? 'caution' : 'planned';
    }
  }

  // Per-meal limits — the worse of the two wins.
  const portionCheck = checkPortions(meal, tags);
  if (LEVEL_RANK[portionCheck.level] > LEVEL_RANK[level]) level = portionCheck.level;

  if (self?.status === 'caution' && level === 'planned') level = 'caution';
  if (level === 'planned') return null;

  // A crossed per-meal limit is the clearest reason, so it leads.
  if (portionCheck.sentences.length > 0) {
    const clashes = (self?.reasons ?? []).map((r) => `${humanise(r)}.`);
    return {
      level,
      reason: null,
      explanation: [...portionCheck.sentences.slice(0, MAX_REASONS), ...clashes].join(' '),
    };
  }

  // Otherwise the worst one or two insights, then any diet or condition clash.
  const phrases = offenders
    .sort((a, b) => b.score - a.score)
    .map((o) => INSIGHT_PHRASE[o.key])
    .filter((p): p is string => Boolean(p))
    .slice(0, MAX_REASONS);
  const clashes = (self?.reasons ?? []).map((r) => `${humanise(r)}.`);
  const sentences = [phrases.length ? `It's ${joinReasons(phrases)}.` : null, ...clashes].filter(Boolean);
  return { level, reason: null, explanation: sentences.length ? sentences.join(' ') : null };
}

function tagWeight(tags: string[], key: InsightKey): number {
  let w = 1;
  for (const tag of tags) {
    const v = INSIGHT_WEIGHTS[tag]?.[key];
    if (v != null && v > w) w = v;
  }
  return w;
}

/** The meal as one ingredient list, for the allergy/keyword checks. */
export function mealIngredientRows(
  meal: Meal,
  recipeIngredients: Record<string, RecipeIngredient[]>,
): RecipeIngredient[] {
  const rows: RecipeIngredient[] = [];
  for (const item of meal.items) {
    if (item.kind === 'recipe' && item.recipe_id) {
      rows.push(...(recipeIngredients[item.recipe_id] ?? []));
    } else if (item.product_snapshot) {
      rows.push({
        id: item.id,
        recipe_id: '',
        position: 0,
        barcode: item.barcode,
        scan_id: item.scan_id,
        quantity_value: Number(item.quantity_value ?? 100),
        quantity_unit: item.quantity_unit ?? 'g',
        quantity_display: null,
        product_snapshot: item.product_snapshot,
        created_at: item.created_at,
      });
    }
  }
  return rows;
}

/** "Contains treeNuts" → "Contains tree nuts". Profile keys are camelCase. */
function humanise(text: string): string {
  return text.replace(/([a-z])([A-Z])/g, (_, a: string, b: string) => `${a} ${b.toLowerCase()}`);
}

// ── Card metrics ─────────────────────────────────────────────────────────────

export type MealMetric = keyof MealNutrition;

/** Which number on the card speaks to each insight. Carbs and sugar
 *  share a slot so a keto card shows carbs and protein, not carbs twice. */
const INSIGHT_METRIC: Partial<Record<InsightKey, MealMetric>> = {
  calorie: 'kcal',
  saturatedFat: 'sat_fat_g',
  digestiveLoad: 'fat_g',
  glycemic: 'carbs_g',
  carbLoad: 'carbs_g',
  sugar: 'sugars_g',
  protein: 'protein_g',
  fiber: 'fiber_g',
  sodium: 'salt_g',
};
const SAME_SLOT: Partial<Record<MealMetric, MealMetric>> = { carbs_g: 'sugars_g', sugars_g: 'carbs_g' };
const DEFAULT_METRICS: MealMetric[] = ['kcal', 'carbs_g', 'protein_g'];
const MAX_METRICS = 2;

/** The two numbers that matter most to this user, e.g. kcal and sat fat
 *  for weight loss, carbs and protein for keto. */
export function cardMetricsFor(profile: UserProfile | null): MealMetric[] {
  const ranked = new Map<InsightKey, number>();
  if (profile) {
    const { conditions, allergies, preferences } = profileTags(profile);
    for (const tag of [...conditions, ...allergies, ...preferences]) {
      for (const [key, w] of Object.entries(INSIGHT_WEIGHTS[tag] ?? {}) as [InsightKey, number][]) {
        ranked.set(key, Math.max(ranked.get(key) ?? 0, w));
      }
    }
  }
  const candidates = [
    ...[...ranked.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key]) => INSIGHT_METRIC[key])
      .filter((m): m is MealMetric => Boolean(m)),
    ...DEFAULT_METRICS,
  ];
  const out: MealMetric[] = [];
  for (const m of candidates) {
    if (out.length >= MAX_METRICS) break;
    if (out.includes(m) || (SAME_SLOT[m] && out.includes(SAME_SLOT[m]!))) continue;
    out.push(m);
  }
  return out;
}

const METRIC_LABEL: Record<MealMetric, string> = {
  kcal: 'kcal',
  fat_g: 'g fat',
  sat_fat_g: 'g sat fat',
  carbs_g: 'g carbs',
  sugars_g: 'g sugar',
  fiber_g: 'g fibre',
  protein_g: 'g protein',
  salt_g: 'g salt',
};

/** "520 kcal", "42 g carbs", "1.2 g salt". */
export function formatMetric(metric: MealMetric, value: number): string {
  const n = metric === 'kcal' || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${n} ${METRIC_LABEL[metric]}`;
}

// ── Nutrition panel rows ─────────────────────────────────────────────────────

/** Which panel row speaks to each insight. */
const INSIGHT_ROW: Partial<Record<InsightKey, NutrientRowKey>> = {
  calorie: 'kcal',
  saturatedFat: 'satFat',
  digestiveLoad: 'fat',
  carbLoad: 'carbs',
  glycemic: 'netCarbs',
  sugar: 'sugars',
  protein: 'protein',
  fiber: 'fiber',
  sodium: 'salt',
};
/** For a profile with nothing that points anywhere. */
const DEFAULT_ROWS: NutrientRowKey[] = ['kcal', 'fat', 'carbs', 'protein'];
/** Rows beyond calories. */
const MAX_FOCUS_ROWS = 4;

/** The NutritionPanel rows that matter to this user — calories, then up to
 *  four picked from their conditions, diets and allergies (keto and
 *  diabetes: carbs, net carbs, sugars, protein). The rest sit behind
 *  "See full nutritional values". */
export function nutritionRowsFor(profile: UserProfile | null): NutrientRowKey[] {
  const ranked = new Map<InsightKey, number>();
  if (profile) {
    const { conditions, allergies, preferences } = profileTags(profile);
    for (const tag of [...conditions, ...allergies, ...preferences]) {
      for (const [key, w] of Object.entries(INSIGHT_WEIGHTS[tag] ?? {}) as [InsightKey, number][]) {
        ranked.set(key, Math.max(ranked.get(key) ?? 0, w));
      }
    }
  }
  const picked: NutrientRowKey[] = [];
  for (const [key] of [...ranked.entries()].sort((a, b) => b[1] - a[1])) {
    const row = INSIGHT_ROW[key];
    if (!row || row === 'kcal' || picked.includes(row)) continue;
    picked.push(row);
    if (picked.length >= MAX_FOCUS_ROWS) break;
  }
  return picked.length > 0 ? ['kcal', ...picked] : DEFAULT_ROWS;
}
