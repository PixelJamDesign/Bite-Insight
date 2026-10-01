/**
 * NutritionPanel — the "Nutrition" block from the recipe builder and the
 * Plan a meal sheet (Figma 5912:15083): heading, Per serving / Per 100g
 * tabs, the macro stack (each row its own card) and the Estimated
 * Nutri-score scale.
 *
 * Pass `per100` as null when there's no weight to scale by — the Per 100g
 * tab is left out rather than showing made-up numbers.
 */
import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { NUTRISCORE_COLORS, NUTRISCORE_VERDICT, type NutriscoreGrade } from '@/lib/nutriscore';

import type { NutritionValues } from '@/lib/types';
export type { NutritionValues };

/* eslint-disable @typescript-eslint/no-require-imports */
type SvgIcon = React.FC<{ width?: number; height?: number }>;
const FOOD_ICONS: Record<string, SvgIcon> = {
  calories: require('@/assets/icons/food/calories.svg').default,
  fat: require('@/assets/icons/food/fat.svg').default,
  satFat: require('@/assets/icons/food/sat-fat.svg').default,
  carbs: require('@/assets/icons/food/carbs.svg').default,
  sugars: require('@/assets/icons/food/sugars.svg').default,
  fiber: require('@/assets/icons/food/fiber.svg').default,
  netCarbs: require('@/assets/icons/food/net-carbs.svg').default,
  protein: require('@/assets/icons/food/protein.svg').default,
  salt: require('@/assets/icons/food/salt.svg').default,
};
/* eslint-enable @typescript-eslint/no-require-imports */

const GRADES: NutriscoreGrade[] = ['a', 'b', 'c', 'd', 'e'];

type Mode = 'serving' | 'per100';

interface Props {
  title: string;
  subtitle: string;
  perServing: NutritionValues;
  /** Null when there's no weight to work it out from. */
  per100: NutritionValues | null;
  grade: NutriscoreGrade | null;
  /** Nothing added yet — shows `emptyText` instead of the rows. */
  empty?: boolean;
  emptyText?: string;
}

export function NutritionPanel({ title, subtitle, perServing, per100, grade, empty, emptyText }: Props) {
  const [mode, setMode] = useState<Mode>('serving');
  const values = mode === 'per100' && per100 ? per100 : perServing;
  const netCarbs = Math.max(0, values.carbs - values.fiber);
  const gradeColor = grade ? NUTRISCORE_COLORS[grade] : '#aad4cd';
  const verdict = grade ? NUTRISCORE_VERDICT[grade] : '—';

  const rows: Array<{ Icon: SvgIcon; label: string; value: string }> = [
    { Icon: FOOD_ICONS.calories, label: 'Calories', value: formatKcal(values.kcal) },
    { Icon: FOOD_ICONS.fat, label: 'Fat', value: `${formatGrams(values.fat)}g` },
    { Icon: FOOD_ICONS.satFat, label: 'Saturated Fat', value: `${formatGrams(values.satFat)}g` },
    { Icon: FOOD_ICONS.carbs, label: 'Carbohydrates', value: `${formatGrams(values.carbs)}g` },
    { Icon: FOOD_ICONS.sugars, label: 'Sugars', value: `${formatGrams(values.sugars)}g` },
    { Icon: FOOD_ICONS.fiber, label: 'Fiber', value: `${formatGrams(values.fiber)}g` },
    { Icon: FOOD_ICONS.netCarbs, label: 'Net Carbs', value: `${formatGrams(netCarbs)}g` },
    { Icon: FOOD_ICONS.protein, label: 'Protein', value: `${formatGrams(values.protein)}g` },
    { Icon: FOOD_ICONS.salt, label: 'Salt', value: `${formatGrams(values.salt)}g` },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.titleBlock}>
        <Text style={styles.h4}>{title}</Text>
        <Text style={styles.bodySmall}>{subtitle}</Text>
      </View>

      <View style={styles.modeTabs}>
        <ModeTab label="Per serving" active={mode === 'serving'} onPress={() => setMode('serving')} />
        {per100 && <ModeTab label="Per 100g" active={mode === 'per100'} onPress={() => setMode('per100')} />}
      </View>

      {empty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <View style={styles.rows}>
          {rows.map(({ Icon, label, value }) => (
            <View key={label} style={styles.row}>
              <View style={styles.iconWrap}>
                <Icon width={24} height={24} />
              </View>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.nutriBlock}>
        <Text style={styles.h5}>Estimated Nutri-score</Text>
        <View style={styles.nutriCard}>
          <View style={[styles.verdictPill, { backgroundColor: gradeColor }]}>
            <Text style={styles.verdictText}>{verdict}</Text>
          </View>
          <View style={styles.scaleRow}>
            {GRADES.map((g) => {
              const isActive = g === grade;
              return (
                <View
                  key={g}
                  style={[
                    styles.gradePill,
                    { backgroundColor: NUTRISCORE_COLORS[g] },
                    !isActive && styles.gradePillInactive,
                    // E in Figma has no white border
                    g === 'e' && !isActive ? { borderWidth: 0 } : null,
                  ]}
                >
                  <Text style={styles.gradeText}>{g.toUpperCase()}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function ModeTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.modeTab, active && styles.modeTabActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

/** Multiplies every value — e.g. per-serving totals to per 100g. */
export function scaleNutritionValues(v: NutritionValues, factor: number): NutritionValues {
  return {
    kcal: v.kcal * factor,
    fat: v.fat * factor,
    satFat: v.satFat * factor,
    carbs: v.carbs * factor,
    sugars: v.sugars * factor,
    fiber: v.fiber * factor,
    protein: v.protein * factor,
    salt: v.salt * factor,
  };
}

export function formatGrams(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 10) return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
}

export function formatKcal(kcal: number): string {
  if (!Number.isFinite(kcal)) return '0 kcal';
  const kj = Math.round(kcal * 4.184);
  return `${kj} kJ (${Math.round(kcal)} kcal)`;
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  titleBlock: { gap: 4 },
  h4: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  h5: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },

  modeTabs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  modeTab: {
    height: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeTabActive: { backgroundColor: '#e4f1ef', borderColor: '#aad4cd' },
  modeTabText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  modeTabTextActive: { color: Colors.primary },

  rows: { gap: 4 },
  row: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  value: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  empty: {
    backgroundColor: '#f5fbfb',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingVertical: Spacing.m,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },

  nutriBlock: { gap: 8 },
  nutriCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verdictPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  verdictText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30 },
  gradePill: {
    width: 24,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  gradePillInactive: { opacity: 0.15 },
  gradeText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
