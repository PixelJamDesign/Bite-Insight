import '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Redirect, Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Animated, Linking, View, Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { shouldShowWhatsNew } from './whats-new';
import {
  Figtree_300Light,
  Figtree_400Regular,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { SessionProvider, useAuth } from '@/lib/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { TransitionProvider, useTransition } from '@/lib/transitionContext';
import { UpsellSheetProvider } from '@/lib/upsellSheetContext';
import { MyPlanSheetProvider } from '@/lib/myPlanSheetContext';
import { SubscriptionProvider } from '@/lib/subscriptionContext';
import { ActiveFamilyProvider } from '@/lib/activeFamilyContext';
import { RegionProvider } from '@/lib/regionContext';
import { MenuProvider } from '@/lib/menuContext';
import { DraftRecipeProvider } from '@/lib/draftRecipeContext';
import { ToastProvider } from '@/lib/toastContext';
import { JourneyProvider, useJourney } from '@/lib/journeyContext';
import type { OnboardingStep } from '@/lib/types';
import { UpsellSheet } from '@/components/UpsellSheet';
import { MyPlanSheet } from '@/components/MyPlanSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { prefetchFoodImages } from '@/components/FoodCarousel';

SplashScreen.preventAutoHideAsync();

// Start prefetching food carousel images immediately so they're cached
// by the time the user reaches the app tour welcome screen.
prefetchFoodImages();

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map an onboarding step to the route the user should be on. */
function stepToRoute(step: OnboardingStep): string {
  switch (step) {
    case 'create_profile': return '/onboarding';
    case 'disclaimer':     return '/disclaimer';
    case 'app_tour':       return '/app-tour';
    case 'complete':       return '/(tabs)';
  }
}

/** Map an onboarding step to the expected first URL segment. */
function stepToSegment(step: OnboardingStep): string {
  switch (step) {
    case 'create_profile': return 'onboarding';
    case 'disclaimer':     return 'disclaimer';
    case 'app_tour':       return 'app-tour';
    case 'complete':       return '(tabs)';
  }
}

const JOURNEY_SEGMENTS = new Set(['onboarding', 'disclaimer', 'app-tour']);
/** Segments that should NOT be re-accessible after the journey is complete. */
const LOCKED_JOURNEY_SEGMENTS = new Set(['onboarding', 'disclaimer']);
/** Segments that the guards should never interfere with. */
const PASSTHROUGH_SEGMENTS = new Set(['whats-new']);

// ── Auth Guard ──────────────────────────────────────────────────────────────

function AuthGuard({ session }: { session: Session | null }) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { onboardingStep, loading: journeyLoading } = useJourney();

  // Wait until the navigator has mounted before redirecting
  if (!navigationState?.key) return null;

  const inAuthGroup = segments[0] === '(auth)';
  const inResetPassword = segments[0] === 'reset-password';

  // Allow the reset-password screen regardless of session state
  if (inResetPassword) return null;

  // Not signed in → send to login
  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }

  // Signed in + still on auth screens → route using journey step
  if (session && inAuthGroup) {
    if (journeyLoading || !onboardingStep) return null; // wait for journey
    return <Redirect href={stepToRoute(onboardingStep) as any} />;
  }

  return null;
}

// ── Journey Guard ───────────────────────────────────────────────────────────

/** Enforces that authenticated users follow the journey flow. */
function JourneyGuard() {
  const { session } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { onboardingStep, loading: journeyLoading } = useJourney();

  if (!navigationState?.key || !session || journeyLoading || !onboardingStep) {
    return null;
  }

  const currentSegment = segments[0] as string;

  // Don't interfere with auth screens, reset-password, or passthrough screens
  if (currentSegment === '(auth)' || currentSegment === 'reset-password' || PASSTHROUGH_SEGMENTS.has(currentSegment)) {
    return null;
  }

  if (onboardingStep !== 'complete') {
    // Journey not finished — redirect to the correct step if not already there
    const expectedSegment = stepToSegment(onboardingStep);
    if (currentSegment !== expectedSegment) {
      return <Redirect href={stepToRoute(onboardingStep) as any} />;
    }
  } else if (LOCKED_JOURNEY_SEGMENTS.has(currentSegment)) {
    // Journey complete but on a locked journey screen — send to main app
    // (app-tour is intentionally NOT locked so users can re-view it from the menu)
    return <Redirect href="/(tabs)" />;
  }

  return null;
}

// ── What's New Guard ───────────────────────────────────────────────────────

/** Redirects to /whats-new once per app version after the journey is complete. */
function WhatsNewGuard() {
  const { session } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { onboardingStep, loading: journeyLoading } = useJourney();
  const [needsWhatsNew, setNeedsWhatsNew] = useState(false);

  const currentSegment = segments[0] as string;

  useEffect(() => {
    if (!navigationState?.key || !session || journeyLoading || onboardingStep !== 'complete') {
      return;
    }
    // Re-check every time the user lands on (tabs) — after dismiss,
    // AsyncStorage will have the current version and this will return false.
    if (currentSegment === '(tabs)') {
      shouldShowWhatsNew().then((show) => setNeedsWhatsNew(show));
    }
  }, [navigationState?.key, session, journeyLoading, onboardingStep, currentSegment]);

  if (!needsWhatsNew || currentSegment !== '(tabs)') return null;

  return <Redirect href="/whats-new" />;
}

// Inner component — consumes the SessionContext provided by RootLayout below.
// Keeping this separate is necessary because a component can't consume a context
// it provides itself; the provider must be an ancestor.
function RootLayoutInner() {
  const router = useRouter();
  const handledUrl = useRef(false);

  // Handle deep links for password reset and email verification.
  // Supabase sends: biteinsight://reset-password#access_token=...&type=recovery
  //            or:  biteinsight://verify#access_token=...&type=signup
  useEffect(() => {
    async function handleUrl(url: string) {
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      const type = params.get('type');
      if (type !== 'recovery' && type !== 'signup') return;
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token || handledUrl.current) return;
      handledUrl.current = true;
      try {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) console.warn('[DeepLink] setSession failed:', error.message);
      } catch (e) {
        console.warn('[DeepLink] setSession exception:', e);
      }

      if (type === 'recovery') {
        router.replace('/reset-password');
      }
      // For signup verification, setting the session is enough —
      // AuthGuard + JourneyGuard will route the user to the correct step.
    }

    // Cold start: app opened via deep link
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    // Warm start: URL received while app is running
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const [fontsLoaded] = useFonts({
    Figtree_300Light,
    Figtree_400Regular,
    Figtree_700Bold,
  });

  const { session, loading } = useAuth();
  const { loading: journeyLoading } = useJourney();
  const { contentOpacity } = useTransition();

  // Safety timeout — if providers haven't resolved after 8s, hide splash anyway
  // so the user isn't stuck on a blank screen (e.g. slow network on Android)
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const ready = (fontsLoaded && !loading && !journeyLoading) || timedOut;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  if (!supabaseConfigured) {
    return (
      <View style={{ flex: 1, backgroundColor: '#e2f1ee', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#023432', marginBottom: 12, textAlign: 'center' }}>
          Setup Required
        </Text>
        <Text style={{ fontSize: 16, color: '#00776f', textAlign: 'center', lineHeight: 24 }}>
          Add your Supabase URL and anon key to the{' '}
          <Text style={{ fontWeight: '700' }}>.env</Text> file, then restart the app.
          {'\n\n'}
          Settings → API in your Supabase dashboard.
        </Text>
      </View>
    );
  }

  return (
    <>
      <AuthGuard session={session} />
      <JourneyGuard />
      <WhatsNewGuard />
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: '#e2f1ee' }}>
        <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
          <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { flex: 1, padding: 0, margin: 0, backgroundColor: '#e2f1ee' } }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="disclaimer" />
            <Stack.Screen name="app-tour" />
            <Stack.Screen name="upgrade-success" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="scan-result" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="family-members" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="add-family-member" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="food-search" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="recipes/new" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="recipes/[id]/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="recipes/[id]/edit" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="whats-new" options={{ animation: 'fade' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </Animated.View>
      </View>
      <UpsellSheet />
      <MyPlanSheet />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <JourneyProvider>
          <SubscriptionProvider>
            <ActiveFamilyProvider>
              <RegionProvider>
                <UpsellSheetProvider>
                  <MyPlanSheetProvider>
                    <MenuProvider>
                      <DraftRecipeProvider>
                        <ToastProvider>
                          <TransitionProvider>
                            <RootLayoutInner />
                          </TransitionProvider>
                        </ToastProvider>
                      </DraftRecipeProvider>
                    </MenuProvider>
                  </MyPlanSheetProvider>
                </UpsellSheetProvider>
              </RegionProvider>
            </ActiveFamilyProvider>
          </SubscriptionProvider>
        </JourneyProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

