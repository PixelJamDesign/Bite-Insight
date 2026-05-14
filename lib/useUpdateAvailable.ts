/**
 * useUpdateAvailable — checks whether the installed app version is
 * older than the latest published version recorded in Supabase's
 * `app_config` table, and writes the installed version back to the
 * authenticated user's profile so we have a per-user view of which
 * builds are still in the wild.
 *
 * Why a Supabase table and not the App Store / Play Store APIs?
 *   - Apple's iTunes Lookup endpoint requires no auth but is
 *     rate-limited and occasionally returns a stale version while a
 *     new build is propagating. Play Store has no public version
 *     endpoint at all.
 *   - We control `app_config.latest_app_version` exactly, can bump
 *     it the moment a new build is live for everyone, and can roll
 *     it back if a release is pulled.
 *
 * Comparison is semver-major.minor.patch only — no pre-release
 * suffixes (we don't ship those). Anything unparseable falls
 * through to "up to date" so a malformed config row can't lock
 * users out of the app.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useTrialUpsell } from '@/lib/trialUpsellContext';

const SESSION_DISMISS_KEY = '__bi_update_toast_dismissed';

/** Parse "1.6.1" into [1, 6, 1]. Returns null on malformed input. */
function parseVersion(v: string | null | undefined): [number, number, number] | null {
  if (!v) return null;
  const parts = v.trim().split('.');
  if (parts.length !== 3) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;
  return [nums[0], nums[1], nums[2]];
}

/** Returns true when `installed` is strictly older than `latest`. */
function isOlder(installed: string, latest: string): boolean {
  const a = parseVersion(installed);
  const b = parseVersion(latest);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

/** Delay between conditions becoming favourable and the toast
 *  actually appearing. Long enough for the trial sheet to claim
 *  priority if it's about to show (it triggers at +1.5s on dashboard
 *  mount); short enough that the user doesn't feel kept waiting. */
const SHOW_DELAY_MS = 2500;

export function useUpdateAvailable() {
  const { session } = useAuth();
  const segments = useSegments();
  const { visible: trialVisible } = useTrialUpsell();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [visible, setVisible] = useState(false);
  const shownThisSessionRef = useRef(false);

  // Web is always running the latest bundle (no app stores, no
  // installed-version drift) so the toast has nothing meaningful
  // to say — and tapping Update would deep-link to the iOS App
  // Store or Play Store, which is the wrong destination for a
  // desktop browser. Short-circuit here.
  const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

  // Process-level dismiss flag survives unmount/remount within the
  // same JS runtime so navigating between tabs doesn't bring the
  // toast back after the user closes it. A full app relaunch
  // re-evaluates against app_config.
  const dismissed = (globalThis as any)[SESSION_DISMISS_KEY] === true;

  const installedVersion: string =
    (Constants.expoConfig?.version as string | undefined) ??
    (Constants.manifest as any)?.version ??
    '0.0.0';

  // ── Detection ─────────────────────────────────────────────────
  // Decide *whether* an update is available — independent of when
  // we'll surface the toast. The actual show decision lives in the
  // gating effect below.
  useEffect(() => {
    if (!isNativePlatform || dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'latest_app_version')
          .maybeSingle();
        if (cancelled || error || !data?.value) return;
        if (isOlder(installedVersion, data.value)) {
          setUpdateAvailable(true);
        }
      } catch {
        // Network failure — silently skip; we'll try again next launch.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Re-run when the user signs in so the toast shows after auth.
  }, [installedVersion, dismissed, session?.user?.id, isNativePlatform]);

  // ── Gating ────────────────────────────────────────────────────
  // The toast may only appear when:
  //   - An update is available
  //   - The user is on the home dashboard tab (not in onboarding,
  //     scan-result, settings, etc.)
  //   - No higher-priority sheet is currently visible (the trial
  //     upsell is the only known sibling today; add more checks
  //     here as new launch-time prompts land).
  //   - The toast hasn't already been shown or dismissed in this
  //     session.
  //
  // A small delay buffers the show — gives the trial-upsell trigger
  // (which fires ~1.5s after dashboard mount) time to claim priority
  // before we commit to showing the toast.
  useEffect(() => {
    if (!updateAvailable) return;
    if (shownThisSessionRef.current) return;
    if (dismissed) return;

    const onDashboard = segments[0] === '(tabs)' && segments[1] === 'dashboard';
    if (!onDashboard) return;
    if (trialVisible) return;

    const timer = setTimeout(() => {
      // Re-check inside the timer in case the trial sheet appeared
      // during the delay window.
      shownThisSessionRef.current = true;
      setVisible(true);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
  }, [updateAvailable, segments, trialVisible, dismissed]);

  // Backfill profiles.app_version once per session per user so we
  // have aggregate visibility into which builds are still active.
  // Skip on web — there's no "installed app version" to record.
  useEffect(() => {
    if (!isNativePlatform) return;
    const userId = session?.user?.id;
    if (!userId) return;
    supabase
      .from('profiles')
      .update({ app_version: installedVersion })
      .eq('id', userId)
      .then(({ error }) => {
        if (error) console.warn('[useUpdateAvailable] write app_version failed:', error.message);
      });
  }, [session?.user?.id, installedVersion, isNativePlatform]);

  const dismiss = useCallback(() => {
    (globalThis as any)[SESSION_DISMISS_KEY] = true;
    setVisible(false);
  }, []);

  /** Bypass every gate (route, trial visibility, cooldown, dismiss flag)
   *  and surface the toast immediately. Used by the hidden debug menu
   *  so QA can verify the toast UI without bumping app_config. */
  const debugForceShow = useCallback(() => {
    (globalThis as any)[SESSION_DISMISS_KEY] = false;
    setVisible(true);
  }, []);

  // Register the force-show fn at module level so the DebugMenu can
  // invoke it without prop drilling or sharing context. Only one
  // gate mounts the hook so the singleton pattern is safe.
  useLayoutEffect(() => {
    _moduleForceShow = debugForceShow;
    return () => {
      _moduleForceShow = null;
    };
  }, [debugForceShow]);

  return { visible, dismiss, debugForceShow };
}

let _moduleForceShow: (() => void) | null = null;

/** Trigger the update toast from anywhere — bypasses all gating
 *  rules. Used by the hidden debug menu. No-op if the toast gate
 *  isn't mounted (e.g. before auth). */
export function debugForceShowUpdateToast(): void {
  _moduleForceShow?.();
}
