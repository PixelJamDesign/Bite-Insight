import { Colors } from '@/constants/theme';

/** Shared by ProgressiveBlur.tsx and ProgressiveBlur.web.tsx. */
export interface ProgressiveBlurProps {
  height: number;
  /** expo-blur intensity at the top edge. */
  intensity?: number;
  /** Colour the band fades from, as #rrggbb — the surface behind it.
   *  Defaults to the page background; sheets pass white. */
  color?: string;
  /** Opacity of the colour at the top edge. 1 fades out of a solid
   *  header; FROST_TINT continues a frosted one. */
  startAlpha?: number;
}

// ─── Frosted glass ─────────────────────────────────────────────────────────
// The one material for anything content scrolls behind: blur plus a tint
// of the surface colour. Content stays visible, softened enough not to
// fight the header's own text and buttons.

/** Tint over the blur (iOS / web). */
export const FROST_TINT = 0.72;
/** Android has no backdrop blur here, so the tint does all the work. */
export const FROST_TINT_NO_BLUR = 0.9;
/** The frost thickens to this over its last FROST_LIP px, and the edge
 *  below fades out from it, so where the blur stops is never a line. */
export const FROST_LIP_TINT = 0.94;
export const FROST_LIP = 14;
/** expo-blur intensity on iOS. */
export const FROST_BLUR_INTENSITY = 40;
/** CSS blur on web. */
export const FROST_BLUR_PX = 14;

/** #rrggbb + alpha → rgba(). */
export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Surface colour fading to clear. Stays mostly opaque over the top 40% —
 *  where the iOS blur (and its material tint) is strongest — then clears. */
export function fadeColors(hex: string = Colors.background, startAlpha = 1): [string, string, string] {
  return [rgba(hex, startAlpha), rgba(hex, startAlpha * 0.75), rgba(hex, 0)];
}
export const FADE_LOCATIONS = [0, 0.4, 1] as const;

/** True for dark surfaces (e.g. the Plus sheets), which want a dark blur. */
export function isDarkColor(hex: string = Colors.background): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 128;
}
