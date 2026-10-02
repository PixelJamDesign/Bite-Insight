/**
 * OptionCard — a tappable choice in a list ("Choose a recipe", "Share a
 * link"…), laid out like ScanCard so option lists match the scan and
 * recipe cards: white card with the teal outline, 60px icon tile, 18px
 * title with its description underneath, and the small On White icon
 * button with an arrow.
 *
 * Used by the Add to meal / Add ingredient sources, Add to recipe and
 * Invite a family member.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { IconButton } from '@/components/IconButton';
import { MenuChevronRightIcon } from '@/components/MenuIcons';

interface Props {
  /** An Ionicons name, or your own icon element. */
  icon: keyof typeof Ionicons.glyphMap | ReactNode;
  title: string;
  subtitle?: string | null;
  onPress: () => void;
  /** Shows a spinner in the arrow button, e.g. while a link is made. */
  busy?: boolean;
  disabled?: boolean;
}

export function OptionCard({ icon, title, subtitle, onPress, busy = false, disabled = false }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, disabled && !busy && styles.disabled]}
      onPress={onPress}
      disabled={disabled || busy}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      <View style={styles.iconTile}>
        {typeof icon === 'string' ? (
          <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={28} color={Colors.secondary} />
        ) : (
          icon
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <IconButton
        size="small"
        variant="onWhite"
        icon={
          busy ? (
            <ActivityIndicator size="small" color={Colors.secondary} />
          ) : (
            <MenuChevronRightIcon color={Colors.primary} size={16} />
          )
        }
        onPress={onPress}
        disabled={disabled || busy}
        accessibilityLabel={title}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Same card as ScanCard
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.s,
    gap: Spacing.s,
  },
  disabled: { opacity: 0.6 },
  iconTile: {
    width: 60,
    height: 60,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, justifyContent: 'center', gap: Spacing.xxs },
  // Heading 5
  title: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  // Body Small
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
});
