/**
 * IconButton — Figma "Icon Button" (page 5620:3616). Triggers a compact
 * action with a recognisable icon.
 *
 * Sizes
 *   regular — 48×48, 16 radius, 24px icon (node 2803:3999)
 *   small   — 36×36, 10 radius, 20px icon (node 5856:31328)
 *
 * Variants
 *   onTeal  — on the teal page background: #e4f1ef fill (surface/tertiary
 *             in Figma), 1px white border, Elevation (On Tint) Level 3
 *   onWhite — on white cards and sheets: white fill, 1px #aad4cd border,
 *             no shadow
 *   outline — On White with its fill turned off, for tinted cards such as
 *             an eaten meal (node 5909:13814)
 *
 * Optional `badge` shows the red count (e.g. unread notifications), sat
 * inside the top-right corner.
 *
 * Leave out `onPress` for the visual only — e.g. as the trigger inside a
 * native menu that handles the tap itself.
 */
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type Insets,
} from 'react-native';
import { Colors, Shadows } from '@/constants/theme';

export type IconButtonSize = 'regular' | 'small';
export type IconButtonVariant = 'onTeal' | 'onWhite' | 'outline';

interface Props {
  /** Icon element — 24px for regular, 20px for small. */
  icon: React.ReactNode;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Unread count; nothing shows for 0 or undefined. */
  badge?: number;
  hitSlop?: Insets | number;
  /** Positioning only (margins, absolute placement) — not appearance. */
  style?: StyleProp<ViewStyle>;
}

/** Figma surface/tertiary. The theme's Colors.surface.tertiary is #f1f8f7. */
const ON_TEAL_FILL = '#e4f1ef';

export function IconButton({
  icon,
  size = 'regular',
  variant = 'onTeal',
  onPress,
  disabled,
  accessibilityLabel,
  badge,
  hitSlop = 8,
  style,
}: Props) {
  const shell = [
    styles.base,
    size === 'regular' ? styles.regular : styles.small,
    variant === 'onTeal' ? styles.onTeal : variant === 'outline' ? styles.outline : styles.onWhite,
    disabled && styles.disabled,
    style,
  ];
  const badgeEl =
    badge != null && badge > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText} numberOfLines={1} allowFontScaling={false}>
          {badge > 9 ? '9+' : String(badge)}
        </Text>
      </View>
    ) : null;

  if (!onPress) {
    return (
      <View style={shell} pointerEvents="none">
        {icon}
        {badgeEl}
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={shell}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={disabled ? { disabled: true } : undefined}
    >
      {icon}
      {badgeEl}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  regular: {
    width: 48,
    height: 48,
    borderRadius: 16,
  },
  small: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  onTeal: {
    backgroundColor: ON_TEAL_FILL,
    borderColor: Colors.stroke.primary,
    ...Shadows.level3,
  },
  onWhite: {
    backgroundColor: Colors.surface.secondary,
    borderColor: '#aad4cd',
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: '#aad4cd',
  },
  disabled: {
    opacity: 0.4,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.status.negative,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 10,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
    textAlign: 'center',
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
});
