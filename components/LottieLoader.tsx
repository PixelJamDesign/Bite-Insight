import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';
import { Colors, Spacing } from '@/constants/theme';

type AnimationType = 'loading' | 'searching' | 'success';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ANIMATIONS: Record<AnimationType, any> = {
  loading: require('@/assets/lottie/loading.json'),
  searching: require('@/assets/lottie/searching.json'),
  success: require('@/assets/lottie/success.json'),
};

interface LottieLoaderProps {
  /** Which animation to play */
  type?: AnimationType;
  /** Optional message below the animation */
  message?: string;
  /** Animation size (width & height) — default 120 */
  size?: number;
  /** Fill the entire screen (centered) — default true */
  fullScreen?: boolean;
  /** Loop the animation — default true (set false for success) */
  loop?: boolean;
  /** Called when a non-looping animation finishes */
  onAnimationFinish?: () => void;
}

export function LottieLoader({
  type = 'loading',
  message,
  size = 120,
  fullScreen = true,
  loop = true,
  onAnimationFinish,
}: LottieLoaderProps) {
  const containerStyle = fullScreen ? styles.fullScreen : styles.inline;

  return (
    <View style={containerStyle}>
      <LottieView
        source={ANIMATIONS[type]}
        autoPlay
        loop={loop}
        onAnimationFinish={onAnimationFinish}
        style={{ width: size, height: size }}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.m,
  },
  message: {
    marginTop: Spacing.s,
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
