/**
 * FrostBody — the frosted glass fill behind a header: a backdrop blur with
 * a tint of the surface colour over it. Fills its parent.
 *
 * iOS: BlurView (ultra-thin material, the least grey on our teal) + tint.
 * Android: no backdrop blur without wrapping every screen in a blur
 * target, so a stronger tint on its own.
 * Web: FrostBody.web.tsx.
 */
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FROST_BLUR_INTENSITY,
  FROST_LIP,
  FROST_LIP_TINT,
  FROST_TINT,
  FROST_TINT_NO_BLUR,
  isDarkColor,
  rgba,
} from './progressiveBlurShared';

const BODY_TINT = Platform.OS === 'ios' ? FROST_TINT : FROST_TINT_NO_BLUR;

/** Tint at the frost's bottom edge, for the fade below to carry on from. */
export const FROST_EDGE_ALPHA = FROST_LIP_TINT;

export function FrostBody({ color }: { color: string }) {
  return (
    <>
      {Platform.OS === 'ios' && (
        <BlurView
          intensity={FROST_BLUR_INTENSITY}
          tint={isDarkColor(color) ? 'systemUltraThinMaterialDark' : 'systemUltraThinMaterialLight'}
          style={StyleSheet.absoluteFill}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: rgba(color, BODY_TINT) }]} />
      {/* Thickens at the bottom so the blur's edge doesn't show */}
      <LinearGradient
        colors={[rgba(color, 0), rgba(color, (FROST_LIP_TINT - BODY_TINT) / (1 - BODY_TINT))]}
        style={styles.lip}
      />
    </>
  );
}

const styles = StyleSheet.create({
  lip: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FROST_LIP },
});
