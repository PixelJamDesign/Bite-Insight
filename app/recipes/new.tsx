/**
 * Recipe Builder — full-screen takeover.
 *
 * Pixel-matches Figma node 4792-21524 ("Create Recipe | Empty").
 *
 * Structure (top to bottom):
 *   • Hero cover area — 300px, soft-light cover image on teal wash, centered
 *     "Add cover image" CTA. Floating 48px rounded back button top-left.
 *   • "Create a new recipe" title (Heading 3)
 *   • Recipe name — label (h4) + 12px-radius input
 *   • Servings — inline card (#f5fbfb) with title/hint + [−] 999 [+] controls
 *   • Live Nutrition — heading + Per-serving/Per-100g pill tabs + list of
 *     simple #f5fbfb/#aad4cd label-value rows (no ratings on this screen)
 *   • "Estimated Nutri-score" block (verdict pill + A-E scale)
 *   • Ingredients — h4 title + 52px teal + button + empty/row list
 *   • Process — h4 title + 52px teal + button + step cards
 *   • Sticky Discard + Save recipe footer
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  NestableScrollContainer,
  NestableDraggableFlatList,
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/lib/auth';
import { useDraftRecipe } from '@/lib/draftRecipeContext';
import { getRecipe } from '@/lib/recipes';
import { uploadRecipeCover } from '@/lib/supabase';
import { formatQuantity } from '@/constants/quantityUnits';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import {
  NUTRISCORE_COLORS,
  NUTRISCORE_VERDICT,
  type NutriscoreGrade,
} from '@/lib/nutriscore';
import { ActionPenIcon } from '@/components/MenuIcons';
import ArrowLeftIcon from '@/assets/icons/recipe-header/arrow-left.svg';
import GalleryAddIcon from '@/assets/icons/recipe-header/gallery-add.svg';
import { QuantityPickerSheet } from '@/components/QuantityPickerSheet';
import { AddIngredientSheet, type AddSource } from '@/components/AddIngredientSheet';
import { StepEditorSheet } from '@/components/StepEditorSheet';
import { safeBack } from '@/lib/safeBack';

const HERO_HEIGHT = 300;

const GRADES: NutriscoreGrade[] = ['a', 'b', 'c', 'd', 'e'];

// Food icon assets — match Figma macro stack (SVG React components)
type SvgIcon = React.FC<{ width?: number; height?: number }>;
const FOOD_ICONS: Record<string, SvgIcon> = {
  calories: require('@/assets/icons/food/calories.svg').default,
  fat: require('@/assets/icons/food/fat.svg').default,
  satFat: require('@/assets/icons/food/sat-fat.svg').default,
  carbs: require('@/assets/icons/food/carbs.svg').default,
  sugars: require('@/assets/icons/food/sugars.svg').default,
  fiber: require('@/assets/icons/food/fiber.svg').default,
  netCarbs: require('@/assets/icons/food/net-carbs.svg').default,
  protein: require('@/assets/icons/food/protein.svg').default,
  salt: require('@/assets/icons/food/salt.svg').default,
};

type NutritionMode = 'serving' | 'per100';

export default function RecipeBuilderScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id;
  const isEditing = Boolean(editingId);
  const insets = useSafeAreaInsets();

  const draft = useDraftRecipe();
  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [quantityEditing, setQuantityEditing] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [nutritionMode, setNutritionMode] = useState<NutritionMode>('serving');
  const [stepEditorIndex, setStepEditorIndex] = useState<number | null>(null);
  const [ingredientsEditMode, setIngredientsEditMode] = useState(false);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<string>>(new Set());

  function toggleIngredientSelected(localId: string) {
    setSelectedIngredientIds((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  }

  function exitEditMode() {
    setIngredientsEditMode(false);
    setSelectedIngredientIds(new Set());
  }

  function handleDeleteSelected() {
    if (selectedIngredientIds.size === 0) {
      exitEditMode();
      return;
    }
    Alert.alert(
      `Delete ${selectedIngredientIds.size} ${selectedIngredientIds.size === 1 ? 'ingredient' : 'ingredients'}?`,
      'This will remove the selected items from your recipe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            selectedIngredientIds.forEach((id) => draft.removeIngredient(id));
            exitEditMode();
          },
        },
      ],
    );
  }

  // ── Draft bootstrap ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (isEditing && editingId) {
        if (draft.draft?.mode === 'edit' && draft.draft.editingRecipeId === editingId) {
          setLoadingInitial(false);
          return;
        }
        const r = await getRecipe(editingId);
        if (r) draft.startEdit(r);
        setLoadingInitial(false);
      } else {
        if (!draft.draft) draft.startNew();
        setLoadingInitial(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingId]);

  async function handleSave() {
    if (!session?.user?.id) return;
    if (!draft.canSave) {
      Alert.alert('Cannot save', 'Add a name and at least one ingredient.');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingId) {
        const ok = await draft.saveAsUpdate();
        if (ok) router.back();
        else Alert.alert('Save failed', 'Please try again.');
      } else {
        const id = await draft.save(session.user.id);
        if (id) {
          router.replace('/(tabs)/recipes' as never);
        } else {
          Alert.alert('Save failed', 'Please try again.');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    if (draft.hasDraft && draft.draft && draft.draft.ingredients.length > 0) {
      Alert.alert(
        'Discard changes?',
        'Your draft recipe will be lost.',
        [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              draft.clear();
              safeBack();
            },
          },
        ],
      );
    } else {
      draft.clear();
      safeBack();
    }
  }

  function handleAddSourceSelected(source: AddSource) {
    setAddSheetOpen(false);
    if (source === 'history') {
      // Full-screen picker (not a Modal) — avoids iOS's double-Modal
      // freeze when presenting one Modal while another is dismissing.
      router.push('/recipes/pick-scan' as never);
    } else if (source === 'search') {
      router.push('/food-search?addToRecipe=1' as never);
    } else if (source === 'scan') {
      router.push('/(tabs)/scanner?addToRecipe=1' as never);
    }
  }

  // ── Cover photo picker ────────────────────────────────────────────────────
  function pickCoverPhoto() {
    const options: any[] = [
      {
        text: 'Take photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Camera access needed', 'Enable camera access in Settings to take a recipe photo.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.8,
          });
          if (!result.canceled) await uploadCoverFromUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 10],
            quality: 0.8,
          });
          if (!result.canceled) await uploadCoverFromUri(result.assets[0].uri);
        },
      },
    ];
    if (draft.draft?.coverImageUrl) {
      options.push({
        text: 'Remove photo',
        onPress: async () => draft.setCoverImageUrl(null),
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Recipe photo', 'Choose how to add a cover photo.', options);
  }

  async function uploadCoverFromUri(localUri: string) {
    if (!session?.user?.id) return;
    setUploadingCover(true);
    try {
      const publicUrl = await uploadRecipeCover(session.user.id, localUri);
      if (publicUrl) {
        draft.setCoverImageUrl(publicUrl);
      } else {
        Alert.alert('Upload failed', 'Could not upload the photo. Please try again.');
      }
    } finally {
      setUploadingCover(false);
    }
  }

  // ── Method step handlers ──────────────────────────────────────────────────
  function handleSaveStep(text: string) {
    if (!draft.draft) return;
    const current = draft.draft.method;
    if (stepEditorIndex === -1 || stepEditorIndex === null) {
      draft.setMethod([...current, text]);
    } else {
      const next = [...current];
      next[stepEditorIndex] = text;
      draft.setMethod(next);
    }
    setStepEditorIndex(null);
  }

  function handleDeleteStep() {
    if (!draft.draft || stepEditorIndex === null || stepEditorIndex < 0) return;
    const next = draft.draft.method.filter((_, i) => i !== stepEditorIndex);
    draft.setMethod(next);
    setStepEditorIndex(null);
  }

  const d = draft.draft;

  if (loadingInitial || !d) {
    return (
      <View style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.secondary} />
        </View>
      </View>
    );
  }

  const editingIngredient = d.ingredients.find((i) => i._localId === quantityEditing);

  // ── Nutrition computation ────────────────────────────────────────────────
  // Per-serving = totals/servings. Per-100g = totals scaled to 100g.
  const perServing = {
    kcal: draft.totals.total_kcal,
    fat: draft.totals.total_fat_g,
    satFat: draft.totals.total_sat_fat_g,
    carbs: draft.totals.total_carbs_g,
    sugars: draft.totals.total_sugars_g,
    fiber: draft.totals.total_fiber_g,
    protein: draft.totals.total_protein_g,
    salt: draft.totals.total_salt_g,
  };
  const per100Factor =
    draft.totalWeightG > 0 ? (d.servings * 100) / draft.totalWeightG : 0;
  const scaleVal = (n: number) =>
    nutritionMode === 'serving' ? n : n * per100Factor;
  const netCarbs = Math.max(0, perServing.carbs - perServing.fiber);

  const showNutrition = d.ingredients.length > 0;

  const stepEditorInitial =
    stepEditorIndex !== null && stepEditorIndex >= 0
      ? d.method[stepEditorIndex] ?? ''
      : '';
  const stepEditorNumber =
    stepEditorIndex !== null && stepEditorIndex >= 0
      ? stepEditorIndex + 1
      : d.method.length + 1;

  const nutriGrade = (draft.nutriscore as NutriscoreGrade | null) ?? null;
  const nutriColor = nutriGrade ? NUTRISCORE_COLORS[nutriGrade] : '#aad4cd';
  const nutriVerdict = nutriGrade ? NUTRISCORE_VERDICT[nutriGrade] : '—';

  return (
    <View style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <NestableScrollContainer
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 140 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero cover ─────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.hero}
            onPress={pickCoverPhoto}
            activeOpacity={0.9}
            disabled={uploadingCover}
          >
            <View style={styles.heroBgWash} />
            {d.coverImageUrl && (
              <Image
                source={{ uri: d.coverImageUrl }}
                style={styles.heroImage}
                resizeMode="cover"
              />
            )}
            {/* "Add cover image" CTA only shows when there is no image yet.
                Once a cover is uploaded we let the photo speak for itself —
                the whole hero remains tappable to replace it. */}
            {!d.coverImageUrl && (
              <View style={styles.heroCta}>
                <View style={styles.heroIconWrap}>
                  {uploadingCover ? (
                    <ActivityIndicator color={Colors.secondary} />
                  ) : (
                    <Ionicons name="image-outline" size={40} color={Colors.secondary} />
                  )}
                </View>
                <Text style={styles.heroCtaText}>
                  {uploadingCover ? 'Uploading…' : 'Add cover image'}
                </Text>
              </View>
            )}
            {uploadingCover && d.coverImageUrl && (
              <View style={styles.heroUploadingOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Floating back + cover-photo buttons over the hero
              (Figma node 4834:26085). Both pinned to the safe-area
              top + 12px, 16px from the screen edges. */}
          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnLeft, { top: insets.top + 12 }]}
            onPress={handleDiscard}
            activeOpacity={0.85}
            hitSlop={8}
          >
            <ArrowLeftIcon width={18} height={14} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnRight, { top: insets.top + 12 }]}
            onPress={pickCoverPhoto}
            activeOpacity={0.85}
            disabled={uploadingCover}
            hitSlop={8}
          >
            {uploadingCover ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <GalleryAddIcon width={22} height={22} />
            )}
          </TouchableOpacity>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <View style={styles.body}>
            <Text style={styles.pageTitle}>
              {isEditing ? 'Edit recipe' : 'Create a new recipe'}
            </Text>

            {/* ── Recipe name + Servings ──────────────────────────────── */}
            <View style={styles.group16}>
              <View style={styles.group16}>
                <Text style={styles.h4}>Recipe name</Text>
                <TextInput
                  style={styles.input}
                  value={d.name}
                  onChangeText={draft.setName}
                  placeholder="Like ‘Garlic & Herb Chicken Salad’?"
                  placeholderTextColor="rgba(2,52,50,0.5)"
                  returnKeyType="done"
                />
              </View>

              {/* Servings inline card */}
              <View style={styles.inlineCard}>
                <View style={styles.inlineCardLeft}>
                  <Text style={styles.h5}>Servings</Text>
                  <Text style={styles.bodySmall}>
                    How many people does this recipe feed?
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => draft.setServings(Math.max(1, d.servings - 1))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={16} color={Colors.secondary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValue}>{d.servings}</Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => draft.setServings(d.servings + 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* ── Live Nutrition ──────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionTitleBlock}>
                <Text style={styles.h4}>Live Nutrition</Text>
                <Text style={styles.bodySmall}>
                  These nutrition values come from the ingredients you added to your recipe.
                </Text>
              </View>

              {/* Per serving / Per 100g pill tabs */}
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  onPress={() => setNutritionMode('serving')}
                  activeOpacity={0.85}
                  style={[
                    styles.modeTab,
                    nutritionMode === 'serving' && styles.modeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      nutritionMode === 'serving' && styles.modeTabTextActive,
                    ]}
                  >
                    Per serving
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setNutritionMode('per100')}
                  activeOpacity={0.85}
                  style={[
                    styles.modeTab,
                    nutritionMode === 'per100' && styles.modeTabActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeTabText,
                      nutritionMode === 'per100' && styles.modeTabTextActive,
                    ]}
                  >
                    Per 100g
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Nutrition rows */}
              {showNutrition ? (
                <View style={styles.nutritionRows}>
                  <NutritionRow
                    Icon={FOOD_ICONS.calories}
                    label="Calories"
                    value={formatKcal(scaleVal(perServing.kcal))}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.fat}
                    label="Fat"
                    value={`${formatGrams(scaleVal(perServing.fat))}g`}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.satFat}
                    label="Saturated Fat"
                    value={`${formatGrams(scaleVal(perServing.satFat))}g`}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.carbs}
                    label="Carbohydrates"
                    value={`${formatGrams(scaleVal(perServing.carbs))}g`}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.sugars}
                    label="Sugars"
                    value={`${formatGrams(scaleVal(perServing.sugars))}g`}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.fiber}
                    label="Fiber"
                    value={`${formatGrams(scaleVal(perServing.fiber))}g`}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.netCarbs}
                    label="Net Carbs"
                    value={`${formatGrams(scaleVal(netCarbs))}g`}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.protein}
                    label="Protein"
                    value={`${formatGrams(scaleVal(perServing.protein))}g`}
                  />
                  <NutritionRow
                    Icon={FOOD_ICONS.salt}
                    label="Salt"
                    value={`${formatGrams(scaleVal(perServing.salt))}g`}
                  />
                </View>
              ) : (
                <View style={styles.nutritionEmpty}>
                  <Text style={styles.nutritionEmptyText}>
                    Add ingredients to see live nutrition.
                  </Text>
                </View>
              )}

              {/* Estimated Nutri-score */}
              <View style={styles.nutriBlock}>
                <Text style={styles.h5}>Estimated Nutri-score</Text>
                <View style={styles.nutriCard}>
                  <View style={[styles.verdictPill, { backgroundColor: nutriColor }]}>
                    <Text style={styles.verdictText}>{nutriVerdict}</Text>
                  </View>
                  <View style={styles.scaleRow}>
                    {GRADES.map((g) => {
                      const isActive = g === nutriGrade;
                      return (
                        <View
                          key={g}
                          style={[
                            styles.gradePill,
                            { backgroundColor: NUTRISCORE_COLORS[g] },
                            isActive ? styles.gradePillActive : styles.gradePillInactive,
                            // E in Figma has no white border
                            g === 'e' && !isActive ? { borderWidth: 0 } : null,
                          ]}
                        >
                          <Text style={styles.gradeText}>{g.toUpperCase()}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>

            {/* ── Ingredients ─────────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.h4}>Ingredients</Text>
                  <View style={styles.countRow}>
                    <Text style={styles.bodySmall}>Your recipe contains</Text>
                    <Text style={styles.countBold}>
                      {d.ingredients.length}{' '}
                      {d.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
                    </Text>
                  </View>
                  {d.ingredients.length > 0 && (
                    <TouchableOpacity
                      style={styles.inlineCtrl}
                      onPress={() =>
                        ingredientsEditMode ? exitEditMode() : setIngredientsEditMode(true)
                      }
                      activeOpacity={0.7}
                    >
                      {ingredientsEditMode ? (
                        <Ionicons name="close" size={16} color={Colors.secondary} />
                      ) : (
                        <ActionPenIcon color={Colors.secondary} size={18} />
                      )}
                      <Text style={styles.inlineCtrlText}>
                        {ingredientsEditMode ? 'Cancel' : 'Edit ingredients'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.squareAddBtn}
                  onPress={() => setAddSheetOpen(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {d.ingredients.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyCard}
                  onPress={() => setAddSheetOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyCardText}>Add an ingredient</Text>
                </TouchableOpacity>
              ) : ingredientsEditMode ? (
                <NestableDraggableFlatList
                  data={d.ingredients}
                  keyExtractor={(ing) => ing._localId}
                  onDragEnd={({ from, to }) => {
                    if (from !== to) draft.reorderIngredient(from, to);
                  }}
                  activationDistance={10}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  containerStyle={styles.ingList}
                  renderItem={({ item: ing, drag, isActive }: RenderItemParams<typeof d.ingredients[number]>) => {
                    const selected = selectedIngredientIds.has(ing._localId);
                    return (
                      <ScaleDecorator>
                        <View style={[styles.ingEditWrap, isActive && styles.ingRowActive]}>
                          <View style={[styles.ingRow, styles.ingRowFlex]}>
                            <TouchableOpacity
                              style={[styles.checkbox, selected && styles.checkboxChecked]}
                              onPress={() => toggleIngredientSelected(ing._localId)}
                              activeOpacity={0.7}
                            >
                              {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
                            </TouchableOpacity>
                            <View style={styles.ingThumb}>
                              {ing.product_snapshot.image_url ? (
                                <Image
                                  source={{ uri: ing.product_snapshot.image_url }}
                                  style={styles.ingThumbImage}
                                  resizeMode="cover"
                                />
                              ) : (
                                <View style={styles.ingThumbNoImage}>
                                  <Ionicons name="image-outline" size={16} color="#aad4cd" />
                                  <Text style={styles.ingThumbNoImageText}>No image</Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.ingInfo}>
                              {ing.product_snapshot.brand && (
                                <Text style={styles.ingBrand} numberOfLines={1}>
                                  {ing.product_snapshot.brand}
                                </Text>
                              )}
                              <Text style={styles.ingName} numberOfLines={1}>
                                {ing.product_snapshot.product_name}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.ingQty}
                              onPress={() => setQuantityEditing(ing._localId)}
                              activeOpacity={0.75}
                            >
                              <Text style={styles.ingQtyText}>
                                {formatQuantity(ing.quantity_value, ing.quantity_unit)}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.ingDeleteGlyph}
                              onPress={() => draft.removeIngredient(ing._localId)}
                              activeOpacity={0.7}
                              hitSlop={8}
                            >
                              <Ionicons name="trash-outline" size={20} color={Colors.secondary} />
                            </TouchableOpacity>
                          </View>
                          {/* Drag handle — long-press (or press-in on Android)
                              begins the reorder gesture via DraggableFlatList. */}
                          <TouchableOpacity
                            style={styles.gripBtn}
                            onLongPress={drag}
                            delayLongPress={150}
                            disabled={isActive}
                            activeOpacity={0.6}
                            hitSlop={8}
                          >
                            <Ionicons name="reorder-three-outline" size={22} color={Colors.secondary} />
                          </TouchableOpacity>
                        </View>
                      </ScaleDecorator>
                    );
                  }}
                />
              ) : (
                <View style={styles.ingList}>
                  {d.ingredients.map((ing) => (
                    <View key={ing._localId} style={styles.ingRow}>
                      <View style={styles.ingThumb}>
                        {ing.product_snapshot.image_url ? (
                          <Image
                            source={{ uri: ing.product_snapshot.image_url }}
                            style={styles.ingThumbImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.ingThumbNoImage}>
                            <Ionicons name="image-outline" size={16} color="#aad4cd" />
                            <Text style={styles.ingThumbNoImageText}>No image</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.ingInfo}>
                        {ing.product_snapshot.brand && (
                          <Text style={styles.ingBrand} numberOfLines={1}>
                            {ing.product_snapshot.brand}
                          </Text>
                        )}
                        <Text style={styles.ingName} numberOfLines={1}>
                          {ing.product_snapshot.product_name}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.ingQty}
                        onPress={() => setQuantityEditing(ing._localId)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.ingQtyText}>
                          {formatQuantity(ing.quantity_value, ing.quantity_unit)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Edit-mode action footer — shown only once at least one
                  ingredient is selected via the row checkbox. The header's
                  'Cancel' control already handles exiting edit mode without
                  a selection, so we don't need a second cancel here. */}
              {ingredientsEditMode && selectedIngredientIds.size > 0 && (
                <View style={styles.ingEditFooter}>
                  <TouchableOpacity
                    style={styles.deleteSelectedBtn}
                    onPress={handleDeleteSelected}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.deleteSelectedText}>
                      Delete {selectedIngredientIds.size} selected
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ── Process ─────────────────────────────────────────────── */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.h4}>Process</Text>
                  <Text style={styles.bodySmall}>
                    How do you make this awesome recipe?
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.squareAddBtn}
                  onPress={() => setStepEditorIndex(-1)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {d.method.length === 0 ? (
                <TouchableOpacity
                  style={styles.emptyCard}
                  onPress={() => setStepEditorIndex(-1)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyCardText}>Add a step</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.stepList}>
                  {d.method.map((step, idx) => (
                    <TouchableOpacity
                      key={`${idx}-${step.slice(0, 12)}`}
                      style={styles.stepCard}
                      onPress={() => setStepEditorIndex(idx)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.stepTitle}>Step {idx + 1}</Text>
                      <Text style={styles.stepBody}>{step}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </NestableScrollContainer>

        {/* ── Sticky footer ──────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.discardBtn}
            onPress={handleDiscard}
            activeOpacity={0.85}
          >
            <Text style={styles.discardBtnText}>Discard</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, !draft.canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!draft.canSave || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Save changes' : 'Save recipe'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Sheets */}
      <AddIngredientSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onPick={handleAddSourceSelected}
      />
      <QuantityPickerSheet
        visible={Boolean(editingIngredient)}
        value={editingIngredient?.quantity_value ?? 100}
        unit={editingIngredient?.quantity_unit ?? 'g'}
        onClose={() => setQuantityEditing(null)}
        onSave={(value, unit) => {
          if (quantityEditing) {
            draft.updateIngredient(quantityEditing, {
              quantity_value: value,
              quantity_unit: unit,
            });
          }
          setQuantityEditing(null);
        }}
      />
      <StepEditorSheet
        visible={stepEditorIndex !== null}
        onClose={() => setStepEditorIndex(null)}
        onSave={handleSaveStep}
        onDelete={stepEditorIndex !== null && stepEditorIndex >= 0 ? handleDeleteStep : undefined}
        initialText={stepEditorInitial}
        stepNumber={stepEditorNumber}
      />
    </View>
  );
}

// ─── Small presentational pieces ─────────────────────────────────────────────
function NutritionRow({
  Icon,
  label,
  value,
}: {
  Icon: SvgIcon;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.nRow}>
      <View style={styles.nIconWrap}>
        <Icon width={24} height={24} />
      </View>
      <Text style={styles.nLabel}>{label}</Text>
      <Text style={styles.nValue}>{value}</Text>
    </View>
  );
}

// ─── Formatting helpers ─────────────────────────────────────────────────────
function formatGrams(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n >= 10) return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
}

function formatKcal(kcal: number): string {
  if (!Number.isFinite(kcal)) return '0 kcal';
  const kj = Math.round(kcal * 4.184);
  return `${kj} kJ (${Math.round(kcal)} kcal)`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.secondary },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    width: '100%',
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroBgWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e2f1ee',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5, // soft-light-ish feel on top of the teal wash
  },
  heroCta: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    opacity: 0.5,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    textAlign: 'center',
    letterSpacing: -0.28,
    lineHeight: 17,
  },
  // Semi-transparent overlay shown only while a replacement cover is uploading
  heroUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Floating back button (Figma: bg rgba(255,255,255,0.7), 1px white border, 16 radius, level 3)
  headerBtn: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  headerBtnLeft: { left: 16 },
  headerBtnRight: { right: 16 },

  // ── Body ────────────────────────────────────────────────────────────────
  body: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -16, // overlap the hero slightly — matches the detail screen
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 32,
  },
  pageTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },

  // Typography helpers
  h4: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  h5: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },

  // Grouping helpers
  group16: { gap: 16 },
  section: { gap: 16 },
  sectionTitleBlock: { gap: 4 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sectionHeaderText: { flex: 1, gap: 4 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 4 },
  countBold: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },

  // Recipe name input
  input: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },

  // Servings inline card (also reused visual pattern)
  inlineCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  inlineCardLeft: { flex: 1, gap: 4 },

  // Stepper: [−] 999 [+]
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e4f1ef',
    borderWidth: 2,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 34,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },

  // Per-serving / Per-100g pill tabs
  modeTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modeTab: {
    height: 30,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeTabActive: {
    backgroundColor: '#e4f1ef',
    borderColor: '#aad4cd',
  },
  modeTabText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  modeTabTextActive: {
    color: Colors.primary,
  },

  // Nutrition rows
  nutritionRows: { gap: 4 },
  nRow: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nIcon: { width: 24, height: 24 },
  nLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  nValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  nutritionEmpty: {
    backgroundColor: '#f5fbfb',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingVertical: Spacing.m,
    alignItems: 'center',
  },
  nutritionEmptyText: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },

  // Nutri-score block
  nutriBlock: { gap: 8 },
  nutriCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verdictPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  verdictText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
  },
  gradePill: {
    width: 24,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  gradePillActive: {},
  gradePillInactive: { opacity: 0.15 },
  gradeText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // 52px teal square + button
  squareAddBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty placeholder card
  emptyCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    letterSpacing: -0.14,
  },

  // Ingredient rows (Figma: 76px tall, #f5fbfb, #aad4cd border, 8 radius)
  ingList: { gap: 8 },
  ingRow: {
    backgroundColor: '#f5fbfb',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    height: 76,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ingThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.m,
    backgroundColor: '#e2f1ee',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ingThumbImage: { width: '100%', height: '100%' },
  ingThumbNoImage: {
    width: 60,
    height: 60,
    borderRadius: Radius.s,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ingThumbNoImageText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#aad4cd',
  },
  ingInfo: { flex: 1, justifyContent: 'center', gap: 2 },
  ingBrand: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  ingName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  ingQty: {
    backgroundColor: '#e4f1ef',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  ingQtyText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    textAlign: 'center',
  },
  ingDeleteGlyph: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inline "Edit ingredients" / "Cancel" controller below the count row
  inlineCtrl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  inlineCtrlText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  // Edit-mode row wrapper with trailing grip
  ingRowActive: {
    opacity: 0.95,
    ...Shadows.level3,
  },
  // Applied to the row when it sits next to the drag handle in edit mode —
  // without flex:1 the row shrinks to content width inside the row-wrapper.
  ingRowFlex: { flex: 1 },
  ingEditWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gripBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Checkbox
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },

  // Edit-mode footer (below the ingredient list)
  ingEditFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  deleteSelectedBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.m,
    backgroundColor: Colors.status.negative,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  deleteSelectedText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
  cancelEditBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.m,
    borderWidth: 2,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  cancelEditText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  // Keep legacy name used by Process step list
  stepList: { gap: 16 },

  // Process step cards
  stepCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: 16,
    gap: 8,
  },
  stepTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  stepBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },

  // ── Footer ──────────────────────────────────────────────────────────────
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
  discardBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  saveBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
