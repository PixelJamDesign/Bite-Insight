/**
 * offlineDatabase.ts
 *
 * Multi-region download manager and query layer for offline food databases.
 * Downloads pre-built SQLite files from GitHub Releases containing
 * Open Food Facts products for fully offline barcode scanning.
 *
 * Each region (gb, us, fr, de, es, it) is a separate SQLite file.
 * Users can download any combination of regions.
 *
 * Native-only — web stub at offlineDatabase.web.ts.
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { CachedProduct } from '@/lib/productCache';

// ── Types ────────────────────────────────────────────────────────────────────
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
  downloadProgress: number; // 0–1
  error: string | null;
};

type LocalMeta = {
  version: string;
  productCount: number;
  fileSizeBytes: number;
  downloadedAt: string;
};

type LocalMetaMap = Record<string, LocalMeta>;

// ── Configuration ────────────────────────────────────────────────────────────
// Hosted on GitHub Releases — "latest" URL auto-redirects to the newest release.
const GITHUB_RELEASE_BASE =
  'https://github.com/PixelJamDesign/Bite-Insight/releases/latest/download';
const MANIFEST_URL = `${GITHUB_RELEASE_BASE}/manifest.json`;

// ── Paths ────────────────────────────────────────────────────────────────────
const DB_DIR = FileSystem.documentDirectory!;
const META_PATH = DB_DIR + 'offline_db_meta.json';

function dbFilename(region: RegionCode): string {
  return `offline_${region}_products.db`;
}
function dbPath(region: RegionCode): string {
  return DB_DIR + dbFilename(region);
}
function dbTmpPath(region: RegionCode): string {
  return dbPath(region) + '.tmp';
}

// Legacy path (pre-multi-region)
const LEGACY_DB_PATH = DB_DIR + 'offline_uk_products.db';
const LEGACY_META_PATH = DB_DIR + 'offline_db_meta.json';

// ── Module state ─────────────────────────────────────────────────────────────
const _offlineDbs = new Map<RegionCode, SQLite.SQLiteDatabase>();
const _downloadResumables = new Map<RegionCode, FileSystem.DownloadResumable>();
const _downloading = new Set<RegionCode>();

// ── Internal helpers ─────────────────────────────────────────────────────────

async function readMetaMap(): Promise<LocalMetaMap> {
  try {
    const info = await FileSystem.getInfoAsync(META_PATH);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(META_PATH);
    const parsed = JSON.parse(raw);
    // Backward compatibility: old flat format → migrate to keyed
    if (parsed && typeof parsed === 'object' && 'version' in parsed && !('gb' in parsed) && !('us' in parsed)) {
      // Old flat meta — wrap it under 'gb' key
      const migrated: LocalMetaMap = { gb: parsed as LocalMeta };
      await writeMetaMap(migrated);
      return migrated;
    }
    return parsed as LocalMetaMap;
  } catch {
    return {};
  }
}

async function writeMetaMap(map: LocalMetaMap): Promise<void> {
  await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(map));
}

async function dbFileExists(region: RegionCode): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(dbPath(region));
  return info.exists;
}

async function closeDb(region: RegionCode): Promise<void> {
  const db = _offlineDbs.get(region);
  if (db) {
    try { await db.closeAsync(); } catch { /* already closed */ }
    _offlineDbs.delete(region);
  }
}

async function openDb(region: RegionCode): Promise<SQLite.SQLiteDatabase> {
  const existing = _offlineDbs.get(region);
  if (existing) return existing;
  const db = await SQLite.openDatabaseAsync(dbFilename(region), undefined, DB_DIR);
  _offlineDbs.set(region, db);
  return db;
}

async function cleanupTmpFile(region: RegionCode): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(dbTmpPath(region));
    if (info.exists) await FileSystem.deleteAsync(dbTmpPath(region), { idempotent: true });
  } catch { /* ignore */ }
}

/** Migrate old offline_uk_products.db → offline_gb_products.db */
async function migrateFromLegacy(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(LEGACY_DB_PATH);
    if (!info.exists) return;

    // Check if new gb file already exists
    const gbInfo = await FileSystem.getInfoAsync(dbPath('gb'));
    if (gbInfo.exists) {
      // Both exist — just delete the legacy one
      await FileSystem.deleteAsync(LEGACY_DB_PATH, { idempotent: true });
      return;
    }

    // Rename legacy → gb
    await FileSystem.moveAsync({ from: LEGACY_DB_PATH, to: dbPath('gb') });
    console.log('[offlineDb] Migrated offline_uk_products.db → offline_gb_products.db');
  } catch {
    // Migration failed silently — not critical
  }
}

/** Detect user's region code from device locale. */
function getUserRegionCode(): RegionCode | null {
  try {
    const locale = Platform.OS === 'web' ? 'en-GB' :
      (Intl.DateTimeFormat().resolvedOptions().locale || 'en-GB');
    const countryMatch = locale.match(/-([A-Z]{2})$/i);
    if (countryMatch) {
      const code = countryMatch[1].toLowerCase() as RegionCode;
      if (ALL_REGIONS.includes(code)) return code;
    }
  } catch { /* ignore */ }
  return 'gb'; // Default to GB
}

// ── Initialization ───────────────────────────────────────────────────────────
// Run migration + cleanup on module load
migrateFromLegacy();
for (const region of ALL_REGIONS) {
  cleanupTmpFile(region);
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Fetch the global manifest listing all available regions + sizes. */
export async function fetchGlobalManifest(): Promise<GlobalManifest | null> {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return null;
    return (await res.json()) as GlobalManifest;
  } catch {
    return null;
  }
}

/** Get region codes that have been downloaded to this device. */
export async function getDownloadedRegions(): Promise<RegionCode[]> {
  const downloaded: RegionCode[] = [];
  for (const region of ALL_REGIONS) {
    if (await dbFileExists(region)) {
      downloaded.push(region);
    }
  }
  return downloaded;
}

/** Get the status/info for a specific region. */
export async function getRegionInfo(region: RegionCode): Promise<RegionDbInfo> {
  const exists = await dbFileExists(region);
  if (!exists) {
    return {
      status: _downloading.has(region) ? 'downloading' : 'not-downloaded',
      version: null,
      productCount: null,
      fileSizeBytes: null,
      downloadProgress: 0,
      error: null,
    };
  }

  const metaMap = await readMetaMap();
  const meta = metaMap[region] ?? null;
  return {
    status: 'ready',
    version: meta?.version ?? null,
    productCount: meta?.productCount ?? null,
    fileSizeBytes: meta?.fileSizeBytes ?? null,
    downloadProgress: 1,
    error: null,
  };
}

/**
 * Download a specific region's offline database.
 * @param region  Region code to download.
 * @param onProgress Called with a value from 0–1 as the download progresses.
 */
export async function startDownload(
  region: RegionCode,
  onProgress: (progress: number) => void,
): Promise<void> {
  if (_downloading.has(region)) return;
  _downloading.add(region);

  try {
    await closeDb(region);
    await cleanupTmpFile(region);

    const downloadUrl = `${GITHUB_RELEASE_BASE}/offline_${region}_products.db`;

    const callback: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData> = (data) => {
      if (data.totalBytesExpectedToWrite > 0) {
        onProgress(data.totalBytesWritten / data.totalBytesExpectedToWrite);
      }
    };

    const resumable = FileSystem.createDownloadResumable(
      downloadUrl,
      dbTmpPath(region),
      {},
      callback,
    );
    _downloadResumables.set(region, resumable);

    const result = await resumable.downloadAsync();
    _downloadResumables.delete(region);

    if (!result || !result.uri) {
      throw new Error('Download failed — no result returned');
    }

    // Atomic move: tmp → final path
    const existing = await FileSystem.getInfoAsync(dbPath(region));
    if (existing.exists) {
      await FileSystem.deleteAsync(dbPath(region), { idempotent: true });
    }
    await FileSystem.moveAsync({ from: dbTmpPath(region), to: dbPath(region) });

    // Read metadata from the downloaded database
    const db = await openDb(region);
    let version = new Date().toISOString().slice(0, 10);
    let productCount = 0;

    try {
      const versionRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM metadata WHERE key = 'version'",
      );
      if (versionRow) version = versionRow.value;

      const countRow = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM metadata WHERE key = 'product_count'",
      );
      if (countRow) productCount = parseInt(countRow.value, 10) || 0;
    } catch {
      // metadata table may not exist in older builds
    }

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(dbPath(region));
    const fileSizeBytes = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size ?? 0) : 0;

    // Update metadata map
    const metaMap = await readMetaMap();
    metaMap[region] = {
      version,
      productCount,
      fileSizeBytes,
      downloadedAt: new Date().toISOString(),
    };
    await writeMetaMap(metaMap);

    onProgress(1);
  } finally {
    _downloading.delete(region);
  }
}

/** Cancel an in-progress download for a specific region. */
export async function cancelDownload(region: RegionCode): Promise<void> {
  const resumable = _downloadResumables.get(region);
  if (resumable) {
    try { await resumable.pauseAsync(); } catch { /* ignore */ }
    _downloadResumables.delete(region);
  }
  _downloading.delete(region);
  await cleanupTmpFile(region);
}

/** Delete a specific region's offline database. */
export async function deleteOfflineDb(region: RegionCode): Promise<void> {
  await closeDb(region);
  await FileSystem.deleteAsync(dbPath(region), { idempotent: true });

  // Remove from metadata map
  const metaMap = await readMetaMap();
  delete metaMap[region];
  await writeMetaMap(metaMap);
}

/** Delete all offline databases. */
export async function deleteAllOfflineDbs(): Promise<void> {
  for (const region of ALL_REGIONS) {
    await closeDb(region);
    await FileSystem.deleteAsync(dbPath(region), { idempotent: true });
  }
  await FileSystem.deleteAsync(META_PATH, { idempotent: true });
}

/**
 * Look up a product by barcode across ALL downloaded offline databases.
 * Searches the user's locale-matching region first for best hit probability.
 * Returns null if no databases are downloaded or the barcode is not found.
 */
export async function getOfflineProduct(barcode: string): Promise<CachedProduct | null> {
  const downloaded = await getDownloadedRegions();
  if (downloaded.length === 0) return null;

  // Search user's locale region first for best hit rate
  const userRegion = getUserRegionCode();
  const ordered = [
    ...downloaded.filter((r) => r === userRegion),
    ...downloaded.filter((r) => r !== userRegion),
  ];

  for (const region of ordered) {
    try {
      const db = await openDb(region);
      const row = await db.getFirstAsync<{
        barcode: string;
        product_name: string;
        brand: string | null;
        image_url: string | null;
        quantity: string | null;
        nutriscore_grade: string | null;
        energy_kcal: number | null;
        carbs: number | null;
        sugars: number | null;
        fiber: number | null;
        fat: number | null;
        saturated_fat: number | null;
        proteins: number | null;
        salt: number | null;
        serving_size: string | null;
        energy_kcal_serving: number | null;
        carbs_serving: number | null;
        sugars_serving: number | null;
        fiber_serving: number | null;
        fat_serving: number | null;
        saturated_fat_serving: number | null;
        proteins_serving: number | null;
        salt_serving: number | null;
        ingredients_text: string | null;
        allergens: string | null;
        ingredients_json: string | null;
        off_lang: string | null;
      }>('SELECT * FROM products WHERE barcode = ?', [barcode]);

      if (row) {
        return {
          barcode: row.barcode,
          productName: row.product_name,
          brand: row.brand,
          imageUrl: row.image_url,
          quantity: row.quantity,
          nutriscoreGrade: row.nutriscore_grade,
          energyKcal: row.energy_kcal,
          carbs: row.carbs,
          sugars: row.sugars,
          fiber: row.fiber,
          fat: row.fat,
          saturatedFat: row.saturated_fat,
          proteins: row.proteins,
          salt: row.salt,
          servingSize: row.serving_size,
          energyKcalServing: row.energy_kcal_serving,
          carbsServing: row.carbs_serving,
          sugarsServing: row.sugars_serving,
          fiberServing: row.fiber_serving,
          fatServing: row.fat_serving,
          saturatedFatServing: row.saturated_fat_serving,
          proteinsServing: row.proteins_serving,
          saltServing: row.salt_serving,
          ingredientsText: row.ingredients_text,
          allergens: row.allergens,
          ingredientsJson: row.ingredients_json,
          offLang: row.off_lang,
          cachedAt: 0, // sentinel — not from personal cache
        };
      }
    } catch {
      // Skip this region's DB if there's an error
      continue;
    }
  }
  return null;
}
