import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const CACHE_DIR = `${FileSystem.cacheDirectory}avatars/`;

/**
 * Generates a safe filename from a URL by hashing it.
 * Uses the last path segment + a simple hash to keep it short and unique.
 */
function getCacheKey(url: string): string {
  // Simple hash — good enough for cache filenames
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(hash).toString(16);
  // Preserve file extension
  const ext = url.match(/\.(jpe?g|png|gif|webp)/i)?.[0] ?? '.jpeg';
  return `${hex}${ext}`;
}

/** Ensure the avatars cache directory exists. */
async function ensureCacheDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

/**
 * Returns a local file URI for the given remote avatar URL.
 * - If the image is already cached locally, returns the local path instantly.
 * - If not, downloads it to the cache directory first.
 * - On web, returns the remote URL as-is (no filesystem access).
 */
export async function getCachedAvatar(remoteUrl: string): Promise<string> {
  if (Platform.OS === 'web') return remoteUrl;

  await ensureCacheDir();

  const fileName = getCacheKey(remoteUrl);
  const localUri = `${CACHE_DIR}${fileName}`;

  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) return localUri;

  // Download and cache
  const { uri } = await FileSystem.downloadAsync(remoteUrl, localUri);
  return uri;
}

/**
 * Removes any locally cached version of the given remote URL.
 * Call this after uploading a new avatar to force a fresh download.
 */
export async function invalidateCachedAvatar(remoteUrl: string): Promise<void> {
  if (Platform.OS === 'web') return;

  const fileName = getCacheKey(remoteUrl);
  const localUri = `${CACHE_DIR}${fileName}`;

  const info = await FileSystem.getInfoAsync(localUri);
  if (info.exists) {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
  }
}

/**
 * Clears the entire avatar cache. Useful for logout or storage management.
 */
export async function clearAvatarCache(): Promise<void> {
  if (Platform.OS === 'web') return;

  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  }
}
