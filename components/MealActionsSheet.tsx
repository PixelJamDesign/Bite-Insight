/**
 * MealActionsSheet — bottom sheet opened by tapping a meal on the timeline.
 *
 * Three modes inside one Modal (a second Modal on top of this one would
 * hit the iOS double-modal freeze, see app/recipes/pick-scan.tsx):
 *   • 'actions' — Eating now / Edit meal / Move / Plan this again / Remove
 *   • 'move'    — day picker, moves this meal
 *   • 'copy'    — day picker, plans a fresh copy
 *
 * Row styling follows RecipeActionsSheet.
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toastContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import {
  addDays,
  copyMeal,
  dayAtTimeLabel,
  deleteMeal,
  moveMeal,
  relativeDayLabel,
  setMealEaten,
  toDateKey,
} from '@/lib/mealPlan';
import { MealDayPicker } from '@/components/MealDayPicker';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import EditIcon from '@/assets/icons/recipe-actions/edit.svg';
import DuplicateIcon from '@/assets/icons/recipe-actions/duplicate.svg';
import TrashIcon from '@/assets/icons/recipe-actions/trash.svg';
import type { Meal } from '@/lib/types';

type Mode = 'actions' | 'move' | 'copy';

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

const SPRING_WATER = '#e2f1ee';
const DESTRUCTIVE_TINT = 'rgba(255, 47, 97, 0.1)';

export function MealActionsSheet({ visible, meal: mealProp, onClose, onChanged, onEdit }: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
  const { session } = useAuth();
  const { showToast } = useToast();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();

  const lastMeal = useRef<Meal | null>(mealProp);
  if (mealProp) lastMeal.current = mealProp;
  const meal = mealProp ?? lastMeal.current;

  const [mode, setMode] = useState<Mode>('actions');
  const [targetDate, setTargetDate] = useState(toDateKey(new Date()));
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

  function openPicker(next: 'move' | 'copy') {
    if (!meal) return;
    const todayKey = toDateKey(new Date());
    if (!isPlus) {
      // Free accounts only ever plan today.
      setTargetDate(todayKey);
    } else if (next === 'move') {
      // Can't move into the past — the picker only lists today onwards.
      setTargetDate(meal.plan_date >= todayKey ? meal.plan_date : todayKey);
    } else {
      setTargetDate(meal.plan_date === todayKey ? toDateKey(addDays(new Date(), 1)) : todayKey);
    }
    setMode(next);
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

  async function handleConfirmPicker() {
    const userId = session?.user?.id;
    if (!meal || !userId || busy) return;
    setBusy(true);
    const ok =
      mode === 'move'
        ? await moveMeal(meal, targetDate)
        : Boolean(await copyMeal(userId, meal, targetDate));
    setBusy(false);
    if (!ok) {
      showToast({ message: 'Could not update your plan. Please try again.', variant: 'error' });
      return;
    }
    onClose();
    onChanged();
    const where = dayAtTimeLabel(targetDate, meal.meal_time);
    showToast({
      message: mode === 'move' ? `Moved to ${where}` : `Added to ${where}`,
      variant: 'success',
    });
  }

  const itemCount = meal.items.length;

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.handle} />

            <View style={styles.closeRow}>
              {mode !== 'actions' ? (
                <TouchableOpacity
                  style={styles.backLink}
                  onPress={() => setMode('actions')}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <MenuArrowLeftIcon color={Colors.secondary} size={16} />
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>
              ) : (
                <View />
              )}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <View style={styles.titleBlock}>
                <Text style={styles.title} numberOfLines={2}>
                  {mode === 'move' ? 'Move meal' : mode === 'copy' ? 'Plan this again' : meal.name}
                </Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {mode === 'actions'
                    ? `${relativeDayLabel(meal.plan_date)} · ${meal.meal_time} · ${itemCount} ${
                        itemCount === 1 ? 'item' : 'items'
                      }`
                    : `${meal.name} · ${meal.meal_time}`}
                </Text>
              </View>

              {mode === 'actions' ? (
                <View style={styles.rows}>
                  <ActionRow
                    icon={
                      <Ionicons
                        name={meal.eaten_at ? 'arrow-undo-outline' : 'checkmark'}
                        size={22}
                        color={Colors.primary}
                      />
                    }
                    tint={SPRING_WATER}
                    title={meal.eaten_at ? 'Mark as not eaten' : 'Eating now'}
                    subtitle={
                      meal.eaten_at ? 'Put this back to planned' : 'Log this meal with the current time'
                    }
                    onPress={handleToggleEaten}
                  />
                  <ActionRow
                    icon={<EditIcon width={20} height={20} />}
                    tint={SPRING_WATER}
                    title="Edit meal"
                    subtitle="Change the time, items or portions"
                    onPress={handleEdit}
                  />
                  <ActionRow
                    icon={<Ionicons name="calendar-outline" size={22} color={Colors.primary} />}
                    tint={SPRING_WATER}
                    title="Move"
                    subtitle="Shift it to another day"
                    onPress={() => openPicker('move')}
                  />
                  <ActionRow
                    icon={<DuplicateIcon width={22} height={22} />}
                    tint={SPRING_WATER}
                    title="Plan this again"
                    subtitle="Add the same meal to another day"
                    onPress={() => openPicker('copy')}
                  />
                  <ActionRow
                    icon={<TrashIcon width={22} height={22} />}
                    tint={DESTRUCTIVE_TINT}
                    title="Remove from plan"
                    subtitle="Takes this meal off the day"
                    onPress={handleRemove}
                  />
                </View>
              ) : (
                <>
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
                  <TouchableOpacity
                    style={[styles.saveBtn, busy && styles.saveBtnBusy]}
                    onPress={handleConfirmPicker}
                    disabled={busy}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.saveBtnText}>
                      {mode === 'move' ? 'Move meal' : 'Add to plan'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ActionRow({
  icon,
  tint,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>{icon}</View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
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
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  body: { gap: 24, marginTop: 8 },
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

  rows: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: 4 },
  rowTitle: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  rowSub: {
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
