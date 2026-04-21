/**
 * Recipe Builder — reads/writes the DraftRecipeContext.
 *
 * For NEW recipes: if there's no draft, we call startNew() on mount so
 * state is available. If there IS already a draft (e.g. user was adding
 * ingredients via scan-result or search pick mode), we keep it.
 *
 * For EDIT mode (?id=<id>): if the draft is already for this recipe, we
 * keep it; otherwise we hydrate from the DB.
 *
 * UI is intentionally minimal — design will be replaced.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useDraftRecipe } from '@/lib/draftRecipeContext';
import { getRecipe, snapshotFromScanAsync } from '@/lib/recipes';
import { formatQuantity } from '@/constants/quantityUnits';
import { NUTRISCORE_COLORS } from '@/lib/nutriscore';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import type { Scan } from '@/lib/types';
import { ScanPickerSheet } from '@/components/ScanPickerSheet';
import { QuantityPickerSheet } from '@/components/QuantityPickerSheet';
import { AddIngredientSheet, type AddSource } from '@/components/AddIngredientSheet';
import { safeBack } from '@/lib/safeBack';

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
  const [scanPickerOpen, setScanPickerOpen] = useState(false);
  const [quantityEditing, setQuantityEditing] = useState<string | null>(null);

  // ── Draft bootstrap ───────────────────────────────────────────────────────
  // On mount, ensure we have the right kind of draft for the route we're on.
  useEffect(() => {
    (async () => {
      if (isEditing && editingId) {
        // Edit mode — if the existing draft is already for this recipe, keep it.
        // Otherwise hydrate from DB into a fresh edit draft.
        if (draft.draft?.mode === 'edit' && draft.draft.editingRecipeId === editingId) {
          setLoadingInitial(false);
          return;
        }
        const r = await getRecipe(editingId);
        if (r) draft.startEdit(r);
        setLoadingInitial(false);
      } else {
        // New recipe mode — if a draft already exists (user came in from
        // scan-result / pick mode), keep it. Otherwise start fresh.
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

  function handleCancel() {
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

  async function handleAddScan(scan: Scan) {
    const snapshot = await snapshotFromScanAsync(scan);
    draft.addIngredient({
      barcode: scan.barcode,
      scan_id: scan.id,
      quantity_value: 100,
      quantity_unit: 'g',
      quantity_display: null,
      product_snapshot: snapshot,
    });
    setScanPickerOpen(false);
  }

  function handleAddSourceSelected(source: AddSource) {
    setAddSheetOpen(false);
    if (source === 'history') {
      setTimeout(() => setScanPickerOpen(true), 180);
    } else if (source === 'search') {
      // Navigate to food search in pick mode — screen reads addToRecipe=1
      // query param and adds selected items to the draft via context.
      router.push('/food-search?addToRecipe=1' as never);
    } else if (source === 'scan') {
      router.push('/(tabs)/scanner?addToRecipe=1' as never);
    }
  }

  const d = draft.draft;

  if (loadingInitial || !d) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  const editingIngredient = d.ingredients.find((i) => i._localId === quantityEditing);
  const nutriColor = draft.nutriscore
    ? NUTRISCORE_COLORS[draft.nutriscore as keyof typeof NUTRISCORE_COLORS]
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={handleCancel} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit recipe' : 'New recipe'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name + Servings */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Recipe name</Text>
            <TextInput
              style={styles.input}
              value={d.name}
              onChangeText={draft.setName}
              placeholder="e.g. Chicken & rice bowl"
              placeholderTextColor="#99b8b3"
              returnKeyType="done"
            />

            <Text style={[styles.fieldLabel, { marginTop: Spacing.s }]}>Servings</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => draft.setServings(Math.max(1, d.servings - 1))}
              >
                <Ionicons name="remove" size={22} color={Colors.secondary} />
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperNumber}>{d.servings}</Text>
                <Text style={styles.stepperUnit}>
                  {d.servings === 1 ? 'serving' : 'servings'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => draft.setServings(d.servings + 1)}
              >
                <Ionicons name="add" size={22} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Nutrition Preview */}
          {d.ingredients.length > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Live nutrition</Text>
                <Text style={styles.previewPer}>per serving</Text>
              </View>
              <View style={styles.previewStats}>
                <PreviewStat label="Kcal" value={String(draft.totals.total_kcal)} />
                <PreviewStat label="Protein" value={`${draft.totals.total_protein_g}g`} />
                <PreviewStat label="Carbs" value={`${draft.totals.total_carbs_g}g`} />
                <PreviewStat label="Fat" value={`${draft.totals.total_fat_g}g`} />
              </View>
              {draft.nutriscore && nutriColor && (
                <View style={styles.previewNutriRow}>
                  <Text style={styles.previewNutriLabel}>Estimated Nutri-score</Text>
                  <View style={[styles.nutriBadge, { backgroundColor: nutriColor }]}>
                    <Text style={styles.nutriBadgeText}>{draft.nutriscore.toUpperCase()}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Ingredients section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <TouchableOpacity
                style={styles.sectionAddBtn}
                onPress={() => setAddSheetOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={22} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionCount}>
              {d.ingredients.length} {d.ingredients.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

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
                  <Ionicons name="nutrition-outline" size={20} color={Colors.secondary} />
                )}
              </View>
              <View style={styles.ingInfo}>
                <Text style={styles.ingName} numberOfLines={1}>
                  {ing.product_snapshot.product_name}
                </Text>
                {ing.product_snapshot.brand && (
                  <Text style={styles.ingBrand} numberOfLines={1}>
                    {ing.product_snapshot.brand}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.ingQty}
                onPress={() => setQuantityEditing(ing._localId)}
              >
                <Text style={styles.ingQtyText}>
                  {formatQuantity(ing.quantity_value, ing.quantity_unit)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ingRemove}
                onPress={() => draft.removeIngredient(ing._localId)}
              >
                <Ionicons name="close" size={18} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          ))}

          {d.ingredients.length === 0 && (
            <TouchableOpacity
              style={styles.addIngBtn}
              onPress={() => setAddSheetOpen(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={22} color={Colors.secondary} />
              <Text style={styles.addIngBtnText}>Add an ingredient</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Save bar */}
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.85}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
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
      <ScanPickerSheet
        visible={scanPickerOpen}
        onClose={() => setScanPickerOpen(false)}
        onPick={handleAddScan}
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
    </SafeAreaView>
  );
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.previewStatItem}>
      <Text style={styles.previewStatValue}>{value}</Text>
      <Text style={styles.previewStatLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.tertiary,
  },
  headerTitle: {
    ...Typography.h5,
    color: Colors.primary,
  },

  scroll: { padding: Spacing.s, paddingBottom: 140, gap: Spacing.s },

  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: Spacing.s,
    ...Shadows.level4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  stepperNumber: { ...Typography.h3, color: Colors.primary },
  stepperUnit: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },

  previewCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.l,
    padding: Spacing.s + 2,
    ...Shadows.level4,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
  },
  previewPer: {
    fontSize: 11,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
  },
  previewStats: { flexDirection: 'row', gap: 8 },
  previewStatItem: { flex: 1 },
  previewStatValue: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.36,
  },
  previewStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#aad4cd',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  previewNutriRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(170, 212, 205, 0.2)',
  },
  previewNutriLabel: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
  },
  nutriBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },

  sectionHeader: { paddingHorizontal: 4, marginTop: Spacing.xs, gap: 2 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { ...Typography.h4, color: Colors.primary },
  sectionAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level4,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.accent,
  },

  ingRow: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: 10,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadows.level4,
  },
  ingThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ingThumbImage: {
    width: '100%',
    height: '100%',
  },
  ingInfo: { flex: 1, gap: 2 },
  ingName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  ingBrand: {
    fontSize: 11,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  ingQty: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ingQtyText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  ingRemove: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  addIngBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#aad4cd',
    paddingVertical: 14,
  },
  addIngBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  saveBar: {
    flexDirection: 'row',
    gap: 10,
    padding: Spacing.s,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(170, 212, 205, 0.4)',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  cancelBtnText: {
    ...Typography.h5,
    color: Colors.secondary,
    fontFamily: 'Figtree_700Bold',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    ...Shadows.level3,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    ...Typography.h5,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
  },
});
