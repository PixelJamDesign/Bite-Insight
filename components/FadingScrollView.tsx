/**
 * FadingScrollView — a ScrollView whose edges never hard-clip: the top
 * blurs and fades content away once it has scrolled up past it, and the
 * bottom fades while there's more below.
 *
 *   - A mask fades the content to clear right at the top edge. The fade's
 *     depth follows the scroll offset (up to FADE_HEIGHT), so at rest
 *     nothing is faded and, once scrolled, the edge is always soft.
 *   - ProgressiveBlur sits over the same band, easing in over the first
 *     FADE_HEIGHT px, so what's leaving also blurs.
 *   - A second mask does the same at the bottom, its depth following how
 *     much content is left below (none once you reach the end).
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
  {
    style,
    fadeColor = '#ffffff',
    onScroll,
    onLayout,
    onContentSizeChange,
    scrollEventThrottle = 16,
    children,
    ...rest
  },
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
  // How far the content can still scroll — its height minus the view's.
  const sizes = useRef({ content: 0, view: 0 });
  const maxScroll = useRef(new Animated.Value(0)).current;
  const updateMaxScroll = () =>
    maxScroll.setValue(Math.max(0, sizes.current.content - sizes.current.view));
  const bottomDepth = Animated.subtract(maxScroll, scrollY).interpolate({
    inputRange: [0, FADE_HEIGHT],
    outputRange: [0, FADE_HEIGHT],
    extrapolate: 'clamp',
  });
  const bottomShift = Animated.multiply(bottomDepth, -1);
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
        <MaskedView
          style={styles.fill}
          maskElement={
            <Animated.View style={[styles.maskBottom, { transform: [{ translateY: bottomShift }] }]}>
              <View style={styles.maskSolid} />
              <LinearGradient colors={['#000', 'rgba(0,0,0,0)']} style={styles.maskFade} />
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
            onLayout={(e) => {
              sizes.current.view = e.nativeEvent.layout.height;
              updateMaxScroll();
              onLayout?.(e);
            }}
            onContentSizeChange={(w, h) => {
              sizes.current.content = h;
              updateMaxScroll();
              onContentSizeChange?.(w, h);
            }}
            {...rest}
          >
            {children}
          </Animated.ScrollView>
        </MaskedView>
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
  // Same idea at the bottom: the fade sits just below the view until there's
  // content under the edge, then slides up into it.
  maskBottom: { position: 'absolute', top: 0, left: 0, right: 0, bottom: -FADE_HEIGHT },
  maskSolid: { flex: 1, backgroundColor: '#000' },
  blur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FADE_HEIGHT,
  },
});
