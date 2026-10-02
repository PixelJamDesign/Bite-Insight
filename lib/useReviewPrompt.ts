import { useState, useCallback, useEffect } from 'react';
import { Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

/** Scan milestones at which the prompt appears: 20, then 50, then 100 if
 *  they keep choosing "Ask me later", then never. */
const THRESHOLDS = [20, 50, 100] as const;
export type ReviewMilestone = (typeof THRESHOLDS)[number];
const STORAGE_KEY_COMPLETED = 'review_prompt_completed'; // user said "yes!"
const STORAGE_KEY_DISMISS_COUNT = 'review_prompt_dismiss_count'; // how many times dismissed
const STORAGE_KEY_DECLINED = 'review_prompt_declined'; // user said "not really"
// Debug menu: show the prompt on the next product page, whatever the count.
const STORAGE_KEY_FORCE = 'review_prompt_force';

/** Debug menu: the next product page opens with the review prompt for
 *  this milestone. */
export async function forceReviewPrompt(milestone: ReviewMilestone = 20) {
  await AsyncStorage.setItem(STORAGE_KEY_FORCE, String(milestone));
}

/** Debug menu: forget the user's earlier answers so the prompt can fire again. */
export async function resetReviewPrompt() {
  await AsyncStorage.multiRemove([STORAGE_KEY_COMPLETED, STORAGE_KEY_DISMISS_COUNT, STORAGE_KEY_DECLINED, STORAGE_KEY_FORCE]);
}

// Store identifiers, used to deep-link the user straight into the review
// flow on the right store for their platform.
const IOS_APP_STORE_ID = '6760033160';                  // matches App Store Connect
const ANDROID_PACKAGE  = 'com.biteinsightapp.gcahill';   // matches app.json expo.android.package

/**
 * Opens the platform's store review page. iOS deep-links directly into
 * the "write a review" sheet; Android opens the Play Store listing
 * where users can scroll to the rating + review controls.
 *
 * Uses the `market://` scheme on Android first (opens the Play Store
 * app instantly if installed) with a web fallback for devices without
 * Play Services (e.g. Amazon tablets).
 */
export async function openStoreReview() {
  if (Platform.OS === 'ios') {
    const url = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`;
    await Linking.openURL(url).catch((err) => {
      console.warn('[ReviewPrompt] Could not open App Store:', err);
    });
    return;
  }
  if (Platform.OS === 'android') {
    const marketUrl = `market://details?id=${ANDROID_PACKAGE}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
    const canOpenMarket = await Linking.canOpenURL(marketUrl).catch(() => false);
    await Linking.openURL(canOpenMarket ? marketUrl : webUrl).catch((err) => {
      console.warn('[ReviewPrompt] Could not open Play Store:', err);
    });
    return;
  }
  // Web / other — just no-op gracefully.
}

/**
 * Hook that triggers a "loving the app?" prompt after scan milestones.
 *
 * - 20 scans → first prompt
 * - "Ask me later" → again at 50, then at 100 (the last time)
 * - "Yes" or "Not really" → never asks again
 *
 * Usage:
 * ```
 * const { showReviewPrompt, recheckAfterScan, dismissReviewPrompt, completeReviewPrompt } = useReviewPrompt();
 * ```
 */
export function useReviewPrompt() {
  const { session } = useAuth();
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [reviewMilestone, setReviewMilestone] = useState<ReviewMilestone>(20);

  // Forced from the debug menu: show once, as soon as the page opens.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY_FORCE).then((v) => {
      const forced = THRESHOLDS.find((t) => String(t) === v);
      if (!forced) return;
      AsyncStorage.removeItem(STORAGE_KEY_FORCE);
      setReviewMilestone(forced);
      setShowReviewPrompt(true);
    });
  }, []);

  const checkEligibility = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Already completed (said "yes")? Never ask again.
      const completed = await AsyncStorage.getItem(STORAGE_KEY_COMPLETED);
      if (completed === 'true') return;

      // Said "not really"? Don't keep asking.
      const declined = await AsyncStorage.getItem(STORAGE_KEY_DECLINED);
      if (declined === 'true') return;

      // How many times have they dismissed?
      const rawDismissCount = await AsyncStorage.getItem(STORAGE_KEY_DISMISS_COUNT);
      const dismissCount = rawDismissCount ? parseInt(rawDismissCount, 10) : 0;

      // Dismissed twice = exhausted all thresholds, stop asking
      if (dismissCount >= THRESHOLDS.length) return;

      // Current threshold based on dismiss count
      const currentThreshold = THRESHOLDS[dismissCount];

      // Count total scans for this user
      const { count, error } = await supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      if (error) {
        console.warn('[ReviewPrompt] Count query failed:', error.message);
        return;
      }

      if ((count ?? 0) >= currentThreshold) {
        setReviewMilestone(currentThreshold);
        setShowReviewPrompt(true);
      }
    } catch (err) {
      console.warn('[ReviewPrompt] Check failed:', err);
    }
  }, [session?.user?.id]);

  /** Call after a new scan completes to re-evaluate */
  const recheckAfterScan = useCallback(() => {
    checkEligibility();
  }, [checkEligibility]);

  /** User tapped "Ask me later" — increment dismiss count, ask again at next threshold */
  const dismissReviewPrompt = useCallback(async () => {
    setShowReviewPrompt(false);
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DISMISS_COUNT);
    const current = raw ? parseInt(raw, 10) : 0;
    await AsyncStorage.setItem(STORAGE_KEY_DISMISS_COUNT, String(current + 1));
  }, []);

  /** User tapped "Not really" — never ask again. */
  const declineReviewPrompt = useCallback(async () => {
    setShowReviewPrompt(false);
    await AsyncStorage.setItem(STORAGE_KEY_DECLINED, 'true');
  }, []);

  /** User tapped "yes, I love it!" — mark complete, deep-link to the
   *  right store for their platform, never ask again. */
  const completeReviewPrompt = useCallback(async () => {
    setShowReviewPrompt(false);
    await AsyncStorage.setItem(STORAGE_KEY_COMPLETED, 'true');
    await openStoreReview();
  }, []);

  return {
    showReviewPrompt,
    reviewMilestone,
    recheckAfterScan,
    dismissReviewPrompt,
    declineReviewPrompt,
    completeReviewPrompt,
  };
}
