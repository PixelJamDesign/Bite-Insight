/**
 * Add to meal — full-screen picker that adds one item to the meal being
 * built (DraftMealProvider), then returns to the planner, which reopens
 * the builder sheet.
 *
 * Params: source ('recipes' | 'scans'), chosen in MealBuilderSheet:
 *   • recipes — the user's recipe book
 *   • scans   — scan history
 * Tapping a row opens QuantityPickerSheet so the user sets the portion
 * (servings for a recipe, weight/volume for a product) before it's added.
 *
 * A screen rather than a sheet for the same reason as recipes/pick-scan.
 * Built on ScreenLayout like every titled page: the meal's day and time
 * as the subtitle, search pinned under the header.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toastContext';
import { listRecipes, snapshotFromScanAsync } from '@/lib/recipes';
import { draftItemFromProduct, draftItemFromRecipe, relativeDayLabel } from '@/lib/mealPlan';
import { useDraftMeal } from '@/lib/draftMealContext';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { ActionSearchIcon } from '@/components/MenuIcons';
import { LottieLoader } from '@/components/LottieLoader';
import { TextField } from '@/components/TextField';
import { ScreenLayout, HeaderFlatList } from '@/components/ScreenLayout';
import { QuantityPickerSheet } from '@/components/QuantityPickerSheet';
import { NUTRISCORE_COLORS } from '@/lib/nutriscore';
import { safeBack } from '@/lib/safeBack';
import type { QuantityUnit, Recipe, Scan } from '@/lib/types';

type TabKey = 'recipes' | 'scans';

const DEFAULT_PRODUCT_GRAMS = 100;

export default function AddToMealPlanScreen() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ source?: string }>();
  const draftMeal = useDraftMeal();
  const draft = draftMeal.draft;

  const activeTab: TabKey = params.source === 'scans' ? 'scans' : 'recipes';
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  // The row the user tapped, waiting on a portion from the quantity sheet.
  const [pending, setPending] = useState<
    { kind: 'recipe'; recipe: Recipe } | { kind: 'scan'; scan: Scan } | null
  >(null);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      const [recipeRows, scanRes] = await Promise.all([
        listRecipes(userId),
        supabase
          .from('scans')
          .select('*')
          .eq('user_id', userId)
          .order('scanned_at', { ascending: false })
          .limit(50),
      ]);
      if (!mounted) return;
      setRecipes(recipeRows);
      setScans((scanRes.data ?? []) as Scan[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const q = query.trim().toLowerCase();
  const filteredRecipes = useMemo(
    () => (q ? recipes.filter((r) => r.name.toLowerCase().includes(q)) : recipes),
    [recipes, q],
  );
  const filteredScans = useMemo(() => {
    // Scan history repeats products — keep the most recent scan of each.
    const seen = new Set<string>();
    const unique = scans.filter((s) => {
      if (seen.has(s.barcode)) return false;
      seen.add(s.barcode);
      return true;
    });
    if (!q) return unique;
    return unique.filter(
      (s) =>
        s.product_name.toLowerCase().includes(q) || (s.brand ?? '').toLowerCase().includes(q),
    );
  }, [scans, q]);

  function addRecipe(recipe: Recipe, servings: number) {
    draftMeal.addItem(draftItemFromRecipe(recipe, servings));
    safeBack();
  }

  async function addScan(scan: Scan, value: number, unit: QuantityUnit) {
    if (busyId) return; // guard against double-taps
    setBusyId(scan.id);
    try {
      const snapshot = await snapshotFromScanAsync(scan);
      draftMeal.addItem(
        draftItemFromProduct({
          barcode: scan.barcode,
          scan_id: scan.id,
          quantity_value: value,
          quantity_unit: unit,
          product_snapshot: snapshot,
        }),
      );
      safeBack();
    } catch (e) {
      console.warn('[meal-plan-add] failed to add product:', e);
      setBusyId(null);
      showToast({ message: 'Could not add that product. Please try again.', variant: 'error' });
    }
  }

  const listPadding = { paddingHorizontal: Spacing.m, paddingBottom: insets.bottom + Spacing.l };

  return (
    <ScreenLayout
      title={activeTab === 'recipes' ? 'Choose a recipe' : 'Add from scan history'}
      subtitle={draft ? `${relativeDayLabel(draft.dateKey)} · ${draft.time}` : undefined}
      onBack={() => safeBack()}
      headerExtension={
      <View style={styles.controls}>
        <TextField
          iconNode={<ActionSearchIcon size={24} color={Colors.secondary} />}
          placeholder={activeTab === 'recipes' ? 'Search your recipes...' : 'Search your scans...'}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      }
    >
      {loading ? (
        <View style={styles.loadingWrap}>
          <LottieLoader type="loading" fullScreen={false} />
        </View>
      ) : activeTab === 'recipes' ? (
        filteredRecipes.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {q
                ? `Nothing in your recipe book matches "${query.trim()}".`
                : "You haven't made any recipes yet. Create one and it'll show up here."}
            </Text>
            {!q && (
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push('/recipes/new' as never)}
                activeOpacity={0.85}
              >
                <Text style={styles.emptyCtaText}>Create a recipe</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <HeaderFlatList
              data={filteredRecipes}
              keyExtractor={(r) => r.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={listPadding}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <PickRow
                  imageUrl={item.cover_image_url}
                  fallbackIcon="restaurant-outline"
                  name={item.name}
                  detail={recipeDetail(item)}
                  grade={item.nutriscore_grade}
                  busy={busyId === item.id}
                  disabled={Boolean(busyId)}
                  onPress={() => setPending({ kind: 'recipe', recipe: item })}
                />
              )}
            />
        )
      ) : filteredScans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {q
              ? `None of your scans match "${query.trim()}".`
              : 'No scans yet. Scan a product and you can plan it into a meal.'}
          </Text>
        </View>
      ) : (
          <HeaderFlatList
            data={filteredScans}
            keyExtractor={(s) => s.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={listPadding}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <PickRow
                imageUrl={item.image_url}
                fallbackIcon="nutrition-outline"
                name={item.product_name}
                detail={item.brand}
                grade={item.nutriscore_grade}
                busy={busyId === item.id}
                disabled={Boolean(busyId)}
                onPress={() => setPending({ kind: 'scan', scan: item })}
              />
            )}
          />
      )}

      <QuantityPickerSheet
        visible={pending !== null}
        title={pending?.kind === 'recipe' ? 'How many servings?' : 'How much?'}
        saveLabel="Add to meal"
        servingsMode={pending?.kind === 'recipe'}
        value={pending?.kind === 'recipe' ? 1 : DEFAULT_PRODUCT_GRAMS}
        unit="g"
        onClose={() => setPending(null)}
        onSave={(value, unit) => {
          const picked = pending;
          setPending(null);
          if (picked?.kind === 'recipe') addRecipe(picked.recipe, value);
          else if (picked?.kind === 'scan') addScan(picked.scan, value, unit);
        }}
      />
    </ScreenLayout>
  );
}

function recipeDetail(recipe: Recipe): string {
  const parts: string[] = [];
  if (recipe.total_carbs_g != null) parts.push(`${Math.round(Number(recipe.total_carbs_g))} g carbs`);
  if (recipe.total_kcal != null) parts.push(`${Math.round(Number(recipe.total_kcal))} kcal`);
  return parts.length > 0 ? `${parts.join(' · ')} per serving` : `Serves ${recipe.servings}`;
}

// ── Row ──────────────────────────────────────────────────────────────────────

function PickRow({
  imageUrl,
  fallbackIcon,
  name,
  detail,
  grade,
  busy,
  disabled,
  onPress,
}: {
  imageUrl: string | null;
  fallbackIcon: 'restaurant-outline' | 'nutrition-outline';
  name: string;
  detail: string | null;
  grade: string | null;
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const g = grade?.toLowerCase() as keyof typeof NUTRISCORE_COLORS | undefined;
  const nutriColor = g ? NUTRISCORE_COLORS[g] : null;

  return (
    <TouchableOpacity
      style={[styles.row, busy && styles.rowBusy]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled}
    >
      <View style={styles.thumb}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumbImage} />
        ) : (
          <Ionicons name={fallbackIcon} size={20} color={Colors.secondary} />
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <Text style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {g && nutriColor && (
        <View style={[styles.nutri, { backgroundColor: nutriColor }]}>
          <Text style={styles.nutriText}>{g.toUpperCase()}</Text>
        </View>
      )}
      {busy ? (
        <ActivityIndicator color={Colors.secondary} />
      ) : (
        <Ionicons name="add" size={22} color={Colors.secondary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Search, pinned under the title (24px sides like every titled page).
  controls: {
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.s,
  },
  loadingWrap: {
    padding: Spacing.l,
    alignItems: 'center',
  },
  emptyWrap: {
    padding: Spacing.m,
    alignItems: 'center',
    gap: Spacing.s,
  },
  emptyText: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
  emptyCta: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  emptyCtaText: {
    ...Typography.h5,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.l,
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
  },
  rowBusy: { opacity: 0.6 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 2 },
  name: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  detail: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  nutri: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
