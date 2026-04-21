/**
 * QuantityPickerSheet — edits the value and unit of a recipe ingredient.
 * Placeholder UI.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { QUANTITY_UNITS, unitMeta } from '@/constants/quantityUnits';
import type { QuantityUnit } from '@/lib/types';

interface Props {
  visible: boolean;
  value: number;
  unit: QuantityUnit;
  onClose: () => void;
  onSave: (value: number, unit: QuantityUnit) => void;
}

export function QuantityPickerSheet({ visible, value, unit, onClose, onSave }: Props) {
  const [localValue, setLocalValue] = useState(String(value));
  const [localUnit, setLocalUnit] = useState<QuantityUnit>(unit);

  useEffect(() => {
    if (visible) {
      setLocalValue(String(value));
      setLocalUnit(unit);
    }
  }, [visible, value, unit]);

  const meta = unitMeta(localUnit);

  function handleSave() {
    const num = parseFloat(localValue);
    if (Number.isFinite(num) && num > 0) {
      onSave(num, localUnit);
    } else {
      onClose();
    }
  }

  function adjust(delta: number) {
    const num = parseFloat(localValue);
    const next = Math.max(0, (Number.isFinite(num) ? num : 0) + delta);
    setLocalValue(next.toFixed(meta.precision));
  }

  /**
   * When the user switches unit, reset the value to a sensible default:
   *   - Units / Packs → 1 (you're counting items)
   *   - Everything else (g, ml, tbsp, tsp, cup) → 100
   */
  function handleUnitChange(nextUnit: QuantityUnit) {
    setLocalUnit(nextUnit);
    const defaultValue = nextUnit === 'unit' || nextUnit === 'pack' ? 1 : 100;
    const nextMeta = QUANTITY_UNITS.find((u) => u.key === nextUnit);
    setLocalValue(defaultValue.toFixed(nextMeta?.precision ?? 0));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Quantity</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Value stepper */}
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => adjust(-meta.step)}
            >
              <Ionicons name="remove" size={22} color={Colors.secondary} />
            </TouchableOpacity>
            <TextInput
              style={styles.valueInput}
              value={localValue}
              onChangeText={setLocalValue}
              keyboardType="decimal-pad"
              textAlign="center"
            />
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => adjust(meta.step)}
            >
              <Ionicons name="add" size={22} color={Colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Unit picker */}
          <Text style={styles.unitLabel}>Unit</Text>
          <View style={styles.unitsWrap}>
            {QUANTITY_UNITS.map((u) => (
              <TouchableOpacity
                key={u.key}
                style={[styles.unitPill, localUnit === u.key && styles.unitPillActive]}
                onPress={() => handleUnitChange(u.key)}
              >
                <Text
                  style={[
                    styles.unitPillText,
                    localUnit === u.key && styles.unitPillTextActive,
                  ]}
                >
                  {u.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Shadows.level3,
    paddingBottom: Spacing.m,   // breathing room above the safe-area inset
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cdd8d6',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
  },
  title: {
    ...Typography.h4,
    color: Colors.primary,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  stepperBtn: {
    width: 48, height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    paddingVertical: 10,
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
  },
  unitLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.m,
    marginBottom: 8,
  },
  unitsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: Spacing.m,
    marginBottom: Spacing.s,
  },
  unitPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
  },
  unitPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  unitPillText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  unitPillTextActive: {
    color: '#fff',
  },
  saveBtn: {
    marginHorizontal: Spacing.s,
    backgroundColor: Colors.primary,
    borderRadius: Radius.m,
    paddingVertical: 16,
    alignItems: 'center',
    ...Shadows.level3,
  },
  saveBtnText: {
    ...Typography.h5,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
  },
});
