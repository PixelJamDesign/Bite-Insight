/**
 * NutritionModeToggle — reuses the scan-result toggle styling for switching
 * between per-serving and per-100g nutrition views. Simpler than the full
 * ServingToggle in NutritionControls (no DRI mode, no translation key).
 */
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

export type NutritionMode = 'serving' | '100g';

interface Props {
  mode: NutritionMode;
  onChange: (mode: NutritionMode) => void;
  /** Optional override for the "serving" pill label — e.g. "Per serving (4)" */
  servingLabel?: string;
  /** Base unit for the 100g pill (g or ml). Defaults to 'g'. */
  baseUnit?: 'g' | 'ml';
}

const MODES: NutritionMode[] = ['serving', '100g'];

export function NutritionModeToggle({
  mode,
  onChange,
  servingLabel,
  baseUnit = 'g',
}: Props) {
  return (
    <View style={styles.wrap}>
      {MODES.map((m) => {
        const isActive = mode === m;
        const label =
          m === 'serving'
            ? servingLabel || 'Per serving'
            : `Per 100${baseUnit}`;
        return (
          <TouchableOpacity
            key={m}
            style={[styles.pill, isActive && styles.pillActive]}
            onPress={() => onChange(m)}
            activeOpacity={0.75}
          >
            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 999,
    padding: 4,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: Spacing.s,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  pillTextActive: {
    color: Colors.primary,
  },
});
