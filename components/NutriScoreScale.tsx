/**
 * NutriScoreScale — horizontal A-E pill row with one grade highlighted.
 * Matches the scale used on scan-result and the Figma recipe builder spec.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  NUTRISCORE_COLORS,
  NUTRISCORE_VERDICT,
  type NutriscoreGrade,
} from '@/lib/nutriscore';

interface Props {
  /** Active grade — null renders the scale greyed out with no verdict pill */
  grade: NutriscoreGrade | null;
}

const GRADES: NutriscoreGrade[] = ['a', 'b', 'c', 'd', 'e'];

export function NutriScoreScale({ grade }: Props) {
  const activeColor = grade ? NUTRISCORE_COLORS[grade] : '#aad4cd';
  const verdict = grade ? NUTRISCORE_VERDICT[grade] : '—';

  return (
    <View style={styles.wrap}>
      {/* Verdict pill */}
      <View style={[styles.verdictPill, { backgroundColor: activeColor }]}>
        <Text style={styles.verdictText}>{verdict}</Text>
      </View>

      {/* A-E scale */}
      <View style={styles.scale}>
        {GRADES.map((g) => {
          const isActive = g === grade;
          return (
            <View
              key={g}
              style={[
                styles.pill,
                { backgroundColor: NUTRISCORE_COLORS[g] },
                isActive ? styles.pillActive : styles.pillInactive,
              ]}
            >
              <Text style={styles.pillText}>{g.toUpperCase()}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#f5fbfb',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: Spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verdictPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  verdictText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scale: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  pill: {
    width: 24,
    height: 30,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface.secondary,
  },
  pillActive: {},
  pillInactive: { opacity: 0.15 },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
