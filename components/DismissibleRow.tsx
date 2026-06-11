/**
 * DismissibleRow — wraps a list row with the standard app-wide
 * swipe-to-delete gesture (iOS Mail style).
 *
 *   - Short swipe → red circular trash button reveals; tap to dismiss.
 *   - Full drag-left (past `longSwipeThreshold` of the screen width) →
 *     dismisses directly, no tap needed.
 *
 * Built on RNGH's ReanimatedSwipeable so the gesture and the full-swipe
 * detection both run on the UI thread (Reanimated). The classic Animated
 * Swipeable drove the drag natively, so reading the drag distance from JS
 * to trigger the full-swipe threw a native/JS driver conflict — Reanimated
 * sidesteps that entirely.
 *
 * Used by the notifications inbox and the scan history.
 */
import { useCallback, useRef, type ReactNode } from 'react';
import { Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DismissibleRowProps {
  /** Card content goes here. Usually a TouchableOpacity. */
  children: ReactNode;
  /** Fired once per gesture — via tap on the trash button or a full
   *  drag-left past the threshold. */
  onDismiss: () => void;
  /** Full-swipe auto-dismiss threshold as a fraction of screen width.
   *  Default 0.6 — far enough to feel deliberate. */
  longSwipeThreshold?: number;
  accessibilityLabel?: string;
}

export function DismissibleRow({
  children,
  onDismiss,
  longSwipeThreshold = 0.6,
  accessibilityLabel = 'Dismiss',
}: DismissibleRowProps) {
  // The full-swipe worklet can bridge to JS on consecutive frames, and a tap
  // can race it — only the first dismiss should land. The row unmounts on
  // dismiss (the caller removes it from the list), so no close() is needed.
  const triggeredRef = useRef(false);
  const longSwipePx = SCREEN_WIDTH * longSwipeThreshold;

  const handleDismiss = useCallback(() => {
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    onDismiss();
  }, [onDismiss]);

  const renderRightActions = useCallback(
    (progress: SharedValue<number>, translation: SharedValue<number>) => (
      <RightAction
        progress={progress}
        translation={translation}
        longSwipePx={longSwipePx}
        onDismiss={handleDismiss}
        accessibilityLabel={accessibilityLabel}
      />
    ),
    [handleDismiss, longSwipePx, accessibilityLabel],
  );

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      onSwipeableWillClose={() => { triggeredRef.current = false; }}
      overshootRight
      rightThreshold={40}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

function RightAction({
  progress,
  translation,
  longSwipePx,
  onDismiss,
  accessibilityLabel,
}: {
  progress: SharedValue<number>;
  translation: SharedValue<number>;
  longSwipePx: number;
  onDismiss: () => void;
  accessibilityLabel: string;
}) {
  // UI-thread guard so we bridge to JS at most once per gesture.
  const fired = useSharedValue(false);

  // Fade the red circle in with swipe progress (0 at rest → 1 once revealed).
  const iconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, progress.value)),
  }));

  // Full drag-left → dismiss directly once the row passes the threshold.
  useAnimatedReaction(
    () => translation.value,
    (value) => {
      if (value < -longSwipePx) {
        if (!fired.value) {
          fired.value = true;
          runOnJS(onDismiss)();
        }
      } else {
        // Re-arm if the user pulls back before the threshold.
        fired.value = false;
      }
    },
  );

  return (
    <Reanimated.View style={[styles.actionContainer, iconStyle]}>
      <TouchableOpacity
        style={styles.defaultAction}
        onPress={onDismiss}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  // Full row height so the circular button can centre vertically against the
  // card, regardless of how tall the card is.
  actionContainer: {
    width: 72,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultAction: {
    backgroundColor: Colors.status.negative,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
