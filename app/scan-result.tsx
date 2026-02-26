import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { UserProfile, FamilyProfile, DietaryTag } from '@/lib/types';
import { useActiveFamily } from '@/lib/activeFamilyContext';
import { FamilySwitcherSheet } from '@/components/FamilySwitcherSheet';
import { TickIcon } from '@/components/MenuIcons';
import {
  parseIngredientsText,
  buildHybridIngredients,
  translateToEnglish,
  cleanIngredientName,
} from '@/lib/ingredientsCleaner';
import SwitchIcon from '@/assets/icons/switch.svg';
import InfoIcon from '@/assets/icons/info.svg';
import BigBackIcon from '@/assets/icons/big_back.svg';

// Helper: on web use PNG fallback (react-native-svg masks/clipPaths break on web),
// on native use the SVG component directly.
type SvgComponent = React.FC<{ width?: number; height?: number }>;
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
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

// Food nutrition icons (sourced from Figma, Macro Stack node 3263-5386)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const FoodIcons = {
  energyKcal: require('@/assets/icons/food/calories.svg').default as React.FC<{ width?: number; height?: number }>,
  fat: require('@/assets/icons/food/fat.svg').default as React.FC<{ width?: number; height?: number }>,
  saturatedFat: require('@/assets/icons/food/sat-fat.svg').default as React.FC<{ width?: number; height?: number }>,
  carbs: require('@/assets/icons/food/carbs.svg').default as React.FC<{ width?: number; height?: number }>,
  sugars: require('@/assets/icons/food/sugars.svg').default as React.FC<{ width?: number; height?: number }>,
  fiber: require('@/assets/icons/food/fiber.svg').default as React.FC<{ width?: number; height?: number }>,
  proteins: require('@/assets/icons/food/protein.svg').default as React.FC<{ width?: number; height?: number }>,
  netCarbs: require('@/assets/icons/food/net-carbs.svg').default as React.FC<{ width?: number; height?: number }>,
  salt: require('@/assets/icons/food/salt.svg').default as React.FC<{ width?: number; height?: number }>,
};

// Impact state illustrations (Figma nodes 3122-2520, 3190-5184)
// SVG used on iOS/Android; PNG fallback on web (react-native-svg masks break on web).
// To add web PNGs for an icon set: export @2x PNGs from Figma into assets/icons/impact/png/
// and pass as the second arg to impactIcon().
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GlycemicIcons = {
  low:      impactIcon(require('@/assets/icons/impact/glycemic-low.svg'),      require('@/assets/icons/impact/png/glycemic-low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/glycemic-moderate.svg'), require('@/assets/icons/impact/png/glycemic-moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/glycemic-high.svg'),     require('@/assets/icons/impact/png/glycemic-high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/glycemic-very-high.svg'), require('@/assets/icons/impact/png/glycemic-very-high.png')),
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CalorieIcons = {
  low:      impactIcon(require('@/assets/icons/impact/calorie-low.svg'),      require('@/assets/icons/impact/png/calorie-low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/calorie-moderate.svg'), require('@/assets/icons/impact/png/calorie-moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/calorie-high.svg'),     require('@/assets/icons/impact/png/calorie-high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/calorie-very-high.svg'), require('@/assets/icons/impact/png/calorie-very-high.png')),
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdditiveIcons = {
  low:      impactIcon(require('@/assets/icons/impact/additive-low.svg'),      require('@/assets/icons/impact/png/additive-low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/additive-moderate.svg'), require('@/assets/icons/impact/png/additive-moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/additive-high.svg'),     require('@/assets/icons/impact/png/additive-high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/additive-very-high.svg'), require('@/assets/icons/impact/png/additive-very-high.png')),
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const DigestiveLoadIcons = {
  low:      impactIcon(require('@/assets/icons/impact/digestion-low.svg'),      require('@/assets/icons/impact/png/digestion-low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/digestion-moderate.svg'), require('@/assets/icons/impact/png/digestion-moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/digestion-high.svg'),     require('@/assets/icons/impact/png/digestion-high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/digestion-very-high.svg'), require('@/assets/icons/impact/png/digestion-very-high.png')),
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CarbLoadIcons = {
  low:      impactIcon(require('@/assets/icons/impact/carbload-low.svg'),      require('@/assets/icons/impact/png/carbload-low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/carbload-moderate.svg'), require('@/assets/icons/impact/png/carbload-moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/carbload-high.svg'),     require('@/assets/icons/impact/png/carbload-high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/carbload-very-high.svg'), require('@/assets/icons/impact/png/carbload-very-high.png')),
};
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SodiumIcons = {
  low:      impactIcon(require('@/assets/icons/impact/sodium-low.svg'),      require('@/assets/icons/impact/png/sodium-low.png')),
  moderate: impactIcon(require('@/assets/icons/impact/sodium-moderate.svg'), require('@/assets/icons/impact/png/sodium-moderate.png')),
  high:     impactIcon(require('@/assets/icons/impact/sodium-high.svg'),     require('@/assets/icons/impact/png/sodium-high.png')),
  veryHigh: impactIcon(require('@/assets/icons/impact/sodium-very-high.svg'), require('@/assets/icons/impact/png/sodium-very-high.png')),
};

// ── Personalised insight definitions ─────────────────────────────────────────
// Each insight declares which conditions/preferences/allergies make it relevant,
// a compute function that derives the result from available nutrient data, and
// a reference to its icon set. When no relevantTo conditions match the active
// profile the insight is hidden.
//
// Icon sets follow the same 4-state pattern (low/moderate/high/veryHigh).
// You will need to create illustration assets for new insights — the icon key
// below tells you what filenames are expected under assets/icons/impact/.
//
// ┌─────────────────────────┬──────────────────────────────────────────────────┐
// │ Insight key             │ Relevant conditions / preferences               │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ glycemic                │ Diabetes, PCOS, Metabolic Syndrome,             │
// │                         │ Low-Carb / Keto, Weight Loss, Diabetic          │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ sodium                  │ Hypertension, Heart Disease, Kidney Disease,    │
// │                         │ Lupus, Metabolic Syndrome                       │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ saturatedFat            │ Heart Disease, High Cholesterol,                │
// │                         │ Metabolic Syndrome, Weight Loss                 │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ sugar                   │ Diabetes, PCOS, ADHD, Autism, Eczema /          │
// │                         │ Psoriasis, ME / Chronic Fatigue, Weight Loss,   │
// │                         │ Metabolic Syndrome, Fructose Intolerance,       │
// │                         │ Diabetic                                        │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ fiber                   │ IBS, Chron's Disease, Ulcerative Colitis, SIBO, │
// │                         │ Leaky Gut Syndrome, FODMAP Diet                 │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ protein                 │ High-Protein / Fitness, Post-Bariatric Surgery, │
// │                         │ Weight Loss                                     │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ calorie                 │ Weight Loss, Post-Bariatric Surgery,            │
// │                         │ Metabolic Syndrome                              │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ inflammatoryFat         │ Rheumatoid Arthritis, Multiple Sclerosis,       │
// │                         │ Lupus, Eczema / Psoriasis                       │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ digestiveLoad           │ GERD / Acid Reflux, IBS, Chron's Disease,      │
// │                         │ Ulcerative Colitis, Leaky Gut Syndrome          │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ carbLoad                │ Low-Carb / Keto, Diabetic                       │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ additives               │ Child-Friendly / Additive-Free, ADHD, Autism,   │
// │                         │ Eczema / Psoriasis, IBS, Migraine / Chronic     │
// │                         │ Headaches, Clean Eating                         │
// └─────────────────────────┴──────────────────────────────────────────────────┘

type InsightKey =
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

type NutrientData = {
  sugars?: string; fiber?: string; carbs?: string;
  salt?: string; fat?: string; saturatedFat?: string;
  proteins?: string; energyKcal?: string;
  additiveCount?: number;
};

type InsightDef = {
  key: InsightKey;
  label: string;
  iconWidth: number;
  iconHeight: number;
  // Any of these tags on the active profile will surface this insight
  relevantTo: string[];
  compute: (data: NutrientData) => ImpactResult | null;
  icons: Record<ImpactKey, React.FC<{ width?: number; height?: number }>>;
};

const INSIGHT_DEFS: InsightDef[] = [
  {
    key: 'glycemic',
    label: 'Glycemic impact',
    iconWidth: 31,
    iconHeight: 44,
    relevantTo: [
      'Diabetes', 'Diabetic', 'PCOS', 'Metabolic Syndrome',
      'Low-Carb / Keto', 'Keto', 'Weight Loss',
    ],
    compute: (d) => {
      const sugars = d.sugars ? parseFloat(d.sugars) : NaN;
      if (isNaN(sugars)) return null;
      const fiber = d.fiber ? Math.max(0, parseFloat(d.fiber)) : 0;
      const carbs = d.carbs ? Math.max(0, parseFloat(d.carbs)) : sugars;
      const netCarbs = Math.max(0, carbs - fiber);
      const score = (sugars * 2 + netCarbs) / (fiber + 1);
      if (score > 30) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (score > 15) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (score > 5)  return { label: 'Moderate',  color: Extra.okYellow,         iconKey: 'moderate' };
      return { label: 'Low', color: Extra.positiveGreen, iconKey: 'low' };
    },
    icons: GlycemicIcons,
  },
  {
    key: 'sodium',
    label: 'Sodium',
    iconWidth: 28,
    iconHeight: 44,
    relevantTo: [
      'Hypertension', 'Heart Disease', 'Lupus', 'Metabolic Syndrome',
    ],
    compute: (d) => {
      const salt = d.salt ? parseFloat(d.salt) : NaN;
      if (isNaN(salt)) return null;
      if (salt > 3)   return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (salt > 1.5) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (salt > 0.3) return { label: 'Moderate',  color: Extra.okYellow,         iconKey: 'moderate' };
      return { label: 'Low', color: Extra.positiveGreen, iconKey: 'low' };
    },
    icons: SodiumIcons,
  },
  // TODO: Re-enable these insights once dedicated icon assets are created
  // Hidden: saturatedFat, sugar, fiber, protein (no icons yet)
  {
    key: 'calorie',
    label: 'Calorie density',
    iconWidth: 32,
    iconHeight: 44,
    relevantTo: [
      'Weight Loss', 'Post-Bariatric Surgery', 'Metabolic Syndrome',
    ],
    compute: (d) => {
      const kcal = d.energyKcal ? parseFloat(d.energyKcal) : NaN;
      if (isNaN(kcal)) return null;
      if (kcal > 400) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (kcal > 250) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (kcal > 100) return { label: 'Moderate',  color: Extra.okYellow,         iconKey: 'moderate' };
      return { label: 'Low', color: Extra.positiveGreen, iconKey: 'low' };
    },
    icons: CalorieIcons,
  },
  // TODO: Re-enable inflammatoryFat once dedicated icon assets are created
  {
    key: 'digestiveLoad',
    label: 'Digestive load',
    iconWidth: 50,
    iconHeight: 44,
    relevantTo: [
      'GERD / Acid Reflux', 'IBS', "Chron's Disease",
      'Ulcerative Colitis', 'Leaky Gut Syndrome',
    ],
    compute: (d) => {
      // Combined proxy: fat + fiber stress on the gut
      const fat = d.fat ? parseFloat(d.fat) : NaN;
      const fiber = d.fiber ? parseFloat(d.fiber) : 0;
      if (isNaN(fat)) return null;
      const score = fat + fiber;
      if (score > 15) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (score > 8)  return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (score > 4)  return { label: 'Moderate',  color: Extra.okYellow,         iconKey: 'moderate' };
      return { label: 'Low', color: Extra.positiveGreen, iconKey: 'low' };
    },
    icons: DigestiveLoadIcons,
  },
  {
    key: 'carbLoad',
    label: 'Carb load',
    iconWidth: 43,
    iconHeight: 44,
    relevantTo: [
      'Low-Carb / Keto', 'Keto', 'Diabetic',
    ],
    compute: (d) => {
      const carbs = d.carbs ? parseFloat(d.carbs) : NaN;
      if (isNaN(carbs)) return null;
      if (carbs > 30) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (carbs > 15) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (carbs > 5)  return { label: 'Moderate',  color: Extra.okYellow,         iconKey: 'moderate' };
      return { label: 'Low', color: Extra.positiveGreen, iconKey: 'low' };
    },
    icons: CarbLoadIcons,
  },
  {
    key: 'additives',
    label: 'Additives',
    iconWidth: 33,
    iconHeight: 44,
    relevantTo: [
      'Child-Friendly / Additive-Free', 'ADHD', 'Autism',
      'Eczema / Psoriasis', 'IBS', 'Migraine / Chronic Headaches',
      'Clean Eating',
    ],
    compute: (d) => {
      const count = d.additiveCount ?? -1;
      if (count < 0) return null;
      if (count >= 5) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (count >= 3) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (count >= 1) return { label: 'Moderate',  color: Extra.okYellow,         iconKey: 'moderate' };
      return { label: 'Low', color: Extra.positiveGreen, iconKey: 'low' };
    },
    icons: AdditiveIcons,
  },
];

const MAX_INSIGHTS = 3;

// Relevance weights: how important each insight is for a given condition/preference.
// Higher weight = more likely to be shown. Insights not listed for a tag default to 1.
const INSIGHT_WEIGHTS: Record<string, Partial<Record<InsightKey, number>>> = {
  // ── Diabetes focus: glycemic & sugar first, carbs second ──
  'Diabetes':    { glycemic: 10, sugar: 9, carbLoad: 8, calorie: 3 },
  'Diabetic':    { glycemic: 10, sugar: 9, carbLoad: 8, calorie: 3 },

  // ── Weight loss: calories & fat first ──
  'Weight Loss':           { calorie: 10, saturatedFat: 9, sugar: 7, protein: 6 },
  'Post-Bariatric Surgery':{ calorie: 10, protein: 9, sugar: 7 },

  // ── Heart / cholesterol: sat fat & sodium ──
  'Heart Disease':    { saturatedFat: 10, sodium: 9, calorie: 5 },
  'High Cholesterol': { saturatedFat: 10, inflammatoryFat: 7 },
  'Hypertension':     { sodium: 10 },

  // ── Metabolic syndrome: broad concern ──
  'Metabolic Syndrome': { calorie: 9, sugar: 8, sodium: 7, saturatedFat: 6, glycemic: 5 },

  // ── PCOS: sugar & glycemic ──
  'PCOS': { sugar: 10, glycemic: 9, carbLoad: 7 },

  // ── Keto: carbs first ──
  'Low-Carb / Keto': { carbLoad: 10, glycemic: 8, sugar: 7 },
  'Keto':            { carbLoad: 10, glycemic: 8, sugar: 7 },

  // ── Gut conditions: digestive load & fiber ──
  'IBS':                 { digestiveLoad: 10, fiber: 9, additives: 7 },
  "Chron's Disease":     { digestiveLoad: 10, fiber: 9 },
  'Ulcerative Colitis':  { digestiveLoad: 10, fiber: 9 },
  'SIBO':                { fiber: 10, sugar: 8 },
  'Leaky Gut Syndrome':  { digestiveLoad: 10, fiber: 8, sugar: 6 },
  'GERD / Acid Reflux':  { digestiveLoad: 10, saturatedFat: 7 },
  'FODMAP Diet':         { fiber: 10, sugar: 8 },

  // ── Inflammatory / autoimmune: inflammatory fat ──
  'Rheumatoid Arthritis': { inflammatoryFat: 10, sugar: 6 },
  'Multiple Sclerosis':   { inflammatoryFat: 10 },
  'Lupus':                { inflammatoryFat: 10, sodium: 8 },
  'Eczema / Psoriasis':   { inflammatoryFat: 10, sugar: 7, additives: 8 },

  // ── Neurological / behavioural: additives & sugar ──
  'ADHD':   { additives: 10, sugar: 8 },
  'Autism':  { additives: 10, sugar: 8 },

  // ── Migraine: additives & sodium ──
  'Migraine / Chronic Headaches': { additives: 10, sodium: 8, sugar: 5 },

  // ── Fatigue: sugar ──
  'ME / Chronic Fatigue': { sugar: 10 },

  // ── Child-friendly / clean eating: additives first ──
  'Child-Friendly / Additive-Free': { additives: 10, sugar: 7 },
  'Clean Eating':                    { additives: 10, sugar: 6 },

  // ── Fitness: protein first ──
  'High-Protein / Fitness': { protein: 10, calorie: 6 },

  // ── Allergies ──
  'Fructose Intolerance': { sugar: 10 },
};

// Returns the top 3 insights ranked by relevance to the active profile's focus.
// The highest relevance weight across all the user's tags wins.
function getActiveInsights(
  conditions: string[],
  allergies: string[],
  preferences: string[],
  nutrientData: NutrientData,
): { def: InsightDef; result: ImpactResult }[] {
  const tags = [...conditions, ...allergies, ...preferences];
  const tagSet = new Set(tags);
  const results: { def: InsightDef; result: ImpactResult; weight: number }[] = [];

  for (const def of INSIGHT_DEFS) {
    if (!def.relevantTo.some((t) => tagSet.has(t))) continue;
    const result = def.compute(nutrientData);
    if (!result) continue;

    // Take the highest weight this insight has across all active tags
    let maxWeight = 1;
    for (const tag of tags) {
      const w = INSIGHT_WEIGHTS[tag]?.[def.key];
      if (w != null && w > maxWeight) maxWeight = w;
    }
    results.push({ def, result, weight: maxWeight });
  }

  // Sort by relevance weight (descending)
  results.sort((a, b) => b.weight - a.weight);
  return results.slice(0, MAX_INSIGHTS);
}

// ── Local design tokens ───────────────────────────────────────────────────────
const Extra = {
  positiveGreen: '#009a1f',
  goodLime: '#b8d828',
  okYellow: '#F5B811',
  poorOrange: '#ff8736',
  highRed: '#ff7779',
  strokeSecondary: '#aad4cd',
};

// ── Nutri-score helpers ───────────────────────────────────────────────────────
const NUTRISCORE_GRADES = ['a', 'b', 'c', 'd', 'e'] as const;
const NUTRISCORE_COLORS: Record<string, string> = {
  a: Extra.positiveGreen,
  b: Extra.goodLime,
  c: Extra.okYellow,
  d: Extra.poorOrange,
  e: Colors.status.negative,
};
// Labels per Figma node 3263-5506
const NUTRISCORE_LABELS: Record<string, string> = {
  a: 'Amazing',
  b: 'Good',
  c: 'OK',
  d: 'Poor',
  e: 'Bad',
};

// ── Tab definitions ───────────────────────────────────────────────────────────
type Tab = 'overview' | 'nutrition' | 'ingredients' | 'recommended' | 'info';
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'nutrition', label: 'Nutrition' },
  { key: 'ingredients', label: 'Ingredients' },
  { key: 'recommended', label: 'Recommended' },
  { key: 'info', label: 'Product Info' },
];

// ── Dietary tag display ───────────────────────────────────────────────────────
const DIETARY_LABELS: Record<DietaryTag, string> = {
  diabetic: 'Diabetic',
  keto: 'Keto',
  'gluten-free': 'Gluten-free',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  lactose: 'Lactose-free',
  pescatarian: 'Pescatarian',
  kosher: 'Kosher',
};


// ── DRI reference values (EU / WHO adult) ─────────────────────────────────────
const DRI: Record<string, number> = {
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
type NutrientKey =
  | 'energyKcal'
  | 'fat'
  | 'saturatedFat'
  | 'carbs'
  | 'sugars'
  | 'fiber'
  | 'proteins'
  | 'netCarbs'
  | 'salt';

const NUTRIENT_LABELS: Record<NutrientKey, string> = {
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


const NUTRIENT_UNITS: Record<NutrientKey, string> = {
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
type Threshold = {
  low: number;
  moderate: number;
  inverted?: boolean;
  labels?: [string, string, string]; // [low, moderate, high] label overrides
};

const DEFAULT_THRESHOLDS: Record<NutrientKey, Threshold> = {
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
const CONDITION_OVERRIDES: Record<string, Partial<Record<NutrientKey, Partial<Threshold>>>> = {
  // ── Health conditions ──
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
function buildThresholds(
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

function getRating(
  key: NutrientKey,
  value: number,
  thresholds: Record<NutrientKey, Threshold>,
): { label: string; color: string } {
  const t = thresholds[key];
  const [lowLabel, modLabel, highLabel] = t.labels ?? ['Low', 'Moderate', 'High'];

  if (t.inverted) {
    if (value >= t.moderate) return { label: highLabel, color: Extra.positiveGreen };
    if (value >= t.low)      return { label: modLabel,  color: Extra.okYellow };
    return { label: lowLabel, color: Colors.status.negative };
  }

  if (value <= t.low)      return { label: lowLabel,  color: Extra.positiveGreen };
  if (value <= t.moderate)  return { label: modLabel,  color: Extra.poorOrange };
  return { label: highLabel, color: Colors.status.negative };
}

function fmtVal(raw: string | undefined, unit: string): string {
  if (!raw) return '—';
  const num = parseFloat(raw);
  if (isNaN(num)) return '—';
  if (unit === 'kcal') return `${Math.round(num)}${unit}`;
  if (num < 0.1) return `<0.1${unit}`;
  if (num < 10) return `${num.toFixed(1)}${unit}`;
  return `${Math.round(num)}${unit}`;
}

function fmtDri(rawStr: string | undefined, key: NutrientKey): string {
  if (!rawStr || !(key in DRI)) return '—';
  const val = parseFloat(rawStr);
  if (isNaN(val)) return '—';
  return `${Math.round((val / DRI[key]) * 100)}%`;
}

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return email[0].toUpperCase();
}

function sentenceCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

// ── OFF structured ingredient ─────────────────────────────────────────────────
type OffIngredient = {
  id?: string;
  text: string;
  vegan?: string;      // "yes" | "no" | "maybe"
  vegetarian?: string; // "yes" | "no" | "maybe"
  percent_estimate?: number;
};

type FlagReason = 'vegan' | 'vegetarian' | 'user_flagged';
type FlaggedIngredient = OffIngredient & { flagReason: FlagReason };

type IngredientCategory = {
  harmful: FlaggedIngredient[];
  ok: OffIngredient[];
  safe: OffIngredient[];
};

// Categorises OFF structured ingredients into Harmful / Ok / Safe buckets.
// Harmful: allergen conflict or dietary preference violation.
// Ok: E-number food additives (id matches en:eNNN).
// Safe: everything else.
function categoriseIngredients(
  ingredients: OffIngredient[],
  allergenTags: string[],   // product-level allergen tags, e.g. ["en:gluten","en:milk"]
  userPrefs: DietaryTag[],
  flaggedNames: string[],   // user's personal flagged ingredient names
): IngredientCategory {
  const harmful: FlaggedIngredient[] = [];
  const ok: OffIngredient[] = [];
  const safe: OffIngredient[] = [];
  const allergenSet = new Set(allergenTags.map((a) => a.toLowerCase()));
  const flaggedSet = new Set(flaggedNames.map((n) => n.toLowerCase()));

  for (const ing of ingredients) {
    const ingId = (ing.id ?? '').toLowerCase();
    const ingText = ing.text.toLowerCase();

    // Skip allergen-matched ingredients — allergens are handled separately
    // by the dedicated Allergy Warning card, not as flagged ingredients.
    if (ingId && allergenSet.has(ingId)) { safe.push(ing); continue; }

    let reason: FlagReason | null = null;
    // Dietary conflicts
    if (userPrefs.includes('vegan') && ing.vegan === 'no') reason = 'vegan';
    if (!reason && userPrefs.includes('vegetarian') && ing.vegetarian === 'no') reason = 'vegetarian';
    // User-flagged ingredients — match using whole-word boundaries to avoid
    // false positives (e.g. "sugar" should not flag inside "sugarcane").
    if (!reason && flaggedSet.size > 0) {
      for (const f of flaggedSet) {
        if (ingText === f) { reason = 'user_flagged'; break; }
        // Whole-word boundary match: "sugar" matches "brown sugar" but not "sugarcane"
        const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`\\b${escaped}\\b`).test(ingText)) {
          reason = 'user_flagged';
          break;
        }
      }
    }

    if (reason) { harmful.push({ ...ing, flagReason: reason }); continue; }

    // E-number food additive (en:e followed by digits)
    if (/^en:e\d+/i.test(ingId)) { ok.push(ing); continue; }

    safe.push(ing);
  }
  return { harmful, ok, safe };
}

// ── Allergen keyword mapping ─────────────────────────────────────────────────
// Maps each profile allergy label → the data needed to detect it in OFF data.
//   tags:           OFF allergens_tags values (after stripping "en:" and replacing "-" with " ")
//   keywords:       derivative ingredient names to match in raw ingredients text
//   ingredientIds:  OFF structured ingredient IDs (lowercase, with "en:" prefix)
type AllergyEntry = {
  tags: string[];
  keywords: string[];
  ingredientIds: string[];
};

const ALLERGY_KEYWORDS: Record<string, AllergyEntry> = {
  'Egg Allergy': {
    tags: ['eggs', 'egg'],
    keywords: [
      'egg white', 'egg yolk', 'egg powder', 'dried egg', 'whole egg',
      'pasteurised egg', 'pasteurized egg', 'free range egg',
      'albumin', 'albumen', 'globulin', 'lysozyme', 'ovomucin',
      'ovomucoid', 'ovovitellin', 'ovalbumin', 'livetin',
      'meringue', 'mayonnaise', 'aioli', 'eggnog',
      'lecithin', 'emulsifier e322',
    ],
    ingredientIds: [
      'en:egg', 'en:eggs', 'en:egg-white', 'en:egg-yolk', 'en:egg-powder',
      'en:whole-egg', 'en:dried-egg', 'en:pasteurised-egg', 'en:pasteurized-egg',
      'en:free-range-egg', 'en:free-range-eggs', 'en:liquid-egg',
      'en:egg-white-powder', 'en:egg-yolk-powder',
    ],
  },
  'Fructose Intolerance': {
    tags: ['fructose'],
    keywords: [
      'fructose', 'high fructose corn syrup', 'hfcs', 'fructose syrup',
      'fructose glucose syrup', 'glucose fructose syrup',
      'agave', 'agave syrup', 'agave nectar',
      'honey', 'apple juice concentrate', 'pear juice concentrate',
      'fruit juice concentrate', 'invert sugar', 'sorbitol',
    ],
    ingredientIds: [
      'en:fructose', 'en:high-fructose-corn-syrup', 'en:fructose-syrup',
      'en:fructose-glucose-syrup', 'en:glucose-fructose-syrup',
      'en:agave-syrup', 'en:honey', 'en:invert-sugar', 'en:sorbitol',
    ],
  },
  'Gluten Intolerance': {
    tags: ['gluten', 'wheat', 'barley', 'rye', 'oats', 'cereals containing gluten', 'cereals'],
    keywords: [
      'gluten', 'wheat', 'wheat flour', 'wheat starch', 'wheat protein',
      'wheat germ', 'wheat bran', 'durum wheat', 'semolina',
      'barley', 'barley malt', 'malt extract', 'malt vinegar', 'malt flavouring',
      'rye', 'rye flour',
      'oats', 'oat flour', 'oat fibre', 'oat fiber',
      'spelt', 'spelt flour', 'kamut', 'triticale', 'einkorn', 'emmer',
      'couscous', 'bulgur', 'seitan',
      'modified starch', 'hydrolysed wheat protein', 'hydrolyzed wheat protein',
    ],
    ingredientIds: [
      'en:gluten', 'en:wheat', 'en:wheat-flour', 'en:wheat-starch',
      'en:durum-wheat', 'en:durum-wheat-semolina', 'en:semolina',
      'en:barley', 'en:barley-malt', 'en:barley-malt-extract',
      'en:malt-extract', 'en:malt-vinegar',
      'en:rye', 'en:rye-flour', 'en:oats', 'en:oat-flour', 'en:oat-fibre',
      'en:spelt', 'en:spelt-flour', 'en:kamut', 'en:triticale',
      'en:bulgur', 'en:couscous', 'en:seitan',
    ],
  },
  'Histamine Intolerance': {
    tags: ['histamine'],
    keywords: [
      'histamine', 'fermented', 'aged cheese', 'parmesan',
      'sauerkraut', 'kimchi', 'vinegar', 'wine vinegar', 'balsamic vinegar',
      'soy sauce', 'fish sauce', 'anchovy', 'anchovies',
      'tomato paste', 'tomato puree', 'yeast extract', 'autolyzed yeast',
    ],
    ingredientIds: [
      'en:vinegar', 'en:wine-vinegar', 'en:balsamic-vinegar',
      'en:soy-sauce', 'en:fish-sauce', 'en:anchovy', 'en:anchovies',
      'en:yeast-extract', 'en:tomato-paste', 'en:tomato-puree',
      'en:sauerkraut', 'en:parmesan',
    ],
  },
  'Lactose Intolerance': {
    tags: ['milk', 'dairy', 'lactose'],
    keywords: [
      'milk', 'lactose', 'whole milk', 'skimmed milk', 'skim milk',
      'semi skimmed milk', 'milk powder', 'dried milk', 'milk solids',
      'milk protein', 'milk fat', 'condensed milk', 'evaporated milk',
      'buttermilk', 'cream', 'sour cream', 'double cream', 'single cream',
      'whipping cream', 'clotted cream',
      'butter', 'butter oil', 'butterfat', 'ghee',
      'cheese', 'cheddar', 'mozzarella', 'parmesan', 'gouda', 'brie',
      'camembert', 'feta', 'ricotta', 'mascarpone', 'cream cheese',
      'whey', 'whey powder', 'whey protein', 'whey permeate',
      'casein', 'caseinate', 'sodium caseinate', 'calcium caseinate',
      'lactalbumin', 'lactoglobulin', 'lactoferrin',
      'yoghurt', 'yogurt', 'kefir', 'quark', 'fromage frais',
      'ice cream', 'custard',
      'curds',
    ],
    ingredientIds: [
      'en:milk', 'en:whole-milk', 'en:skimmed-milk', 'en:semi-skimmed-milk',
      'en:milk-powder', 'en:skimmed-milk-powder', 'en:whole-milk-powder',
      'en:dried-milk', 'en:milk-solids', 'en:milk-protein', 'en:milk-fat',
      'en:condensed-milk', 'en:sweetened-condensed-milk', 'en:evaporated-milk',
      'en:buttermilk', 'en:cream', 'en:sour-cream', 'en:whipping-cream',
      'en:butter', 'en:butter-oil', 'en:butterfat', 'en:ghee',
      'en:cheese', 'en:cheddar', 'en:mozzarella', 'en:parmesan',
      'en:whey', 'en:whey-powder', 'en:whey-protein',
      'en:casein', 'en:caseinate', 'en:sodium-caseinate',
      'en:yogurt', 'en:yoghurt', 'en:kefir',
      'en:lactose', 'en:cream-cheese', 'en:mascarpone', 'en:ricotta',
    ],
  },
  'MSG Sensitivity': {
    tags: ['msg', 'monosodium glutamate'],
    keywords: [
      'monosodium glutamate', 'msg', 'glutamate', 'glutamic acid',
      'sodium glutamate', 'e621',
      'hydrolysed vegetable protein', 'hydrolyzed vegetable protein',
      'hydrolysed protein', 'hydrolyzed protein',
      'autolyzed yeast', 'autolysed yeast', 'yeast extract',
      'calcium glutamate', 'e623', 'monopotassium glutamate', 'e622',
    ],
    ingredientIds: [
      'en:monosodium-glutamate', 'en:e621', 'en:glutamic-acid',
      'en:yeast-extract', 'en:hydrolysed-vegetable-protein',
      'en:hydrolyzed-vegetable-protein',
    ],
  },
  'Peanut Allergy': {
    tags: ['peanuts', 'peanut'],
    keywords: [
      'peanut', 'peanuts', 'peanut oil', 'peanut butter', 'peanut flour',
      'peanut paste', 'groundnut', 'groundnuts', 'groundnut oil',
      'arachis oil', 'arachis hypogaea', 'monkey nuts',
      'beer nuts', 'earth nuts',
    ],
    ingredientIds: [
      'en:peanut', 'en:peanuts', 'en:peanut-oil', 'en:peanut-butter',
      'en:peanut-flour', 'en:peanut-paste', 'en:groundnut', 'en:groundnut-oil',
      'en:roasted-peanuts',
    ],
  },
  'Salicylate Sensitivity': {
    tags: ['salicylate', 'salicylates'],
    keywords: [
      'salicylate', 'salicylates', 'salicylic acid',
      'aspirin', 'acetylsalicylic acid',
      'methyl salicylate', 'wintergreen',
    ],
    ingredientIds: [
      'en:salicylic-acid',
    ],
  },
  'Sesame Allergy': {
    tags: ['sesame seeds', 'sesame'],
    keywords: [
      'sesame', 'sesame seeds', 'sesame oil', 'sesame paste', 'sesame flour',
      'tahini', 'tahina', 'halvah', 'halva', 'hummus', 'houmous',
      'gomashio', 'gomasio',
      'sesame seed oil', 'toasted sesame',
    ],
    ingredientIds: [
      'en:sesame', 'en:sesame-seeds', 'en:sesame-oil', 'en:sesame-paste',
      'en:tahini', 'en:toasted-sesame-seeds', 'en:sesame-seed-oil',
      'en:hulled-sesame-seeds',
    ],
  },
  'Shellfish Allergy': {
    tags: ['crustaceans', 'molluscs', 'shellfish'],
    keywords: [
      'shellfish', 'crustacean', 'crustaceans', 'mollusc', 'molluscs',
      'mollusk', 'mollusks',
      'shrimp', 'shrimps', 'prawn', 'prawns', 'crab', 'lobster',
      'crayfish', 'crawfish', 'langoustine', 'scampi', 'krill',
      'mussel', 'mussels', 'clam', 'clams', 'oyster', 'oysters',
      'scallop', 'scallops', 'squid', 'calamari', 'octopus',
      'snail', 'escargot', 'abalone', 'whelk', 'cockle', 'cockles',
      'cuttlefish',
      'chitin', 'chitosan', 'glucosamine',
      'shrimp paste', 'fish sauce', 'oyster sauce',
    ],
    ingredientIds: [
      'en:crustaceans', 'en:molluscs', 'en:shrimp', 'en:prawns', 'en:prawn',
      'en:crab', 'en:lobster', 'en:crayfish', 'en:langoustine',
      'en:mussel', 'en:mussels', 'en:clam', 'en:clams',
      'en:oyster', 'en:oysters', 'en:scallop', 'en:scallops',
      'en:squid', 'en:calamari', 'en:octopus', 'en:cuttlefish',
      'en:oyster-sauce', 'en:fish-sauce', 'en:shrimp-paste',
    ],
  },
  'Soy Allergy': {
    tags: ['soybeans', 'soy', 'soya'],
    keywords: [
      'soy', 'soya', 'soybeans', 'soybean', 'soya bean', 'soya beans',
      'soy sauce', 'soya sauce', 'shoyu', 'tamari',
      'soy lecithin', 'soya lecithin', 'soy protein', 'soya protein',
      'soy flour', 'soya flour', 'soy oil', 'soybean oil', 'soya oil',
      'soy milk', 'soya milk',
      'tofu', 'tempeh', 'miso', 'natto', 'edamame',
      'textured vegetable protein', 'tvp',
      'hydrolysed soy protein', 'hydrolyzed soy protein',
      'soy concentrate', 'soy isolate', 'soy fibre', 'soy fiber',
      'e322', 'e426',
    ],
    ingredientIds: [
      'en:soy', 'en:soya', 'en:soybeans', 'en:soybean', 'en:soya-beans',
      'en:soy-sauce', 'en:soya-sauce', 'en:tamari',
      'en:soy-lecithin', 'en:soya-lecithin', 'en:e322',
      'en:soy-protein', 'en:soya-protein', 'en:soy-flour', 'en:soya-flour',
      'en:soybean-oil', 'en:soy-oil', 'en:soya-oil',
      'en:tofu', 'en:tempeh', 'en:miso', 'en:edamame',
    ],
  },
  'Sulphite Sensitivity': {
    tags: [
      'sulphur dioxide and sulphites', 'sulphur dioxide', 'sulphites',
      'sulfur dioxide', 'sulfites',
    ],
    keywords: [
      'sulphite', 'sulphites', 'sulfite', 'sulfites',
      'sulphur dioxide', 'sulfur dioxide',
      'sodium sulphite', 'sodium sulfite', 'sodium bisulphite', 'sodium bisulfite',
      'sodium metabisulphite', 'sodium metabisulfite',
      'potassium bisulphite', 'potassium bisulfite',
      'potassium metabisulphite', 'potassium metabisulfite',
      'calcium sulphite', 'calcium sulfite',
      'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228',
    ],
    ingredientIds: [
      'en:sulphur-dioxide', 'en:sulfur-dioxide', 'en:sulphites', 'en:sulfites',
      'en:sodium-metabisulphite', 'en:sodium-metabisulfite',
      'en:potassium-metabisulphite', 'en:potassium-metabisulfite',
      'en:e220', 'en:e221', 'en:e222', 'en:e223', 'en:e224',
      'en:e225', 'en:e226', 'en:e227', 'en:e228',
    ],
  },
  'Tree Nut Allergy': {
    tags: ['nuts', 'tree nuts'],
    keywords: [
      'tree nut', 'tree nuts',
      'almond', 'almonds', 'almond oil', 'almond flour', 'almond milk',
      'almond butter', 'almond paste', 'marzipan', 'frangipane',
      'walnut', 'walnuts', 'walnut oil',
      'cashew', 'cashews', 'cashew nut', 'cashew butter',
      'pecan', 'pecans', 'pecan nut',
      'pistachio', 'pistachios', 'pistachio nut',
      'hazelnut', 'hazelnuts', 'hazel nut', 'filbert', 'filberts',
      'hazelnut oil', 'hazelnut paste', 'praline', 'gianduja', 'nutella',
      'macadamia', 'macadamia nut', 'macadamia nuts',
      'brazil nut', 'brazil nuts',
      'pine nut', 'pine nuts', 'pignoli', 'pinon',
      'chestnut', 'chestnuts',
      'coconut',
      'mixed nuts', 'nut mix',
    ],
    ingredientIds: [
      'en:nuts', 'en:tree-nuts',
      'en:almond', 'en:almonds', 'en:almond-oil', 'en:almond-flour',
      'en:almond-paste', 'en:almond-butter', 'en:marzipan',
      'en:walnut', 'en:walnuts', 'en:walnut-oil',
      'en:cashew', 'en:cashews', 'en:cashew-nut', 'en:cashew-nuts',
      'en:pecan', 'en:pecans', 'en:pecan-nut',
      'en:pistachio', 'en:pistachios', 'en:pistachio-nut',
      'en:hazelnut', 'en:hazelnuts', 'en:hazelnut-oil', 'en:hazelnut-paste',
      'en:macadamia', 'en:macadamia-nut', 'en:macadamia-nuts',
      'en:brazil-nut', 'en:brazil-nuts',
      'en:pine-nut', 'en:pine-nuts',
      'en:chestnut', 'en:chestnuts', 'en:coconut',
      'en:praline',
    ],
  },
  // ── EU14 additions (not in original list) ──
  'Fish Allergy': {
    tags: ['fish'],
    keywords: [
      'fish', 'cod', 'salmon', 'tuna', 'trout', 'haddock', 'halibut',
      'mackerel', 'sardine', 'sardines', 'anchovy', 'anchovies',
      'herring', 'plaice', 'sole', 'bass', 'bream', 'pike', 'perch',
      'swordfish', 'pollock', 'pollack', 'tilapia', 'catfish', 'snapper',
      'fish oil', 'fish sauce', 'fish paste', 'fish stock', 'fish extract',
      'fish gelatin', 'fish gelatine', 'isinglass',
      'omega 3', 'omega-3',
      'worcestershire sauce',
      'surimi', 'fish finger', 'fish cake',
    ],
    ingredientIds: [
      'en:fish', 'en:cod', 'en:salmon', 'en:tuna', 'en:trout',
      'en:haddock', 'en:halibut', 'en:mackerel', 'en:sardine', 'en:sardines',
      'en:anchovy', 'en:anchovies', 'en:herring', 'en:pollock',
      'en:fish-oil', 'en:fish-sauce', 'en:fish-stock', 'en:fish-extract',
      'en:fish-gelatin', 'en:fish-gelatine', 'en:isinglass',
      'en:surimi', 'en:tilapia',
    ],
  },
  'Celery Allergy': {
    tags: ['celery'],
    keywords: [
      'celery', 'celeriac', 'celery seed', 'celery seeds', 'celery salt',
      'celery powder', 'celery leaf', 'celery stalk', 'celery root',
      'celery extract', 'celery juice',
    ],
    ingredientIds: [
      'en:celery', 'en:celeriac', 'en:celery-seed', 'en:celery-seeds',
      'en:celery-salt', 'en:celery-powder', 'en:celery-extract',
    ],
  },
  'Mustard Allergy': {
    tags: ['mustard'],
    keywords: [
      'mustard', 'mustard seed', 'mustard seeds', 'mustard powder',
      'mustard flour', 'mustard oil', 'mustard paste',
      'dijon mustard', 'english mustard', 'french mustard',
      'wholegrain mustard', 'yellow mustard', 'brown mustard',
    ],
    ingredientIds: [
      'en:mustard', 'en:mustard-seed', 'en:mustard-seeds',
      'en:mustard-powder', 'en:mustard-flour', 'en:mustard-oil',
      'en:dijon-mustard',
    ],
  },
  'Lupin Allergy': {
    tags: ['lupin', 'lupine'],
    keywords: [
      'lupin', 'lupine', 'lupin flour', 'lupin seed', 'lupin seeds',
      'lupin protein', 'lupin fibre', 'lupin fiber',
      'lupini beans', 'lupini',
    ],
    ingredientIds: [
      'en:lupin', 'en:lupine', 'en:lupin-flour', 'en:lupin-seeds',
      'en:lupin-protein', 'en:lupini-beans',
    ],
  },
};

type ImpactKey = 'low' | 'moderate' | 'high' | 'veryHigh';
type ImpactResult = { label: string; color: string; iconKey: ImpactKey };

// ── Reason messages for flagged ingredients ──────────────────────────────────
const FLAG_REASON_TEXT: Record<FlagReason, { title: string; body: string }> = {
  vegan: {
    title: 'Not vegan',
    body: 'This ingredient is not vegan, which conflicts with your dietary preferences.',
  },
  vegetarian: {
    title: 'Not vegetarian',
    body: 'This ingredient is not vegetarian, which conflicts with your dietary preferences.',
  },
  user_flagged: {
    title: 'Personally flagged',
    body: 'You\'ve flagged this ingredient. It will be highlighted whenever it appears in products you scan.',
  },
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

// ── Substitute ingredient mapping ────────────────────────────────────────────
// Covers dietary preferences, allergens, and health conditions.
// getSubstitutes checks the ingredient against ALL maps relevant to the
// active profile and returns the first match.

const DIETARY_SUBSTITUTES: Record<string, Record<string, string[]>> = {
  vegan: {
    milk: ['Oat milk', 'Almond milk', 'Soy milk', 'Coconut milk'],
    cream: ['Coconut cream', 'Cashew cream', 'Oat cream'],
    butter: ['Vegan butter', 'Coconut oil', 'Olive oil'],
    cheese: ['Nutritional yeast', 'Cashew cheese', 'Vegan cheese'],
    egg: ['Flax egg', 'Chia egg', 'Aquafaba', 'Silken tofu'],
    honey: ['Maple syrup', 'Agave nectar', 'Date syrup'],
    gelatin: ['Agar-agar', 'Pectin', 'Carrageenan'],
    gelatine: ['Agar-agar', 'Pectin', 'Carrageenan'],
    whey: ['Pea protein', 'Soy protein', 'Rice protein'],
    casein: ['Pea protein', 'Soy protein', 'Rice protein'],
    lard: ['Coconut oil', 'Vegetable shortening', 'Olive oil'],
    tallow: ['Coconut oil', 'Vegetable shortening'],
    yoghurt: ['Coconut yoghurt', 'Soy yoghurt', 'Oat yoghurt'],
    yogurt: ['Coconut yoghurt', 'Soy yoghurt', 'Oat yoghurt'],
    lactose: ['Oat milk', 'Almond milk', 'Soy milk'],
    shellac: ['Zein coating', 'Carnauba wax'],
    beeswax: ['Candelilla wax', 'Carnauba wax'],
    carmine: ['Beetroot powder', 'Paprika extract'],
    cochineal: ['Beetroot powder', 'Paprika extract'],
    'l-cysteine': ['Synthetic L-cysteine', 'Fermented L-cysteine'],
    anchov: ['Capers', 'Seaweed flakes', 'Miso paste'],
  },
  vegetarian: {
    gelatin: ['Agar-agar', 'Pectin', 'Carrageenan'],
    gelatine: ['Agar-agar', 'Pectin', 'Carrageenan'],
    lard: ['Butter', 'Coconut oil', 'Vegetable shortening'],
    tallow: ['Butter', 'Coconut oil'],
    anchov: ['Capers', 'Miso paste', 'Soy sauce'],
    rennet: ['Vegetarian rennet', 'Microbial rennet'],
    carmine: ['Beetroot powder', 'Paprika extract'],
    cochineal: ['Beetroot powder', 'Paprika extract'],
    shellac: ['Zein coating', 'Carnauba wax'],
    'l-cysteine': ['Synthetic L-cysteine', 'Fermented L-cysteine'],
    isinglass: ['Bentonite', 'Irish moss'],
  },
};

const ALLERGEN_SUBSTITUTES: Record<string, Record<string, string[]>> = {
  'Egg Allergy': {
    egg: ['Flax egg', 'Chia egg', 'Aquafaba', 'Applesauce'],
  },
  'Lactose Intolerance': {
    milk: ['Lactose-free milk', 'Oat milk', 'Almond milk'],
    cream: ['Lactose-free cream', 'Coconut cream'],
    cheese: ['Lactose-free cheese', 'Aged hard cheese'],
    yoghurt: ['Lactose-free yoghurt', 'Coconut yoghurt'],
    yogurt: ['Lactose-free yoghurt', 'Coconut yoghurt'],
    butter: ['Ghee', 'Olive oil', 'Coconut oil'],
    lactose: ['Lactose-free milk', 'Oat milk'],
    whey: ['Pea protein', 'Rice protein'],
  },
  'Gluten Intolerance': {
    wheat: ['Rice flour', 'Almond flour', 'Oat flour'],
    flour: ['Rice flour', 'Almond flour', 'Coconut flour'],
    barley: ['Quinoa', 'Buckwheat', 'Millet'],
    rye: ['Buckwheat flour', 'Rice flour'],
    semolina: ['Corn semolina', 'Rice flour'],
    couscous: ['Quinoa', 'Cauliflower rice'],
    breadcrumb: ['Gluten-free breadcrumbs', 'Ground almonds'],
    pasta: ['Rice pasta', 'Lentil pasta', 'Buckwheat noodles'],
    gluten: ['Rice flour', 'Almond flour', 'Tapioca starch'],
  },
  'Peanut Allergy': {
    peanut: ['Sunflower seed butter', 'Tahini', 'Almond butter'],
  },
  'Tree Nut Allergy': {
    almond: ['Sunflower seeds', 'Pumpkin seeds', 'Oat flour'],
    walnut: ['Sunflower seeds', 'Pumpkin seeds'],
    cashew: ['Sunflower seeds', 'Hemp seeds'],
    hazelnut: ['Sunflower seeds', 'Toasted coconut'],
    pistachio: ['Pumpkin seeds', 'Sunflower seeds'],
    pecan: ['Sunflower seeds', 'Toasted coconut'],
    macadamia: ['Coconut', 'Sunflower seeds'],
    nut: ['Sunflower seeds', 'Pumpkin seeds', 'Hemp seeds'],
  },
  'Soy Allergy': {
    soy: ['Coconut aminos', 'Fish sauce', 'Chickpea miso'],
    tofu: ['Chickpea tofu', 'Paneer', 'Tempeh-style grain cake'],
    soya: ['Coconut aminos', 'Sunflower lecithin'],
    lecithin: ['Sunflower lecithin'],
    edamame: ['Broad beans', 'Lima beans'],
  },
  'Sesame Allergy': {
    sesame: ['Sunflower seed butter', 'Poppy seeds', 'Hemp seeds'],
    tahini: ['Sunflower seed butter'],
  },
  'Shellfish Allergy': {
    shrimp: ['Hearts of palm', 'King oyster mushroom'],
    prawn: ['Hearts of palm', 'King oyster mushroom'],
    crab: ['Hearts of palm', 'Artichoke hearts'],
    lobster: ['Hearts of palm', 'King oyster mushroom'],
    shellfish: ['White fish', 'Hearts of palm'],
  },
  'Fish Allergy': {
    fish: ['Seaweed', 'Mushroom', 'Jackfruit'],
    anchov: ['Capers', 'Seaweed flakes', 'Miso paste'],
    sardine: ['Seaweed', 'Mushroom'],
    tuna: ['Chickpeas', 'Jackfruit'],
    salmon: ['Carrots', 'Beetroot', 'Jackfruit'],
    cod: ['Tofu', 'Banana blossom'],
  },
  'Celery Allergy': {
    celery: ['Fennel', 'Cucumber', 'Bok choy'],
    celeriac: ['Parsnip', 'Turnip'],
  },
  'Mustard Allergy': {
    mustard: ['Horseradish', 'Wasabi', 'Turmeric'],
  },
  'Lupin Allergy': {
    lupin: ['Chickpea flour', 'Soy flour'],
  },
  'Sulphite Sensitivity': {
    sulphite: ['Citric acid', 'Ascorbic acid'],
    sulfite: ['Citric acid', 'Ascorbic acid'],
    'sulphur dioxide': ['Citric acid', 'Ascorbic acid'],
  },
  'Fructose Intolerance': {
    fructose: ['Glucose', 'Dextrose', 'Rice malt syrup'],
    'high fructose': ['Glucose syrup', 'Rice malt syrup'],
    'fruit juice': ['Glucose syrup', 'Maple syrup'],
    honey: ['Rice malt syrup', 'Maple syrup'],
    agave: ['Rice malt syrup', 'Glucose syrup'],
  },
  'Histamine Intolerance': {
    vinegar: ['Citric acid', 'Lemon juice'],
    tomato: ['Beetroot', 'Pumpkin puree'],
    fermented: ['Fresh alternatives', 'Unfermented options'],
  },
  'MSG Sensitivity': {
    'monosodium glutamate': ['Herbs', 'Spices', 'Nutritional yeast'],
    msg: ['Herbs', 'Spices', 'Mushroom powder'],
    glutamate: ['Herbs', 'Spices', 'Coconut aminos'],
  },
  'Salicylate Sensitivity': {
    salicylate: ['Peeled pears', 'Iceberg lettuce'],
  },
};

const CONDITION_SUBSTITUTES: Record<string, Record<string, string[]>> = {
  'Diabetes': {
    sugar: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    glucose: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    fructose: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    dextrose: ['Stevia', 'Erythritol'],
    sucrose: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    maltose: ['Stevia', 'Monk fruit sweetener'],
    'corn syrup': ['Stevia', 'Monk fruit sweetener'],
    honey: ['Stevia', 'Monk fruit sweetener', 'Erythritol'],
    'white flour': ['Almond flour', 'Coconut flour', 'Lupin flour'],
    'white rice': ['Cauliflower rice', 'Brown rice', 'Quinoa'],
    potato: ['Cauliflower', 'Turnip', 'Celeriac'],
  },
  'IBS': {
    onion: ['Chives', 'Green part of spring onion', 'Asafoetida'],
    garlic: ['Garlic-infused oil', 'Asafoetida', 'Chives'],
    wheat: ['Oats', 'Rice', 'Quinoa'],
    lactose: ['Lactose-free milk', 'Oat milk'],
    milk: ['Lactose-free milk', 'Oat milk'],
    apple: ['Blueberries', 'Strawberries', 'Grapes'],
    sorbitol: ['Stevia', 'Maple syrup'],
    mannitol: ['Stevia', 'Maple syrup'],
    inulin: ['Psyllium husk', 'Oat bran'],
    chicory: ['Psyllium husk', 'Oat bran'],
  },
  "Chron's Disease": {
    'whole grain': ['White rice', 'White bread', 'Refined pasta'],
    bran: ['White bread', 'Refined oats'],
    seed: ['Smooth nut butter', 'Peeled fruit'],
    popcorn: ['Rice cakes', 'Pretzels'],
  },
  'Ulcerative Colitis': {
    'whole grain': ['White rice', 'Refined pasta'],
    seed: ['Smooth nut butter', 'Peeled fruit'],
    spice: ['Mild herbs', 'Turmeric', 'Ginger'],
  },
  'GERD / Acid Reflux': {
    tomato: ['Pumpkin puree', 'Butternut squash'],
    citrus: ['Banana', 'Melon', 'Papaya'],
    chocolate: ['Carob', 'Vanilla'],
    mint: ['Basil', 'Ginger'],
    vinegar: ['Lemon juice (small amounts)'],
    coffee: ['Low-acid coffee', 'Chicory root tea'],
  },
  'High Cholesterol': {
    butter: ['Olive oil', 'Avocado oil', 'Plant sterol spread'],
    lard: ['Olive oil', 'Avocado oil'],
    'palm oil': ['Olive oil', 'Rapeseed oil'],
    'coconut oil': ['Olive oil', 'Avocado oil'],
    cream: ['Low-fat yoghurt', 'Cashew cream'],
  },
  'Hypertension': {
    salt: ['Herbs', 'Spices', 'Lemon juice', 'Garlic'],
    sodium: ['Potassium salt', 'Herbs', 'Spices'],
    'soy sauce': ['Coconut aminos', 'Low-sodium soy sauce'],
    bacon: ['Turkey bacon', 'Mushroom bacon'],
  },
  'Heart Disease': {
    butter: ['Olive oil', 'Avocado oil'],
    lard: ['Olive oil', 'Rapeseed oil'],
    'palm oil': ['Olive oil', 'Rapeseed oil'],
    cream: ['Low-fat yoghurt', 'Oat cream'],
    salt: ['Herbs', 'Spices', 'Lemon juice'],
  },
  'PCOS': {
    sugar: ['Stevia', 'Monk fruit sweetener', 'Cinnamon'],
    'white flour': ['Almond flour', 'Coconut flour'],
    'white rice': ['Quinoa', 'Brown rice', 'Cauliflower rice'],
  },
  'Metabolic Syndrome': {
    sugar: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    'white flour': ['Almond flour', 'Oat flour'],
    'corn syrup': ['Stevia', 'Monk fruit sweetener'],
  },
  'Eczema / Psoriasis': {
    'artificial colour': ['Beetroot powder', 'Turmeric', 'Spirulina'],
    'artificial flavor': ['Natural vanilla', 'Herbs', 'Spices'],
  },
  'Migraine / Chronic Headaches': {
    msg: ['Herbs', 'Spices', 'Mushroom powder'],
    'monosodium glutamate': ['Herbs', 'Spices'],
    aspartame: ['Stevia', 'Monk fruit sweetener'],
    nitrate: ['Uncured meat', 'Fresh meat'],
    nitrite: ['Uncured meat', 'Fresh meat'],
  },
  'ADHD': {
    'artificial colour': ['Beetroot powder', 'Turmeric', 'Spirulina'],
    'artificial flavor': ['Natural flavourings', 'Herbs'],
    'sodium benzoate': ['Citric acid', 'Ascorbic acid'],
  },
  'SIBO': {
    onion: ['Chives', 'Garlic-infused oil', 'Asafoetida'],
    garlic: ['Garlic-infused oil', 'Asafoetida'],
    wheat: ['Rice', 'Quinoa', 'Oats'],
    lactose: ['Lactose-free milk', 'Oat milk'],
    milk: ['Lactose-free milk', 'Almond milk'],
  },
  'Leaky Gut Syndrome': {
    gluten: ['Rice flour', 'Almond flour', 'Coconut flour'],
    wheat: ['Rice', 'Quinoa', 'Buckwheat'],
    sugar: ['Stevia', 'Raw honey (small amounts)'],
  },
  'Rheumatoid Arthritis': {
    sugar: ['Stevia', 'Monk fruit sweetener'],
  },
  'Lupus': {
    salt: ['Herbs', 'Spices', 'Lemon juice'],
  },
};

function getSubstitutes(
  ingredientText: string,
  flagReason: FlagReason,
  conditions: string[],
  allergies: string[],
): string[] {
  const lower = ingredientText.toLowerCase();

  const findMatch = (map: Record<string, string[]>): string[] | null => {
    for (const [keyword, subs] of Object.entries(map)) {
      if (lower.includes(keyword)) return subs;
    }
    return null;
  };

  // 1. Dietary preference substitutes (from flag reason)
  if (flagReason === 'vegan' || flagReason === 'vegetarian') {
    const dietMap = DIETARY_SUBSTITUTES[flagReason];
    if (dietMap) {
      const match = findMatch(dietMap);
      if (match) return match;
    }
  }

  // 2. Allergen-based substitutes
  for (const allergy of allergies) {
    const allergyMap = ALLERGEN_SUBSTITUTES[allergy];
    if (allergyMap) {
      const match = findMatch(allergyMap);
      if (match) return match;
    }
  }

  // 3. Condition-based substitutes
  for (const condition of conditions) {
    const condMap = CONDITION_SUBSTITUTES[condition];
    if (condMap) {
      const match = findMatch(condMap);
      if (match) return match;
    }
  }

  return [];
}

function FlaggedIngredientSheet({
  ingredient,
  onClose,
  conditions,
  allergies,
}: {
  ingredient: FlaggedIngredient | null;
  onClose: () => void;
  conditions: string[];
  allergies: string[];
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const lastIngRef = useRef<FlaggedIngredient | null>(null);
  if (ingredient) lastIngRef.current = ingredient;
  const display = ingredient ?? lastIngRef.current;

  useEffect(() => {
    if (ingredient) {
      setMounted(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [ingredient]);

  if (!mounted || !display) return null;

  const reason = FLAG_REASON_TEXT[display.flagReason as FlagReason];
  const substitutes = getSubstitutes(display.text, display.flagReason as FlagReason, conditions, allergies);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[flaggedSheetStyles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          flaggedSheetStyles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={flaggedSheetStyles.handle} />

        <TouchableOpacity
          style={flaggedSheetStyles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <View style={flaggedSheetStyles.content}>
          <View style={flaggedSheetStyles.iconCircle}>
            <Ionicons name="warning" size={24} color={Colors.status.negative} />
          </View>
          <Text style={flaggedSheetStyles.ingredientName}>
            {display.text.charAt(0).toUpperCase() + display.text.slice(1)}
          </Text>
          <View style={flaggedSheetStyles.descriptionBox}>
            <Text style={flaggedSheetStyles.reasonTitle}>{reason.title}</Text>
            <Text style={flaggedSheetStyles.reasonBody}>{reason.body}</Text>
          </View>

          {substitutes.length > 0 && (
            <View style={flaggedSheetStyles.substituteCard}>
              <Text style={flaggedSheetStyles.substituteTitle}>
                Suitable replacements include:
              </Text>
              <View style={flaggedSheetStyles.substituteList}>
                {substitutes.map((sub) => (
                  <View key={sub} style={flaggedSheetStyles.substituteRow}>
                    <View style={flaggedSheetStyles.substituteIconWrap}>
                      <TickIcon size={14} color={Colors.secondary} strokeWidth={2} />
                    </View>
                    <Text style={flaggedSheetStyles.substituteText}>{sub}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const flaggedSheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 52, 50, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.stroke.primary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
    flex: 1,
    justifyContent: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,63,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    textAlign: 'center',
  },
  descriptionBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 24,
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  reasonBody: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 22,
    textAlign: 'center',
  },
  // ── Substitute list ──
  substituteCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 16,
  },
  substituteTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  substituteList: {
    gap: 2,
  },
  substituteRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  substituteIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  substituteText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#00342c',
    letterSpacing: -0.26,
    lineHeight: 16,
  },
});

// ── Common food additive / ingredient descriptions ──────────────────────────
// Covers E-numbers and hard-to-read ingredient names. Keyed by lowercase name
// or OFF id (e.g. "en:e476"). Looked up by exact match, then by E-number
// extraction, then by substring.
const ADDITIVE_DESCRIPTIONS: Record<string, { what: string; why: string }> = {
  'en:e322': { what: 'Lecithin — a natural emulsifier usually derived from soy or sunflower seeds.', why: 'It helps blend ingredients that normally don\'t mix (like oil and water). Widely used and considered safe.' },
  'en:e322i': { what: 'Lecithin — a natural emulsifier usually derived from soy or sunflower seeds.', why: 'It helps blend ingredients that normally don\'t mix (like oil and water). Widely used and considered safe.' },
  'en:e330': { what: 'Citric acid — a natural acid found in citrus fruits like lemons and oranges.', why: 'Used as a preservative and flavour enhancer. It occurs naturally in many foods and is considered safe.' },
  'en:e331': { what: 'Sodium citrate — the sodium salt of citric acid.', why: 'Used as a flavour enhancer and acidity regulator. Found naturally in citrus fruits and considered safe.' },
  'en:e339': { what: 'Sodium phosphate — a mineral salt used in food processing.', why: 'Acts as an emulsifier and moisture retainer. Safe in normal food amounts, though excessive phosphate intake should be monitored.' },
  'en:e412': { what: 'Guar gum — a natural thickener extracted from guar beans.', why: 'Used to thicken and stabilise foods. It\'s a soluble fibre and generally well tolerated.' },
  'en:e414': { what: 'Gum arabic — a natural gum from acacia trees.', why: 'Used as a stabiliser and emulsifier. It\'s a natural plant-based ingredient and considered safe.' },
  'en:e415': { what: 'Xanthan gum — a thickener produced by bacterial fermentation.', why: 'Widely used in sauces, dressings and gluten-free baking. Considered safe and is a common kitchen ingredient.' },
  'en:e440': { what: 'Pectin — a natural gelling agent found in fruit.', why: 'Used to set jams and jellies. It\'s a natural plant fibre and perfectly safe.' },
  'en:e450': { what: 'Diphosphates — mineral salts used as raising agents.', why: 'Commonly found in baking powder. Safe in normal food amounts.' },
  'en:e460': { what: 'Cellulose — plant fibre, the main structural component of plant cell walls.', why: 'Used as a bulking agent and anti-caking agent. It\'s indigestible fibre and safe to consume.' },
  'en:e466': { what: 'Carboxymethyl cellulose — a modified plant fibre used as a thickener.', why: 'Used to improve texture in sauces and ice cream. Generally recognised as safe.' },
  'en:e471': { what: 'Mono- and diglycerides of fatty acids — emulsifiers derived from plant or animal fats.', why: 'Used to help ingredients mix smoothly. Very common in bread, ice cream and margarine.' },
  'en:e472e': { what: 'DATEM (diacetyl tartaric acid esters) — an emulsifier used in baking.', why: 'Strengthens dough and improves bread texture. Considered safe.' },
  'en:e476': { what: 'Polyglycerol polyricinoleate (PGPR) — an emulsifier made from castor oil and glycerol.', why: 'Used in chocolate to improve flow and reduce the amount of cocoa butter needed. Approved as safe by food authorities worldwide.' },
  'en:e500': { what: 'Sodium bicarbonate — baking soda.', why: 'A common household ingredient used as a raising agent. Perfectly safe.' },
  'en:e501': { what: 'Potassium carbonate — a mineral salt used as a raising agent.', why: 'Similar to baking soda. Used in baking and considered safe.' },
  'en:e503': { what: 'Ammonium carbonate — a traditional raising agent.', why: 'Used in flat baked goods like cookies. Breaks down completely during baking.' },
  'en:e507': { what: 'Hydrochloric acid — a mineral acid used for pH adjustment.', why: 'Used in tiny amounts to regulate acidity. Naturally present in your stomach.' },
  'en:e509': { what: 'Calcium chloride — a mineral salt.', why: 'Used as a firming agent in canned vegetables and cheese-making. Considered safe.' },
  'en:e516': { what: 'Calcium sulphate — a mineral used in food processing.', why: 'Used in tofu-making and as a dough conditioner. A natural mineral and considered safe.' },
  'en:e551': { what: 'Silicon dioxide — a natural mineral (silica).', why: 'Used as an anti-caking agent to keep powders flowing freely. Found naturally in many foods.' },
  'en:e621': { what: 'Monosodium glutamate (MSG) — a flavour enhancer.', why: 'Adds savoury/umami flavour. Glutamate occurs naturally in tomatoes, parmesan cheese and mushrooms. Generally considered safe, though some people report sensitivity.' },
  'en:e901': { what: 'Beeswax — a natural wax produced by honeybees.', why: 'Used as a glazing agent on sweets and fruit. Natural and safe (not suitable for vegans).' },
  'en:e903': { what: 'Carnauba wax — a natural plant wax from Brazilian palm leaves.', why: 'Used as a coating/glazing agent. Plant-based and considered safe.' },
  'en:e904': { what: 'Shellac — a natural resin secreted by lac insects.', why: 'Used as a glazing agent on sweets and pills. Considered safe (not suitable for vegans).' },
  'en:e950': { what: 'Acesulfame K — an artificial sweetener.', why: 'About 200× sweeter than sugar with zero calories. Approved by food safety authorities, though some prefer to avoid artificial sweeteners.' },
  'en:e951': { what: 'Aspartame — an artificial sweetener.', why: 'One of the most studied food additives. Approved as safe, though people with PKU (phenylketonuria) should avoid it.' },
  'en:e955': { what: 'Sucralose — an artificial sweetener made from sugar.', why: 'About 600× sweeter than sugar with zero calories. Widely approved as safe.' },
  'en:e960': { what: 'Steviol glycosides (Stevia) — a natural sweetener from the stevia plant.', why: 'A plant-based, zero-calorie sweetener. Considered safe and a popular sugar alternative.' },
  'en:e965': { what: 'Maltitol — a sugar alcohol used as a sweetener.', why: 'Lower calorie than sugar with less impact on blood glucose. May cause digestive discomfort in large amounts.' },
  // Common non-E-number ingredient names
  'polyglycerol polyricinoleate': { what: 'An emulsifier (also known as E476 or PGPR) made from castor oil and glycerol.', why: 'Used in chocolate to improve flow and reduce cocoa butter. Approved as safe worldwide.' },
  'soy lecithin': { what: 'A natural emulsifier extracted from soybeans.', why: 'One of the most common food additives — helps blend oil and water. Safe unless you have a soy allergy.' },
  'soya lecithin': { what: 'A natural emulsifier extracted from soybeans.', why: 'One of the most common food additives — helps blend oil and water. Safe unless you have a soy allergy.' },
  'sunflower lecithin': { what: 'A natural emulsifier extracted from sunflower seeds.', why: 'Allergen-friendly alternative to soy lecithin. Considered safe.' },
  'xanthan gum': { what: 'A thickener produced by bacterial fermentation of sugar.', why: 'Widely used in sauces, dressings and gluten-free baking. Considered safe.' },
  'guar gum': { what: 'A natural thickener extracted from guar beans.', why: 'Used to thicken and stabilise foods. It\'s a soluble fibre and generally well tolerated.' },
  'carrageenan': { what: 'A thickener and stabiliser extracted from red seaweed.', why: 'Used in dairy products and plant milks. Generally recognised as safe, though some studies suggest it may irritate sensitive guts.' },
  'maltodextrin': { what: 'A starch-derived carbohydrate used as a thickener or filler.', why: 'Has a high glycemic index but is used in small amounts. Considered safe as a food additive.' },
  'sodium benzoate': { what: 'A preservative — the sodium salt of benzoic acid, which occurs naturally in berries.', why: 'Prevents mould and bacterial growth. Safe at approved levels.' },
  'potassium sorbate': { what: 'A preservative — the potassium salt of sorbic acid.', why: 'Prevents mould and yeast growth. Widely used and considered safe.' },
  'calcium carbonate': { what: 'Chalk — a natural mineral and a source of calcium.', why: 'Used as a colour (white), acidity regulator and calcium supplement. Perfectly safe.' },
  'mono- and diglycerides of fatty acids': { what: 'Emulsifiers derived from plant or animal fats (also known as E471).', why: 'Used to help ingredients mix smoothly. Very common in processed foods and considered safe.' },
  'tbhq': { what: 'Tert-butylhydroquinone — a synthetic antioxidant.', why: 'Used in small amounts to prevent fats from going rancid. Approved as safe at regulated levels.' },
  'pgpr': { what: 'Polyglycerol polyricinoleate (E476) — an emulsifier.', why: 'Used in chocolate to improve texture. Approved as safe worldwide.' },
  'ascorbic acid': { what: 'Vitamin C — an essential nutrient.', why: 'Used as an antioxidant and preservative. It\'s simply vitamin C and perfectly safe.' },
  'tocopherol': { what: 'Vitamin E — a natural antioxidant.', why: 'Used to prevent fats from going rancid. It\'s an essential vitamin and safe.' },
  'sodium bicarbonate': { what: 'Baking soda — a common raising agent.', why: 'Used in baking to help doughs rise. A household staple and perfectly safe.' },
  'citric acid': { what: 'A natural acid found in citrus fruits like lemons and oranges.', why: 'Used as a preservative and flavour enhancer. Occurs naturally in many foods and is safe.' },
  'malic acid': { what: 'A natural acid found in apples and other fruits.', why: 'Used as a flavour enhancer to add tartness. Natural and safe.' },
  'lactic acid': { what: 'A natural acid produced during fermentation.', why: 'Found in yoghurt, sauerkraut and sourdough. Natural and safe.' },
  'pectin': { what: 'A natural gelling agent found in fruit (especially apples and citrus peel).', why: 'Used to set jams and jellies. It\'s a natural plant fibre and perfectly safe.' },
  'inulin': { what: 'A natural prebiotic fibre found in chicory root.', why: 'Supports gut health by feeding beneficial bacteria. Generally safe, though large amounts can cause bloating.' },
};

/**
 * Look up a plain-English description for an ingredient.
 * Tries: OFF id → lowercase name → E-number extraction.
 */
function getAdditiveDescription(ing: OffIngredient): { what: string; why: string } | null {
  const id = (ing.id ?? '').toLowerCase();
  if (ADDITIVE_DESCRIPTIONS[id]) return ADDITIVE_DESCRIPTIONS[id];

  const name = ing.text.toLowerCase().trim();
  if (ADDITIVE_DESCRIPTIONS[name]) return ADDITIVE_DESCRIPTIONS[name];

  // Try extracting an E-number from the id (e.g. "en:e476i" → "en:e476")
  const eMatch = id.match(/^(en:e\d+)/);
  if (eMatch && ADDITIVE_DESCRIPTIONS[eMatch[1]]) return ADDITIVE_DESCRIPTIONS[eMatch[1]];

  return null;
}

// ── Ingredient Info Sheet (for OK / Safe ingredients) ────────────────────────
function IngredientInfoSheet({
  ingredient,
  category,
  onClose,
}: {
  ingredient: OffIngredient | null;
  category: 'ok' | 'safe';
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const lastRef = useRef<OffIngredient | null>(null);
  if (ingredient) lastRef.current = ingredient;
  const display = ingredient ?? lastRef.current;

  useEffect(() => {
    if (ingredient) {
      setMounted(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [ingredient]);

  if (!mounted || !display) return null;

  const desc = getAdditiveDescription(display);
  const iconColor = category === 'ok' ? Extra.poorOrange : Extra.positiveGreen;
  const iconName = category === 'ok' ? 'alert-circle' : 'checkmark-circle';
  const categoryLabel = category === 'ok' ? 'OK' : 'Safe';

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[flaggedSheetStyles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          flaggedSheetStyles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={flaggedSheetStyles.handle} />

        <TouchableOpacity
          style={flaggedSheetStyles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <View style={flaggedSheetStyles.content}>
          <View style={[flaggedSheetStyles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          <Text style={flaggedSheetStyles.ingredientName}>
            {display.text.charAt(0).toUpperCase() + display.text.slice(1)}
          </Text>
          <View style={flaggedSheetStyles.descriptionBox}>
            <Text style={flaggedSheetStyles.reasonTitle}>
              Classified as {categoryLabel}
            </Text>
            {desc ? (
              <>
                <Text style={flaggedSheetStyles.reasonBody}>{desc.what}</Text>
                <Text style={flaggedSheetStyles.reasonBody}>{desc.why}</Text>
              </>
            ) : (
              <Text style={flaggedSheetStyles.reasonBody}>
                This is a food additive commonly used in processed foods.
                It has been approved by food safety authorities for use in food products.
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Insight explanation text ─────────────────────────────────────────────────
const INSIGHT_EXPLANATIONS: Record<InsightKey, string> = {
  glycemic:        'Glycemic impact estimates how quickly this product may raise blood sugar based on its sugar, carbohydrate and fibre content. This is especially relevant for managing diabetes, PCOS and metabolic conditions.',
  sodium:          'Sodium levels indicate the salt content of this product. High sodium intake is linked to elevated blood pressure and increased cardiovascular risk.',
  saturatedFat:    'Saturated fat content is associated with raised cholesterol and heart disease risk when consumed in excess.',
  sugar:           'Sugar load reflects the total sugar content per serving. High sugar intake can affect blood glucose control, energy levels and long-term metabolic health.',
  fiber:           'Fibre content matters for digestive conditions. While fibre is generally beneficial, high-fibre foods can aggravate symptoms in IBS, Crohn\'s disease and other gut conditions.',
  protein:         'Protein content is important for muscle repair, satiety and post-surgical recovery. Higher protein is generally preferred for fitness and weight management goals.',
  calorie:         'Calorie density measures the energy content per 100g. Monitoring calorie intake supports weight management and post-bariatric dietary goals.',
  inflammatoryFat: 'Inflammatory fat is a proxy based on saturated fat content, which can promote inflammation relevant to autoimmune and inflammatory conditions.',
  digestiveLoad:   'Digestive load combines fat and fibre content to estimate how demanding this product is on your digestive system. High values may trigger symptoms in GERD, IBS and other gut conditions.',
  carbLoad:        'Carb load reflects the total carbohydrate content. This is key for low-carb, keto and diabetic diets where carbohydrate restriction is central.',
  additives:       'Additive count tracks the number of food additives (E-numbers) in this product. Some additives are associated with sensitivities, behavioural effects in children, and digestive discomfort.',
};

// ── Insight detail bottom sheet ─────────────────────────────────────────────
function InsightDetailSheet({
  insight,
  onClose,
}: {
  insight: { def: InsightDef; result: ImpactResult } | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const lastRef = useRef<{ def: InsightDef; result: ImpactResult } | null>(null);
  if (insight) lastRef.current = insight;
  const display = insight ?? lastRef.current;

  useEffect(() => {
    if (insight) {
      setMounted(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [insight]);

  if (!mounted || !display) return null;

  const { def, result } = display;
  const Icon = def.icons[result.iconKey];
  const explanation = INSIGHT_EXPLANATIONS[def.key] ?? '';

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        style={[insightSheetStyles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[
          insightSheetStyles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <View style={insightSheetStyles.handle} />

        <TouchableOpacity
          style={insightSheetStyles.closeBtn}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={22} color={Colors.primary} />
        </TouchableOpacity>

        <View style={insightSheetStyles.content}>
          <Icon width={def.iconWidth * 1.4} height={def.iconHeight * 1.4} />
          <Text style={insightSheetStyles.label}>{def.label}</Text>
          <View style={[insightSheetStyles.pill, { backgroundColor: result.color }]}>
            <Text style={insightSheetStyles.pillText}>{result.label}</Text>
          </View>
          <View style={insightSheetStyles.descriptionBox}>
            <Text style={insightSheetStyles.explanation}>{explanation}</Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const insightSheetStyles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 52, 50, 0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.stroke.primary,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    gap: 12,
    paddingBottom: 8,
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
  descriptionBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 24,
    margin: 12,
    width: '100%',
  },
  explanation: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 22,
    textAlign: 'center',
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ScanResultScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const p = useLocalSearchParams<{
    scanId: string;
    productName: string;
    brand: string;
    imageUrl: string;
    barcode: string;
    quantity: string;
    nutriscoreGrade: string;
    energyKcal: string;
    carbs: string;
    sugars: string;
    fiber: string;
    fat: string;
    saturatedFat: string;
    proteins: string;
    salt: string;
    servingSize: string;
    energyKcalServing: string;
    carbsServing: string;
    sugarsServing: string;
    fiberServing: string;
    fatServing: string;
    saturatedFatServing: string;
    proteinsServing: string;
    saltServing: string;
    ingredientsText: string;
    allergens: string;
    ingredientsJson: string;
    offLang: string;
  }>();

  const { activeFamilyId } = useActiveFamily();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [tabScrollX, setTabScrollX] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [flaggedNames, setFlaggedNames] = useState<string[]>([]);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [activeFamilyProfile, setActiveFamilyProfile] = useState<FamilyProfile | null>(null);
  const [insightSheetDef, setInsightSheetDef] = useState<{ def: InsightDef; result: ImpactResult } | null>(null);
  const [flaggedSheetIng, setFlaggedSheetIng] = useState<FlaggedIngredient | null>(null);
  const [infoSheetIng, setInfoSheetIng] = useState<{ ing: OffIngredient; category: 'ok' | 'safe' } | null>(null);

  // When opened from History, nutritional params are absent — fetch them from OFF.
  type OffPayload = {
    nutriscoreGrade: string;
    quantity: string;
    energyKcal: string;
    carbs: string;
    sugars: string;
    fiber: string;
    fat: string;
    saturatedFat: string;
    proteins: string;
    salt: string;
    servingSize: string;
    energyKcalServing: string;
    carbsServing: string;
    sugarsServing: string;
    fiberServing: string;
    fatServing: string;
    saturatedFatServing: string;
    proteinsServing: string;
    saltServing: string;
    ingredientsText: string;
    allergens: string;
    ingredientsJson: string;
    offLang: string;
  };
  const [fetched, setFetched] = useState<Partial<OffPayload> | null>(null);
  const [fetchingOff, setFetchingOff] = useState(false);

  // Nutrition tab toggles
  type ServingMode = '100g' | 'serving';
  type DriMode = 'value' | 'dri';
  const [servingMode, setServingMode] = useState<ServingMode>('serving');
  const [driMode, setDriMode] = useState<DriMode>('value');

  // Fetch user profile + flagged ingredient names
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setProfile(data as UserProfile);
        const flaggedIds: string[] = data.flagged_ingredients ?? [];
        if (flaggedIds.length) {
          supabase
            .from('ingredients')
            .select('name')
            .in('id', flaggedIds)
            .then(({ data: ingData }) => {
              setFlaggedNames(
                (ingData ?? []).map((r: any) => r.name).filter(Boolean) as string[],
              );
            });
        }
      });
  }, [session]);

  // Fetch active family member profile when switching
  useEffect(() => {
    if (!activeFamilyId) {
      setActiveFamilyProfile(null);
      return;
    }
    // Clear stale profile immediately so the UI doesn't flash old data
    setActiveFamilyProfile(null);
    supabase
      .from('family_profiles')
      .select('*')
      .eq('id', activeFamilyId)
      .single()
      .then(({ data }) => {
        setActiveFamilyProfile(data ? (data as FamilyProfile) : null);
      });
  }, [activeFamilyId]);

  const needsOffFetch = !p.carbs && !!p.barcode;

  useEffect(() => {
    if (!needsOffFetch) return;
    setFetchingOff(true);
    fetch(`https://world.openfoodfacts.org/api/v0/product/${p.barcode}.json`, {
      headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 1 && data.product) {
          const op = data.product;
          const n = op.nutriments ?? {};
          const allergenTags: string[] = op.allergens_tags ?? [];
          setFetched({
            nutriscoreGrade: op.nutriscore_grade || op.nutrition_grade_fr || '',
            quantity: op.quantity || op.product_quantity || '',
            energyKcal: n['energy-kcal_100g'] != null ? String(n['energy-kcal_100g']) : '',
            carbs: n.carbohydrates_100g != null ? String(n.carbohydrates_100g) : '',
            sugars: n.sugars_100g != null ? String(n.sugars_100g) : '',
            fiber: n.fiber_100g != null ? String(n.fiber_100g) : '',
            fat: n.fat_100g != null ? String(n.fat_100g) : '',
            saturatedFat: n['saturated-fat_100g'] != null ? String(n['saturated-fat_100g']) : '',
            proteins: n.proteins_100g != null ? String(n.proteins_100g) : '',
            salt: n.salt_100g != null ? String(n.salt_100g) : '',
            servingSize: op.serving_size || '',
            energyKcalServing: n['energy-kcal_serving'] != null ? String(n['energy-kcal_serving']) : '',
            carbsServing: n.carbohydrates_serving != null ? String(n.carbohydrates_serving) : '',
            sugarsServing: n.sugars_serving != null ? String(n.sugars_serving) : '',
            fiberServing: n.fiber_serving != null ? String(n.fiber_serving) : '',
            fatServing: n.fat_serving != null ? String(n.fat_serving) : '',
            saturatedFatServing: n['saturated-fat_serving'] != null ? String(n['saturated-fat_serving']) : '',
            proteinsServing: n.proteins_serving != null ? String(n.proteins_serving) : '',
            saltServing: n.salt_serving != null ? String(n.salt_serving) : '',
            ingredientsText: op.ingredients_text_en || op.ingredients_text || '',
            allergens: allergenTags.join(','),
            ingredientsJson: op.ingredients ? JSON.stringify(op.ingredients) : '',
            offLang: op.ingredients_text_en ? 'en' : (op.lang || op.lc || 'en'),
          });
        }
      })
      .catch(() => {/* silently ignore — the empty state handles no-data */})
      .finally(() => setFetchingOff(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge route params with anything fetched from OFF — per 100g values
  const nutriscoreGrade = (p.nutriscoreGrade || fetched?.nutriscoreGrade || '').toLowerCase();
  const quantity = p.quantity || fetched?.quantity || '';
  const rawEnergyKcal = p.energyKcal || fetched?.energyKcal;
  const rawCarbs = p.carbs || fetched?.carbs;
  const rawSugars = p.sugars || fetched?.sugars;
  const rawFiber = p.fiber || fetched?.fiber;
  const rawFat = p.fat || fetched?.fat;
  const rawSaturatedFat = p.saturatedFat || fetched?.saturatedFat;
  const rawProteins = p.proteins || fetched?.proteins;
  const rawSalt = p.salt || fetched?.salt;

  // Per-serving values
  const servingSize = p.servingSize || fetched?.servingSize || '';
  const rawEnergyKcalServing = p.energyKcalServing || fetched?.energyKcalServing;
  const rawCarbsServing = p.carbsServing || fetched?.carbsServing;
  const rawSugarsServing = p.sugarsServing || fetched?.sugarsServing;
  const rawFiberServing = p.fiberServing || fetched?.fiberServing;
  const rawFatServing = p.fatServing || fetched?.fatServing;
  const rawSaturatedFatServing = p.saturatedFatServing || fetched?.saturatedFatServing;
  const rawProteinsServing = p.proteinsServing || fetched?.proteinsServing;
  const rawSaltServing = p.saltServing || fetched?.saltServing;
  const hasServingData = !!(rawEnergyKcalServing || rawCarbsServing || rawSugarsServing ||
    rawFiberServing || rawFatServing || rawSaturatedFatServing || rawProteinsServing || rawSaltServing);

  const ingredientsTextRaw = p.ingredientsText || fetched?.ingredientsText || '';
  const allergenSource = p.allergens || fetched?.allergens || '';
  const ingredientsJsonRaw = p.ingredientsJson || fetched?.ingredientsJson || '';
  const offLang = p.offLang || fetched?.offLang || 'en';

  // Translate non-English ingredients text to English when needed
  const [translatedText, setTranslatedText] = useState('');
  useEffect(() => {
    if (!ingredientsTextRaw || offLang === 'en') {
      setTranslatedText('');
      return;
    }
    translateToEnglish(ingredientsTextRaw, offLang).then(setTranslatedText);
  }, [ingredientsTextRaw, offLang]);

  // Use translated text when available, otherwise the raw text (which is English or best-effort)
  const ingredientsText = (offLang !== 'en' && translatedText) ? translatedText : ingredientsTextRaw;

  // Net carbs = carbs - fiber (computed for both modes)
  const netCarbsRaw = (() => {
    const c = rawCarbs ? parseFloat(rawCarbs) : NaN;
    const f = rawFiber ? parseFloat(rawFiber) : NaN;
    if (isNaN(c)) return undefined;
    const nc = isNaN(f) ? c : Math.max(0, c - f);
    return String(nc);
  })();
  const netCarbsServingRaw = (() => {
    const c = rawCarbsServing ? parseFloat(rawCarbsServing) : NaN;
    const f = rawFiberServing ? parseFloat(rawFiberServing) : NaN;
    if (isNaN(c)) return undefined;
    const nc = isNaN(f) ? c : Math.max(0, c - f);
    return String(nc);
  })();

  const allergenList: string[] = allergenSource
    ? allergenSource
        .split(',')
        .filter(Boolean)
        .map((a) => {
          const name = a.trim().replace(/^en:/, '').replace(/-/g, ' ');
          return name.charAt(0).toUpperCase() + name.slice(1);
        })
    : [];

  const profileAllergies: string[] = activeFamilyProfile
    ? activeFamilyProfile.allergies ?? []
    : profile?.allergies ?? [];

  // Match product allergens against the active profile using three data sources:
  // 1. OFF allergens_tags  (e.g. "en:eggs" → parsed to "Eggs")
  // 2. Raw ingredients text (catches allergens OFF missed in tags)
  // 3. Structured ingredient IDs from OFF JSON (e.g. "en:egg-yolk")
  const allergenLower = allergenList.map((a) => a.toLowerCase());
  const ingTextLower = ingredientsText.toLowerCase();

  // Collect all structured ingredient IDs for matching (lowercased)
  const structuredIngIds: string[] = [];
  try {
    const parsed = ingredientsJsonRaw ? JSON.parse(ingredientsJsonRaw) : [];
    const collectIds = (items: any[]) => {
      for (const item of items) {
        if (item.id) structuredIngIds.push(item.id.toLowerCase());
        if (item.ingredients) collectIds(item.ingredients);
      }
    };
    collectIds(parsed);
  } catch { /* malformed JSON — ignore */ }

  const matchedAllergens = profileAllergies.filter((profileAllergy) => {
    const entry = ALLERGY_KEYWORDS[profileAllergy];
    if (!entry) {
      // Fallback for unknown allergies: word-boundary match on first word
      const firstWord = profileAllergy.split(/\s+/)[0].toLowerCase();
      const wb = new RegExp(`\\b${firstWord}\\b`, 'i');
      return allergenLower.some((al) => al.includes(firstWord))
        || wb.test(ingredientsText)
        || structuredIngIds.some((id) => id.includes(firstWord));
    }
    const { tags, keywords, ingredientIds } = entry;
    // Check OFF allergen tags
    if (tags.some((t) => allergenLower.some((al) => al === t || al.includes(t)))) return true;
    // Check structured ingredient IDs
    if (ingredientIds.some((id) => structuredIngIds.some((sid) => sid === id || sid.includes(id)))) return true;
    // Check raw ingredients text with word boundaries to avoid false positives
    if (keywords.some((kw) => {
      if (kw.length <= 3) return new RegExp(`\\b${kw}\\b`, 'i').test(ingredientsText);
      return ingTextLower.includes(kw);
    })) return true;
    return false;
  });
  const hasProfileAllergenMatch = matchedAllergens.length > 0;

  // Detect if serving is effectively 100g (e.g. "100g", "100 g", "1 serving (100 g)")
  const servingIs100g = /\b100\s*(g|ml)\b/i.test(servingSize);
  // Only show the per-100g tab when serving differs from 100g
  const showBothModes = hasServingData && !servingIs100g;
  // Clean serving label with closing bracket only, e.g. "30g" → "30g)", "(30g)" → "30g)"
  const servingLabelRaw = servingSize.replace(/^\(|\)$/g, '').trim().replace(/(\d)\s+(g|mg|kg|ml|l|oz|fl)\b/gi, '$1$2');
  const servingLabel = servingLabelRaw ? `${servingLabelRaw})` : '';
  // Available modes for the toggle
  const servingModes: ServingMode[] = showBothModes ? ['serving', '100g'] : ['100g'];
  // If we only have one mode, force it
  const effectiveServingMode: ServingMode = showBothModes ? servingMode : '100g';

  // All nutrient rows in display order (matches Figma Macro Stack)
  // Switches between per-100g and per-serving based on the active toggle.
  // Falls back to 100g if no serving data is available.
  const useServing = effectiveServingMode === 'serving' && hasServingData;
  const nutrientRows: { key: NutrientKey; raw: string | undefined }[] = [
    { key: 'energyKcal', raw: useServing ? rawEnergyKcalServing : rawEnergyKcal },
    { key: 'fat', raw: useServing ? rawFatServing : rawFat },
    { key: 'saturatedFat', raw: useServing ? rawSaturatedFatServing : rawSaturatedFat },
    { key: 'carbs', raw: useServing ? rawCarbsServing : rawCarbs },
    { key: 'sugars', raw: useServing ? rawSugarsServing : rawSugars },
    { key: 'fiber', raw: useServing ? rawFiberServing : rawFiber },
    { key: 'proteins', raw: useServing ? rawProteinsServing : rawProteins },
    { key: 'netCarbs', raw: useServing ? netCarbsServingRaw : netCarbsRaw },
    { key: 'salt', raw: useServing ? rawSaltServing : rawSalt },
  ];

  // Overview highlights (per Figma node 3263-6133): carbs, sugars, fiber, netCarbs, salt
  const OVERVIEW_KEYS: NutrientKey[] = ['carbs', 'sugars', 'fiber', 'netCarbs', 'salt'];
  const overviewNutrients = nutrientRows.filter((r) => OVERVIEW_KEYS.includes(r.key));

  const hasNutrition =
    !fetchingOff && nutrientRows.some(({ raw }) => raw && parseFloat(raw) >= 0);

  // Ingredients parsing for Ingredients tab — clean text-based list
  const ingredientsList: string[] = parseIngredientsText(ingredientsText);

  // Structured OFF ingredients — deduplicated, cleaned raw JSON for metadata (vegan/vegetarian flags)
  const rawStructured: OffIngredient[] = ingredientsJsonRaw
    ? (() => {
        try {
          const raw = JSON.parse(ingredientsJsonRaw) as OffIngredient[];
          const seen = new Set<string>();
          return raw
            .map((ing) => ({ ...ing, text: cleanIngredientName(ing.text) }))
            .filter((ing) => {
              // Drop empty or very short entries left after cleaning
              if (ing.text.length <= 1) return false;
              const key = (ing.id ?? ing.text).toLowerCase();
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
        } catch { return []; }
      })()
    : [];

  // Hybrid approach: use clean text names for display, structured data for metadata.
  // When English text is available, buildHybridIngredients matches clean names to
  // structured entries so we get proper display names with vegan/vegetarian flags.
  // Falls back to raw structured data when no text is available.
  const structuredIngredients: OffIngredient[] = ingredientsList.length > 0
    ? buildHybridIngredients(ingredientsList, rawStructured)
    : rawStructured;

  // Use active family member's preferences when selected, else main user's
  const activePrefs: DietaryTag[] = activeFamilyProfile
    ? activeFamilyProfile.dietary_preferences ?? []
    : profile?.dietary_preferences ?? [];

  const categorised = categoriseIngredients(
    structuredIngredients,
    allergenSource.split(',').filter(Boolean),
    activePrefs,
    flaggedNames,
  );

  // Build condition-aware nutrient thresholds from the active profile
  const activeConditions = activeFamilyProfile
    ? activeFamilyProfile.health_conditions ?? []
    : profile?.health_conditions ?? [];
  const activeAllergies = activeFamilyProfile
    ? activeFamilyProfile.allergies ?? []
    : profile?.allergies ?? [];
  const activeDietaryLabels = activeFamilyProfile
    ? activeFamilyProfile.dietary_preferences?.map((d) => DIETARY_LABELS[d] ?? d) ?? []
    : profile?.dietary_preferences?.map((d) => DIETARY_LABELS[d] ?? d) ?? [];
  const nutrientThresholds = buildThresholds(activeConditions, activeAllergies, activeDietaryLabels);

  // Personalised impact insights (Overview → Important for you section)
  // Dynamically filtered based on the active profile's conditions/allergies/preferences.
  const activeInsights = getActiveInsights(
    activeConditions,
    activeAllergies,
    activeDietaryLabels,
    {
      sugars: rawSugars, fiber: rawFiber, carbs: rawCarbs,
      salt: rawSalt, fat: rawFat, saturatedFat: rawSaturatedFat,
      proteins: rawProteins, energyKcal: rawEnergyKcal,
      additiveCount: structuredIngredients.filter((ing) => /^en:e\d+/i.test(ing.id ?? '')).length,
    },
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back button */}
      <View style={styles.backRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <BigBackIcon width={32} height={32} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Product header ── */}
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            {!!p.brand && <Text style={styles.brandName}>{sentenceCase(p.brand)}</Text>}
            <Text style={styles.productName}>{sentenceCase(p.productName) || 'Unknown Product'}</Text>
            {!!quantity && <Text style={styles.quantity}>{quantity}</Text>}
          </View>
          {p.imageUrl ? (
            <View style={styles.imageCard}>
              <Image
                source={{ uri: p.imageUrl }}
                style={styles.productImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={[styles.imageCard, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={30} color={Colors.secondary} />
            </View>
          )}
        </View>

        {/* ── Nutri-score (Figma node 3263-5506) ── */}
        {!!nutriscoreGrade && !!NUTRISCORE_COLORS[nutriscoreGrade] && (
          <View style={styles.nutriscoreRow}>
            <View style={styles.nutriscoreLeft}>
              <Text style={styles.nutriscoreLabel}>Nutri-score</Text>
              <View style={[styles.nutriscorebadge, { backgroundColor: NUTRISCORE_COLORS[nutriscoreGrade] }]}>
                <Text style={styles.nutriscorebadgeText}>{NUTRISCORE_LABELS[nutriscoreGrade]}</Text>
              </View>
            </View>
            <View style={styles.nutriscoreScale}>
              {NUTRISCORE_GRADES.map((g) => {
                const isActive = g === nutriscoreGrade;
                return (
                  <View
                    key={g}
                    style={[
                      isActive ? styles.nutriscoreCircleActive : styles.nutriscoreCircleInactive,
                      { backgroundColor: NUTRISCORE_COLORS[g] },
                    ]}
                  >
                    <Text style={[
                      styles.nutriscoreCircleText,
                      isActive && styles.nutriscoreCircleTextActive,
                    ]}>{g.toUpperCase()}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Tab bar ── */}
        <View style={styles.tabBarWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
            onScroll={(e) => setTabScrollX(e.nativeEvent.contentOffset.x)}
            scrollEventThrottle={16}
          >
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, isActive && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {tabScrollX > 2 && (
            <LinearGradient
              colors={['#ffffff', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tabFadeLeft}
              pointerEvents="none"
            />
          )}
          <LinearGradient
            colors={['rgba(255,255,255,0)', '#ffffff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tabFadeRight}
            pointerEvents="none"
          />
        </View>

        {/* ══════════════════════════════════════════════════════
            OVERVIEW TAB
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* ── Selected Family Member / Profile (Figma node 3263-6080) ── */}
            {session && profile && (() => {
              const isFamily = !!activeFamilyProfile;
              const fullName = isFamily
                ? activeFamilyProfile!.name
                : profile.full_name || session.user.email?.split('@')[0] || 'My Profile';
              const displayName = fullName.trim().split(/\s+/)[0];
              const avatarUrl = isFamily
                ? activeFamilyProfile!.avatar_url
                : profile.avatar_url;
              // Merge all tags into one list (health conditions + allergies + dietary labels)
              const tags: string[] = [];
              if (isFamily) {
                if (activeFamilyProfile!.health_conditions?.length)
                  tags.push(...activeFamilyProfile!.health_conditions);
                if (activeFamilyProfile!.allergies?.length)
                  tags.push(...activeFamilyProfile!.allergies);
                if (activeFamilyProfile!.dietary_preferences?.length)
                  tags.push(...activeFamilyProfile!.dietary_preferences.map((d) => DIETARY_LABELS[d] ?? d));
              } else {
                if (profile.health_conditions?.length)
                  tags.push(...profile.health_conditions);
                if (profile.allergies?.length)
                  tags.push(...profile.allergies);
                if (profile.dietary_preferences?.length)
                  tags.push(...profile.dietary_preferences.map((d) => DIETARY_LABELS[d] ?? d));
              }
              return (
                <View style={styles.familySection}>
                  <View style={styles.familyAvatar}>
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={styles.familyAvatarImage} />
                    ) : (
                      <Text style={styles.familyAvatarInitials}>
                        {getInitials(isFamily ? activeFamilyProfile!.name : (profile.full_name ?? null), session.user.email ?? 'U')}
                      </Text>
                    )}
                  </View>
                  <View style={styles.familyInfo}>
                    <View style={styles.familyNameTags}>
                      <Text style={styles.familyName}>{displayName}</Text>
                      {tags.length > 0 && (
                        <View style={styles.familyTagRow}>
                          {tags.map((tag, i) => (
                            <View key={`tag-${i}`} style={styles.familyTag}>
                              <Text style={styles.familyTagText}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.familySwitchBtn}
                      activeOpacity={0.7}
                      onPress={() => setSwitcherVisible(true)}
                    >
                      <SwitchIcon width={16} height={16} />
                      <Text style={styles.familySwitchText}>Switch</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* ── Important for you ── */}
            {(hasProfileAllergenMatch || activeInsights.length > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Important for you</Text>
                  <Text style={styles.sectionSubtitle}>
                    {activeFamilyProfile
                      ? `Based on ${activeFamilyProfile.name.trim().split(/\s+/)[0]}'s health profile.`
                      : profile?.full_name
                        ? `Based on ${profile.full_name.trim().split(/\s+/)[0]}'s health profile.`
                        : 'Based on your health profile.'}
                  </Text>
                </View>

                {/* Allergen warning — only when product allergens match the active profile */}
                {hasProfileAllergenMatch && (() => {
                  const firstName = activeFamilyProfile
                    ? activeFamilyProfile.name.trim().split(/\s+/)[0]
                    : profile?.full_name?.trim().split(/\s+/)[0];
                  return (
                    <View style={styles.allergenCard}>
                      <View style={styles.allergenBadge}>
                        <Ionicons name="warning" size={11} color="#fff" />
                        <Text style={styles.allergenBadgeText}>Warning</Text>
                      </View>
                      <Text style={styles.allergenText}>
                        Contains: {matchedAllergens.join(', ')}. This may affect {firstName}'s health profile.
                      </Text>
                    </View>
                  );
                })()}

                {/* Dynamic insight panels — rendered in pairs */}
                {activeInsights.length > 0 && (
                  <View style={styles.impactPanelsRow}>
                    {activeInsights.map(({ def, result }) => {
                      const Icon = def.icons[result.iconKey];
                      return (
                        <View key={def.key} style={styles.impactPanel}>
                          <TouchableOpacity
                            style={styles.impactPanelInfo}
                            onPress={() => setInsightSheetDef({ def, result })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <InfoIcon width={16} height={16} />
                          </TouchableOpacity>
                          <Icon width={def.iconWidth} height={def.iconHeight} />
                          <View style={styles.impactLabelGroup}>
                            <Text style={styles.impactPanelLabel}>{def.label}</Text>
                            <View style={[styles.impactPill, { backgroundColor: result.color }]}>
                              <Text style={styles.impactPillText}>{result.label}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ── Flagged ingredients (Figma node 3263-6094) ── */}
            {categorised.harmful.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Flagged ingredients</Text>
                  <Text style={styles.sectionSubtitle}>
                    This product contains flagged ingredients.
                  </Text>
                </View>
                <View style={styles.ingCategoryCard}>
                  <Text style={styles.ingCategoryHeading}>
                    <Text style={styles.ingCount}>
                      {categorised.harmful.length}{' '}
                      {categorised.harmful.length === 1 ? 'ingredient' : 'ingredients'}
                    </Text>
                    <Text style={styles.ingMiddle}>
                      {' '}
                      {categorised.harmful.length === 1 ? 'is' : 'are'} considered{' '}
                    </Text>
                    <Text style={[styles.ingWord, { color: Colors.status.negative }]}>harmful</Text>
                  </Text>
                  <View style={{ gap: 4 }}>
                    {categorised.harmful.map((ing, i) => (
                      <View key={ing.id ?? i} style={styles.ingRow}>
                        <Ionicons name="close" size={24} color={Colors.status.negative} />
                        <Text style={styles.ingName} numberOfLines={2}>
                          {sentenceCase(ing.text)}
                        </Text>
                        <TouchableOpacity
                          style={styles.ingInfoContainer}
                          onPress={() => setFlaggedSheetIng(ing)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons
                            name="information-circle-outline"
                            size={16}
                            color={Colors.secondary}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Loading indicator while fetching OFF data */}
            {fetchingOff && (
              <View style={styles.fetchingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.fetchingText}>Loading nutritional data…</Text>
              </View>
            )}

            {/* Highlighted Nutritional Info (Figma node 3263-6129) */}
            {hasNutrition && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Highlighted Nutritional Info</Text>
                  <Text style={styles.sectionSubtitle}>Highlighted Nutritional Info</Text>
                </View>

                {/* Toggle controls (Figma node 3164-4264) */}
                <View style={styles.toggleControls}>
                  <View style={styles.toggleRowCompact}>
                    {servingModes.map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.overviewToggle,
                          effectiveServingMode === mode && styles.overviewToggleActive,
                        ]}
                        onPress={() => setServingMode(mode)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.overviewToggleText,
                            effectiveServingMode === mode && styles.overviewToggleTextActive,
                          ]}
                        >
                          {mode === 'serving'
                            ? servingLabel || 'Per Serving'
                            : 'Per 100g'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.toggleRowCompact}>
                    {(['value', 'dri'] as DriMode[]).map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.overviewToggle,
                          driMode === mode && styles.overviewToggleActive,
                        ]}
                        onPress={() => setDriMode(mode)}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.overviewToggleText,
                            driMode === mode && styles.overviewToggleTextActive,
                          ]}
                        >
                          {mode === 'value' ? 'Value' : 'DRI (%)'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.nutritionRows}>
                  {overviewNutrients.map(({ key, raw }) => {
                    if (!raw) return null;
                    const num = parseFloat(raw);
                    if (isNaN(num) || num < 0) return null;
                    const rating = getRating(key, num, nutrientThresholds);
                    const unit = NUTRIENT_UNITS[key];
                    const displayVal =
                      driMode === 'dri' ? fmtDri(raw, key) : fmtVal(raw, unit);
                    const IconComp = FoodIcons[key];
                    return (
                      <View key={key} style={styles.nutritionRow}>
                        <View style={styles.nutritionRowLeft}>
                          <View style={styles.nutritionIconBox}>
                            <IconComp width={32} height={32} />
                          </View>
                          <Text style={styles.nutritionName}>{NUTRIENT_LABELS[key]}</Text>
                        </View>
                        <View style={styles.nutritionRowRight}>
                          <Text style={styles.nutritionValue}>{displayVal}</Text>
                          <Text style={[styles.nutritionRating, { color: rating.color }]}>
                            {rating.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Empty state */}
            {!fetchingOff && !hasNutrition && allergenList.length === 0 && categorised.harmful.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={40} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>Limited product data</Text>
                <Text style={styles.emptyStateText}>
                  Nutritional information is not available for this product in the Open Food Facts
                  database.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            NUTRITION TAB
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'nutrition' && (
          <View style={styles.tabContent}>
            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>Nutritional Information</Text>
              </View>

              {/* Toggle controls — same compact style as overview */}
              <View style={styles.toggleControls}>
                <View style={styles.toggleRowCompact}>
                  {servingModes.map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.overviewToggle,
                        effectiveServingMode === mode && styles.overviewToggleActive,
                      ]}
                      onPress={() => setServingMode(mode)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.overviewToggleText,
                          effectiveServingMode === mode && styles.overviewToggleTextActive,
                        ]}
                      >
                        {mode === 'serving'
                          ? servingLabel || 'Per Serving'
                          : 'Per 100g'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.toggleRowCompact}>
                  {(['value', 'dri'] as DriMode[]).map((mode) => (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.overviewToggle,
                        driMode === mode && styles.overviewToggleActive,
                      ]}
                      onPress={() => setDriMode(mode)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.overviewToggleText,
                          driMode === mode && styles.overviewToggleTextActive,
                        ]}
                      >
                        {mode === 'value' ? 'Value' : 'DRI (%)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {fetchingOff ? (
                <View style={styles.fetchingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.fetchingText}>Loading nutritional data…</Text>
                </View>
              ) : hasNutrition ? (
                <View style={styles.nutritionRows}>
                  {nutrientRows.map(({ key, raw }) => {
                    if (!raw) return null;
                    const num = parseFloat(raw);
                    if (isNaN(num) || num < 0) return null;
                    const unit = NUTRIENT_UNITS[key];
                    const rating = getRating(key, num, nutrientThresholds);
                    const displayVal =
                      driMode === 'dri' ? fmtDri(raw, key) : fmtVal(raw, unit);
                    const IconComp = FoodIcons[key];
                    return (
                      <View key={key} style={styles.nutritionRow}>
                        <View style={styles.nutritionRowLeft}>
                          <View style={styles.nutritionIconBox}>
                            <IconComp width={32} height={32} />
                          </View>
                          <Text style={styles.nutritionName}>{NUTRIENT_LABELS[key]}</Text>
                        </View>
                        <View style={styles.nutritionRowRight}>
                          <Text style={styles.nutritionValue}>{displayVal}</Text>
                          <Text style={[styles.nutritionRating, { color: rating.color }]}>
                            {rating.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="bar-chart-outline" size={40} color={Colors.secondary} />
                  <Text style={styles.emptyStateTitle}>No nutritional data</Text>
                  <Text style={styles.emptyStateText}>
                    This product does not have nutritional information in the Open Food Facts
                    database.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            INGREDIENTS TAB — 3-card categorised layout (Figma node 3308-3929)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'ingredients' && (
          <View style={[styles.tabContent, { gap: Spacing.s }]}>
            {fetchingOff ? (
              <View style={styles.fetchingRow}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.fetchingText}>Loading ingredients…</Text>
              </View>
            ) : structuredIngredients.length > 0 ? (
              <>
                {/* ── Allergen warning (only when profile has matching allergies) ── */}
                {hasProfileAllergenMatch && (() => {
                  const firstName = activeFamilyProfile
                    ? activeFamilyProfile.name.trim().split(/\s+/)[0]
                    : profile?.full_name?.trim().split(/\s+/)[0];
                  return (
                    <View style={styles.allergenCard}>
                      <View style={styles.allergenBadge}>
                        <Ionicons name="warning" size={11} color="#fff" />
                        <Text style={styles.allergenBadgeText}>Warning</Text>
                      </View>
                      <Text style={styles.allergenText}>
                        Contains: {matchedAllergens.join(', ')}. This may affect {firstName}'s health profile.
                      </Text>
                    </View>
                  );
                })()}

                {/* ── Harmful card ── */}
                {categorised.harmful.length > 0 && (
                  <View style={styles.ingCategoryCard}>
                    {/* "2 ingredients" bold + " are considered " light + "harmful" bold red */}
                    <Text style={styles.ingCategoryHeading}>
                      <Text style={styles.ingCount}>
                        {categorised.harmful.length}{' '}{categorised.harmful.length === 1 ? 'ingredient' : 'ingredients'}
                      </Text>
                      <Text style={styles.ingMiddle}>
                        {' '}{categorised.harmful.length === 1 ? 'is' : 'are'} considered{' '}
                      </Text>
                      <Text style={[styles.ingWord, { color: Colors.status.negative }]}>harmful</Text>
                    </Text>
                    {/* Harmful rows: gap-2 between rows, gap-8 within row, with ⓘ info icon */}
                    <View style={{ gap: 2 }}>
                      {categorised.harmful.map((ing, i) => (
                        <View key={ing.id ?? i} style={styles.ingRow}>
                          <Ionicons name="close" size={24} color={Colors.status.negative} />
                          <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(ing.text)}</Text>
                          <TouchableOpacity
                            style={styles.ingInfoContainer}
                            onPress={() => setFlaggedSheetIng(ing)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <InfoIcon width={16} height={16} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Ok card ── */}
                {categorised.ok.length > 0 && (
                  <View style={styles.ingCategoryCard}>
                    <Text style={styles.ingCategoryHeading}>
                      <Text style={styles.ingCount}>
                        {categorised.ok.length}{' '}{categorised.ok.length === 1 ? 'ingredient' : 'ingredients'}
                      </Text>
                      <Text style={styles.ingMiddle}>
                        {' '}{categorised.ok.length === 1 ? 'is' : 'are'} considered{' '}
                      </Text>
                      <Text style={[styles.ingWord, { color: Extra.poorOrange }]}>ok</Text>
                    </Text>
                    {/* Ok rows: gap-2 between rows, gap-4 within row, with ⓘ info icon */}
                    <View style={{ gap: 2 }}>
                      {categorised.ok.map((ing, i) => (
                        <View key={ing.id ?? i} style={styles.ingRowSmall}>
                          <Ionicons name="checkmark" size={24} color={Extra.poorOrange} />
                          <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(ing.text)}</Text>
                          <TouchableOpacity
                            style={styles.ingInfoContainer}
                            onPress={() => setInfoSheetIng({ ing, category: 'ok' })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <InfoIcon width={16} height={16} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── Safe card ── */}
                {categorised.safe.length > 0 && (
                  <View style={styles.ingCategoryCard}>
                    <Text style={styles.ingCategoryHeading}>
                      <Text style={styles.ingCount}>
                        {categorised.safe.length}{' '}{categorised.safe.length === 1 ? 'ingredient' : 'ingredients'}
                      </Text>
                      <Text style={styles.ingMiddle}>
                        {' '}{categorised.safe.length === 1 ? 'is' : 'are'} considered{' '}
                      </Text>
                      <Text style={[styles.ingWord, { color: Extra.positiveGreen }]}>safe</Text>
                    </Text>
                    {/* Safe rows: gap-2 between rows, gap-4 within row, no ⓘ info icon */}
                    <View style={{ gap: 2 }}>
                      {categorised.safe.map((ing, i) => (
                        <View key={ing.id ?? i} style={styles.ingRowSmall}>
                          <Ionicons name="checkmark" size={24} color={Extra.positiveGreen} />
                          <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(ing.text)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            ) : ingredientsList.length > 0 ? (
              // Fallback when only plain text is available (history scans, no structured data)
              <View style={styles.ingCategoryCard}>
                <Text style={styles.ingCategoryHeading}>
                  <Text style={styles.ingCount}>
                    {ingredientsList.length}{' '}{ingredientsList.length === 1 ? 'ingredient' : 'ingredients'}
                  </Text>
                  <Text style={styles.ingMiddle}> listed</Text>
                </Text>
                <View style={{ gap: 2 }}>
                  {ingredientsList.map((name, i) => (
                    <View key={i} style={styles.ingRowSmall}>
                      <Ionicons name="checkmark" size={24} color={Extra.positiveGreen} />
                      <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(name)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="list-outline" size={40} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>No ingredients listed</Text>
                <Text style={styles.emptyStateText}>
                  Ingredient information is not available for this product.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            PRODUCT INFO TAB
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'info' && (
          <View style={styles.tabContent}>
            {/* Always show allergens if the product has any */}
            {allergenList.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Allergens</Text>
                  <Text style={styles.sectionSubtitle}>
                    Allergens listed for this product.
                  </Text>
                </View>
                <View style={styles.allergenCard}>
                  <View style={styles.allergenBadge}>
                    <Ionicons name="warning" size={11} color="#fff" />
                    <Text style={styles.allergenBadgeText}>Allergens</Text>
                  </View>
                  <Text style={styles.allergenText}>
                    Contains: {allergenList.join(', ')}.
                  </Text>
                </View>
              </View>
            )}

            {allergenList.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={40} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>No allergens listed</Text>
                <Text style={styles.emptyStateText}>
                  No allergen information is available for this product.
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            RECOMMENDED TAB (coming soon)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'recommended' && (
          <View style={styles.comingSoon}>
            <Ionicons name="construct-outline" size={40} color={Colors.secondary} />
            <Text style={styles.comingSoonTitle}>Coming soon</Text>
            <Text style={styles.comingSoonText}>
              This section is under construction and will be available in a future update.
            </Text>
          </View>
        )}
      </ScrollView>

      <FamilySwitcherSheet
        visible={switcherVisible}
        onClose={() => setSwitcherVisible(false)}
        userProfile={profile}
      />

      {/* ── Flagged ingredient detail sheet ── */}
      <FlaggedIngredientSheet
        ingredient={flaggedSheetIng}
        onClose={() => setFlaggedSheetIng(null)}
        conditions={activeConditions}
        allergies={activeAllergies}
      />

      {/* ── OK / Safe ingredient info sheet ── */}
      <IngredientInfoSheet
        ingredient={infoSheetIng?.ing ?? null}
        category={infoSheetIng?.category ?? 'ok'}
        onClose={() => setInfoSheetIng(null)}
      />

      {/* ── Insight detail sheet ── */}
      <InsightDetailSheet
        insight={insightSheetDef}
        onClose={() => setInsightSheetDef(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Back button (Figma node 3263-6137 — plain icon, no circle bg)
  backRow: {
    paddingHorizontal: Spacing.s,
    paddingTop: 6,
    paddingBottom: 2,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.m,
    paddingBottom: 56,
    gap: Spacing.m,
  },

  // Product header
  productHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 24,
  },
  productName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 30,
    letterSpacing: -0.48,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
    lineHeight: 20,
  },
  imageCard: {
    width: 106,
    height: 86,
    borderRadius: Radius.m,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePlaceholder: {
    backgroundColor: Colors.surface.tertiary,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },

  // Nutri-score — pixel-perfect per Figma node 3263-5506
  nutriscoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutriscoreLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  nutriscoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    lineHeight: 17,
  },
  nutriscorebadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  nutriscorebadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
    lineHeight: 17,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  // Rating stack: 30px container, 4px gaps — Figma node 4136-5728
  nutriscoreScale: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 36,
  },
  // Active circle: 24×36, full colour, no border
  nutriscoreCircleActive: {
    width: 24,
    height: 36,
    borderRadius: 999,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Inactive circle: 24×30, 2px white border, faded
  nutriscoreCircleInactive: {
    width: 24,
    height: 30,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    opacity: 0.2,
  },
  nutriscoreCircleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    lineHeight: 20,
  },
  nutriscoreCircleTextActive: {
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Tab bar
  tabBarWrapper: {
    position: 'relative',
    marginTop: -4,
  },
  tabBar: {
  },
  tabBarContent: {
    gap: 0,
    paddingVertical: 2,
    paddingRight: 20,
  },
  tabFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 12,
  },
  tabFadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
  },
  tab: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: Colors.surface.tertiary,
    borderColor: Extra.strokeSecondary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
    lineHeight: 20,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  // Tab content shared
  tabContent: {
    gap: Spacing.l,
  },
  section: {
    gap: Spacing.s,
  },
  sectionHeading: {
    gap: Spacing.xxs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },

  // ── Selected Family Member section (Figma node 3263-6080) ────────────────
  familySection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s,
    paddingBottom: Spacing.s,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(170,212,205,0.5)',
  },
  familyAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  familyAvatarImage: {
    width: '100%',
    height: '100%',
  },
  familyAvatarInitials: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },
  familyInfo: {
    flex: 1,
    gap: Spacing.xs,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  familyNameTags: {
    gap: 4,
  },
  familyName: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  familyTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  familyTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#B8DFD6',
  },
  familyTagText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 16,
    textAlign: 'center',
  },
  familySwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  familySwitchText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 20,
  },

  // OFF fetch loading
  fetchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.s,
  },
  fetchingText: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },

  // ── Impact panels (Important for you section) ────────────────────────────
  impactPanelsRow: {
    flexDirection: 'row',
    gap: Spacing.s,
  },
  impactPanel: {
    flex: 1,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    padding: Spacing.s,
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#aad4cd',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  impactPanelInfo: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  impactLabelGroup: {
    alignItems: 'center',
    gap: Spacing.xxs,   // 4px between label and pill
  },
  impactPanelLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    textAlign: 'center',
    lineHeight: 20,
  },
  impactPill: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: 999,
  },
  // Pill text: always white on a solid colour background (per Figma node 3122-2520)
  impactPillText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
    lineHeight: 17,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Allergen
  allergenCard: {
    backgroundColor: 'rgba(255,63,66,0.08)',
    borderWidth: 2,
    borderColor: Colors.status.negative,
    borderRadius: 16,
    padding: Spacing.s,
    gap: Spacing.xs,
  },
  allergenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.status.negative,
    borderRadius: 999,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  allergenBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
  },
  allergenText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 18,
  },

  // Nutrition rows (per Figma Macro Stack node 3263-5386)
  // EACH ROW is individually styled — no shared card wrapper
  nutritionRows: {
    gap: Spacing.xxs,  // 4px between rows, per Figma
  },
  nutritionRow: {
    // Individual row styling per Figma
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,            // 8px, NOT 16
    borderWidth: 1,
    borderColor: '#aad4cd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.xs,           // 8px
    paddingRight: Spacing.s,           // 16px
    paddingVertical: Spacing.xs,       // 8px
    gap: Spacing.s,                    // 16px between icon+label and value
  },
  nutritionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  nutritionIconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  nutritionName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 20,
    flex: 1,
  },
  nutritionRowRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.s,
    flexShrink: 0,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
  nutritionRating: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
    width: 63,               // fixed width per Figma node 3164-4290
    lineHeight: 17,          // 1.2 × 14px
  },

  // Nutrition tab toggles
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Extra.strokeSecondary,
    backgroundColor: Colors.surface.tertiary,
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
  },
  toggleTextActive: {
    color: '#fff',
  },

  // Overview toggle controls (Figma node 3164-4264)
  toggleControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toggleRowCompact: {
    flexDirection: 'row',
  },
  overviewToggle: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  overviewToggleActive: {
    backgroundColor: Colors.surface.tertiary,
    borderColor: Extra.strokeSecondary,
  },
  overviewToggleText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
    textAlign: 'center',
  },
  overviewToggleTextActive: {
    color: Colors.primary,
  },

  // Ingredients tab — categorised cards (Figma node 3308-3929)
  ingCategoryCard: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingHorizontal: 16,
    paddingVertical: 24,
    gap: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  ingCategoryHeading: {
    flexWrap: 'wrap',
  },
  ingCount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  ingMiddle: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  ingWord: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
  },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 12,
  },
  // ok / safe rows — 4px gap between elements (Figma node 3263-3941)
  ingRowSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
  },
  ingName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    lineHeight: 20,
  },
  ingInfoContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Empty / coming soon
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  comingSoon: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
});
