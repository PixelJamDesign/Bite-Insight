/**
 * ProgressiveBlur — a band that blurs whatever scrolls under it, strongest
 * at the top edge and easing to nothing at the bottom, then fades it into
 * the page colour. Used at the top of the meal planner timeline.
 *
 * iOS: one BlurView masked by a gradient, so the blur strength itself
 * ramps smoothly (no stepped strips).
 * Android: no reliable backdrop blur (same call as the tab bar), so the
 * colour fade alone.
 * Web: see ProgressiveBlur.web.tsx.
 */
import { View, StyleSheet, Platform } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { fadeColors, isDarkColor, FADE_LOCATIONS, type ProgressiveBlurProps } from './progressiveBlurShared';

export function ProgressiveBlur({ height, intensity = 24, color }: ProgressiveBlurProps) {
  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      {Platform.OS === 'ios' && (
        <MaskedView
          style={[StyleSheet.absoluteFill, styles.blurLayer]}
          maskElement={
            <LinearGradient
              colors={['#000', 'rgba(0,0,0,0)']}
              // Gone by 60% down, so the blur only shows where the page
              // colour (below) still mostly covers it.
              locations={[0, 0.6]}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          {/* Every iOS blur adds a material tint; the ultra-thin one adds
              the least (the default reads as grey on our teal). Dark
              surfaces get the dark version. */}
          <BlurView
            intensity={intensity}
            tint={isDarkColor(color) ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
            style={StyleSheet.absoluteFill}
          />
        </MaskedView>
      )}
      <LinearGradient
        colors={fadeColors(color)}
        locations={FADE_LOCATIONS}
        style={[StyleSheet.absoluteFill, styles.colourLayer]}
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
  // Explicit order: the page colour always sits over the blur.
  blurLayer: { zIndex: 0 },
  colourLayer: { zIndex: 1 },
});
