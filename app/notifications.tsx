/**
 * /notifications — the in-app inbox.
 *
 * Visual reference: Figma 5363:23905. Layout:
 *   - Header: Bite Insight logo (left) + close button (right) on a
 *     fade-to-page gradient so cards scroll under it
 *   - "Notifications" H3 title
 *   - Mixed-weight count: "You have N unread notifications"
 *   - "Mark as read" CTA (only when there's anything unread)
 *   - List of cards. Each card:
 *       - 42 px tinted-teal circle with a 24 px topic icon
 *       - Title (Heading 5)
 *       - Body (Small Paragraph)
 *       - Absolute top-right: optional "New" pill + relative
 *         timestamp like "33m ago"
 *
 * Tap → mark read → route to deep link. Long-press → confirm
 * dismiss → soft-delete via dismissed_at.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useNotifications, type InboxNotification } from '@/lib/notificationsContext';
import Logo from '../assets/images/logo.svg';
import UpdateBulbIcon from '../assets/icons/update_bulb.svg';
import UpdateBalloonIcon from '../assets/icons/update_balloon.svg';
import UpdateScannerIcon from '../assets/icons/update_scanner.svg';
import UpdateUserIcon from '../assets/icons/update_user.svg';

// ── Per-type metadata ────────────────────────────────────────────────────────
// Maps notification.type → icon component. Adding a new push category
// is one line here. Falls back to bulb for anything unrecognised.
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

// ── "Mark as read" inbox icon (small SVG used in the top-of-screen
//     mark-all-read button) ─────────────────────────────────────────────────
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

// ── A single row card ────────────────────────────────────────────────────────
function NotificationCard({
  item,
  onTap,
  onLongPress,
}: {
  item: InboxNotification;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const Icon = TYPE_ICON[item.type] ?? DEFAULT_ICON;
  const isUnread = !item.read_at;
  // "New" pill fires on unread notifications less than 24 hours old —
  // matches the Figma reference where only the freshest unread row
  // wears the pill.
  const isFresh =
    isUnread && Date.now() - new Date(item.sent_at).getTime() < 24 * 60 * 60 * 1000;

  return (
    <TouchableOpacity
      style={[styles.card, isUnread ? styles.cardUnread : styles.cardRead]}
      activeOpacity={0.7}
      onPress={onTap}
      onLongPress={onLongPress}
      delayLongPress={400}
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
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { notifications, loading, unreadCount, refresh, markRead, markAllRead, dismiss } =
    useNotifications();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleTap = useCallback(
    (item: InboxNotification) => {
      if (!item.read_at) markRead(item.id); // fire-and-forget
      if (item.deep_link) {
        const path = item.deep_link.replace(/^biteinsight:\/\//, '/');
        router.push(path as any);
      }
    },
    [markRead],
  );

  const handleLongPress = useCallback(
    (item: InboxNotification) => {
      Alert.alert('Dismiss notification?', item.title, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Dismiss', style: 'destructive', onPress: () => dismiss(item.id) },
      ]);
    },
    [dismiss],
  );

  const renderItem = useCallback(
    ({ item }: { item: InboxNotification }) => (
      <NotificationCard
        item={item}
        onTap={() => handleTap(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [handleTap, handleLongPress],
  );

  // ── List header — title + count + mark-all-read ───────────────────────────
  const ListHeader = useMemo(
    () => (
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.countRow}>
          <Text style={styles.countTextLight}>You have </Text>
          <Text style={styles.countTextBold}>
            {unreadCount} unread
          </Text>
          <Text style={styles.countTextLight}>
            {' '}notifications
          </Text>
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

  return (
    <View style={styles.screen}>
      {/* List behind the header — cards scroll under the fade gradient. */}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: insets.top + 90,
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
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>
                When the app has something for you — a trial update, a reminder, a tip — it'll
                show up here.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Floating header — logo + close button. Sits absolutely over
          the list with a fade-to-page gradient so cards scroll under it. */}
      <LinearGradient
        colors={[Colors.background, 'rgba(226,241,238,0)']}
        locations={[0.82, 1]}
        pointerEvents="box-none"
        style={[styles.header, { paddingTop: insets.top + Spacing.m }]}
      >
        <View style={styles.headerInner}>
          <Logo width={121} height={30} />
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/dashboard' as any))}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const TEAL_ROSE = '#e2f1ee'; // var(--teal/spring-water) — icon-circle bg
const NEW_PILL_BG = '#b8dfd6';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // ── Header ──
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.s,
    paddingHorizontal: Spacing.m,
    zIndex: 10,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  closeBtn: {
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
  // ── Title block ──
  titleBlock: {
    paddingHorizontal: Spacing.m,
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
  // ── List ──
  listContent: {
    paddingHorizontal: Spacing.m,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  // ── Card ──
  card: {
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.stroke.primary, // white
    padding: Spacing.s,
    position: 'relative',
  },
  cardUnread: {
    backgroundColor: Colors.surface.secondary, // solid white
  },
  cardRead: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  cardContent: {
    gap: 10,
    paddingRight: 72, // reserve space for the absolute timestamp/pill
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
