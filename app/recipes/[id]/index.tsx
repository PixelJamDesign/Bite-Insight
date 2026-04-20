/**
 * Recipe Detail — MINIMAL PLACEHOLDER UI (design will change 100%)
 *
 * Shows a saved recipe with nutrition totals, Nutri-score, household
 * impact table, and action bar.
 */
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
import { deleteRecipe, duplicateRecipe } from '@/lib/recipes';
import { useAuth } from '@/lib/auth';
import {
  NUTRISCORE_COLORS,
  NUTRISCORE_VERDICT,
  type NutriscoreGrade,
} from '@/lib/nutriscore';
import { formatQuantity } from '@/constants/quantityUnits';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { safeBack } from '@/lib/safeBack';
import type { HouseholdImpactRow } from '@/lib/types';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { recipe, loading, household } = useRecipe(id);

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
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {currentRecipe.cover_image_url ? (
            <Image source={{ uri: currentRecipe.cover_image_url }} style={styles.heroImage} />
          ) : (
            <Ionicons name="restaurant-outline" size={96} color={Colors.accent} />
          )}
          <TouchableOpacity
            style={[styles.heroBack, { top: insets.top + 8 }]}
            onPress={() => safeBack()}
          >
            <Ionicons name="chevron-back" size={22} color={Colors.primary} />
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
          {/* Nutrition rows */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nutrition per serving</Text>
          </View>

          <View style={styles.nutrRows}>
            <NutrRow label="Calories" value={`${currentRecipe.total_kcal ?? 0}`} />
            <NutrRow label="Protein" value={`${currentRecipe.total_protein_g ?? 0}g`} />
            <NutrRow label="Carbs" value={`${currentRecipe.total_carbs_g ?? 0}g`} />
            <NutrRow label="Fat" value={`${currentRecipe.total_fat_g ?? 0}g`} />
            <NutrRow label="Sat Fat" value={`${currentRecipe.total_sat_fat_g ?? 0}g`} />
            <NutrRow label="Sugars" value={`${currentRecipe.total_sugars_g ?? 0}g`} />
            <NutrRow label="Fibre" value={`${currentRecipe.total_fiber_g ?? 0}g`} />
            <NutrRow label="Salt" value={`${currentRecipe.total_salt_g ?? 0}g`} />
          </View>

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
            <View key={ing.id} style={styles.ingRow}>
              <View style={styles.ingThumb}>
                {ing.product_snapshot.image_url ? (
                  <Image
                    source={{ uri: ing.product_snapshot.image_url }}
                    style={styles.ingThumbImage}
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
              <Text style={styles.ingQty}>
                {formatQuantity(Number(ing.quantity_value), ing.quantity_unit)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => router.push(`/recipes/${currentRecipe.id}/edit` as never)}
        >
          <Ionicons name="pencil-outline" size={20} color={Colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDuplicate}>
          <Ionicons name="copy-outline" size={20} color={Colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.status.negative} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function NutrRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutrRow}>
      <Text style={styles.nutrRowLabel}>{label}</Text>
      <Text style={styles.nutrRowValue}>{value}</Text>
    </View>
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
  nutrRows: { gap: 4 },
  nutrRow: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  nutrRowLabel: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  nutrRowValue: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },

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

  // Action bar
  actionBar: {
    flexDirection: 'row',
    gap: 10,
    padding: Spacing.s,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(170, 212, 205, 0.4)',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    ...Shadows.level4,
  },
});
