/**
 * useExpoPushToken — captures the device's Expo push token after
 * permission is granted and persists it to profiles.expo_push_token.
 *
 * The token is what the server-side send-trial-reminders edge
 * function POSTs to https://exp.host/--/api/v2/push/send. Without
 * it, no push can reach the device.
 *
 * Token capture is fire-once-per-session — the same token usually
 * doesn't change across launches, but Expo can occasionally rotate
 * it (rare). A future enhancement: subscribe to
 * Notifications.addPushTokenListener so rotations are caught.
 *
 * Permission flow:
 *   1. Check current status (Notifications.getPermissionsAsync).
 *   2. If undetermined, prompt.
 *   3. If granted, fetch the token and write to profiles.
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
    if (!userId) return;
    // Avoid re-fetching the same token for the same user within a session.
    if (writtenForUserRef.current === userId) return;

    (async () => {
      const token = await getPushToken();
      if (!token) return;
      writtenForUserRef.current = userId;

      const { error } = await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', userId);

      if (error) {
        console.warn('[useExpoPushToken] write failed:', error.message);
      }
    })();
  }, [session?.user?.id]);
}
