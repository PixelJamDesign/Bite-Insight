/**
 * useTrialUpsellTrigger — decides when the opportunistic free-trial
 * sheet should appear on app open.
 *
 * Designed to be mounted exactly once, near the top of the tree
 * (see TrialUpsellGate in app/_layout.tsx). It evaluates the rules
 * below on every fresh session and, if all pass, calls
 * `showTrialUpsell()` after a short delay so the dashboard has a
 * moment to render.
 *
 * Rules — ALL must be true for the sheet to fire:
 *   1. User is signed in.
 *   2. User is NOT Plus / VIP.
 *   3. User is eligible for the App Store / Play Store trial
 *      (RevenueCat's checkTrialOrIntroductoryPriceEligibility).
 *   4. The user has previously converted? → never show again.
 *   5. Lifetime dismiss count is < MAX_LIFETIME_SHOWS.
 *   6. First-seen timestamp is older than GRACE_HOURS (don't
 *      ambush brand-new users mid-onboarding).
 *   7. Last-shown timestamp is older than COOLDOWN_DAYS, OR
 *      never shown.
 *   8. A coin flip with probability TRIGGER_PROBABILITY says yes
 *      — makes timing feel less mechanical so users aren't
 *      certain they'll see it on cooldown reset.
 *
 * To tune the aggressiveness later: change the constants, no
 * other code touches them.
 */
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { useTrialUpsell, TRIAL_UPSELL_KEYS } from '@/lib/trialUpsellContext';

const GRACE_HOURS = 48;
const COOLDOWN_DAYS = 7;
const MAX_LIFETIME_SHOWS = 3;
const TRIGGER_PROBABILITY = 0.5;
/** Delay after the rules pass before the sheet appears, so the
 *  dashboard renders first and the sheet feels like a follow-up
 *  rather than a hijack of the launch. */
const SHOW_DELAY_MS = 1500;

export function useTrialUpsellTrigger() {
  const { session } = useAuth();
  const { isPlus, trialEligible } = useSubscription();
  const { showTrialUpsell } = useTrialUpsell();

  // One-shot per app launch — prevents the rules being re-evaluated
  // on every dependency change. A relaunch resets the ref naturally.
  const firedThisLaunchRef = useRef(false);

  useEffect(() => {
    // Web has no app stores to deep-link to and no installed-version
    // drift — there's nothing useful to surface here.
    if (Platform.OS === 'web') return;

    const userId = session?.user?.id;
    if (!userId) return;
    if (isPlus) return;
    if (!trialEligible) return;
    if (firedThisLaunchRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        // Read all four persisted markers in parallel.
        const [convertedAt, firstSeenAt, lastShownAt, dismissCountRaw] =
          await Promise.all([
            AsyncStorage.getItem(TRIAL_UPSELL_KEYS.convertedAt),
            AsyncStorage.getItem(TRIAL_UPSELL_KEYS.firstSeenAt),
            AsyncStorage.getItem(TRIAL_UPSELL_KEYS.lastShownAt),
            AsyncStorage.getItem(TRIAL_UPSELL_KEYS.dismissCount),
          ]);

        if (cancelled) return;

        // Rule 4 — converted = never again.
        if (convertedAt) return;

        // Stamp first-seen on the very first eligible session. From
        // this point the grace clock starts ticking; the sheet
        // can't possibly fire until GRACE_HOURS have elapsed.
        const nowIso = new Date().toISOString();
        if (!firstSeenAt) {
          await AsyncStorage.setItem(TRIAL_UPSELL_KEYS.firstSeenAt, nowIso);
          return; // wait at least one more session before considering
        }

        // Rule 6 — grace period.
        const firstSeenMs = Date.parse(firstSeenAt);
        if (Number.isFinite(firstSeenMs)) {
          const hoursSinceFirstSeen = (Date.now() - firstSeenMs) / 3_600_000;
          if (hoursSinceFirstSeen < GRACE_HOURS) return;
        }

        // Rule 5 — lifetime cap.
        const dismissCount = dismissCountRaw ? parseInt(dismissCountRaw, 10) || 0 : 0;
        if (dismissCount >= MAX_LIFETIME_SHOWS) return;

        // Rule 7 — cooldown since last show.
        if (lastShownAt) {
          const lastShownMs = Date.parse(lastShownAt);
          if (Number.isFinite(lastShownMs)) {
            const daysSinceShown = (Date.now() - lastShownMs) / 86_400_000;
            if (daysSinceShown < COOLDOWN_DAYS) return;
          }
        }

        // Rule 8 — coin flip. Pulled last so the deterministic rules
        // above always run first (cheaper, more useful in logs).
        if (Math.random() >= TRIGGER_PROBABILITY) return;

        firedThisLaunchRef.current = true;

        // Small delay so the dashboard mounts before the sheet appears.
        setTimeout(() => {
          if (cancelled) return;
          showTrialUpsell();
        }, SHOW_DELAY_MS);
      } catch (err) {
        // Failing closed (no sheet) is the right default — never let
        // a storage hiccup block the app or surprise the user.
        console.warn('[useTrialUpsellTrigger] evaluation failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, isPlus, trialEligible, showTrialUpsell]);
}
