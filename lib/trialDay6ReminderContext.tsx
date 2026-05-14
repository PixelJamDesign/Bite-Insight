/**
 * TrialDay6ReminderContext — visibility state for the Day-6 trial
 * reminder sheet.
 *
 * This sheet appears when a user on Day 6 of their 7-day trial taps
 * a push notification (or opens the app naturally on that day). It's
 * a soft "your trial is ending tomorrow" prompt with a "Keep my
 * subscription" affirmative CTA and a "Manage subscription" deep
 * link for users who want to cancel.
 *
 * The actual scheduling — push tokens, Supabase cron, Day-6 detection
 * — is intentionally not yet wired. This context only manages the
 * in-app sheet visibility so we can preview the UI and link to it
 * from the debug menu. Production trigger flow comes in a follow-up.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface TrialDay6ReminderContextValue {
  visible: boolean;
  showTrialDay6Reminder: () => void;
  hideTrialDay6Reminder: () => void;
}

const TrialDay6ReminderContext = createContext<TrialDay6ReminderContextValue>({
  visible: false,
  showTrialDay6Reminder: () => {},
  hideTrialDay6Reminder: () => {},
});

export function TrialDay6ReminderProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showTrialDay6Reminder = useCallback(() => setVisible(true), []);
  const hideTrialDay6Reminder = useCallback(() => setVisible(false), []);

  const value = useMemo<TrialDay6ReminderContextValue>(
    () => ({ visible, showTrialDay6Reminder, hideTrialDay6Reminder }),
    [visible, showTrialDay6Reminder, hideTrialDay6Reminder],
  );

  return (
    <TrialDay6ReminderContext.Provider value={value}>
      {children}
    </TrialDay6ReminderContext.Provider>
  );
}

export function useTrialDay6Reminder() {
  return useContext(TrialDay6ReminderContext);
}
