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

// One-line tag used by every diagnostic log so `adb logcat | grep PUSHDIAG`
// catches the full trace from a single sign-in flow. iOS shows the same
// tag in Xcode console / Console.app.
const TAG = '[PUSHDIAG]';

async function getPushToken(): Promise<string | null> {
  console.log(`${TAG} getPushToken: enter; platform=${Platform.OS}, isDevice=${Device.isDevice}`);
  if (!Device.isDevice) {
    console.log(`${TAG} bail: !Device.isDevice (simulator)`);
    return null;
  }

  // Cast to any — expo-notifications imports its PermissionResponse
  // type from expo-modules-core which isn't resolvable from the root
  // node_modules in this project. The runtime fields (granted,
  // canAskAgain) exist; tsc just can't see them.
  const current = (await Notifications.getPermissionsAsync()) as any;
  let granted: boolean = current.granted;
  console.log(
    `${TAG} getPermissionsAsync: granted=${granted}, canAskAgain=${current.canAskAgain}, status=${current.status}`,
  );

  if (!granted && current.canAskAgain && !permissionRequested) {
    console.log(`${TAG} requestPermissionsAsync: prompting`);
    permissionRequested = true;
    const request = (await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    })) as any;
    granted = request.granted;
    console.log(`${TAG} requestPermissionsAsync: granted=${granted}, status=${request.status}`);
  }

  if (!granted) {
    console.log(`${TAG} bail: permission not granted after request`);
    return null;
  }

  // Expo's projectId is needed for the new push token API.
  // Falls back to Constants.expoConfig.extra.eas.projectId set in
  // app.json.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants.expoConfig?.extra as any)?.eas?.projectId;
  console.log(`${TAG} projectId resolved: ${projectId ? `${String(projectId).slice(0, 8)}…` : 'MISSING'}`);
  if (!projectId) {
    console.warn(`${TAG} bail: No EAS projectId`);
    return null;
  }

  try {
    console.log(`${TAG} getExpoPushTokenAsync: calling`);
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log(`${TAG} getExpoPushTokenAsync: OK, token=${token.data.slice(0, 25)}…`);
    return token.data;
  } catch (err: any) {
    console.warn(`${TAG} getExpoPushTokenAsync threw: ${err?.message ?? String(err)}`);
    return null;
  }
}

export function useExpoPushToken() {
  const { session } = useAuth();
  const writtenForUserRef = useRef<string | null>(null);

  useEffect(() => {
    console.log(
      `${TAG} effect tick: platform=${Platform.OS}, userId=${session?.user?.id ?? 'null'}, writtenFor=${writtenForUserRef.current ?? 'null'}`,
    );
    if (Platform.OS === 'web') return;
    const userId = session?.user?.id;
    if (!userId) {
      console.log(`${TAG} bail: no userId yet`);
      return;
    }
    // Avoid re-fetching the same token for the same user within a session.
    if (writtenForUserRef.current === userId) {
      console.log(`${TAG} bail: already written for this userId this session`);
      return;
    }

    (async () => {
      const token = await getPushToken();
      if (!token) {
        console.log(`${TAG} no token returned; nothing to write`);
        return;
      }
      writtenForUserRef.current = userId;

      console.log(`${TAG} writing to profiles for userId=${userId.slice(0, 8)}…`);
      const { error, status, statusText } = await supabase
        .from('profiles')
        .update({ expo_push_token: token })
        .eq('id', userId);

      if (error) {
        console.warn(`${TAG} write failed: ${error.message} (status=${status})`);
      } else {
        console.log(`${TAG} write OK (status=${status} ${statusText ?? ''})`);
      }
    })();
  }, [session?.user?.id]);
}
