/**
 * MealActionsSheet — the meal view, opened by tapping a meal on the
 * timeline (Figma "Tapped Meal View", 5912:15756).
 *
 * Three modes inside one Modal (a second Modal on top of this one would
 * hit the iOS double-modal freeze, see app/recipes/pick-scan.tsx):
 *   • 'actions' — the meal: name, item count, day and time, and its items.
 *                 The ⋯ button (MoreMenu — the system menu on iOS and
 *                 Android) holds Eating now / Edit / Move / Remove.
 *   • 'move'    — day picker and time card, moves this meal
 *   • 'time'    — the time wheel (MealTimeBody), back to 'move' on save
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { useToast } from '@/lib/toastContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import {
  dayAtTimeLabel,
  deleteMeal,
  moveMeal,
  normaliseTime,
  relativeDayLabel,
  setMealEaten,
  toDateKey,
} from '@/lib/mealPlan';
import { MealDayPicker } from '@/components/MealDayPicker';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import { MoreMenu } from '@/components/MoreMenu';
import type { MoreMenuAction } from '@/components/moreMenuTypes';
import { MealItemRow } from '@/components/MealItemRow';
import { FadingScrollView } from '@/components/FadingScrollView';
import { MealTimeCard } from '@/components/MealTimeCard';
import { MealTimeBody } from '@/components/MealTimeSheet';
import EditIcon from '@/assets/icons/recipe-actions/edit.svg';
import TrashIcon from '@/assets/icons/recipe-actions/trash.svg';
import TickIcon from '@/assets/icons/recipe-actions/tick.svg';
import UndoIcon from '@/assets/icons/recipe-actions/undo.svg';
import CalendarIcon from '@/assets/icons/recipe-actions/meal-plan.svg';
import type { Meal } from '@/lib/types';

type Mode = 'actions' | 'move' | 'time';

const MIN_HEIGHT_RATIO = 0.5;

interface Props {
  visible: boolean;
  /** The meal being acted on. May go null while the sheet animates out
   *  (e.g. after Remove) — the last meal is kept for the exit. */
  meal: Meal | null;
  onClose: () => void;
  /** Called after any write so the planner can refresh. */
  onChanged: () => void;
  /** Opens the full-screen builder on this meal. */
  onEdit: (meal: Meal) => void;
}


export function MealActionsSheet({ visible, meal: mealProp, onClose, onChanged, onEdit }: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
  const { showToast } = useToast();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  const { height: windowHeight } = useWindowDimensions();

  const lastMeal = useRef<Meal | null>(mealProp);
  if (mealProp) lastMeal.current = mealProp;
  const meal = mealProp ?? lastMeal.current;

  const [mode, setMode] = useState<Mode>('actions');
  const [targetDate, setTargetDate] = useState(toDateKey(new Date()));
  const [targetTime, setTargetTime] = useState('12:00');
  const [busy, setBusy] = useState(false);

  // Reset whenever the sheet opens on a meal.
  useEffect(() => {
    if (!visible) return;
    setMode('actions');
    setBusy(false);
    // Only re-run when a different meal is opened, not on every refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, mealProp?.id]);

  if (!meal) return null;

  function openMove() {
    if (!meal) return;
    const todayKey = toDateKey(new Date());
    // Free accounts only ever plan today, and nothing moves into the
    // past — the picker only lists today onwards.
    setTargetDate(!isPlus || meal.plan_date < todayKey ? todayKey : meal.plan_date);
    setTargetTime(normaliseTime(meal.meal_time));
    setMode('move');
  }

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

  async function handleConfirmMove() {
    if (!meal || busy) return;
    setBusy(true);
    const ok = await moveMeal(meal, targetDate, targetTime);
    setBusy(false);
    if (!ok) {
      showToast({ message: 'Could not update your plan. Please try again.', variant: 'error' });
      return;
    }
    onClose();
    onChanged();
    showToast({ message: `Moved to ${dayAtTimeLabel(targetDate, targetTime)}`, variant: 'success' });
  }

  const itemCount = meal.items.length;
  const eaten = Boolean(meal.eaten_at);

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
      key: 'move',
      label: 'Move',
      subtitle: 'Change the day or time',
      systemImage: 'calendar',
      Icon: CalendarIcon,
      onPress: openMove,
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
          {/* At least half the screen (the iOS "medium" sheet height), so a
              one-item meal doesn't open as a sliver. Content stays at the top. */}
          <SafeAreaView style={[styles.sheet, { minHeight: windowHeight * MIN_HEIGHT_RATIO }]} edges={['bottom']}>
            <View style={styles.handle} />

            <View style={styles.closeRow}>
              {mode !== 'actions' ? (
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setMode(mode === 'time' ? 'move' : 'actions')}
                  hitSlop={12}
                  activeOpacity={0.7}
                  accessibilityLabel="Back"
                >
                  <MenuArrowLeftIcon color={Colors.primary} size={16} />
                </TouchableOpacity>
              ) : (
                <View />
              )}
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

            {mode === 'actions' ? (
              <View style={styles.body}>
                <View style={styles.headerRow}>
                  <View style={styles.headerText}>
                    <Text style={styles.title} numberOfLines={2}>
                      {meal.name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.meta}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </Text>
                      <Text style={styles.meta}>
                        {relativeDayLabel(meal.plan_date)} at {normaliseTime(meal.meal_time)}
                      </Text>
                    </View>
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
                    <MealItemRow key={item.id} item={item} />
                  ))}
                </FadingScrollView>
              </View>
            ) : mode === 'time' ? (
              <View style={styles.timeStep}>
                <MealTimeBody
                  visible
                  value={targetTime}
                  onSave={(time) => {
                    setTargetTime(time);
                    setMode('move');
                  }}
                />
              </View>
            ) : (
              <View style={styles.body}>
                <View style={styles.titleBlock}>
                  <Text style={styles.title} numberOfLines={2}>
                    Move meal
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {meal.name}
                  </Text>
                </View>
                <MealDayPicker
                  dateKey={targetDate}
                  onChangeDate={setTargetDate}
                  isPlus={isPlus}
                  onLocked={() => {
                    onClose();
                    // Let this sheet finish closing before the upsell
                    // Modal opens (iOS double-modal freeze).
                    setTimeout(showUpsell, 350);
                  }}
                />
                <MealTimeCard time={targetTime} onPress={() => setMode('time')} />
                <TouchableOpacity
                  style={[styles.saveBtn, busy && styles.saveBtnBusy]}
                  onPress={handleConfirmMove}
                  disabled={busy}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>Move meal</Text>
                </TouchableOpacity>
              </View>
            )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 16, marginTop: 16 },
  // Figma "Frame 361": title stack + 48px ⋯ button
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  headerText: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  meta: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  items: { gap: 8 },
  timeStep: { marginTop: 8 },
  titleBlock: { gap: 4 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },


  saveBtn: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnBusy: { opacity: 0.6 },
  saveBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
