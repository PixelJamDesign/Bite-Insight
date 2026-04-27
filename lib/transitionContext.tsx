import { createContext, useContext, useRef, ReactNode } from 'react';
import { Animated } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * `transitionTo` used to do a manual fade-out → navigate → fade-in
 * by animating a parent View's opacity from 1 → 0 → 1. On Android
 * that approach caused a long-standing visual bug: every elevated
 * card / input rendered its drop shadow as a SEPARATE compositing
 * layer once the parent's opacity dropped below 1, leaking grey
 * halos around each shadowed surface during the transition.
 *
 * The fix is to stop fading the parent at all. The Stack's own
 * `animation: 'fade_from_bottom'` (set in app/_layout.tsx) gives a
 * clean per-screen transition with no shared parent opacity, so
 * shadows render normally.
 *
 * `contentOpacity` is preserved for backwards-compat (still wired
 * into _layout.tsx) but is now permanently pinned to 1 — it never
 * changes, so the parent View never goes translucent.
 */

interface TransitionContextValue {
  transitionTo: (route: any) => void;
  contentOpacity: Animated.Value;
}

const TransitionContext = createContext<TransitionContextValue>({
  transitionTo: () => {},
  contentOpacity: new Animated.Value(1),
});

export function TransitionProvider({ children }: { children: ReactNode }) {
  // Pinned to 1 — see the file comment for why we no longer animate it.
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isTransitioning = useRef(false);
  const router = useRouter();

  function transitionTo(route: any) {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    router.push(route as any);
    // Tiny debounce so a double-tap on a menu item doesn't fire two
    // navigations before the Stack animation kicks in.
    setTimeout(() => {
      isTransitioning.current = false;
    }, 250);
  }

  return (
    <TransitionContext.Provider value={{ transitionTo, contentOpacity }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition() {
  return useContext(TransitionContext);
}
