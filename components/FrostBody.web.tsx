/**
 * FrostBody (web) — CSS backdrop blur with the surface tint over it.
 * See FrostBody.tsx.
 */
import { FROST_BLUR_PX, FROST_LIP, FROST_LIP_TINT, FROST_TINT, rgba } from './progressiveBlurShared';

export const FROST_EDGE_ALPHA = FROST_LIP_TINT;

export function FrostBody({ color }: { color: string }) {
  const blur = `blur(${FROST_BLUR_PX}px)`;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backdropFilter: blur,
        WebkitBackdropFilter: blur,
        // Thickens over the last FROST_LIP px, like native.
        backgroundImage: `linear-gradient(to bottom, ${rgba(color, FROST_TINT)} calc(100% - ${FROST_LIP}px), ${rgba(color, FROST_LIP_TINT)})`,
      }}
    />
  );
}
