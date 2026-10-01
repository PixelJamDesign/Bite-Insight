/**
 * ProgressiveBlur (web) — CSS backdrop blur with a gradient mask, so the
 * blur fades out smoothly down the band, then the same colour fade as
 * native. See ProgressiveBlur.tsx.
 */
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fadeColors, FADE_LOCATIONS, type ProgressiveBlurProps } from './progressiveBlurShared';

export function ProgressiveBlur({ height, intensity = 24, color }: ProgressiveBlurProps) {
  // expo-blur's web BlurView uses roughly intensity / 4 px of blur.
  const blur = `blur(${Math.round(intensity / 4)}px)`;
  const mask = 'linear-gradient(to bottom, #000, transparent)';
  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: blur,
          WebkitBackdropFilter: blur,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      <LinearGradient
        colors={fadeColors(color)}
        locations={FADE_LOCATIONS}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
