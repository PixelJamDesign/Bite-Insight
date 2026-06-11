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
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Animated,
  ActivityIndicator,
  StyleSheet as RNStyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DismissibleRow } from '@/components/DismissibleRow';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastContext';
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
  // Inbox glyph — matches the Figma "Mark as read" button (5363:24125).
  return (
    <Svg width={size} height={size} viewBox="0 0 14.8333 14.8333" fill="none">
      <Path
        d="M0.75 8.08333H2.85684C3.46029 8.08333 3.76201 8.08333 4.02723 8.20532C4.29245 8.3273 4.48881 8.55639 4.88152 9.01456L5.28514 9.48544C5.67786 9.94362 5.87422 10.1727 6.13944 10.2947C6.40465 10.4167 6.70638 10.4167 7.30982 10.4167H7.5235C8.12695 10.4167 8.42868 10.4167 8.69389 10.2947C8.95911 10.1727 9.15547 9.94362 9.54819 9.48544L9.95181 9.01456C10.3445 8.55639 10.5409 8.3273 10.8061 8.20532C11.0713 8.08333 11.373 8.08333 11.9765 8.08333H14.0833M7.41667 14.0833C4.27397 14.0833 2.70262 14.0833 1.72631 13.107C0.75 12.1307 0.75 10.5594 0.75 7.41667C0.75 4.27397 0.75 2.70262 1.72631 1.72631C2.70262 0.75 4.27397 0.75 7.41667 0.75C10.5594 0.75 12.1307 0.75 13.107 1.72631C14.0833 2.70262 14.0833 4.27397 14.0833 7.41667C14.0833 10.5594 14.0833 12.1307 13.107 13.107C12.1307 14.0833 10.5594 14.0833 7.41667 14.0833Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── One card ─────────────────────────────────────────────────────────────────
// Swipe behaviour is handled by the shared DismissibleRow component —
// see components/DismissibleRow.tsx for the gesture details.
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

  return (
    <DismissibleRow onDismiss={onDismiss} accessibilityLabel="Dismiss notification">
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
    </DismissibleRow>
  );
}

// ── Family invite card (Figma 5403:24287) ───────────────────────────────────
// A richer card variant: the inviter's avatar with a "+" badge, the consent
// copy, and two action buttons. Rendered for notifications of type
// 'family_invite'; the data field carries { token, inviter_name,
// inviter_avatar_url, family_profile_id }.
function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isFreshNotif(item: InboxNotification): boolean {
  return !item.read_at && Date.now() - new Date(item.sent_at).getTime() < 24 * 60 * 60 * 1000;
}

function FamilyInviteCard({
  item,
  onAccept,
  onDecline,
  onLeave,
  busy,
}: {
  item: InboxNotification;
  onAccept: () => void;
  onDecline: () => void;
  onLeave: () => void;
  busy: boolean;
}) {
  const data = (item.data ?? {}) as {
    inviter_name?: string;
    inviter_avatar_url?: string | null;
    accepted?: boolean;
  };
  const inviterName = data.inviter_name ?? 'Someone';
  const avatarUrl = data.inviter_avatar_url ?? undefined;
  const accepted = data.accepted === true;

  return (
    <View style={[styles.card, styles.cardUnread]}>
      <View style={styles.familyContent}>
        {/* Inviter avatar */}
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initialsFrom(inviterName)}</Text>
            )}
          </View>
        </View>

        {/* Text + actions (8px gap between the two, per Figma) */}
        <View style={styles.familyLower}>
          <View style={styles.familyText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.familyBody}>{item.body}</Text>
          </View>

          {accepted ? (
            <View style={styles.familyButtons}>
              <View style={[styles.familyBtn, styles.familyBtnJoined]}>
                <Text style={styles.familyBtnJoinedText}>Joined!</Text>
              </View>
              <TouchableOpacity
                style={[styles.familyBtn, styles.familyBtnLeave]}
                activeOpacity={0.85}
                onPress={onLeave}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={Colors.status.negative} />
                ) : (
                  <Text style={styles.familyBtnLeaveText}>Leave</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.familyButtons}>
              <TouchableOpacity
                style={[styles.familyBtn, styles.familyBtnYes]}
                activeOpacity={0.85}
                onPress={onAccept}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.familyBtnText}>Yes, Join Family</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.familyBtn, styles.familyBtnNo]}
                activeOpacity={0.85}
                onPress={onDecline}
                disabled={busy}
              >
                <Text style={styles.familyBtnText}>No, Thank You</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <View style={styles.timestampWrap}>
        {isFreshNotif(item) && (
          <View style={styles.newPill}>
            <Text style={styles.newPillText}>New</Text>
          </View>
        )}
        <Text style={styles.timestampText}>{formatTimeAgo(item.sent_at)}</Text>
      </View>
    </View>
  );
}

// Owner-side card: a family member accepted the invite. Shows the member's
// photo with a green tick and an info-only "Joined!" button.
function FamilyLinkAcceptedCard({ item }: { item: InboxNotification }) {
  const data = (item.data ?? {}) as { member_name?: string; member_avatar_url?: string | null };
  const memberName = data.member_name ?? 'They';
  const avatarUrl = data.member_avatar_url ?? undefined;

  return (
    <View style={[styles.card, styles.cardUnread]}>
      <View style={styles.familyContent}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>{initialsFrom(memberName)}</Text>
            )}
          </View>
          <View style={[styles.avatarBadge, styles.avatarBadgeCheck]}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        </View>

        <View style={styles.familyLower}>
          <View style={styles.familyText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.familyBody}>{item.body}</Text>
          </View>
          <View style={[styles.familyBtn, styles.familyBtnJoined, styles.familyBtnFull]}>
            <Text style={styles.familyBtnJoinedText}>Joined!</Text>
          </View>
        </View>
      </View>

      <View style={styles.timestampWrap}>
        {isFreshNotif(item) && (
          <View style={styles.newPill}>
            <Text style={styles.newPillText}>New</Text>
          </View>
        )}
        <Text style={styles.timestampText}>{formatTimeAgo(item.sent_at)}</Text>
      </View>
    </View>
  );
}

// ── Overlay ──────────────────────────────────────────────────────────────────
export function NotificationsOverlay() {
  const insets = useSafeAreaInsets();
  const { visible, anim, hide } = useNotificationsOverlay();
  const { notifications, loading, unreadCount, refresh, markRead, markAllRead, dismiss } =
    useNotifications();
  const performAction = useNotificationAction();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Respond to a family invite card.
  //   accept  → links the account, then flips the card to the "Joined!/Leave"
  //             state (we keep the card rather than dismissing it).
  //   decline → revokes the invite and removes the card.
  //   leave   → unlinks (the member leaves the family) and removes the card.
  const respondToInvite = useCallback(
    async (item: InboxNotification, action: 'accept' | 'decline' | 'leave') => {
      setRespondingId(item.id);
      try {
        if (action === 'leave') {
          const { error } = await supabase.functions.invoke('unlink-family-member', {
            body: { mode: 'leave' },
          });
          if (error) {
            showToast({ message: 'Could not leave. Try again.', variant: 'error' });
            return;
          }
          showToast({ message: "You've left the family.", variant: 'success' });
          await dismiss(item.id);
          return;
        }

        const token = (item.data as { token?: string } | null)?.token;
        if (!token) {
          showToast({ message: 'This invite is no longer valid.', variant: 'error' });
          return;
        }
        const { data, error } = await supabase.functions.invoke('accept-family-invite', {
          body: { token, action },
        });

        if (error) {
          // supabase-js wraps non-2xx responses in a FunctionsHttpError whose
          // .message is generic; the real message is in the response body.
          let msg = 'Something went wrong. Try again.';
          try {
            const ctx = (error as { context?: Response }).context;
            const body = ctx ? await ctx.json() : null;
            if (body?.error) msg = body.error as string;
          } catch {
            /* fall back to the generic message */
          }
          showToast({ message: msg, variant: 'error' });
          return;
        }

        const bodyErr = (data as { error?: string } | null)?.error;
        if (bodyErr) {
          showToast({ message: bodyErr, variant: 'error' });
          return;
        }

        if (action === 'accept') {
          showToast({ message: "You're in. You've joined the family.", variant: 'success' });
          // Flip the card to the joined state by marking the notification,
          // rather than dismissing it (gives them the Leave option).
          await supabase
            .from('notifications')
            .update({
              data: { ...((item.data as Record<string, unknown>) ?? {}), accepted: true },
              read_at: item.read_at ?? new Date().toISOString(),
            })
            .eq('id', item.id);
          await refresh();
        } else {
          await dismiss(item.id);
        }
      } catch {
        showToast({ message: 'Something went wrong. Try again.', variant: 'error' });
      } finally {
        setRespondingId(null);
      }
    },
    [dismiss, refresh, showToast],
  );

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
    ({ item }: { item: InboxNotification }) => {
      if (item.type === 'family_invite') {
        return (
          <DismissibleRow onDismiss={() => dismiss(item.id)} accessibilityLabel="Dismiss notification">
            <FamilyInviteCard
              item={item}
              busy={respondingId === item.id}
              onAccept={() => respondToInvite(item, 'accept')}
              onDecline={() => respondToInvite(item, 'decline')}
              onLeave={() => respondToInvite(item, 'leave')}
            />
          </DismissibleRow>
        );
      }
      if (item.type === 'family_link_accepted') {
        return (
          <DismissibleRow onDismiss={() => dismiss(item.id)} accessibilityLabel="Dismiss notification">
            <FamilyLinkAcceptedCard item={item} />
          </DismissibleRow>
        );
      }
      return (
        <NotificationCard
          item={item}
          onTap={() => handleTap(item)}
          onDismiss={() => dismiss(item.id)}
        />
      );
    },
    [handleTap, dismiss, respondToInvite, respondingId],
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
    paddingHorizontal: Spacing.m,
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
    // No horizontal padding — the rows span the full width so a swiped card
    // can slide off the screen edge. Cards inset themselves via marginHorizontal
    // (and the title block re-applies the 24px gutter).
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  card: {
    alignSelf: 'stretch',
    marginHorizontal: Spacing.m,
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
  // ── Family invite card (Figma 5403:24287) ──
  familyContent: {
    gap: 10,
    alignItems: 'flex-start',
  },
  avatarWrap: {
    width: 90,
    height: 90,
    position: 'relative',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.accent, // #3b9586 green-apple
    borderWidth: 3,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 22.5,
    lineHeight: 27,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.45,
    textAlign: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.secondary, // #00776f
    borderWidth: 2.25,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  avatarBadgeCheck: {
    backgroundColor: Colors.status.positive, // #3b9586 — green tick = joined
  },
  familyLower: {
    gap: Spacing.xs, // 8
    width: '100%',
  },
  familyText: {
    gap: Spacing.xxs, // 4
    width: '100%',
  },
  familyBody: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  familyButtons: {
    flexDirection: 'row',
    gap: Spacing.xxs, // 4
    width: '100%',
  },
  familyBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: Spacing.m, // 24
    borderRadius: Radius.m, // 8
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyBtnYes: {
    backgroundColor: Colors.secondary, // #00776f
  },
  familyBtnNo: {
    backgroundColor: Colors.status.negative, // #ff3f42
  },
  familyBtnText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.14,
  },
  familyBtnFull: { flex: 0, width: '100%' },
  familyBtnJoined: {
    backgroundColor: '#cfe1db', // muted teal-grey "done" state
  },
  familyBtnJoinedText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_700Bold',
    color: '#6f9c93',
    letterSpacing: -0.14,
  },
  familyBtnLeave: {
    backgroundColor: '#ffd9da', // light red
  },
  familyBtnLeaveText: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_700Bold',
    color: Colors.status.negative,
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
