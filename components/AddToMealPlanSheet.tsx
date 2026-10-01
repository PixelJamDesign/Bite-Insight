/**
 * AddToMealPlanSheet — plans a recipe as a meal of its own: pick a day,
 * a meal preset (which sets the time) and how many servings.
 * Opened from the recipe detail screen's actions.
 *
 * Free accounts can only add to today; other days open the Plus upsell.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toastContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import {
  MEAL_PRESETS,
  dayAtTimeLabel,
  defaultMealName,
  draftItemFromRecipe,
  nowRoundedTime,
  saveMeal,
  timeToMinutes,
  toDateKey,
} from '@/lib/mealPlan';
import { MealDayPicker } from '@/components/MealDayPicker';
import type { Recipe } from '@/lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  recipe: Recipe;
}

const SERVINGS_STEP = 0.5;

/** The preset whose time is closest to now. */
function presetForNow(): string {
  const now = timeToMinutes(nowRoundedTime());
  return MEAL_PRESETS.reduce((best, p) =>
    Math.abs(timeToMinutes(p.time) - now) < Math.abs(timeToMinutes(best.time) - now) ? p : best,
  ).time;
}

export function AddToMealPlanSheet({ visible, onClose, recipe }: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
  const { session } = useAuth();
  const { showToast } = useToast();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();

  const [dateKey, setDateKey] = useState(toDateKey(new Date()));
  const [time, setTime] = useState(presetForNow());
  const [servings, setServings] = useState(1);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDateKey(toDateKey(new Date()));
    setTime(presetForNow());
    setServings(1);
    setBusy(false);
  }, [visible]);

  async function handleAdd() {
    const userId = session?.user?.id;
    if (!userId || busy) return;
    setBusy(true);
    const mealId = await saveMeal(userId, {
      dateKey,
      time,
      name: defaultMealName(time),
      items: [draftItemFromRecipe(recipe, servings)],
    });
    setBusy(false);
    if (!mealId) {
      showToast({ message: 'Could not add to your plan. Please try again.', variant: 'error' });
      return;
    }
    onClose();
    showToast({
      message: `Added to ${dayAtTimeLabel(dateKey, time)}`,
      variant: 'success',
      action: {
        label: 'View',
        onPress: () => router.push({ pathname: '/meal-plan', params: { date: dateKey } } as never),
      },
    });
  }

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
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <View style={styles.titleBlock}>
                <Text style={styles.title}>Add to meal plan</Text>
                <Text style={styles.subtitle} numberOfLines={1}>
                  {recipe.name}
                </Text>
              </View>

              <MealDayPicker
                dateKey={dateKey}
                onChangeDate={setDateKey}
                isPlus={isPlus}
                onLocked={() => {
                  onClose();
                  // Let this sheet finish closing before the upsell Modal
                  // opens (iOS double-modal freeze).
                  setTimeout(showUpsell, 350);
                }}
                presetTime={time}
                onChangePreset={setTime}
              />

              {/* Servings stepper — same controls as QuantityPickerSheet */}
              <View style={styles.servingsRow}>
                <Text style={styles.servingsLabel}>Servings</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepBtn, servings <= SERVINGS_STEP && styles.stepBtnDisabled]}
                    onPress={() => setServings((v) => Math.max(SERVINGS_STEP, v - SERVINGS_STEP))}
                    disabled={servings <= SERVINGS_STEP}
                    activeOpacity={0.7}
                    hitSlop={8}
                    accessibilityLabel="Fewer servings"
                  >
                    <Ionicons name="remove" size={16} color={Colors.secondary} />
                  </TouchableOpacity>
                  <Text style={styles.servingsValue}>{servings}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => setServings((v) => v + SERVINGS_STEP)}
                    activeOpacity={0.7}
                    hitSlop={8}
                    accessibilityLabel="More servings"
                  >
                    <Ionicons name="add" size={16} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, busy && styles.saveBtnBusy]}
                onPress={handleAdd}
                disabled={busy}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Add to plan</Text>
              </TouchableOpacity>
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
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
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
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingsLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#aad4cd',
    backgroundColor: '#e4f1ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { opacity: 0.4 },
  servingsValue: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
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
