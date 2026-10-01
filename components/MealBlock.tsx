/**
 * MealBlock — a planned meal, per the Figma "Meal Plan/Meal Block"
 * component (node 5844:9149). Used on the meal planner timeline and in
 * the dashboard's meal plan list.
 *
 * States: Planned (teal bar), Eaten (tinted, tick), Caution (orange bar —
 * someone in the household should check it), Avoid (red bar — hits an
 * allergy).
 */
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { sumNutrition } from '@/lib/mealPlan';
import type { MealImpact } from '@/lib/useMealPlan';
import type { Meal } from '@/lib/types';
import EatenTickIcon from '@/assets/icons/meal-plan/eaten-tick.svg';

export function MealBlock({
  meal,
  impact,
  onPress,
  style,
  trailing,
}: {
  meal: Meal;
  impact?: MealImpact;
  onPress: () => void;
  /** Sizing from the caller — the timeline fixes the height, lists let it hug. */
  style?: StyleProp<ViewStyle>;
  /** Extra control on the right, e.g. the dashboard's ⋯ menu. */
  trailing?: React.ReactNode;
}) {
  const carbs = sumNutrition(meal.items).carbs_g;
  const eaten = Boolean(meal.eaten_at);

  // Allergy hits outrank dietary/condition cautions.
  const flagged = impact ? (impact.avoid.length > 0 ? impact.avoid : impact.caution) : [];
  const flagIsAvoid = Boolean(impact && impact.avoid.length > 0);
  const flagLabel =
    flagged.length === 0
      ? null
      : `${flagIsAvoid ? 'Not for' : 'Check for'} ${flagged[0]}${
          flagged.length > 1 ? ` +${flagged.length - 1}` : ''
        }`;

  const detail = [
    meal.meal_time,
    `${meal.items.length} ${meal.items.length === 1 ? 'item' : 'items'}`,
    carbs != null ? `${Math.round(carbs)} g carbs` : null,
    flagLabel,
  ]
    .filter(Boolean)
    .join(' · ');

  const accent = flagLabel
    ? flagIsAvoid
      ? styles.accentAvoid
      : styles.accentCaution
    : null;

  return (
    <TouchableOpacity
      style={[styles.block, eaten && styles.blockEaten, style]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={`${meal.name}, ${detail}${eaten ? ', eaten' : ''}`}
    >
      <View style={[styles.accent, accent]} />
      <View style={styles.blockText}>
        <Text style={styles.blockName} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.blockDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      {eaten && <EatenTickIcon width={20} height={20} />}
      {trailing}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 8,
    overflow: 'hidden',
    paddingLeft: 16,
    paddingRight: 12,
  },
  blockEaten: {
    backgroundColor: 'rgba(0, 200, 179, 0.1)',
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: Colors.secondary,
  },
  accentCaution: {
    backgroundColor: '#ff8736',
  },
  accentAvoid: {
    backgroundColor: Colors.status.negative,
  },
  blockText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  blockName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  blockDetail: {
    fontSize: 14,
    lineHeight: 16.8,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
  },
});
