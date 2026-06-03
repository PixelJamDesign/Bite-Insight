/**
 * Contribute product — full-screen "Help add this product" flow for Open Food
 * Facts, shown from the scan "product not found" state.
 *
 * Mirrors the Recipe Builder design (app/recipes/new.tsx): front photo as the
 * hero on a teal wash with a floating back button, a rounded white body that
 * overlaps the hero, and a sticky Cancel / Submit footer.
 *
 * Collects enough to give an instant insight once OFF processes it:
 *   • Details — name, brand, quantity, category
 *   • Ingredients — ingredients text (for allergen/additive flagging) + photo
 *   • Nutrition — per-100g values (for Nutri-score) + photo
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
type Tab = 'details' | 'ingredients' | 'nutrition';
const TABS: Tab[] = ['details', 'ingredients', 'nutrition'];

// Nutrient ids match Open Food Facts (sent as nutriment_<id>); per 100g.
const NUTRIENTS: { id: string; labelKey: string }[] = [
  { id: 'energy-kcal', labelKey: 'nutrient.energy' },
  { id: 'fat', labelKey: 'nutrient.fat' },
  { id: 'saturated-fat', labelKey: 'nutrient.saturatedFat' },
  { id: 'carbohydrates', labelKey: 'nutrient.carbohydrates' },
  { id: 'sugars', labelKey: 'nutrient.sugars' },
  { id: 'fiber', labelKey: 'nutrient.fiber' },
  { id: 'proteins', labelKey: 'nutrient.proteins' },
  { id: 'salt', labelKey: 'nutrient.salt' },
];

/** Tidy a single ingredient: drop a leading "Ingredients:", collapse spaces,
 *  trim trailing punctuation. */
function cleanIngredient(s: string): string {
  return s
    .replace(/^\s*ingredients?\s*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;]+$/, '');
}

/** Split ingredients on TOP-LEVEL commas/newlines only — commas inside (...) or
 *  [...] belong to that ingredient's sub-list (e.g. "yeast extract (contains
 *  BARLEY, WHEAT, OATS, RYE)"). Returns [...complete parts, trailingRemainder]. */
function splitIngredients(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of text) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === '\n') && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  parts.push(cur);
  return parts;
}

type Ingredient = { name: string; subs: string[] };

/** Split a cleaned ingredient into its name + bracketed sub-ingredients.
 *  "Yeast Extract (contains Barley, Wheat)" → { name, subs: [Barley, Wheat] } */
function parseIngredient(s: string): Ingredient {
  const m = s.match(/^(.*?)[([]\s*(.*?)\s*[)\]]\s*$/);
  if (m && m[1].trim()) {
    const inner = m[2].replace(/^\s*contains\s*:?\s*/i, '');
    const subs = inner.split(',').map((x) => x.trim()).filter(Boolean);
    return { name: m[1].trim(), subs };
  }
  return { name: s.trim(), subs: [] };
}

/** Re-assemble for OFF's ingredients_text: "name (sub, sub)". */
function formatIngredient(ing: Ingredient): string {
  return ing.subs.length ? `${ing.name} (${ing.subs.join(', ')})` : ing.name;
}

export default function ContributeProductScreen() {
  const { t } = useTranslation('scan');
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ barcode?: string }>();
  const barcode = typeof params.barcode === 'string' ? params.barcode : null;

  const [tab, setTab] = useState<Tab>('details');
  const [name, setName] = useState('');
  const [brands, setBrands] = useState('');
  const [quantity, setQuantity] = useState('');
  const [categories, setCategories] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState('');
  const [nutriments, setNutriments] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Partial<Record<PhotoField, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const hasSomething =
    name.trim() || brands.trim() || quantity.trim() || categories.trim() ||
    ingredients.length || ingredientDraft.trim() ||
    Object.values(nutriments).some((v) => v.trim()) ||
    Object.keys(images).length > 0;

  // Ingredient chip entry — a top-level comma or return commits an ingredient.
  // Commas inside brackets don't split, so "yeast extract (contains BARLEY,
  // WHEAT, OATS, RYE)" stays a single chip. Pasting a whole label works too.
  function onIngredientDraftChange(v: string) {
    const parts = splitIngredients(v);
    if (parts.length > 1) {
      const complete = parts.slice(0, -1).map(cleanIngredient).filter(Boolean).map(parseIngredient);
      if (complete.length) setIngredients((prev) => [...prev, ...complete]);
      setIngredientDraft(parts[parts.length - 1].replace(/^\s+/, ''));
    } else {
      setIngredientDraft(v);
    }
  }
  function commitIngredientDraft() {
    const d = cleanIngredient(ingredientDraft);
    if (d) {
      setIngredients((prev) => [...prev, parseIngredient(d)]);
      setIngredientDraft('');
    }
  }
  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

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
      const cleanNutriments = Object.fromEntries(
        Object.entries(nutriments).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]),
      );
      // Chips (+ any uncommitted draft) → OFF's comma-separated ingredients_text.
      const draftClean = cleanIngredient(ingredientDraft);
      const ingredientsList = [
        ...ingredients.map(formatIngredient),
        ...(draftClean ? [formatIngredient(parseIngredient(draftClean))] : []),
      ].filter(Boolean);
      const { data, error } = await supabase.functions.invoke('off-contribute', {
        body: {
          code: barcode,
          app_uuid: appUuid,
          app_version: Constants.expoConfig?.version ?? '0.0.0',
          product_name: name.trim() || undefined,
          brands: brands.trim() || undefined,
          quantity: quantity.trim() || undefined,
          categories: categories.trim() || undefined,
          ingredients_text: ingredientsList.length ? ingredientsList.join(', ') : undefined,
          nutriments: Object.keys(cleanNutriments).length ? cleanNutriments : undefined,
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

  function PhotoTile({ field, label }: { field: PhotoField; label: string }) {
    return (
      <TouchableOpacity style={styles.photoTileWide} activeOpacity={0.85} onPress={() => addPhoto(field)}>
        {images[field] ? (
          <Image source={{ uri: `data:image/jpeg;base64,${images[field]}` }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <>
            <Ionicons name="camera-outline" size={24} color={Colors.secondary} />
            <Text style={styles.photoTileLabel}>{label}</Text>
          </>
        )}
      </TouchableOpacity>
    );
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

            {/* Tabs */}
            <View style={styles.tabBar}>
              {TABS.map((key) => {
                const active = key === tab;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.tab, active && styles.tabActive]}
                    onPress={() => setTab(key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>{t(`contribute.tab.${key}`)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Details */}
            {tab === 'details' && (
              <View style={styles.group16}>
                <TextField value={name} onChangeText={setName} placeholder={t('contribute.field.name')} autoCapitalize="words" />
                <TextField value={brands} onChangeText={setBrands} placeholder={t('contribute.field.brand')} autoCapitalize="words" />
                <TextField value={quantity} onChangeText={setQuantity} placeholder={t('contribute.field.quantity')} />
                <TextField value={categories} onChangeText={setCategories} placeholder={t('contribute.field.category')} autoCapitalize="words" />
              </View>
            )}

            {/* Ingredients — each entry becomes a chip */}
            {tab === 'ingredients' && (
              <View style={styles.group16}>
                <TextField
                  label={t('contribute.ingredientsLabel')}
                  value={ingredientDraft}
                  onChangeText={onIngredientDraftChange}
                  placeholder={t('contribute.ingredientsPlaceholder')}
                  autoCapitalize="sentences"
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={commitIngredientDraft}
                />
                {ingredients.length > 0 && (
                  <View style={styles.ingredientList}>
                    {ingredients.map((ing, i) => (
                      <View key={`${ing.name}-${i}`} style={styles.ingredientItem}>
                        <View style={styles.chip}>
                          <Text style={styles.chipLabel}>{ing.name}</Text>
                          <TouchableOpacity onPress={() => removeIngredient(i)} hitSlop={8} accessibilityLabel={`Remove ${ing.name}`}>
                            <Ionicons name="close" size={16} color={Colors.secondary} />
                          </TouchableOpacity>
                        </View>
                        {ing.subs.length > 0 && (
                          <View style={styles.subChipWrap}>
                            {ing.subs.map((sub, j) => (
                              <View key={`${sub}-${j}`} style={styles.subChip}>
                                <Text style={styles.subChipText}>{sub}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                <PhotoTile field="ingredients" label={t('contribute.addIngredientsPhoto')} />
              </View>
            )}

            {/* Nutrition */}
            {tab === 'nutrition' && (
              <View style={styles.group16}>
                <Text style={styles.subtitle}>{t('contribute.nutritionHint')}</Text>
                {NUTRIENTS.map((n) => (
                  <TextField
                    key={n.id}
                    label={t(`contribute.${n.labelKey}`)}
                    value={nutriments[n.id] ?? ''}
                    onChangeText={(v) => setNutriments((p) => ({ ...p, [n.id]: v }))}
                    placeholder="0"
                    keyboardType="decimal-pad"
                    clearable={false}
                  />
                ))}
                <PhotoTile field="nutrition" label={t('contribute.addNutritionPhoto')} />
              </View>
            )}
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
    gap: 24,
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
  group16: { gap: 16 },

  // Ingredient chips (parent + nested sub-ingredients)
  ingredientList: { gap: 12 },
  ingredientItem: { gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 8,
  },
  chipLabel: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  // Sub-ingredients: smaller, lighter pills indented under the parent
  subChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginLeft: 16 },
  subChip: {
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#cfe1db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  subChipText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.13,
  },

  // Tabs (pill style — matches the scan-result tab bar)
  tabBar: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: { backgroundColor: Colors.surface.tertiary, borderColor: '#aad4cd' },
  tabText: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontFamily: 'Figtree_700Bold', color: Colors.secondary, letterSpacing: -0.32 },
  tabTextActive: { color: Colors.primary },

  // Photo tile (full width)
  photoTileWide: {
    width: '100%',
    height: 140,
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
