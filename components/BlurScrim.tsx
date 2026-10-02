/**
 * BlurScrim — the backdrop behind centred card modals (review prompt,
 * feedback questionnaires): the page blurred, then tinted dark teal.
 * Expo Go can't load the native blur, so there the tint is darker.
 */
import type { ComponentType } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

type BlurProps = { blurType?: string; blurAmount?: number; style?: any };
const BlurView: ComponentType<BlurProps> | null =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? null
    : require('@sbaiahmed1/react-native-blur').BlurView;

export function BlurScrim({ opacity }: { opacity: Animated.Value | Animated.AnimatedInterpolation<number> }) {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      {BlurView && <BlurView blurType="dark" blurAmount={12} style={StyleSheet.absoluteFill} />}
      <View style={[StyleSheet.absoluteFill, BlurView ? styles.tint : styles.tintNoBlur]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tint: { backgroundColor: 'rgba(2, 52, 50, 0.6)' },
  tintNoBlur: { backgroundColor: 'rgba(2, 52, 50, 0.85)' },
});
