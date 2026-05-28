/**
 * /notifications — the in-app inbox.
 *
 * Reverse-chronological list of every push the app has sent the
 * current user. Tap a row → mark read → route to the row's deep
 * link. Swipe (or long-press) to dismiss (soft delete via
 * dismissed_at).
 *
 * Lives independently of iOS notifications — users see this even
 * when push permission is denied, banners are missed, or iOS has
 * cleared the system notification.
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useNotifications, type InboxNotification } from '@/lib/notificationsContext';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';

// ── Per-type metadata for icons + accents ────────────────────────────────────
// Centralised here so adding a new push category is one line of metadata
// instead of a switch statement in the row renderer.
type NotificationTypeMeta = {
  icon: '🎉' | '⏱' | '⚠️' | '🔔' | '⭐' | '🍽';
  accent: string;
};

const TYPE_META: Record<string, NotificationTypeMeta> = {
  trial_welcome:       { icon: '🎉', accent: Colors.accent },
  trial_day3_midway:   { icon: '🍽', accent: Colors.accent },
  trial_day6_reminder: { icon: '⏱', accent: Colors.status.negative },
  trial_converted:    { icon: '🎉', accent: Colors.accent },
  inactivity_5d:      { icon: '🍽', accent: Colors.secondary },
  review_request:     { icon: '⭐', accent: '#ffc72d' },
  first_scan:         { icon: '🎉', accent: Colors.accent },
};

const DEFAULT_META: NotificationTypeMeta = { icon: '🔔', accent: Colors.secondary };

// ── Time-ago helper ──────────────────────────────────────────────────────────
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

// ── Empty state SVG ──────────────────────────────────────────────────────────
function EmptyInboxIcon() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
      <Path
        d="M32 6C22.06 6 14 14.06 14 24v12.5L9 41v3h46v-3l-5-4.5V24c0-9.94-8.06-18-18-18zm0 52a6 6 0 0 0 6-6H26a6 6 0 0 0 6 6z"
        fill={Colors.surface.tertiary}
        stroke="#aad4cd"
        strokeWidth={2}
      />
    </Svg>
  );
}

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
    async (item: InboxNotification) => {
      if (!item.read_at) {
        markRead(item.id); // fire-and-forget, doesn't block routing
      }
      if (item.deep_link) {
        // Strip the biteinsight:// scheme — expo-router accepts the path part
        const path = item.deep_link.replace(/^biteinsight:\/\//, '/');
        router.push(path as any);
      }
    },
    [markRead],
  );

  const handleLongPress = useCallback(
    (item: InboxNotification) => {
      Alert.alert(
        'Dismiss notification?',
        item.title,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Dismiss', style: 'destructive', onPress: () => dismiss(item.id) },
        ],
      );
    },
    [dismiss],
  );

  const renderItem = useCallback(
    ({ item }: { item: InboxNotification }) => {
      const meta = TYPE_META[item.type] ?? DEFAULT_META;
      const isUnread = !item.read_at;
      return (
        <TouchableOpacity
          style={[styles.row, isUnread && styles.rowUnread]}
          activeOpacity={0.7}
          onPress={() => handleTap(item)}
          onLongPress={() => handleLongPress(item)}
          delayLongPress={400}
        >
          <View style={[styles.iconCircle, { backgroundColor: meta.accent + '20' }]}>
            <Text style={styles.iconEmoji}>{meta.icon}</Text>
          </View>
          <View style={styles.rowText}>
            <View style={styles.rowHeaderRow}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.rowTime}>{formatTimeAgo(item.sent_at)}</Text>
            </View>
            <Text style={styles.rowBody} numberOfLines={2}>
              {item.body}
            </Text>
          </View>
          {isUnread && <View style={[styles.unreadDot, { backgroundColor: meta.accent }]} />}
        </TouchableOpacity>
      );
    },
    [handleTap, handleLongPress],
  );

  const Header = useMemo(() => {
    return (
      <View style={[styles.header, { paddingTop: insets.top + Spacing.s }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MenuArrowLeftIcon color={Colors.primary} size={24} />
          </TouchableOpacity>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.subtitle}>
          {unreadCount > 0
            ? `${unreadCount} unread`
            : notifications.length > 0
              ? 'All caught up'
              : "You'll see updates here"}
        </Text>
      </View>
    );
  }, [insets.top, unreadCount, notifications.length, markAllRead]);

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.listContentEmpty,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <EmptyInboxIcon />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>
                When the app has something for you — a trial update, a reminder,
                a tip — it'll show up here.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.s,
  },
  title: {
    ...Typography.h2,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  subtitle: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    marginTop: 2,
  },
  markAllText: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_700Bold',
    color: Colors.accent,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.s,
    marginHorizontal: Spacing.s,
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#e6f0ee',
    alignItems: 'flex-start',
    gap: Spacing.xs,
  },
  rowUnread: {
    borderColor: '#aad4cd',
    backgroundColor: '#f5fbfa',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 20,
    lineHeight: 22,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  rowTitle: {
    ...Typography.h6,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    flex: 1,
  },
  rowTime: {
    fontSize: 12,
    lineHeight: 14,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  rowBody: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
    gap: Spacing.s,
  },
  emptyTitle: {
    ...Typography.h4,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyBody: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
});
