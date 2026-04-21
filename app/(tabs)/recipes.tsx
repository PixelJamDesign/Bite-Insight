/**
 * Recipes tab — first-screen implementation from Figma node 4788-11615.
 *
 * Layout:
 *   Header (ScreenLayout)
 *   Page title block: "Recipes" + filter tabs + recipe count
 *   Main area: recipe grid when populated, friendly empty state otherwise
 *   Sticky bottom CTA (gradient fade) — "Create your first recipe" when empty,
 *   "+ New recipe" when recipes exist
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { ScreenLayout } from '@/components/ScreenLayout';
import { PlusBadge } from '@/components/PlusBadge';
import { useRecipes } from '@/lib/useRecipes';
import { NUTRISCORE_COLORS } from '@/lib/nutriscore';
import type { Recipe } from '@/lib/types';

type TabKey = 'my' | 'community';

export default function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes, loading, refresh } = useRecipes();
  const [activeTab, setActiveTab] = useState<TabKey>('my');

  const isEmpty = recipes.length === 0;

  const titleExtension = (
    <View style={styles.titleExtension}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.tabActive]}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'my' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            My recipes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'community' && styles.tabActive]}
          onPress={() => setActiveTab('community')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'community' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Community recipes
          </Text>
          <PlusBadge size="small" />
        </TouchableOpacity>
      </View>

      {/* Recipe count */}
      <View style={styles.countRow}>
        <Text style={styles.countPrefix}>Currently you have</Text>
        <Text style={styles.countValue}>
          {recipes.length} {recipes.length === 1 ? 'recipe' : 'recipes'}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenLayout title="Recipes" headerExtension={titleExtension}>
      <View style={styles.root}>
        {/* Main area */}
        {loading && isEmpty ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.secondary} />
          </View>
        ) : activeTab === 'community' ? (
          <CommunityComingSoon />
        ) : isEmpty ? (
          <EmptyState />
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

        {/* Sticky footer CTA — only visible on the My Recipes tab */}
        {activeTab === 'my' && (
          <View style={[styles.footerWrap, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
            <LinearGradient
              colors={[
                'rgba(226,241,238,0)',
                Colors.background,
                Colors.background,
              ]}
              locations={[0, 0.24, 1]}
              style={styles.footerGradient}
              pointerEvents="none"
            />
            <TouchableOpacity
              style={styles.footerCta}
              onPress={() => router.push('/recipes/new' as never)}
              activeOpacity={0.85}
            >
              <Text style={styles.footerCtaText}>
                {isEmpty ? 'Create your first recipe' : '+ New recipe'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScreenLayout>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="restaurant-outline" size={36} color={Colors.secondary} />
        </View>
        {/* Subtle ring around the icon to match the Figma double-ring treatment */}
        <View style={styles.emptyIconRing} pointerEvents="none" />
      </View>
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>No recipes in your recipe book</Text>
        <Text style={styles.emptyBody}>
          Create recipes from the foods you've scanned, with clear nutrition info,
          Nutri-Score, and insights tailored to you.
        </Text>
      </View>
    </View>
  );
}

// ── Community Coming Soon ────────────────────────────────────────────────────

function CommunityComingSoon() {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="people-outline" size={36} color={Colors.secondary} />
        </View>
        <View style={styles.emptyIconRing} pointerEvents="none" />
      </View>
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>Community recipes are coming soon</Text>
        <Text style={styles.emptyBody}>
          Share your own recipes and discover ones from people with similar
          health conditions, allergies and dietary preferences. Available to
          Plus subscribers soon.
        </Text>
      </View>
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
          <Image
            source={{ uri: recipe.cover_image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
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
  root: {
    flex: 1,
  },

  // Sits right under the "Recipes" title from ScreenLayout
  titleExtension: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.s,
  },

  // Filter tabs row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  tab: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#e4f1ef',
    borderColor: '#aad4cd',
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  tabLabelInactive: {
    color: Colors.secondary,
  },

  // Count row
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: Spacing.xs,
  },
  countPrefix: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  countValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state (shared by My Recipes empty + Community Coming Soon)
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m + Spacing.m, // matches Figma inner margin
    paddingBottom: 160, // clear the footer CTA area
  },
  emptyIconOuter: {
    width: 73,
    height: 73,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  emptyIconInner: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconRing: {
    position: 'absolute',
    width: 73,
    height: 73,
    borderRadius: 36.5,
    borderWidth: 2,
    borderColor: Colors.secondary,
    opacity: 0.2,
  },
  emptyText: {
    alignItems: 'center',
    gap: Spacing.m,
    width: '100%',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 30,
  },
  emptyBody: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    maxWidth: 260,
  },

  // Grid
  gridContent: {
    paddingHorizontal: Spacing.s,
    paddingTop: Spacing.s,
    paddingBottom: 140,
    gap: 12,
  },
  gridRow: { gap: 12 },
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
  cardImage: { width: '100%', height: '100%' },
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
  cardInfo: { padding: 12, gap: 4 },
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

  // Sticky footer CTA
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.m,
    paddingTop: 60, // space taken by the gradient fade
  },
  footerGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  footerCta: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  footerCtaText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: 0,
    lineHeight: 20,
  },
});
