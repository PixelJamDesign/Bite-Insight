import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows } from '@/constants/theme';

const lightbulbImg = require('@/assets/images/lightbulb.png');
import { DietaryTag } from './DietaryTag';
import type { DailyInsight, DietaryTag as DietaryTagType } from '@/lib/types';

interface DailyInsightCardProps {
  insight: DailyInsight;
  onDismiss: () => void;
  dietaryPreferences?: DietaryTagType[];
  healthConditions?: string[];
  allergies?: string[];
}

export function DailyInsightCard({
  insight,
  onDismiss,
  dietaryPreferences = [],
  healthConditions = [],
  allergies = [],
}: DailyInsightCardProps) {
  const hasChips =
    dietaryPreferences.length > 0 ||
    healthConditions.length > 0 ||
    allergies.length > 0;

  return (
    <View style={styles.card}>
      {/* Dismiss button */}
      <TouchableOpacity style={styles.closeBtn} onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={20} color={Colors.primary} />
      </TouchableOpacity>

      {/* Bulb icon */}
      <Image source={lightbulbImg} style={styles.bulbIcon} />

      {/* Title */}
      <Text style={styles.title}>Daily Insight!</Text>

      {/* Content */}
      <Text style={styles.content}>{insight.content}</Text>

      {/* Suitable for — user's dietary prefs, conditions & allergies */}
      {hasChips && (
        <View style={styles.suitableRow}>
          <Text style={styles.suitableLabel}>Suitable for:</Text>
          <View style={styles.tagsRow}>
            {dietaryPreferences.map((tag) => (
              <DietaryTag key={tag} tag={tag} />
            ))}
            {healthConditions.map((condition) => (
              <View key={condition} style={[styles.genericChip, { backgroundColor: '#B8DFD6' }]}>
                <Text style={styles.genericChipLabel}>{condition}</Text>
              </View>
            ))}
            {allergies.map((allergy) => (
              <View key={allergy} style={[styles.genericChip, { backgroundColor: '#B8DFD6' }]}>
                <Text style={styles.genericChipLabel}>{allergy}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
    ...Shadows.level3,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbIcon: {
    width: 30,
    height: 56,
    resizeMode: 'contain',
    overflow: 'visible',
    marginBottom: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  content: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 24,
  },
  suitableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  suitableLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    paddingTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  genericChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  genericChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
});
