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
import Svg, { Path } from 'react-native-svg';
import { Colors, Shadows } from '@/constants/theme';
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
      {/* Bell icon — 24×24 centered. Generic outline bell that matches
          the visual weight of the menu hamburger. */}
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2.5C8.41 2.5 5.5 5.41 5.5 9v4.17l-1.5 2.08V17h16v-1.75l-1.5-2.08V9c0-3.59-2.91-6.5-6.5-6.5zm0 18.5a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2z"
          fill={Colors.primary}
        />
      </Svg>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
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
    top: 6,
    left: 25,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.status.negative,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
});
