/**
 * offlineDatabase.web.ts
 *
 * Web stub for the offline database module.
 * expo-sqlite and expo-file-system download features are native-only,
 * so on web the offline database is unavailable.
 * Metro uses this file instead of offlineDatabase.ts when bundling for web.
 */

import { CachedProduct } from '@/lib/productCache';

// ── Types (re-exported to match native module) ───────────────────────────────
export type RegionCode = 'gb' | 'us' | 'fr' | 'de' | 'es' | 'it';

export const REGION_INFO: Record<RegionCode, { label: string; flag: string }> = {
  gb: { label: 'United Kingdom', flag: '🇬🇧' },
  us: { label: 'United States', flag: '🇺🇸' },
  fr: { label: 'France', flag: '🇫🇷' },
  de: { label: 'Germany', flag: '🇩🇪' },
  es: { label: 'Spain', flag: '🇪🇸' },
  it: { label: 'Italy', flag: '🇮🇹' },
};

export const ALL_REGIONS: RegionCode[] = ['gb', 'us', 'fr', 'de', 'es', 'it'];

export type OfflineDbStatus = 'not-downloaded' | 'downloading' | 'ready' | 'error';

export type RegionManifestEntry = {
  filename: string;
  sizeBytes: number;
  productCount: number;
  label: string;
  flag: string;
};

export type GlobalManifest = {
  version: string;
  regions: Partial<Record<RegionCode, RegionManifestEntry>>;
};

export type RegionDbInfo = {
  status: OfflineDbStatus;
  version: string | null;
  productCount: number | null;
  fileSizeBytes: number | null;
  downloadProgress: number;
  error: string | null;
};

// ── Stubs ────────────────────────────────────────────────────────────────────

export async function fetchGlobalManifest(): Promise<GlobalManifest | null> {
  return null;
}

export async function getDownloadedRegions(): Promise<RegionCode[]> {
  return [];
}

export async function getRegionInfo(_region: RegionCode): Promise<RegionDbInfo> {
  return {
    status: 'not-downloaded',
    version: null,
    productCount: null,
    fileSizeBytes: null,
    downloadProgress: 0,
    error: null,
  };
}

export async function startDownload(
  _region: RegionCode,
  _onProgress: (progress: number) => void,
): Promise<void> {
  // no-op on web
}

export async function cancelDownload(_region: RegionCode): Promise<void> {
  // no-op on web
}

export async function deleteOfflineDb(_region: RegionCode): Promise<void> {
  // no-op on web
}

export async function deleteAllOfflineDbs(): Promise<void> {
  // no-op on web
}

export async function getOfflineProduct(_barcode: string): Promise<CachedProduct | null> {
  return null;
}
