/**
 * Recipe Builder — MINIMAL PLACEHOLDER UI (design will change 100%)
 *
 * Used for both creating new recipes and editing existing ones. For edit
 * mode, pass `?id=<recipeId>` via the query — the screen loads the existing
 * recipe and uses `saveAsUpdate` instead of `save`.
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { useRecipeBuilder } from '@/lib/useRecipeBuilder';
import { getRecipe, snapshotFromScanAsync } from '@/lib/recipes';
import { supabase } from '@/lib/supabase';
import { formatQuantity } from '@/constants/quantityUnits';
import { NUTRISCORE_COLORS, NUTRISCORE_VERDICT } from '@/lib/nutriscore';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import type { Scan, QuantityUnit } from '@/lib/types';
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

  const builder = useRecipeBuilder();
  const [loadingInitial, setLoadingInitial] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [scanPickerOpen, setScanPickerOpen] = useState(false);
  const [quantityEditing, setQuantityEditing] = useState<string | null>(null);

  // Hydrate from existing recipe if editing
  useEffect(() => {
    if (!isEditing || !editingId) return;
    let mounted = true;
    (async () => {
      const r = await getRecipe(editingId);
      if (mounted && r) builder.hydrateFromRecipe(r);
      if (mounted) setLoadingInitial(false);
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, editingId]);

  async function handleSave() {
    if (!session?.user?.id) return;
    if (!builder.canSave) {
      Alert.alert('Cannot save', 'Add a name and at least one ingredient.');
      return;
    }
    setSaving(true);
    try {
      if (isEditing && editingId) {
        const ok = await builder.saveAsUpdate(editingId);
        if (ok) {
          // Return to the detail view that sent us here
          router.back();
        } else {
          Alert.alert('Save failed', 'Please try again.');
        }
      } else {
        const id = await builder.save(session.user.id);
        if (id) {
          // Return to the Recipes tab — user can tap the new card to see
          // the detail view. Feels more natural than landing on detail
          // with no context of the list.
          router.replace('/(tabs)/recipes' as never);
        } else {
          Alert.alert('Save failed', 'Please try again.');
        }
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleAddScan(scan: Scan) {
    const snapshot = await snapshotFromScanAsync(scan);
    builder.addIngredient({
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
      // Give the add sheet a moment to dismiss before showing the next sheet
      setTimeout(() => setScanPickerOpen(true), 180);
    } else if (source === 'search') {
      Alert.alert(
        'Coming soon',
        'Searching the Open Food Facts database from the recipe builder is on the way. For now, scan the product first or add it from scan history.',
      );
    } else if (source === 'scan') {
      Alert.alert(
        'Coming soon',
        'Scanning a barcode directly from the builder is on the way. For now, scan the product from the Scan tab, then add it from scan history.',
      );
    }
  }

  const editingIngredient = builder.ingredients.find(
    (i) => i._localId === quantityEditing,
  );
  const nutriColor = builder.nutriscore
    ? NUTRISCORE_COLORS[builder.nutriscore as keyof typeof NUTRISCORE_COLORS]
    : null;

  if (loadingInitial) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity
            onPress={() => safeBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
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
          {/* Name */}
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Recipe name</Text>
            <TextInput
              style={styles.input}
              value={builder.name}
              onChangeText={builder.setName}
              placeholder="e.g. Chicken & rice bowl"
              placeholderTextColor="#99b8b3"
              returnKeyType="done"
            />

            <Text style={[styles.fieldLabel, { marginTop: Spacing.s }]}>Servings</Text>
            <View style={styles.stepperRow}>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => builder.setServings(Math.max(1, builder.servings - 1))}
              >
                <Ionicons name="remove" size={22} color={Colors.secondary} />
              </TouchableOpacity>
              <View style={styles.stepperValue}>
                <Text style={styles.stepperNumber}>{builder.servings}</Text>
                <Text style={styles.stepperUnit}>
                  {builder.servings === 1 ? 'serving' : 'servings'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.stepperBtn}
                onPress={() => builder.setServings(builder.servings + 1)}
              >
                <Ionicons name="add" size={22} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Live Nutrition Preview */}
          {builder.ingredients.length > 0 && (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Live nutrition</Text>
                <Text style={styles.previewPer}>per serving</Text>
              </View>
              <View style={styles.previewStats}>
                <PreviewStat label="Kcal" value={String(builder.totals.total_kcal)} />
                <PreviewStat label="Protein" value={`${builder.totals.total_protein_g}g`} />
                <PreviewStat label="Carbs" value={`${builder.totals.total_carbs_g}g`} />
                <PreviewStat label="Fat" value={`${builder.totals.total_fat_g}g`} />
              </View>
              {builder.nutriscore && nutriColor && (
                <View style={styles.previewNutriRow}>
                  <Text style={styles.previewNutriLabel}>Estimated Nutri-score</Text>
                  <View style={[styles.nutriBadge, { backgroundColor: nutriColor }]}>
                    <Text style={styles.nutriBadgeText}>{builder.nutriscore.toUpperCase()}</Text>
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
              {builder.ingredients.length} {builder.ingredients.length === 1 ? 'item' : 'items'}
            </Text>
          </View>

          {builder.ingredients.map((ing) => (
            <View key={ing._localId} style={styles.ingRow}>
              <View style={styles.ingThumb}>
                <Ionicons name="nutrition-outline" size={20} color={Colors.secondary} />
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
                onPress={() => builder.removeIngredient(ing._localId)}
              >
                <Ionicons name="close" size={18} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          ))}

          {/* Add ingredient — only show if list is empty as an affordance */}
          {builder.ingredients.length === 0 && (
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
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => safeBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveBtn, !builder.canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!builder.canSave || saving}
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

      {/* Add ingredient source picker */}
      <AddIngredientSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        onPick={handleAddSourceSelected}
      />

      {/* Scan picker sheet */}
      <ScanPickerSheet
        visible={scanPickerOpen}
        onClose={() => setScanPickerOpen(false)}
        onPick={handleAddScan}
      />

      {/* Quantity picker sheet */}
      <QuantityPickerSheet
        visible={Boolean(editingIngredient)}
        value={editingIngredient?.quantity_value ?? 100}
        unit={editingIngredient?.quantity_unit ?? 'g'}
        onClose={() => setQuantityEditing(null)}
        onSave={(value, unit) => {
          if (quantityEditing) {
            builder.updateIngredient(quantityEditing, {
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

  scroll: {
    padding: Spacing.s,
    paddingBottom: 140,
    gap: Spacing.s,
  },

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
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
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
  stepperValue: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  stepperNumber: {
    ...Typography.h3,
    color: Colors.primary,
  },
  stepperUnit: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },

  // Preview card (dark)
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
  previewStats: {
    flexDirection: 'row',
    gap: 8,
  },
  previewStatItem: {
    flex: 1,
  },
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

  // Section heading
  sectionHeader: {
    paddingHorizontal: 4,
    marginTop: Spacing.xs,
    gap: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.primary,
  },
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

  // Ingredient row
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
  },
  ingInfo: {
    flex: 1,
    gap: 2,
  },
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
  ingRemove: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Add ingredient button
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

  // Save bar
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
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    ...Typography.h5,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
  },
});
