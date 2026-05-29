/**
 * useExpoPushToken — captures the device's Expo push token after
 * permission is granted and persists it to push_tokens.
 *
 * Multi-device support: each device upserts its own row in push_tokens
 * keyed on the token string (unique). So one user can have an iPhone,
 * an iPad, and an Android phone all signed in and all reachable. The
 * server-side push code fans out to every row for the target user.
 *
 * If the same device later signs in as a different user, the upsert
 * transfers ownership of that row to the new user (the token itself
 * is bound to the device, not the account).
 *
 * Token capture is fire-once-per-session — the same token usually
 * doesn't change across launches, but Expo can occasionally rotate
 * it (rare). A future enhancement: subscribe to
 * Notifications.addPushTokenListener so rotations are caught.
 *
 * Permission flow:
 *   1. Check current status (Notifications.getPermissionsAsync).
 *   2. If undetermined, prompt.
 *   3. If granted, fetch the token and write to push_tokens.
 *   4. If denied, do nothing — we silently lose this user from the
 *      Day-6 push audience. Apple's own system reminder still fires
 *      so they aren't completely uninformed.
 *
 * Web is skipped — Expo push tokens are a native-only concept.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// Module-level guard so we never request permission more than once
// per JS runtime (the prompt is annoying enough as it is).
let permissionRequested = false;

async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null; // Simulators can't get real tokens

  // Cast to any — expo-notifications imports its PermissionResponse
  // type from expo-modules-core which isn't resolvable from the root
  // node_modules in this project. The runtime fields (granted,
  // canAskAgain) exist; tsc just can't see them.
  const current = (await Notifications.getPermissionsAsync()) as any;
  let granted: boolean = current.granted;

  if (!granted && current.canAskAgain && !permissionRequested) {
    permissionRequested = true;
    const request = (await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    })) as any;
    granted = request.granted;
  }

  if (!granted) return null;

  // Expo's projectId is needed for the new push token API.
  // Falls back to Constants.expoConfig.extra.eas.projectId set in
  // app.json.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.expoConfig?.extra as any)?.eas?.projectId;
  if (!projectId) {
    console.warn('[useExpoPushToken] No EAS projectId — cannot fetch token');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (err) {
    console.warn('[useExpoPushToken] getExpoPushTokenAsync failed:', err);
    return null;
  }
}

export function useExpoPushToken() {
  const { session } = useAuth();
  const writtenForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const userId = session?.user?.id;
    if (!userId) {
      // If the user signs out, clear the guard so the next sign-in
      // (possibly as a different user on the same device) re-runs the
      // upsert and transfers ownership of this device's token.
      writtenForUserRef.current = null;
      return;
    }
    // Avoid re-running for the same user within a single JS session.
    if (writtenForUserRef.current === userId) return;

    (async () => {
      const token = await getPushToken();
      if (!token) return;
      writtenForUserRef.current = userId;

      // Upsert keyed on the token string (unique in push_tokens). Same
      // device + same user → harmless refresh of last_seen_at. Same
      // device + new user → transfers ownership. New device → new row.
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: userId,
            expo_push_token: token,
            platform: Platform.OS, // 'ios' | 'android' (web is short-circuited above)
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'expo_push_token' },
        );

      if (error) {
        console.warn('[useExpoPushToken] upsert failed:', error.message);
      }
    })();
  }, [session?.user?.id]);
}
