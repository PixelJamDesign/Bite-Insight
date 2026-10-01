/**
 * MealBlock — a planned meal, per the Figma "Meal Plan/Meal Block"
 * component (node 5844:9149). Used on the meal planner timeline and in
 * the dashboard's meal plan list.
 *
 * States: Planned (teal bar), Caution (orange bar — someone in the
 * household should check it), Avoid (red bar — hits an allergy) and Eaten
 * (node 5844:9128): tinted card with a 36px teal strip and white tick down
 * the left edge in place of the bar.
 */
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { sumNutrition } from '@/lib/mealPlan';
import type { MealImpact } from '@/lib/useMealPlan';
import type { Meal } from '@/lib/types';
import EatenTickIcon from '@/assets/icons/meal-plan/eaten-strip-tick.svg';

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
  /** Extra control on the right, e.g. the dashboard's ⋯ menu. On an eaten
   *  meal, use the outline IconButton variant — the card is tinted. */
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
    <View style={[styles.block, eaten && styles.blockEaten, style]}>
      {eaten ? (
        <View style={styles.eatenStrip}>
          <EatenTickIcon width={24} height={24} />
        </View>
      ) : (
        <View style={[styles.accent, accent]} />
      )}
      <TouchableOpacity
        style={styles.blockTap}
        onPress={onPress}
        activeOpacity={0.8}
        accessibilityLabel={`${meal.name}, ${detail}${eaten ? ', eaten' : ''}`}
      >
      <View style={styles.blockText}>
        <Text style={styles.blockName} numberOfLines={1}>
          {meal.name}
        </Text>
        <Text style={styles.blockDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
    </TouchableOpacity>
    {/* Outside the card's tap area so its own taps (e.g. a native menu)
        aren't swallowed by the card. */}
    {trailing}
    </View>
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
    paddingLeft: 24,
    paddingRight: 16,
  },
  // Fills the block (minus any trailing control) so the whole card stays tappable.
  blockTap: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockEaten: {
    backgroundColor: '#e4f1ef', // Figma surface/tertiary
    paddingLeft: 48,
  },
  eatenStrip: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 36,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
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
