/**
 * NotificationsOverlay — the in-app inbox, rendered as an opacity-faded
 * overlay over the current screen (NOT a navigation route).
 *
 * Mirrors MenuOverlay's transition pattern exactly:
 *   - Mounted in (tabs)/_layout.tsx so the tab bar stays put
 *   - Opacity-driven 220ms fade-in / 180ms fade-out via Animated.Value
 *   - Header sits absolute at the same top coords as the dashboard
 *     header, so the Bite Insight logo doesn't shift when the overlay
 *     opens or closes — it stays exactly where the user just tapped
 *     the bell next to.
 *
 * Visual reference: Figma 5363:23905.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useNotifications, type InboxNotification } from '@/lib/notificationsContext';
import { useNotificationsOverlay } from '@/lib/notificationsOverlayContext';
import { useNotificationAction } from '@/lib/useNotificationAction';
import Logo from '../assets/images/logo.svg';
import UpdateBulbIcon from '../assets/icons/update_bulb.svg';
import UpdateBalloonIcon from '../assets/icons/update_balloon.svg';
import UpdateScannerIcon from '../assets/icons/update_scanner.svg';
import UpdateUserIcon from '../assets/icons/update_user.svg';

// ── Per-type icon mapping ────────────────────────────────────────────────────
type IconComponent = React.ComponentType<{ width?: number; height?: number }>;

const TYPE_ICON: Record<string, IconComponent> = {
  trial_welcome:       UpdateBalloonIcon,
  trial_day3_midway:   UpdateBulbIcon,
  trial_day6_reminder: UpdateBalloonIcon,
  trial_converted:    UpdateBalloonIcon,
  inactivity_5d:      UpdateScannerIcon,
  review_request:     UpdateUserIcon,
  first_scan:         UpdateScannerIcon,
};
const DEFAULT_ICON: IconComponent = UpdateBulbIcon;

// ── Relative time formatter ──────────────────────────────────────────────────
function formatTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.max(1, Math.round((now - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

// ── Inbox icon for the "Mark as read" CTA ────────────────────────────────────
function MarkAsReadIcon({ size = 16, color = Colors.secondary }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <Path
        d="M2 4l6 4 6-4M2 4v8h12V4"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── One card ─────────────────────────────────────────────────────────────────
function NotificationCard({
  item,
  onTap,
  onDismiss,
}: {
  item: InboxNotification;
  onTap: () => void;
  onDismiss: () => void;
}) {
  const Icon = TYPE_ICON[item.type] ?? DEFAULT_ICON;
  const isUnread = !item.read_at;
  const isFresh =
    isUnread && Date.now() - new Date(item.sent_at).getTime() < 24 * 60 * 60 * 1000;

  // Reveal a red dismiss button on swipe-left. Tap it to confirm.
  // Matches the swipe pattern in (tabs)/history.tsx so the gesture
  // feels consistent across the app.
  const renderRightActions = () => (
    <TouchableOpacity
      style={styles.dismissAction}
      onPress={onDismiss}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Dismiss notification"
    >
      <Ionicons name="trash-outline" size={22} color="#fff" />
    </TouchableOpacity>
  );

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      overshootRight={false}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={[styles.card, isUnread ? styles.cardUnread : styles.cardRead]}
        activeOpacity={0.7}
        onPress={onTap}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconCircle}>
            <Icon width={24} height={24} />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.body}</Text>
        </View>
        <View style={styles.timestampWrap}>
          {isFresh && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>New</Text>
            </View>
          )}
          <Text style={styles.timestampText}>{formatTimeAgo(item.sent_at)}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ── Overlay ──────────────────────────────────────────────────────────────────
export function NotificationsOverlay() {
  const insets = useSafeAreaInsets();
  const { visible, anim, hide } = useNotificationsOverlay();
  const { notifications, loading, unreadCount, refresh, markRead, markAllRead, dismiss } =
    useNotifications();
  const performAction = useNotificationAction();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleTap = useCallback(
    (item: InboxNotification) => {
      if (!item.read_at) markRead(item.id);
      // Hand off to the type-based action registry. It knows whether to
      // route, open a sheet, trigger a system action, or just close —
      // and it handles closing the overlay first.
      performAction(item);
    },
    [markRead, performAction],
  );

  const renderItem = useCallback(
    ({ item }: { item: InboxNotification }) => (
      <NotificationCard
        item={item}
        onTap={() => handleTap(item)}
        onDismiss={() => dismiss(item.id)}
      />
    ),
    [handleTap, dismiss],
  );

  const ListHeader = useMemo(
    () => (
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.countRow}>
          <Text style={styles.countTextLight}>You have </Text>
          <Text style={styles.countTextBold}>{unreadCount} unread</Text>
          <Text style={styles.countTextLight}> notifications</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllRead}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MarkAsReadIcon />
            <Text style={styles.markAllText}>Mark as read</Text>
          </TouchableOpacity>
        )}
      </View>
    ),
    [unreadCount, markAllRead],
  );

  // Skip render entirely while hidden — saves the FlatList from doing
  // any work in the background.
  if (!visible) return null;

  return (
    <Animated.View
      style={[RNStyleSheet.absoluteFill, styles.overlay, { opacity: anim }]}
      pointerEvents="box-none"
    >
      {/* Solid page background — the dashboard underneath is hidden
          while the overlay is open. */}
      <View style={styles.background} pointerEvents="auto" />

      {/* List behind the header */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            // Match the dashboard header padding so the title block sits
            // exactly where Figma puts it — directly under the logo.
            paddingTop: insets.top + 24 + 48 + Spacing.s,
            paddingBottom: insets.bottom + Spacing.xl,
          },
          notifications.length === 0 && styles.listContentEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.s }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <UpdateBulbIcon width={64} height={64} />
              <Text style={styles.emptyTitle}>Nothing here yet</Text>
              <Text style={styles.emptyBody}>
                When the app has something for you, it'll show up here.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Fade gradient — solid background at the top fading to
          transparent further down. Lets the cards scroll underneath
          the header and blur out as they hit it, matching the
          dashboard pattern. Sits BELOW the header content layer. */}
      <LinearGradient
        colors={[Colors.background, Colors.background, 'rgba(226,241,238,0)']}
        locations={[0, 0.7, 1]}
        style={[styles.headerFade, { height: insets.top + 104 }]}
        pointerEvents="none"
      />

      {/* Header — logo on the LEFT (same coords as the dashboard's
          logo so it doesn't shift), close button on the RIGHT (same
          coords as the dashboard's menu hamburger so the bell visually
          becomes the close button without moving). */}
      <View
        style={[styles.header, { paddingTop: insets.top + 24 }]}
        pointerEvents="box-none"
      >
        <Logo width={141} height={36} />
        <TouchableOpacity style={styles.closeBtn} onPress={hide} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const TEAL_ROSE = '#e2f1ee';
const NEW_PILL_BG = '#b8dfd6';

const styles = StyleSheet.create({
  overlay: {
    zIndex: 90, // below the menu's 100 so menu wins ties; above content
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },
  // ── Header fade — solid bg fading to transparent so list scrolls
  //    underneath and blurs out as it meets the header ──
  headerFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
  },
  // ── Header (matches dashboard header coords exactly) ──
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 10,
  },
  closeBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  // ── Title block ──
  // No horizontal padding here — listContent already applies 24 px,
  // so the title aligns flush with the header logo and the cards.
  titleBlock: {
    marginBottom: Spacing.s,
    gap: Spacing.xs,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  countRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  countTextLight: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  countTextBold: {
    fontSize: 16,
    lineHeight: 18,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  markAllText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  // ── List + cards ──
  listContent: {
    paddingHorizontal: Spacing.m,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  // ── Swipe-to-dismiss action (red pill on the right of the card) ──
  dismissAction: {
    backgroundColor: Colors.status.negative,
    borderRadius: Radius.l,
    width: 72,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    padding: Spacing.s,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: Colors.surface.secondary,
  },
  cardRead: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  cardContent: {
    gap: 10,
    paddingRight: 72,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: TEAL_ROSE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  timestampWrap: {
    position: 'absolute',
    top: 15,
    right: 15,
    alignItems: 'flex-end',
    gap: 4,
  },
  newPill: {
    backgroundColor: NEW_PILL_BG,
    borderRadius: 999,
    paddingHorizontal: 8,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newPillText: {
    fontSize: 13,
    lineHeight: 15,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
  timestampText: {
    fontSize: 13,
    lineHeight: 15,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  // ── Empty state ──
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
    gap: Spacing.s,
  },
  emptyTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
});
