/**
 * offlineDatabase.web.ts
 *
 * Web stub for the offline database module.
 * expo-sqlite and expo-file-system download features are native-only,
 * so on web the offline database is unavailable.
 * Metro uses this file instead of offlineDatabase.ts when bundling for web.
 */

import { CachedProduct } from '@/lib/productCache';

export type OfflineDbStatus = 'not-downloaded' | 'downloading' | 'ready' | 'error';

export type OfflineDbInfo = {
  status: OfflineDbStatus;
  version: string | null;
  productCount: number | null;
  fileSizeBytes: number | null;
  downloadProgress: number;
  error: string | null;
};

export type OfflineDbRemoteInfo = {
  version: string;
  sizeBytes: number;
  url: string;
};

export async function getOfflineDbInfo(): Promise<OfflineDbInfo> {
  return {
    status: 'not-downloaded',
    version: null,
    productCount: null,
    fileSizeBytes: null,
    downloadProgress: 0,
    error: null,
  };
}

export async function checkForUpdate(): Promise<OfflineDbRemoteInfo | null> {
  return null;
}

export async function startDownload(_onProgress: (progress: number) => void): Promise<void> {
  // no-op on web
}

export async function cancelDownload(): Promise<void> {
  // no-op on web
}

export async function deleteOfflineDb(): Promise<void> {
  // no-op on web
}

export async function getOfflineProduct(_barcode: string): Promise<CachedProduct | null> {
  return null;
}
