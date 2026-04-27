/**
 * Calls the Supabase `detect-country` Edge Function once during
 * signup to figure out which country the user is genuinely in,
 * based on their IP. The result is written to
 * profiles.home_country_code and is what gates the freemium
 * region-scoped features (UK signup → free UK scanner, etc.).
 *
 * Why this exists as a separate helper:
 *   • Both signup paths (handleFinish + handleCreateAndSkip) need it.
 *   • Geo detection should never block signup — if the call fails,
 *     we fall back to 'world' silently and let the user proceed.
 *     That mirrors the Edge Function's own fallback behaviour.
 */
import { supabase } from '@/lib/supabase';

export interface DetectedCountry {
  /** ISO 3166-1 alpha-2 lowercase, or 'world' for unsupported. */
  country_code: string;
  /** True when the country has a dedicated OFF region in-app. */
  supported: boolean;
}

export async function detectCountry(): Promise<DetectedCountry> {
  try {
    const { data, error } = await supabase.functions.invoke<DetectedCountry>(
      'detect-country',
      { method: 'GET' },
    );
    if (error || !data) {
      return { country_code: 'world', supported: false };
    }
    return {
      country_code: data.country_code ?? 'world',
      supported: !!data.supported,
    };
  } catch {
    return { country_code: 'world', supported: false };
  }
}
