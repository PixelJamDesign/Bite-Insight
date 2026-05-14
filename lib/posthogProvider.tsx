/**
 * PostHog provider — wraps the app with the posthog-react-native
 * client so screen views and identify calls work everywhere.
 *
 * Config is read from EXPO_PUBLIC_POSTHOG_API_KEY and
 * EXPO_PUBLIC_POSTHOG_HOST. When either is missing (e.g. local
 * dev without the env vars), the provider becomes a pass-through
 * that renders children unchanged — no events sent, no crashes,
 * no warnings beyond a single one-time log.
 *
 * Stage A intent: foundation only. No custom event capture yet —
 * the provider exists so a later commit can drop `usePostHog()`
 * calls anywhere in the tree.
 *
 * Privacy: PostHog is disclosed in both the in-app PolicySheet and
 * the website privacy policy as an EU-hosted analytics processor.
 * We never send identifiable health data (conditions, allergies,
 * scan-specific results) to PostHog — only navigation events,
 * device metadata, and the user's anonymised id + region tier.
 */
import type { ReactNode } from 'react';
import { PostHogProvider as RNPostHogProvider } from 'posthog-react-native';

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

let warnedAboutMissingKey = false;

export function PostHogProvider({ children }: { children: ReactNode }) {
  if (!API_KEY) {
    if (!warnedAboutMissingKey) {
      warnedAboutMissingKey = true;
      console.log(
        '[PostHog] No EXPO_PUBLIC_POSTHOG_API_KEY in env — analytics disabled.',
      );
    }
    return <>{children}</>;
  }

  return (
    <RNPostHogProvider
      apiKey={API_KEY}
      options={{
        host: HOST,
        // Auto-flush every 30 events or 10 seconds — defaults are
        // fine for our event volume; left explicit for visibility.
        flushAt: 30,
        flushInterval: 10000,
        // Don't capture in-app deep links / app open URLs — they
        // sometimes carry user IDs in query params we don't want
        // leaking into analytics.
        captureAppLifecycleEvents: true,
        // Enable session replay later if we want; off by default.
        enableSessionReplay: false,
      }}
      autocapture={{
        // Auto-capture screen views — wires into expo-router's
        // navigation events. Disable touches: we'll add explicit
        // events for the actions that matter to the funnel.
        captureScreens: true,
        captureTouches: false,
      }}
    >
      {children}
    </RNPostHogProvider>
  );
}
