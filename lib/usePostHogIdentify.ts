/**
 * usePostHogIdentify — attaches a PostHog identity to the analytics
 * stream whenever an auth session lands.
 *
 * What we send to PostHog as user properties:
 *   - email (the only PII; needed to cross-reference support tickets)
 *   - home_country_code (e.g. 'gb', 'us', 'in', 'au')
 *   - is_plus (boolean — paying tier)
 *   - is_vip (boolean — comped lifetime access, mainly for support)
 *   - signup_date (when the auth user was created)
 *
 * What we DON'T send (privacy):
 *   - Any health conditions, allergies, dietary preferences
 *   - Family member profiles
 *   - Scan history / specific products
 *   - Flagged ingredients
 *
 * Identify runs once per session per user id. We reset the
 * identity on logout so the next sign-in starts a fresh chain.
 */
import { useEffect, useRef } from 'react';
import { usePostHog } from 'posthog-react-native';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { useRegion } from '@/lib/regionContext';

export function usePostHogIdentify() {
  const posthog = usePostHog();
  const { session } = useAuth();
  const { isPlus } = useSubscription();
  const { homeCountryCode } = useRegion();
  const identifiedForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!posthog) return;

    const userId = session?.user?.id;

    // No session → reset PostHog identity so the next sign-in
    // doesn't leak into the previous user's event stream.
    if (!userId) {
      if (identifiedForUserRef.current) {
        posthog.reset();
        identifiedForUserRef.current = null;
      }
      return;
    }

    // Skip re-identifying the same user within a session — PostHog
    // already merges duplicate identifies but the extra call is wasted.
    if (identifiedForUserRef.current === userId) return;
    identifiedForUserRef.current = userId;

    posthog.identify(userId, {
      email: session.user.email ?? null,
      home_country_code: homeCountryCode ?? 'unknown',
      is_plus: isPlus,
      signup_date: session.user.created_at ?? null,
    });
  }, [posthog, session?.user?.id, session?.user?.email, session?.user?.created_at, homeCountryCode, isPlus]);
}
