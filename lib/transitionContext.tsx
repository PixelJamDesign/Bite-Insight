import { createContext, useContext, useRef, ReactNode } from 'react';
import { Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';

interface TransitionContextValue {
  transitionTo: (route: any) => void;
  contentOpacity: Animated.Value;
}

const TransitionContext = createContext<TransitionContextValue>({
  transitionTo: () => {},
  contentOpacity: new Animated.Value(1),
});

export function TransitionProvider({ children }: { children: ReactNode }) {
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const isTransitioning = useRef(false);
  const router = useRouter();

  function transitionTo(route: any) {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    // Step 1: fade all content to 0%
    Animated.timing(contentOpacity, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Step 2: navigate — new screen loads invisibly at 0%
      router.push(route as any);

      // Step 3: short pause, then fade the new screen in to 100%
      setTimeout(() => {
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          isTransitioning.current = false;
        });
      }, 80);
    });
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
