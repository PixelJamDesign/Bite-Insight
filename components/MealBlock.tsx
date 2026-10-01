/**
 * MealBlock — a planned meal, per the Figma "Meal Plan/Meal Block"
 * component (node 5844:9149). Used on the meal planner timeline and in
 * the dashboard's meal plan list.
 *
 * States, judged for the signed-in user (lib/mealDanger.ts): Planned
 * (teal bar), Caution (orange bar) and Avoid (red bar — a poor fit on
 * average, or it hits one of their allergies). Eaten (node 5844:9128) is
 * a tinted card with a 2px teal border and a 36px teal strip with a white
 * tick down the left edge in place of the bar.
 *
 * The detail line shows the numbers that matter to the user's profile,
 * e.g. kcal and sat fat for weight loss, carbs and protein for keto.
 */
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '@/constants/theme';
import { sumNutrition } from '@/lib/mealPlan';
import { formatMetric, type MealImpact, type MealMetric } from '@/lib/mealDanger';
import type { Meal } from '@/lib/types';
import EatenTickIcon from '@/assets/icons/meal-plan/eaten-strip-tick.svg';

const DEFAULT_METRICS: MealMetric[] = ['kcal', 'carbs_g'];

export function MealBlock({
  meal,
  impact,
  metrics = DEFAULT_METRICS,
  onPress,
  style,
  trailing,
}: {
  meal: Meal;
  impact?: MealImpact;
  /** Which totals to show, most important first (useMealPlanImpact). */
  metrics?: MealMetric[];
  onPress: () => void;
  /** Sizing from the caller — the timeline fixes the height, lists let it hug. */
  style?: StyleProp<ViewStyle>;
  /** Extra control on the right, e.g. the dashboard's ⋯ menu. On an eaten
   *  meal, use the outline IconButton variant — the card is tinted. */
  trailing?: React.ReactNode;
}) {
  const totals = sumNutrition(meal.items);
  const eaten = Boolean(meal.eaten_at);
  const itemCount = `${meal.items.length} ${meal.items.length === 1 ? 'item' : 'items'}`;

  const values = metrics
    .map((m) => (totals[m] != null ? formatMetric(m, totals[m]!) : null))
    .filter(Boolean);

  // An allergy reason replaces the item count — it's the thing to see.
  const detail = [meal.meal_time, impact?.reason ?? itemCount, ...values].filter(Boolean).join(' · ');

  const accent =
    impact?.level === 'avoid' ? styles.accentAvoid : impact?.level === 'caution' ? styles.accentCaution : null;

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
        accessibilityLabel={`${meal.name}, ${detail}${eaten ? ', eaten' : ''}${
          impact?.level === 'avoid' ? ', best avoided' : impact?.level === 'caution' ? ', worth checking' : ''
        }`}
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
  // Figma draws the 2px border outside the card; here it sits inside, so
  // the padding gives back those 2px to keep the text lined up.
  blockEaten: {
    backgroundColor: '#e4f1ef', // Figma surface/tertiary
    borderWidth: 2,
    borderColor: Colors.secondary,
    paddingLeft: 46,
    paddingRight: 14,
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
