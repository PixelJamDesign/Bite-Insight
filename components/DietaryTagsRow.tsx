/**
 * DietaryTagsRow — pill strip rendering the dietary tags a recipe
 * qualifies for. Used on recipe cards (compact, 3-chip cap with +N
 * overflow) and on the recipe detail screen (full-size, all chips).
 *
 * Tags come from lib/dietaryTags.ts → deriveDietaryTags(...). Each
 * chip uses the colour token from Colors.dietary so there's a
 * consistent visual language with the onboarding chips.
 */
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import type { DerivedDietaryTag } from '@/lib/dietaryTags';

const LABELS: Record<DerivedDietaryTag, string> = {
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  pescatarian: 'Pescatarian',
  'gluten-free': 'Gluten free',
  dairyFree: 'Dairy free',
  nutFree: 'Nut free',
};

// Map each derived tag to a background colour from the theme. Some
// tags don't have a dedicated theme entry yet (dairyFree, nutFree)
// so they fall back to a neutral mint.
const FALLBACK_BG = '#b8dfd6';
const TAG_BG: Record<DerivedDietaryTag, string> = {
  vegan: Colors.dietary.vegan,
  vegetarian: Colors.dietary.vegetarian,
  pescatarian: Colors.dietary.pescatarian,
  'gluten-free': Colors.dietary.glutenFree,
  dairyFree: FALLBACK_BG,
  nutFree: FALLBACK_BG,
};

interface Props {
  tags: DerivedDietaryTag[];
  /** When set, the row caps at this many chips and shows a +N
   *  overflow chip if there are more. Used on cards. Detail screen
   *  passes no max so all chips render. */
  max?: number;
  /** 'compact' = card-sized chip (smaller font, tighter padding).
   *  'regular' = detail-screen sized chip. */
  size?: 'compact' | 'regular';
}

export function DietaryTagsRow({ tags, max, size = 'compact' }: Props) {
  if (tags.length === 0) return null;

  const visible = max != null && tags.length > max ? tags.slice(0, max) : tags;
  const overflow = max != null && tags.length > max ? tags.length - max : 0;

  const isCompact = size === 'compact';

  return (
    <View style={styles.row}>
      {visible.map((tag) => (
        <View
          key={tag}
          style={[
            isCompact ? styles.chipCompact : styles.chip,
            { backgroundColor: TAG_BG[tag] ?? FALLBACK_BG },
          ]}
        >
          <Text style={isCompact ? styles.labelCompact : styles.label}>
            {LABELS[tag]}
          </Text>
        </View>
      ))}
      {overflow > 0 && (
        <View
          style={[
            isCompact ? styles.chipCompact : styles.chip,
            styles.overflowChip,
          ]}
        >
          <Text style={isCompact ? styles.labelCompact : styles.label}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  // Detail-screen chip — same proportions as the existing
  // <DietaryTag> component used in onboarding.
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
  // Card chip — slightly tighter so three fit alongside a likes pill
  // without forcing the card to grow too tall.
  chipCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  labelCompact: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.22,
  },
  overflowChip: {
    backgroundColor: '#e2f1ee',
  },
});
