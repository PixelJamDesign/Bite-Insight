/**
 * productCache.web.ts
 *
 * Web stub for the product cache.
 * expo-sqlite is native-only, so on web the scanner always falls through
 * to the OFF API directly. Metro uses this file instead of productCache.ts
 * when bundling for web (platform-specific file convention).
 */

export type CachedProduct = {
  barcode: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutriscoreGrade: string | null;
  energyKcal: number | null;
  carbs: number | null;
  sugars: number | null;
  fiber: number | null;
  fat: number | null;
  saturatedFat: number | null;
  proteins: number | null;
  salt: number | null;
  ingredientsText: string | null;
  allergens: string | null;
  ingredientsJson: string | null;
  cachedAt: number;
};

export async function getCachedProduct(_barcode: string): Promise<CachedProduct | null> {
  return null;
}

export async function cacheProduct(_product: Omit<CachedProduct, 'cachedAt'>): Promise<void> {
  // no-op on web
}
