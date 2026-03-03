import { router } from 'expo-router';

/**
 * Navigate back if possible, otherwise fall back to the dashboard.
 * Prevents users getting stuck on a screen with no back history
 * (e.g. after a `router.replace()` or deep link).
 */
export function safeBack() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/');
  }
}
