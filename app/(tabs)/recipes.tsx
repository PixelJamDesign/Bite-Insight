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
import { useCallback, useEffect, useState } from 'react';
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
import { useRecipes, usePublicRecipes } from '@/lib/useRecipes';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { NUTRISCORE_COLORS } from '@/lib/nutriscore';
import type { Recipe, PublicRecipe } from '@/lib/types';
import { deriveDietaryTags } from '@/lib/dietaryTags';
import { DietaryTagsRow } from '@/components/DietaryTagsRow';
import LikeThumbIcon from '@/assets/icons/recipe-header/like-thumb.svg';

type TabKey = 'my' | 'community';

export default function RecipesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recipes, loading, refresh } = useRecipes();
  const community = usePublicRecipes();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('my');

  // ── Community-feed like state ─────────────────────────────────────────
  // Set of recipe ids the current user has already liked, plus a local
  // override map for optimistic count adjustments. Tapping the pill
  // updates both immediately, then persists via supabase.
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [likeOverrides, setLikeOverrides] = useState<Record<string, number>>({});

  // Load the user's like rows for any community recipes they're seeing.
  // RLS policy 'Users can see public recipe likes' permits this read.
  useEffect(() => {
    if (!session?.user?.id || community.recipes.length === 0) {
      setLikedIds(new Set());
      return;
    }
    let cancelled = false;
    const ids = community.recipes.map((r) => r.id);
    supabase
      .from('recipe_likes')
      .select('recipe_id')
      .eq('user_id', session.user.id)
      .in('recipe_id', ids)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setLikedIds(new Set(data.map((r) => r.recipe_id as string)));
      });
    return () => { cancelled = true; };
  }, [session?.user?.id, community.recipes]);

  // Toggle a like on a community recipe with optimistic UI. Rolls back
  // on failure. Owners can't reach this — community feed excludes the
  // caller's own recipes.
  const handleToggleFeedLike = useCallback(
    async (recipeId: string) => {
      if (!session?.user?.id) return;
      const wasLiked = likedIds.has(recipeId);
      // Optimistic flip
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.delete(recipeId);
        else next.add(recipeId);
        return next;
      });
      setLikeOverrides((prev) => ({
        ...prev,
        [recipeId]: (prev[recipeId] ?? 0) + (wasLiked ? -1 : 1),
      }));
      try {
        if (wasLiked) {
          await supabase
            .from('recipe_likes')
            .delete()
            .eq('recipe_id', recipeId)
            .eq('user_id', session.user.id);
        } else {
          await supabase
            .from('recipe_likes')
            .insert({ recipe_id: recipeId, user_id: session.user.id });
        }
      } catch (e) {
        console.warn('[recipes] feed like toggle failed:', e);
        // Roll back
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(recipeId);
          else next.delete(recipeId);
          return next;
        });
        setLikeOverrides((prev) => ({
          ...prev,
          [recipeId]: (prev[recipeId] ?? 0) + (wasLiked ? 1 : -1),
        }));
      }
    },
    [likedIds, session?.user?.id],
  );

  const isEmpty = recipes.length === 0;

  // Floating tab bar pill is 60px tall with 32px of gradient padding above
  // and (insets.bottom + 8) below. The CTA sits just above that, with a
  // small gap. Content scroll areas pad out far enough to clear everything.
  const tabBarClearance = 32 + 60 + 8 + insets.bottom;
  const footerCtaHeight = 52; // button height incl. padding
  const contentBottomPadding = tabBarClearance + footerCtaHeight + 24;

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
          !isPlus ? (
            <CommunityLocked bottomSpace={tabBarClearance} onUpgrade={showUpsell} />
          ) : community.loading && community.recipes.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.secondary} />
            </View>
          ) : community.recipes.length === 0 ? (
            <CommunityEmpty bottomSpace={tabBarClearance} />
          ) : (
            <FlatList
              data={community.recipes}
              keyExtractor={(r) => r.id}
              refreshing={community.loading}
              onRefresh={community.refresh}
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: contentBottomPadding },
              ]}
              renderItem={({ item }) => (
                <RecipeCard
                  recipe={item}
                  variant="community"
                  liked={likedIds.has(item.id)}
                  likeCountOverride={likeOverrides[item.id]}
                  onToggleLike={() => handleToggleFeedLike(item.id)}
                  onPress={() =>
                    router.push(`/recipes/${item.id}?viewer=1` as never)
                  }
                />
              )}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
            />
          )
        ) : isEmpty ? (
          <EmptyState bottomSpace={contentBottomPadding} />
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(r) => r.id}
            refreshing={loading}
            onRefresh={refresh}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: contentBottomPadding },
            ]}
            renderItem={({ item }) => (
              <RecipeCard
                recipe={item}
                onPress={() => router.push(`/recipes/${item.id}` as never)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          />
        )}

        {/* Empty-state CTA (full-width) — shown only when there are no recipes */}
        {activeTab === 'my' && isEmpty && !loading && (
          <View style={[styles.footerWrap, { bottom: tabBarClearance }]} pointerEvents="box-none">
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
              <Text style={styles.footerCtaText}>Create your first recipe</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Populated-state FAB — floating 52px teal + button, bottom-right */}
        {activeTab === 'my' && !isEmpty && (
          <TouchableOpacity
            style={[styles.fab, { bottom: tabBarClearance + 8 }]}
            onPress={() => router.push('/recipes/new' as never)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </ScreenLayout>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ bottomSpace }: { bottomSpace: number }) {
  return (
    <View style={[styles.emptyWrap, { paddingBottom: bottomSpace }]}>
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

// ── Community — locked (non-Plus) ────────────────────────────────────────────

function CommunityLocked({
  bottomSpace,
  onUpgrade,
}: {
  bottomSpace: number;
  onUpgrade: () => void;
}) {
  return (
    <View style={[styles.emptyWrap, { paddingBottom: bottomSpace }]}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="people-outline" size={36} color={Colors.secondary} />
        </View>
        <View style={styles.emptyIconRing} pointerEvents="none" />
      </View>
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>See what others are cooking</Text>
        <Text style={styles.emptyBody}>
          Community recipes come with Plus. Browse meals from people with
          the same allergies, conditions and diets, and save them straight
          to your book.
        </Text>
      </View>
      <TouchableOpacity
        style={styles.upgradeCta}
        onPress={onUpgrade}
        activeOpacity={0.85}
      >
        <Text style={styles.upgradeCtaText}>Upgrade to Plus</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Community — empty (no public recipes yet) ────────────────────────────────

function CommunityEmpty({ bottomSpace }: { bottomSpace: number }) {
  return (
    <View style={[styles.emptyWrap, { paddingBottom: bottomSpace }]}>
      <View style={styles.emptyIconOuter}>
        <View style={styles.emptyIconInner}>
          <Ionicons name="people-outline" size={36} color={Colors.secondary} />
        </View>
        <View style={styles.emptyIconRing} pointerEvents="none" />
      </View>
      <View style={styles.emptyText}>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyBody}>
          When someone shares a recipe, it'll show up here. Go on, start
          us off.
        </Text>
      </View>
    </View>
  );
}

// ── Recipe Card ──────────────────────────────────────────────────────────────

function RecipeCard({
  recipe,
  variant = 'my',
  liked = false,
  likeCountOverride,
  onToggleLike,
  onPress,
}: {
  recipe: Recipe | PublicRecipe;
  /** 'my' = personal recipes list (name + servings on the left).
   *  'community' = community feed (48px author avatar + name + 'by X'
   *  on the left). Matches Figma node 4844:55714. */
  variant?: 'my' | 'community';
  /** Whether the current user has liked this recipe. Only used for
   *  the community variant — drives the pill's active state. */
  liked?: boolean;
  /** Optimistic delta applied to recipe.like_count on the client so
   *  the count moves immediately on tap before the DB write returns. */
  likeCountOverride?: number;
  /** Tap handler for the likes pill on the community variant. */
  onToggleLike?: () => void;
  onPress: () => void;
}) {
  const grade = recipe.nutriscore_grade as keyof typeof NUTRISCORE_COLORS | null | undefined;
  const nutriColor = grade ? NUTRISCORE_COLORS[grade] : null;
  const isCommunity = variant === 'community';
  const author = isCommunity ? (recipe as PublicRecipe).author : null;
  const authorName = author?.full_name?.trim() || 'Anonymous';
  const likeCount = (recipe.like_count ?? 0) + (likeCountOverride ?? 0);
  // Auto-derived dietary tags from the embedded ingredient snapshots.
  // Empty array if the row was fetched without ingredients (other
  // call sites use plain Recipe rows) — DietaryTagsRow renders
  // nothing in that case, so it's safe to call unconditionally.
  const dietaryTags = recipe.ingredients
    ? deriveDietaryTags(recipe.ingredients)
    : [];

  // DEV diagnostic — remove once the community avatar is confirmed
  // rendering on-device. Logs exactly what the card receives so we
  // can tell whether the join is populating author/avatar_url.
  if (__DEV__ && isCommunity) {
    // eslint-disable-next-line no-console
    console.log('[CommunityCard]', {
      recipeName: recipe.name,
      hasAuthor: Boolean(author),
      authorName: author?.full_name,
      avatarUrl: author?.avatar_url,
    });
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Cover image — 180px tall, full width */}
      <View style={styles.cardCover}>
        {recipe.cover_image_url ? (
          <Image
            source={{ uri: recipe.cover_image_url }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cardCoverPlaceholder}>
            <Ionicons name="restaurant-outline" size={44} color={Colors.accent} />
          </View>
        )}
      </View>

      {/* Content — layout depends on variant. Community shows an author
          avatar and "by [Name]" line; My shows servings. */}
      <View style={styles.cardInfo}>
        {isCommunity && (
          // Two wrappers: the outer holds the shadow (can't have
          // overflow:hidden alongside shadow on iOS or the shadow gets
          // clipped), the inner clips the image to the circle and
          // draws the white ring via borderWidth.
          <View style={styles.authorAvatarShadow}>
            <View style={styles.authorAvatarRing}>
              {author?.avatar_url ? (
                <Image
                  source={{ uri: author.avatar_url }}
                  style={styles.authorAvatarImage}
                  onError={(e) => {
                    if (__DEV__) {
                      // eslint-disable-next-line no-console
                      console.warn(
                        '[CommunityCard] avatar load failed',
                        author.avatar_url,
                        e.nativeEvent,
                      );
                    }
                  }}
                />
              ) : (
                <View style={styles.authorAvatarFallback}>
                  <Text style={styles.authorAvatarInitial}>
                    {authorName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        <View style={styles.cardInfoText}>
          <Text style={styles.cardName} numberOfLines={2}>
            {recipe.name}
          </Text>
          {dietaryTags.length > 0 && (
            <DietaryTagsRow tags={dietaryTags} max={3} size="compact" />
          )}
          {isCommunity ? (
            <Text style={styles.cardByLine}>by {authorName}</Text>
          ) : (
            <Text style={styles.cardServings}>
              {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
            </Text>
          )}
        </View>
        {/* Likes pill — only on recipes shared to the community.
            On the community variant the pill itself is tappable to
            toggle a like (no separate button anywhere). My-recipes
            cards keep it as a read-only display. */}
        {recipe.visibility === 'public' && (
          isCommunity && onToggleLike ? (
            <TouchableOpacity
              style={[styles.likesPill, liked && styles.likesPillActive]}
              onPress={onToggleLike}
              activeOpacity={0.7}
              hitSlop={6}
            >
              <LikeThumbIcon width={14} height={15} />
              <Text style={styles.likesText}>
                {likeCount} {likeCount === 1 ? 'like' : 'likes'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.likesPill}>
              <LikeThumbIcon width={14} height={15} />
              <Text style={styles.likesText}>
                {likeCount} {likeCount === 1 ? 'like' : 'likes'}
              </Text>
            </View>
          )
        )}
      </View>

      {/* Floating nutri-score pill at cover/content seam */}
      {grade && nutriColor && (
        <View style={[styles.nutriFloat, { backgroundColor: nutriColor }]}>
          <Text style={styles.nutriFloatText}>{grade.toUpperCase()}</Text>
        </View>
      )}
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

  // Empty state (shared by My Recipes empty + Community Coming Soon).
  // paddingBottom is applied dynamically by the caller so the centred
  // content shifts up to stay clear of the tab bar + CTA.
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m + Spacing.m, // matches Figma inner margin
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
  // Community-locked CTA — matches the populated-state bottom button
  // pattern so upgrade feels like the natural next step.
  upgradeCta: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: Radius.m,
    ...Shadows.level3,
  },
  upgradeCtaText: {
    fontSize: 16,
    lineHeight: 19,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: -0.32,
  },

  // Full-width card list (Figma: single column)
  listContent: {
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.s,
  },
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    overflow: 'hidden',
    ...Shadows.level3,
    position: 'relative',
  },
  cardCover: {
    width: '100%',
    height: 180,
    backgroundColor: Colors.surface.tertiary,
  },
  cardCoverPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: { width: '100%', height: '100%' },
  cardInfo: {
    backgroundColor: Colors.surface.secondary,
    padding: Spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  cardInfoText: { flex: 1, gap: 4 },
  cardName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  cardServings: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
  },
  // Community-feed-only author avatar (Figma node 4844:55709).
  // Structure: shadow wrap (NO overflow:hidden so shadow doesn't get
  // clipped on iOS) → ring wrap (3px white border + overflow:hidden
  // to clip the photo to a circle) → image.
  authorAvatarShadow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    ...Shadows.level2,
  },
  authorAvatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#ffffff',
    overflow: 'hidden',
    backgroundColor: Colors.surface.tertiary,
  },
  authorAvatarImage: {
    width: 42,
    height: 42,
  },
  authorAvatarFallback: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  authorAvatarInitial: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
  },
  cardByLine: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  likesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e2f1ee',
    borderRadius: Radius.m,
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
  },
  // Slight visual nudge when the viewer has liked this recipe —
  // same dimensions so the layout doesn't shift on tap.
  likesPillActive: {
    backgroundColor: '#c8e4dd',
  },
  likesText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },

  // Nutri-score pill floats at the cover/content boundary (Figma: top 139, right 9)
  nutriFloat: {
    position: 'absolute',
    top: 139,
    right: 9,
    width: 24,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadows.level2,
  },
  nutriFloatText: {
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

  // Floating FAB (populated state) — 52px teal cucumber square
  fab: {
    position: 'absolute',
    right: Spacing.m,
    width: 52,
    height: 52,
    borderRadius: Radius.l,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },

  // Sticky footer CTA. `bottom` is set per render so it clears the floating
  // tab bar. The 60px paddingTop is the gradient-fade allowance.
  footerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.m,
    paddingTop: 60,
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
