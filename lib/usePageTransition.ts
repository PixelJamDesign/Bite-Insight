import { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

/**
 * Reusable page-level entrance + exit animation for destination screens.
 *
 * On mount: content slides in from the right and fades in (800ms).
 * `animateExit(callback)` slides content out to the right and fades out,
 * then calls `callback` (e.g. safeBack / router.push).
 *
 * Usage:
 *   const { opacity, translateX, animateExit } = usePageTransition();
 *
 *   <Animated.View style={{ flex: 1, opacity, transform: [{ translateX }] }}>
 *     ...screen content...
 *   </Animated.View>
 *
 *   function handleBack() {
 *     animateExit(() => safeBack());
 *   }
 */
export function usePageTransition(duration = 800) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(40)).current;
  const isTransitioning = useRef(false);

  // Entrance animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  /** Slide content out to the right + fade, then call onComplete */
  function animateExit(onComplete: () => void) {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: 40,
        duration,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isTransitioning.current = false;
      onComplete();
    });
  }

  return { opacity, translateX, animateExit };
}
