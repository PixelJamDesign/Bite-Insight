/**
 * DismissibleRow — wraps a list row with the standard app-wide
 * swipe-to-delete gesture.
 *
 *   - Swipe left → the card's right edge pulls in, just enough to show a
 *     red circular trash button beside it. Tap the button to dismiss.
 *   - Swipe right, or tap the card, to close it again.
 *
 * The card's layout never changes: it stays full width inside a clipping
 * window that narrows, so the right-hand end (Nutri-score, chevron, ⋯)
 * slides out of view while the image and title stay put. Pass the card's
 * `radius` (and `borderColor`, if it has an outline) so the clipped edge
 * still looks like the card. A swipe never deletes on its own: deleting
 * always takes a tap on the button.
 *
 * Pan gesture + Reanimated, so the drag runs on the UI thread. The pan only
 * claims horizontal drags, so the list still scrolls normally.
 *
 * Used by the notifications inbox, the scan history and the dashboard.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';

/** Space the open row makes for the trash button. */
const ACTION_WIDTH = 72;
/** A little give past fully open, so the drag doesn't hit a wall. */
const OVERDRAG = 16;
/** How far a swipe has to go before the row stays open. */
const OPEN_THRESHOLD = 32;
const SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

interface DismissibleRowProps {
  /** Card content goes here. Usually a TouchableOpacity. */
  children: ReactNode;
  /** Fired when the trash button is tapped. */
  onDismiss: () => void;
  /** Corner radius of the card, so the clipped edge is rounded to match. */
  radius?: number;
  /** The card's 1px outline colour, redrawn on the clipped edge. */
  borderColor?: string;
  accessibilityLabel?: string;
}

export function DismissibleRow({
  children,
  onDismiss,
  radius = Radius.l,
  borderColor,
  accessibilityLabel = 'Dismiss',
}: DismissibleRowProps) {
  // Only the first tap should land; the row unmounts once the caller
  // removes it from the list.
  const triggeredRef = useRef(false);
  const [open, setOpen] = useState(false);
  // The card keeps this full width while its window narrows.
  const [cardWidth, setCardWidth] = useState<number | undefined>(undefined);

  // How far the card has been pulled in from the right (0 = closed).
  const reveal = useSharedValue(0);
  const startReveal = useSharedValue(0);

  const close = useCallback(() => {
    reveal.value = withSpring(0, SPRING);
    setOpen(false);
  }, [reveal]);

  const handleDismiss = useCallback(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    onDismiss();
    // Normally the row is gone by now. If the caller kept it (say the delete
    // failed), let it be used again.
    setTimeout(() => {
      triggeredRef.current = false;
    }, 600);
  }, [onDismiss]);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startReveal.value = reveal.value;
    })
    .onUpdate((e) => {
      const next = startReveal.value - e.translationX;
      reveal.value = Math.min(ACTION_WIDTH + OVERDRAG, Math.max(0, next));
    })
    .onEnd((e) => {
      const shouldOpen = e.velocityX < -400 || (e.velocityX < 400 && reveal.value > OPEN_THRESHOLD);
      reveal.value = withSpring(shouldOpen ? ACTION_WIDTH : 0, SPRING);
      runOnJS(setOpen)(shouldOpen);
    });

  const cardStyle = useAnimatedStyle(() => ({
    marginRight: reveal.value,
  }));

  // The button fades and grows in as the space beside the card opens up.
  const actionStyle = useAnimatedStyle(() => {
    const t = Math.min(1, reveal.value / ACTION_WIDTH);
    return { opacity: t, transform: [{ scale: 0.6 + 0.4 * t }] };
  });

  return (
    <GestureDetector gesture={pan}>
      <View onLayout={(e) => setCardWidth(e.nativeEvent.layout.width)}>
        <Reanimated.View
          style={[styles.action, actionStyle]}
          // The hidden button can't be hit by accident.
          pointerEvents={open ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDismiss}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </Reanimated.View>
        <Reanimated.View style={[styles.window, { borderRadius: radius }, cardStyle]}>
          <View style={cardWidth ? { width: cardWidth } : undefined}>{children}</View>
          {borderColor && (
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, styles.outline, { borderRadius: radius, borderColor }]}
            />
          )}
          {/* While open, a tap on the card closes it instead of opening it. */}
          {open && (
            <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close" />
          )}
        </Reanimated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden' },
  outline: { borderWidth: 1 },
  // Full row height so the circular button centres against the card,
  // however tall the card is.
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    backgroundColor: Colors.status.negative,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
