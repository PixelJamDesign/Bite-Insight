/**
 * NotificationBell — bell icon with unread badge (Figma 2878:7341).
 * A regular "On Teal" IconButton, so it pairs with the menu button.
 *
 * Lives next to the menu hamburger on the dashboard. Tap → notifications.
 */
import { Colors } from '@/constants/theme';
import { IconButton } from '@/components/IconButton';
import { MenuNotificationsIcon } from '@/components/MenuIcons';
import { useNotifications } from '@/lib/notificationsContext';
import { useNotificationsOverlay } from '@/lib/notificationsOverlayContext';

interface NotificationBellProps {
  /** Override the default open behaviour (defaults to showing the
   *  notifications overlay via NotificationsOverlayProvider). */
  onPress?: () => void;
}

export function NotificationBell({ onPress }: NotificationBellProps) {
  const { unreadCount } = useNotifications();
  const { show } = useNotificationsOverlay();

  return (
    <IconButton
      // Canonical bell from the design system so the stroke weight
      // matches the menu hamburger.
      icon={<MenuNotificationsIcon color={Colors.primary} size={22} />}
      onPress={onPress ?? show}
      badge={unreadCount}
      hitSlop={0}
      accessibilityLabel={
        unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
      }
    />
  );
}
