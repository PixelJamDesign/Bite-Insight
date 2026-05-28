/**
 * NotificationBell — bell icon with unread badge.
 *
 * Matches Figma 2878:7341 exactly:
 *   - 48×48 button, 16px rounded square
 *   - Surface tertiary background, 1px white border, elevation-3 shadow
 *     (same shell as the menu button so they pair visually)
 *   - 24×24 bell icon centered
 *   - 16×16 red badge with white text sat inside the top-right of the
 *     button — partially overlapping the bell, NOT floating outside
 *
 * Lives next to the menu hamburger on the dashboard. Tap → /notifications.
 */
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Shadows } from '@/constants/theme';
import { MenuNotificationsIcon } from '@/components/MenuIcons';
import { useNotifications } from '@/lib/notificationsContext';

interface NotificationBellProps {
  /** Override the default route (defaults to /notifications). */
  onPress?: () => void;
}

export function NotificationBell({ onPress }: NotificationBellProps) {
  const { unreadCount } = useNotifications();
  const handlePress = onPress ?? (() => router.push('/notifications' as any));
  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
    >
      {/* Bell icon — uses the canonical MenuNotificationsIcon from the
          design system so the stroke weight matches the menu hamburger. */}
      <MenuNotificationsIcon color={Colors.primary} size={22} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1} allowFontScaling={false}>
            {displayCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary, // white
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  badge: {
    position: 'absolute',
    // Sat inside the top-right of the 48px button, overlapping the
    // top-right of the bell. Coordinates match Figma 2878:7341.
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
    // Drop default extra padding iOS adds around small text.
    includeFontPadding: false,
  },
});
