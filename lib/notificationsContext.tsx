/**
 * notificationsContext — single source of truth for the in-app
 * notification inbox.
 *
 *   - Fetches the current user's notifications on mount + on demand
 *   - Subscribes to Postgres realtime so unread count + list update
 *     the moment a new push lands
 *   - Exposes mark-read, mark-all-read, and dismiss actions
 *   - Provides the unread count used by the bell badge anywhere in
 *     the app
 *
 * Mounted by NotificationsProvider in app/_layout.tsx so every screen
 * can use useNotifications() / useNotificationsUnreadCount() without
 * passing props around.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  deep_link: string | null;
  data: Record<string, unknown> | null;
  sent_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

interface NotificationsContextValue {
  notifications: InboxNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  dismiss: async () => {},
});

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [notifications, setNotifications] = useState<InboxNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, title, body, deep_link, data, sent_at, read_at, dismissed_at')
      .eq('user_id', userId)
      .is('dismissed_at', null)
      .order('sent_at', { ascending: false })
      .limit(100);
    if (error) {
      console.warn('[notifications] fetch failed:', error.message);
      setLoading(false);
      return;
    }
    setNotifications((data ?? []) as InboxNotification[]);
    setLoading(false);
  }, [userId]);

  // Initial fetch + refetch on user change.
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: receive INSERTS (new notifications arriving) and UPDATES
  // (read state changing from another device) for this user only.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { refresh(); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markRead = useCallback(async (id: string) => {
    if (!userId) return;
    // Optimistic update so the UI feels instant
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) {
      console.warn('[notifications] markRead failed:', error.message);
      // Roll back optimistic update on failure
      refresh();
    }
  }, [userId, refresh]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    );
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) {
      console.warn('[notifications] markAllRead failed:', error.message);
      refresh();
    }
  }, [userId, refresh]);

  const dismiss = useCallback(async (id: string) => {
    if (!userId) return;
    // Remove from local list immediately
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const { error } = await supabase
      .from('notifications')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      console.warn('[notifications] dismiss failed:', error.message);
      refresh();
    }
  }, [userId, refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read_at).length,
    [notifications],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({ notifications, unreadCount, loading, refresh, markRead, markAllRead, dismiss }),
    [notifications, unreadCount, loading, refresh, markRead, markAllRead, dismiss],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
