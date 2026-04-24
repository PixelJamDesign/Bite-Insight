/**
 * PregnancyStep — captures pregnancy status and due date (or baby's
 * birth date for breastfeeding) as a follow-up after the user selects
 * Pregnancy as a health condition.
 *
 * Pixel-matches Figma node 4799-23015 ("Pregnancy Details" conditions panel):
 *   • White card container, 1px white border, 16px radius, pt:24 px:16 pb:16
 *   • Heading 4 title + body-regular secondary copy
 *   • Two status rows — 8px radius cards with 24px square checkboxes
 *       - Default:  white bg, 1px #aad4cd border, primary text,
 *                   secondary-teal subtitle
 *       - Selected: dark primary (#023432) bg, white title, aloe-vera
 *                   (#aad4cd) subtitle, filled green checkbox, level-2 shadow
 *   • Due date field — h5 label + bordered input button with calendar
 *     icon; placeholder at 50% opacity
 *
 * The date picker below is platform-correct:
 *   Android — native dialog rendered only while open (no JSX Modal wrapper
 *             or it re-opens on every re-render).
 *   iOS     — spinner inside a bottom-sheet Modal with light theme + explicit
 *             textColor so wheels are always readable.
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
import { Colors, Radius, Shadows } from '@/constants/theme';
import { formatDob } from '@/lib/dateOfBirth';
import type { PregnancyStatus } from '@/lib/types';

interface Props {
  status: PregnancyStatus | null;
  dueDate: string | null;
  onChange: (status: PregnancyStatus | null, dueDate: string | null) => void;
}

const STATUS_OPTIONS: Array<{
  key: PregnancyStatus;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'pregnant',
    title: 'Currently pregnant',
    subtitle: "We'll tailor guidance by trimester",
  },
  {
    key: 'breastfeeding',
    title: 'Currently breastfeeding',
    subtitle: 'Nutritional focus shifts after birth',
  },
];

function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function PregnancyStep({ status, dueDate, onChange }: Props) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const dueLabel = status === 'pregnant' ? 'Due date' : "Baby's birth date";
  const duePlaceholder =
    status === 'pregnant' ? 'Pick your due date' : "Pick baby's birth date";

  // NOTE: the white card chrome is supplied by the parent screen (onboarding
  // and edit-profile both wrap this step in their own styles.card). So this
  // component renders raw content with vertical spacing only — no border,
  // background, or padding of its own.
  return (
    <View style={styles.wrap}>
      {/* Heading + copy */}
      <View style={styles.headingBlock}>
        <Text style={styles.heading}>Tell us a bit more</Text>
        <Text style={styles.subheading}>
          Pregnancy and breastfeeding both shift your nutritional needs. This
          helps us show the right information at the right time.
        </Text>
      </View>

      {/* Status options */}
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
              <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
                {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <View style={styles.info}>
                <Text
                  style={[styles.rowTitle, selected && styles.rowTitleSelected]}
                >
                  {opt.title}
                </Text>
                <Text
                  style={[
                    styles.rowSubtitle,
                    selected && styles.rowSubtitleSelected,
                  ]}
                >
                  {opt.subtitle}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Due date field (only visible once a status is chosen) */}
      {status && (
        <View style={styles.dateBlock}>
          <Text style={styles.fieldLabel}>{dueLabel}</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setDatePickerOpen(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
            <Text
              style={[styles.dateValue, !dueDate && styles.datePlaceholder]}
            >
              {dueDate ? formatDob(dueDate) : duePlaceholder}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/*
        Platform-specific picker rendering (see header comment).
      */}
      {Platform.OS === 'android' && datePickerOpen && (
        <DateTimePicker
          value={dueDate ? new Date(dueDate + 'T00:00:00') : new Date()}
          mode="date"
          display="default"
          maximumDate={status === 'breastfeeding' ? new Date() : undefined}
          onChange={(event, selected) => {
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
          animationType="fade"
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
                <Text style={styles.modalTitle}>{dueLabel}</Text>
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

// ── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Outer wrapper — parent screen owns the card chrome (white bg, border,
  // padding). We just stack our sections with 24px gap to match Figma's
  // gap-m between heading, options, and due-date field.
  wrap: {
    gap: 24,
  },

  // Heading block
  headingBlock: { gap: 8 },
  heading: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },

  // Options
  options: { gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  rowSelected: {
    backgroundColor: Colors.primary, // #023432 dark
    borderColor: Colors.primary,
    ...Shadows.level2,
  },

  // Checkbox
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2, // optical align with title line
  },
  checkboxChecked: {
    backgroundColor: Colors.accent, // green-apple teal
    borderColor: Colors.accent,
  },

  // Row text
  info: { flex: 1, gap: 4 },
  rowTitle: {
    fontSize: 16,
    lineHeight: 17.6, // 1.1 leading
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  rowTitleSelected: { color: '#fff' },
  rowSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  rowSubtitleSelected: { color: '#aad4cd' },

  // Due date field
  dateBlock: { gap: 8 },
  fieldLabel: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  dateBtn: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateValue: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },
  datePlaceholder: {
    color: Colors.primary,
    opacity: 0.5,
  },

  // iOS date picker modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
});
