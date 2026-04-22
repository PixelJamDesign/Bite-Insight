/**
 * DobPicker — shared date-of-birth picker that handles the platform quirks of
 * @react-native-community/datetimepicker correctly.
 *
 * Why this component exists:
 *
 * 1. ANDROID LOOP — On Android the picker is a native imperative dialog
 *    (not a view). If you wrap it in a JSX <Modal>, mounting it while the
 *    Modal is open causes the native dialog to re-open on every render —
 *    so tapping Confirm fires onChange → state updates → parent re-renders
 *    → dialog pops up again. The fix is to render <DateTimePicker /> only
 *    when visible is true, NOT wrap it in a Modal, and always flip visible
 *    back to false inside the first onChange (for either 'set' or
 *    'dismissed').
 *
 * 2. iOS INVISIBLE WHEELS — On iOS 14+, the spinner inside a Modal renders
 *    with text that picks up the system text colour. In dark mode (or with
 *    certain OEM themes) against a white sheet, the wheels are effectively
 *    invisible. The fix is to force `themeVariant="light"` and an explicit
 *    `textColor` so the wheels are always readable against our light sheet.
 *
 * Usage:
 *   <DobPicker
 *     visible={showDatePicker}
 *     value={dateOfBirth}
 *     onChange={setDateOfBirth}
 *     onClose={() => setShowDatePicker(false)}
 *     onClear={() => setDateOfBirth(null)}
 *     clearLabel="Clear"
 *     doneLabel="Done"
 *   />
 */
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors } from '@/constants/theme';

interface Props {
  visible: boolean;
  /** Current value (null = no date chosen yet — picker opens at the fallback). */
  value: Date | null;
  /** Called when the user picks a date. */
  onChange: (date: Date) => void;
  /** Called when the sheet closes (Done tap on iOS, confirm/dismiss on Android). */
  onClose: () => void;
  /** Optional Clear button on the iOS toolbar. */
  onClear?: () => void;
  clearLabel?: string;
  doneLabel?: string;
  /** Upper bound — default = now (no future DOBs). */
  maximumDate?: Date;
  /** Lower bound — default = Jan 1, 1920. */
  minimumDate?: Date;
  /** Fallback date shown when value is null. Default = Jan 1, 2000. */
  fallbackDate?: Date;
}

const DEFAULT_MIN = new Date(1920, 0, 1);
const DEFAULT_FALLBACK = new Date(2000, 0, 1);

export function DobPicker({
  visible,
  value,
  onChange,
  onClose,
  onClear,
  clearLabel = 'Clear',
  doneLabel = 'Done',
  maximumDate,
  minimumDate = DEFAULT_MIN,
  fallbackDate = DEFAULT_FALLBACK,
}: Props) {
  const insets = useSafeAreaInsets();
  const max = maximumDate ?? new Date();
  const current = value ?? fallbackDate;

  // ── Android: imperative native dialog. No Modal wrapper. ─────────────────
  // Render <DateTimePicker /> only while visible — its mere presence triggers
  // the native dialog. The first onChange MUST flip visible to false (via
  // onClose) regardless of event.type to avoid the re-open loop.
  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={current}
        mode="date"
        display="default"
        maximumDate={max}
        minimumDate={minimumDate}
        onChange={(event: DateTimePickerEvent, selected?: Date) => {
          // Close first — prevents the re-mount-reopen loop on state update.
          onClose();
          if (event.type === 'set' && selected) {
            onChange(selected);
          }
        }}
      />
    );
  }

  // ── iOS: spinner inside a bottom-sheet Modal. ─────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.toolbar}>
            {onClear ? (
              <TouchableOpacity
                onPress={() => {
                  onClear();
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.clearText}>{clearLabel}</Text>
              </TouchableOpacity>
            ) : (
              <View />
            )}
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>{doneLabel}</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={current}
            mode="date"
            display="spinner"
            maximumDate={max}
            minimumDate={minimumDate}
            // Force light theme + explicit dark text so the wheels are
            // always readable against the white sheet regardless of the
            // device's system appearance.
            themeVariant="light"
            textColor={Colors.primary}
            style={styles.spinner}
            onChange={(_e, selected) => {
              if (selected) onChange(selected);
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  clearText: {
    fontFamily: 'Figtree_300Light',
    fontSize: 15,
    color: Colors.secondary,
  },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  doneBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 14,
    color: '#fff',
  },
  spinner: {
    height: 216,
    alignSelf: 'center',
    width: '100%',
  },
});
