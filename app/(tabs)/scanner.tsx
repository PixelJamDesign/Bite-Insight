import { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList, Platform } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { Colors } from '@/constants/theme';
import { getCachedProduct, cacheProduct } from '@/lib/productCache';
import { WebBarcodeScanner } from '@/components/WebBarcodeScanner';

// ── Region definitions for OFF database ──────────────────────────────────────
type Region = { code: string; label: string; subdomain: string };

const REGIONS: Region[] = [
  { code: 'world', label: 'World', subdomain: 'world' },
  { code: 'gb',    label: 'United Kingdom', subdomain: 'uk' },
  { code: 'us',    label: 'United States', subdomain: 'us' },
  { code: 'fr',    label: 'France', subdomain: 'fr' },
  { code: 'de',    label: 'Germany', subdomain: 'de' },
  { code: 'es',    label: 'Spain', subdomain: 'es' },
  { code: 'it',    label: 'Italy', subdomain: 'it' },
  { code: 'au',    label: 'Australia', subdomain: 'au' },
  { code: 'ca',    label: 'Canada', subdomain: 'ca' },
  { code: 'nl',    label: 'Netherlands', subdomain: 'nl' },
];

/** Detect the user's default region from device locale */
function getDefaultRegion(): Region {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const regionCode = locale.split('-').pop()?.toLowerCase() ?? '';
    const match = REGIONS.find(r => r.code === regionCode);
    if (match) return match;
  } catch { /* fall through */ }
  return REGIONS[0]; // World
}

// Returns the OFF base URL for the selected region.
// Free users are locked to their device's regional database.
// Plus+ subscribers can pick any region via the selector.
function getOFFBaseUrl(region: Region): string {
  return `https://${region.subdomain}.openfoodfacts.org`;
}

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<Region>(getDefaultRegion);
  const [regionPickerVisible, setRegionPickerVisible] = useState(false);
  const router = useRouter();
  const { session } = useAuth();
  const { isPlus } = useSubscription();
  const lastScan = useRef<string | null>(null);

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
      let productName = 'Unknown Product';
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
        // ── Tier 2: Open Food Facts API ───────────────────────────────────────
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
                'Unknown Product';
              brand           = op.brands || null;
              imageUrl        = op.image_front_url || op.image_url || null;
              quantity        = op.quantity || op.product_quantity || null;
              nutriscoreGrade = op.nutriscore_grade || op.nutrition_grade_fr || null;
              const hasEnglishText = !!op.ingredients_text_en;
              ingredientsText = op.ingredients_text_en || op.ingredients_text || null;
              allergens       = op.allergens_tags ?? [];
              ingredientsJson = op.ingredients ? JSON.stringify(op.ingredients) : null;
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

      // ── Save scan to Supabase ───────────────────────────────────────────────
      // Ensure profile row exists (guards against trigger timing gaps)
      await supabase
        .from('profiles')
        .upsert({ id: session?.user.id }, { onConflict: 'id', ignoreDuplicates: true });

      // Check if this barcode was already scanned by this user
      const { data: existing } = await supabase
        .from('scans')
        .select('id')
        .eq('user_id', session?.user.id)
        .eq('barcode', result.data)
        .limit(1)
        .single();

      let scanId: string;

      if (existing) {
        // Update existing scan: bump timestamp + refresh product data
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
        scanId = existing.id;
      } else {
        const { data: insertData, error } = await supabase
          .from('scans')
          .insert({
            user_id: session?.user.id,
            barcode: result.data,
            product_name: productName,
            brand,
            image_url: imageUrl,
            nutriscore_grade: nutriscoreGrade,
            flagged_count: 0,
          })
          .select('id')
          .single();
        if (error) throw error;
        scanId = insertData.id;
      }

      setProcessing(false);
      router.push({
        pathname: '/scan-result',
        params: {
          scanId,
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
          ingredientsJson: ingredientsJson ?? '',
          offLang: offLang ?? 'en',
        },
      });
    } catch (err) {
      console.error('Scan error:', err);
      setProcessing(false);
      Alert.alert(
        'Scan failed',
        'Could not process this barcode. Please try again.',
        [{ text: 'OK', onPress: () => { setScanning(true); lastScan.current = null; } }],
      );
    }
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

        {/* Overlay UI — absolutely positioned over the camera */}
        <View style={[styles.overlay, StyleSheet.absoluteFillObject]} pointerEvents="box-none">
          {/* Top bar */}
          <SafeAreaView edges={['top']} pointerEvents="box-none">
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.topTitle}>Scan Food Label</Text>
              <View style={{ width: 44 }} />
            </View>
          </SafeAreaView>

          {/* Region selector pill — only shown for Plus subscribers */}
          {isPlus && (
            <View style={styles.switcherRow}>
              <TouchableOpacity
                style={styles.switcherPill}
                onPress={() => setRegionPickerVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="globe-outline" size={16} color="#fff" />
                <Text style={styles.switcherText}>{selectedRegion.label}</Text>
                <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          )}

          {/* Scan frame */}
          <View style={styles.frameArea} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.frameHint}>
              {processing ? 'Processing...' : 'Point at a barcode to scan'}
            </Text>
            {processing && (
              <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
            )}
          </View>

          {/* Bottom hint */}
          <SafeAreaView edges={['bottom']} pointerEvents="none">
            <View style={styles.bottomBar}>
              <Text style={styles.bottomHint}>
                Supports EAN-13, EAN-8, UPC-A and QR codes
              </Text>
            </View>
          </SafeAreaView>
        </View>

        {/* Region picker modal — Plus subscribers only */}
        <Modal
          visible={regionPickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRegionPickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.switcherBackdrop}
            activeOpacity={1}
            onPress={() => setRegionPickerVisible(false)}
          >
            <View style={styles.switcherDropdown}>
              <Text style={styles.switcherDropdownTitle}>Select region</Text>
              <FlatList
                data={REGIONS}
                keyExtractor={(item) => item.code}
                style={{ maxHeight: 340 }}
                renderItem={({ item: region }) => (
                  <TouchableOpacity
                    style={styles.switcherOption}
                    onPress={() => { setSelectedRegion(region); setRegionPickerVisible(false); }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.switcherCheck, selectedRegion.code === region.code && styles.switcherCheckActive]}>
                      {selectedRegion.code === region.code && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.switcherOptionText}>{region.label}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
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
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          BiteInsight needs camera access to scan food labels and barcodes.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Access</Text>
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

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <SafeAreaView edges={['top']}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Scan Food Label</Text>
            <View style={{ width: 44 }} />
          </View>
        </SafeAreaView>

        {/* Region selector pill — only shown for Plus subscribers */}
        {isPlus && (
          <View style={styles.switcherRow}>
            <TouchableOpacity
              style={styles.switcherPill}
              onPress={() => setRegionPickerVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="globe-outline" size={16} color="#fff" />
              <Text style={styles.switcherText}>{selectedRegion.label}</Text>
              <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        )}

        {/* Scan frame */}
        <View style={styles.frameArea}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.frameHint}>
            {processing ? 'Processing...' : 'Point at a barcode to scan'}
          </Text>
          {processing && (
            <ActivityIndicator size="large" color="#fff" style={{ marginTop: 16 }} />
          )}
        </View>

        {/* Bottom hint */}
        <SafeAreaView edges={['bottom']}>
          <View style={styles.bottomBar}>
            <Text style={styles.bottomHint}>
              Supports EAN-13, EAN-8, UPC-A and QR codes
            </Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Region picker modal — Plus subscribers only */}
      <Modal
        visible={regionPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRegionPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.switcherBackdrop}
          activeOpacity={1}
          onPress={() => setRegionPickerVisible(false)}
        >
          <View style={styles.switcherDropdown}>
            <Text style={styles.switcherDropdownTitle}>Select region</Text>
            <FlatList
              data={REGIONS}
              keyExtractor={(item) => item.code}
              style={{ maxHeight: 340 }}
              renderItem={({ item: region }) => (
                <TouchableOpacity
                  style={styles.switcherOption}
                  onPress={() => { setSelectedRegion(region); setRegionPickerVisible(false); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.switcherCheck, selectedRegion.code === region.code && styles.switcherCheckActive]}>
                    {selectedRegion.code === region.code && <Ionicons name="checkmark" size={14} color="#fff" />}
                  </View>
                  <Text style={styles.switcherOptionText}>{region.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 32;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
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
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },
  frameArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
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
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
    borderBottomRightRadius: 4,
  },
  frameHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    marginTop: 24,
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  bottomHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: 'Figtree_300Light',
    textAlign: 'center',
  },

  // Profile switcher
  switcherRow: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  switcherPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  switcherText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  switcherBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherDropdown: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    width: 260,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  switcherDropdownTitle: {
    fontSize: 12,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  switcherOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  switcherCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switcherCheckActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  switcherOptionText: {
    fontSize: 15,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  switcherOptionSub: {
    fontSize: 13,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
  },
});
