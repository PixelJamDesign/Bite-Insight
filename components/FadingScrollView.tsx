/**
 * FadingScrollView — a ScrollView whose top edge blurs and fades content
 * away once it has scrolled up past it, with no hard clip.
 *
 *   - A mask fades the content to clear right at the top edge. The fade's
 *     depth follows the scroll offset (up to FADE_HEIGHT), so at rest
 *     nothing is faded and, once scrolled, the edge is always soft.
 *   - ProgressiveBlur sits over the same band, easing in over the first
 *     FADE_HEIGHT px, so what's leaving also blurs.
 *
 * Drop-in for ScrollView in bottom sheets: `style` goes on an outer
 * wrapper (so flex / maxHeight rules still apply) and every other prop
 * goes to the ScrollView. Pass `fadeColor` when the surface isn't white.
 * Web: FadingScrollView.web.tsx.
 */
import { forwardRef, useRef } from 'react';
import { View, Animated, StyleSheet, ScrollView, type ScrollViewProps } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { ProgressiveBlur } from '@/components/ProgressiveBlur';

export const FADE_HEIGHT = 32;

export interface FadingScrollViewProps extends ScrollViewProps {
  /** Surface colour behind the content, #rrggbb. Default white. */
  fadeColor?: string;
}

export const FadingScrollView = forwardRef<ScrollView, FadingScrollViewProps>(function FadingScrollView(
  { style, fadeColor = '#ffffff', onScroll, scrollEventThrottle = 16, children, ...rest },
  ref,
) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const clampedY = scrollY.interpolate({
    inputRange: [0, FADE_HEIGHT],
    outputRange: [0, FADE_HEIGHT],
    extrapolate: 'clamp',
  });
  // Slides the mask's fade band down from just above the edge, so its
  // depth matches how far the content has gone under.
  const maskShift = Animated.subtract(clampedY, FADE_HEIGHT);
  const blurOpacity = scrollY.interpolate({
    inputRange: [0, FADE_HEIGHT],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrap, style]}>
      <MaskedView
        style={styles.fill}
        maskElement={
          <Animated.View style={[styles.mask, { transform: [{ translateY: maskShift }] }]}>
            <LinearGradient colors={['rgba(0,0,0,0)', '#000']} style={styles.maskFade} />
            <View style={styles.maskSolid} />
          </Animated.View>
        }
      >
        <Animated.ScrollView
          ref={ref}
          style={styles.fill}
          scrollEventThrottle={scrollEventThrottle}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
            listener: onScroll,
          })}
          {...rest}
        >
          {children}
        </Animated.ScrollView>
      </MaskedView>
      <Animated.View style={[styles.blur, { opacity: blurOpacity }]} pointerEvents="none">
        <ProgressiveBlur height={FADE_HEIGHT} color={fadeColor} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Grows and shrinks like a bare ScrollView (its default style), so swapping
  // one in doesn't move anything.
  wrap: { flexGrow: 1, flexShrink: 1 },
  fill: { flexGrow: 1, flexShrink: 1 },
  // FADE_HEIGHT taller than the view, so shifting it up never uncovers
  // the bottom.
  mask: { position: 'absolute', top: 0, left: 0, right: 0, bottom: -FADE_HEIGHT },
  maskFade: { height: FADE_HEIGHT },
  maskSolid: { flex: 1, backgroundColor: '#000' },
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FADE_HEIGHT,
  },
});
