/**
 * ProgressiveBlur — the soft edge under a header: the header's colour
 * fading to clear over the band.
 *
 * Native: colour only. iOS won't draw a blur inside a gradient mask (it
 * comes out sharp), and stacked blur strips show as bands, so the blur
 * stops at the header and the frost thickens just before it (FrostBody)
 * so that line sits under an almost solid tint.
 * Web: ProgressiveBlur.web.tsx (CSS can fade a blur, so it does).
 */
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fadeColors, FADE_LOCATIONS, type ProgressiveBlurProps } from './progressiveBlurShared';

export function ProgressiveBlur({ height, color, startAlpha = 1 }: ProgressiveBlurProps) {
  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      <LinearGradient
        colors={fadeColors(color, startAlpha)}
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
