import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

// ─── Add your Supabase credentials here ───────────────────────────────────────
// Get these from: https://supabase.com/dashboard → your project → Settings → API
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured =
  SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Storage adapter for Supabase auth tokens.
 * - Native (iOS/Android): expo-secure-store (hardware-backed keychain/keystore)
 * - Web: localStorage (no native keychain; data stays in browser storage)
 */
const webStorageAdapter = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  },
  removeItem: (key: string): void => {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  },
};

/**
 * Native storage adapter with fallback.
 * Primary: expo-secure-store (hardware-backed keychain/keystore)
 * Fallback: AsyncStorage (if SecureStore fails — e.g. some Android devices
 *   with restrictive SELinux policies or missing keystore providers)
 */
const nativeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.warn('[supabase] SecureStore.getItem failed, falling back to AsyncStorage:', e);
      try { return await AsyncStorage.getItem(key); } catch { return null; }
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.warn('[supabase] SecureStore.setItem failed, falling back to AsyncStorage:', e);
      try { await AsyncStorage.setItem(key, value); } catch { /* ignore */ }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.warn('[supabase] SecureStore.removeItem failed, falling back to AsyncStorage:', e);
      try { await AsyncStorage.removeItem(key); } catch { /* ignore */ }
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: Platform.OS === 'web' ? webStorageAdapter : nativeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // web can receive tokens in URL hash
  },
});

const AVATAR_BUCKET = 'make-2527d42e-avatars';
const INGREDIENT_BUCKET = 'ingredients';
const RECIPE_COVER_BUCKET = 'recipe-covers';

/**
 * Resolves an avatar_url from the profiles table to a full public URL.
 * Handles both already-full URLs and relative storage paths.
 */
export function getAvatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('https://')) return path;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Resolves an ingredient image_url to a properly-encoded public URL.
 * Passing the path through getPublicUrl() ensures special characters
 * (spaces, &, etc.) are correctly percent-encoded for React Native's
 * Image component, regardless of how they were stored in the DB.
 * Handles both already-full URLs and relative storage paths.
 */
export function getIngredientImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('https://') || path.startsWith('http://')) {
    // Re-encode via the SDK to fix any unencoded special characters in the path
    const relativePath = path.split(`/object/public/${INGREDIENT_BUCKET}/`)[1];
    if (!relativePath) return path;
    return supabase.storage.from(INGREDIENT_BUCKET).getPublicUrl(
      decodeURIComponent(relativePath),
    ).data.publicUrl;
  }
  return supabase.storage.from(INGREDIENT_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Uploads a local image URI to the avatar bucket and updates profiles.avatar_url.
 * Returns the new public URL, or null on failure.
 */
export async function uploadAvatar(userId: string, localUri: string, skipProfileUpdate = false): Promise<string | null> {
  const fileName = `${userId}-${Date.now()}.jpeg`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(fileName, decode(base64), { contentType: 'image/jpeg', upsert: true });

  if (error) {
    console.error('Avatar upload failed:', error.message);
    return null;
  }

  const publicUrl = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(fileName).data.publicUrl;

  if (!skipProfileUpdate) {
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
  }

  return publicUrl;
}

/**
 * Uploads a recipe cover image to the recipe-covers bucket.
 * File path format: `{userId}/{timestamp}.jpeg` — the leading user-id folder
 * is required by the bucket's RLS policies (see 20260421 migration).
 * Returns the public URL, or null on failure.
 */
export async function uploadRecipeCover(
  userId: string,
  localUri: string,
): Promise<string | null> {
  const fileName = `${userId}/${Date.now()}.jpeg`;

  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });

  const { error } = await supabase.storage
    .from(RECIPE_COVER_BUCKET)
    .upload(fileName, decode(base64), { contentType: 'image/jpeg', upsert: true });

  if (error) {
    console.warn('[recipe-cover] upload failed:', error.message);
    return null;
  }

  return supabase.storage.from(RECIPE_COVER_BUCKET).getPublicUrl(fileName).data.publicUrl;
}
