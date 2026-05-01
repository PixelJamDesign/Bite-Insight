/**
 * Root index screen.
 *
 * expo-router needs a route to match the root path '/' on cold launch.
 * Without this file, opening the app from the home screen lands on
 * +not-found.tsx because:
 *   1. The user lands on '/'
 *   2. There's no app/index.tsx
 *   3. The (tabs) group has no index.tsx either (it was renamed to
 *      dashboard.tsx in v1.5.1 to give the dashboard a stable URL)
 *   4. expo-router falls through to +not-found.tsx
 *
 * This Redirect sends them to /(tabs)/dashboard. AuthGuard and
 * JourneyGuard in app/_layout.tsx then take over for unauthenticated
 * users (→ /(auth)/login) or users mid-onboarding (→ the appropriate
 * journey step).
 */
import { Redirect } from 'expo-router';

export default function RootIndex() {
  return <Redirect href={'/(tabs)/dashboard' as any} />;
}
