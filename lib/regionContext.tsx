import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSubscription } from '@/lib/subscriptionContext';
import { useAuth } from '@/lib/auth';
import { fetchAndCacheProfile, getCachedProfile } from '@/lib/profileCache';

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
}

const GLOBAL_REGION = REGIONS.find((r) => r.code === 'world')!;

const RegionContext = createContext<RegionContextValue>({
  selectedRegion: GLOBAL_REGION,
  setSelectedRegion: () => {},
  homeCountryCode: null,
  isRegionAccessible: () => false,
});

export function RegionProvider({ children }: { children: ReactNode }) {
  const { isPlus } = useSubscription();
  const { session } = useAuth();

  // Hydrate from the in-memory cache straight away if it's already
  // warm (avoids a flash of UK while we wait for the profile fetch).
  const cachedAtMount = getCachedProfile();
  const initialHome =
    cachedAtMount?.profile.home_country_code ?? null;

  const [homeCountryCode, setHomeCountryCode] = useState<string | null>(initialHome);
  const [selectedRegion, setSelectedRegion] = useState<Region>(
    isPlus ? GLOBAL_REGION : regionForCountry(initialHome),
  );
  const hasAppliedDefault = useRef(initialHome !== null);

  // ── Load home_country_code from the user's profile ────────────
  // Once the auth session is known, fetch the profile (cached, so
  // this is a no-op when the dashboard has already warmed it up).
  useEffect(() => {
    let cancelled = false;
    if (!session?.user?.id) {
      setHomeCountryCode(null);
      hasAppliedDefault.current = false;
      return;
    }
    fetchAndCacheProfile(session.user.id).then((cached) => {
      if (cancelled) return;
      const code = cached?.profile.home_country_code ?? null;
      setHomeCountryCode(code);
    });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // ── Apply the appropriate default region once we know enough ──
  // Free users land on their home country; Plus users land on Global
  // (so they immediately see the broadest dataset). Only fires once
  // per session — after that, manual selection wins.
  useEffect(() => {
    if (hasAppliedDefault.current) return;
    if (homeCountryCode === null) return; // wait for profile
    hasAppliedDefault.current = true;
    setSelectedRegion(isPlus ? GLOBAL_REGION : regionForCountry(homeCountryCode));
  }, [homeCountryCode, isPlus]);

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
      value={{ selectedRegion, setSelectedRegion, homeCountryCode, isRegionAccessible }}
    >
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
