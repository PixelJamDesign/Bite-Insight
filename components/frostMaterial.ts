import { Colors } from '@/constants/theme';

// ─── Frosted glass ─────────────────────────────────────────────────────────
// The one material for anything content scrolls behind: a progressive blur
// plus a tint of the surface colour. Content stays visible, softened enough
// not to fight the header's own text and buttons. Used by HeaderEdge.tsx.

/** Tint over the blur. */
export const FROST_TINT = 0.72;
/** Where there's no native blur (Expo Go), the tint does all the work. */
export const FROST_TINT_NO_BLUR = 0.9;
/** Blur radius (px) where the frost is strongest. */
export const FROST_BLUR_RADIUS = 14;

/** #rrggbb + alpha → rgba(). */
export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** True for dark surfaces (e.g. the Plus sheets), which want a dark blur. */
export function isDarkColor(hex: string = Colors.background): boolean {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
  return lum < 128;
}
