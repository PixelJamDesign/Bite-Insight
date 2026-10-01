import { Animated } from 'react-native';

/**
 * How a large page title hands over to the compact title in the button
 * row as the page scrolls (iOS large-title style). Shared by ScreenLayout
 * and the menu so every titled header moves the same way.
 *
 * `distance` is how far the page scrolls before the large title has gone
 * under the bar.
 */
export function titleCollapse(scrollY: Animated.Value, distance: number) {
  const T = Math.max(distance, 1);
  return {
    /** Large title: gone by halfway, so no sliver shows under the bar. */
    largeOpacity: scrollY.interpolate({
      inputRange: [0, T * 0.5],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    }),
    /** Compact title in the bar fades in over the last stretch... */
    compactOpacity: scrollY.interpolate({
      inputRange: [T * 0.6, T],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    /** ...rising 6px into place. */
    compactShift: scrollY.interpolate({
      inputRange: [T * 0.6, T],
      outputRange: [6, 0],
      extrapolate: 'clamp',
    }),
  };
}
