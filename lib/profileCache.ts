// ── Lightweight in-memory profile + flagged-ingredient cache ──────────────────
// Avoids redundant Supabase round-trips when navigating between screens.
// The cache is populated by the dashboard on mount and consumed instantly by
// scan-result so nutrition insights render without waiting for network.

import { supabase } from './supabase';
import { detectCountry } from './detectCountry';
import type { UserProfile } from './types';

interface CachedProfile {
  profile: UserProfile;
  flaggedNames: string[];
  flaggedNameToIdMap: Record<string, string>;
  flagReasonMap: Record<string, { category: string; text: string }>;
  fetchedAt: number;
}

let cached: CachedProfile | null = null;
const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

/** Returns cached profile data if fresh, otherwise null. */
export function getCachedProfile(): CachedProfile | null {
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt > MAX_AGE_MS) {
    cached = null;
    return null;
  }
  return cached;
}

/** Store profile data in the in-memory cache. */
export function setCachedProfile(data: CachedProfile): void {
  cached = data;
}

/** Clear the cache (e.g. on sign-out). */
export function clearProfileCache(): void {
  cached = null;
}

/**
 * Fetch profile + flagged ingredients from Supabase, caching the result.
 * Returns instantly if a fresh cache exists.
 */
export async function fetchAndCacheProfile(userId: string): Promise<CachedProfile | null> {
  const existing = getCachedProfile();
  if (existing && existing.profile.id === userId) return existing;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (!data) return null;

  const profile = data as UserProfile;
  const flaggedIds: string[] = profile.flagged_ingredients ?? [];

  let flaggedNames: string[] = [];
  let flaggedNameToIdMap: Record<string, string> = {};
  let flagReasonMap: Record<string, { category: string; text: string }> = {};

  if (flaggedIds.length > 0) {
    const [{ data: ingData }, { data: reasonData }] = await Promise.all([
      supabase.from('ingredients').select('id, name').in('id', flaggedIds),
      supabase
        .from('ingredient_flag_reasons')
        .select('ingredient_id, reason_category, reason_text')
        .eq('user_id', userId)
        .in('ingredient_id', flaggedIds),
    ]);

    flaggedNames = (ingData ?? []).map((r: any) => r.name).filter(Boolean) as string[];
    for (const r of ingData ?? []) {
      if (r.name) flaggedNameToIdMap[r.name.toLowerCase()] = r.id;
    }
    for (const r of reasonData ?? []) {
      flagReasonMap[r.ingredient_id] = {
        category: r.reason_category,
        text: r.reason_text,
      };
    }
  }

  const result: CachedProfile = {
    profile,
    flaggedNames,
    flaggedNameToIdMap,
    flagReasonMap,
    fetchedAt: Date.now(),
  };
  setCachedProfile(result);

  // Backfill home_country_code for users who signed up during the
  // window where the post-signup upsert was silently rejected by RLS
  // (see migration 20260428_handle_new_user_home_country.sql). Runs
  // fire-and-forget so it never blocks the caller. RLS allows users
  // to update their own profile, so this works without a session
  // refresh. Once written, the trigger-driven flow takes over for
  // any future signups.
  if (profile.home_country_code == null) {
    detectCountry()
      .then(({ country_code }) => {
        if (!country_code) return;
        return supabase
          .from('profiles')
          .update({ home_country_code: country_code })
          .eq('id', userId)
          .is('home_country_code', null) // don't clobber a value set in the meantime
          .then(({ error }) => {
            if (error) {
              console.warn('[profileCache] backfill home_country_code failed:', error.message);
              return;
            }
            // Reflect the new value in the in-memory cache so the
            // UI picks it up without another fetch.
            const current = getCachedProfile();
            if (current && current.profile.id === userId) {
              setCachedProfile({
                ...current,
                profile: { ...current.profile, home_country_code: country_code },
              });
            }
          });
      })
      .catch(() => {
        // detectCountry already swallows errors; this catch is a
        // belt-and-braces guard so a runtime exception never bubbles
        // up into an unhandled promise rejection warning.
      });
  }

  return result;
}
