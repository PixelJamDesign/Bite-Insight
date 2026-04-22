/**
 * PregnancyStep — captures pregnancy status and due date (or baby's
 * birth date for breastfeeding) as a follow-up after the user selects
 * Pregnancy as a health condition.
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { formatDob } from '@/lib/dateOfBirth';
import type { PregnancyStatus } from '@/lib/types';

interface Props {
  status: PregnancyStatus | null;
  dueDate: string | null;
  onChange: (status: PregnancyStatus | null, dueDate: string | null) => void;
}

const STATUS_OPTIONS: Array<{ key: PregnancyStatus; title: string; subtitle: string }> = [
  { key: 'pregnant',     title: 'Currently pregnant',    subtitle: "We'll tailor guidance by trimester" },
  { key: 'breastfeeding', title: 'Currently breastfeeding', subtitle: 'Nutritional focus shifts after birth' },
];

function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function PregnancyStep({ status, dueDate, onChange }: Props) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const label = status === 'pregnant' ? 'Due date' : "Baby's birth date";
  const placeholder = status === 'pregnant' ? 'Pick your due date' : "Pick baby's birth date";

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Tell us a bit more</Text>
      <Text style={styles.subheading}>
        Pregnancy and breastfeeding both shift your nutritional needs. This helps us
        show the right information at the right time.
      </Text>

      <View style={styles.options}>
        {STATUS_OPTIONS.map((opt) => {
          const selected = status === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onChange(opt.key, dueDate)}
              activeOpacity={0.85}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{opt.title}</Text>
                <Text style={styles.subtitle}>{opt.subtitle}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {status && (
        <View style={styles.dateBlock}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setDatePickerOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={20} color={Colors.secondary} />
            <Text style={[styles.dateValue, !dueDate && styles.datePlaceholder]}>
              {dueDate ? formatDob(dueDate) : placeholder}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/*
        Platform-specific picker rendering:
        - Android: native dialog (not a view). Must NOT be inside a JSX Modal
          — doing so causes the dialog to re-open on every re-render, trapping
          the user in a loop. Render the component only while open, and close
          in onChange regardless of event.type.
        - iOS: spinner inside a bottom sheet. Force light theme + explicit
          textColor so the wheels aren't invisible against the white sheet
          on dark-mode devices.
      */}
      {Platform.OS === 'android' && datePickerOpen && (
        <DateTimePicker
          value={dueDate ? new Date(dueDate + 'T00:00:00') : new Date()}
          mode="date"
          display="default"
          maximumDate={status === 'breastfeeding' ? new Date() : undefined}
          onChange={(event, selected) => {
            // Close first — prevents re-mount-reopen loop.
            setDatePickerOpen(false);
            if (event.type === 'set' && selected) {
              onChange(status, toLocalDateString(selected));
            }
          }}
        />
      )}
      {Platform.OS === 'ios' && (
        <Modal
          visible={datePickerOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setDatePickerOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => setDatePickerOpen(false)}
              activeOpacity={1}
            />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{label}</Text>
                <TouchableOpacity
                  onPress={() => setDatePickerOpen(false)}
                  style={styles.closeBtn}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dueDate ? new Date(dueDate + 'T00:00:00') : new Date()}
                mode="date"
                display="spinner"
                themeVariant="light"
                textColor={Colors.primary}
                onChange={(_, selected) => {
                  if (selected) {
                    onChange(status, toLocalDateString(selected));
                  }
                }}
                maximumDate={status === 'breastfeeding' ? new Date() : undefined}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.s },
  heading: { ...Typography.h3, color: Colors.primary },
  subheading: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  options: { gap: 10, marginTop: Spacing.xs },
  row: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: Spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...Shadows.level4,
  },
  rowSelected: {
    borderColor: Colors.secondary,
    borderWidth: 2,
  },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#aad4cd',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  info: { flex: 1, gap: 2 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  dateBlock: { gap: 8, marginTop: Spacing.s },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dateBtn: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: Spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  datePlaceholder: {
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Spacing.m,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.tertiary,
  },
  modalTitle: {
    ...Typography.h5,
    color: Colors.primary,
  },
  closeBtn: {
    paddingHorizontal: Spacing.s,
    paddingVertical: 6,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
});
