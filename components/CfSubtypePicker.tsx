/**
 * CfSubtypePicker — radio picker for Cystic Fibrosis subtype.
 * Used as a follow-up step when the user selects Cystic Fibrosis as a
 * health condition.
 *
 * The subtype determines which threshold overrides and ingredient flags
 * apply on top of the shared CF baseline:
 *   • 'standard'  — high calorie/fat needed; salt is a boost; "diet"
 *                   products flagged as counterproductive
 *   • 'modulator' — Trikafta/Kaftrio/Alyftrek users; absorption normalised,
 *                   weight management may matter; "diet" flags suppressed
 *   • 'cfrd'      — CF-Related Diabetes; high-fat maintained but
 *                   carbohydrate-aware (NOT carb-restricted)
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { TickIcon } from '@/components/MenuIcons';
import type { CfSubtype } from '@/lib/types';

interface Props {
  value: CfSubtype | null;
  onChange: (value: CfSubtype) => void;
}

// Source of truth for subtype option order. Display labels and subtitles
// are translated via i18n keys: cfSubtypes.<key>.title / .subtitle.
const OPTION_KEYS: CfSubtype[] = ['standard', 'modulator', 'cfrd', 'all'];

export function CfSubtypePicker({ value, onChange }: Props) {
  const { t } = useTranslation('profileOptions');

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{t('cfSubtypePrompt')}</Text>
      <Text style={styles.subheading}>{t('cfSubtypeSubheading')}</Text>
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
                <Text style={styles.title}>{t(`cfSubtypes.${key}.title`)}</Text>
                <Text style={styles.subtitle}>{t(`cfSubtypes.${key}.subtitle`)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.reassurance}>{t('cfSubtypeReassurance')}</Text>
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
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 21,
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
