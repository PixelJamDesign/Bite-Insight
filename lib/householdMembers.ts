/**
 * Household members fetcher — returns the self profile and all family
 * profiles for a given user in a single call.
 *
 * Used by the recipe detail view's household impact table.
 */
import { supabase } from './supabase';
import type { UserProfile, FamilyProfile } from './types';

export interface Household {
  self: UserProfile;
  family: FamilyProfile[];
}

/**
 * Fetches the authenticated user's profile and their family members.
 * Returns null if the profile can't be loaded (e.g. user not authenticated).
 */
export async function fetchHousehold(userId: string): Promise<Household | null> {
  const [profileRes, familyRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    // get_family_members() returns the caller's family rows with LINKED
    // members' health/preference fields overlaid live from their own
    // account (a member who linked their real account is mirrored, not
    // shown as the empty managed columns). Scoped to auth.uid() server-side.
    supabase.rpc('get_family_members'),
  ]);

  if (profileRes.error || !profileRes.data) {
    console.warn('[household] profile fetch failed:', profileRes.error?.message);
    return null;
  }

  return {
    self: profileRes.data as UserProfile,
    family: (familyRes.data ?? []) as FamilyProfile[],
  };
}
