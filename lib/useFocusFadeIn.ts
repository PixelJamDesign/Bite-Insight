import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Replays a subtle fade-in + slide-up animation every time the screen
 * regains focus (e.g. returning from a pushed screen).
 *
 * Skips the very first focus event so it doesn't double-up with any
 * initial data-loading animation (like `useFadeIn`).
 *
 * Usage:
 *   const focusAnim = useFocusFadeIn();
 *   <Animated.View style={{ opacity: focusAnim.opacity, transform: [{ translateY: focusAnim.translateY }] }}>
 */
export function useFocusFadeIn(duration = 400, slideUp = 10) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isFirstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // Skip the first mount — the screen is already visible
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      // Reset to "hidden" state, then animate in
      opacity.setValue(0);
      translateY.setValue(slideUp);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, []),
  );

  return { opacity, translateY };
}
