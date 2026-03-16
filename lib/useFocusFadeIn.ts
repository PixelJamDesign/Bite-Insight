import { useRef, useState, useCallback } from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Replays a subtle fade-in + slide-up animation every time the screen
 * regains focus (e.g. returning from a pushed screen).
 *
 * Skips the very first focus event so it doesn't double-up with any
 * initial data-loading animation (like `useFadeIn`).
 *
 * Returns `showElevation` — on Android this starts `false` during the
 * fade-in and flips to `true` once the animation completes, so
 * elevation shadows don't render as grey banding at partial opacity.
 * On iOS it's always `true` (iOS shadows respect view opacity).
 *
 * Usage:
 *   const focusAnim = useFocusFadeIn();
 *   <Animated.View style={{ opacity: focusAnim.opacity, transform: [{ translateY: focusAnim.translateY }] }}>
 *     <View style={[styles.card, focusAnim.showElevation && Shadows.level4]}>
 */
export function useFocusFadeIn(duration = 400, slideUp = 10) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const isFirstFocus = useRef(true);
  const [showElevation, setShowElevation] = useState(true);

  useFocusEffect(
    useCallback(() => {
      // Skip the first mount — the screen is already visible
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      // Hide elevation on Android during fade to avoid grey banding
      if (Platform.OS === 'android') {
        setShowElevation(false);
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
      ]).start(() => {
        if (Platform.OS === 'android') {
          setShowElevation(true);
        }
      });
    }, []),
  );

  return { opacity, translateY, showElevation };
}
