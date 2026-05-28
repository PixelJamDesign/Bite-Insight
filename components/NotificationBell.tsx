/**
 * NotificationBell — bell icon with unread badge.
 *
 * Lives next to the menu hamburger on the dashboard (and anywhere
 * else we want surface-level access to the inbox). Tapping pushes
 * to /notifications.
 */
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Colors, Shadows } from '@/constants/theme';
import { useNotifications } from '@/lib/notificationsContext';

interface NotificationBellProps {
  /** Override the default route (defaults to /notifications). */
  onPress?: () => void;
  size?: number;
}

export function NotificationBell({ onPress, size = 22 }: NotificationBellProps) {
  const { unreadCount } = useNotifications();
  const handlePress = onPress ?? (() => router.push('/notifications' as any));
  const displayCount = unreadCount > 9 ? '9+' : String(unreadCount);

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : 'Notifications'
      }
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={styles.iconWrap}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 2C8.69 2 6 4.69 6 8v3.5L4 14v1h16v-1l-2-2.5V8c0-3.31-2.69-6-6-6zm0 19a2.5 2.5 0 0 0 2.5-2.5h-5A2.5 2.5 0 0 0 12 21z"
            fill={Colors.primary}
          />
        </Svg>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{displayCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.status.negative,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface.secondary,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
    textAlign: 'center',
  },
});
