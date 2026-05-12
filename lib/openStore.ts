import { Linking, Platform } from 'react-native';

const IOS_APP_STORE_ID = '6760033160';
const ANDROID_PACKAGE  = 'com.biteinsightapp.gcahill';

/**
 * Opens the platform's store listing page (not the review sheet —
 * that variant lives in useReviewPrompt). Used by the Update toast
 * when a newer version is available.
 */
export async function openStoreListing() {
  if (Platform.OS === 'ios') {
    const url = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;
    await Linking.openURL(url).catch((err) => {
      console.warn('[openStoreListing] App Store open failed:', err);
    });
    return;
  }
  if (Platform.OS === 'android') {
    const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    const canOpenMarket = await Linking.canOpenURL(marketUrl).catch(() => false);
    await Linking.openURL(canOpenMarket ? marketUrl : webUrl).catch((err) => {
      console.warn('[openStoreListing] Play Store open failed:', err);
    });
  }
}
