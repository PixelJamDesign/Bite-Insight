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
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import {
  QUANTITY_UNITS,
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
}

export function QuantityPickerSheet({ visible, value, unit, onClose, onSave }: Props) {
  const [localValue, setLocalValue] = useState<number>(value);
  const [localUnit, setLocalUnit] = useState<QuantityUnit>(unit);
  // Raw text the user is currently typing into the value field.
  // Kept separate from localValue so we don't fight the user's
  // intermediate input states (e.g. typing "1." or empty string).
  const [valueText, setValueText] = useState<string>('');
  const [editingValue, setEditingValue] = useState(false);
  const valueInputRef = useRef<TextInput>(null);
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  useEffect(() => {
    if (visible) {
      setLocalValue(value);
      setLocalUnit(unit);
      setEditingValue(false);
      setValueText('');
    }
  }, [visible, value, unit]);

  const meta = unitMeta(localUnit);

  function handleSave() {
    if (Number.isFinite(localValue) && localValue > 0) {
      onSave(localValue, localUnit);
    } else {
      onClose();
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
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
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

            {/* Body */}
            <View style={styles.body}>
              <Text style={styles.title}>Quantity</Text>

              {/* Stepper row */}
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjust(-meta.step)}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={16} color={Colors.secondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.valueCard}
                  activeOpacity={0.85}
                  onPress={() => {
                    // Tapping anywhere on the card focuses the input.
                    // The TextInput itself handles the actual editing
                    // when focused — this just makes the whole card a
                    // generous tap target.
                    valueInputRef.current?.focus();
                  }}
                >
                  <TextInput
                    ref={valueInputRef}
                    style={styles.valueInput}
                    value={
                      editingValue
                        ? valueText
                        : formatQuantityValue(localValue, localUnit)
                    }
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
                  <Text style={styles.valueUnit}>{meta.label.toLowerCase()}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => adjust(meta.step)}
                  activeOpacity={0.7}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={16} color={Colors.secondary} />
                </TouchableOpacity>
              </View>

              {/* Unit of measurement */}
              <View style={styles.unitSection}>
                <Text style={styles.unitLabel}>Unit of measurement</Text>
                <View style={styles.unitsWrap}>
                  {QUANTITY_UNITS.map((u) => {
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

              {/* Save button */}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
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
    ...StyleSheet.absoluteFillObject,
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
  valueUnit: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.5,
    includeFontPadding: false,
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
