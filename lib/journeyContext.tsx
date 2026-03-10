import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { OnboardingStep } from '@/lib/types';

// ─── Context ────────────────────────────────────────────────────────────────────

interface JourneyContextValue {
  /** The next step the user must complete (null while loading). */
  onboardingStep: OnboardingStep | null;
  /** Whether the initial fetch is in progress. */
  loading: boolean;
  /** Advance to the given step — updates DB first, then local state. */
  advanceTo: (step: OnboardingStep) => Promise<void>;
  /** Re-fetch the step from the database. */
  refreshStep: () => Promise<void>;
}

const JourneyContext = createContext<JourneyContextValue>({
  onboardingStep: null,
  loading: true,
  advanceTo: async () => {},
  refreshStep: async () => {},
});

// ─── Provider ───────────────────────────────────────────────────────────────────

export function JourneyProvider({ children }: { children: ReactNode }) {
  const { session, loading: sessionLoading } = useAuth();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStep = useCallback(async () => {
    if (!session?.user?.id) {
      setOnboardingStep(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_step')
        .eq('id', session.user.id)
        .single();

      if (error || !data) {
        // Safety: treat missing/errored as complete so existing users aren't blocked
        setOnboardingStep('complete');
      } else {
        setOnboardingStep((data.onboarding_step as OnboardingStep) ?? 'complete');
      }
    } catch {
      setOnboardingStep('complete');
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Fetch on mount and whenever session changes (e.g. user just verified email)
  useEffect(() => {
    if (sessionLoading) return;
    fetchStep();
  }, [sessionLoading, fetchStep]);

  const advanceTo = useCallback(
    async (step: OnboardingStep) => {
      const userId = session?.user?.id;
      if (!userId) return;

      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_step: step })
        .eq('id', userId);

      if (error) {
        console.error('[Journey] Failed to advance:', error.message);
        throw error; // Let the calling screen handle the error (show alert, etc.)
      }

      // Only update local state after DB succeeds
      setOnboardingStep(step);
    },
    [session?.user?.id],
  );

  return (
    <JourneyContext.Provider
      value={{ onboardingStep, loading, advanceTo, refreshStep: fetchStep }}
    >
      {children}
    </JourneyContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────────

export function useJourney() {
  return useContext(JourneyContext);
}
