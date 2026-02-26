import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import type { DietaryTag as DietaryTagType } from '@/lib/types';

const CHIP_BG = '#B8DFD6';

const TAG_LABELS: Record<DietaryTagType, string> = {
  diabetic: 'Diabetic',
  keto: 'Low Carb/Keto',
  'gluten-free': 'Gluten Free',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  lactose: 'Lactose Free',
  pescatarian: 'Pescatarian',
  kosher: 'Kosher',
};

interface DietaryTagProps {
  tag: DietaryTagType;
}

export function DietaryTag({ tag }: DietaryTagProps) {
  if (!TAG_LABELS[tag]) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{TAG_LABELS[tag]}</Text>
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
