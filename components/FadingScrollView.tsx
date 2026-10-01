/**
 * FadingScrollView — a ScrollView whose top edge blurs and fades content
 * away (ProgressiveBlur) once it has scrolled up past it. At rest the edge
 * is clear; the effect eases in over the first FADE_IN_DISTANCE px.
 *
 * Drop-in for ScrollView in bottom sheets: `style` goes on an outer
 * wrapper (so flex / maxHeight rules still apply) and every other prop
 * goes to the ScrollView. Pass `fadeColor` when the surface isn't white.
 */
import { forwardRef, useRef } from 'react';
import { View, Animated, StyleSheet, ScrollView, type ScrollViewProps } from 'react-native';
import { ProgressiveBlur } from '@/components/ProgressiveBlur';

const FADE_HEIGHT = 32;
const FADE_IN_DISTANCE = 24;

interface Props extends ScrollViewProps {
  /** Surface colour behind the content, #rrggbb. Default white. */
  fadeColor?: string;
}

export const FadingScrollView = forwardRef<ScrollView, Props>(function FadingScrollView(
  { style, fadeColor = '#ffffff', onScroll, scrollEventThrottle = 16, children, ...rest },
  ref,
) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeOpacity = scrollY.interpolate({
    inputRange: [0, FADE_IN_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.wrap, style]}>
      <Animated.ScrollView
        ref={ref}
        style={styles.scroll}
        scrollEventThrottle={scrollEventThrottle}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: onScroll,
        })}
        {...rest}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View style={[styles.fade, { opacity: fadeOpacity }]} pointerEvents="none">
        <ProgressiveBlur height={FADE_HEIGHT} color={fadeColor} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  // Grows and shrinks like a bare ScrollView (its default style), so swapping
  // one in doesn't move anything.
  wrap: { flexGrow: 1, flexShrink: 1 },
  scroll: { flexGrow: 1, flexShrink: 1 },
  fade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FADE_HEIGHT,
  },
});
