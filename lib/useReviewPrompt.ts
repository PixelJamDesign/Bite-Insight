import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

/** Thresholds at which the prompt appears: first at 20, second chance at 40, then never */
const THRESHOLDS = [20, 40];
const STORAGE_KEY_COMPLETED = 'review_prompt_completed'; // user said "yes!"
const STORAGE_KEY_DISMISS_COUNT = 'review_prompt_dismiss_count'; // how many times dismissed

/**
 * Hook that triggers a "loving the app?" prompt after scan milestones.
 *
 * - 20 scans → first prompt
 * - If dismissed, waits until 40 scans → second (final) prompt
 * - If dismissed twice or completed once → never asks again
 *
 * Usage:
 * ```
 * const { showReviewPrompt, recheckAfterScan, dismissReviewPrompt, completeReviewPrompt } = useReviewPrompt();
 * ```
 */
export function useReviewPrompt() {
  const { session } = useAuth();
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);

  const checkEligibility = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      // Already completed (said "yes")? Never ask again.
      const completed = await AsyncStorage.getItem(STORAGE_KEY_COMPLETED);
      if (completed === 'true') return;

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

  /** User tapped "not now" — increment dismiss count, ask again at next threshold */
  const dismissReviewPrompt = useCallback(async () => {
    setShowReviewPrompt(false);
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DISMISS_COUNT);
    const current = raw ? parseInt(raw, 10) : 0;
    await AsyncStorage.setItem(STORAGE_KEY_DISMISS_COUNT, String(current + 1));
  }, []);

  /** User tapped "yes, I love it!" — mark complete, never ask again */
  const completeReviewPrompt = useCallback(async () => {
    setShowReviewPrompt(false);
    await AsyncStorage.setItem(STORAGE_KEY_COMPLETED, 'true');
  }, []);

  return {
    showReviewPrompt,
    recheckAfterScan,
    dismissReviewPrompt,
    completeReviewPrompt,
  };
}
