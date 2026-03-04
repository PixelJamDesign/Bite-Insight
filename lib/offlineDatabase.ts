/**
 * offlineDatabase.ts
 *
 * Download manager and query layer for the offline UK food database.
 * Downloads a pre-built SQLite file from Supabase Storage containing
 * Open Food Facts UK products for fully offline barcode scanning.
 *
 * This is a SEPARATE database from the personal scan cache
 * (biteinsight_products.db). Users can delete the offline DB without
 * losing their scan history.
 *
 * Native-only — web stub at offlineDatabase.web.ts.
 */

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { CachedProduct } from '@/lib/productCache';

// ── Configuration ────────────────────────────────────────────────────────────
// Update these after uploading the built database to Supabase Storage.
const SUPABASE_STORAGE_BASE =
  'https://YOUR_PROJECT.supabase.co/storage/v1/object/public/offline-databases';
const MANIFEST_URL = `${SUPABASE_STORAGE_BASE}/manifest.json`;
const DB_DOWNLOAD_URL = `${SUPABASE_STORAGE_BASE}/offline_uk_products.db`;

// ── Paths ────────────────────────────────────────────────────────────────────
const DB_DIR = FileSystem.documentDirectory!;
const DB_FILENAME = 'offline_uk_products.db';
const DB_PATH = DB_DIR + DB_FILENAME;
const DB_TMP_PATH = DB_PATH + '.tmp';
const META_PATH = DB_DIR + 'offline_db_meta.json';

// ── Types ────────────────────────────────────────────────────────────────────
export type OfflineDbStatus = 'not-downloaded' | 'downloading' | 'ready' | 'error';

export type OfflineDbInfo = {
  status: OfflineDbStatus;
  version: string | null;
  productCount: number | null;
  fileSizeBytes: number | null;
  downloadProgress: number; // 0–1
  error: string | null;
};

export type OfflineDbRemoteInfo = {
  version: string;
  sizeBytes: number;
  url: string;
};

type LocalMeta = {
  version: string;
  productCount: number;
  fileSizeBytes: number;
  downloadedAt: string;
};

// ── Module state ─────────────────────────────────────────────────────────────
let _offlineDb: SQLite.SQLiteDatabase | null = null;
let _downloadResumable: FileSystem.DownloadResumable | null = null;
let _downloading = false;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function readLocalMeta(): Promise<LocalMeta | null> {
  try {
    const info = await FileSystem.getInfoAsync(META_PATH);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(META_PATH);
    return JSON.parse(raw) as LocalMeta;
  } catch {
    return null;
  }
}

async function writeLocalMeta(meta: LocalMeta): Promise<void> {
  await FileSystem.writeAsStringAsync(META_PATH, JSON.stringify(meta));
}

async function dbFileExists(): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(DB_PATH);
  return info.exists;
}

async function closeDb(): Promise<void> {
  if (_offlineDb) {
    try { await _offlineDb.closeAsync(); } catch { /* already closed */ }
    _offlineDb = null;
  }
}

async function openDb(): Promise<SQLite.SQLiteDatabase> {
  if (_offlineDb) return _offlineDb;
  _offlineDb = await SQLite.openDatabaseAsync(DB_FILENAME, undefined, DB_DIR);
  return _offlineDb;
}

/** Remove leftover .tmp files from interrupted downloads. */
async function cleanupTmpFiles(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(DB_TMP_PATH);
    if (info.exists) await FileSystem.deleteAsync(DB_TMP_PATH, { idempotent: true });
  } catch { /* ignore */ }
}

// Run cleanup on module load
cleanupTmpFiles();

// ── Public API ───────────────────────────────────────────────────────────────

/** Get the current state of the offline database on this device. */
export async function getOfflineDbInfo(): Promise<OfflineDbInfo> {
  const exists = await dbFileExists();
  if (!exists) {
    return {
      status: _downloading ? 'downloading' : 'not-downloaded',
      version: null,
      productCount: null,
      fileSizeBytes: null,
      downloadProgress: 0,
      error: null,
    };
  }

  const meta = await readLocalMeta();
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
 * Check whether a newer version of the offline DB is available.
 * Returns remote info if an update is available, or null if up-to-date
 * (or if the remote check fails).
 */
export async function checkForUpdate(): Promise<OfflineDbRemoteInfo | null> {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) return null;
    const manifest = (await res.json()) as { version: string; sizeBytes: number; filename: string };

    const local = await readLocalMeta();
    const remoteInfo: OfflineDbRemoteInfo = {
      version: manifest.version,
      sizeBytes: manifest.sizeBytes,
      url: `${SUPABASE_STORAGE_BASE}/${manifest.filename}`,
    };

    // If not downloaded or remote is newer, return remote info
    if (!local || manifest.version > local.version) {
      return remoteInfo;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Download the offline UK database.
 * @param onProgress Called with a value from 0–1 as the download progresses.
 */
export async function startDownload(onProgress: (progress: number) => void): Promise<void> {
  if (_downloading) return;
  _downloading = true;

  try {
    // Close any open handle to the old database
    await closeDb();

    // Clean up any leftover tmp file
    await cleanupTmpFiles();

    const callback: FileSystem.FileSystemNetworkTaskProgressCallback<FileSystem.DownloadProgressData> = (data) => {
      if (data.totalBytesExpectedToWrite > 0) {
        onProgress(data.totalBytesWritten / data.totalBytesExpectedToWrite);
      }
    };

    _downloadResumable = FileSystem.createDownloadResumable(
      DB_DOWNLOAD_URL,
      DB_TMP_PATH,
      {},
      callback,
    );

    const result = await _downloadResumable.downloadAsync();
    _downloadResumable = null;

    if (!result || !result.uri) {
      throw new Error('Download failed — no result returned');
    }

    // Atomic move: tmp → final path
    // Delete existing DB first if present
    const existing = await FileSystem.getInfoAsync(DB_PATH);
    if (existing.exists) {
      await FileSystem.deleteAsync(DB_PATH, { idempotent: true });
    }
    await FileSystem.moveAsync({ from: DB_TMP_PATH, to: DB_PATH });

    // Read metadata from the downloaded database
    const db = await openDb();
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
      // metadata table may not exist in older builds — use defaults
    }

    // Get file size
    const fileInfo = await FileSystem.getInfoAsync(DB_PATH);
    const fileSizeBytes = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size ?? 0) : 0;

    // Write local metadata
    await writeLocalMeta({
      version,
      productCount,
      fileSizeBytes,
      downloadedAt: new Date().toISOString(),
    });

    onProgress(1);
  } finally {
    _downloading = false;
  }
}

/** Cancel an in-progress download. */
export async function cancelDownload(): Promise<void> {
  if (_downloadResumable) {
    try { await _downloadResumable.pauseAsync(); } catch { /* ignore */ }
    _downloadResumable = null;
  }
  _downloading = false;
  await cleanupTmpFiles();
}

/** Delete the offline database and free up storage. */
export async function deleteOfflineDb(): Promise<void> {
  await closeDb();
  await FileSystem.deleteAsync(DB_PATH, { idempotent: true });
  await FileSystem.deleteAsync(META_PATH, { idempotent: true });
}

/**
 * Look up a product by barcode in the offline UK database.
 * Returns null if the database is not downloaded or the barcode is not found.
 */
export async function getOfflineProduct(barcode: string): Promise<CachedProduct | null> {
  const exists = await dbFileExists();
  if (!exists) return null;

  try {
    const db = await openDb();
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

    if (!row) return null;

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
  } catch {
    return null;
  }
}
