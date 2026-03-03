import { useEffect, useRef } from 'react';
import { Redirect, Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Animated, Linking, View, Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
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
import { UpsellSheet } from '@/components/UpsellSheet';
import { MyPlanSheet } from '@/components/MyPlanSheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

function AuthGuard({ session }: { session: Session | null }) {
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  // Wait until the navigator has mounted before redirecting
  if (!navigationState?.key) return null;

  const inAuthGroup = segments[0] === '(auth)';
  const inResetPassword = segments[0] === 'reset-password';

  // Allow the reset-password screen regardless of session state —
  // the deep-link handler sets the session just before navigating here,
  // but there's a render cycle gap we don't want to fight with.
  if (inResetPassword) return null;

  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }
  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)" />;
  }
  return null;
}

// Inner component — consumes the SessionContext provided by RootLayout below.
// Keeping this separate is necessary because a component can't consume a context
// it provides itself; the provider must be an ancestor.
function RootLayoutInner() {
  const router = useRouter();
  const handledUrl = useRef(false);

  // Handle deep links for password reset.
  // Supabase sends: biteinsight://reset-password#access_token=...&type=recovery
  useEffect(() => {
    async function handleUrl(url: string) {
      const fragment = url.split('#')[1];
      if (!fragment) return;
      const params = new URLSearchParams(fragment);
      if (params.get('type') !== 'recovery') return;
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (!access_token || !refresh_token || handledUrl.current) return;
      handledUrl.current = true;
      try {
        await supabase.auth.setSession({ access_token, refresh_token });
      } catch { /* ignore — screen will show an error if session is invalid */ }
      router.replace('/reset-password');
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
  const { contentOpacity } = useTransition();

  useEffect(() => {
    if (fontsLoaded && !loading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, loading]);

  if (!fontsLoaded || loading) {
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
      <StatusBar style="dark" />
      <View style={{ flex: 1, backgroundColor: '#e2f1ee' }}>
        <Animated.View style={{ flex: 1, opacity: contentOpacity }}>
          <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="scan-result" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="family-members" />
            <Stack.Screen name="add-family-member" />
            <Stack.Screen name="upgrade-success" />
            <Stack.Screen name="reset-password" />
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
        <SubscriptionProvider>
          <ActiveFamilyProvider>
            <UpsellSheetProvider>
              <MyPlanSheetProvider>
                <TransitionProvider>
                  <RootLayoutInner />
                </TransitionProvider>
              </MyPlanSheetProvider>
            </UpsellSheetProvider>
          </ActiveFamilyProvider>
        </SubscriptionProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}

