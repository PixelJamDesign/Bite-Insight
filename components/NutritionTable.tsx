/**
 * NutritionTable — reusable per-nutrient table matching the design used
 * on the scan-result screen (food icons + label + value + rating).
 *
 * Usage:
 *   <NutritionTable
 *     valuesPer100g={{ energyKcal: 485, fat: 12, sugars: 8, ... }}
 *     thresholds={thresholds}          // optional — defaults to DEFAULT_THRESHOLDS
 *     showRating                       // default true
 *     keys={['energyKcal','proteins','carbs','fat']}   // optional subset
 *   />
 *
 * Values must be expressed per 100g of the food so that ratings align with
 * the threshold system (same as scan-result). Callers with per-serving
 * totals should convert before passing in.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import {
  DEFAULT_THRESHOLDS,
  NUTRIENT_LABELS,
  NUTRIENT_UNITS,
  fmtVal,
  getRating,
  type NutrientKey,
  type Threshold,
} from '@/lib/nutrientRatings';

// Food nutrition icons (same set as scan-result)
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

const DEFAULT_KEYS: NutrientKey[] = [
  'energyKcal',
  'proteins',
  'carbs',
  'sugars',
  'fiber',
  'fat',
  'saturatedFat',
  'salt',
];

export interface NutritionTableProps {
  /** Raw numeric values per 100g for each nutrient (missing keys are skipped) */
  valuesPer100g: Partial<Record<NutrientKey, number | null | undefined>>;
  /** Which nutrients to render, in display order. Defaults to a sensible set. */
  keys?: NutrientKey[];
  /** Threshold overrides — defaults to DEFAULT_THRESHOLDS */
  thresholds?: Record<NutrientKey, Threshold>;
  /** Optional label overrides (e.g. translated strings). Defaults to NUTRIENT_LABELS. */
  labels?: Partial<Record<NutrientKey, string>>;
  /** If false, hides the rating badge on the right */
  showRating?: boolean;
}

export function NutritionTable({
  valuesPer100g,
  keys = DEFAULT_KEYS,
  thresholds = DEFAULT_THRESHOLDS,
  labels,
  showRating = true,
}: NutritionTableProps) {
  const effectiveLabels = { ...NUTRIENT_LABELS, ...(labels ?? {}) };

  return (
    <View style={styles.rows}>
      {keys.map((key) => {
        const value = valuesPer100g[key];
        if (value == null || !Number.isFinite(value)) return null;

        const unit = NUTRIENT_UNITS[key];
        const display = fmtVal(String(value), unit);
        const rating = showRating ? getRating(key, value, thresholds) : null;
        const IconComp = FoodIcons[key];

        return (
          <View key={key} style={styles.row}>
            <View style={styles.left}>
              <View style={styles.iconBox}>
                <IconComp width={32} height={32} />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {effectiveLabels[key]}
              </Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.value}>{display}</Text>
              {rating && (
                <Text style={[styles.rating, { color: rating.color }]} numberOfLines={1}>
                  {rating.label}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: Spacing.xs, // 8px between rows
  },
  row: {
    backgroundColor: '#f5fbfb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: Spacing.s,
    paddingVertical: 12,
    gap: Spacing.s,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 20,
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.s,
    flexShrink: 0,
  },
  value: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 20,
    textAlign: 'right',
  },
  rating: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    textAlign: 'right',
    minWidth: 72,
  },
});
