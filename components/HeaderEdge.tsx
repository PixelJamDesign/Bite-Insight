/**
 * The app's one treatment for content scrolling behind a header: frosted
 * glass. Content stays visible behind the header, blurred and tinted with
 * the header's colour so it never fights the header's own text and
 * buttons, and the frost softens out at the bottom instead of ending in a
 * line. It only appears once something is actually scrolling under it.
 *
 * Two forms of the same material:
 *
 *   FrostedHeader — for headers that float over the content (ScreenLayout,
 *   the menu, the dashboard, notifications). Fills the header's area with
 *   frost and hangs the soft edge below it.
 *
 *   HeaderEdge — for headers that sit above the list in normal layout
 *   (sheets, the product page, forms). Content can't pass behind those, so
 *   it frosts over as it reaches the top of the list and fades into the
 *   header colour.
 *
 * Material values (blur, tint) live in progressiveBlurShared.ts.
 */
import { useMemo, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { ProgressiveBlur } from '@/components/ProgressiveBlur';
import { FrostBody, FROST_EDGE_ALPHA } from '@/components/FrostBody';
import { FROST_BLUR_INTENSITY } from '@/components/progressiveBlurShared';

/** Height of the soft edge. */
export const HEADER_EDGE_HEIGHT = 32;
/** Scroll distance over which the effect fades in. */
const SHOW_OVER = 16;

type ScrollValue = Animated.Value | Animated.AnimatedInterpolation<number>;

/** 0 → 1 as content starts passing under, from `from` px of scroll. */
function showOpacity(scrollY: ScrollValue | undefined, from = 0) {
  if (!scrollY) return 1;
  return scrollY.interpolate({
    inputRange: [from, from + SHOW_OVER],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
}

interface FrostedHeaderProps {
  /** Scroll offset of the content passing underneath. Without it the
   *  frost is always on. */
  scrollY?: ScrollValue;
  /** Scroll offset at which content first reaches the header (e.g. after a
   *  large title has collapsed). Default 0. */
  showFrom?: number;
  /** Header colour (#rrggbb). Defaults to the page teal. */
  color?: string;
  /** Position and size: the header's area (absolute). */
  style?: StyleProp<ViewStyle>;
}

/** Frosted fill for a header that floats over the content, plus its soft edge. */
export function FrostedHeader({ scrollY, showFrom = 0, color = Colors.background, style }: FrostedHeaderProps) {
  return (
    <Animated.View style={[styles.frost, style, { opacity: showOpacity(scrollY, showFrom) }]} pointerEvents="none">
      <FrostBody color={color} />
      <Animated.View style={styles.edge}>
        <ProgressiveBlur
          height={HEADER_EDGE_HEIGHT}
          color={color}
          startAlpha={FROST_EDGE_ALPHA}
          intensity={FROST_BLUR_INTENSITY}
        />
      </Animated.View>
    </Animated.View>
  );
}

interface HeaderEdgeProps {
  /** Scroll offset of the list. Without it the edge is always on. */
  scrollY?: ScrollValue;
  /** The header's colour (#rrggbb). Defaults to the page teal. */
  color?: string;
  /** Defaults to hanging below its parent; HEADER_EDGE_AT_TOP puts it at
   *  the top of the list's box instead. */
  style?: StyleProp<ViewStyle>;
}

/** The frosted edge alone, for a header that sits above the list. */
export function HeaderEdge({ scrollY, color, style }: HeaderEdgeProps) {
  return (
    <Animated.View style={[styles.edge, style, { opacity: showOpacity(scrollY) }]} pointerEvents="none">
      <ProgressiveBlur height={HEADER_EDGE_HEIGHT} color={color} intensity={FROST_BLUR_INTENSITY} />
    </Animated.View>
  );
}

/**
 * Scroll tracking for a HeaderEdge over a plain ScrollView / FlatList:
 *
 *   const edge = useScrollEdge();
 *   <View style={{ flex: 1 }}>
 *     <ScrollView {...edge.scrollProps} />
 *     <HeaderEdge scrollY={edge.scrollY} style={HEADER_EDGE_AT_TOP} />
 *   </View>
 *
 * Pass the list's own onScroll in, if it has one, to keep it.
 */
export function useScrollEdge(onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const handler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        // JS-driven so it works on plain (non-Animated) lists.
        useNativeDriver: false,
        listener: onScroll,
      }),
    [scrollY, onScroll],
  );
  return { scrollY, scrollProps: { onScroll: handler, scrollEventThrottle: 16 } };
}

/** Puts a HeaderEdge at the top of the box it's in (the top of a list that
 *  sits right under an in-flow header). */
export const HEADER_EDGE_AT_TOP: ViewStyle = { top: 0 };

const styles = StyleSheet.create({
  frost: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  edge: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: HEADER_EDGE_HEIGHT,
  },
});
