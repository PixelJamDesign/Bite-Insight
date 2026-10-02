/**
 * Feature switches for what ships in a build.
 *
 * DEXCOM: Connected devices (Dexcom CGM). Off for 2.0.0 — the edge
 * functions are deployed but the integration isn't launching yet. Turning
 * it back on restores the Settings menu item and the screens.
 */
export const FEATURES = {
  dexcom: false,
} as const;
