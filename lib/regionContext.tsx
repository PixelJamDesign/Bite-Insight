import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useSubscription } from '@/lib/subscriptionContext';

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

export function getDefaultRegion(): Region {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const regionCode = locale.split('-').pop()?.toLowerCase() ?? '';
    const match = REGIONS.find(r => r.code === regionCode);
    if (match) return match;
  } catch { /* fall through */ }
  return REGIONS[0]; // UK default
}

export function getOFFBaseUrl(region: Region): string {
  return `https://${region.subdomain}.openfoodfacts.org`;
}

// ─── Shared PlusTag component ───────────────────────────────────────────────────
// Re-exports PlusBadge so existing imports from regionContext keep working.

export { PlusBadge as PlusTag } from '@/components/PlusBadge';

// ─── Context ────────────────────────────────────────────────────────────────────

interface RegionContextValue {
  selectedRegion: Region;
  setSelectedRegion: (region: Region) => void;
}

const RegionContext = createContext<RegionContextValue>({
  selectedRegion: REGIONS[0],
  setSelectedRegion: () => {},
});

/** Global region — used as the Plus default */
const GLOBAL_REGION = REGIONS.find((r) => r.code === 'world')!;
/** UK region — used as the free-tier default */
const UK_REGION = REGIONS[0];

export function RegionProvider({ children }: { children: ReactNode }) {
  const { isPlus } = useSubscription();
  const [selectedRegion, setSelectedRegion] = useState<Region>(UK_REGION);
  const hasAppliedDefault = useRef(false);

  // Once subscription state is known, set the appropriate default:
  //   Free users → UK only
  //   Plus users → Global
  // Only applies once (on initial load) — after that, manual selection takes over.
  useEffect(() => {
    if (hasAppliedDefault.current) return;
    hasAppliedDefault.current = true;
    setSelectedRegion(isPlus ? GLOBAL_REGION : UK_REGION);
  }, [isPlus]);

  return (
    <RegionContext.Provider value={{ selectedRegion, setSelectedRegion }}>
      {children}
    </RegionContext.Provider>
  );
}

export function useRegion() {
  return useContext(RegionContext);
}
