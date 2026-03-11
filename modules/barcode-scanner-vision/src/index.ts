import { requireNativeModule, Platform } from 'expo-modules-core';

interface BarcodeResult {
  value: string;
  format: string;
}

interface BarcodeScannerVisionModule {
  scanFromImage: (uri: string) => Promise<BarcodeResult[]>;
}

/**
 * iOS-only barcode scanner using Apple Vision (VNDetectBarcodesRequest).
 * Supports ALL barcode types from static images (EAN-13, UPC, Code 128, etc.).
 * Returns null on non-iOS platforms.
 */
let module: BarcodeScannerVisionModule | null = null;

if (Platform.OS === 'ios') {
  try {
    module = requireNativeModule<BarcodeScannerVisionModule>('BarcodeScannerVision');
  } catch {
    // Module not available (e.g. Expo Go without dev build)
  }
}

export async function scanFromImage(uri: string): Promise<BarcodeResult[]> {
  if (!module) return [];
  return module.scanFromImage(uri);
}

export function isAvailable(): boolean {
  return module !== null;
}
