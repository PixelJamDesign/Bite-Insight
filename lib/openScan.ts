/**
 * openScanResult — opens a saved scan on the scan result screen, filling
 * in nutrition from the local product cache when it has the product (so
 * the screen doesn't need to ask Open Food Facts again).
 *
 * Shared by the scan history list and the dashboard's Scanned items.
 */
import { router } from 'expo-router';
import { getCachedProduct } from './productCache';
import type { Scan } from './types';

export async function openScanResult(scan: Scan): Promise<void> {
  const cached = await getCachedProduct(scan.barcode);
  router.push({
    pathname: '/scan-result',
    params: {
      scanId: scan.id,
      productName: scan.product_name,
      brand: scan.brand ?? '',
      imageUrl: scan.image_url ?? '',
      barcode: scan.barcode,
      nutriscoreGrade: scan.nutriscore_grade ?? cached?.nutriscoreGrade ?? '',
      ...(cached
        ? {
            quantity: cached.quantity ?? '',
            energyKcal: cached.energyKcal != null ? String(cached.energyKcal) : '',
            carbs: cached.carbs != null ? String(cached.carbs) : '',
            sugars: cached.sugars != null ? String(cached.sugars) : '',
            fiber: cached.fiber != null ? String(cached.fiber) : '',
            fat: cached.fat != null ? String(cached.fat) : '',
            saturatedFat: cached.saturatedFat != null ? String(cached.saturatedFat) : '',
            proteins: cached.proteins != null ? String(cached.proteins) : '',
            salt: cached.salt != null ? String(cached.salt) : '',
            servingSize: cached.servingSize ?? '',
            energyKcalServing: cached.energyKcalServing != null ? String(cached.energyKcalServing) : '',
            carbsServing: cached.carbsServing != null ? String(cached.carbsServing) : '',
            sugarsServing: cached.sugarsServing != null ? String(cached.sugarsServing) : '',
            fiberServing: cached.fiberServing != null ? String(cached.fiberServing) : '',
            fatServing: cached.fatServing != null ? String(cached.fatServing) : '',
            saturatedFatServing: cached.saturatedFatServing != null ? String(cached.saturatedFatServing) : '',
            proteinsServing: cached.proteinsServing != null ? String(cached.proteinsServing) : '',
            saltServing: cached.saltServing != null ? String(cached.saltServing) : '',
            ingredientsText: cached.ingredientsText ?? '',
            ingredientsJson: cached.ingredientsJson ?? '',
            offLang: cached.offLang ?? 'en',
          }
        : {}),
    },
  });
}
