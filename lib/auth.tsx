import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, getAvatarUrl } from './supabase';

const SessionContext = createContext<{
  session: Session | null;
  loading: boolean;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
}>({
  session: null,
  loading: true,
  avatarUrl: null,
  setAvatarUrl: () => {},
});

/**
 * Wrap the root layout with this provider so every screen in the app shares
 * a single auth subscription and a single getSession() call on cold start.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setAvatarUrl(data?.avatar_url ? getAvatarUrl(data.avatar_url) : null);
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.id) {
        supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            setAvatarUrl(data?.avatar_url ? getAvatarUrl(data.avatar_url) : null);
          });
      } else {
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ session, loading, avatarUrl, setAvatarUrl }}>
      {children}
    </SessionContext.Provider>
  );
}

/** Drop-in replacement for the old useAuth() hook — all call sites unchanged. */
export function useAuth() {
  return useContext(SessionContext);
}
