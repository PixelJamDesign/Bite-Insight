/**
 * In-app feedback questionnaires (Figma "Questionaire", 5949:14832):
 *
 *   review        — after "Not really" on the scan milestone review card
 *   trial_decline — the first time someone closes the free-trial sheet
 *
 * Answers are saved to Supabase (`app_feedback`) with any comment. The
 * reasons alone also go to PostHog for charting; comments never do, as
 * people may mention health details there.
 *
 * Any screen can open a questionnaire with showFeedbackQuestionnaire();
 * FeedbackQuestionnaireHost (mounted once in the root layout) shows it.
 */
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

export type FeedbackSource = 'review' | 'trial_decline';

export interface FeedbackReason {
  key: string;
  label: string;
}

export const FEEDBACK_COPY: Record<
  FeedbackSource,
  { kicker: string; title: string; reasons: FeedbackReason[] }
> = {
  review: {
    kicker: "Sorry it's not quite there yet",
    title: 'What could we do better?',
    reasons: [
      { key: 'cant_find_products', label: "I can't find a lot of my products" },
      { key: 'results_wrong', label: "The results don't seem right" },
      { key: 'hard_to_navigate', label: "It's hard to find my way around" },
      { key: 'slow_or_buggy', label: 'The app is slow or has bugs' },
      { key: 'doesnt_suit_needs', label: "It doesn't suit my diet or condition" },
      { key: 'something_else', label: 'Something else' },
    ],
  },
  trial_decline: {
    kicker: 'We understand.',
    title: 'Mind telling us why?',
    reasons: [
      { key: 'too_expensive', label: "It's too expensive" },
      { key: 'dont_need_features', label: "I don't need the extra features" },
      { key: 'try_free_first', label: 'I want to try the free version first' },
      { key: 'unsure_what_plus_includes', label: "I'm not sure what Plus includes" },
      { key: 'no_subscription', label: "I'd rather not have a subscription" },
      { key: 'something_else', label: 'Something else' },
    ],
  },
};

export const FEEDBACK_COMMENT_MAX = 500;

/** Save one answer. Never throws: feedback must not break the app. */
export async function submitFeedback(input: {
  source: FeedbackSource;
  userId: string | undefined;
  reasons: string[];
  comment: string;
}): Promise<boolean> {
  const comment = input.comment.trim().slice(0, FEEDBACK_COMMENT_MAX);
  const { error } = await supabase.from('app_feedback').insert({
    user_id: input.userId ?? null,
    source: input.source,
    reasons: input.reasons,
    comment: comment || null,
    app_version: Constants.expoConfig?.version ?? null,
    platform: Platform.OS,
  });
  if (error) {
    console.warn('[Feedback] Save failed:', error.message);
    return false;
  }
  return true;
}

// ── Trial decline: ask once ─────────────────────────────────────────────────

const TRIAL_ASKED_KEY = 'feedback_trial_decline_asked';

/** True the first time only; marks it asked. */
export async function shouldAskTrialDecline(): Promise<boolean> {
  const asked = await AsyncStorage.getItem(TRIAL_ASKED_KEY);
  if (asked === 'true') return false;
  await AsyncStorage.setItem(TRIAL_ASKED_KEY, 'true');
  return true;
}

/** Debug menu: let the trial questionnaire fire again. */
export async function resetTrialDeclineAsked() {
  await AsyncStorage.removeItem(TRIAL_ASKED_KEY);
}

// ── Which questionnaire is open (tiny global store) ─────────────────────────

let current: FeedbackSource | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function showFeedbackQuestionnaire(source: FeedbackSource) {
  current = source;
  emit();
}

export function hideFeedbackQuestionnaire() {
  current = null;
  emit();
}

export function useFeedbackQuestionnaire(): FeedbackSource | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
