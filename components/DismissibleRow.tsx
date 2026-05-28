/**
 * DismissibleRow — wraps a list row with the standard app-wide
 * swipe-to-delete gesture.
 *
 * Two-tier behaviour, matching iOS Mail:
 *   - Short swipe (past 40 px) → red trash button reveals, tap to
 *     confirm dismiss
 *   - Long swipe (past 60 % of screen width by default) → auto-dismisses
 *     without needing the tap, row animates off in one fluid motion
 *
 * Used by the notifications inbox and the scan history. Drop it
 * around any list row that should be swipe-deletable so the gesture
 * feels identical everywhere.
 */
import { useCallback, useRef, type ReactNode, type ReactElement } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface DismissibleRowProps {
  /** Card content goes here. Usually a TouchableOpacity. */
  children: ReactNode;
  /** Called when the row is dismissed — via tap on the action or via
   *  long-swipe past the auto threshold. Both code paths fire exactly
   *  once per swipe. */
  onDismiss: () => void;
  /** Custom right-action UI. Defaults to a 72×fullHeight red trash
   *  button that matches the inbox + history visual treatment. */
  renderRightAction?: (onPress: () => void) => ReactElement;
  /** Long-swipe auto-dismiss threshold as a fraction of screen width.
   *  Defaults to 0.6 — far enough to feel deliberate, close enough to
   *  reach with a confident swipe. */
  longSwipeThreshold?: number;
  /** Accessibility label for the dismiss action. */
  accessibilityLabel?: string;
}

export function DismissibleRow({
  children,
  onDismiss,
  renderRightAction,
  longSwipeThreshold = 0.6,
  accessibilityLabel = 'Dismiss',
}: DismissibleRowProps) {
  const swipeableRef = useRef<Swipeable>(null);
  // Guards multiple fires on a single swipe (the dragX listener is
  // high-frequency; only the first crossing should trigger).
  const triggeredRef = useRef(false);
  // Tracks (dragX, listenerId) so we can clean up when Swipeable hands
  // us a new AnimatedValue on each fresh gesture.
  const listenerRef = useRef<{
    dragX: Animated.AnimatedInterpolation<number>;
    id: string;
  } | null>(null);

  const longSwipePx = SCREEN_WIDTH * longSwipeThreshold;

  const buildRenderRightActions = useCallback(
    (
      _progress: Animated.AnimatedInterpolation<number>,
      dragX: Animated.AnimatedInterpolation<number>,
    ) => {
      // Re-bind if Swipeable handed us a new AnimatedValue (new gesture).
      if (!listenerRef.current || listenerRef.current.dragX !== dragX) {
        if (listenerRef.current) {
          (listenerRef.current.dragX as Animated.Value).removeListener(listenerRef.current.id);
        }
        const id = (dragX as Animated.Value).addListener(({ value }) => {
          // dragX is negative when swiping left toward the action.
          if (!triggeredRef.current && value < -longSwipePx) {
            triggeredRef.current = true;
            swipeableRef.current?.close();
            onDismiss();
          }
        });
        listenerRef.current = { dragX, id };
      }

      if (renderRightAction) return renderRightAction(onDismiss);

      return (
        <TouchableOpacity
          style={styles.defaultAction}
          onPress={onDismiss}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      );
    },
    [onDismiss, longSwipePx, renderRightAction, accessibilityLabel],
  );

  const handleSwipeableClose = useCallback(() => {
    triggeredRef.current = false;
  }, []);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={buildRenderRightActions}
      onSwipeableClose={handleSwipeableClose}
      overshootRight={false}
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  defaultAction: {
    backgroundColor: Colors.status.negative,
    borderRadius: Radius.l,
    width: 72,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
