/**
 * Recipe Detail — populated card view accessed from the Recipe Tab.
 *
 * Pixel-matches Figma node 4818-23137:
 *   1. Hero cover image — full-bleed 300px, no overlay
 *   2. Title block (recipe name + author)
 *   3. Recipe metrics row (Serves / Prep / Cook)
 *   4. Nutrition section: heading + Per serving / Per 100g tabs, then a
 *      list of #f5fbfb/#aad4cd bordered rows with food icons
 *   5. Estimated Nutri-score block — h5 label + verdict pill + A-E scale
 *   6. Household impact section — member rows with per-member Good/Ok/
 *      Warning verdict pills. Tap a member to open the impact sheet.
 *   7. Ingredients section — brand + product name + quantity pill rows
 *   8. Step-by-step process — numbered step cards
 *
 * Floating back (left) + actions "…" (right) buttons overlay the hero.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useRecipe } from '@/lib/useRecipes';
import {
  deleteRecipe,
  duplicateRecipe,
  saveRecipeFromSource,
  computeTotalWeightGrams,
} from '@/lib/recipes';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { RecipeActionsSheet } from '@/components/RecipeActionsSheet';
import { FamilyImpactSheet, type FlaggedMatch } from '@/components/FamilyImpactSheet';
import {
  NUTRISCORE_COLORS,
  NUTRISCORE_VERDICT,
  type NutriscoreGrade,
} from '@/lib/nutriscore';
import { formatQuantity } from '@/constants/quantityUnits';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { safeBack } from '@/lib/safeBack';
import { getActiveInsights, summariseVerdict } from '@/lib/insightEngine';
import {
  findRecipeFlaggedIngredients,
  findRecipeAllergenMatches,
} from '@/lib/householdImpact';
import { supabase } from '@/lib/supabase';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ArrowLeftIcon from '@/assets/icons/recipe-header/arrow-left.svg';
import LikeThumbIcon from '@/assets/icons/recipe-header/like-thumb.svg';
import type {
  FamilyProfile,
  HouseholdImpactRow,
  RecipeIngredient,
  UserProfile,
} from '@/lib/types';

/* eslint-disable @typescript-eslint/no-require-imports */
const FoodIcons = {
  energyKcal: require('@/assets/icons/food/calories.svg').default as React.FC<{ width?: number; height?: number }>,
  fat: require('@/assets/icons/food/fat.svg').default as React.FC<{ width?: number; height?: number }>,
  saturatedFat: require('@/assets/icons/food/sat-fat.svg').default as React.FC<{ width?: number; height?: number }>,
  carbs: require('@/assets/icons/food/carbs.svg').default as React.FC<{ width?: number; height?: number }>,
  sugars: require('@/assets/icons/food/sugars.svg').default as React.FC<{ width?: number; height?: number }>,
  fiber: require('@/assets/icons/food/fiber.svg').default as React.FC<{ width?: number; height?: number }>,
  netCarbs: require('@/assets/icons/food/net-carbs.svg').default as React.FC<{ width?: number; height?: number }>,
  proteins: require('@/assets/icons/food/protein.svg').default as React.FC<{ width?: number; height?: number }>,
  salt: require('@/assets/icons/food/salt.svg').default as React.FC<{ width?: number; height?: number }>,
};
/* eslint-enable @typescript-eslint/no-require-imports */

// Canonical row fill used throughout the recipe detail (and on other
// cards across the app). NOT the same as Colors.surface.tertiary — keep
// it local to this file + other Figma-aligned screens.
const ROW_FILL = '#f5fbfb';
const STROKE = '#aad4cd';

type NutritionMode = 'serving' | 'per100';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  const insets = useSafeAreaInsets();
  const { recipe, loading, household, refresh: refreshRecipe } = useRecipe(id);
  // Profile-options namespace — the same translation source used by the
  // family-members screen and scan-result flag chips. Keeps chip labels
  // consistent across the app (e.g. "adhd" → "ADHD", "keto" → "Low Carb/Keto").
  const { t: tpo } = useTranslation('profileOptions');
  const [nutritionMode, setNutritionMode] = useState<NutritionMode>('serving');
  const [actionsOpen, setActionsOpen] = useState(false);
  // Selected member id for the Family impact sheet. null = sheet closed.
  const [impactMemberId, setImpactMemberId] = useState<string | null>(null);
  // Canonical id→name map for every flagged ingredient across every
  // household member. Loaded once per recipe open so both the list
  // row and the opened sheet share the same lookup — no duplicate
  // queries, and the row verdict stays consistent with the sheet.
  const [allFlaggedRefs, setAllFlaggedRefs] = useState<
    { id: string; name: string }[]
  >([]);
  // Like state — populated when the recipe is public. `liked` is a
  // client-side mirror of the DB row; `likeCount` mirrors the
  // denormalised counter on recipes.like_count. Both are optimistically
  // updated on tap so the UI responds immediately; the DB write runs
  // in the background.
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Must stay above the loading/not-found early returns so React's
  // hook order is stable across renders.
  useEffect(() => {
    const ids = new Set<string>();
    (household.self?.flagged_ingredients ?? []).forEach((id) => ids.add(id));
    for (const f of household.family) {
      (f.flagged_ingredients ?? []).forEach((id) => ids.add(id));
    }
    if (ids.size === 0) {
      setAllFlaggedRefs([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('ingredients')
      .select('id, name')
      .in('id', Array.from(ids))
      .then(({ data }) => {
        if (cancelled || !data) return;
        setAllFlaggedRefs(
          data.map((r) => ({ id: r.id as string, name: r.name as string })),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [
    household.self?.id,
    household.self?.flagged_ingredients,
    household.family,
  ]);

  // Sync the local likeCount with the freshly-loaded recipe. Separate
  // useEffect from the liked-state loader so the count renders as soon
  // as the recipe itself arrives, even before we know the user's own
  // like status.
  useEffect(() => {
    if (recipe) setLikeCount(recipe.like_count ?? 0);
  }, [recipe?.id, recipe?.like_count]);

  // Check whether the signed-in user has liked this recipe. Only
  // runs for public recipes — private recipes can't be liked so
  // there's nothing to look up.
  useEffect(() => {
    if (!recipe || recipe.visibility !== 'public' || !session?.user?.id) {
      setLiked(false);
      return;
    }
    let cancelled = false;
    supabase
      .from('recipe_likes')
      .select('recipe_id')
      .eq('recipe_id', recipe.id)
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setLiked(Boolean(data));
      });
    return () => { cancelled = true; };
  }, [recipe?.id, recipe?.visibility, session?.user?.id]);

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
          <TouchableOpacity onPress={() => safeBack()} style={styles.backInlineBtn}>
            <Text style={styles.backInlineBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentRecipe = recipe;
  const grade = currentRecipe.nutriscore_grade as NutriscoreGrade | null;
  const grades: NutriscoreGrade[] = ['a', 'b', 'c', 'd', 'e'];

  // ── Nutrition values: per-serving (stored) + derived per-100g ──────────
  const totalWeightG = computeTotalWeightGrams(currentRecipe.ingredients);
  const toPer100 = (perServing: number | null | undefined): number | null => {
    if (perServing == null || totalWeightG <= 0) return null;
    return (perServing * currentRecipe.servings) / (totalWeightG / 100);
  };
  const perServing = {
    energyKcal: currentRecipe.total_kcal,
    fat: currentRecipe.total_fat_g,
    saturatedFat: currentRecipe.total_sat_fat_g,
    carbs: currentRecipe.total_carbs_g,
    sugars: currentRecipe.total_sugars_g,
    fiber: currentRecipe.total_fiber_g,
    proteins: currentRecipe.total_protein_g,
    salt: currentRecipe.total_salt_g,
  };
  const per100g = {
    energyKcal: toPer100(perServing.energyKcal),
    fat: toPer100(perServing.fat),
    saturatedFat: toPer100(perServing.saturatedFat),
    carbs: toPer100(perServing.carbs),
    sugars: toPer100(perServing.sugars),
    fiber: toPer100(perServing.fiber),
    proteins: toPer100(perServing.proteins),
    salt: toPer100(perServing.salt),
  };
  const values = nutritionMode === 'serving' ? perServing : per100g;
  const netCarbsVal =
    values.carbs != null && values.fiber != null
      ? Math.max(0, values.carbs - values.fiber)
      : null;

  /**
   * Resolve a household row to (tags, verdict) for display.
   *   - tags   = member's conditions + allergies + dietary preferences,
   *              shown as pills under the name
   *   - verdict = insight-engine summary of how this recipe lands for
   *               the member's health profile, upgraded to 'Warning' if
   *               an ingredient directly conflicts (flaggedIngredientIds).
   */
  function getMemberView(row: HouseholdImpactRow): {
    tags: string[];
    verdict: { label: 'Good' | 'Ok' | 'Warning'; color: string };
  } {
    const isSelf = row.memberId === 'self';
    const profile = isSelf
      ? household.self
      : household.family.find((f) => f.id === row.memberId);
    const conditions = profile?.health_conditions ?? [];
    const allergies = profile?.allergies ?? [];
    const preferences = profile?.dietary_preferences ?? [];

    const insights = getActiveInsights(conditions, allergies, preferences, {
      energyKcal: perServing.energyKcal != null ? String(perServing.energyKcal) : undefined,
      fat: perServing.fat != null ? String(perServing.fat) : undefined,
      saturatedFat: perServing.saturatedFat != null ? String(perServing.saturatedFat) : undefined,
      carbs: perServing.carbs != null ? String(perServing.carbs) : undefined,
      sugars: perServing.sugars != null ? String(perServing.sugars) : undefined,
      fiber: perServing.fiber != null ? String(perServing.fiber) : undefined,
      proteins: perServing.proteins != null ? String(perServing.proteins) : undefined,
      salt: perServing.salt != null ? String(perServing.salt) : undefined,
    });
    let verdict = summariseVerdict(insights);
    // Direct allergen matches or personal-flag hits inside any product
    // force a Warning — the insight summary is macro-level and can't
    // see these. Match the same logic the impact sheet uses so the
    // row's pill stays in sync with what the sheet shows on tap.
    const memberFlaggedIds = new Set(
      (profile as UserProfile | FamilyProfile | undefined)?.flagged_ingredients ?? [],
    );
    const memberFlaggedRefs = allFlaggedRefs.filter((r) => memberFlaggedIds.has(r.id));
    const hasFlagHit = findRecipeFlaggedIngredients(
      currentRecipe.ingredients,
      memberFlaggedRefs,
    ).length > 0;
    const hasAllergenHit = findRecipeAllergenMatches(
      currentRecipe.ingredients,
      allergies,
    ).length > 0;
    if (row.status === 'avoid' || hasFlagHit || hasAllergenHit) {
      verdict = { label: 'Warning', color: '#ff3f42' };
    }

    // Translate the raw profile keys into human-readable chip labels
    // via the shared `profileOptions` namespace (same lookups used by
    // family-members.tsx and the scan-result chip rows), so chips on
    // this screen match the rest of the app. Unknown keys fall back
    // to the key itself rather than showing empty.
    const tags = [
      ...conditions.map((c) => tpo(`healthConditions.${c}`, { defaultValue: c })),
      ...allergies.map((a) => tpo(`allergies.${a}`, { defaultValue: a })),
      ...preferences.map((d) => tpo(`dietaryPreferences.${d}`, { defaultValue: d })),
    ];

    return { tags, verdict };
  }

  // ── Actions ───────────────────────────────────────────────────────────
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
    if (newId) router.replace(`/recipes/${newId}` as never);
  }

  // Viewer-mode action — clone a community recipe into the user's own
  // book. Same as duplicate but without the "(copy)" suffix and with
  // the source_recipe_id attribution preserved for later "Inspired by"
  // credit lines.
  async function handleSaveFromSource() {
    if (!session?.user?.id) return;
    const newId = await saveRecipeFromSource(session.user.id, currentRecipe.id);
    if (newId) router.replace(`/recipes/${newId}` as never);
  }

  // "Share with a friend" — opens the native share sheet with a
  // biteinsight:// deep link so a recipient on Bite Insight can open
  // the recipe directly. Not Plus-gated — any user can share their
  // own creations.
  // Share the recipe to a friend. When we have a cover image we
  // download it to the cache and share it via expo-sharing so the
  // native iOS share sheet renders the image as a preview tile and
  // the recipe name as the dialog title — that's what gives "image
  // and name as the preview". Falls back to a plain text+url share
  // (with a biteinsight:// deep link) when there's no cover image
  // or expo-sharing isn't available on the platform.
  async function handleShareWithFriend() {
    const deepLink = `biteinsight://recipes/${currentRecipe.id}`;
    const cover = currentRecipe.cover_image_url;
    try {
      if (cover && (await Sharing.isAvailableAsync())) {
        // Cache key keyed on the recipe id so re-shares don't re-download.
        const ext = cover.toLowerCase().includes('.png') ? 'png' : 'jpg';
        const dest = new File(Paths.cache, `share-recipe-${currentRecipe.id}.${ext}`);
        const downloaded = await File.downloadFileAsync(cover, dest, { idempotent: true });
        if (downloaded?.uri) {
          await Sharing.shareAsync(downloaded.uri, {
            dialogTitle: currentRecipe.name,
            mimeType: ext === 'png' ? 'image/png' : 'image/jpeg',
            UTI: ext === 'png' ? 'public.png' : 'public.jpeg',
          });
          return;
        }
      }
      // Fallback when there's no cover or expo-sharing isn't available.
      await Share.share({
        title: currentRecipe.name,
        message: `Check out "${currentRecipe.name}" on Bite Insight\n${deepLink}`,
        url: deepLink,
      });
    } catch (e) {
      console.warn('[recipe-detail] share failed:', e);
    }
  }

  // Toggle a like on this recipe. Optimistically updates the local
  // liked + count state before firing the DB write so the heart feels
  // instant. If the write fails we roll back. Not available on private
  // recipes (the heart button won't render there) and the owner can't
  // like their own recipe (enforced at the UI level).
  async function handleToggleLike() {
    if (!session?.user?.id) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      if (wasLiked) {
        await supabase
          .from('recipe_likes')
          .delete()
          .eq('recipe_id', currentRecipe.id)
          .eq('user_id', session.user.id);
      } else {
        await supabase.from('recipe_likes').insert({
          recipe_id: currentRecipe.id,
          user_id: session.user.id,
        });
      }
    } catch (e) {
      // Roll back on failure.
      console.warn('[recipe-detail] like toggle failed:', e);
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  }

  // Community sharing — Plus-gated. Non-Plus taps open the upsell sheet.
  // Plus members toggle recipes.visibility between 'public' and 'private'
  // after confirmation. No complex share flow here; the recipe simply
  // becomes discoverable (or not) to other users.
  async function handleShareWithCommunity() {
    if (!isPlus) {
      showUpsell();
      return;
    }
    const isCurrentlyShared = currentRecipe.visibility === 'public';
    if (isCurrentlyShared) {
      Alert.alert(
        'Stop sharing?',
        `"${currentRecipe.name}" will no longer be visible to the community.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop sharing',
            onPress: async () => {
              await supabase
                .from('recipes')
                .update({ visibility: 'private' })
                .eq('id', currentRecipe.id);
              await refreshRecipe();
            },
          },
        ],
      );
      return;
    }
    Alert.alert(
      'Share with community?',
      `"${currentRecipe.name}" will be visible to other Bite Insight users. You can stop sharing at any time.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            await supabase
              .from('recipes')
              .update({ visibility: 'public' })
              .eq('id', currentRecipe.id);
            await refreshRecipe();
          },
        },
      ],
    );
  }

  // Author display. Recipes don't carry an owner name today, so derive
  // from the account email's local part and capitalise the first letter
  // so the line reads as a proper sentence — e.g. "By Glenn" rather
  // than "by glenn".
  const rawAuthor = session?.user?.email?.split('@')[0] ?? 'you';
  const authorName = rawAuthor.charAt(0).toUpperCase() + rawAuthor.slice(1);

  // Like UI gates:
  //   • Counter pill — visible whenever the recipe is public, including
  //     for the owner (they should see how many likes they've racked up).
  //   • Heart button on the hero — only for viewers (not the owner), and
  //     only on public recipes. Owners can't like their own recipe.
  const isPublic = currentRecipe.visibility === 'public';
  const isOwner = session?.user?.id === currentRecipe.user_id;
  const showLikesCounter = isPublic;

  return (
    <View style={styles.safe}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {currentRecipe.cover_image_url ? (
            <Image
              source={{ uri: currentRecipe.cover_image_url }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="restaurant-outline" size={96} color={Colors.accent} />
          )}
        </View>

        {/* Floating back + actions overlay — matches the recipe builder
            header pill style (Figma node 4834:26085): 48x48, rounded-16,
            white 70% fill, white border, level-3 shadow. */}
        <TouchableOpacity
          style={[styles.headerBtn, styles.headerBtnLeft, { top: insets.top + 12 }]}
          onPress={() => safeBack()}
          activeOpacity={0.85}
          hitSlop={8}
        >
          <ArrowLeftIcon width={18} height={14} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerBtn, styles.headerBtnRight, { top: insets.top + 12 }]}
          onPress={() => setActionsOpen(true)}
          activeOpacity={0.85}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.primary} />
        </TouchableOpacity>

        {/* ── White sheet containing everything else ─────────────────── */}
        <View style={styles.sheet}>
          {/* Title block — the likes pill sits inline next to the
              author line when the recipe is public (Figma node
              4836:33491). */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>{currentRecipe.name}</Text>
            <View style={styles.authorRow}>
              <Text style={styles.author}>By {authorName}</Text>
              {showLikesCounter && (
                // Read-only counter. The actual like/unlike action
                // lives in the Recipe Actions sheet (viewer variant).
                <View style={[styles.likesPill, liked && styles.likesPillActive]}>
                  <LikeThumbIcon width={14} height={15} />
                  <Text style={styles.likesPillText}>
                    {likeCount} {likeCount === 1 ? 'like' : 'likes'}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Recipe metrics */}
          <View style={styles.metricsRow}>
            <MetricCard label="Serves" value={String(currentRecipe.servings)} />
            <MetricCard
              label="Prep time"
              value={currentRecipe.prep_time_min != null ? `${currentRecipe.prep_time_min} mins` : '—'}
            />
            <MetricCard
              label="Cook time"
              value={currentRecipe.cook_time_min != null ? `${currentRecipe.cook_time_min} mins` : '—'}
            />
          </View>

          {/* ── Nutrition ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition</Text>

            <View style={styles.modeTabs}>
              <ModeTab
                label="Per serving"
                active={nutritionMode === 'serving'}
                onPress={() => setNutritionMode('serving')}
              />
              <ModeTab
                label="Per 100g"
                active={nutritionMode === 'per100'}
                onPress={() => setNutritionMode('per100')}
              />
            </View>

            <View style={styles.nutritionRows}>
              <NutritionRow
                Icon={FoodIcons.energyKcal}
                label="Calories"
                value={formatKcal(values.energyKcal)}
              />
              <NutritionRow
                Icon={FoodIcons.fat}
                label="Fat"
                value={formatGrams(values.fat)}
              />
              <NutritionRow
                Icon={FoodIcons.saturatedFat}
                label="Saturated Fat"
                value={formatGrams(values.saturatedFat)}
              />
              <NutritionRow
                Icon={FoodIcons.carbs}
                label="Carbohydrates"
                value={formatGrams(values.carbs)}
              />
              <NutritionRow
                Icon={FoodIcons.sugars}
                label="Sugars"
                value={formatGrams(values.sugars)}
              />
              <NutritionRow
                Icon={FoodIcons.fiber}
                label="Fiber"
                value={formatGrams(values.fiber)}
              />
              <NutritionRow
                Icon={FoodIcons.netCarbs}
                label="Net Carbs"
                value={formatGrams(netCarbsVal)}
              />
              <NutritionRow
                Icon={FoodIcons.proteins}
                label="Protein"
                value={formatGrams(values.proteins)}
              />
              <NutritionRow
                Icon={FoodIcons.salt}
                label="Salt"
                value={formatGrams(values.salt)}
              />
            </View>

            {/* Estimated Nutri-score */}
            {grade && (
              <View style={styles.nutriBlock}>
                <Text style={styles.h5}>Estimated Nutri-score</Text>
                <View style={styles.nutriCard}>
                  <View
                    style={[
                      styles.verdictPill,
                      { backgroundColor: NUTRISCORE_COLORS[grade] },
                    ]}
                  >
                    <Text style={styles.verdictText}>{NUTRISCORE_VERDICT[grade]}</Text>
                  </View>
                  <View style={styles.scaleRow}>
                    {grades.map((g) => {
                      const isActive = g === grade;
                      return (
                        <View
                          key={g}
                          style={[
                            styles.gradePill,
                            { backgroundColor: NUTRISCORE_COLORS[g] },
                            isActive ? styles.gradePillActive : styles.gradePillInactive,
                          ]}
                        >
                          <Text style={styles.gradeText}>{g.toUpperCase()}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ── Household impact ──────────────────────────────────── */}
          {household.impact.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Household impact</Text>
              <Text style={styles.sectionSubtitle}>
                How do the ingredients in this recipe impact your household?
              </Text>

              <View style={styles.householdList}>
                {household.impact.map((row) => {
                  const view = getMemberView(row);
                  return (
                    <HouseholdMemberRow
                      key={row.memberId}
                      row={row}
                      tags={view.tags}
                      verdict={view.verdict}
                      onPress={() => setImpactMemberId(row.memberId)}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Ingredients ───────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.countLine}>
              {currentRecipe.ingredients.length}{' '}
              {currentRecipe.ingredients.length === 1 ? 'ingredient' : 'ingredients'}
            </Text>
            <View style={styles.ingList}>
              {currentRecipe.ingredients.map((ing) => (
                <IngredientRow key={ing.id} ingredient={ing} />
              ))}
            </View>
          </View>

          {/* ── Step-by-step process ──────────────────────────────── */}
          {currentRecipe.method.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Step-by-step process</Text>
              <Text style={styles.sectionSubtitle}>
                Follow these steps to make this recipe.
              </Text>
              <View style={styles.stepList}>
                {currentRecipe.method.map((text, idx) => (
                  <View key={`${idx}-${text.slice(0, 12)}`} style={styles.stepCard}>
                    <Text style={styles.stepTitle}>Step {idx + 1}</Text>
                    <Text style={styles.stepBody}>{text}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Owner viewing their own recipe → Edit / Duplicate / Share to
          community / Share with friend / Delete. Viewer on another
          user's public recipe → Save / Duplicate / Share with friend. */}
      {isOwner ? (
        <RecipeActionsSheet
          variant="owner"
          visible={actionsOpen}
          onClose={() => setActionsOpen(false)}
          onEdit={() => router.push(`/recipes/${currentRecipe.id}/edit` as never)}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onShareWithCommunity={handleShareWithCommunity}
          onShareWithFriend={handleShareWithFriend}
          isShared={currentRecipe.visibility === 'public'}
          isPlus={isPlus}
        />
      ) : (
        <RecipeActionsSheet
          variant="viewer"
          visible={actionsOpen}
          onClose={() => setActionsOpen(false)}
          onSave={handleSaveFromSource}
          onDuplicate={handleSaveFromSource}
          onShareWithFriend={handleShareWithFriend}
          onToggleLike={handleToggleLike}
          liked={liked}
        />
      )}

      <FamilyImpactSheetForMember
        memberId={impactMemberId}
        onClose={() => setImpactMemberId(null)}
        ingredients={currentRecipe.ingredients}
        perServing={perServing}
        self={household.self}
        family={household.family}
        impactRows={household.impact}
        allFlaggedRefs={allFlaggedRefs}
        tpo={tpo}
      />
    </View>
  );
}

// ── FamilyImpactSheet adapter ──────────────────────────────────────────
//
// Derives the inputs the presentational FamilyImpactSheet needs from the
// recipe + household data we already have. Keeps the detail screen itself
// focused on layout.
function FamilyImpactSheetForMember({
  memberId,
  onClose,
  ingredients,
  perServing,
  self,
  family,
  impactRows,
  allFlaggedRefs,
  tpo,
}: {
  memberId: string | null;
  onClose: () => void;
  ingredients: RecipeIngredient[];
  perServing: {
    energyKcal: number | null;
    fat: number | null;
    saturatedFat: number | null;
    carbs: number | null;
    sugars: number | null;
    fiber: number | null;
    proteins: number | null;
    salt: number | null;
  };
  self: UserProfile | null;
  family: FamilyProfile[];
  impactRows: HouseholdImpactRow[];
  allFlaggedRefs: { id: string; name: string }[];
  tpo: (key: string, opts?: { defaultValue?: string }) => string;
}) {
  // Resolve the selected member.
  const row = memberId ? impactRows.find((r) => r.memberId === memberId) : null;
  const isSelf = memberId === 'self';
  const familyProfile = !isSelf && memberId ? family.find((f) => f.id === memberId) : null;

  // Pull the condition/allergy/preference arrays the insight engine needs,
  // plus the member's personal flagged-ingredient list.
  const conditions = isSelf
    ? self?.health_conditions ?? []
    : familyProfile?.health_conditions ?? [];
  const allergies = isSelf ? self?.allergies ?? [] : familyProfile?.allergies ?? [];
  const preferences = isSelf
    ? self?.dietary_preferences ?? []
    : familyProfile?.dietary_preferences ?? [];
  const memberFlaggedIdsSet = new Set<string>(
    isSelf
      ? self?.flagged_ingredients ?? []
      : familyProfile?.flagged_ingredients ?? [],
  );
  // Filter the household-wide id→name map down to just this member.
  const memberFlaggedRefs = useMemo(
    () => allFlaggedRefs.filter((r) => memberFlaggedIdsSet.has(r.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allFlaggedRefs, isSelf, self?.flagged_ingredients, familyProfile?.flagged_ingredients],
  );

  // Cross-reference each product's sub-ingredients against this member's
  // personal flagged list. Matches on id OR name so OFF-sourced products
  // (which often carry ingredient text without canonical ids) still hit.
  const flagHits = useMemo(
    () => findRecipeFlaggedIngredients(ingredients, memberFlaggedRefs),
    [ingredients, memberFlaggedRefs],
  );

  // Allergen cross-check — product.allergens[] + ingredient text search.
  const allergenHits = useMemo(
    () => findRecipeAllergenMatches(ingredients, allergies),
    [ingredients, allergies],
  );

  // ── DEV diagnostics ──────────────────────────────────────────────────
  // Short-term logging to track down missing Flagged/Warning cards.
  // Dumps everything the matcher sees so we can tell which side is empty:
  //   1. memberFlaggedRefs — what ids/names the member has flagged
  //   2. allergies          — member's allergy list
  //   3. per-ingredient     — snap.ingredients + snap.ingredients_text
  //   4. flagHits/allergenHits — what the matcher produced
  // Remove this block once the bug is fixed.
  useEffect(() => {
    if (!__DEV__ || !memberId) return;
    // eslint-disable-next-line no-console
    console.log('[FamilyImpact]', {
      memberId,
      memberName: row?.name,
      allFlaggedRefsCount: allFlaggedRefs.length,
      memberFlaggedRefs,
      allergies,
      ingredients: ingredients.map((ing) => ({
        productName: ing.product_snapshot.product_name,
        structuredCount: (ing.product_snapshot.ingredients ?? []).length,
        structuredNames: (ing.product_snapshot.ingredients ?? []).map((i) => i.name),
        hasIngredientsText: Boolean(ing.product_snapshot.ingredients_text),
        ingredientsTextPreview: (ing.product_snapshot.ingredients_text ?? '').slice(0, 120),
        allergens: ing.product_snapshot.allergens ?? [],
      })),
      flagHits,
      allergenHits,
    });
  }, [memberId, row?.name, allFlaggedRefs.length, memberFlaggedRefs, allergies, ingredients, flagHits, allergenHits]);

  // Reasons live in ingredient_flag_reasons keyed by (user, ingredient,
  // family_profile_id). Fetched on demand when the sheet opens so we
  // don't query when no member is selected.
  const [reasonsByFlaggedId, setReasonsByFlaggedId] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    if (!memberId || flagHits.length === 0 || !self?.id) {
      setReasonsByFlaggedId({});
      return;
    }
    let cancelled = false;
    const uniqueIds = Array.from(new Set(flagHits.map((h) => h.flaggedIngredientId)));
    (async () => {
      let q = supabase
        .from('ingredient_flag_reasons')
        .select('ingredient_id, reason_category, reason_text')
        .eq('user_id', self.id)
        .in('ingredient_id', uniqueIds);
      // Scope to this family member. The account owner's own flags live
      // in rows where family_profile_id IS NULL.
      q = isSelf ? q.is('family_profile_id', null) : q.eq('family_profile_id', memberId);
      const { data } = await q;
      if (cancelled || !data) return;
      const map: Record<string, string[]> = {};
      for (const r of data) {
        const id = r.ingredient_id as string;
        const parts: string[] = [];
        // reason_text is a comma-joined string of the user's reason picks
        // from the flag sheet. Split back into bullets for display.
        const text = (r.reason_text as string | null) ?? '';
        if (text) {
          parts.push(...text.split(',').map((p) => p.trim()).filter(Boolean));
        }
        map[id] = parts;
      }
      setReasonsByFlaggedId(map);
    })();
    return () => { cancelled = true; };
  }, [memberId, isSelf, self?.id, flagHits]);

  const nutrientData = {
    energyKcal: perServing.energyKcal != null ? String(perServing.energyKcal) : undefined,
    fat: perServing.fat != null ? String(perServing.fat) : undefined,
    saturatedFat: perServing.saturatedFat != null ? String(perServing.saturatedFat) : undefined,
    carbs: perServing.carbs != null ? String(perServing.carbs) : undefined,
    sugars: perServing.sugars != null ? String(perServing.sugars) : undefined,
    fiber: perServing.fiber != null ? String(perServing.fiber) : undefined,
    proteins: perServing.proteins != null ? String(perServing.proteins) : undefined,
    salt: perServing.salt != null ? String(perServing.salt) : undefined,
  };

  const insights = getActiveInsights(conditions, allergies, preferences, nutrientData);
  let verdict = summariseVerdict(insights);
  // Upgrade to Warning if there's any direct hit — these always beat
  // the numeric insights, which only see macro-level severities.
  if (flagHits.length > 0 || allergenHits.length > 0 || row?.status === 'avoid') {
    verdict = { label: 'Warning', color: '#ff3f42' };
  }

  // Build FlaggedMatch[] — one card per unique flagged ingredient,
  // with the reasons pulled from the DB above.
  const byIngredient: Record<
    string,
    { ingredientName: string; products: Set<string>; reasons: string[] }
  > = {};
  for (const h of flagHits) {
    const bucket = byIngredient[h.flaggedIngredientId] ?? {
      ingredientName: h.flaggedIngredientName,
      products: new Set<string>(),
      reasons: reasonsByFlaggedId[h.flaggedIngredientId] ?? [],
    };
    bucket.products.add(h.productName);
    byIngredient[h.flaggedIngredientId] = bucket;
  }
  const flaggedMatches: FlaggedMatch[] = Object.values(byIngredient).map((b) => ({
    ingredientName: b.ingredientName,
    reasons: b.reasons,
  }));

  // Allergen warnings — one card per member allergy that's present.
  const allergenWarnings = allergenHits.map((h) => {
    const label = tpo(`allergies.${h.allergy}`, { defaultValue: h.allergy });
    const productList =
      h.productNames.length === 1
        ? h.productNames[0]
        : `${h.productNames.slice(0, -1).join(', ')} and ${h.productNames[h.productNames.length - 1]}`;
    return `This recipe contains ${label.toLowerCase()} (${productList}). Avoid if allergic.`;
  });

  return (
    <FamilyImpactSheet
      visible={memberId !== null}
      onClose={onClose}
      member={{
        id: memberId ?? '',
        name: row?.name ?? '',
        avatarUrl: row?.avatarUrl ?? null,
        tags: [
          ...conditions.map((c) => tpo(`healthConditions.${c}`, { defaultValue: c })),
          ...allergies.map((a) => tpo(`allergies.${a}`, { defaultValue: a })),
          ...preferences.map((d) => tpo(`dietaryPreferences.${d}`, { defaultValue: d })),
        ],
      }}
      verdict={verdict}
      insights={insights}
      flaggedMatches={flaggedMatches}
      allergenWarnings={allergenWarnings}
    />
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function ModeTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.modeTab, active && styles.modeTabActive]}
      activeOpacity={0.85}
    >
      <Text style={[styles.modeTabText, active && styles.modeTabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function NutritionRow({
  Icon,
  label,
  value,
}: {
  Icon: React.FC<{ width?: number; height?: number }>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.nutritionRow}>
      <View style={styles.nutritionIconWrap}>
        <Icon width={24} height={24} />
      </View>
      <Text style={styles.nutritionLabel}>{label}</Text>
      <Text style={styles.nutritionValue}>{value}</Text>
    </View>
  );
}

function HouseholdMemberRow({
  row,
  tags,
  verdict,
  onPress,
}: {
  row: HouseholdImpactRow;
  /** Condition + allergy + dietary pref labels rendered as pills. */
  tags: string[];
  /** Insight-based verdict from the parent (already Warning-upgraded if
   *  there are direct conflicts). */
  verdict: { label: 'Good' | 'Ok' | 'Warning'; color: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.memberRow} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.memberAvatar}>
        {row.avatarUrl ? (
          <Image source={{ uri: row.avatarUrl }} style={styles.memberAvatarImg} />
        ) : (
          <Text style={styles.memberAvatarInitials}>
            {row.name.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName} numberOfLines={1}>
          {row.name}
        </Text>
        {tags.length > 0 && (
          <View style={styles.memberTagWrap}>
            {tags.map((t) => (
              <View key={t} style={styles.memberTag}>
                <Text style={styles.memberTagText} numberOfLines={1}>
                  {t}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={[styles.memberStatusPill, { backgroundColor: verdict.color }]}>
        <Text style={styles.memberStatusText}>{verdict.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function IngredientRow({ ingredient: ing }: { ingredient: RecipeIngredient }) {
  const snap = ing.product_snapshot;
  return (
    <View style={styles.ingRow}>
      <View style={styles.ingThumb}>
        {snap.image_url ? (
          <Image source={{ uri: snap.image_url }} style={styles.ingThumbImage} />
        ) : (
          <View style={styles.ingThumbNoImage}>
            <Ionicons name="image-outline" size={16} color={STROKE} />
            <Text style={styles.ingThumbNoImageText}>No image</Text>
          </View>
        )}
      </View>
      <View style={styles.ingInfo}>
        {snap.brand && (
          <Text style={styles.ingBrand} numberOfLines={1}>
            {snap.brand}
          </Text>
        )}
        <Text style={styles.ingName} numberOfLines={1}>
          {snap.product_name}
        </Text>
      </View>
      <View style={styles.ingQty}>
        <Text style={styles.ingQtyText}>
          {formatQuantity(Number(ing.quantity_value), ing.quantity_unit)}
        </Text>
      </View>
    </View>
  );
}

// ── Formatting helpers ─────────────────────────────────────────────────

function formatGrams(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 10) return `${Math.round(n)}g`;
  return `${Math.round(n * 10) / 10}g`;
}

function formatKcal(kcal: number | null | undefined): string {
  if (kcal == null || !Number.isFinite(kcal)) return '—';
  const kj = Math.round(kcal * 4.184);
  return `${kj} kJ (${Math.round(kcal)} kcal)`;
}

// ── Styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.secondary },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  backInlineBtn: { padding: 10, marginTop: 16 },
  backInlineBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  // Hero
  hero: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: { width: '100%', height: '100%' },
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

  // Bottom sheet wrapper for all content below the hero
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginTop: -16, // overlap the hero slightly per Figma
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 32,
  },

  // Title
  titleBlock: { gap: 4 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  author: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  // Author line + likes pill sit on the same row. `justifyContent:
  // space-between` pins the pill flush right when present, and the
  // author text takes the remaining space via flex: 1.
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  likesPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e2f1ee',
    paddingLeft: 4,
    paddingRight: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // Slight visual nudge when the viewer has liked this recipe —
  // keeps the same layout dimensions so nothing shifts on tap.
  likesPillActive: {
    backgroundColor: '#c8e4dd',
  },
  likesPillText: {
    fontSize: 13,
    lineHeight: 15.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },

  // Metrics row (3 equal cards)
  metricsRow: { flexDirection: 'row', gap: 8 },
  metricCard: {
    flex: 1,
    backgroundColor: ROW_FILL,
    borderWidth: 1,
    borderColor: STROKE,
    borderRadius: Radius.m,
    padding: 16,
    gap: 4,
  },
  metricLabel: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  metricValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },

  // Section
  section: { gap: 16 },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    marginTop: -8, // sit closer to the title
  },
  countLine: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    marginTop: -8,
  },

  h5: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },

  // Mode tabs
  modeTabs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
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
    borderColor: STROKE,
  },
  modeTabText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  modeTabTextActive: { color: Colors.primary },

  // Nutrition rows
  nutritionRows: { gap: 4 },
  nutritionRow: {
    backgroundColor: ROW_FILL,
    borderWidth: 1,
    borderColor: STROKE,
    borderRadius: Radius.m,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nutritionIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  nutritionValue: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },

  // Nutri-score
  nutriBlock: { gap: 8 },
  nutriCard: {
    backgroundColor: ROW_FILL,
    borderWidth: 1,
    borderColor: STROKE,
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
  scaleRow: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30 },
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

  // Household
  householdList: { gap: 8 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e2f1ee',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#fff',
    ...Shadows.level2,
  },
  memberAvatarImg: { width: '100%', height: '100%' },
  memberAvatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  memberInfo: { flex: 1, gap: 6 },
  memberName: {
    // Figma: Heading 5 bumped to the recipe-card treatment — larger name
    // so it sits comfortably above the condition pills.
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
  },
  memberTagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  memberTag: {
    // Figma: lighter teal-tinted fill specific to the household row — a
    // touch more visible than the usual spring-water pill so it reads
    // clearly against the white row background.
    backgroundColor: 'rgba(0, 119, 111, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: '100%',
  },
  memberTagText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
  memberStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberStatusText: {
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

  // Ingredient rows (info-only — no like/dislike/flag on this screen)
  ingList: { gap: 8 },
  ingRow: {
    backgroundColor: ROW_FILL,
    borderWidth: 1,
    borderColor: STROKE,
    borderRadius: Radius.m,
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
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ingThumbNoImageText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: STROKE,
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

  // Process step cards
  stepList: { gap: 8 },
  stepCard: {
    backgroundColor: ROW_FILL,
    borderWidth: 1,
    borderColor: STROKE,
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
});
