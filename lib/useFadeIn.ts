import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

/**
 * Returns animated values that fade from 0 → 1 (and optionally slide up)
 * when `ready` becomes true.
 *
 * Usage:
 *   const { opacity, translateY } = useFadeIn(!loading, 80);
 *   <Animated.View style={{ opacity, transform: [{ translateY }] }}>
 *
 * @param ready   Triggers the animation when true
 * @param delay   Stagger delay in ms (default 0)
 * @param slideUp Slide distance in px (default 12)
 */
export function useFadeIn(ready: boolean, delay = 0, slideUp = 12) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(slideUp)).current;

  useEffect(() => {
    if (ready) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 350,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 350,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [ready]);

  return { opacity, translateY };
}
