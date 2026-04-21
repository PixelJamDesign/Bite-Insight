/**
 * Recipes tab — MINIMAL PLACEHOLDER UI (design will change 100%)
 *
 * Shows the user's recipe list, an empty state, and an FAB to create a new
 * recipe. Wired to `useRecipes()` with realtime updates. All visuals use
 * existing design tokens but layouts are rough — intentionally replaceable
 * once final designs land.
 */
import { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useRecipes } from '@/lib/useRecipes';
import { NUTRISCORE_COLORS } from '@/lib/nutriscore';
import type { Recipe } from '@/lib/types';

export default function RecipesScreen() {
  const router = useRouter();
  const { recipes, loading, refresh } = useRecipes();

  return (
    <ScreenLayout title="Recipes">
      <View style={styles.content}>
        {/* Placeholder segmented control */}
        <View style={styles.segmented}>
          <View style={[styles.segItem, styles.segActive]}>
            <Text style={styles.segActiveText}>My Recipes</Text>
          </View>
          <View style={[styles.segItem, styles.segLocked]}>
            <View style={styles.plusPill}>
              <Text style={styles.plusPillText}>PLUS</Text>
            </View>
            <Text style={styles.segLockedText}>Community</Text>
          </View>
        </View>

        {loading && recipes.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.secondary} />
          </View>
        ) : recipes.length === 0 ? (
          <EmptyState onCreate={() => router.push('/recipes/new' as never)} />
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(r) => r.id}
            refreshing={loading}
            onRefresh={refresh}
            numColumns={2}
            contentContainerStyle={styles.gridContent}
            columnWrapperStyle={styles.gridRow}
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                onPress={() => router.push(`/recipes/${item.id}` as never)}
              />
            )}
          />
        )}

        {/* FAB — only show when there are recipes */}
        {recipes.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.push('/recipes/new' as never)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </ScreenLayout>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconBg}>
        <Ionicons name="restaurant-outline" size={56} color={Colors.secondary} />
      </View>
      <Text style={styles.emptyTitle}>No recipes yet</Text>
      <Text style={styles.emptyBody}>
        Build recipes from items you've scanned. See full nutrition, Nutri-score, and how the recipe fits everyone in your household.
      </Text>
      <TouchableOpacity style={styles.emptyCta} onPress={onCreate} activeOpacity={0.85}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyCtaText}>Create your first recipe</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const nutriColor = recipe.nutriscore_grade
    ? NUTRISCORE_COLORS[recipe.nutriscore_grade as keyof typeof NUTRISCORE_COLORS]
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardCover}>
        {recipe.cover_image_url ? (
          <Image source={{ uri: recipe.cover_image_url }} style={styles.cardImage} resizeMode="cover" />
        ) : (
          <Ionicons name="restaurant-outline" size={44} color={Colors.accent} />
        )}
        {recipe.nutriscore_grade && nutriColor && (
          <View style={[styles.nutriPill, { borderColor: nutriColor }]}>
            <Text style={[styles.nutriPillText, { color: nutriColor }]}>
              {recipe.nutriscore_grade.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={2}>{recipe.name}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardKcal}>
            {recipe.total_kcal != null ? `${recipe.total_kcal} kcal` : '—'}
          </Text>
          <Text style={styles.cardServings}>
            {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: Spacing.s,
  },
  segmented: {
    flexDirection: 'row',
    marginHorizontal: Spacing.s,
    marginBottom: Spacing.s,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.full,
    padding: 4,
    gap: 2,
  },
  segItem: {
    flex: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: Radius.full,
  },
  segActive: {
    backgroundColor: '#fff',
    ...Shadows.level4,
  },
  segLocked: {
    opacity: 0.55,
  },
  segActiveText: {
    ...Typography.label,
    color: Colors.primary,
  },
  segLockedText: {
    ...Typography.label,
    color: Colors.secondary,
    fontSize: 12,
  },
  plusPill: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  plusPillText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.m,
    paddingBottom: 100,
    gap: Spacing.s,
  },
  emptyIconBg: {
    width: 96,
    height: 96,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.s,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyBody: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: Spacing.s,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.m,
    paddingVertical: 14,
    borderRadius: Radius.m,
    ...Shadows.level3,
  },
  emptyCtaText: {
    ...Typography.h5,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
  },

  // Grid
  gridContent: {
    paddingHorizontal: Spacing.s,
    paddingBottom: 140,
    gap: 12,
  },
  gridRow: {
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    overflow: 'hidden',
    ...Shadows.level4,
  },
  cardCover: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  nutriPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriPillText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },
  cardInfo: {
    padding: 12,
    gap: 4,
  },
  cardName: {
    ...Typography.h6,
    color: Colors.primary,
    minHeight: 36,
  },
  cardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardKcal: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accent,
    fontFamily: 'Figtree_700Bold',
  },
  cardServings: {
    fontSize: 11,
    fontWeight: '300',
    color: Colors.secondary,
    fontFamily: 'Figtree_300Light',
  },

  // FAB
  fab: {
    position: 'absolute',
    right: Spacing.m,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level2,
  },
});
