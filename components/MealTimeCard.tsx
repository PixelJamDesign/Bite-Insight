/**
 * MealTimeCard — the "Time / When do you plan to eat?" card with the time
 * in a white box (Figma Plan a meal, 5909:14457). Tapping it opens the
 * time picker; the caller decides how (a step in its sheet).
 *
 * Used by the Plan a meal sheet and the meal view's Move step.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { normaliseTime } from '@/lib/mealPlan';

interface Props {
  /** 'HH:MM' */
  time: string;
  onPress: () => void;
  /** Supporting line under "Time". */
  caption?: string;
}

export function MealTimeCard({ time, onPress, caption = 'When do you plan to eat?' }: Props) {
  const shown = normaliseTime(time);
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Time, ${shown}. Change`}
    >
      <View style={styles.text}>
        <Text style={styles.title}>Time</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{shown}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  text: { flex: 1, gap: 4 },
  title: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  caption: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  // Figma time "Tab": white, teal stroke, 109 wide
  timeBox: {
    width: 109,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
});
