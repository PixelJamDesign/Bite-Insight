/**
 * IbsSubtypePicker — radio picker for IBS subtype.
 * Used as a follow-up step when the user selects IBS as a health condition.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import type { IbsSubtype } from '@/lib/types';

interface Props {
  value: IbsSubtype | null;
  onChange: (value: IbsSubtype) => void;
}

const OPTIONS: Array<{ key: IbsSubtype; title: string; subtitle: string }> = [
  { key: 'C',      title: 'IBS-C',       subtitle: 'Constipation predominant' },
  { key: 'D',      title: 'IBS-D',       subtitle: 'Diarrhoea predominant' },
  { key: 'M',      title: 'IBS-M',       subtitle: 'Mixed (both)' },
  { key: 'unsure', title: "I'm not sure", subtitle: "We'll use general IBS guidance" },
];

export function IbsSubtypePicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Which type of IBS best describes you?</Text>
      <Text style={styles.subheading}>
        Different subtypes respond to different foods. We use your answer to tailor
        the fibre and trigger guidance.
      </Text>
      <View style={styles.options}>
        {OPTIONS.map((opt) => {
          const selected = value === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onChange(opt.key)}
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.s,
  },
  heading: {
    ...Typography.h3,
    color: Colors.primary,
  },
  subheading: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  options: {
    gap: 10,
    marginTop: Spacing.xs,
  },
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
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
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
});
