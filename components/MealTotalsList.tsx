/**
 * MealTotalsList — the stack of nutrition total rows (calories, carbs,
 * sugars, fibre, protein, fat, salt) used by the meal builder and the
 * day overview. Each row is individually styled, per the Macro Stack.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import type { MealNutrition } from '@/lib/types';

/* eslint-disable @typescript-eslint/no-require-imports */
type SvgIcon = React.FC<{ width?: number; height?: number }>;
const FoodIcons = {
  kcal: require('@/assets/icons/food/calories.svg').default as SvgIcon,
  carbs: require('@/assets/icons/food/carbs.svg').default as SvgIcon,
  sugars: require('@/assets/icons/food/sugars.svg').default as SvgIcon,
  fiber: require('@/assets/icons/food/fiber.svg').default as SvgIcon,
  protein: require('@/assets/icons/food/protein.svg').default as SvgIcon,
  fat: require('@/assets/icons/food/fat.svg').default as SvgIcon,
  salt: require('@/assets/icons/food/salt.svg').default as SvgIcon,
};
/* eslint-enable @typescript-eslint/no-require-imports */

const TOTAL_ROWS: Array<{ key: keyof MealNutrition; label: string; unit: string; Icon: SvgIcon }> = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', Icon: FoodIcons.kcal },
  { key: 'carbs_g', label: 'Carbs', unit: 'g', Icon: FoodIcons.carbs },
  { key: 'sugars_g', label: 'Sugars', unit: 'g', Icon: FoodIcons.sugars },
  { key: 'fiber_g', label: 'Fibre', unit: 'g', Icon: FoodIcons.fiber },
  { key: 'protein_g', label: 'Protein', unit: 'g', Icon: FoodIcons.protein },
  { key: 'fat_g', label: 'Fat', unit: 'g', Icon: FoodIcons.fat },
  { key: 'salt_g', label: 'Salt', unit: 'g', Icon: FoodIcons.salt },
];

function formatTotal(value: number | undefined, unit: string): string {
  if (value == null) return '–';
  const shown = unit === 'kcal' ? Math.round(value) : Math.round(value * 10) / 10;
  return `${shown} ${unit}`;
}

export function MealTotalsList({ totals }: { totals: MealNutrition }) {
  return (
    <View style={styles.totals}>
      {TOTAL_ROWS.map(({ key, label, unit, Icon }) => (
        <View key={key} style={styles.totalRow}>
          <View style={styles.totalIcon}>
            <Icon width={24} height={24} />
          </View>
          <Text style={styles.totalLabel}>{label}</Text>
          <Text style={styles.totalValue}>{formatTotal(totals[key], unit)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  totals: { gap: 4 },
  totalRow: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    gap: 16,
  },
  totalIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  totalValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
