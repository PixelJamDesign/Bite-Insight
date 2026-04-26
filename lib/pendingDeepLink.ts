/**
 * Pending deep-link memory.
 *
 * When an unauthenticated user opens a deep link (e.g. a friend's
 * shared recipe), AuthGuard sends them through login first. This
 * helper holds the intended URL across that round-trip so we can
 * land them back on the recipe after they've signed in / completed
 * onboarding.
 *
 * Persisted via AsyncStorage rather than in-memory so it survives
 * the app being killed and re-opened from the deep link itself
 * (the launch flow runs the layout from scratch).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'pendingDeepLinkPath';

/**
 * Save the path the user was trying to reach. Pass an absolute
 * route path like '/recipes/abc-123' — anything the expo-router
 * Redirect can accept.
 */
export async function savePendingDeepLink(path: string): Promise<void> {
  // Don't memorise auth / journey routes — we never want to send the
  // user back to a login or onboarding screen after they've finished
  // those flows.
  if (
    path.startsWith('/(auth)') ||
    path.startsWith('/onboarding') ||
    path.startsWith('/disclaimer') ||
    path.startsWith('/app-tour') ||
    path.startsWith('/whats-new')
  ) {
    return;
  }
  try {
    await AsyncStorage.setItem(KEY, path);
  } catch {
    // Non-critical — the user just won't be auto-restored.
  }
}

/** Read and clear the saved path. Returns null if there isn't one. */
export async function consumePendingDeepLink(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(KEY);
    if (value) await AsyncStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}

/** Clear without reading — used if we want to give up on the
 *  saved path (e.g. it's stale or invalid). */
export async function clearPendingDeepLink(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // Non-critical.
  }
}
