import { Colors } from '@/constants/theme';

/** Shared by ProgressiveBlur.tsx and ProgressiveBlur.web.tsx. */
export interface ProgressiveBlurProps {
  height: number;
  /** expo-blur intensity at the top edge. */
  intensity?: number;
}

/** Page colour fading to clear. */
export const FADE_COLORS = [Colors.background, 'rgba(226,241,238,0.6)', 'rgba(226,241,238,0)'] as const;
export const FADE_LOCATIONS = [0, 0.45, 1] as const;
