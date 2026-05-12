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
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

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

export function useUpdateAvailable() {
  const { session } = useAuth();
  const [visible, setVisible] = useState(false);

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
          setVisible(true);
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

  return { visible, dismiss };
}
