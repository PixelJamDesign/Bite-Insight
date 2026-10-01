/**
 * The app's one treatment for content scrolling behind a header: frosted
 * glass. Content stays visible behind the header, blurred and tinted with
 * the header's colour so it never fights the header's own text and
 * buttons. The blur eases out over the header's bottom edge (a true
 * progressive blur, so no line and no steps), and it only appears once
 * something is actually scrolling under it.
 *
 * Two forms of the same material:
 *
 *   FrostedHeader — for headers that float over the content (ScreenLayout,
 *   the menu, the dashboard, notifications). Frost fills the header's area
 *   and eases out over HEADER_EDGE_HEIGHT below it.
 *
 *   HeaderEdge — for headers that sit above the list in normal layout
 *   (sheets, the product page, forms). Content can't pass behind those, so
 *   it frosts over as it reaches the top of the list and fades into the
 *   header colour.
 *
 * Blur: @sbaiahmed1/react-native-blur's ProgressiveBlurView — iOS variable
 * blur, Android QmBlurView, web layered backdrop-filter. Expo Go can't load
 * that native view, so there it's the tint alone, a little stronger.
 * Material values live in frostMaterial.ts.
 */
import { useMemo, useRef, useState, type ComponentType } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';
import {
  FROST_BLUR_RADIUS,
  FROST_TINT,
  FROST_TINT_NO_BLUR,
  isDarkColor,
  rgba,
} from '@/components/frostMaterial';

/** Height of the soft edge. */
export const HEADER_EDGE_HEIGHT = 32;
/** Scroll distance over which the effect fades in. */
const SHOW_OVER = 16;

// Loaded only where the native view exists — requiring it in Expo Go
// would register a component that can't render.
type ProgressiveBlurProps = {
  blurType?: string;
  blurAmount?: number;
  direction?: 'blurredTopClearBottom';
  startOffset?: number;
  style?: StyleProp<ViewStyle>;
  pointerEvents?: 'none';
};
const ProgressiveBlurView: ComponentType<ProgressiveBlurProps> | null =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? null
    : require('@sbaiahmed1/react-native-blur').ProgressiveBlurView;
const TINT = ProgressiveBlurView ? FROST_TINT : FROST_TINT_NO_BLUR;

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

/**
 * The material itself, filling its parent: full strength down to
 * `plateau` (0–1 of the height), then blur and tint ease out to clear.
 */
function Frost({ color, plateau, topAlpha }: { color: string; plateau: number; topAlpha: number }) {
  // Tint holds through the plateau, then eases out (a little faster at
  // first, so the clear end doesn't look washed).
  const fadeMid = plateau + (1 - plateau) * 0.45;
  return (
    <>
      {ProgressiveBlurView && (
        <ProgressiveBlurView
          // The ultra-thin material adds the least grey to our teal.
          blurType={isDarkColor(color) ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
          blurAmount={FROST_BLUR_RADIUS}
          direction="blurredTopClearBottom"
          startOffset={plateau}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      <LinearGradient
        colors={[rgba(color, topAlpha), rgba(color, topAlpha), rgba(color, topAlpha * 0.45), rgba(color, 0)]}
        locations={[0, plateau, fadeMid, 1]}
        style={StyleSheet.absoluteFill}
      />
    </>
  );
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

/** Frosted glass for a header that floats over the content, easing out below it. */
export function FrostedHeader({ scrollY, showFrom = 0, color = Colors.background, style }: FrostedHeaderProps) {
  const [height, setHeight] = useState(0);
  const plateau = height > 0 ? height / (height + HEADER_EDGE_HEIGHT) : 0.7;
  return (
    <Animated.View
      style={[styles.frost, style, { opacity: showOpacity(scrollY, showFrom) }]}
      pointerEvents="none"
      onLayout={(e: LayoutChangeEvent) => setHeight(Math.round(e.nativeEvent.layout.height))}
    >
      {/* One surface over the header and its edge, so the blur and tint
          ease out together with nothing to line up. */}
      <View style={styles.frostBox}>
        <Frost color={color} plateau={plateau} topAlpha={TINT} />
      </View>
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
export function HeaderEdge({ scrollY, color = Colors.background, style }: HeaderEdgeProps) {
  return (
    <Animated.View style={[styles.edge, style, { opacity: showOpacity(scrollY) }]} pointerEvents="none">
      {/* Starts as the solid header colour, so it continues the header. */}
      <Frost color={color} plateau={0} topAlpha={1} />
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
  frostBox: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: -HEADER_EDGE_HEIGHT,
  },
  edge: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: HEADER_EDGE_HEIGHT,
  },
});
