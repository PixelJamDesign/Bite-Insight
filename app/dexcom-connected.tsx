/**
 * Landing route for the Dexcom sign-in round trip.
 *
 * On iOS / Android the auth browser session catches the redirect before
 * the app router ever sees it, so this screen normally doesn't show.
 * On web, Dexcom's page runs in a popup that ends up here;
 * maybeCompleteAuthSession() hands the URL back to the opener and closes
 * the popup. If the app is ever opened on this route directly, it moves
 * on to the connections screen.
 */
import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { LottieLoader } from '@/components/LottieLoader';

WebBrowser.maybeCompleteAuthSession();

export default function DexcomConnectedScreen() {
  useEffect(() => {
    const id = setTimeout(() => router.replace('/connected-devices' as never), 300);
    return () => clearTimeout(id);
  }, []);

  return <LottieLoader type="loading" />;
}
