/**
 * FadingScrollView (web) — same behaviour as FadingScrollView.tsx, with a
 * CSS mask on the scroll element instead of MaskedView. The top fade
 * follows the scroll offset and the bottom fade the content left below,
 * so neither edge is ever hard.
 */
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { HeaderEdge, HEADER_EDGE_AT_TOP, HEADER_EDGE_HEIGHT } from '@/components/HeaderEdge';
import type { FadingScrollViewProps } from './FadingScrollView';

const FADE_HEIGHT = HEADER_EDGE_HEIGHT;

function maskFor(offset: number, remaining: number): string {
  const top = Math.max(0, Math.min(offset, FADE_HEIGHT));
  const bottom = Math.max(0, Math.min(remaining, FADE_HEIGHT));
  return `linear-gradient(to bottom, transparent 0px, #000 ${top}px, #000 calc(100% - ${bottom}px), transparent 100%)`;
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
  const scrollRef = useRef<ScrollView>(null);
  useImperativeHandle(ref, () => scrollRef.current as ScrollView);
  const scrollY = useRef(new Animated.Value(0)).current;

  const applyMask = useCallback((offset: number) => {
    const node = (scrollRef.current as unknown as { getScrollableNode?: () => HTMLElement })
      ?.getScrollableNode?.();
    if (!node) return;
    const mask = maskFor(offset, node.scrollHeight - node.clientHeight - offset);
    node.style.maskImage = mask;
    node.style.setProperty('-webkit-mask-image', mask);
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    applyMask(y);
    scrollY.setValue(y);
    onScroll?.(e);
  };

  // Re-check the bottom fade when the content or the view changes size.
  const remask = () => {
    const node = (scrollRef.current as unknown as { getScrollableNode?: () => HTMLElement })
      ?.getScrollableNode?.();
    applyMask(node?.scrollTop ?? 0);
  };

  return (
    <View style={[styles.wrap, style]}>
      <ScrollView
        ref={scrollRef}
        style={styles.fill}
        scrollEventThrottle={scrollEventThrottle}
        onScroll={handleScroll}
        onLayout={(e) => {
          remask();
          onLayout?.(e);
        }}
        onContentSizeChange={(w, h) => {
          remask();
          onContentSizeChange?.(w, h);
        }}
        {...rest}
      >
        {children}
      </ScrollView>
      <HeaderEdge scrollY={scrollY} color={fadeColor} style={HEADER_EDGE_AT_TOP} />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, flexShrink: 1 },
  fill: { flexGrow: 1, flexShrink: 1 },
});
