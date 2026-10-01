import { Colors } from '@/constants/theme';

/** Shared by ProgressiveBlur.tsx and ProgressiveBlur.web.tsx. */
export interface ProgressiveBlurProps {
  height: number;
  /** expo-blur intensity at the top edge. */
  intensity?: number;
}

/** Page colour fading to clear. */
// Stays mostly opaque over the top 40% — where the iOS blur (and its
// material tint) is strongest — then clears.
export const FADE_COLORS = [Colors.background, 'rgba(226,241,238,0.75)', 'rgba(226,241,238,0)'] as const;
export const FADE_LOCATIONS = [0, 0.4, 1] as const;
