import '../global.css';
import { useEffect } from 'react';
import { Redirect, Stack, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { Animated, View, Text } from 'react-native';
import { Session } from '@supabase/supabase-js';
import {
  Figtree_300Light,
  Figtree_400Regular,
  Figtree_700Bold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { SessionProvider, useAuth } from '@/lib/auth';
import { supabaseConfigured } from '@/lib/supabase';
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

  if (!session && !inAuthGroup) {
    return <Redirect href="/(auth)/login" />;
  }
  if (session && inAuthGroup) {
    return <Redirect href="/(tabs)/" />;
  }
  return null;
}

// Inner component — consumes the SessionContext provided by RootLayout below.
// Keeping this separate is necessary because a component can't consume a context
// it provides itself; the provider must be an ancestor.
function RootLayoutInner() {
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

