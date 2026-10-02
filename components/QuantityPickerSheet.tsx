/**
 * QuantityPickerSheet — edits the value and unit of a recipe ingredient.
 *
 * Pixel-matches Figma node 4803-25337:
 *   • 24px top-corner bottom sheet, 24px padding, white
 *   • Top handle bar + trailing close (X)
 *   • "Quantity" — Heading 3 title
 *   • Stepper: [-] [ value  unit-name ] [+]
 *       - ± buttons: 28×28 circular, #e4f1ef bg, 2px #aad4cd border
 *       - Value card: flex-1, #f5fbfb bg, 1px #aad4cd border, 8px radius
 *       - Number: Heading 3 primary; unit-name: body-large secondary
 *   • "Unit of measurement" — Heading 5 label
 *   • Unit chips: selected = mint fill + teal border + primary text;
 *                 unselected = plain secondary-teal text on transparent
 *   • Save button: full width, teal cucumber, 8px radius, 16/20 bold white
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import {
  QUANTITY_UNITS,
  UNIT_TO_ML,
  unitMeta,
  convertUnits,
  canConvert,
  snapToFractionStep,
  formatQuantityValue,
  shouldShowAsFraction,
} from '@/constants/quantityUnits';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import type { QuantityUnit } from '@/lib/types';

interface Props {
  visible: boolean;
  value: number;
  unit: QuantityUnit;
  onClose: () => void;
  onSave: (value: number, unit: QuantityUnit) => void;
  /** Sheet heading. Defaults to "Quantity". */
  title?: string;
  /** Primary button label. Defaults to "Save". */
  saveLabel?: string;
  /** Counts recipe servings instead of a weight/volume: the stepper moves
   *  in halves, the unit chips are hidden, and `unit` is passed straight
   *  back through onSave. Used by the meal planner. */
  servingsMode?: boolean;
  /** A product's serving in grams (or ml). When set, a "Servings" unit is
   *  offered first, so people can say "2 servings". */
  servingGrams?: number | null;
  /** The serving size as printed on the pack, e.g. "1 bar (45 g)". */
  servingSize?: string | null;
}

const SERVINGS_STEP = 0.5;

/**
 * The picker's contents without the sheet around it, so it can also be
 * shown as a step inside another sheet (MealBuilderSheet) — a second
 * Modal on top of an open one freezes iOS.
 */
export function QuantityPickerBody({
  visible,
  value,
  unit,
  onClose,
  onSave,
  title = 'Quantity',
  saveLabel = 'Save',
  servingsMode = false,
  servingGrams = null,
  servingSize = null,
}: Props) {
  const [localValue, setLocalValue] = useState<number>(value);
  const [localUnit, setLocalUnit] = useState<QuantityUnit>(unit);
  // Raw text the user is currently typing into the value field.
  // Kept separate from localValue so we don't fight the user's
  // intermediate input states (e.g. typing "1." or empty string).
  const [valueText, setValueText] = useState<string>('');
  const [editingValue, setEditingValue] = useState(false);
  const valueInputRef = useRef<TextInput>(null);
  useEffect(() => {
    if (visible) {
      setLocalValue(value);
      setLocalUnit(unit);
      setEditingValue(false);
      setValueText('');
    }
  }, [visible, value, unit]);

  const meta = unitMeta(localUnit);
  const shownValue = editingValue
    ? valueText
    : servingsMode
      ? String(localValue)
      : formatQuantityValue(localValue, localUnit);
  // Web inputs default to ~20 characters wide, which pushed the value and
  // unit off centre. Size the field to the text instead (native already does).
  const [valueWidth, setValueWidth] = useState<number | null>(null);
  const step = servingsMode ? SERVINGS_STEP : meta.step;

  // 0 or an empty field can't be saved — say so instead of closing.
  const [showError, setShowError] = useState(false);
  const valid = Number.isFinite(localValue) && localValue > 0;
  useEffect(() => {
    if (valid) setShowError(false);
  }, [valid]);
  useEffect(() => {
    if (visible) setShowError(false);
  }, [visible]);

  function handleSave() {
    if (valid) {
      onSave(localValue, localUnit);
    } else {
      setShowError(true);
    }
  }

  function adjust(delta: number) {
    const next = Math.max(0, localValue + delta);
    setLocalValue(next);
  }

  /**
   * When the user switches unit:
   *  - If the current + next unit are compatible (both volume, both weight,
   *    or weight↔volume), convert the value using UNIT_TO_ML (water density
   *    for weight↔volume).
   *  - If either unit is a count (unit, pack), conversion is meaningless so
   *    fall back to a sensible default.
   *  - For fractional display units (cup, tbsp, tsp) also snap the stored
   *    value to the nearest fraction glyph so what you see is what saves.
   */
  function handleUnitChange(nextUnit: QuantityUnit) {
    if (nextUnit === localUnit) return;

    // Servings ↔ weight/volume goes through the product's serving size.
    if (servingGrams && (nextUnit === 'serving' || localUnit === 'serving')) {
      const fromRatio = UNIT_TO_ML[localUnit];
      const grams =
        localUnit === 'serving' ? localValue * servingGrams : fromRatio != null ? localValue * fromRatio : null;
      const toRatio = UNIT_TO_ML[nextUnit];
      if (nextUnit === 'serving') {
        // Nearest half serving, never 0.
        setLocalValue(grams != null ? Math.max(0.5, Math.round((grams / servingGrams) * 2) / 2) : 1);
      } else if (grams != null && toRatio != null) {
        const converted = grams / toRatio;
        setLocalValue(
          shouldShowAsFraction(nextUnit) ? snapToFractionStep(converted, nextUnit) : Math.round(converted),
        );
      } else {
        setLocalValue(unitMeta(nextUnit).defaultValue);
      }
      setLocalUnit(nextUnit);
      return;
    }

    if (canConvert(localUnit, nextUnit)) {
      const converted = convertUnits(localUnit, nextUnit, localValue) ?? 0;
      const finalValue = shouldShowAsFraction(nextUnit)
        ? snapToFractionStep(converted, nextUnit)
        : converted;
      setLocalValue(finalValue);
    } else {
      const defaultValue = nextUnit === 'g' || nextUnit === 'ml' ? 100 : 1;
      setLocalValue(defaultValue);
    }
    setLocalUnit(nextUnit);
  }

  return (
            <View style={styles.body}>
              <Text style={styles.title}>{title}</Text>

              {/* Stepper row */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjust(-step)}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={16} color={Colors.secondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.valueCard, showError && styles.valueCardError]}
                  activeOpacity={0.85}
                  onPress={() => {
                    // Tapping anywhere on the card focuses the input.
                    // The TextInput itself handles the actual editing
                    // when focused — this just makes the whole card a
                    // generous tap target.
                    valueInputRef.current?.focus();
                  }}
                >
                  {Platform.OS === 'web' && (
                    <Text
                      style={[styles.valueInput, styles.valueMeasure]}
                      onLayout={(e) => setValueWidth(Math.ceil(e.nativeEvent.layout.width) + 2)}
                      aria-hidden
                    >
                      {shownValue || '0'}
                    </Text>
                  )}
                  <TextInput
                    ref={valueInputRef}
                    style={[
                      styles.valueInput,
                      Platform.OS === 'web' && valueWidth != null && { width: valueWidth },
                    ]}
                    value={shownValue}
                    onFocus={() => {
                      setEditingValue(true);
                      // Seed the field with the current numeric value
                      // (no fraction glyphs while typing — keep it
                      // straightforward decimal).
                      setValueText(
                        Number.isFinite(localValue) ? String(localValue) : '',
                      );
                      // Small timeout so selection happens after the
                      // value text update lands.
                      setTimeout(() => {
                        valueInputRef.current?.setNativeProps?.({ selection: { start: 0, end: 9999 } });
                      }, 0);
                    }}
                    onChangeText={(text) => {
                      // Allow only digits, optional decimal point.
                      const cleaned = text.replace(/[^0-9.]/g, '');
                      // Disallow more than one decimal point.
                      const parts = cleaned.split('.');
                      const sanitised = parts.length > 1
                        ? `${parts[0]}.${parts.slice(1).join('')}`
                        : cleaned;
                      setValueText(sanitised);
                      const parsed = parseFloat(sanitised);
                      if (Number.isFinite(parsed)) setLocalValue(parsed);
                    }}
                    onBlur={() => {
                      setEditingValue(false);
                      // Empty / invalid input → fall back to 0 so save
                      // logic can decide what to do (which is "skip
                      // save" if value is not > 0).
                      const parsed = parseFloat(valueText);
                      setLocalValue(Number.isFinite(parsed) ? parsed : 0);
                    }}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    selectTextOnFocus
                    underlineColorAndroid="transparent"
                  />
                  <Text style={styles.valueUnit}>
                    {servingsMode || localUnit === 'serving'
                      ? localValue === 1 ? 'serving' : 'servings'
                      : meta.label.toLowerCase()}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjust(step)}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={16} color={Colors.secondary} />
                </TouchableOpacity>
              </View>
              {showError && (
                <Text style={styles.errorText} accessibilityRole="alert">
                  Enter an amount above 0
                </Text>
              )}
              {!showError && localUnit === 'serving' && servingGrams != null && (
                <Text style={styles.servingHint}>{servingHint(localValue, servingGrams, servingSize)}</Text>
              )}

              {/* Unit of measurement */}
              {!servingsMode && (
              <View style={styles.unitSection}>
                <Text style={styles.unitLabel}>Unit of measurement</Text>
                <View style={styles.unitsWrap}>
                  {unitChoices(servingGrams).map((u) => {
                    const isActive = localUnit === u.key;
                    return (
                      <TouchableOpacity
                        key={u.key}
                        style={[styles.chip, isActive && styles.chipActive]}
                        onPress={() => handleUnitChange(u.key)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                          {u.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              )}

              {/* Save button */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>{saveLabel}</Text>
              </TouchableOpacity>
            </View>
  );
}

/** The unit chips: "Servings" first when the product's serving is known,
 *  left out otherwise. */
function unitChoices(servingGrams: number | null) {
  const others = QUANTITY_UNITS.filter((u) => u.key !== 'serving');
  return servingGrams ? [unitMeta('serving'), ...others] : others;
}

/** "60 g in all. One serving is 30 g." */
function servingHint(value: number, servingGrams: number, servingSize: string | null): string {
  const suffix = /\dml\b|\bml\b|millil/i.test(servingSize ?? '') ? 'ml' : 'g';
  const one = servingSize?.trim() || `${servingGrams} ${suffix}`;
  if (value === 1) return `One serving is ${one}.`;
  return `${Math.round(value * servingGrams)} ${suffix} in all. One serving is ${one}.`;
}

export function QuantityPickerSheet(props: Props) {
  const { visible, onClose } = props;
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <View
          style={{ width: '100%' }}
        >
          <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          {/* Grows over the keyboard instead of being lifted above it. */}
          <SafeAreaView
            style={[styles.sheet, keyboardHeight > 0 && { paddingBottom: keyboardHeight - insets.bottom + 16 }]}
            edges={['bottom']}
          >
            {/* Handle */}
            <View style={styles.handle} />

            {/* Close (X) — top-right, no background */}
            <View style={styles.closeRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <QuantityPickerBody {...props} />
          </SafeAreaView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 41, 35, 0.55)', // avocado-skin @ 55%
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 7,
    paddingBottom: 24, // breathing room above the home-indicator inset
    position: 'relative',
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
    marginTop: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    width: '100%',
  },

  // Stepper
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    paddingHorizontal: 2,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#e4f1ef',
    borderWidth: 2,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 52,
  },
  // Number + unit are plain Text components so they size to their own
  // content. The card centers the whole group via justifyContent and a
  // constant 4px gap sits between them regardless of digit count.
  // lineHeight is omitted so the font's natural baseline is used — this
  // keeps baseline alignment honest across mixed font sizes.
  valueNumber: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    includeFontPadding: false,
  },
  // Same look as valueNumber but for the inline editable TextInput.
  // textAlign:'right' so the typed value sits flush against the unit
  // label (matches the centered group when not editing).
  valueInput: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    includeFontPadding: false,
    minWidth: 40,
    textAlign: 'right',
    padding: 0,
  },
  // Off-screen copy of the value, measured to size the web input.
  valueMeasure: { position: 'absolute', opacity: 0, left: -9999 },
  valueUnit: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },

  valueCardError: { borderColor: Colors.status.negative },
  servingHint: {
    marginTop: -8,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    textAlign: 'center',
  },
  errorText: {
    marginTop: -8,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.status.negative,
    letterSpacing: -0.28,
    textAlign: 'center',
  },

  // Unit of measurement section
  unitSection: {
    width: '100%',
    gap: 16,
  },
  unitLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  unitsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 0,
  },

  // Chips (selected / unselected are two distinct states per Figma)
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
  chipActive: {
    backgroundColor: '#e4f1ef',
    borderColor: '#aad4cd',
  },
  chipText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  chipTextActive: {
    color: Colors.primary,
  },

  // Save
  saveBtn: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
