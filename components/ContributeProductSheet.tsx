/**
 * ContributeProductSheet — "Help add this product" flow shown from the
 * scan "product not found" state.
 *
 * Collects a few basic fields + up to three photos and sends them to the
 * `off-contribute` edge function, which performs the authenticated write to
 * Open Food Facts. The OFF account password never reaches the client; this
 * sheet only gathers data and an anonymous contributor id (app_uuid).
 */
import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing } from '@/constants/theme';
import { TextField } from '@/components/TextField';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastContext';
import { getOffContributorId } from '@/lib/offContributorId';

type PhotoField = 'front' | 'ingredients' | 'nutrition';
const PHOTO_FIELDS: PhotoField[] = ['front', 'ingredients', 'nutrition'];

export function ContributeProductSheet({
  visible,
  onClose,
  barcode,
}: {
  visible: boolean;
  onClose: () => void;
  barcode: string | null;
}) {
  const { t } = useTranslation('scan');
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [brands, setBrands] = useState('');
  const [quantity, setQuantity] = useState('');
  const [categories, setCategories] = useState('');
  const [images, setImages] = useState<Partial<Record<PhotoField, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const hasSomething =
    name.trim() || brands.trim() || quantity.trim() || categories.trim() || Object.keys(images).length > 0;

  async function addPhoto(field: PhotoField) {
    const pick = async (fromCamera: boolean) => {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        showToast({ message: t('contribute.cameraPermission'), variant: 'error' });
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        quality: 0.6,
        base64: true,
        mediaTypes: ['images'],
      };
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
      if (error || (data && (data as { error?: string }).error)) {
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
      onClose();
    } catch {
      showToast({ message: t('contribute.error'), variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('contribute.title')}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.subtitle}>{t('contribute.subtitle')}</Text>
            {barcode ? <Text style={styles.barcode}>{t('contribute.barcode', { code: barcode })}</Text> : null}

            <TextField value={name} onChangeText={setName} placeholder={t('contribute.field.name')} autoCapitalize="words" />
            <TextField value={brands} onChangeText={setBrands} placeholder={t('contribute.field.brand')} autoCapitalize="words" />
            <TextField value={quantity} onChangeText={setQuantity} placeholder={t('contribute.field.quantity')} />
            <TextField value={categories} onChangeText={setCategories} placeholder={t('contribute.field.category')} autoCapitalize="words" />

            <Text style={styles.sectionLabel}>{t('contribute.photosTitle')}</Text>
            <View style={styles.photoRow}>
              {PHOTO_FIELDS.map((field) => (
                <TouchableOpacity
                  key={field}
                  style={styles.photoSlot}
                  activeOpacity={0.8}
                  onPress={() => addPhoto(field)}
                >
                  {images[field] ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${images[field]}` }} style={styles.photoThumb} />
                  ) : (
                    <Ionicons name="camera-outline" size={24} color={Colors.secondary} />
                  )}
                  <Text style={styles.photoLabel}>{t(`contribute.photo.${field}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitBtn, (!hasSomething || submitting) && { opacity: 0.4 }]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={!hasSomething || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{t('contribute.submit')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  title: { fontSize: 24, lineHeight: 30, fontFamily: 'Figtree_700Bold', color: Colors.primary, letterSpacing: -0.48 },
  content: { paddingHorizontal: Spacing.m, paddingBottom: Spacing.l, gap: Spacing.s },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  barcode: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  sectionLabel: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
    marginTop: Spacing.xs,
  },
  photoRow: { flexDirection: 'row', gap: Spacing.xs },
  photoSlot: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  photoThumb: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
  photoLabel: {
    fontSize: 12,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
  footer: { paddingHorizontal: Spacing.m, paddingTop: Spacing.xs, paddingBottom: Spacing.xs },
  submitBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 16, fontFamily: 'Figtree_700Bold', color: '#fff', letterSpacing: -0.32 },
});
