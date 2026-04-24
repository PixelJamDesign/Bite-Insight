/**
 * AddToRecipeSheet — shown from scan-result when user taps the "+" button.
 *
 * Offers:
 *  - "Start a new recipe" (seeds a draft with this product and navigates
 *    to /recipes/new where the user can keep adding ingredients)
 *  - "Add to current draft" (if a draft is already in progress)
 *  - List of existing saved recipes (adds directly to the DB, not draft)
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ActionSearchIcon } from '@/components/MenuIcons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useDraftRecipe } from '@/lib/draftRecipeContext';
import { useToast } from '@/lib/toastContext';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import type { ProductSnapshot, Recipe } from '@/lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** The product being added — caller is responsible for building this */
  snapshot: ProductSnapshot;
  /** The OFF barcode if this came from a scan */
  barcode?: string | null;
}

export function AddToRecipeSheet({ visible, onClose, snapshot, barcode }: Props) {
  const { session } = useAuth();
  const draft = useDraftRecipe();
  const { showToast } = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null); // recipe id being added
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  useEffect(() => {
    if (!visible || !session?.user?.id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (mounted) {
        setRecipes((data ?? []) as Recipe[]);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [visible, session?.user?.id]);

  function handleStartNewDraft() {
    // Seed a fresh draft with this product as the first ingredient
    draft.clear();
    draft.startNew();
    draft.addIngredient({
      barcode: barcode ?? null,
      scan_id: null,
      quantity_value: 100,
      quantity_unit: 'g',
      quantity_display: null,
      product_snapshot: snapshot,
    });
    onClose();
    setTimeout(() => {
      router.push('/recipes/new' as never);
    }, 120);
  }

  function handleAddToCurrentDraft() {
    draft.addIngredient({
      barcode: barcode ?? null,
      scan_id: null,
      quantity_value: 100,
      quantity_unit: 'g',
      quantity_display: null,
      product_snapshot: snapshot,
    });
    const draftName = draft.draft?.name || 'draft recipe';
    onClose();
    showToast({
      message: `Added to "${draftName}"`,
      variant: 'success',
      durationMs: 3000,
      action: {
        label: 'View',
        onPress: () => router.push('/recipes/new' as never),
      },
    });
  }

  async function handleAddToExisting(recipe: Recipe) {
    setAdding(recipe.id);
    try {
      // Fetch current max position so we append at the end
      const { data: existing } = await supabase
        .from('recipe_ingredients')
        .select('position')
        .eq('recipe_id', recipe.id)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const nextPos = existing ? existing.position + 1 : 0;

      const { error } = await supabase.from('recipe_ingredients').insert({
        recipe_id: recipe.id,
        position: nextPos,
        barcode: barcode ?? null,
        scan_id: null,
        quantity_value: 100,
        quantity_unit: 'g',
        quantity_display: null,
        product_snapshot: snapshot,
      });

      if (error) {
        console.warn('[AddToRecipeSheet] insert error:', error.message);
        showToast({
          message: 'Could not add to recipe. Please try again.',
          variant: 'error',
        });
        return;
      }

      onClose();
      showToast({
        message: `Added to "${recipe.name}"`,
        variant: 'success',
        durationMs: 3000,
        action: {
          label: 'View',
          onPress: () => router.push(`/recipes/${recipe.id}` as never),
        },
      });
    } finally {
      setAdding(null);
    }
  }

  const filteredRecipes = search.trim()
    ? recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : recipes;

  const hasDraft = draft.hasDraft && draft.draft != null;

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Add to recipe</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Top actions */}
          <View style={styles.topActions}>
            {hasDraft && (
              <TouchableOpacity
                style={[styles.actionRow, styles.actionRowPrimary]}
                onPress={handleAddToCurrentDraft}
                activeOpacity={0.85}
              >
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Ionicons name="add" size={20} color="#fff" />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, { color: '#fff' }]}>
                    Add to "{draft.draft?.name || 'draft recipe'}"
                  </Text>
                  <Text style={[styles.actionSub, { color: 'rgba(255,255,255,0.8)' }]}>
                    Continue building your current recipe
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionRow}
              onPress={handleStartNewDraft}
              activeOpacity={0.85}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="add-circle-outline" size={22} color={Colors.secondary} />
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Start a new recipe</Text>
                <Text style={styles.actionSub}>Build a recipe starting with this product</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
            </TouchableOpacity>
          </View>

          {/* Existing recipes */}
          {recipes.length > 0 && (
            <View style={styles.existingHeader}>
              <Text style={styles.existingLabel}>Add to existing recipe</Text>
              {recipes.length > 5 && (
                <View style={styles.searchBox}>
                  <ActionSearchIcon color={Colors.secondary} size={18} />
                  <TextInput
                    style={styles.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search your recipes"
                    placeholderTextColor="#99b8b3"
                  />
                </View>
              )}
            </View>
          )}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.secondary} />
            </View>
          ) : (
            <FlatList
              data={filteredRecipes}
              keyExtractor={(r) => r.id}
              contentContainerStyle={{ paddingBottom: Spacing.l }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.recipeRow}
                  onPress={() => handleAddToExisting(item)}
                  disabled={adding === item.id}
                  activeOpacity={0.8}
                >
                  <View style={styles.recipeThumb}>
                    {item.cover_image_url ? (
                      <Image source={{ uri: item.cover_image_url }} style={styles.recipeThumbImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="restaurant-outline" size={18} color={Colors.secondary} />
                    )}
                  </View>
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.recipeMeta}>
                      {item.servings} {item.servings === 1 ? 'serving' : 'servings'}
                      {item.total_kcal != null ? ` · ${item.total_kcal} kcal` : ''}
                    </Text>
                  </View>
                  {adding === item.id ? (
                    <ActivityIndicator color={Colors.secondary} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    ...Shadows.level3,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cdd8d6',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
  },
  title: { ...Typography.h4, color: Colors.primary },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topActions: {
    paddingHorizontal: Spacing.s,
    gap: 8,
    marginBottom: Spacing.s,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: Spacing.s,
    ...Shadows.level4,
  },
  actionRowPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionInfo: { flex: 1, gap: 2 },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  actionSub: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },

  existingHeader: {
    paddingHorizontal: Spacing.s,
    paddingBottom: 10,
  },
  existingLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    padding: 0,
  },
  loadingWrap: { padding: Spacing.l, alignItems: 'center' },

  recipeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.s,
    paddingVertical: 10,
  },
  recipeThumb: {
    width: 40,
    height: 40,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeThumbImage: { width: '100%', height: '100%' },
  recipeInfo: { flex: 1, gap: 2 },
  recipeName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  recipeMeta: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
});
