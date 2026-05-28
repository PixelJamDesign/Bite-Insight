/**
 * useNotificationAction — decides what happens when a user taps a
 * notification in the inbox.
 *
 * Each notification type can land the user in a different place:
 *   - some open a route (welcome → /upgrade-success)
 *   - some open a sheet (trial day-6 reminder → existing reminder sheet)
 *   - some trigger a system action (review request → in-app review)
 *   - some have no specific destination (info-only) and just close
 *     the inbox
 *
 * The handler closes the overlay first, then performs the action on a
 * tiny delay so the close animation can begin underneath. This is the
 * same pattern as the existing menu close → route push flow.
 *
 * `deep_link` in the DB is used as a fallback for unknown types — if a
 * future push category lands before we've added a handler, it'll still
 * route somewhere reasonable.
 */
import { useCallback } from 'react';
import { router } from 'expo-router';
import { useNotificationsOverlay } from './notificationsOverlayContext';
import { useTrialDay6Reminder } from './trialDay6ReminderContext';
import { useUpsellSheet } from './upsellSheetContext';
import type { InboxNotification } from './notificationsContext';

const CLOSE_DELAY_MS = 60;

export function useNotificationAction() {
  const { hide: hideOverlay } = useNotificationsOverlay();
  const { showTrialDay6Reminder } = useTrialDay6Reminder();
  const { showUpsell } = useUpsellSheet();

  return useCallback(
    (item: InboxNotification) => {
      // Fire-and-forget helpers — each closes the overlay then runs the
      // action after a brief delay so the fade-out animation can begin
      // before the screen swap / sheet open.
      const route = (path: string) => {
        hideOverlay();
        setTimeout(() => router.push(path as any), CLOSE_DELAY_MS);
      };

      const sheet = (open: () => void) => {
        hideOverlay();
        setTimeout(open, CLOSE_DELAY_MS);
      };

      const close = () => hideOverlay();

      switch (item.type) {
        // ── Trial lifecycle ─────────────────────────────────────────────
        case 'trial_welcome':
        case 'trial_converted':
          // Both confirm the user's now Plus — the upgrade-success
          // screen already shows what's unlocked, with the feature
          // carousel and a CTA back to the dashboard.
          return route('/upgrade-success');

        case 'trial_day3_midway':
          // Midway check-in points at the dashboard, where the user's
          // weekly stats and daily insight live.
          return route('/(tabs)/dashboard');

        case 'trial_day6_reminder':
          // Already has a dedicated sheet (TrialDay6ReminderSheet) —
          // open that instead of any route. Closes the inbox first.
          return sheet(showTrialDay6Reminder);

        // ── Engagement ──────────────────────────────────────────────────
        case 'inactivity_5d':
        case 'first_scan':
          // 'Found anything new this week?' / 'Nice first scan' both
          // exist to get the user scanning again.
          return route('/(tabs)/scanner');

        case 'review_request':
          // No native review prompt wired yet (would need
          // expo-store-review). For now just close — when we add the
          // prompt, swap close() for the StoreReview.requestReview()
          // call.
          // TODO(v1.7.1): integrate expo-store-review
          return close();

        // ── Manual / promotional pushes ─────────────────────────────────
        case 'upgrade_prompt':
          // Anything driving the user to upgrade opens the existing
          // paid upsell sheet — same as tapping "Upgrade today" in the
          // menu.
          return sheet(showUpsell);

        // ── Default: respect the DB deep_link, otherwise just close ─────
        default: {
          if (item.deep_link) {
            const path = item.deep_link.replace(/^biteinsight:\/\//, '/');
            return route(path);
          }
          return close();
        }
      }
    },
    [hideOverlay, showTrialDay6Reminder, showUpsell],
  );
}
