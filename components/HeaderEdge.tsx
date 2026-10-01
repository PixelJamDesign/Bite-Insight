/**
 * HeaderEdge — the one treatment for content scrolling under a fixed
 * header, bar or pinned section anywhere in the app.
 *
 * A 32px band under the header's bottom edge: iOS blurs what passes under
 * it (strongest at the top), and everything fades into the header's
 * colour (ProgressiveBlur). It only shows once something is scrolling
 * under it, so the first row isn't softened at rest.
 *
 * Place it inside the header (it hangs below it), or pass `style` to
 * position it yourself. Pass the list's scroll offset as `scrollY`;
 * without one the band is always on.
 */
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { ProgressiveBlur } from '@/components/ProgressiveBlur';

/** Band height. */
export const HEADER_EDGE_HEIGHT = 32;
/** Scroll distance over which the band fades in. */
const SHOW_OVER = 16;

interface Props {
  /** Scroll offset of the content passing underneath. */
  scrollY?: Animated.Value | Animated.AnimatedInterpolation<number>;
  /** The header's background colour (#rrggbb). Defaults to the page teal. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function HeaderEdge({ scrollY, color, style }: Props) {
  const opacity = scrollY
    ? scrollY.interpolate({ inputRange: [0, SHOW_OVER], outputRange: [0, 1], extrapolate: 'clamp' })
    : 1;
  return (
    <Animated.View style={[styles.edge, style, { opacity }]} pointerEvents="none">
      <ProgressiveBlur height={HEADER_EDGE_HEIGHT} color={color} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: HEADER_EDGE_HEIGHT,
  },
});
