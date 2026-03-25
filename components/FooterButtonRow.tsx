import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/theme';

interface FooterButtonRowProps {
  secondaryLabel: string;
  primaryLabel: string;
  onSecondaryPress: () => void;
  onPrimaryPress: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
}

/**
 * A simple row of two buttons: outline secondary (fixed width) + filled primary (flex).
 * Matches the disclaimer footer exactly. Parent must provide all positioning and padding.
 */
export function FooterButtonRow({
  secondaryLabel,
  primaryLabel,
  onSecondaryPress,
  onPrimaryPress,
  primaryLoading = false,
  primaryDisabled = false,
}: FooterButtonRowProps) {
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.back} onPress={onSecondaryPress} activeOpacity={0.8}>
        <Text style={styles.backText}>{secondaryLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.next, primaryDisabled && { opacity: 0.6 }]}
        onPress={onPrimaryPress}
        disabled={primaryDisabled || primaryLoading}
        activeOpacity={0.88}
      >
        {primaryLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.nextText} numberOfLines={1} adjustsFontSizeToFit>
            {primaryLabel}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  back: {
    width: 91,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  backText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
  },
  next: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.secondary,
  },
  nextText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});
