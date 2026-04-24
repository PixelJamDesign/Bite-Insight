/**
 * useSheetAnimation — shared entry/exit animation for bottom sheets.
 *
 * The goal: backdrop fades in place (no slide), panel slides up from the
 * bottom. On close, both reverse smoothly so the Modal doesn't snap shut.
 *
 * Returns:
 *   rendered         — whether the Modal should be mounted. Stays true
 *                      during the exit animation so the sheet can animate
 *                      out before unmounting.
 *   backdropOpacity  — Animated.Value 0..1. Apply as `opacity` on the
 *                      backdrop overlay.
 *   sheetTranslateY  — Animated.Value px. Apply as `transform:[{translateY}]`
 *                      on the sheet wrapper.
 *
 * Usage:
 *   const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
 *
 *   return (
 *     <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
 *       <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
 *         <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
 *       </Animated.View>
 *       <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
 *         <SafeAreaView style={styles.sheet} edges={['bottom']}>
 *           ...
 *         </SafeAreaView>
 *       </Animated.View>
 *     </Modal>
 *   );
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const ENTER_DURATION = 260;
const EXIT_DURATION = 200;

export function useSheetAnimation(visible: boolean) {
  // `rendered` keeps the Modal mounted while the exit animation plays.
  const [rendered, setRendered] = useState(visible);

  const backdropOpacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const sheetTranslateY = useRef(
    new Animated.Value(visible ? 0 : SCREEN_HEIGHT),
  ).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ENTER_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 180,
          mass: 0.9,
        }),
      ]).start();
    } else if (rendered) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: EXIT_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: EXIT_DURATION,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setRendered(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return { rendered, backdropOpacity, sheetTranslateY };
}
