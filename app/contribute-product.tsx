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

// EU-14 major allergens. `off` is the English name we send to Open Food Facts
// (its taxonomy maps these to en:gluten, en:milk, … which the app reads back).
const ALLERGENS: { off: string; labelKey: string }[] = [
  { off: 'gluten', labelKey: 'gluten' },
  { off: 'crustaceans', labelKey: 'crustaceans' },
  { off: 'eggs', labelKey: 'eggs' },
  { off: 'fish', labelKey: 'fish' },
  { off: 'peanuts', labelKey: 'peanuts' },
  { off: 'soybeans', labelKey: 'soybeans' },
  { off: 'milk', labelKey: 'milk' },
  { off: 'nuts', labelKey: 'nuts' },
  { off: 'celery', labelKey: 'celery' },
  { off: 'mustard', labelKey: 'mustard' },
  { off: 'sesame seeds', labelKey: 'sesame' },
  { off: 'sulphur dioxide and sulphites', labelKey: 'sulphites' },
  { off: 'lupin', labelKey: 'lupin' },
  { off: 'molluscs', labelKey: 'molluscs' },
];

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

/** Split a stored ingredient into its display name + bracketed sub-ingredients
 *  (for the "this ingredient contains" bullet list). The full string is what we
 *  send to OFF; this is display-only. */
function parseIngredient(s: string): { name: string; subs: string[] } {
  const m = s.match(/^(.*?)[([]\s*(.*?)\s*[)\]]\s*$/);
  if (m && m[1].trim()) {
    const inner = m[2].replace(/^\s*contains\s*:?\s*/i, '');
    return { name: m[1].trim(), subs: inner.split(',').map((x) => x.trim()).filter(Boolean) };
  }
  return { name: s.trim(), subs: [] };
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
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [ingredientDraft, setIngredientDraft] = useState('');
  const [allergens, setAllergens] = useState<string[]>([]);
  const [traces, setTraces] = useState<string[]>([]);
  const [nutriments, setNutriments] = useState<Record<string, string>>({});

  function toggleAllergen(list: string[], setList: (v: string[]) => void, off: string) {
    setList(list.includes(off) ? list.filter((x) => x !== off) : [...list, off]);
  }
  const [images, setImages] = useState<Partial<Record<PhotoField, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const hasSomething =
    name.trim() || brands.trim() || quantity.trim() || categories.trim() ||
    ingredients.length || ingredientDraft.trim() || allergens.length || traces.length ||
    Object.values(nutriments).some((v) => v.trim()) ||
    Object.keys(images).length > 0;

  // Ingredient chip entry — a top-level comma or return commits an ingredient.
  // Commas inside brackets don't split, so "yeast extract (contains BARLEY,
  // WHEAT, OATS, RYE)" stays a single chip. Pasting a whole label works too.
  function onIngredientDraftChange(v: string) {
    const parts = splitIngredients(v);
    if (parts.length > 1) {
      const complete = parts.slice(0, -1).map(cleanIngredient).filter(Boolean);
      if (complete.length) setIngredients((prev) => [...prev, ...complete]);
      setIngredientDraft(parts[parts.length - 1].replace(/^\s+/, ''));
    } else {
      setIngredientDraft(v);
    }
  }
  function commitIngredientDraft() {
    const d = cleanIngredient(ingredientDraft);
    if (d) {
      setIngredients((prev) => [...prev, d]);
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
      // List (+ any uncommitted draft) → OFF's comma-separated ingredients_text.
      const ingredientsList = [...ingredients, cleanIngredient(ingredientDraft)].filter(Boolean);
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
          allergens: allergens.length ? allergens : undefined,
          traces: traces.length ? traces : undefined,
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

  function AllergenGrid({ selected, onToggle }: { selected: string[]; onToggle: (off: string) => void }) {
    return (
      <View style={styles.allergenWrap}>
        {ALLERGENS.map((a) => {
          const on = selected.includes(a.off);
          return (
            <TouchableOpacity
              key={a.off}
              style={[styles.allergenChip, on && styles.allergenChipOn]}
              onPress={() => onToggle(a.off)}
              activeOpacity={0.8}
            >
              <Text style={[styles.allergenChipText, on && styles.allergenChipTextOn]}>
                {t(`contribute.allergen.${a.labelKey}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
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
                    {ingredients.map((ing, i) => {
                      const { name, subs } = parseIngredient(ing);
                      return (
                        <View key={`${ing}-${i}`} style={styles.ingredientRow}>
                          <View style={styles.ingredientRowTop}>
                            <Text style={styles.ingredientRowText}>{name}</Text>
                            <TouchableOpacity onPress={() => removeIngredient(i)} hitSlop={8} accessibilityLabel={`Remove ${name}`}>
                              <Ionicons name="close" size={18} color={Colors.secondary} />
                            </TouchableOpacity>
                          </View>
                          {subs.length > 0 && (
                            <View style={styles.subList}>
                              <Text style={styles.subListTitle}>{t('contribute.containsTitle')}</Text>
                              {subs.map((sub, j) => (
                                <View key={`${sub}-${j}`} style={styles.bulletRow}>
                                  <Text style={styles.bullet}>•</Text>
                                  <Text style={styles.bulletText}>{sub}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
                <View style={styles.allergenSection}>
                  <View style={styles.sectionTitleBlock}>
                    <Text style={styles.h4}>{t('contribute.allergensTitle')}</Text>
                    <Text style={styles.subtitle}>{t('contribute.allergensHint')}</Text>
                  </View>
                  <Text style={styles.allergenGroupLabel}>{t('contribute.allergensContains')}</Text>
                  <AllergenGrid selected={allergens} onToggle={(o) => toggleAllergen(allergens, setAllergens, o)} />
                  <Text style={styles.allergenGroupLabel}>{t('contribute.allergensMayContain')}</Text>
                  <AllergenGrid selected={traces} onToggle={(o) => toggleAllergen(traces, setTraces, o)} />
                </View>

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
  sectionTitleBlock: { gap: 4 },
  h4: {
    fontSize: 20, lineHeight: 24, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.primary, letterSpacing: -0.4,
  },

  // Ingredient list — one row per ingredient, with a clear (×) icon and an
  // optional "this ingredient contains" bullet list of sub-ingredients.
  ingredientList: { gap: 8 },
  ingredientRow: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 8,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 12,
    gap: 12,
  },
  ingredientRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ingredientRowText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  subList: { gap: 4, paddingLeft: 4 },
  subListTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
    marginBottom: 2,
  },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bullet: {
    fontSize: 14,
    lineHeight: 21,
    color: Colors.secondary,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },

  // Allergen selector
  allergenSection: { gap: 12 },
  allergenGroupLabel: {
    fontSize: 16, lineHeight: 20, fontFamily: 'Figtree_700Bold', color: Colors.primary, letterSpacing: -0.32,
  },
  allergenWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergenChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#aad4cd',
    backgroundColor: '#fff',
  },
  allergenChipOn: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  allergenChipText: {
    fontSize: 14, lineHeight: 17, fontFamily: 'Figtree_700Bold', color: Colors.secondary, letterSpacing: -0.28,
  },
  allergenChipTextOn: { color: '#fff' },

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
