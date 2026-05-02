/**
 * CancerSubtypePicker — radio picker for cancer subtype.
 * Used as a follow-up step when the user selects Cancer as a health condition.
 *
 * The subtype determines which ingredient flags and nutrient threshold
 * overrides apply on top of the shared cancer baseline. Subtypes with
 * extra ingredient flags: 'colorectal' (red meat) and 'stomach' (salt,
 * pickled foods). Other subtypes use baseline cancer flags only.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { TickIcon } from '@/components/MenuIcons';
import type { CancerSubtype } from '@/lib/types';

interface Props {
  value: CancerSubtype | null;
  onChange: (value: CancerSubtype) => void;
}

// Source of truth for the subtype option order. Display labels and
// subtitles are translated via i18n keys: cancerSubtypes.<key>.title /
// cancerSubtypes.<key>.subtitle.
const OPTION_KEYS: CancerSubtype[] = [
  'colorectal',
  'breast',
  'prostate',
  'stomach',
  'other',
];

export function CancerSubtypePicker({ value, onChange }: Props) {
  const { t } = useTranslation('profileOptions');

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t('cancerSubtypePrompt')}</Text>
      <Text style={styles.subheading}>{t('cancerSubtypeSubheading')}</Text>
      <View style={styles.options}>
        {OPTION_KEYS.map((key) => {
          const selected = value === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => onChange(key)}
              activeOpacity={0.85}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <TickIcon size={14} color="#fff" strokeWidth={3} />}
              </View>
              <View style={styles.info}>
                <Text style={styles.title}>{t(`cancerSubtypes.${key}.title`)}</Text>
                <Text style={styles.subtitle}>{t(`cancerSubtypes.${key}.subtitle`)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.reassurance}>{t('cancerSubtypeReassurance')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.s,
  },
  heading: {
    fontSize: 18,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
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
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  radioSelected: {
    backgroundColor: '#3b9586',
    borderColor: '#3b9586',
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
  reassurance: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
});
