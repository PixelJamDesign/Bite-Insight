import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius } from '@/constants/theme';

interface FooterButtonRowProps {
  /** Label for the secondary (outline) button on the left */
  secondaryLabel: string;
  /** Label for the primary (filled) button on the right */
  primaryLabel: string;
  /** Handler for the secondary button */
  onSecondaryPress: () => void;
  /** Handler for the primary button */
  onPrimaryPress: () => void;
  /** Show a loading spinner on the primary button */
  primaryLoading?: boolean;
  /** Disable the primary button */
  primaryDisabled?: boolean;
  /** Whether to show the gradient fade above the buttons */
  showGradient?: boolean;
  /** Whether the footer should be absolutely positioned at the bottom */
  absolute?: boolean;
}

export function FooterButtonRow({
  secondaryLabel,
  primaryLabel,
  onSecondaryPress,
  onPrimaryPress,
  primaryLoading = false,
  primaryDisabled = false,
  showGradient = true,
  absolute = true,
}: FooterButtonRowProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={absolute ? styles.footerAbsolute : styles.footerRelative}>
      {showGradient && (
        <LinearGradient
          colors={['rgba(226,241,238,0)', Colors.background]}
          style={styles.gradient}
          pointerEvents="none"
        />
      )}
      <View style={[styles.buttonRow, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={onSecondaryPress}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, primaryDisabled && styles.primaryBtnDisabled]}
          onPress={onPrimaryPress}
          disabled={primaryDisabled || primaryLoading}
          activeOpacity={0.88}
        >
          {primaryLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText} numberOfLines={1} adjustsFontSizeToFit>
              {primaryLabel}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footerAbsolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerRelative: {
    width: '100%',
  },
  gradient: {
    height: 40,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: Colors.background,
  },
  secondaryBtn: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.m,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.m,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});
