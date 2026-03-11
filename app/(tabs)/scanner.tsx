import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, Platform, Dimensions, Image } from 'react-native';
import { CameraView, Camera, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as VisionScanner from '@/modules/barcode-scanner-vision/src';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useRegion, REGIONS, FLAG_IMAGES, getOFFBaseUrl, PlusTag } from '@/lib/regionContext';
import type { Region } from '@/lib/regionContext';
import { Colors, Spacing, Shadows } from '@/constants/theme';
import { ActionSearchIcon, ActionGalleryIcon, ActionChevronDownIcon, ActionCheckIcon } from '@/components/MenuIcons';
import { getCachedProduct, cacheProduct } from '@/lib/productCache';
import { getOfflineProduct } from '@/lib/offlineDatabase';
import { WebBarcodeScanner } from '@/components/WebBarcodeScanner';

export default function ScannerScreen() {
  const { t } = useTranslation('scanner');
  const { t: tc } = useTranslation('common');
  const { t: tScan } = useTranslation('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { selectedRegion, setSelectedRegion } = useRegion();
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const router = useRouter();
  const { session } = useAuth();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  const insets = useSafeAreaInsets();
  const lastScan = useRef<string | null>(null);

  // Bottom offset to position action bar above the tab bar
  // Tab bar: paddingTop(32) + pill(60) + paddingBottom(insets.bottom+8) + gap(8)
  const actionBarBottom = insets.bottom + 8 + 60 + 32 + 8;

  /** Open photo library and scan a barcode from the selected image.
   *  iOS: Apple Vision (VNDetectBarcodesRequest) — all barcode types.
   *  Android: expo-camera scanFromURLAsync — all barcode types.
   *  Fallback: expo-camera scanFromURLAsync (QR-only on iOS). */
  async function handleGalleryScan() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled || !result.assets?.length) return;

      const uri = result.assets[0].uri;

      // Try Apple Vision first (iOS only — supports ALL barcode types from images)
      if (VisionScanner.isAvailable()) {
        const barcodes = await VisionScanner.scanFromImage(uri);
        if (barcodes && barcodes.length > 0) {
          const firstBarcode = barcodes[0];
          handleBarcodeScan({
            data: firstBarcode.value ?? '',
            type: firstBarcode.format ?? 'unknown',
            cornerPoints: [],
            bounds: { origin: { x: 0, y: 0 }, size: { width: 0, height: 0 } },
          } as BarcodeScanningResult);
          return;
        }
      } else {
        // Android + fallback: expo-camera scanFromURLAsync (all types on Android)
        const barcodes = await Camera.scanFromURLAsync(uri, [
          'ean13', 'ean8', 'upc_a', 'upc_e',
          'code128', 'code39', 'qr',
        ]);
        if (barcodes.length > 0) {
          handleBarcodeScan(barcodes[0] as BarcodeScanningResult);
          return;
        }
      }

      // No barcode found by either method
      Alert.alert(
        t('gallery.title'),
        t('gallery.noBarcode'),
        [{ text: tc('buttons.ok') }],
      );
    } catch {
      Alert.alert(
        t('gallery.title'),
        t('gallery.scanError'),
        [{ text: tc('buttons.ok') }],
      );
    }
  }

  /** Handle region selection — gate premium regions behind Plus (UK always free) */
  function handleRegionSelect(region: Region) {
    if (region.code !== 'gb' && !isPlus) {
      // Non-UK regions require Plus subscription
      setRegionPickerVisible(false);
      showUpsell();
      return;
    }
    setSelectedRegion(region);
    setRegionPickerVisible(false);
  }

  // Reset scanner state every time the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      setScanning(true);
      setProcessing(false);
      lastScan.current = null;
    }, []),
  );

  async function handleBarcodeScan(result: BarcodeScanningResult) {
    // Debounce — ignore repeated scans of the same code
    if (!scanning || processing || result.data === lastScan.current) return;
    lastScan.current = result.data;
    setScanning(false);
    setProcessing(true);

    try {
      // Fire profile upsert immediately — doesn't depend on product data
      const profilePromise = supabase
        .from('profiles')
        .upsert({ id: session?.user.id }, { onConflict: 'id', ignoreDuplicates: true });

      let productName = tScan('product.unknownName');
      let brand: string | null = null;
      let imageUrl: string | null = null;
      let quantity: string | null = null;
      let nutriscoreGrade: string | null = null;
      let energyKcal: number | null = null;
      let carbs: number | null = null;
      let sugars: number | null = null;
      let fiber: number | null = null;
      let fat: number | null = null;
      let saturatedFat: number | null = null;
      let proteins: number | null = null;
      let salt: number | null = null;
      let servingSize: string | null = null;
      let energyKcalServing: number | null = null;
      let carbsServing: number | null = null;
      let sugarsServing: number | null = null;
      let fiberServing: number | null = null;
      let fatServing: number | null = null;
      let saturatedFatServing: number | null = null;
      let proteinsServing: number | null = null;
      let saltServing: number | null = null;
      let ingredientsText: string | null = null;
      let allergens: string[] = [];
      let categoriesTags: string[] = [];
      let ingredientsJson: string | null = null;
      let offLang: string | null = null;

      // ── Tier 1: local SQLite cache ──────────────────────────────────────────
      const cached = await getCachedProduct(result.data);
      if (cached) {
        productName     = cached.productName;
        brand           = cached.brand;
        imageUrl        = cached.imageUrl;
        quantity        = cached.quantity;
        nutriscoreGrade = cached.nutriscoreGrade;
        energyKcal      = cached.energyKcal;
        carbs           = cached.carbs;
        sugars          = cached.sugars;
        fiber           = cached.fiber;
        fat             = cached.fat;
        saturatedFat    = cached.saturatedFat;
        proteins        = cached.proteins;
        salt            = cached.salt;
        servingSize         = cached.servingSize;
        energyKcalServing   = cached.energyKcalServing;
        carbsServing        = cached.carbsServing;
        sugarsServing       = cached.sugarsServing;
        fiberServing        = cached.fiberServing;
        fatServing          = cached.fatServing;
        saturatedFatServing = cached.saturatedFatServing;
        proteinsServing     = cached.proteinsServing;
        saltServing         = cached.saltServing;
        ingredientsText = cached.ingredientsText;
        allergens       = cached.allergens ? cached.allergens.split(',').filter(Boolean) : [];
        ingredientsJson = cached.ingredientsJson ?? null;
        offLang         = cached.offLang ?? null;
      } else {
        // ── Tier 2: Offline UK database (if downloaded) ─────────────────────
        const offlineResult = await getOfflineProduct(result.data);
        if (offlineResult) {
          productName     = offlineResult.productName;
          brand           = offlineResult.brand;
          imageUrl        = offlineResult.imageUrl;
          quantity        = offlineResult.quantity;
          nutriscoreGrade = offlineResult.nutriscoreGrade;
          energyKcal      = offlineResult.energyKcal;
          carbs           = offlineResult.carbs;
          sugars          = offlineResult.sugars;
          fiber           = offlineResult.fiber;
          fat             = offlineResult.fat;
          saturatedFat    = offlineResult.saturatedFat;
          proteins        = offlineResult.proteins;
          salt            = offlineResult.salt;
          servingSize         = offlineResult.servingSize;
          energyKcalServing   = offlineResult.energyKcalServing;
          carbsServing        = offlineResult.carbsServing;
          sugarsServing       = offlineResult.sugarsServing;
          fiberServing        = offlineResult.fiberServing;
          fatServing          = offlineResult.fatServing;
          saturatedFatServing = offlineResult.saturatedFatServing;
          proteinsServing     = offlineResult.proteinsServing;
          saltServing         = offlineResult.saltServing;
          ingredientsText = offlineResult.ingredientsText;
          allergens       = offlineResult.allergens ? offlineResult.allergens.split(',').filter(Boolean) : [];
          ingredientsJson = offlineResult.ingredientsJson ?? null;
          offLang         = offlineResult.offLang ?? null;
        }

        // ── Tier 3: Open Food Facts API ─────────────────────────────────────
        if (!offlineResult) {
        const offBaseUrl = getOFFBaseUrl(selectedRegion);
        try {
          const offRes = await fetch(
            `${offBaseUrl}/api/v0/product/${result.data}.json`,
            { headers: { 'User-Agent': 'BiteInsight/1.0 (mobile app)' } },
          );
          if (offRes.ok) {
            const offData = await offRes.json();
            if (offData.status === 1 && offData.product) {
              const op = offData.product;
              productName =
                op.product_name ||
                op.product_name_en ||
                op.abbreviated_product_name ||
                op.generic_name ||
                tScan('product.unknownName');
              brand           = op.brands || null;
              imageUrl        = op.image_front_url || op.image_url || null;
              quantity        = op.quantity || op.product_quantity || null;
              nutriscoreGrade = op.nutriscore_grade || op.nutrition_grade_fr || null;
              const hasEnglishText = !!op.ingredients_text_en;
              ingredientsText = op.ingredients_text_en || op.ingredients_text || null;
              allergens       = op.allergens_tags ?? [];
              ingredientsJson = op.ingredients ? JSON.stringify(op.ingredients) : null;
              categoriesTags  = op.categories_tags ?? [];
              offLang         = hasEnglishText ? 'en' : (op.lang || op.lc || 'en');
              const n = op.nutriments ?? {};
              energyKcal   = n['energy-kcal_100g'] ?? null;
              carbs        = n.carbohydrates_100g ?? null;
              sugars       = n.sugars_100g ?? null;
              fiber        = n.fiber_100g ?? null;
              fat          = n.fat_100g ?? null;
              saturatedFat = n['saturated-fat_100g'] ?? null;
              proteins     = n.proteins_100g ?? null;
              salt         = n.salt_100g ?? null;
              servingSize         = op.serving_size ?? null;
              energyKcalServing   = n['energy-kcal_serving'] ?? null;
              carbsServing        = n.carbohydrates_serving ?? null;
              sugarsServing       = n.sugars_serving ?? null;
              fiberServing        = n.fiber_serving ?? null;
              fatServing          = n.fat_serving ?? null;
              saturatedFatServing = n['saturated-fat_serving'] ?? null;
              proteinsServing     = n.proteins_serving ?? null;
              saltServing         = n.salt_serving ?? null;
            }
          }
        } catch {
          // Network unavailable — continue with empty product data
        }
        } // end if (!offlineResult)

        // Save to local cache for future offline use (fire-and-forget)
        cacheProduct({
          barcode:        result.data,
          productName,
          brand,
          imageUrl,
          quantity,
          nutriscoreGrade,
          energyKcal,
          carbs,
          sugars,
          fiber,
          fat,
          saturatedFat,
          proteins,
          salt,
          servingSize,
          energyKcalServing,
          carbsServing,
          sugarsServing,
          fiberServing,
          fatServing,
          saturatedFatServing,
          proteinsServing,
          saltServing,
          ingredientsText,
          allergens: allergens.join(',') || null,
          ingredientsJson,
          offLang,
        }).catch(() => {/* non-critical — ignore cache write failures */});
      }

      // ── Navigate immediately — don't block on Supabase ────────────────────
      setProcessing(false);
      router.push({
        pathname: '/scan-result',
        params: {
          scanId: '',
          productName,
          brand: brand ?? '',
          imageUrl: imageUrl ?? '',
          barcode: result.data,
          quantity: quantity ?? '',
          nutriscoreGrade: nutriscoreGrade ?? '',
          energyKcal: energyKcal != null ? String(energyKcal) : '',
          carbs: carbs != null ? String(carbs) : '',
          sugars: sugars != null ? String(sugars) : '',
          fiber: fiber != null ? String(fiber) : '',
          fat: fat != null ? String(fat) : '',
          saturatedFat: saturatedFat != null ? String(saturatedFat) : '',
          proteins: proteins != null ? String(proteins) : '',
          salt: salt != null ? String(salt) : '',
          servingSize: servingSize ?? '',
          energyKcalServing: energyKcalServing != null ? String(energyKcalServing) : '',
          carbsServing: carbsServing != null ? String(carbsServing) : '',
          sugarsServing: sugarsServing != null ? String(sugarsServing) : '',
          fiberServing: fiberServing != null ? String(fiberServing) : '',
          fatServing: fatServing != null ? String(fatServing) : '',
          saturatedFatServing: saturatedFatServing != null ? String(saturatedFatServing) : '',
          proteinsServing: proteinsServing != null ? String(proteinsServing) : '',
          saltServing: saltServing != null ? String(saltServing) : '',
          ingredientsText: ingredientsText ?? '',
          allergens: allergens.join(','),
          categoriesTags: categoriesTags.join(','),
          ingredientsJson: ingredientsJson ?? '',
          offLang: offLang ?? 'en',
        },
      });

      // ── Save scan to Supabase in background ─────────────────────────────────
      (async () => {
        // Wait for profile upsert + check existing scan in parallel
        const [, { data: existing }] = await Promise.all([
          profilePromise,
          supabase
            .from('scans')
            .select('id')
            .eq('user_id', session?.user.id)
            .eq('barcode', result.data)
            .limit(1)
            .single(),
        ]);

        if (existing) {
          await supabase
            .from('scans')
            .update({
              scanned_at: new Date().toISOString(),
              product_name: productName,
              brand,
              image_url: imageUrl,
              nutriscore_grade: nutriscoreGrade,
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('scans')
            .insert({
              user_id: session?.user.id,
              barcode: result.data,
              product_name: productName,
              brand,
              image_url: imageUrl,
              nutriscore_grade: nutriscoreGrade,
              flagged_count: 0,
            });
        }
      })().catch((err) => console.error('Background scan save failed:', err));
    } catch (err) {
      console.error('Scan error:', err);
      setProcessing(false);
      Alert.alert(
        t('alert.scanFailedTitle'),
        t('alert.scanFailedMessage'),
        [{ text: tc('buttons.ok'), onPress: () => { setScanning(true); lastScan.current = null; } }],
      );
    }
  }

  // ── Shared: Region picker panel content ──────────────────────────────────────
  function renderRegionPanel() {
    return (
      <View style={styles.regionPanel}>
        <Text style={styles.regionPanelTitle}>{t('regionPicker.title')}</Text>

        {/* Selected region — always the first item */}
        <View style={styles.regionPanelContent}>
          <TouchableOpacity
            style={styles.regionRow}
            activeOpacity={0.7}
            onPress={() => handleRegionSelect(selectedRegion)}
          >
            <Image source={FLAG_IMAGES[selectedRegion.code]} style={styles.flagImage} resizeMode="contain" />
            <Text style={styles.regionRowLabel}>{selectedRegion.label}</Text>
            <ActionCheckIcon color={Colors.accent} size={20} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.regionDivider} />

          {/* Other regions */}
          <View style={styles.regionOthersList}>
            {REGIONS.filter((r) => r.code !== selectedRegion.code).map((region) => {
              const isFree = region.code === 'gb';
              return (
                <TouchableOpacity
                  key={region.code}
                  style={styles.regionRow}
                  activeOpacity={0.7}
                  onPress={() => handleRegionSelect(region)}
                >
                  <Image source={FLAG_IMAGES[region.code]} style={styles.flagImage} resizeMode="contain" />
                  <Text style={styles.regionRowLabel}>{region.label}</Text>
                  {!isFree && !isPlus && <PlusTag />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    );
  }

  // ── Shared: Bottom action bar ───────────────────────────────────────────────
  function renderActionBar() {
    return (
      <View style={[styles.actionBar, { bottom: actionBarBottom }]}>
        {/* Region dropdown */}
        <TouchableOpacity
          style={styles.regionDropdown}
          activeOpacity={0.85}
          onPress={() => setRegionPickerVisible(true)}
        >
          <Image source={FLAG_IMAGES[selectedRegion.code]} style={styles.flagImage} resizeMode="contain" />
          <Text style={styles.regionDropdownLabel} numberOfLines={1}>{selectedRegion.label}</Text>
          <ActionChevronDownIcon color={Colors.primary} size={24} />
        </TouchableOpacity>

        {/* Icon buttons */}
        <View style={styles.actionBtnGroup}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={handleGalleryScan}>
            <ActionGalleryIcon color={Colors.primary} size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.8} onPress={() => router.push('/food-search')}>
            <ActionSearchIcon color={Colors.primary} size={22} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Shared: Region picker modal ─────────────────────────────────────────────
  function renderRegionModal() {
    return (
      <Modal
        visible={regionPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionPickerVisible(false)}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => setRegionPickerVisible(false)}
        >
          {/* Blur backdrop */}
          {Platform.OS === 'ios' ? (
            <BlurView intensity={25} tint="default" style={[StyleSheet.absoluteFill, styles.regionBackdrop]} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.regionBackdrop]} />
          )}
        </TouchableOpacity>

        {/* Panel — positioned bottom-left, above action bar */}
        <View style={[styles.regionPanelWrapper, { bottom: actionBarBottom + 56 }]} pointerEvents="box-none">
          {renderRegionPanel()}
        </View>
      </Modal>
    );
  }

  // ── Web: camera barcode scanner with BarcodeDetector API ──────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <WebBarcodeScanner
          scanning={scanning}
          processing={processing}
          onBarcodeScanned={(data) => handleBarcodeScan({ data } as BarcodeScanningResult)}
        />

        {/* Overlay UI — transparent, no dark tint */}
        <View style={[styles.overlay, StyleSheet.absoluteFillObject]} pointerEvents="box-none">
          {/* Scan frame — centered */}
          <View style={styles.frameArea} pointerEvents="none">
            <View style={styles.webFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            {processing && (
              <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
            )}
          </View>
        </View>

        {/* Bottom action bar */}
        {renderActionBar()}

        {/* Region picker modal */}
        {renderRegionModal()}
      </View>
    );
  }

  // ── Native: camera barcode scanner ──────────────────────────────────────────

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={Colors.secondary} />
        <Text style={styles.permissionTitle}>{t('permission.title')}</Text>
        <Text style={styles.permissionText}>
          {t('permission.description')}
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>{t('permission.grantButton')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr', 'pdf417', 'code128'],
        }}
        onBarcodeScanned={scanning ? handleBarcodeScan : undefined}
      />

      {/* Transparent overlay — no dark tint, just positions content */}
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Viewfinder — centered */}
        <View style={styles.frameArea} pointerEvents="none">
          <View style={styles.nativeFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          {processing && (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
          )}
        </View>
      </View>

      {/* Bottom action bar */}
      {renderActionBar()}

      {/* Region picker modal */}
      {renderRegionModal()}
    </View>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const FRAME_WIDTH = Math.min(450, SCREEN_WIDTH * 0.9);
const FRAME_HEIGHT = FRAME_WIDTH * 0.6;
const CORNER_SIZE = 36;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  // ── Permission states ─────────────────────────────────────────────────────
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginTop: 8,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },

  // ── Camera overlay — transparent, no dark tint ────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Viewfinder ────────────────────────────────────────────────────────────
  frameArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    position: 'relative',
  },
  webFrame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 12,
  },

  // ── Bottom action bar ─────────────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    left: Spacing.m,   // 24
    right: Spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // Region dropdown pill (left side)
  regionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: Spacing.xs,   // 8
    paddingVertical: Spacing.xs,
    height: 48,
    width: 201,
    gap: Spacing.xs,
    overflow: 'hidden',
  },
  flagImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  regionDropdownLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
  },

  // Action icon buttons (right side)
  actionBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(228,241,239,0.9)',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 16,
    ...Shadows.level3,
  },

  // ── Region picker modal ───────────────────────────────────────────────────
  regionBackdrop: {
    backgroundColor: 'rgba(217,217,217,0.5)',
  },
  regionPanelWrapper: {
    position: 'absolute',
    left: Spacing.m, // 24
  },
  regionPanel: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 275,
    paddingTop: Spacing.s,      // 16
    paddingBottom: Spacing.m,   // 24
    paddingHorizontal: Spacing.s,
    gap: Spacing.xs,            // 8
  },
  regionPanelTitle: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
  },
  regionPanelContent: {
    gap: Spacing.s,   // 16
  },

  // Region rows
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  flagImageSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  regionRowLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  regionDivider: {
    height: 1,
    backgroundColor: '#aad4cd',
  },
  regionOthersList: {
    gap: 8,
  },
});
