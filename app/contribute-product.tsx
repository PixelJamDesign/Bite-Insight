/**
 * Contribute product — full-screen "Help add this product" flow for Open Food
 * Facts, shown from the scan "product not found" state.
 *
 * Mirrors the Recipe Builder design (app/recipes/new.tsx): hero photo on a teal
 * wash with a floating back button, a rounded white body that overlaps the
 * hero, a page title, labelled fields (canonical TextField), and a sticky
 * Cancel / Submit footer. The product's FRONT photo is the hero (its primary
 * image); ingredients + nutrition photos sit in a Photos section.
 *
 * Submits to the `off-contribute` edge function, which performs the
 * authenticated write — the OFF account password never reaches the client.
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Colors, Radius } from '@/constants/theme';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastContext';
import { getOffContributorId } from '@/lib/offContributorId';
import ArrowLeftIcon from '@/assets/icons/recipe-header/arrow-left.svg';

const HERO_HEIGHT = 300;

type PhotoField = 'front' | 'ingredients' | 'nutrition';

export default function ContributeProductScreen() {
  const { t } = useTranslation('scan');
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const barcode = typeof params.barcode === 'string' ? params.barcode : null;

  const [name, setName] = useState('');
  const [brands, setBrands] = useState('');
  const [quantity, setQuantity] = useState('');
  const [categories, setCategories] = useState('');
  const [images, setImages] = useState<Partial<Record<PhotoField, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const hasSomething =
    name.trim() || brands.trim() || quantity.trim() || categories.trim() || Object.keys(images).length > 0;

  function addPhoto(field: PhotoField) {
    const pick = async (fromCamera: boolean) => {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({ message: t('contribute.cameraPermission'), variant: 'error' });
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = { quality: 0.6, base64: true, mediaTypes: ['images'] };
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);
      if (!res.canceled && res.assets[0]?.base64) {
        setImages((prev) => ({ ...prev, [field]: res.assets[0].base64! }));
      }
    };
    Alert.alert(t(`contribute.photo.${field}`), undefined, [
      { text: t('contribute.takePhoto'), onPress: () => pick(true) },
      { text: t('contribute.chooseLibrary'), onPress: () => pick(false) },
      { text: t('contribute.cancel'), style: 'cancel' },
    ]);
  }

  async function handleSubmit() {
    if (!barcode) return;
    setSubmitting(true);
    try {
      const appUuid = await getOffContributorId();
      const { data, error } = await supabase.functions.invoke('off-contribute', {
        body: {
          code: barcode,
          app_uuid: appUuid,
          app_version: Constants.expoConfig?.version ?? '0.0.0',
          product_name: name.trim() || undefined,
          brands: brands.trim() || undefined,
          quantity: quantity.trim() || undefined,
          categories: categories.trim() || undefined,
          images: Object.keys(images).length ? images : undefined,
        },
      });
      if (error || (data as { error?: string })?.error) {
        let msg = t('contribute.error');
        try {
          const body = await (error as { context?: Response })?.context?.json();
          if (body?.error) msg = body.error;
        } catch { /* keep default */ }
        if ((data as { error?: string })?.error) msg = (data as { error: string }).error;
        showToast({ message: msg, variant: 'error' });
        return;
      }
      showToast({ message: t('contribute.success'), variant: 'success' });
      router.back();
    } catch {
      showToast({ message: t('contribute.error'), variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero: front photo ─────────────────────────────────────── */}
          <TouchableOpacity style={styles.hero} onPress={() => addPhoto('front')} activeOpacity={0.9}>
            <View style={styles.heroBgWash} />
            {images.front ? (
              <Image source={{ uri: `data:image/jpeg;base64,${images.front}` }} style={styles.heroImage} resizeMode="cover" />
            ) : null}
            {!images.front && (
              <View style={styles.heroCta}>
                <View style={styles.heroIconWrap}>
                  <Ionicons name="camera-outline" size={40} color={Colors.secondary} />
                </View>
                <Text style={styles.heroCtaText}>{t('contribute.addFrontPhoto')}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Floating back button */}
          <TouchableOpacity
            style={[styles.headerBtn, { top: insets.top + 12 }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
            hitSlop={8}
          >
            <ArrowLeftIcon width={18} height={14} />
          </TouchableOpacity>

          {/* ── Body ──────────────────────────────────────────────────── */}
          <View style={styles.body}>
            <View style={styles.titleBlock}>
              <Text style={styles.pageTitle}>{t('contribute.title')}</Text>
              <Text style={styles.subtitle}>{t('contribute.subtitle')}</Text>
              {barcode ? <Text style={styles.barcode}>{t('contribute.barcode', { code: barcode })}</Text> : null}
            </View>

            {/* Product details */}
            <View style={styles.group16}>
              <Text style={styles.h4}>{t('contribute.detailsTitle')}</Text>
              <TextField value={name} onChangeText={setName} placeholder={t('contribute.field.name')} autoCapitalize="words" />
              <TextField value={brands} onChangeText={setBrands} placeholder={t('contribute.field.brand')} autoCapitalize="words" />
              <TextField value={quantity} onChangeText={setQuantity} placeholder={t('contribute.field.quantity')} />
              <TextField value={categories} onChangeText={setCategories} placeholder={t('contribute.field.category')} autoCapitalize="words" />
            </View>

            {/* Photos */}
            <View style={styles.group16}>
              <View style={styles.sectionTitleBlock}>
                <Text style={styles.h4}>{t('contribute.photosTitle')}</Text>
                <Text style={styles.subtitle}>{t('contribute.photosSubtitle')}</Text>
              </View>
              <View style={styles.photoRow}>
                {(['ingredients', 'nutrition'] as const).map((field) => (
                  <TouchableOpacity key={field} style={styles.photoTile} activeOpacity={0.85} onPress={() => addPhoto(field)}>
                    {images[field] ? (
                      <Image source={{ uri: `data:image/jpeg;base64,${images[field]}` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    ) : (
                      <>
                        <Ionicons name="camera-outline" size={24} color={Colors.secondary} />
                        <Text style={styles.photoTileLabel}>{t(`contribute.photo.${field}`)}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ── Sticky footer ─────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.discardBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.discardBtnText}>{t('contribute.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, (!hasSomething || submitting) && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            disabled={!hasSomething || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>{t('contribute.submit')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.secondary },

  // Hero
  hero: { width: '100%', height: HERO_HEIGHT, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroBgWash: { ...StyleSheet.absoluteFillObject, backgroundColor: '#e2f1ee' },
  heroImage: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  heroCta: { alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.5 },
  heroIconWrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  heroCtaText: {
    fontSize: 14, lineHeight: 17, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.secondary, textAlign: 'center', letterSpacing: -0.28,
  },

  // Floating back button
  headerBtn: {
    position: 'absolute',
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Body
  body: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -16,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 32,
  },
  titleBlock: { gap: 8 },
  pageTitle: {
    fontSize: 24, lineHeight: 30, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.primary, letterSpacing: -0.48,
  },
  subtitle: {
    fontSize: 16, lineHeight: 24, fontWeight: '300', fontFamily: 'Figtree_300Light', color: Colors.secondary,
  },
  barcode: {
    fontSize: 13, lineHeight: 16, fontFamily: 'Figtree_700Bold', color: Colors.secondary, letterSpacing: -0.26,
  },
  h4: {
    fontSize: 20, lineHeight: 24, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.primary, letterSpacing: -0.4,
  },
  group16: { gap: 16 },
  sectionTitleBlock: { gap: 4 },

  // Photo tiles
  photoRow: { flexDirection: 'row', gap: 16 },
  photoTile: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  photoTileLabel: {
    fontSize: 14, lineHeight: 17, fontFamily: 'Figtree_700Bold', color: Colors.secondary, letterSpacing: -0.28,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: Colors.surface.secondary,
    borderTopWidth: 1,
    borderTopColor: 'rgba(170, 212, 205, 0.4)',
  },
  discardBtn: {
    height: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  discardBtnText: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontFamily: 'Figtree_700Bold', color: Colors.secondary },
  saveBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontFamily: 'Figtree_700Bold', color: '#fff' },
});
