import { createContext, useContext, useRef, ReactNode } from 'react';
import { Animated } from 'react-native';

/**
 * Shared Animated.Value that drives the tab bar's translateY.
 * 0  = fully visible (resting position)
 * >0 = sliding off-screen downward (e.g. 150 = fully hidden)
 *
 * Any screen can call useTabBarSlide() to animate the tab bar
 * in perfect sync with its own transition, without going through
 * navigation.setOptions (which is instant, not animated).
 */
const TabBarSlideContext = createContext<Animated.Value | null>(null);

export function TabBarSlideProvider({ children }: { children: ReactNode }) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  return (
    <TabBarSlideContext.Provider value={slideAnim}>
      {children}
    </TabBarSlideContext.Provider>
  );
}

export function useTabBarSlide(): Animated.Value {
  const anim = useContext(TabBarSlideContext);
  if (!anim) throw new Error('useTabBarSlide must be used inside TabBarSlideProvider');
  return anim;
}
