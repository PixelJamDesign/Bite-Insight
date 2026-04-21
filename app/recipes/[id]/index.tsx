/**
 * Recipe Detail — MINIMAL PLACEHOLDER UI (design will change 100%)
 *
 * Shows a saved recipe with nutrition totals, Nutri-score, household
 * impact table, and action bar.
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRecipe } from '@/lib/useRecipes';
import { deleteRecipe, duplicateRecipe, computeTotalWeightGrams } from '@/lib/recipes';
import { useAuth } from '@/lib/auth';
import { NutritionTable } from '@/components/NutritionTable';
import type { NutrientKey } from '@/lib/nutrientRatings';
import { NutritionModeToggle, type NutritionMode } from '@/components/NutritionModeToggle';
import { RecipeActionsSheet } from '@/components/RecipeActionsSheet';
import {
  NUTRISCORE_COLORS,
  NUTRISCORE_VERDICT,
  type NutriscoreGrade,
} from '@/lib/nutriscore';
import { formatQuantity } from '@/constants/quantityUnits';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { safeBack } from '@/lib/safeBack';
import type { HouseholdImpactRow, RecipeIngredient } from '@/lib/types';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { recipe, loading, household } = useRecipe(id);
  const [nutritionMode, setNutritionMode] = useState<NutritionMode>('serving');
  const [actionsOpen, setActionsOpen] = useState(false);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.secondary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>Recipe not found</Text>
          <TouchableOpacity
            onPress={() => safeBack()}
            style={styles.backInlineBtn}
          >
            <Text style={styles.backInlineBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Capture non-null recipe for use in handlers below
  const currentRecipe = recipe;
  const grade = currentRecipe.nutriscore_grade as NutriscoreGrade | null;
  const grades: NutriscoreGrade[] = ['a', 'b', 'c', 'd', 'e'];

  // ── Compute per-100g values from per-serving totals ─────────────────────
  // Per-serving × servings ÷ (totalWeight / 100) = per 100g.
  const totalWeightG = computeTotalWeightGrams(currentRecipe.ingredients);
  const toPer100 = (perServing: number | null | undefined): number | null => {
    if (perServing == null || totalWeightG <= 0) return null;
    return (perServing * currentRecipe.servings) / (totalWeightG / 100);
  };
  const per100g: Partial<Record<NutrientKey, number | null>> = {
    energyKcal: toPer100(currentRecipe.total_kcal),
    fat: toPer100(currentRecipe.total_fat_g),
    saturatedFat: toPer100(currentRecipe.total_sat_fat_g),
    carbs: toPer100(currentRecipe.total_carbs_g),
    sugars: toPer100(currentRecipe.total_sugars_g),
    fiber: toPer100(currentRecipe.total_fiber_g),
    proteins: toPer100(currentRecipe.total_protein_g),
    salt: toPer100(currentRecipe.total_salt_g),
  };

  // Per-serving values (as stored on the recipe row)
  const perServingValues: Partial<Record<NutrientKey, number | null>> = {
    energyKcal: currentRecipe.total_kcal,
    fat: currentRecipe.total_fat_g,
    saturatedFat: currentRecipe.total_sat_fat_g,
    carbs: currentRecipe.total_carbs_g,
    sugars: currentRecipe.total_sugars_g,
    fiber: currentRecipe.total_fiber_g,
    proteins: currentRecipe.total_protein_g,
    salt: currentRecipe.total_salt_g,
  };

  async function handleDelete() {
    Alert.alert(
      'Delete recipe',
      `Are you sure you want to delete "${currentRecipe.name}"? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteRecipe(currentRecipe.id);
            if (ok) router.replace('/(tabs)/recipes');
          },
        },
      ],
    );
  }

  async function handleDuplicate() {
    if (!session?.user?.id) return;
    const newId = await duplicateRecipe(session.user.id, currentRecipe.id);
    if (newId) {
      router.replace(`/recipes/${newId}` as never);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {currentRecipe.cover_image_url ? (
            <Image source={{ uri: currentRecipe.cover_image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <Ionicons name="restaurant-outline" size={96} color={Colors.accent} />
          )}
          <TouchableOpacity
            style={[styles.heroBack, { top: insets.top + 8 }]}
            onPress={() => safeBack()}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.heroMenu, { top: insets.top + 8 }]}
            onPress={() => setActionsOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Title card */}
        <View style={styles.titleCard}>
          <Text style={styles.title}>{currentRecipe.name}</Text>
          <View style={styles.titleMeta}>
            <Text style={styles.metaItem}>
              <Text style={styles.metaStrong}>{currentRecipe.servings}</Text> servings
            </Text>
            <Text style={styles.metaItem}>
              <Text style={styles.metaStrong}>{currentRecipe.ingredients.length}</Text> ingredients
            </Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Nutrition section with per-serving / per-100g toggle */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nutrition</Text>
          </View>

          <NutritionModeToggle
            mode={nutritionMode}
            onChange={setNutritionMode}
            servingLabel={`Per serving (${currentRecipe.servings})`}
          />

          {nutritionMode === 'serving' ? (
            <NutritionTable
              valuesPer100g={perServingValues}
              showRating={false}
            />
          ) : (
            <NutritionTable valuesPer100g={per100g} />
          )}

          {/* Nutri-score */}
          {grade && (
            <View style={styles.nutriCard}>
              <View style={styles.nutriHead}>
                <Text style={styles.nutriLabel}>NUTRI-SCORE</Text>
                <Text
                  style={[
                    styles.nutriVerdict,
                    { color: NUTRISCORE_COLORS[grade] },
                  ]}
                >
                  {NUTRISCORE_VERDICT[grade]}
                </Text>
              </View>
              <View style={styles.nutriScale}>
                {grades.map((g) => (
                  <View
                    key={g}
                    style={[
                      styles.nutriGrade,
                      { backgroundColor: NUTRISCORE_COLORS[g] },
                      g === grade ? styles.nutriGradeActive : styles.nutriGradeInactive,
                    ]}
                  >
                    <Text style={styles.nutriGradeText}>{g.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Household impact */}
          {household.impact.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Household impact</Text>
                <Text style={styles.sectionSubtitle}>
                  How this recipe works for everyone
                </Text>
              </View>

              <View style={styles.householdCard}>
                <View style={styles.householdHead}>
                  <Text style={styles.householdHeadText}>
                    {household.impact.length}{' '}
                    {household.impact.length === 1 ? 'member' : 'members'}
                  </Text>
                  {household.summary.anyFlag && (
                    <View style={styles.warningBadge}>
                      <Text style={styles.warningBadgeText}>
                        {household.summary.cautionCount + household.summary.avoidCount}{' '}
                        warning
                        {household.summary.cautionCount + household.summary.avoidCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
                {household.impact.map((row, idx) => (
                  <HouseholdRow key={row.memberId} row={row} last={idx === household.impact.length - 1} />
                ))}
              </View>
            </>
          )}

          {/* Ingredients list */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
          </View>
          {currentRecipe.ingredients.map((ing) => (
            <IngredientRow key={ing.id} ingredient={ing} />
          ))}
        </View>
      </ScrollView>

      {/* Actions sheet (Edit / Duplicate / Delete) — opened via the "…" button in the hero */}
      <RecipeActionsSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        onEdit={() => router.push(`/recipes/${currentRecipe.id}/edit` as never)}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────


/**
 * Tappable ingredient row — opens scan-result for the product, pre-filled
 * with the snapshot data so nutrition loads instantly. Only tappable when
 * we have a barcode to look up; otherwise the row is inert (but still
 * visible).
 */
function IngredientRow({ ingredient: ing }: { ingredient: RecipeIngredient }) {
  const hasBarcode = Boolean(ing.barcode);
  const snap = ing.product_snapshot;
  const n = snap.nutrition_per_100g ?? {};

  function openScanResult() {
    if (!hasBarcode) return;
    router.push({
      pathname: '/scan-result',
      params: {
        scanId: '',
        productName: snap.product_name ?? '',
        brand: snap.brand ?? '',
        imageUrl: snap.image_url ?? '',
        barcode: ing.barcode!,
        quantity: '',
        nutriscoreGrade: snap.nutriscore_grade ?? '',
        energyKcal: n.energy_kcal != null ? String(n.energy_kcal) : '',
        carbs: n.carbs_g != null ? String(n.carbs_g) : '',
        sugars: n.sugars_g != null ? String(n.sugars_g) : '',
        fiber: n.fiber_g != null ? String(n.fiber_g) : '',
        fat: n.fat_g != null ? String(n.fat_g) : '',
        saturatedFat: n.saturated_fat_g != null ? String(n.saturated_fat_g) : '',
        proteins: n.protein_g != null ? String(n.protein_g) : '',
        salt: n.salt_g != null ? String(n.salt_g) : '',
        allergens: (snap.allergens ?? []).join(','),
      },
    });
  }

  const Container = hasBarcode ? TouchableOpacity : View;

  return (
    <Container
      style={styles.ingRow}
      {...(hasBarcode ? { onPress: openScanResult, activeOpacity: 0.85 } : {})}
    >
      <View style={styles.ingThumb}>
        {snap.image_url ? (
          <Image source={{ uri: snap.image_url }} style={styles.ingThumbImage} />
        ) : (
          <Ionicons name="nutrition-outline" size={20} color={Colors.secondary} />
        )}
      </View>
      <View style={styles.ingInfo}>
        <Text style={styles.ingName} numberOfLines={1}>{snap.product_name}</Text>
        {snap.brand && (
          <Text style={styles.ingBrand} numberOfLines={1}>{snap.brand}</Text>
        )}
      </View>
      <Text style={styles.ingQty}>
        {formatQuantity(Number(ing.quantity_value), ing.quantity_unit)}
      </Text>
      {hasBarcode && (
        <Ionicons name="chevron-forward" size={16} color={Colors.secondary} style={styles.ingChevron} />
      )}
    </Container>
  );
}

function HouseholdRow({ row, last }: { row: HouseholdImpactRow; last: boolean }) {
  const color = {
    ok: { bg: '#e8f5e9', text: '#3b9586', dot: '#3b9586' },
    caution: { bg: '#fff4e0', text: '#ff8736', dot: '#ff8736' },
    avoid: { bg: '#ffebec', text: '#ff3f42', dot: '#ff3f42' },
  }[row.status];
  const statusLabel = { ok: 'OK', caution: 'Caution', avoid: 'Avoid' }[row.status];

  return (
    <View style={[styles.hhRow, !last && styles.hhRowDivider]}>
      <View style={styles.hhAvatar}>
        <Text style={styles.hhAvatarText}>
          {row.name.slice(0, 2).toUpperCase()}
        </Text>
      </View>
      <View style={styles.hhInfo}>
        <Text style={styles.hhName}>{row.name}</Text>
        <Text style={styles.hhReason} numberOfLines={2}>
          {row.reasons.length > 0 ? row.reasons.join(' • ') : 'No conflicts found'}
        </Text>
      </View>
      <View style={[styles.hhStatus, { backgroundColor: color.bg }]}>
        <View style={[styles.hhStatusDot, { backgroundColor: color.dot }]} />
        <Text style={[styles.hhStatusText, { color: color.text }]}>{statusLabel}</Text>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: {
    ...Typography.bodyRegular,
    color: Colors.secondary,
  },
  backInlineBtn: {
    padding: 10,
    marginTop: Spacing.s,
  },
  backInlineBtnText: { ...Typography.h5, color: Colors.secondary },

  // Hero
  hero: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroImage: { width: '100%', height: '100%' },
  heroBack: {
    position: 'absolute',
    left: 16,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.level3,
  },
  heroMenu: {
    position: 'absolute',
    right: 16,
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center', justifyContent: 'center',
    ...Shadows.level3,
  },

  // Title card
  titleCard: {
    backgroundColor: Colors.surface.secondary,
    marginHorizontal: Spacing.s,
    marginTop: -20,
    padding: Spacing.s,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    ...Shadows.level4,
  },
  title: { ...Typography.h3, color: Colors.primary },
  titleMeta: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  metaStrong: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },

  content: {
    padding: Spacing.s,
    gap: Spacing.s,
  },

  sectionHeader: { paddingHorizontal: 4, marginTop: 4 },
  sectionTitle: { ...Typography.h4, color: Colors.primary },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    marginTop: 2,
  },

  // Nutrition rows

  // Nutri-score
  nutriCard: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: Spacing.s,
    ...Shadows.level4,
  },
  nutriHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  nutriLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  nutriVerdict: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },
  nutriScale: { flexDirection: 'row', gap: 4 },
  nutriGrade: {
    flex: 1,
    aspectRatio: 24 / 30,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriGradeActive: {
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadows.level2,
  },
  nutriGradeInactive: {
    opacity: 0.15,
  },
  nutriGradeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },

  // Household
  householdCard: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    overflow: 'hidden',
    ...Shadows.level4,
  },
  householdHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  householdHeadText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  warningBadge: {
    backgroundColor: '#fff4e0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  warningBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ff8736',
  },
  hhRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  hhRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surface.tertiary,
  },
  hhAvatar: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  hhAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
  hhInfo: { flex: 1, gap: 2 },
  hhName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  hhReason: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  hhStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  hhStatusDot: {
    width: 6, height: 6,
    borderRadius: 3,
  },
  hhStatusText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },

  // Ingredients
  ingRow: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...Shadows.level4,
  },
  ingThumb: {
    width: 40, height: 40,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  ingThumbImage: { width: '100%', height: '100%' },
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
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  ingChevron: {
    marginLeft: 4,
  },

});
