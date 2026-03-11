// ── Shared controls for Overview + Nutrition tabs ───────────────────────────
// Extracted from scan-result.tsx — ServingToggle & WeightStepper are used in
// both the Overview (Highlighted Nutrition) and Nutrition tabs identically.

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing } from '@/constants/theme';

// ── Types ────────────────────────────────────────────────────────────────────
export type ServingMode = 'serving' | '100g';
export type DriMode = 'value' | 'dri';

// ── Serving + DRI Toggle ─────────────────────────────────────────────────────
type ServingToggleProps = {
  servingModes: ServingMode[];
  effectiveServingMode: ServingMode;
  setServingMode: (m: ServingMode) => void;
  driMode: DriMode;
  setDriMode: (m: DriMode) => void;
  servingLabel: string | null;
  baseUnit?: string;
  t: (key: string) => string;
};

export function ServingToggle({
  servingModes,
  effectiveServingMode,
  setServingMode,
  driMode,
  setDriMode,
  servingLabel,
  baseUnit = 'g',
  t,
}: ServingToggleProps) {
  return (
    <View style={s.toggleControls}>
      <View style={s.toggleRowCompact}>
        {servingModes.map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              s.overviewToggle,
              effectiveServingMode === mode && s.overviewToggleActive,
            ]}
            onPress={() => setServingMode(mode)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                s.overviewToggleText,
                effectiveServingMode === mode && s.overviewToggleTextActive,
              ]}
            >
              {mode === 'serving'
                ? servingLabel || t('toggle.perServing')
                : `Per 100${baseUnit}`}
            </Text>
            {mode === '100g' && effectiveServingMode === '100g' && (
              <Ionicons name="chevron-down" size={10} color={Colors.primary} style={{ marginLeft: 2 }} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={s.toggleRowCompact}>
        {(['value', 'dri'] as DriMode[]).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              s.overviewToggle,
              driMode === mode && s.overviewToggleActive,
            ]}
            onPress={() => setDriMode(mode)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                s.overviewToggleText,
                driMode === mode && s.overviewToggleTextActive,
              ]}
            >
              {mode === 'value' ? t('toggle.value') : t('toggle.dri')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Weight Stepper ───────────────────────────────────────────────────────────
type WeightStepperProps = {
  customWeight: number;
  setCustomWeight: React.Dispatch<React.SetStateAction<number>>;
  editingWeight: boolean;
  setEditingWeight: (v: boolean) => void;
  baseUnit?: string;
};

export function WeightStepper({
  customWeight,
  setCustomWeight,
  editingWeight,
  setEditingWeight,
  baseUnit = 'g',
}: WeightStepperProps) {
  return (
    <View style={s.weightStepper}>
      <TouchableOpacity
        style={s.weightStepBtn}
        onPress={() => setCustomWeight((w) => Math.max(5, w - 5))}
        activeOpacity={0.7}
      >
        <Text style={s.weightStepBtnText}>−</Text>
      </TouchableOpacity>
      {editingWeight ? (
        <TextInput
          style={s.weightInputText}
          keyboardType="numeric"
          value={String(customWeight)}
          onChangeText={(v) => {
            const n = parseInt(v, 10);
            if (!isNaN(n) && n > 0 && n <= 9999) setCustomWeight(n);
            else if (v === '') setCustomWeight(0);
          }}
          onBlur={() => {
            setEditingWeight(false);
            if (customWeight < 1) setCustomWeight(100);
          }}
          autoFocus
          selectTextOnFocus
          maxLength={4}
        />
      ) : (
        <TouchableOpacity onPress={() => setEditingWeight(true)} activeOpacity={0.7}>
          <Text style={s.weightValueText}>{customWeight}{baseUnit}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        style={s.weightStepBtn}
        onPress={() => setCustomWeight((w) => Math.min(9999, w + 5))}
        activeOpacity={0.7}
      >
        <Text style={s.weightStepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const STROKE_SECONDARY = '#aad4cd';

const s = StyleSheet.create({
  // Toggle controls
  toggleControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  toggleRowCompact: {
    flexDirection: 'row',
  },
  overviewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  overviewToggleActive: {
    backgroundColor: Colors.surface.tertiary,
    borderColor: STROKE_SECONDARY,
  },
  overviewToggleText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
    textAlign: 'center',
  },
  overviewToggleTextActive: {
    color: Colors.primary,
  },

  // Weight stepper
  weightStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingHorizontal: 2,
  },
  weightStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 2,
    borderColor: STROKE_SECONDARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightStepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 18,
  },
  weightValueText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
    lineHeight: 16,
    width: 68,
    textAlign: 'center',
  },
  weightInputText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 16,
    width: 68,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: Colors.accent,
    paddingVertical: 2,
  },
});
