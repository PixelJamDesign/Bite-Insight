import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

const CHIP_BG = '#B8DFD6';

/** Maps all dietary preference keys (old + new) to human-readable labels. */
const TAG_LABELS: Record<string, string> = {
  // Legacy DietaryTag keys
  diabetic: 'Diabetic',
  keto: 'Low Carb / Keto',
  'gluten-free': 'Gluten Free',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  lactose: 'Lactose Free',
  pescatarian: 'Pescatarian',
  kosher: 'Kosher',
  // Newer DietaryPreferenceKey keys
  childFriendly: 'Child Friendly',
  cleanEating: 'Clean Eating',
  dairyFree: 'Dairy Free',
  fodmap: 'FODMAP',
  highProtein: 'High Protein',
  paleo: 'Paleo',
  plantBased: 'Plant Based',
  postBariatric: 'Post-Bariatric',
  pregnancy: 'Pregnancy Safe',
  sustainable: 'Sustainable',
  weightLoss: 'Weight Loss',
  whole30: 'Whole30',
};

interface DietaryTagProps {
  tag: string;
}

export function DietaryTag({ tag }: DietaryTagProps) {
  const label = TAG_LABELS[tag];
  if (!label) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: CHIP_BG,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
});
