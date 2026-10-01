/**
 * MealItemRow — one recipe or product in a meal, per the Figma "Scanned
 * Food Row" (5912:15876): 60px image (or a "No image" tile), brand over
 * name, and the portion in a pill.
 *
 * Used by the Plan a meal sheet (portion pill opens the portion picker,
 * with a remove control after it) and the meal view (read-only).
 */
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { portionLabel } from '@/lib/mealPlan';
import type { QuantityUnit } from '@/lib/types';

interface Props {
  item: {
    kind: 'recipe' | 'product';
    title: string;
    image_url: string | null;
    servings: number;
    quantity_value: number | null;
    quantity_unit: QuantityUnit | null;
    product_snapshot: { brand: string | null } | null;
  };
  /** Makes the portion pill a button. */
  onPortionPress?: () => void;
  /** Extra control after the pill, e.g. a remove button. */
  trailing?: React.ReactNode;
}

export function MealItemRow({ item, onPortionPress, trailing }: Props) {
  const portion = portionLabel(item);
  const brand = item.kind === 'recipe' ? 'Recipe' : item.product_snapshot?.brand || 'Product';
  const pill = <Text style={styles.pillText}>{portion}</Text>;

  return (
    <View style={styles.row}>
      <View style={styles.thumb}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <View style={styles.noImage}>
            <Ionicons name="image-outline" size={16} color="#aad4cd" />
            <Text style={styles.noImageText}>No image</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.brand} numberOfLines={1}>
          {brand}
        </Text>
        <Text style={styles.name} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
      {onPortionPress ? (
        <TouchableOpacity
          style={styles.pill}
          onPress={onPortionPress}
          activeOpacity={0.75}
          accessibilityLabel={`Change portion, ${portion}`}
        >
          {pill}
        </TouchableOpacity>
      ) : (
        <View style={styles.pill}>{pill}</View>
      )}
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: '#f5fbfb',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    minHeight: 76,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.m,
    backgroundColor: '#e2f1ee',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  noImage: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  noImageText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#aad4cd',
  },
  info: { flex: 1, justifyContent: 'center' },
  brand: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
  },
  name: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  pill: {
    backgroundColor: '#e4f1ef',
    borderRadius: 999,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    textAlign: 'center',
  },
});
