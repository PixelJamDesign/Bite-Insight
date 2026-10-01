import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Shadows } from '@/constants/theme';
import { dietaryTagLabel } from '@/components/DietaryTag';
import type { DailyInsight, DietaryTag as DietaryTagType } from '@/lib/types';
import CloseIcon from '@/assets/icons/insight-close.svg';

const lightbulbImg = require('@/assets/images/lightbulb.png');

interface DailyInsightCardProps {
  insight: DailyInsight;
  onDismiss: () => void;
  dietaryPreferences?: DietaryTagType[];
  healthConditions?: string[];
  allergies?: string[];
  showElevation?: boolean;
}

/**
 * Daily insight card, per the Figma "Daily Insight" component (node
 * 2201:1115): bulb and title on one line, the tip, then the user's
 * matching tags. Every tag uses the same neutral chip.
 */
export function DailyInsightCard({
  insight,
  onDismiss,
  dietaryPreferences = [],
  healthConditions = [],
  allergies = [],
  showElevation = true,
}: DailyInsightCardProps) {
  const { t } = useTranslation('dashboard');
  const { t: tpo } = useTranslation('profileOptions');
  const { t: tc } = useTranslation('common');

  const chips = [
    // Same labels (and same skipping of unknown keys) as DietaryTag.
    ...dietaryPreferences.flatMap((tag) => {
      const label = dietaryTagLabel(tag);
      return label ? [{ key: `d:${tag}`, label }] : [];
    }),
    ...healthConditions.map((c) => ({
      key: `h:${c}`,
      label: tpo(`healthConditions.${c}`, { defaultValue: c }),
    })),
    ...allergies.map((a) => ({
      key: `a:${a}`,
      label: tpo(`allergies.${a}`, { defaultValue: a }),
    })),
  ];

  return (
    <View style={[styles.card, showElevation && Shadows.level3]}>
      {/* Bulb + title */}
      <View style={styles.titleRow}>
        <View style={styles.bulbBox}>
          <Image source={lightbulbImg} style={styles.bulbIcon} />
        </View>
        <Text style={styles.title}>{t('dailyInsight')}</Text>
      </View>

      {/* Content */}
      <Text style={styles.content}>{insight.content}</Text>

      {/* Suitable for — user's dietary prefs, conditions & allergies */}
      {chips.length > 0 && (
        <View style={styles.suitableRow}>
          <Text style={styles.suitableLabel}>{t('suitableFor')}</Text>
          <View style={styles.tagsRow}>
            {chips.map((chip) => (
              <View key={chip.key} style={styles.chip}>
                <Text style={styles.chipLabel}>{chip.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onDismiss}
        hitSlop={8}
        accessibilityLabel={tc('buttons.close')}
      >
        <CloseIcon width={24} height={24} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    padding: 24,
    gap: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 23,
    right: 23,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Keep the title clear of the close button.
    paddingRight: 32,
  },
  // lightbulb.png has rays above and a soft shadow below the bulb, so it
  // draws larger than its slot and hangs over top and bottom — the bulb
  // itself then reads at the size of the title without making the row taller.
  bulbBox: {
    width: 16,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbIcon: {
    width: 18,
    height: 38,
    // Pull up a little so the bulb, not the shadow, lines up with the title.
    marginTop: -2,
    resizeMode: 'contain',
  },
  title: {
    flex: 1,
    paddingTop: 4,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
    lineHeight: 24,
  },
  content: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 27,
  },
  suitableRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  suitableLabel: {
    fontSize: 14,
    lineHeight: 16.8,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
  tagsRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: Colors.background,
  },
  chipLabel: {
    fontSize: 14,
    lineHeight: 16.8,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
});
