/**
 * MealDayPicker — day chips (today + the next 13 days), with an optional
 * row of meal presets (Breakfast 08:00, Lunch 12:30, ...).
 *
 * Not a sheet itself: it's embedded in MealActionsSheet's move / copy
 * modes and in AddToMealPlanSheet.
 *
 * Free accounts can only plan today. Any other day shows a small Plus
 * marker and calls onLocked (the caller opens the upsell) instead of
 * selecting.
 *
 * Chips follow the in-sheet option chip pattern from QuantityPickerSheet.
 */
import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Colors } from '@/constants/theme';
import { MEAL_PRESETS, addDays, relativeDayLabel, toDateKey } from '@/lib/mealPlan';

const DAYS_AHEAD = 14;

interface Props {
  dateKey: string;
  onChangeDate: (dateKey: string) => void;
  /** When false, only today can be chosen. */
  isPlus: boolean;
  /** Called when a free user taps a day other than today. */
  onLocked: () => void;
  /** Pass both to show the preset row. */
  presetTime?: string;
  onChangePreset?: (time: string) => void;
}

export function MealDayPicker({
  dateKey,
  onChangeDate,
  isPlus,
  onLocked,
  presetTime,
  onChangePreset,
}: Props) {
  const todayKey = toDateKey(new Date());
  const dayKeys = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DAYS_AHEAD }, (_, i) => toDateKey(addDays(today, i)));
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <Text style={styles.groupLabel}>Day</Text>
        {/* Negative margin lets the chips scroll edge to edge inside the
            sheet's 24px padding. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayScroll}
          contentContainerStyle={styles.dayScrollContent}
        >
          {dayKeys.map((key) => {
            const active = key === dateKey;
            const locked = !isPlus && key !== todayKey;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => (locked ? onLocked() : onChangeDate(key))}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                    locked && styles.chipTextLocked,
                  ]}
                >
                  {relativeDayLabel(key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!isPlus && (
          <Text style={styles.lockedNote}>Planning ahead comes with Plus.</Text>
        )}
      </View>

      {presetTime != null && onChangePreset && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Meal</Text>
          <View style={styles.presetRow}>
            {MEAL_PRESETS.map((preset) => {
              const active = preset.time === presetTime;
              return (
                <TouchableOpacity
                  key={preset.time}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => onChangePreset(preset.time)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 16 },
  group: { gap: 8 },
  groupLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  dayScroll: { marginHorizontal: -24 },
  dayScrollContent: { paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 4 },
  chip: {
    height: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipActive: { backgroundColor: '#e4f1ef', borderColor: '#aad4cd' },
  chipText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  chipTextActive: { color: Colors.primary },
  chipTextLocked: { opacity: 0.45 },
  lockedNote: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
});
