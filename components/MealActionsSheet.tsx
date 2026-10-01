/**
 * MealActionsSheet — the meal view, opened by tapping a meal on the
 * timeline (Figma "Tapped Meal View", 5912:15756): name, item count, day
 * and time, and the meal's items.
 *
 * The ⋯ button (MoreMenu — the system menu on iOS and Android, a sheet on
 * web) holds Eating now / Edit meal / Remove from plan. Changing the day
 * or time is done through Edit meal.
 *
 * The line under the title carries what the meal card may have to cut:
 * item count, day and time, the user's key numbers (same as MealBlock)
 * and, for an allergy hit, the reason.
 *
 * Tapping an item calls onOpenItem; the planner opens the product (or
 * recipe) page and brings this sheet back when the user comes back.
 */
import { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { useToast } from '@/lib/toastContext';
import { deleteMeal, normaliseTime, relativeDayLabel, setMealEaten, sumNutrition } from '@/lib/mealPlan';
import { formatMetric, type MealImpact, type MealMetric } from '@/lib/mealDanger';
import { MoreMenu } from '@/components/MoreMenu';
import type { MoreMenuAction } from '@/components/moreMenuTypes';
import { MealItemRow } from '@/components/MealItemRow';
import { FadingScrollView } from '@/components/FadingScrollView';
import EditIcon from '@/assets/icons/recipe-actions/edit.svg';
import TrashIcon from '@/assets/icons/recipe-actions/trash.svg';
import TickIcon from '@/assets/icons/recipe-actions/tick.svg';
import UndoIcon from '@/assets/icons/recipe-actions/undo.svg';
import type { Meal, MealPlanEntry } from '@/lib/types';

/** At least half the screen (the iOS "medium" sheet height), so a
 *  one-item meal doesn't open as a sliver. */
const MIN_HEIGHT_RATIO = 0.5;

interface Props {
  visible: boolean;
  /** The meal being viewed. May go null while the sheet animates out
   *  (e.g. after Remove) — the last meal is kept for the exit. */
  meal: Meal | null;
  onClose: () => void;
  /** Called after any write so the planner can refresh. */
  onChanged: () => void;
  /** Opens the builder on this meal. */
  onEdit: (meal: Meal) => void;
  /** An item was tapped — show its product or recipe page. */
  onOpenItem: (item: MealPlanEntry) => void;
  /** How the meal sits with the user (useMealPlanImpact). */
  impact?: MealImpact;
  /** The numbers that matter to the user, as on the meal card. */
  metrics?: MealMetric[];
}

export function MealActionsSheet({
  visible,
  meal: mealProp,
  onClose,
  onChanged,
  onEdit,
  onOpenItem,
  impact,
  metrics = ['kcal', 'carbs_g'],
}: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
  const { showToast } = useToast();
  const { height: windowHeight } = useWindowDimensions();

  const lastMeal = useRef<Meal | null>(mealProp);
  if (mealProp) lastMeal.current = mealProp;
  const meal = mealProp ?? lastMeal.current;

  if (!meal) return null;

  async function handleToggleEaten() {
    if (!meal) return;
    const next = !meal.eaten_at;
    onClose();
    const ok = await setMealEaten(meal.id, next);
    if (ok) onChanged();
    else showToast({ message: 'Could not update this meal. Please try again.', variant: 'error' });
  }

  function handleEdit() {
    if (!meal) return;
    onClose();
    onEdit(meal);
  }

  async function handleRemove() {
    if (!meal) return;
    onClose();
    const ok = await deleteMeal(meal.id);
    if (ok) {
      onChanged();
      showToast({ message: `Removed "${meal.name}" from your plan`, variant: 'info' });
    } else {
      showToast({ message: 'Could not remove this meal. Please try again.', variant: 'error' });
    }
  }

  const itemCount = meal.items.length;
  const eaten = Boolean(meal.eaten_at);
  const totals = sumNutrition(meal.items);
  const details = [
    `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
    `${relativeDayLabel(meal.plan_date)} at ${normaliseTime(meal.meal_time)}`,
    ...metrics.map((m) => (totals[m] != null ? formatMetric(m, totals[m]!) : null)),
  ].filter((d): d is string => Boolean(d));

  const menuActions: MoreMenuAction[] = [
    {
      key: 'eaten',
      label: eaten ? 'Mark as not eaten' : 'Eating now',
      subtitle: eaten ? 'Put this back to planned' : 'Log this meal with the current time',
      systemImage: eaten ? 'arrow.uturn.backward' : 'checkmark.circle',
      Icon: eaten ? UndoIcon : TickIcon,
      onPress: handleToggleEaten,
    },
    {
      key: 'edit',
      label: 'Edit meal',
      subtitle: 'Change the time, items or portions',
      systemImage: 'pencil',
      Icon: EditIcon,
      iconSize: 20,
      onPress: handleEdit,
    },
    {
      key: 'remove',
      label: 'Remove from plan',
      subtitle: 'Takes this meal off the day',
      systemImage: 'trash',
      Icon: TrashIcon,
      destructive: true,
      onPress: handleRemove,
    },
  ];

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <SafeAreaView
            style={[styles.sheet, { minHeight: windowHeight * MIN_HEIGHT_RATIO }]}
            edges={['bottom']}
          >
            <View style={styles.handle} />

            <View style={styles.closeRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                activeOpacity={0.7}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <View style={styles.headerRow}>
                <View style={styles.headerText}>
                  <Text style={styles.title} numberOfLines={2}>
                    {meal.name}
                  </Text>
                  <View style={styles.metaRow}>
                    {details.map((d) => (
                      <Text key={d} style={styles.meta}>
                        {d}
                      </Text>
                    ))}
                  </View>
                  {impact?.reason ? (
                    <Text style={[styles.meta, impact.level === 'avoid' ? styles.reasonAvoid : styles.reasonCaution]}>
                      {impact.reason}
                    </Text>
                  ) : null}
                </View>
                <MoreMenu
                  size="regular"
                  variant="onWhite"
                  title={meal.name}
                  actions={menuActions}
                  accessibilityLabel={`Actions for ${meal.name}`}
                />
              </View>

              <FadingScrollView
                style={{ maxHeight: windowHeight * 0.6 }}
                contentContainerStyle={styles.items}
                showsVerticalScrollIndicator={false}
              >
                {meal.items.map((item) => (
                  <MealItemRow key={item.id} item={item} onPress={() => onOpenItem(item)} />
                ))}
              </FadingScrollView>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 7,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 110,
    height: 6,
    borderRadius: 93,
    backgroundColor: '#d9d9d9',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 16, marginTop: 16 },
  // Figma "Frame 361": title stack + 48px ⋯ button
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headerText: { flex: 1 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  // Wraps onto a second line when the numbers don't fit beside the time.
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 16 },
  meta: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  reasonAvoid: { color: Colors.status.negative, fontFamily: 'Figtree_700Bold', fontWeight: '700' },
  reasonCaution: { color: '#c2581c', fontFamily: 'Figtree_700Bold', fontWeight: '700' },
  items: { gap: 8 },
});
