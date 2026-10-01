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
import { FADE_COLORS, FADE_LOCATIONS, type ProgressiveBlurProps } from './progressiveBlurShared';

export function ProgressiveBlur({ height, intensity = 24 }: ProgressiveBlurProps) {
  return (
    <View style={[styles.wrap, { height }]} pointerEvents="none">
      {Platform.OS === 'ios' && (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={['#000', 'rgba(0,0,0,0)']}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <BlurView intensity={intensity} tint="default" style={StyleSheet.absoluteFill} />
        </MaskedView>
      )}
      <LinearGradient
        colors={FADE_COLORS}
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
