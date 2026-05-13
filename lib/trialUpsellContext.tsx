/**
 * TrialUpsellContext — owns the visibility + persistence state for
 * the opportunistic free-trial pitch.
 *
 * `useTrialUpsellTrigger` decides WHEN to call `showTrialUpsell()`
 * based on the rules in that hook (cooldown, max shows, eligibility,
 * coin flip). This context is the plumbing — it doesn't make those
 * decisions itself, it just records show/dismiss/conversion events
 * so the trigger hook can read them on next launch.
 *
 * Persisted keys in AsyncStorage:
 *   trial_upsell_first_seen_at    — first launch we evaluated rules on
 *   trial_upsell_last_shown_at    — last time the sheet appeared
 *   trial_upsell_dismiss_count    — lifetime count of dismissals
 *   trial_upsell_converted_at     — set when the user purchased; stops
 *                                    the sheet ever showing again
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TRIAL_UPSELL_KEYS = {
  firstSeenAt: 'trial_upsell_first_seen_at',
  lastShownAt: 'trial_upsell_last_shown_at',
  dismissCount: 'trial_upsell_dismiss_count',
  convertedAt: 'trial_upsell_converted_at',
} as const;

interface TrialUpsellContextValue {
  visible: boolean;
  /** Show the sheet and stamp last_shown_at so the cooldown begins. */
  showTrialUpsell: () => Promise<void>;
  /** Hide the sheet and increment the dismiss counter. */
  dismissTrialUpsell: () => Promise<void>;
  /** Hide the sheet without counting as a dismiss (e.g. on conversion). */
  hideTrialUpsell: () => void;
  /** Mark the user as converted — sheet will never show again. */
  recordConversion: () => Promise<void>;
}

const TrialUpsellContext = createContext<TrialUpsellContextValue>({
  visible: false,
  showTrialUpsell: async () => {},
  dismissTrialUpsell: async () => {},
  hideTrialUpsell: () => {},
  recordConversion: async () => {},
});

export function TrialUpsellProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showTrialUpsell = useCallback(async () => {
    setVisible(true);
    await AsyncStorage.setItem(TRIAL_UPSELL_KEYS.lastShownAt, new Date().toISOString());
  }, []);

  const dismissTrialUpsell = useCallback(async () => {
    setVisible(false);
    const raw = await AsyncStorage.getItem(TRIAL_UPSELL_KEYS.dismissCount);
    const next = (raw ? parseInt(raw, 10) || 0 : 0) + 1;
    await AsyncStorage.setItem(TRIAL_UPSELL_KEYS.dismissCount, String(next));
  }, []);

  const hideTrialUpsell = useCallback(() => {
    setVisible(false);
  }, []);

  const recordConversion = useCallback(async () => {
    setVisible(false);
    await AsyncStorage.setItem(TRIAL_UPSELL_KEYS.convertedAt, new Date().toISOString());
  }, []);

  const value = useMemo<TrialUpsellContextValue>(
    () => ({
      visible,
      showTrialUpsell,
      dismissTrialUpsell,
      hideTrialUpsell,
      recordConversion,
    }),
    [visible, showTrialUpsell, dismissTrialUpsell, hideTrialUpsell, recordConversion],
  );

  return <TrialUpsellContext.Provider value={value}>{children}</TrialUpsellContext.Provider>;
}

export function useTrialUpsell() {
  return useContext(TrialUpsellContext);
}
