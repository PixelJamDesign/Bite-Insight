import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Radius } from '@/constants/theme';

interface FooterButtonRowProps {
  secondaryLabel: string;
  primaryLabel: string;
  onSecondaryPress: () => void;
  onPrimaryPress: () => void;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
}

export function FooterButtonRow({
  secondaryLabel,
  primaryLabel,
  onSecondaryPress,
  onPrimaryPress,
  primaryLoading = false,
  primaryDisabled = false,
}: FooterButtonRowProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.row, { paddingBottom: insets.bottom + 12 }]}>
      <TouchableOpacity
        style={styles.secondary}
        onPress={onSecondaryPress}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryText}>{secondaryLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primary, primaryDisabled && { opacity: 0.6 }]}
        onPress={onPrimaryPress}
        disabled={primaryDisabled || primaryLoading}
        activeOpacity={0.88}
      >
        {primaryLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText} numberOfLines={1} adjustsFontSizeToFit>
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
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  secondary: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
  },
  primary: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.m,
    backgroundColor: Colors.secondary,
  },
  primaryText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});
