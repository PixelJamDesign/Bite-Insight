/**
 * ConditionInfoSheet — a bottom sheet that shows the full name and description
 * of a health condition / allergy / dietary preference when the user taps
 * the info icon on an acronym chip.
 */

import { View, Text, StyleSheet } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { Colors, Spacing } from '@/constants/theme';
import { CONDITION_INFO, type ConditionInfoEntry } from '@/constants/conditionInfo';

type Props = {
  conditionKey: string | null;
  onClose: () => void;
};

export function ConditionInfoSheet({ conditionKey, onClose }: Props) {
  const info: ConditionInfoEntry | undefined = conditionKey
    ? CONDITION_INFO[conditionKey]
    : undefined;

  return (
    <BottomSheet visible={!!conditionKey && !!info} onClose={onClose} minHeightFraction={0.3}>
      {info && (
        <View style={styles.container}>
          <Text style={styles.title}>{info.fullName}</Text>
          <Text style={styles.description}>{info.description}</Text>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    width: '100%',
    gap: Spacing.s,
    paddingTop: Spacing.xs,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    lineHeight: 24,
    letterSpacing: 0,
  },
});
