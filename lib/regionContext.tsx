import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useSubscription } from '@/lib/subscriptionContext';
import { useAuth } from '@/lib/auth';
import { fetchAndCacheProfile, getCachedProfile, setCachedProfile } from '@/lib/profileCache';
import { detectCountry } from '@/lib/detectCountry';
import { supabase } from '@/lib/supabase';

// ─── Types ──────────────────────────────────────────────────────────────────────

export type Region = { code: string; label: string; subdomain: string; countryTag: string };

// ─── Constants ──────────────────────────────────────────────────────────────────

export const REGIONS: Region[] = [
  { code: 'gb',    label: 'United Kingdom', subdomain: 'uk',    countryTag: 'en:united-kingdom' },
  { code: 'world', label: 'Global',         subdomain: 'world', countryTag: '' },
  { code: 'us',    label: 'United States',  subdomain: 'us',    countryTag: 'en:united-states' },
  { code: 'it',    label: 'Italy',          subdomain: 'it',    countryTag: 'en:italy' },
  { code: 'de',    label: 'Germany',        subdomain: 'de',    countryTag: 'en:germany' },
  { code: 'es',    label: 'Spain',          subdomain: 'es',    countryTag: 'en:spain' },
  { code: 'fr',    label: 'France',         subdomain: 'fr',    countryTag: 'en:france' },
];

export const FLAG_IMAGES: Record<string, any> = {
  gb:    require('@/assets/images/region_uk.webp'),
  world: require('@/assets/images/region_global.webp'),
  us:    require('@/assets/images/region_usa.webp'),
  it:    require('@/assets/images/region_italy.webp'),
  de:    require('@/assets/images/region_germany.webp'),
  es:    require('@/assets/images/region_spain.webp'),
  fr:    require('@/assets/images/region_france.webp'),
};

// ─── Helpers ────────────────────────────────────────────────────────────────────

export function getOFFBaseUrl(region: Region): string {
  return `https://${region.subdomain}.openfoodfacts.org`;
}

/**
 * Resolves a country code to a Region row. Falls back to Global when
 * the code doesn't match a supported region (i.e. user signed up in
 * a country we don't yet have a dedicated OFF subdomain for).
 */
function regionForCountry(code: string | null): Region {
  if (!code) return GLOBAL_REGION;
  const match = REGIONS.find((r) => r.code === code);
  return match ?? GLOBAL_REGION;
}

// ─── Shared PlusTag component ───────────────────────────────────────────────────
// Re-exports PlusBadge so existing imports from regionContext keep working.

export { PlusBadge as PlusTag } from '@/components/PlusBadge';

// ─── Context ────────────────────────────────────────────────────────────────────

interface RegionContextValue {
  selectedRegion: Region;
  setSelectedRegion: (region: Region) => void;
  /** ISO 3166-1 alpha-2 lowercase country code captured at signup, or
   *  null while the profile is still loading. 'world' = unsupported. */
  homeCountryCode: string | null;
  /** True when the user can use this region without Plus.
   *  Free users: only their home country is accessible.
   *  Plus users: every region is accessible. */
  isRegionAccessible: (region: Region) => boolean;
  /** Re-check the user's home country. Call this from screens that
   *  depend on the lock (scanner, food-search) on focus, so a fresh
   *  signup never sees Global on first open even if regionContext's
   *  initial fetch raced ahead of the home_country_code being
   *  populated. No-op when home_country_code is already set. */
  ensureHomeCountry: () => void;
}

const GLOBAL_REGION = REGIONS.find((r) => r.code === 'world')!;

const RegionContext = createContext<RegionContextValue>({
  selectedRegion: GLOBAL_REGION,
  setSelectedRegion: () => {},
  homeCountryCode: null,
  isRegionAccessible: () => false,
  ensureHomeCountry: () => {},
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const { isPlus } = useSubscription();
  const { session } = useAuth();

  // Hydrate from the in-memory cache straight away if it's already
  // warm (avoids a flash of Global while we wait for the profile fetch).
  const cachedAtMount = getCachedProfile();
  const initialHome =
    cachedAtMount?.profile.home_country_code ?? null;

  const [homeCountryCode, setHomeCountryCode] = useState<string | null>(initialHome);

  // For Plus users, selectedRegion is whatever they last picked. For
  // free users, selectedRegion is DERIVED from homeCountryCode below
  // and this state is unused — that's the whole point: free users are
  // hard-locked to their home country, and the lock can't be defeated
  // by a stale render or by setSelectedRegion being called externally.
  const [plusSelectedRegion, setPlusSelectedRegion] = useState<Region>(GLOBAL_REGION);

  // Track in-flight self-heal so re-entrant calls (e.g. user
  // bouncing between scanner and search before the first detect
  // resolves) don't fire detectCountry repeatedly.
  const healingRef = useRef(false);
  // Mirror homeCountryCode for the self-heal closure so it doesn't
  // need to be a dep on the useCallback (which would re-bind on
  // every state change and break referential stability for the
  // useFocusEffect callers).
  const homeCountryCodeRef = useRef(homeCountryCode);
  homeCountryCodeRef.current = homeCountryCode;

  // ── Self-heal: detect country from IP, set state, persist ─────
  // Called whenever we discover home_country_code is null while a
  // session is active. Runs at most once concurrently.
  const healHomeCountry = useCallback(async (userId: string) => {
    if (healingRef.current) return;
    healingRef.current = true;
    try {
      const { country_code } = await detectCountry();
      const next = country_code || 'world';
      setHomeCountryCode(next);
      // Persist (RLS allows users to update their own profile).
      // .is(...) so we don't clobber a value that landed in the
      // meantime via the trigger or another path.
      const { error } = await supabase
        .from('profiles')
        .update({ home_country_code: next })
        .eq('id', userId)
        .is('home_country_code', null);
      if (!error) {
        const current = getCachedProfile();
        if (current && current.profile.id === userId) {
          setCachedProfile({
            ...current,
            profile: { ...current.profile, home_country_code: next },
          });
        }
      }
    } catch {
      // detectCountry already swallows errors; leave homeCountryCode
      // null — the UI falls back to Global, the safest no-op.
    } finally {
      healingRef.current = false;
    }
  }, []);

  // Public API: re-check on focus from scanner / food-search. No-op
  // unless we still don't have a country code.
  const ensureHomeCountry = useCallback(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    if (homeCountryCodeRef.current) return;
    healHomeCountry(userId);
  }, [session?.user?.id, healHomeCountry]);

  // ── Load home_country_code from the user's profile ────────────
  // Once the auth session is known, fetch the profile (cached, so
  // this is a no-op when the dashboard has already warmed it up).
  // If it comes back null we self-heal here too — but the focus-
  // triggered ensureHomeCountry() above is the real safety net.
  useEffect(() => {
    let cancelled = false;
    const userId = session?.user?.id;
    if (!userId) {
      setHomeCountryCode(null);
      return;
    }
    fetchAndCacheProfile(userId).then(async (cached) => {
      if (cancelled) return;
      const code = cached?.profile.home_country_code ?? null;
      if (code) {
        setHomeCountryCode(code);
        return;
      }
      healHomeCountry(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, healHomeCountry]);

  // ── Derived: the actual selected region ───────────────────────
  // Plus members: free choice (defaults to Global until they pick).
  // Free members: hard-locked to home country. While the profile is
  // still loading (homeCountryCode === null), regionForCountry() falls
  // back to Global, which is the safest no-op until the real value
  // arrives a moment later.
  const selectedRegion: Region = isPlus
    ? plusSelectedRegion
    : regionForCountry(homeCountryCode);

  function setSelectedRegion(region: Region) {
    // Free users can't change region — their selection is derived
    // from home_country_code at all times. The picker UI in
    // scanner.tsx / food-search.tsx already gates region taps via
    // isRegionAccessible(); this guard is the second line of defence
    // so a future caller can't accidentally bypass the lock.
    if (!isPlus) return;
    setPlusSelectedRegion(region);
  }

  // ── Accessibility check ───────────────────────────────────────
  // Single source of truth used by the UI so the dropdown gating
  // and the "tap = upsell" logic can't drift apart.
  function isRegionAccessible(region: Region): boolean {
    if (isPlus) return true;
    if (homeCountryCode === null) return false; // fail-safe while loading
    if (region.code === homeCountryCode) return true;
    // Users from unsupported countries default to 'world' — let
    // them keep Global free. All dedicated regions still Plus-gated.
    if (homeCountryCode === 'world' && region.code === 'world') return true;
    return false;
  }

  return (
    <RegionContext.Provider
      value={{ selectedRegion, setSelectedRegion, homeCountryCode, isRegionAccessible, ensureHomeCountry }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
