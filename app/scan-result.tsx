import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  Animated,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { getCachedProfile, fetchAndCacheProfile } from '@/lib/profileCache';
import { cacheProduct } from '@/lib/productCache';
import type { UserProfile, FamilyProfile, DietaryTag, NutrientWatchlistEntry } from '@/lib/types';
import { useActiveFamily } from '@/lib/activeFamilyContext';
import { FamilySwitcherSheet } from '@/components/FamilySwitcherSheet';
import { TickIcon, MenuFlaggedIcon } from '@/components/MenuIcons';
import { NoImagePlaceholder } from '@/components/NoImagePlaceholder';
import {
  FlaggedIngredientSheet,
  IngredientInfoSheet,
  InsightDetailSheet,
  type OffIngredient,
  type FlaggedIngredient,
} from '@/components/ScanResultSheets';
import { ServingToggle, WeightStepper, type ServingMode, type DriMode } from '@/components/NutritionControls';
import { useFadeIn } from '@/lib/useFadeIn';
import { usePageTransition } from '@/lib/usePageTransition';
import {
  parseIngredientsText,
  parseIngredientsWithHierarchy,
  parseIngredientTree,
  cleanTreeToken,
  translateToEnglish,
  cleanIngredientName,
  matchesFlaggedIngredient,
  normaliseCategoryTag,
  isNegatedInContext,
} from '@/lib/ingredientsCleaner';
import type { IngredientNode } from '@/lib/ingredientsCleaner';
import { safeBack } from '@/lib/safeBack';
import { ALLERGY_KEYWORDS, type AllergyEntry } from '@/lib/allergenKeywords';
import { getAdditiveSeverity, computeAdditiveSeverity, type AdditiveEntry } from '@/constants/additiveSeverity';
import { getSubstitutes, type FlagReason } from '@/lib/ingredientSubstitutes';
import {
  type NutrientKey, type Threshold, DRI, NUTRIENT_LABELS, NUTRIENT_UNITS,
  DEFAULT_THRESHOLDS, CONDITION_OVERRIDES, buildThresholds, getRating, fmtVal, fmtDri,
} from '@/lib/nutrientRatings';
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
// │                         │ Low-Carb / Keto, Weight Loss, Diabetic,         │
// │                         │ Pre-diabetes, Insulin Resistance                │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ sodium                  │ Hypertension, Heart Disease, Kidney Disease,    │
// │                         │ Lupus, Metabolic Syndrome, Coeliac Disease      │
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
// │                         │ Metabolic Syndrome, NAFLD                       │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ inflammatoryFat         │ Rheumatoid Arthritis, Multiple Sclerosis,       │
// │                         │ Lupus, Eczema / Psoriasis, Endometriosis, Gout  │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ digestiveLoad           │ GERD / Acid Reflux, IBS, Chron's Disease,      │
// │                         │ Ulcerative Colitis, Leaky Gut Syndrome,         │
// │                         │ Diverticular Disease, Coeliac Disease           │
// ├─────────────────────────┼──────────────────────────────────────────────────┤
// │ carbLoad                │ Low-Carb / Keto, Diabetic, Pre-diabetes,        │
// │                         │ Insulin Resistance                              │
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
  /** Severity-weighted additive data for condition-aware insight */
  additiveHighCount?: number;
  additiveModerateCount?: number;
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
      'Pre-diabetes', 'Insulin Resistance',
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
      if (score > 5)  return { label: 'Moderate',  color: Extra.poorOrange,       iconKey: 'moderate' };
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
      'Coeliac Disease', 'Chronic Kidney Disease',
    ],
    compute: (d) => {
      const salt = d.salt ? parseFloat(d.salt) : NaN;
      if (isNaN(salt)) return null;
      if (salt > 3)   return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (salt > 1.5) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (salt > 0.3) return { label: 'Moderate',  color: Extra.poorOrange,       iconKey: 'moderate' };
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
      'NAFLD',
    ],
    compute: (d) => {
      const kcal = d.energyKcal ? parseFloat(d.energyKcal) : NaN;
      if (isNaN(kcal)) return null;
      if (kcal > 400) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (kcal > 250) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (kcal > 100) return { label: 'Moderate',  color: Extra.poorOrange,       iconKey: 'moderate' };
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
      'Diverticular Disease', 'Coeliac Disease',
    ],
    compute: (d) => {
      // Combined proxy: fat + fiber stress on the gut
      const fat = d.fat ? parseFloat(d.fat) : NaN;
      const fiber = d.fiber ? parseFloat(d.fiber) : 0;
      if (isNaN(fat)) return null;
      const score = fat + fiber;
      if (score > 15) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (score > 8)  return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (score > 4)  return { label: 'Moderate',  color: Extra.poorOrange,       iconKey: 'moderate' };
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
      'Pre-diabetes', 'Insulin Resistance',
    ],
    compute: (d) => {
      const carbs = d.carbs ? parseFloat(d.carbs) : NaN;
      if (isNaN(carbs)) return null;
      if (carbs > 30) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (carbs > 15) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (carbs > 5)  return { label: 'Moderate',  color: Extra.poorOrange,       iconKey: 'moderate' };
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
      const high = d.additiveHighCount ?? 0;
      const moderate = d.additiveModerateCount ?? 0;
      // Severity-based: high-severity additives (Southampton Six etc.) drive the rating
      if (high >= 2) return { label: 'Very High', color: Colors.status.negative, iconKey: 'veryHigh' };
      if (high >= 1) return { label: 'High',      color: Extra.poorOrange,       iconKey: 'high' };
      if (moderate >= 2) return { label: 'High',   color: Extra.poorOrange,       iconKey: 'high' };
      if (moderate >= 1) return { label: 'Moderate', color: Extra.poorOrange,     iconKey: 'moderate' };
      // Fall back to generic count for non-condition-specific additives
      if (count >= 5) return { label: 'Moderate',  color: Extra.poorOrange,       iconKey: 'moderate' };
      if (count >= 1) return { label: 'Low',       color: Extra.positiveGreen,    iconKey: 'low' };
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

  // ── Chronic Kidney Disease: sodium & protein restriction ──
  'Chronic Kidney Disease': { sodium: 10, protein: 8, saturatedFat: 5 },

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

  // ── New health conditions ──
  'Pre-diabetes':        { glycemic: 10, sugar: 9, carbLoad: 8 },
  'Insulin Resistance':  { glycemic: 10, sugar: 9, carbLoad: 8 },
  'NAFLD':               { saturatedFat: 10, sugar: 9, calorie: 8 },
  'Coeliac Disease':     { sodium: 9, digestiveLoad: 8, additives: 6 },
  'Diverticular Disease':{ digestiveLoad: 10, fiber: 9 },
  'Endometriosis':       { inflammatoryFat: 10, sugar: 8, saturatedFat: 7 },
  'Gout':                { sugar: 10, inflammatoryFat: 8 },
  'Hypothyroidism':      { sugar: 8 },
  "Hashimoto's Thyroiditis": { sugar: 8 },

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
  defs: InsightDef[] = INSIGHT_DEFS,
): { def: InsightDef; result: ImpactResult }[] {
  const tags = [...conditions, ...allergies, ...preferences];
  const tagSet = new Set(tags);
  const results: { def: InsightDef; result: ImpactResult; weight: number }[] = [];

  for (const def of defs) {
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
  highRed: '#ff3f42',
  strokeSecondary: '#aad4cd',
  flaggedOrange: '#ff8736',
  flaggedOrangeBadge: '#ff7824',
  flaggedOrangeBg: 'rgba(255,135,54,0.1)',
  flaggedOrangeText: '#b94a00',
};

// ── Micronutrient severity thresholds (per 100 g) ──────────────────────────
// 4 cut-points → 5 levels matching the traffic-light scale:
//   Amazing (#009a1f) · Good (#b8d828) · OK (#ffc72d) · Poor (#ff8736) · Bad (#ff7779)
// For "limit": lower value = better.  For "boost": higher value = better.
const MICRO_THRESHOLDS: Record<string, [number, number, number, number]> = {
  // ─── Minerals (mg) ───                   [ok,   good,  poor,  bad]
  'sodium_100g':      [200,  400,  800,  1200],
  'potassium_100g':   [260,  525,  1050, 1750],
  'phosphorus_100g':  [75,   150,  300,  500],
  'calcium_100g':     [97,   195,  390,  650],
  'iron_100g':        [1.35, 2.7,  5.4,  9],
  'magnesium_100g':   [24,   48,   96,   160],
  'zinc_100g':        [0.75, 1.5,  3,    5],
  'copper_100g':      [0.07, 0.15, 0.3,  0.5],
  'manganese_100g':   [0.15, 0.3,  0.6,  1],
  'selenium_100g':    [4,    8.25, 16.5, 27.5],
  // ─── Lipids ───
  'cholesterol_100g': [20,   45,   90,   150],
  'trans-fat_100g':   [0.05, 0.1,  0.3,  0.6],
  'omega-3-fat_100g': [0.15, 0.3,  0.6,  1.0],
  // ─── Vitamins ───
  'vitamin-a_100g':   [60,   120,  240,  400],
  'vitamin-c_100g':   [6.75, 13.5, 27,   45],
  'vitamin-d_100g':   [0.75, 1.5,  3,    5],
  'vitamin-e_100g':   [0.9,  1.8,  3.6,  6],
  'vitamin-k_100g':   [5.6,  11.25,22.5, 37.5],
  'vitamin-b9_100g':  [15,   30,   60,   100],
};

// Traffic-light colours (same scale as nutri-score)
const SEV_AMAZING = Extra.positiveGreen; // #009a1f
const SEV_GOOD    = Extra.goodLime;      // #b8d828
const SEV_OK      = Extra.poorOrange;    // #ff8736 — orange (yellow #ffc72d fails accessibility on light bg)
const SEV_POOR    = Extra.poorOrange;    // #ff8736
const SEV_BAD     = Extra.highRed;       // #ff7779

/** Return a traffic-light colour for a micronutrient value. */
function getNutrientSeverityColor(
  offKey: string,
  value: number,
  direction: 'limit' | 'boost',
): string {
  return getNutrientSeverity(offKey, value, direction).color;
}

/** Amount-level rating keys (describes how much is in the product). */
type AmountRating = 'low' | 'moderate' | 'high' | 'veryHigh';

/** Return traffic-light colour AND an amount-level rating for a micronutrient. */
function getNutrientSeverity(
  offKey: string,
  value: number,
  direction: 'limit' | 'boost',
): { color: string; rating: AmountRating } {
  const th = MICRO_THRESHOLDS[offKey];
  if (!th) {
    // No thresholds → assume moderate
    return {
      color: direction === 'limit' ? SEV_POOR : SEV_GOOD,
      rating: 'moderate',
    };
  }
  const [a, b, c, d] = th;

  // Determine the amount level (independent of direction)
  let rating: AmountRating;
  if (value < a)      rating = 'low';
  else if (value < b) rating = 'low';
  else if (value < c) rating = 'moderate';
  else if (value < d) rating = 'high';
  else                rating = 'veryHigh';

  // Colour depends on direction: for "limit" low is good; for "boost" high is good
  let color: string;
  if (direction === 'limit') {
    if (value < a)      color = SEV_AMAZING;
    else if (value < b) color = SEV_GOOD;
    else if (value < c) color = SEV_OK;
    else                color = SEV_BAD;   // high / veryHigh → danger red
  } else {
    if (value >= d)      color = SEV_AMAZING;
    else if (value >= c) color = SEV_GOOD;
    else if (value >= b) color = SEV_OK;
    else                 color = SEV_BAD;  // low → danger red (matches "High" for limit)
  }

  return { color, rating };
}

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
const DIETARY_LABELS: Record<string, string> = {
  diabetic: 'Diabetic',
  keto: 'Keto',
  'gluten-free': 'Gluten-free',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  lactose: 'Lactose-free',
  pescatarian: 'Pescatarian',
  kosher: 'Kosher',
  childFriendly: 'Child-Friendly / Additive-Free',
  cleanEating: 'Clean Eating',
  dairyFree: 'Dairy-Free',
  fodmap: 'FODMAP Diet',
  highProtein: 'High-Protein / Fitness',
  paleo: 'Paleo',
  plantBased: 'Plant-Based',
  postBariatric: 'Post-Bariatric Surgery',
  pregnancy: 'Pregnancy-safe Diet',
  sustainable: 'Sustainable / Eco',
  weightLoss: 'Weight Loss',
  whole30: 'Whole30',
};


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

// OffIngredient, FlaggedIngredient imported from @/components/ScanResultSheets

type IngredientCategory = {
  harmful: FlaggedIngredient[];
  userFlagged: FlaggedIngredient[];
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
  flagReasonMap?: Record<string, { category: string; text: string }>,
  flaggedNameToIdMap?: Record<string, string>,
  productName?: string,     // product name for product-level matching
  categoriesTags?: string[],// OFF category tags for product-level matching
  userConditions?: string[],// health conditions for additive severity highlighting
): IngredientCategory {
  const harmful: FlaggedIngredient[] = [];
  const userFlagged: FlaggedIngredient[] = [];
  const ok: OffIngredient[] = [];
  const safe: OffIngredient[] = [];
  const allergenSet = new Set(allergenTags.map((a) => a.toLowerCase()));
  const flaggedSet = new Set(flaggedNames.map((n) => n.toLowerCase()));

  // ── Product-level matching ─────────────────────────────────────────────────
  // Check the product name and OFF categories against flagged ingredients.
  // This catches cases like flagging "bread" and scanning a loaf of bread,
  // where the word "bread" appears in the product name or categories but
  // NOT in the ingredient list (which would be "wheat flour, water, yeast...").
  const productMatchedNames = new Set<string>();

  if (flaggedNames.length > 0) {
    // Check product name
    if (productName) {
      const nameMatch = matchesFlaggedIngredient(productName, flaggedNames);
      if (nameMatch) {
        const lc = nameMatch.toLowerCase();
        productMatchedNames.add(lc);
        let personalReason: { category: string; text: string } | undefined;
        if (flagReasonMap && flaggedNameToIdMap) {
          const uuid = flaggedNameToIdMap[lc];
          if (uuid && flagReasonMap[uuid]) personalReason = flagReasonMap[uuid];
        }
        userFlagged.push({
          text: nameMatch.charAt(0).toUpperCase() + nameMatch.slice(1),
          flagReason: 'user_flagged',
          personalReason,
          matchSource: 'product-name',
        });
      }
    }

    // Check OFF categories
    if (categoriesTags && categoriesTags.length > 0) {
      const normCategories = categoriesTags.map(normaliseCategoryTag);
      for (const cat of normCategories) {
        const catMatch = matchesFlaggedIngredient(cat, flaggedNames);
        if (catMatch) {
          const lc = catMatch.toLowerCase();
          if (productMatchedNames.has(lc)) continue; // already flagged via product name
          productMatchedNames.add(lc);
          let personalReason: { category: string; text: string } | undefined;
          if (flagReasonMap && flaggedNameToIdMap) {
            const uuid = flaggedNameToIdMap[lc];
            if (uuid && flagReasonMap[uuid]) personalReason = flagReasonMap[uuid];
          }
          userFlagged.push({
            text: catMatch.charAt(0).toUpperCase() + catMatch.slice(1),
            flagReason: 'user_flagged',
            personalReason,
            matchSource: 'category',
          });
        }
      }
    }
  }

  for (const ing of ingredients) {
    const ingId = (ing.id ?? '').toLowerCase();
    const ingText = ing.text.toLowerCase();

    // Skip allergen-matched ingredients — allergens are handled separately
    // by the dedicated Allergy Warning card, not as flagged ingredients.
    if (ingId && allergenSet.has(ingId)) { safe.push(ing); continue; }

    let reason: FlagReason | null = null;
    let matchedFlaggedName: string | null = null;
    // Dietary conflicts
    if (userPrefs.includes('vegan') && ing.vegan === 'no') reason = 'vegan';
    if (!reason && userPrefs.includes('vegetarian') && ing.vegetarian === 'no') reason = 'vegetarian';
    // User-flagged ingredients — match using strict rules to avoid false
    // positives on compound/parent ingredients.
    //
    // Strategies (in priority order):
    // 1. Exact match: "chocolate" === "chocolate"
    // 2. Starts-with: "soy lecithin" starts with "soy" ✓ (catches prefix compounds)
    // 3. Ends-with:   "brown sugar" ends with "sugar" ✓ (catches modifier prefixes)
    //    Combined, these avoid mid-word matches:
    //    "milk chocolate with sweetener" — "chocolate" is neither at start nor end ✗
    // 4. OFF id match: compare en:chocolate against ing.id
    if (!reason && flaggedSet.size > 0) {
      for (const f of flaggedSet) {
        // Skip if the flagged term appears in a negated context
        // e.g. "sugar-free sweetener" should NOT flag for "sugar"
        if (isNegatedInContext(ing.text, f)) continue;

        // 1. Exact text match
        if (ingText === f) { reason = 'user_flagged'; matchedFlaggedName = f; break; }

        const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 2. Starts-with: flagged name at the beginning, followed by space or end
        //    e.g. "soy" matches "soy lecithin", "corn" matches "corn syrup"
        if (new RegExp(`^${escaped}s?(?:\\s|$)`).test(ingText)) {
          reason = 'user_flagged';
          matchedFlaggedName = f;
          break;
        }
        // 3. Ends-with: flagged name at the end, preceded by space or start
        //    e.g. "sugar" matches "brown sugar", "oil" matches "palm oil"
        if (new RegExp(`(?:^|\\s)${escaped}s?$`).test(ingText)) {
          reason = 'user_flagged';
          matchedFlaggedName = f;
          break;
        }
        // 4. OFF id match — convert flagged name to OFF id format and compare
        if (ingId) {
          const flaggedAsId = 'en:' + f.replace(/\s+/g, '-');
          if (ingId === flaggedAsId) {
            reason = 'user_flagged';
            matchedFlaggedName = f;
            break;
          }
        }
      }
    }

    if (reason) {
      // Attach personal flag reason if available
      let personalReason: { category: string; text: string } | undefined;
      if (reason === 'user_flagged' && matchedFlaggedName && flagReasonMap && flaggedNameToIdMap) {
        const ingredientUuid = flaggedNameToIdMap[matchedFlaggedName];
        if (ingredientUuid && flagReasonMap[ingredientUuid]) {
          personalReason = flagReasonMap[ingredientUuid];
        }
      }
      const entry: FlaggedIngredient = { ...ing, flagReason: reason, personalReason, matchSource: 'ingredient' };
      if (reason === 'user_flagged') {
        userFlagged.push(entry);
      } else {
        harmful.push(entry);
      }
      continue;
    }

    // E-number food additive (en:e followed by digits)
    if (/^en:e\d+/i.test(ingId)) {
      // Check if this additive is flagged for the user's health conditions
      const additiveSev = userConditions?.length
        ? getAdditiveSeverity(ingId, userConditions)
        : null;
      if (additiveSev && (additiveSev.severity === 'high' || additiveSev.severity === 'moderate')) {
        harmful.push({
          ...ing,
          flagReason: 'additive_concern',
          additiveSeverity: additiveSev,
        });
        continue;
      }
      ok.push(ing);
      continue;
    }

    safe.push(ing);
  }
  // Deduplicate by ingredient name (same ingredient can match via multiple sources)
  const dedup = <T extends { text: string }>(arr: T[]): T[] => {
    const seen = new Set<string>();
    return arr.filter((item) => {
      const key = item.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  return { harmful: dedup(harmful), userFlagged: dedup(userFlagged), ok, safe };
}

type ImpactKey = 'low' | 'moderate' | 'high' | 'veryHigh';
type ImpactResult = { label: string; color: string; iconKey: ImpactKey };

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ScanResultScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t } = useTranslation('scan');
  const { t: tc } = useTranslation('common');
  const { t: tpo } = useTranslation('profileOptions');

  // Page-level entrance/exit animation
  const { opacity: pageOpacity, translateX: pageTranslateX, animateExit: pageExit } = usePageTransition();

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
    traces: string;
    categoriesTags: string;
    ingredientsJson: string;
    offLang: string;
    offRegion: string;
  }>();

  const { activeFamilyId } = useActiveFamily();

  // ── Translated constants (derived from i18n) ──────────────────────────────
  const NUTRISCORE_LABELS_T: Record<string, string> = useMemo(() => ({
    a: tc('nutriscoreLabels.a'), b: tc('nutriscoreLabels.b'), c: tc('nutriscoreLabels.c'),
    d: tc('nutriscoreLabels.d'), e: tc('nutriscoreLabels.e'),
  }), [tc]);

  const TABS_T: { key: Tab; label: string }[] = useMemo(() => [
    { key: 'overview', label: t('tab.overview') },
    { key: 'nutrition', label: t('tab.nutrition') },
    { key: 'ingredients', label: t('tab.ingredients') },
    { key: 'recommended', label: t('tab.recommended') },
    { key: 'info', label: t('tab.info') },
  ], [t]);

  const DIETARY_LABELS_T: Record<string, string> = useMemo(() => ({
    // Legacy DietaryTag keys (from profile.dietary_preferences)
    diabetic: tpo('dietaryTags.diabetic'),
    keto: tpo('dietaryTags.keto'),
    'gluten-free': tpo('dietaryTags.gluten-free'),
    vegan: tpo('dietaryTags.vegan'),
    vegetarian: tpo('dietaryTags.vegetarian'),
    lactose: tpo('dietaryTags.lactose'),
    pescatarian: tpo('dietaryTags.pescatarian'),
    kosher: tpo('dietaryTags.kosher'),
    // Newer DietaryPreferenceKey keys
    childFriendly: tpo('dietaryPreferences.childFriendly'),
    cleanEating: tpo('dietaryPreferences.cleanEating'),
    dairyFree: tpo('dietaryPreferences.dairyFree'),
    fodmap: tpo('dietaryPreferences.fodmap'),
    highProtein: tpo('dietaryPreferences.highProtein'),
    paleo: tpo('dietaryPreferences.paleo'),
    plantBased: tpo('dietaryPreferences.plantBased'),
    postBariatric: tpo('dietaryPreferences.postBariatric'),
    pregnancy: tpo('dietaryPreferences.pregnancy'),
    sustainable: tpo('dietaryPreferences.sustainable'),
    weightLoss: tpo('dietaryPreferences.weightLoss'),
    whole30: tpo('dietaryPreferences.whole30'),
  }), [tpo]);

  const NUTRIENT_LABELS_T: Record<NutrientKey, string> = useMemo(() => ({
    energyKcal: t('nutrientLabels.energyKcal'),
    fat: t('nutrientLabels.fat'),
    saturatedFat: t('nutrientLabels.saturatedFat'),
    carbs: t('nutrientLabels.carbs'),
    sugars: t('nutrientLabels.sugars'),
    fiber: t('nutrientLabels.fiber'),
    proteins: t('nutrientLabels.proteins'),
    netCarbs: t('nutrientLabels.netCarbs'),
    salt: t('nutrientLabels.salt'),
  }), [t]);

  // Build translated INSIGHT_DEFS — only labels and compute return labels change
  const INSIGHT_DEFS_T: InsightDef[] = useMemo(() => {
    const tImpact = (d: NutrientData, compute: (d: NutrientData) => ImpactResult | null): ImpactResult | null => {
      const result = compute(d);
      if (!result) return null;
      const labelMap: Record<string, string> = {
        'Very High': t('impact.veryHigh'),
        'High': t('impact.high'),
        'Moderate': t('impact.moderate'),
        'Low': t('impact.low'),
      };
      return { ...result, label: labelMap[result.label] ?? result.label };
    };

    return INSIGHT_DEFS.map((def) => ({
      ...def,
      label: t(`insight.${def.key}`, def.label),
      compute: (d: NutrientData) => tImpact(d, def.compute),
    }));
  }, [t]);

  // Translated wrapper for getRating — maps English labels to translated ones
  const getRatingT = (key: NutrientKey, value: number, thresholds: Record<NutrientKey, Threshold>) => {
    const result = getRating(key, value, thresholds);
    const labelMap: Record<string, string> = {
      'Low': t('nutrientRating.low'),
      'Moderate': t('nutrientRating.moderate'),
      'High': t('nutrientRating.high'),
      'Good': t('nutrientRating.good'),
    };
    return { ...result, label: labelMap[result.label] ?? result.label };
  };

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [ingredientSubTab, setIngredientSubTab] = useState<'fullList' | 'insightGroups'>('fullList');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [tabScrollX, setTabScrollX] = useState(0);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [flaggedNames, setFlaggedNames] = useState<string[]>([]);
  const [flagReasonMap, setFlagReasonMap] = useState<Record<string, { category: string; text: string }>>({});
  const [flaggedNameToIdMap, setFlaggedNameToIdMap] = useState<Record<string, string>>({});
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const [activeFamilyProfile, setActiveFamilyProfile] = useState<FamilyProfile | null>(null);
  const [micronutrients, setMicronutrients] = useState<Record<string, number | null>>({});
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
    traces: string;
    categoriesTags: string;
    ingredientsJson: string;
    offLang: string;
  };
  const [fetched, setFetched] = useState<Partial<OffPayload> | null>(null);
  const [fetchingOff, setFetchingOff] = useState(false);

  // Animated progress bar — simulates progress during OFF fetch, snaps to 100% on completion.
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressPercent = useRef(0);
  const [progressDisplay, setProgressDisplay] = useState(0);

  useEffect(() => {
    if (fetchingOff) {
      // Reset and animate: fast to 40%, slow to 75%, crawl to 90%
      progressAnim.setValue(0);
      setProgressDisplay(0);
      progressPercent.current = 0;
      const listener = progressAnim.addListener(({ value }) => {
        const pct = Math.round(value);
        if (pct !== progressPercent.current) {
          progressPercent.current = pct;
          setProgressDisplay(pct);
        }
      });
      Animated.sequence([
        Animated.timing(progressAnim, { toValue: 40, duration: 800, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 70, duration: 2500, useNativeDriver: false }),
        Animated.timing(progressAnim, { toValue: 90, duration: 5000, useNativeDriver: false }),
      ]).start();
      return () => progressAnim.removeListener(listener);
    } else if (progressPercent.current > 0) {
      // Snap to 100% when fetch completes
      progressAnim.stopAnimation(() => {
        Animated.timing(progressAnim, { toValue: 100, duration: 300, useNativeDriver: false }).start();
        setProgressDisplay(100);
      });
    }
  }, [fetchingOff]);

  // Nutrition tab toggles
  const [servingMode, setServingMode] = useState<ServingMode>('100g');
  const [driMode, setDriMode] = useState<DriMode>('value');
  const [customWeight, setCustomWeight] = useState(100);
  const [editingWeight, setEditingWeight] = useState(false);

  // Measure the widest rating label at the user's current font scale.
  // An invisible "Moderate" is rendered off-screen; its measured width becomes
  // the consistent minWidth for every rating column (nutrition + nutrient watch).
  const [ratingColWidth, setRatingColWidth] = useState<number | undefined>(undefined);

  // Load profile + flagged ingredients — use in-memory cache when available
  // (populated by the dashboard), falling back to a network fetch.
  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    // Try cache first — renders instantly if dashboard already loaded
    const hit = getCachedProfile();
    if (hit && hit.profile.id === userId) {
      setProfile(hit.profile);
      setFlaggedNames(hit.flaggedNames);
      setFlaggedNameToIdMap(hit.flaggedNameToIdMap);
      setFlagReasonMap(hit.flagReasonMap);
      return; // skip network
    }

    // Cache miss — fetch from Supabase and populate cache
    fetchAndCacheProfile(userId).then((result) => {
      if (!result) return;
      setProfile(result.profile);
      setFlaggedNames(result.flaggedNames);
      setFlaggedNameToIdMap(result.flaggedNameToIdMap);
      setFlagReasonMap(result.flagReasonMap);
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

  // Fetch from OFF only when macros (carbs etc.) weren't passed via route params.
  // The scanner no longer blocks on OFF — it navigates instantly and lets this
  // page handle the fetch progressively. Cached/offline products already have
  // macros so this only fires for genuinely new products, history, and food-search.
  const needsOffFetch = !p.carbs && !!p.barcode;
  const offRegion = p.offRegion || 'world';

  useEffect(() => {
    if (!needsOffFetch) return;
    setFetchingOff(true);
    fetch(`https://${offRegion}.openfoodfacts.org/api/v0/product/${p.barcode}.json`, {
      headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 1 && data.product) {
          const op = data.product;
          const n = op.nutriments ?? {};
          const allergenTags: string[] = op.allergens_tags ?? [];
          const tracesTags: string[] = op.traces_tags ?? [];
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
            traces: tracesTags.join(','),
            categoriesTags: (op.categories_tags ?? []).join(','),
            ingredientsJson: op.ingredients ? JSON.stringify(op.ingredients) : '',
            offLang: op.ingredients_text_en ? 'en' : (op.lang || op.lc || 'en'),
          });
          // Extract micronutrient data for watchlist feature
          setMicronutrients({
            'potassium_100g': n.potassium_100g ?? null,
            'calcium_100g': n.calcium_100g ?? null,
            'iron_100g': n.iron_100g ?? null,
            'magnesium_100g': n.magnesium_100g ?? null,
            'zinc_100g': n.zinc_100g ?? null,
            'phosphorus_100g': n.phosphorus_100g ?? null,
            'cholesterol_100g': n.cholesterol_100g ?? null,
            'trans-fat_100g': n['trans-fat_100g'] ?? null,
            'vitamin-a_100g': n['vitamin-a_100g'] ?? null,
            'vitamin-c_100g': n['vitamin-c_100g'] ?? null,
            'vitamin-d_100g': n['vitamin-d_100g'] ?? null,
            'vitamin-e_100g': n['vitamin-e_100g'] ?? null,
            'vitamin-k_100g': n['vitamin-k_100g'] ?? null,
            'copper_100g': n.copper_100g ?? null,
            'manganese_100g': n.manganese_100g ?? null,
            'selenium_100g': n.selenium_100g ?? null,
            'vitamin-b9_100g': n['vitamin-b9_100g'] ?? null,
            'omega-3-fat_100g': n['omega-3-fat_100g'] ?? null,
            'sodium_100g': n.sodium_100g ?? null,
          });

          // Cache the fetched product locally for instant future access
          const productName = op.product_name || op.product_name_en || op.abbreviated_product_name || op.generic_name || p.productName;
          const brand = op.brands || p.brand || null;
          const imageUrl = op.image_front_url || op.image_url || p.imageUrl || null;
          const hasEnglishText = !!op.ingredients_text_en;
          cacheProduct({
            barcode: p.barcode,
            productName,
            brand,
            imageUrl,
            quantity: op.quantity || op.product_quantity || null,
            nutriscoreGrade: op.nutriscore_grade || op.nutrition_grade_fr || null,
            energyKcal: n['energy-kcal_100g'] ?? null,
            carbs: n.carbohydrates_100g ?? null,
            sugars: n.sugars_100g ?? null,
            fiber: n.fiber_100g ?? null,
            fat: n.fat_100g ?? null,
            saturatedFat: n['saturated-fat_100g'] ?? null,
            proteins: n.proteins_100g ?? null,
            salt: n.salt_100g ?? null,
            servingSize: op.serving_size ?? null,
            energyKcalServing: n['energy-kcal_serving'] ?? null,
            carbsServing: n.carbohydrates_serving ?? null,
            sugarsServing: n.sugars_serving ?? null,
            fiberServing: n.fiber_serving ?? null,
            fatServing: n.fat_serving ?? null,
            saturatedFatServing: n['saturated-fat_serving'] ?? null,
            proteinsServing: n.proteins_serving ?? null,
            saltServing: n.salt_serving ?? null,
            ingredientsText: op.ingredients_text_en || op.ingredients_text || null,
            allergens: allergenTags.join(',') || null,
            traces: tracesTags.join(',') || null,
            ingredientsJson: op.ingredients ? JSON.stringify(op.ingredients) : null,
            offLang: hasEnglishText ? 'en' : (op.lang || op.lc || 'en'),
          }).catch(() => {});

          // Update Supabase scan history with the product info (fire-and-forget)
          if (session?.user?.id) {
            (async () => {
              try {
                const { data: existing } = await supabase.from('scans').select('id').eq('user_id', session.user.id).eq('barcode', p.barcode).limit(1).single();
                if (existing) {
                  await supabase.from('scans').update({
                    product_name: productName, brand, image_url: imageUrl,
                    nutriscore_grade: op.nutriscore_grade || op.nutrition_grade_fr || null,
                  }).eq('id', existing.id);
                }
              } catch { /* non-critical */ }
            })();
          }
        }
      })
      .catch(() => {/* silently ignore — the empty state handles no-data */})
      .finally(() => setFetchingOff(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When macros were passed via route params (scanner already had them),
  // still fetch micronutrients from OFF for the nutrient watchlist feature.
  // This runs in the background — it does NOT block the main nutrition UI.
  useEffect(() => {
    if (needsOffFetch || !p.barcode) return; // main fetch handles this case
    fetch(`https://world.openfoodfacts.org/api/v0/product/${p.barcode}.json`, {
      headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === 1 && data.product) {
          const n = data.product.nutriments ?? {};
          setMicronutrients({
            'potassium_100g': n.potassium_100g ?? null,
            'calcium_100g': n.calcium_100g ?? null,
            'iron_100g': n.iron_100g ?? null,
            'magnesium_100g': n.magnesium_100g ?? null,
            'zinc_100g': n.zinc_100g ?? null,
            'phosphorus_100g': n.phosphorus_100g ?? null,
            'cholesterol_100g': n.cholesterol_100g ?? null,
            'trans-fat_100g': n['trans-fat_100g'] ?? null,
            'vitamin-a_100g': n['vitamin-a_100g'] ?? null,
            'vitamin-c_100g': n['vitamin-c_100g'] ?? null,
            'vitamin-d_100g': n['vitamin-d_100g'] ?? null,
            'vitamin-e_100g': n['vitamin-e_100g'] ?? null,
            'vitamin-k_100g': n['vitamin-k_100g'] ?? null,
            'copper_100g': n.copper_100g ?? null,
            'manganese_100g': n.manganese_100g ?? null,
            'selenium_100g': n.selenium_100g ?? null,
            'vitamin-b9_100g': n['vitamin-b9_100g'] ?? null,
            'omega-3-fat_100g': n['omega-3-fat_100g'] ?? null,
            'sodium_100g': n.sodium_100g ?? null,
          });
        }
      })
      .catch(() => {});
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
  const tracesSource = p.traces || fetched?.traces || '';
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

  // Parse traces ("may contain") tags — same format as allergens
  const tracesList: string[] = tracesSource
    ? tracesSource
        .split(',')
        .filter(Boolean)
        .map((a) => {
          const name = a.trim().replace(/^en:/, '').replace(/-/g, ' ');
          return name.charAt(0).toUpperCase() + name.slice(1);
        })
    : [];

  // Match product traces against the active profile's allergies
  const tracesLower = tracesList.map((t) => t.toLowerCase());
  const matchedTraces = profileAllergies.filter((profileAllergy) => {
    const entry = ALLERGY_KEYWORDS[profileAllergy];
    if (!entry) {
      const firstWord = profileAllergy.split(/\s+/)[0].toLowerCase();
      return tracesLower.some((tl) => tl.includes(firstWord));
    }
    const { tags } = entry;
    return tags.some((t) => tracesLower.some((tl) => tl === t || tl.includes(t)));
  });
  const hasProfileTracesMatch = matchedTraces.length > 0;

  // Detect if serving is effectively 100g (e.g. "100g", "100 g", "1 serving (100 g)")
  const servingIs100g = /\b100\s*(g|ml)\b/i.test(servingSize);
  // Only show the per-100g tab when serving differs from 100g
  const showBothModes = hasServingData && !servingIs100g;
  // Extract just the measurement from serving size strings like:
  //   "1 bottle (500ml)" → "500ml"
  //   "1 bar (45g)"      → "45g"
  //   "2 biscuits (30g)" → "30g"
  //   "30 g"             → "30g"
  //   "(63g)"            → "63g"
  const measurementMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*(g|mg|kg|ml|cl|l|oz|fl\s*oz)\b/i);
  const servingMeasurement = measurementMatch
    ? `${measurementMatch[1]}${measurementMatch[2].replace(/\s/g, '').toLowerCase()}`
    : '';
  // Show "Per Serving (500ml)" when we extracted a measurement,
  // plain "Per Serving" if we couldn't parse one.
  const servingLabel = servingMeasurement
    ? `Per Serving (${servingMeasurement})`
    : 'Per Serving';

  // Detect liquid products — use ml/l units instead of g
  const isLiquid = /\b(ml|cl|litre|liter|fl\s*oz)\b/i.test(quantity + ' ' + servingSize);
  const baseUnit = isLiquid ? 'ml' : 'g';

  // Available modes for the toggle (show serving only when data exists + differs from 100g)
  const servingModes: ServingMode[] = showBothModes ? ['serving', '100g'] : ['100g'];
  // If we only have one mode, force it
  const effectiveServingMode: ServingMode = showBothModes ? servingMode : '100g';

  // All nutrient rows in display order (matches Figma Macro Stack)
  // Switches between per-100g and per-serving based on the active toggle.
  // Falls back to 100g if no serving data is available.
  const useServing = effectiveServingMode === 'serving' && hasServingData;
  const is100gMode = effectiveServingMode === '100g';
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

  // Staggered fade-in for major content sections
  const fadeProduct    = useFadeIn(true, 0);       // product header loads from route params
  const fadeNutrition  = useFadeIn(!fetchingOff, 80);
  const fadeIngredient = useFadeIn(!fetchingOff, 160);

  // Weight scaling: applies in 100g mode when user adjusts the weight via stepper.
  // Per-serving mode remains unscaled.
  const weightScale = (is100gMode && customWeight !== 100) ? customWeight / 100 : 1;

  /** Scale a raw nutrient string by the current weight factor */
  function scaleRaw(raw: string | undefined): string | undefined {
    if (!raw || weightScale === 1) return raw;
    const n = parseFloat(raw);
    return isNaN(n) ? raw : String(n * weightScale);
  }

  // Ingredients parsing for Ingredients tab — clean text-based list
  const ingredientsList: string[] = parseIngredientsText(ingredientsText);

  // Flat structured OFF JSON — used only for metadata (vegan/vegetarian flags).
  // The OFF API returns a flat list even when ingredients have sub-ingredients,
  // so we cannot rely on it for hierarchy.  Hierarchy comes from text parsing.
  const rawStructuredFlat: OffIngredient[] = ingredientsJsonRaw
    ? (() => {
        try {
          return JSON.parse(ingredientsJsonRaw) as OffIngredient[];
        } catch { return []; }
      })()
    : [];

  // Build hierarchical ingredient list from raw text, enriched with OFF metadata.
  // parseIngredientsWithHierarchy parses parentheses/brackets in the raw text to
  // derive the tree structure, then matches each entry to the flat OFF JSON to
  // attach vegan/vegetarian flags.  Falls back to flat text parsing if needed.
  const structuredIngredients: OffIngredient[] = ingredientsText
    ? parseIngredientsWithHierarchy(ingredientsText, rawStructuredFlat)
    : rawStructuredFlat.length > 0
      ? rawStructuredFlat.map((ing) => ({ ...ing, text: cleanIngredientName(ing.text), depth: 0 }))
          .filter((ing) => ing.text.length > 1)
      : [];

  // Use active family member's preferences when selected, else main user's
  const activePrefs: DietaryTag[] = activeFamilyProfile
    ? activeFamilyProfile.dietary_preferences ?? []
    : profile?.dietary_preferences ?? [];

  // Resolve categories from route params or OFF fetch
  const categoriesSource = fetched?.categoriesTags ?? p.categoriesTags ?? '';
  const categoriesArray = categoriesSource.split(',').filter(Boolean);

  // Flagged ingredients are personal to the main user — don't show them
  // when viewing a family member's profile (they don't have their own flags yet).
  const activeFlaggedNames = activeFamilyProfile ? [] : flaggedNames;
  const activeFlagReasonMap = activeFamilyProfile ? {} : flagReasonMap;
  const activeFlaggedNameToIdMap = activeFamilyProfile ? {} : flaggedNameToIdMap;

  const categorised = categoriseIngredients(
    structuredIngredients,
    allergenSource.split(',').filter(Boolean),
    activePrefs,
    activeFlaggedNames,
    activeFlagReasonMap,
    activeFlaggedNameToIdMap,
    p.productName,
    categoriesArray,
    [...(activeFamilyProfile?.health_conditions ?? profile?.health_conditions ?? []),
     ...(activeFamilyProfile?.dietary_preferences?.map((d) => DIETARY_LABELS[d] ?? d) ?? profile?.dietary_preferences?.map((d) => DIETARY_LABELS[d] ?? d) ?? [])],
  );

  // ── Full List tree + category lookup for Ingredients sub-tabs ──
  const ingredientTree: IngredientNode[] = useMemo(
    () => ingredientsText ? parseIngredientTree(ingredientsText) : [],
    [ingredientsText],
  );

  // Accordions start collapsed — user taps to expand

  // Build a map from ingredient name → category for status icons in Full List
  const categoryMap = useMemo(() => {
    const map = new Map<string, 'harmful' | 'ok' | 'safe' | 'flagged'>();
    categorised.userFlagged.forEach((ing) => map.set(ing.text.toLowerCase(), 'flagged'));
    categorised.harmful.forEach((ing) => map.set(ing.text.toLowerCase(), 'harmful'));
    categorised.ok.forEach((ing) => map.set(ing.text.toLowerCase(), 'ok'));
    categorised.safe.forEach((ing) => map.set(ing.text.toLowerCase(), 'safe'));
    return map;
  }, [categorised]);

  // Set of parent ingredient names (depth-0 with children) — excluded from Insight Groups
  const parentIngredientNames = useMemo(() => {
    const names = new Set<string>();
    for (const node of ingredientTree) {
      if (node.children.length > 0) {
        const cleaned = cleanTreeToken(node.text).toLowerCase();
        if (cleaned) names.add(cleaned);
      }
    }
    return names;
  }, [ingredientTree]);

  // Filtered categorised lists for Insight Groups (excludes parent ingredients)
  const filteredCategorised = useMemo(() => ({
    userFlagged: categorised.userFlagged.filter(
      (ing) => !parentIngredientNames.has(ing.text.toLowerCase()),
    ),
    harmful: categorised.harmful.filter(
      (ing) => !parentIngredientNames.has(ing.text.toLowerCase()),
    ),
    ok: categorised.ok.filter(
      (ing) => !parentIngredientNames.has(ing.text.toLowerCase()),
    ),
    safe: categorised.safe.filter(
      (ing) => !parentIngredientNames.has(ing.text.toLowerCase()),
    ),
  }), [categorised, parentIngredientNames]);

  // Count total children recursively for a tree node
  function countDescendants(node: IngredientNode): number {
    let count = 0;
    for (const child of node.children) {
      count += 1 + countDescendants(child);
    }
    return count;
  }

  // Toggle expand/collapse for a node
  function toggleExpanded(nodeKey: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeKey)) next.delete(nodeKey);
      else next.add(nodeKey);
      return next;
    });
  }

  // Get category icon props for an ingredient name
  function getCategoryIcon(name: string): { iconName: 'checkmark-sharp' | 'close-sharp'; color: string } {
    const cat = categoryMap.get(name.toLowerCase());
    if (cat === 'harmful' || cat === 'flagged') {
      return { iconName: 'close-sharp', color: Colors.status.negative };
    }
    if (cat === 'ok') {
      return { iconName: 'checkmark-sharp', color: Extra.poorOrange };
    }
    return { iconName: 'checkmark-sharp', color: Extra.positiveGreen };
  }

  // Build condition-aware nutrient thresholds from the active profile
  const activeConditions = activeFamilyProfile
    ? activeFamilyProfile.health_conditions ?? []
    : profile?.health_conditions ?? [];
  const activeAllergies = activeFamilyProfile
    ? activeFamilyProfile.allergies ?? []
    : profile?.allergies ?? [];
  const activeDietaryLabels = activeFamilyProfile
    ? activeFamilyProfile.dietary_preferences?.map((d) => DIETARY_LABELS_T[d] ?? d) ?? []
    : profile?.dietary_preferences?.map((d) => DIETARY_LABELS_T[d] ?? d) ?? [];
  const nutrientThresholds = buildThresholds(activeConditions, activeAllergies, activeDietaryLabels);

  // Rating column width is measured from an invisible "Moderate" label rendered off-screen.
  // This ensures consistent column width across all rows AND scales with accessibility font size.
  const ratingMinWidth = ratingColWidth;

  // ── Nutrient watchlist alerts ───────────────────────────────────────────────
  type WatchlistAlert = NutrientWatchlistEntry & { value: number };
  const activeWatchlist: NutrientWatchlistEntry[] =
    activeFamilyProfile?.nutrient_watchlist ?? profile?.nutrient_watchlist ?? [];
  const watchlistAlerts: WatchlistAlert[] = activeWatchlist
    .filter((entry) => {
      const val = micronutrients[entry.offKey];
      return val != null && val > 0;
    })
    .map((entry) => ({
      ...entry,
      value: micronutrients[entry.offKey]!,
    }));
  const hasMicroData = Object.values(micronutrients).some((v) => v != null && v > 0);

  // Personalised impact insights (Overview → Important for you section)
  // Dynamically filtered based on the active profile's conditions/allergies/preferences.
  // IMPORTANT: Don't compute while still fetching from OFF — empty/zero data would
  // produce misleading "Low" ratings. Wait until real data is available.
  const activeInsights = fetchingOff ? [] : getActiveInsights(
    activeConditions,
    activeAllergies,
    activeDietaryLabels,
    {
      sugars: rawSugars, fiber: rawFiber, carbs: rawCarbs,
      salt: rawSalt, fat: rawFat, saturatedFat: rawSaturatedFat,
      proteins: rawProteins, energyKcal: rawEnergyKcal,
      additiveCount: structuredIngredients.filter((ing) => /^en:e\d+/i.test(ing.id ?? '')).length,
      ...(() => {
        const allConditions = [...activeConditions, ...activeDietaryLabels];
        const sev = computeAdditiveSeverity(structuredIngredients, allConditions);
        return { additiveHighCount: sev.highCount, additiveModerateCount: sev.moderateCount };
      })(),
    },
    INSIGHT_DEFS_T,
  );

  function handleBack() {
    pageExit(() => safeBack());
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Invisible text to measure the widest rating label at the user's font scale */}
      <Text
        style={styles.ratingMeasure}
        onLayout={(e) => setRatingColWidth(Math.ceil(e.nativeEvent.layout.width))}
        numberOfLines={1}
      >
        Moderate
      </Text>
      <Animated.View style={{ flex: 1, opacity: pageOpacity, transform: [{ translateX: pageTranslateX }] }}>
      {/* ── Sticky Header (back, product info, nutri-score, tabs) ── */}
      <View style={styles.stickyHeader}>
        {/* Back button */}
        <View style={styles.backRow}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
            <BigBackIcon width={32} height={32} />
          </TouchableOpacity>
        </View>

        <View style={styles.stickyContent}>
          {/* ── Product header ── */}
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            {!!p.brand && <Text style={styles.brandName}>{sentenceCase(p.brand)}</Text>}
            <Text style={styles.productName}>{sentenceCase(p.productName) || t('product.unknownName')}</Text>
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
              <NoImagePlaceholder />
            </View>
          )}
        </View>

        {/* ── Nutri-score (Figma node 3263-5506) ── */}
        {!!nutriscoreGrade && !!NUTRISCORE_COLORS[nutriscoreGrade] && (
          <View style={styles.nutriscoreRow}>
            <View style={styles.nutriscoreLeft}>
              <Text style={styles.nutriscoreLabel}>{t('nutriscoreLabel')}</Text>
              <View style={[styles.nutriscorebadge, { backgroundColor: NUTRISCORE_COLORS[nutriscoreGrade] }]}>
                <Text style={styles.nutriscorebadgeText}>{NUTRISCORE_LABELS_T[nutriscoreGrade]}</Text>
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
            {TABS_T.map((tab) => {
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
        </View>
      </View>

      {/* ── Scrollable tab content ── */}
      <View style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
                : profile.full_name || session.user.email?.split('@')[0] || t('profile.myProfile');
              const displayName = fullName.trim().split(/\s+/)[0];
              const avatarUrl = isFamily
                ? activeFamilyProfile!.avatar_url
                : profile.avatar_url;
              // Merge all tags into one list (health conditions + allergies + dietary labels)
              // Map each through i18n so keys like "diabetes" display as "Diabetic"
              const tags: string[] = [];
              const hc = isFamily ? activeFamilyProfile!.health_conditions : profile.health_conditions;
              const al = isFamily ? activeFamilyProfile!.allergies : profile.allergies;
              const dp = isFamily ? activeFamilyProfile!.dietary_preferences : profile.dietary_preferences;
              if (hc?.length)
                tags.push(...hc.map((c) => tpo(`healthConditions.${c}`, { defaultValue: c })));
              if (al?.length)
                tags.push(...al.map((a) => tpo(`allergies.${a}`, { defaultValue: a })));
              if (dp?.length)
                tags.push(...dp.map((d) => DIETARY_LABELS_T[d] ?? d));
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
                      <Text style={styles.familySwitchText}>{t('profile.switch')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            {/* ── Important for you ── */}
            {(hasProfileAllergenMatch || activeInsights.length > 0) && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{t('section.importantForYou')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {activeFamilyProfile
                      ? t('section.importantSubtitle', { name: activeFamilyProfile.name.trim().split(/\s+/)[0] })
                      : profile?.full_name
                        ? t('section.importantSubtitle', { name: profile.full_name.trim().split(/\s+/)[0] })
                        : t('section.importantSubtitleGeneric')}
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
                        <Text style={styles.allergenBadgeText}>{t('allergen.warningBadge')}</Text>
                      </View>
                      <Text style={styles.allergenText}>
                        {t('allergen.warningText', { allergens: matchedAllergens.join(', '), name: firstName })}
                      </Text>
                    </View>
                  );
                })()}

                {/* Traces / "may contain" warning — cross-contamination risk */}
                {hasProfileTracesMatch && (() => {
                  const firstName = activeFamilyProfile
                    ? activeFamilyProfile.name.trim().split(/\s+/)[0]
                    : profile?.full_name?.trim().split(/\s+/)[0];
                  return (
                    <View style={styles.tracesCard}>
                      <View style={styles.tracesBadge}>
                        <Ionicons name="alert-circle" size={11} color="#fff" />
                        <Text style={styles.tracesBadgeText}>{t('allergen.tracesBadge')}</Text>
                      </View>
                      <Text style={styles.tracesText}>
                        {t('allergen.tracesWarningText', { traces: matchedTraces.join(', '), name: firstName })}
                      </Text>
                    </View>
                  );
                })()}

                {/* User-flagged ingredient warning (orange card) */}
                {categorised.userFlagged.length > 0 && (
                    <View style={styles.flaggedCard}>
                      <View style={styles.flaggedBadge}>
                        <MenuFlaggedIcon color="#fff" size={11} />
                        <Text style={styles.flaggedBadgeText}>{t('flagged.badge')}</Text>
                      </View>
                      <Text style={styles.flaggedTitle}>{t('flagged.title')}</Text>
                      {categorised.userFlagged.map((ing, i) => {
                        const reason = ing.personalReason
                          ? t('flagged.subtitle', { reason: ing.personalReason.text })
                          : t('flagged.subtitleGeneric');
                        return (
                          <View key={`ov-uf-${ing.id ?? i}`} style={styles.ingRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.ingName} numberOfLines={2}>
                                {sentenceCase(ing.text)}
                              </Text>
                              <Text style={styles.flaggedSubtitle}>{reason}</Text>
                            </View>
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
                        );
                      })}
                    </View>
                )}

                {/* Dynamic insight panels — rendered in pairs */}
                {activeInsights.length > 0 && (
                  <View style={styles.impactPanelsRow}>
                    {activeInsights.map(({ def, result }) => {
                      const Icon = def.icons[result.iconKey];
                      return (
                        <TouchableOpacity
                          key={def.key}
                          style={styles.impactPanel}
                          activeOpacity={0.7}
                          onPress={() => setInsightSheetDef({ def, result })}
                        >
                          <View style={styles.impactPanelInfo}>
                            <InfoIcon width={16} height={16} color={Colors.secondary} />
                          </View>
                          <Icon width={def.iconWidth} height={def.iconHeight} />
                          <View style={styles.impactLabelGroup}>
                            <Text style={styles.impactPanelLabel}>{def.label}</Text>
                            <View style={[styles.impactPill, { backgroundColor: result.color }]}>
                              <Text style={styles.impactPillText}>{result.label}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

              </View>
            )}

            {/* ── Nutrient Watch (Figma node 3263-5807) ── */}
            {watchlistAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{t('section.nutrientWatch')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {t('section.nutrientWatchlistSubtitle')}
                  </Text>
                </View>
                {/* Limit group */}
                {watchlistAlerts.some((a) => a.direction === 'limit') && (
                  <View style={styles.nwGroup}>
                    <View style={styles.nwGroupHeader}>
                      <View style={[styles.nwArrow, { backgroundColor: Colors.status.negative }]}>
                        <Ionicons name="arrow-down" size={16} color="#fff" />
                      </View>
                      <Text style={styles.nwGroupTitle}>{tc('nutrientDirections.limit')}</Text>
                    </View>
                    {watchlistAlerts.filter((a) => a.direction === 'limit').map((alert) => {
                      const sev = getNutrientSeverity(alert.offKey, alert.value, alert.direction);
                      const isGood = sev.color === SEV_AMAZING || sev.color === SEV_GOOD;
                      return (
                        <View key={alert.offKey} style={styles.nwRow}>
                          <View style={styles.nwRowLeft}>
                            <Text style={styles.nwNutrient}>{alert.nutrient}</Text>
                          </View>
                          <View style={styles.nwRowRight}>
                            <Text style={styles.nwValue}>
                              {Number(alert.value.toFixed(2))}{alert.unit}/100{baseUnit}
                            </Text>
                            <Text style={[styles.nwRating, { color: sev.color, minWidth: ratingColWidth }]} numberOfLines={1}>
                              {tc(`ratings.${sev.rating}`)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                {/* Increase group */}
                {watchlistAlerts.some((a) => a.direction === 'boost') && (
                  <View style={styles.nwGroup}>
                    <View style={styles.nwGroupHeader}>
                      <View style={[styles.nwArrow, { backgroundColor: Colors.status.positive }]}>
                        <Ionicons name="arrow-up" size={16} color="#fff" />
                      </View>
                      <Text style={styles.nwGroupTitle}>{tc('nutrientDirections.increase')}</Text>
                    </View>
                    {watchlistAlerts.filter((a) => a.direction === 'boost').map((alert) => {
                      const sev = getNutrientSeverity(alert.offKey, alert.value, alert.direction);
                      const isGood = sev.color === SEV_AMAZING || sev.color === SEV_GOOD;
                      return (
                        <View key={alert.offKey} style={styles.nwRow}>
                          <View style={styles.nwRowLeft}>
                            <Text style={styles.nwNutrient}>{alert.nutrient}</Text>
                          </View>
                          <View style={styles.nwRowRight}>
                            <Text style={styles.nwValue}>
                              {Number(alert.value.toFixed(2))}{alert.unit}/100{baseUnit}
                            </Text>
                            <Text style={[styles.nwRating, { color: sev.color, minWidth: ratingColWidth }]} numberOfLines={1}>
                              {tc(`ratings.${sev.rating}`)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* No micronutrient data notice */}
            {activeWatchlist.length > 0 && watchlistAlerts.length === 0 && !hasMicroData && !fetchingOff && (
              <View style={[styles.section, { gap: Spacing.xs }]}>
                <View style={styles.noMicroDataCard}>
                  <Ionicons name="information-circle-outline" size={16} color={Colors.secondary} />
                  <Text style={styles.noMicroDataText}>
                    {t('nutrientWatch.noMicroData')}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Flagged ingredients (Figma node 3263-6094) ── */}
            {categorised.harmful.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{t('section.flaggedIngredients')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {t('section.flaggedIngredientsSubtitle')}
                  </Text>
                </View>
                <View style={styles.ingCategoryCard}>
                  <Text style={styles.ingCategoryHeading}>
                    <Text style={styles.ingCount}>
                      {t('ingredients.ingredient', { count: categorised.harmful.length })}
                    </Text>
                    <Text style={styles.ingMiddle}>
                      {' '}
                      {categorised.harmful.length === 1 ? t('ingredients.is') : t('ingredients.are')} {t('ingredients.considered')}{' '}
                    </Text>
                    <Text style={[styles.ingWord, { color: Colors.status.negative }]}>{t('ingredients.harmful')}</Text>
                  </Text>
                  <View style={{ gap: 4 }}>
                    {categorised.harmful.map((ing, i) => (
                      <View key={`ov-harm-${ing.id ?? i}`} style={[styles.ingRow, (ing.depth ?? 0) > 0 && { paddingLeft: (ing.depth ?? 0) * 20 }]}>
                        <Ionicons name="close" size={24} color={Colors.status.negative} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.ingName} numberOfLines={2}>
                            {sentenceCase(ing.text)}
                          </Text>
                          {ing.matchSource === 'product-name' && (
                            <Text style={styles.matchSourceLabel}>{t('ingredients.matchProductName')}</Text>
                          )}
                          {ing.matchSource === 'category' && (
                            <Text style={styles.matchSourceLabel}>{t('ingredients.matchCategory')}</Text>
                          )}
                        </View>
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

            {/* Loading progress bar while fetching OFF data */}
            {fetchingOff && (
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>{t('loading.nutritionalData')}</Text>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    }]}
                  />
                </View>
                <Text style={styles.progressPercent}>{progressDisplay}%</Text>
              </View>
            )}

            {/* Highlighted Nutritional Info (Figma node 3263-6129) */}
            <Animated.View style={{ opacity: fadeNutrition.opacity, transform: [{ translateY: fadeNutrition.translateY }] }}>
            {hasNutrition && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{t('section.highlightedNutrition')}</Text>
                </View>

                {/* Toggle controls (Figma node 4345-12654) */}
                <ServingToggle
                  servingModes={servingModes}
                  effectiveServingMode={effectiveServingMode}
                  setServingMode={setServingMode}
                  driMode={driMode}
                  setDriMode={setDriMode}
                  servingLabel={servingLabel}
                  baseUnit={baseUnit}
                  t={t}
                />

                {/* Weight stepper — shown when Per 100g is selected */}
                {is100gMode && (
                  <WeightStepper
                    customWeight={customWeight}
                    setCustomWeight={setCustomWeight}
                    editingWeight={editingWeight}
                    setEditingWeight={setEditingWeight}
                    baseUnit={baseUnit}
                  />
                )}

                <View style={styles.nutritionRows}>
                  {overviewNutrients.map(({ key, raw }) => {
                    if (!raw) return null;
                    const num = parseFloat(raw);
                    if (isNaN(num) || num < 0) return null;
                    const scaled = scaleRaw(raw);
                    const scaledNum = scaled ? parseFloat(scaled) : num;
                    const rating = getRatingT(key, isNaN(scaledNum) ? num : scaledNum, nutrientThresholds);
                    const unit = NUTRIENT_UNITS[key];
                    const displayVal =
                      driMode === 'dri' ? fmtDri(scaled, key) : fmtVal(scaled, unit);
                    const IconComp = FoodIcons[key];
                    return (
                      <View key={key} style={styles.nutritionRow}>
                        <View style={styles.nutritionRowLeft}>
                          <View style={styles.nutritionIconBox}>
                            <IconComp width={32} height={32} />
                          </View>
                          <Text style={styles.nutritionName}>{NUTRIENT_LABELS_T[key]}</Text>
                        </View>
                        <View style={styles.nutritionRowRight}>
                          <Text style={styles.nutritionValue}>{displayVal}</Text>
                          <Text style={[styles.nutritionRating, { color: rating.color, minWidth: ratingMinWidth }]} numberOfLines={1}>
                            {rating.label}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            </Animated.View>

            {/* Empty state */}
            {!fetchingOff && !hasNutrition && allergenList.length === 0 && categorised.harmful.length === 0 && categorised.userFlagged.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="information-circle-outline" size={40} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>{t('empty.limitedDataTitle')}</Text>
                <Text style={styles.emptyStateText}>
                  {t('empty.limitedDataText')}
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
                <Text style={styles.sectionTitle}>{t('section.nutritionalInfo')}</Text>
              </View>

              {/* Toggle controls — same compact style as overview */}
              <ServingToggle
                servingModes={servingModes}
                effectiveServingMode={effectiveServingMode}
                setServingMode={setServingMode}
                driMode={driMode}
                setDriMode={setDriMode}
                servingLabel={servingLabel}
                baseUnit={baseUnit}
                t={t}
              />

              {/* Weight stepper — shown when Per 100g is selected */}
              {is100gMode && hasNutrition && (
                <WeightStepper
                  customWeight={customWeight}
                  setCustomWeight={setCustomWeight}
                  editingWeight={editingWeight}
                  setEditingWeight={setEditingWeight}
                  baseUnit={baseUnit}
                />
              )}

              {fetchingOff ? (
                <View style={styles.progressContainer}>
                  <Text style={styles.progressLabel}>{t('loading.nutritionalData')}</Text>
                  <View style={styles.progressTrack}>
                    <Animated.View
                      style={[styles.progressFill, {
                        width: progressAnim.interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        }),
                      }]}
                    />
                  </View>
                  <Text style={styles.progressPercent}>{progressDisplay}%</Text>
                </View>
              ) : hasNutrition ? (
                <View style={styles.nutritionRows}>
                  {nutrientRows.map(({ key, raw }) => {
                    if (!raw) return null;
                    const num = parseFloat(raw);
                    if (isNaN(num) || num < 0) return null;
                    const unit = NUTRIENT_UNITS[key];
                    const scaled = scaleRaw(raw);
                    const scaledNum = scaled ? parseFloat(scaled) : num;
                    const rating = getRatingT(key, isNaN(scaledNum) ? num : scaledNum, nutrientThresholds);
                    const displayVal =
                      driMode === 'dri' ? fmtDri(scaled, key) : fmtVal(scaled, unit);
                    const IconComp = FoodIcons[key];
                    return (
                      <View key={key} style={styles.nutritionRow}>
                        <View style={styles.nutritionRowLeft}>
                          <View style={styles.nutritionIconBox}>
                            <IconComp width={32} height={32} />
                          </View>
                          <Text style={styles.nutritionName}>{NUTRIENT_LABELS_T[key]}</Text>
                        </View>
                        <View style={styles.nutritionRowRight}>
                          <Text style={styles.nutritionValue}>{displayVal}</Text>
                          <Text style={[styles.nutritionRating, { color: rating.color, minWidth: ratingMinWidth }]} numberOfLines={1}>
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
                  <Text style={styles.emptyStateTitle}>{t('empty.noNutritionTitle')}</Text>
                  <Text style={styles.emptyStateText}>
                    {t('empty.noNutritionText')}
                  </Text>
                </View>
              )}
            </View>

            {/* ── Your Nutrient Watchlist ── */}
            {watchlistAlerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{t('section.nutrientWatchlist')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {t('section.nutrientWatchlistSubtitle')}
                  </Text>
                </View>
                {/* Limit group */}
                {watchlistAlerts.some((a) => a.direction === 'limit') && (
                  <View style={styles.nwGroup}>
                    <View style={styles.nwGroupHeader}>
                      <View style={[styles.nwArrow, { backgroundColor: Colors.status.negative }]}>
                        <Ionicons name="arrow-down" size={16} color="#fff" />
                      </View>
                      <Text style={styles.nwGroupTitle}>{tc('nutrientDirections.limit')}</Text>
                    </View>
                    {watchlistAlerts.filter((a) => a.direction === 'limit').map((alert) => {
                      const sev = getNutrientSeverity(alert.offKey, alert.value, alert.direction);
                      const isGood = sev.color === SEV_AMAZING || sev.color === SEV_GOOD;
                      return (
                        <View key={alert.offKey} style={styles.nwRow}>
                          <View style={styles.nwRowLeft}>
                            <Text style={styles.nwNutrient}>{alert.nutrient}</Text>
                          </View>
                          <View style={styles.nwRowRight}>
                            <Text style={styles.nwValue}>
                              {Number(alert.value.toFixed(2))}{alert.unit}/100{baseUnit}
                            </Text>
                            <Text style={[styles.nwRating, { color: sev.color, minWidth: ratingColWidth }]} numberOfLines={1}>
                              {tc(`ratings.${sev.rating}`)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                {/* Increase group */}
                {watchlistAlerts.some((a) => a.direction === 'boost') && (
                  <View style={styles.nwGroup}>
                    <View style={styles.nwGroupHeader}>
                      <View style={[styles.nwArrow, { backgroundColor: Colors.status.positive }]}>
                        <Ionicons name="arrow-up" size={16} color="#fff" />
                      </View>
                      <Text style={styles.nwGroupTitle}>{tc('nutrientDirections.increase')}</Text>
                    </View>
                    {watchlistAlerts.filter((a) => a.direction === 'boost').map((alert) => {
                      const sev = getNutrientSeverity(alert.offKey, alert.value, alert.direction);
                      const isGood = sev.color === SEV_AMAZING || sev.color === SEV_GOOD;
                      return (
                        <View key={alert.offKey} style={styles.nwRow}>
                          <View style={styles.nwRowLeft}>
                            <Text style={styles.nwNutrient}>{alert.nutrient}</Text>
                          </View>
                          <View style={styles.nwRowRight}>
                            <Text style={styles.nwValue}>
                              {Number(alert.value.toFixed(2))}{alert.unit}/100{baseUnit}
                            </Text>
                            <Text style={[styles.nwRating, { color: sev.color, minWidth: ratingColWidth }]} numberOfLines={1}>
                              {tc(`ratings.${sev.rating}`)}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════
            INGREDIENTS TAB — Sub-tabs: Full List + Insight Groups
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'ingredients' && (
          <Animated.View style={[styles.tabContent, { gap: Spacing.s, opacity: fadeIngredient.opacity, transform: [{ translateY: fadeIngredient.translateY }] }]}>
            {fetchingOff ? (
              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>{t('loading.ingredients')}</Text>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[styles.progressFill, {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                    }]}
                  />
                </View>
                <Text style={styles.progressPercent}>{progressDisplay}%</Text>
              </View>
            ) : structuredIngredients.length > 0 ? (
              <>
                {/* ── Sub-tab toggle: Full list / Insight groups ── */}
                <View style={styles.toggleRowCompact}>
                  <TouchableOpacity
                    style={[
                      styles.overviewToggle,
                      ingredientSubTab === 'fullList' && styles.overviewToggleActive,
                    ]}
                    onPress={() => setIngredientSubTab('fullList')}
                  >
                    <Text
                      style={[
                        styles.overviewToggleText,
                        ingredientSubTab === 'fullList' && styles.overviewToggleTextActive,
                      ]}
                    >
                      {t('ingredientSubTab.fullList')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.overviewToggle,
                      ingredientSubTab === 'insightGroups' && styles.overviewToggleActive,
                    ]}
                    onPress={() => setIngredientSubTab('insightGroups')}
                  >
                    <Text
                      style={[
                        styles.overviewToggleText,
                        ingredientSubTab === 'insightGroups' && styles.overviewToggleTextActive,
                      ]}
                    >
                      {t('ingredientSubTab.insightGroups')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* ═══════ FULL LIST sub-tab ═══════ */}
                {ingredientSubTab === 'fullList' && (() => {
                  const parents = ingredientTree.filter(n => n.children.length > 0);
                  const orphans = ingredientTree.filter(n => n.children.length === 0);
                  return (
                  <View style={{ gap: Spacing.m }}>
                    {/* ── Parent groups ── */}
                    {parents.map((topNode, topIdx) => {
                      const cleaned = cleanTreeToken(topNode.text);
                      const label = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
                      const descendantCount = countDescendants(topNode);

                      return (
                        <View key={`parent-${topIdx}`} style={{ gap: Spacing.xs }}>
                          {/* Parent header: name + child count */}
                          <View style={styles.fullListHeader}>
                            <Text style={styles.fullListParentName}>{label}</Text>
                            <Text style={styles.fullListChildCount}>
                              ({t('fullList.ingredients', { count: descendantCount })})
                            </Text>
                          </View>

                          {/* Card with children */}
                          <View style={styles.fullListCard}>
                            {topNode.children.map((child, childIdx) => {
                              const childCleaned = cleanTreeToken(child.text);
                              const childLabel = childCleaned.charAt(0).toUpperCase() + childCleaned.slice(1).toLowerCase();
                              const childHasChildren = child.children.length > 0;
                              const childKey = `${topIdx}-${childIdx}`;
                              const isExpanded = expandedNodes.has(childKey);
                              const { iconName: childIconName, color: childColor } = getCategoryIcon(childLabel);
                              const isHarmfulOrFlagged = categoryMap.get(childLabel.toLowerCase()) === 'harmful'
                                || categoryMap.get(childLabel.toLowerCase()) === 'flagged';

                              return (
                                <View key={childKey}>
                                  {/* Separator line between rows (not before first) */}
                                  {childIdx > 0 && <View style={styles.fullListSeparator} />}

                                  {/* Child row */}
                                  <TouchableOpacity
                                    activeOpacity={childHasChildren ? 0.6 : 1}
                                    onPress={childHasChildren ? () => toggleExpanded(childKey) : undefined}
                                    style={styles.fullListRow}
                                  >
                                    <View style={styles.fullListStatusIcon}>
                                      <Ionicons name={childIconName} size={20} color={childColor} />
                                    </View>
                                    <Text style={styles.fullListIngName} numberOfLines={2}>
                                      {childLabel}
                                    </Text>
                                    {childHasChildren && (
                                      <Text style={styles.fullListInlineCount}>
                                        ({t('fullList.ingredients', { count: countDescendants(child) })})
                                      </Text>
                                    )}
                                    {isHarmfulOrFlagged && (
                                      <TouchableOpacity
                                        style={styles.fullListChevron}
                                        onPress={() => {
                                          const lc = childLabel.toLowerCase();
                                          const matchedFlagged =
                                            categorised.harmful.find((fi) => fi.text.toLowerCase() === lc)
                                            ?? categorised.userFlagged.find((fi) => fi.text.toLowerCase() === lc);
                                          if (matchedFlagged) setFlaggedSheetIng(matchedFlagged);
                                        }}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <InfoIcon width={16} height={16} color={Colors.secondary} />
                                      </TouchableOpacity>
                                    )}
                                    {childHasChildren && (
                                      <TouchableOpacity
                                        style={styles.fullListChevron}
                                        onPress={() => toggleExpanded(childKey)}
                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                      >
                                        <Ionicons
                                          name={isExpanded ? 'chevron-up-sharp' : 'chevron-down-sharp'}
                                          size={18}
                                          color={Colors.secondary}
                                        />
                                      </TouchableOpacity>
                                    )}
                                  </TouchableOpacity>

                                  {/* Expanded sub-children */}
                                  {childHasChildren && isExpanded && (
                                    <View>
                                      {child.children.map((sub, subIdx) => {
                                        const subCleaned = cleanTreeToken(sub.text);
                                        const subLabel = subCleaned.charAt(0).toUpperCase() + subCleaned.slice(1).toLowerCase();
                                        const subHasChildren = sub.children.length > 0;
                                        const subKey = `${childKey}-${subIdx}`;
                                        const isSubExpanded = expandedNodes.has(subKey);
                                        const { iconName: subIcon, color: subColor } = getCategoryIcon(subLabel);

                                        return (
                                          <View key={subKey}>
                                            <TouchableOpacity
                                              activeOpacity={subHasChildren ? 0.6 : 1}
                                              onPress={subHasChildren ? () => toggleExpanded(subKey) : undefined}
                                              style={[styles.fullListRow, { paddingLeft: 21 }]}
                                            >
                                              <Ionicons name="return-down-forward" size={18} color={Colors.secondary} />
                                              <View style={styles.fullListStatusIcon}>
                                                <Ionicons name={subIcon} size={20} color={subColor} />
                                              </View>
                                              <Text style={styles.fullListIngName} numberOfLines={2}>
                                                {subLabel}
                                              </Text>
                                              {subHasChildren && (
                                                <Text style={styles.fullListInlineCount}>
                                                  ({t('fullList.ingredients', { count: countDescendants(sub) })})
                                                </Text>
                                              )}
                                              {subHasChildren && (
                                                <TouchableOpacity
                                                  style={styles.fullListChevron}
                                                  onPress={() => toggleExpanded(subKey)}
                                                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                  <Ionicons
                                                    name={isSubExpanded ? 'chevron-up-sharp' : 'chevron-down-sharp'}
                                                    size={18}
                                                    color={Colors.secondary}
                                                  />
                                                </TouchableOpacity>
                                              )}
                                            </TouchableOpacity>

                                            {/* Depth-3 sub-sub-children */}
                                            {subHasChildren && isSubExpanded && sub.children.map((deep, deepIdx) => {
                                              const deepCleaned = cleanTreeToken(deep.text);
                                              const deepLabel = deepCleaned.charAt(0).toUpperCase() + deepCleaned.slice(1).toLowerCase();
                                              const { iconName: deepIcon, color: deepColor } = getCategoryIcon(deepLabel);
                                              return (
                                                <View key={`${subKey}-${deepIdx}`} style={[styles.fullListRow, { paddingLeft: 65 }]}>
                                                  <Ionicons name="return-down-forward" size={18} color={Colors.secondary} />
                                                  <View style={styles.fullListStatusIcon}>
                                                    <Ionicons name={deepIcon} size={20} color={deepColor} />
                                                  </View>
                                                  <Text style={styles.fullListIngName} numberOfLines={2}>
                                                    {deepLabel}
                                                  </Text>
                                                </View>
                                              );
                                            })}
                                          </View>
                                        );
                                      })}
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}

                    {/* ── Orphaned single ingredients collected at the end ── */}
                    {orphans.length > 0 && (
                      <View style={{ gap: Spacing.xs }}>
                        <View style={styles.fullListHeader}>
                          <Text style={styles.fullListParentName}>{t('fullList.otherIngredients')}</Text>
                          <Text style={styles.fullListChildCount}>
                            ({t('fullList.ingredients', { count: orphans.length })})
                          </Text>
                        </View>
                        <View style={styles.fullListCard}>
                          {orphans.map((node, idx) => {
                            const cleaned = cleanTreeToken(node.text);
                            const oLabel = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
                            const { iconName, color } = getCategoryIcon(oLabel);
                            return (
                              <View key={`orphan-${idx}`}>
                                {idx > 0 && <View style={styles.fullListSeparator} />}
                                <View style={styles.fullListRow}>
                                  <View style={styles.fullListStatusIcon}>
                                    <Ionicons name={iconName} size={20} color={color} />
                                  </View>
                                  <Text style={styles.fullListIngName} numberOfLines={2}>
                                    {oLabel}
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                  );
                })()}

                {/* ═══════ INSIGHT GROUPS sub-tab ═══════ */}
                {ingredientSubTab === 'insightGroups' && (
                  <View style={{ gap: Spacing.s }}>
                    {/* ── Allergen warning (only when profile has matching allergies) ── */}
                    {hasProfileAllergenMatch && (() => {
                      const firstName = activeFamilyProfile
                        ? activeFamilyProfile.name.trim().split(/\s+/)[0]
                        : profile?.full_name?.trim().split(/\s+/)[0];
                      return (
                        <View style={styles.allergenCard}>
                          <View style={styles.allergenBadge}>
                            <Ionicons name="warning" size={11} color="#fff" />
                            <Text style={styles.allergenBadgeText}>{t('allergen.warningBadge')}</Text>
                          </View>
                          <Text style={styles.allergenText}>
                            {t('allergen.warningText', { allergens: matchedAllergens.join(', '), name: firstName })}
                          </Text>
                        </View>
                      );
                    })()}

                    {/* ── Traces / "may contain" warning ── */}
                    {hasProfileTracesMatch && (() => {
                      const firstName = activeFamilyProfile
                        ? activeFamilyProfile.name.trim().split(/\s+/)[0]
                        : profile?.full_name?.trim().split(/\s+/)[0];
                      return (
                        <View style={styles.tracesCard}>
                          <View style={styles.tracesBadge}>
                            <Ionicons name="alert-circle" size={11} color="#fff" />
                            <Text style={styles.tracesBadgeText}>{t('allergen.tracesBadge')}</Text>
                          </View>
                          <Text style={styles.tracesText}>
                            {t('allergen.tracesWarningText', { traces: matchedTraces.join(', '), name: firstName })}
                          </Text>
                        </View>
                      );
                    })()}

                    {/* ── User-flagged card (orange) ── */}
                    {filteredCategorised.userFlagged.length > 0 && (
                      <View style={styles.flaggedCard}>
                        <View style={styles.flaggedBadge}>
                          <MenuFlaggedIcon color="#fff" size={11} />
                          <Text style={styles.flaggedBadgeText}>{t('flagged.badge')}</Text>
                        </View>
                        <Text style={styles.flaggedTitle}>{t('flagged.title')}</Text>
                        {filteredCategorised.userFlagged.map((ing, i) => {
                          const reason = ing.personalReason
                            ? t('flagged.subtitle', { reason: ing.personalReason.text })
                            : t('flagged.subtitleGeneric');
                          return (
                            <View key={`uf-${ing.id ?? i}`} style={styles.ingRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(ing.text)}</Text>
                                <Text style={styles.flaggedSubtitle}>{reason}</Text>
                              </View>
                              <TouchableOpacity
                                style={styles.ingInfoContainer}
                                onPress={() => setFlaggedSheetIng(ing)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <InfoIcon width={16} height={16} color={Colors.secondary} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    {/* ── Harmful card ── */}
                    {filteredCategorised.harmful.length > 0 && (
                      <View style={styles.ingCategoryCard}>
                        <Text style={styles.ingCategoryHeading}>
                          <Text style={styles.ingCount}>
                            {t('ingredients.ingredient', { count: filteredCategorised.harmful.length })}
                          </Text>
                          <Text style={styles.ingMiddle}>
                            {' '}{filteredCategorised.harmful.length === 1 ? t('ingredients.is') : t('ingredients.are')} {t('ingredients.considered')}{' '}
                          </Text>
                          <Text style={[styles.ingWord, { color: Colors.status.negative }]}>{t('ingredients.harmful')}</Text>
                        </Text>
                        <View style={{ gap: 2 }}>
                          {filteredCategorised.harmful.map((ing, i) => (
                            <View key={`harm-${ing.id ?? i}`} style={styles.ingRow}>
                              <Ionicons name="close" size={24} color={Colors.status.negative} />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(ing.text)}</Text>
                                {ing.matchSource === 'product-name' && (
                                  <Text style={styles.matchSourceLabel}>{t('ingredients.matchProductName')}</Text>
                                )}
                                {ing.matchSource === 'category' && (
                                  <Text style={styles.matchSourceLabel}>{t('ingredients.matchCategory')}</Text>
                                )}
                              </View>
                              <TouchableOpacity
                                style={styles.ingInfoContainer}
                                onPress={() => setFlaggedSheetIng(ing)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <InfoIcon width={16} height={16} color={Colors.secondary} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* ── Ok card ── */}
                    {filteredCategorised.ok.length > 0 && (
                      <View style={styles.ingCategoryCard}>
                        <Text style={styles.ingCategoryHeading}>
                          <Text style={styles.ingCount}>
                            {t('ingredients.ingredient', { count: filteredCategorised.ok.length })}
                          </Text>
                          <Text style={styles.ingMiddle}>
                            {' '}{filteredCategorised.ok.length === 1 ? t('ingredients.is') : t('ingredients.are')} {t('ingredients.considered')}{' '}
                          </Text>
                          <Text style={[styles.ingWord, { color: Extra.poorOrange }]}>{t('ingredients.ok')}</Text>
                        </Text>
                        <View style={{ gap: 2 }}>
                          {filteredCategorised.ok.map((ing, i) => (
                            <View key={`ok-${ing.id ?? i}`} style={styles.ingRowSmall}>
                              <Ionicons name="checkmark" size={24} color={Extra.poorOrange} />
                              <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(ing.text)}</Text>
                              <TouchableOpacity
                                style={styles.ingInfoContainer}
                                onPress={() => setInfoSheetIng({ ing, category: 'ok' })}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <InfoIcon width={16} height={16} color={Colors.secondary} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* ── Safe card ── */}
                    {filteredCategorised.safe.length > 0 && (
                      <View style={styles.ingCategoryCard}>
                        <Text style={styles.ingCategoryHeading}>
                          <Text style={styles.ingCount}>
                            {t('ingredients.ingredient', { count: filteredCategorised.safe.length })}
                          </Text>
                          <Text style={styles.ingMiddle}>
                            {' '}{filteredCategorised.safe.length === 1 ? t('ingredients.is') : t('ingredients.are')} {t('ingredients.considered')}{' '}
                          </Text>
                          <Text style={[styles.ingWord, { color: Extra.positiveGreen }]}>{t('ingredients.safe')}</Text>
                        </Text>
                        <View style={{ gap: 2 }}>
                          {filteredCategorised.safe.map((ing, i) => (
                            <View key={`safe-${ing.id ?? i}`} style={styles.ingRowSmall}>
                              <Ionicons name="checkmark" size={24} color={Extra.positiveGreen} />
                              <Text style={styles.ingName} numberOfLines={2}>{sentenceCase(ing.text)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </>
            ) : ingredientsList.length > 0 ? (
              // Fallback when only plain text is available (history scans, no structured data)
              <View style={styles.ingCategoryCard}>
                <Text style={styles.ingCategoryHeading}>
                  <Text style={styles.ingCount}>
                    {t('ingredients.ingredient', { count: ingredientsList.length })}
                  </Text>
                  <Text style={styles.ingMiddle}> {t('ingredients.listed')}</Text>
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
                <Text style={styles.emptyStateTitle}>{t('empty.noIngredientsTitle')}</Text>
                <Text style={styles.emptyStateText}>
                  {t('empty.noIngredientsText')}
                </Text>
              </View>
            )}
          </Animated.View>
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
                  <Text style={styles.sectionTitle}>{t('section.allergens')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {t('section.allergensSubtitle')}
                  </Text>
                </View>
                <View style={styles.allergenCard}>
                  <View style={styles.allergenBadge}>
                    <Ionicons name="warning" size={11} color="#fff" />
                    <Text style={styles.allergenBadgeText}>{t('allergen.allergensBadge')}</Text>
                  </View>
                  <Text style={styles.allergenText}>
                    {t('allergen.containsText', { allergens: allergenList.join(', ') })}
                  </Text>
                </View>
              </View>
            )}

            {allergenList.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={40} color={Colors.secondary} />
                <Text style={styles.emptyStateTitle}>{t('empty.noAllergensTitle')}</Text>
                <Text style={styles.emptyStateText}>
                  {t('empty.noAllergensText')}
                </Text>
              </View>
            )}

            {/* Traces / "may contain" cross-contamination warnings */}
            {tracesList.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>{t('section.traces')}</Text>
                  <Text style={styles.sectionSubtitle}>
                    {t('section.tracesSubtitle')}
                  </Text>
                </View>
                <View style={styles.tracesCard}>
                  <View style={styles.tracesBadge}>
                    <Ionicons name="alert-circle" size={11} color="#fff" />
                    <Text style={styles.tracesBadgeText}>{t('allergen.tracesBadge')}</Text>
                  </View>
                  <Text style={styles.tracesText}>
                    {t('allergen.tracesContainsText', { traces: tracesList.join(', ') })}
                  </Text>
                </View>
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
            <Text style={styles.comingSoonTitle}>{t('comingSoon.title')}</Text>
            <Text style={styles.comingSoonText}>
              {t('comingSoon.text')}
            </Text>
          </View>
        )}
        </ScrollView>
        {/* White gradient fade at top of scroll area */}
        <LinearGradient
          colors={['#ffffff', 'rgba(255,255,255,0)']}
          style={styles.stickyGradient}
          pointerEvents="none"
        />
      </View>

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
        flaggedAdditives={categorised.harmful.filter((ing) => ing.flagReason === 'additive_concern')}
      />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  ratingMeasure: {
    position: 'absolute',
    opacity: 0,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
  },

  // Sticky header (back, product info, nutri-score, tabs)
  stickyHeader: {
    backgroundColor: '#fff',
    zIndex: 1,
  },
  stickyContent: {
    paddingHorizontal: Spacing.m,
    gap: Spacing.m,
    paddingBottom: Spacing.xs,
  },
  stickyGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 24,
    zIndex: 1,
  },

  // Back button (Figma node 3263-6137 — plain icon, no circle bg)
  backRow: {
    paddingHorizontal: Spacing.s,
    paddingTop: Spacing.l,
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
    paddingTop: Spacing.s,
    paddingBottom: 56,
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

  // OFF fetch progress bar
  progressContainer: {
    paddingVertical: Spacing.s,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.accent,
    letterSpacing: -0.26,
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

  // Traces / "may contain" (amber card)
  tracesCard: {
    backgroundColor: 'rgba(255,160,0,0.08)',
    borderWidth: 2,
    borderColor: '#F57C00',
    borderRadius: 16,
    padding: Spacing.s,
    gap: Spacing.xs,
  },
  tracesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFA000',
    borderRadius: 999,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  tracesBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
  },
  tracesText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 18,
  },

  // Flagged ingredient (orange card)
  flaggedCard: {
    backgroundColor: Extra.flaggedOrangeBg,
    borderWidth: 2,
    borderColor: Extra.flaggedOrange,
    borderRadius: 16,
    padding: Spacing.s,
    gap: Spacing.xs,
  },
  flaggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Extra.flaggedOrangeBadge,
    borderRadius: 999,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  flaggedBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
  },
  flaggedTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    lineHeight: 18,
  },
  flaggedSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Extra.flaggedOrangeText,
    letterSpacing: -0.14,
    lineHeight: 18,
  },

  // ── Nutrient Watch (Figma node 3263-5807) ──
  nwGroup: {
    gap: Spacing.xs,
  },
  nwGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  nwArrow: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  nwGroupTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: 0,
    lineHeight: 20,
  },
  nwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5fbfb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingLeft: 12,
    paddingRight: Spacing.s,
    paddingVertical: 12,
    gap: Spacing.s,
  },
  nwRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nwNutrient: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: 0,
    lineHeight: 20,
  },
  nwRowRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.s,
    flexShrink: 0,
  },
  nwValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: 'center',
  },
  nwRatingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  nwRating: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
    lineHeight: 17,
    flexShrink: 0,
  },
  noMicroDataCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    padding: Spacing.s,
  },
  noMicroDataText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },

  // Nutrition rows (per Figma Macro Stack node 3263-5386)
  // EACH ROW is individually styled — no shared card wrapper
  nutritionRows: {
    gap: Spacing.xs,  // 8px between card rows
  },
  nutritionRow: {
    backgroundColor: '#f5fbfb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: Spacing.s,           // 16px
    paddingVertical: 12,
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
    lineHeight: 17,          // 1.2 × 14px
    textAlign: 'left',
    flexShrink: 0,
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
  toggleRowCompact: {
    flexDirection: 'row',
  },
  overviewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
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
    alignItems: 'stretch',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  ingCategoryHeading: {
    flexWrap: 'wrap',
    textAlign: 'left',
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
  matchSourceLabel: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 16,
    marginTop: 1,
  },
  ingInfoContainer: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // Full List sub-tab styles (Figma node 3263-3941)
  fullListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.s,
  } as const,
  fullListParentName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  } as const,
  fullListChildCount: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  } as const,
  fullListCard: {
    backgroundColor: '#f5fbfb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: 16,
  } as const,
  fullListSeparator: {
    height: 1,
    backgroundColor: '#e0eeec',
    marginVertical: 4,
  } as const,
  fullListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
    paddingVertical: 4,
  } as const,
  fullListStatusIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  fullListIngName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    lineHeight: 17,
  } as const,
  fullListChevron: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  } as const,
  // Inline ingredient count for expandable child rows (right-aligned to match parent header)
  fullListInlineCount: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.13,
    lineHeight: 19.5,
  } as const,

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
