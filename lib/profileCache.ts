// ── Lightweight in-memory profile + flagged-ingredient cache ──────────────────
// Avoids redundant Supabase round-trips when navigating between screens.
// The cache is populated by the dashboard on mount and consumed instantly by
// scan-result so nutrition insights render without waiting for network.

import { supabase } from './supabase';
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
  return result;
}
