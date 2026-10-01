import { Colors } from '@/constants/theme';

/** Shared by ProgressiveBlur.tsx and ProgressiveBlur.web.tsx. */
export interface ProgressiveBlurProps {
  height: number;
  /** expo-blur intensity at the top edge. */
  intensity?: number;
  /** Colour the band fades from, as #rrggbb — the surface behind it.
   *  Defaults to the page background; sheets pass white. */
  color?: string;
}

/** Surface colour fading to clear. Stays mostly opaque over the top 40% —
 *  where the iOS blur (and its material tint) is strongest — then clears. */
export function fadeColors(hex: string = Colors.background): [string, string, string] {
  const n = parseInt(hex.replace('#', ''), 16);
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  return [hex, `rgba(${rgb},0.75)`, `rgba(${rgb},0)`];
}
export const FADE_LOCATIONS = [0, 0.4, 1] as const;

/** True for dark surfaces (e.g. the Plus sheets), which want a dark blur. */
export function isDarkColor(hex: string = Colors.background): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 128;
}
