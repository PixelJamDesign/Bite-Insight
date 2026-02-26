import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ActionSheetIOS,
  Modal,
  Platform,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase, getIngredientImageUrl } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { Colors, Shadows } from '@/constants/theme';
import { ScreenLayout } from '@/components/ScreenLayout';
import { MenuLikedIcon, MenuDislikedIcon, MenuFlaggedIcon, ActionSearchIcon, ActionPenIcon } from '@/components/MenuIcons';
import { IngredientDetailModal } from '@/components/IngredientDetailModal';
import type { Ingredient, DietaryTag } from '@/lib/types';

type PreferenceTab = 'liked' | 'disliked' | 'flagged';

type PreferenceItem = {
  ingredient_id: string;
  ingredients: {
    id: string;
    name: string;
    category?: string | null;
    image_url?: string | null;
    fact?: string | null;
    is_flagged?: boolean;
    flag_reason?: string | null;
    dietary_tags?: string[];
  };
};

const PAGE_TITLES: Record<PreferenceTab, string> = {
  liked: 'Liked ingredients',
  disliked: 'Disliked ingredients',
  flagged: 'Flagged ingredients',
};

const COUNT_VERBS: Record<PreferenceTab, string> = {
  liked: 'you like',
  disliked: 'you dislike',
  flagged: 'you have flagged',
};

const EMPTY_TITLES: Record<PreferenceTab, string> = {
  liked: 'You currently have no liked ingredients',
  disliked: 'You currently have no disliked ingredients',
  flagged: 'You currently have no flagged ingredients',
};

const EMPTY_DESCRIPTIONS: Record<PreferenceTab, string> = {
  liked:
    "To make your meal planning easier, rate some of your favourite ingredients on the dashboard. When you use the Insight Scanner, we'll spotlight them and suggest tasty recipes you'll love!",
  disliked:
    "Rate ingredients on the dashboard to build your disliked list. We'll make sure to flag them whenever they appear in a product.",
  flagged:
    "Flag ingredients from the dashboard or scan results to highlight them in red whenever they appear in a product.",
};

const FLAGGED_PLACEHOLDERS = [
  { name: 'Palm Oil' },
  { name: 'High-Fructose Corn Syrup' },
  { name: 'Sodium Benzoate' },
];

export default function IngredientPreferencesScreen() {
  const { session } = useAuth();
  const { isPlus } = useSubscription();
  const params = useLocalSearchParams<{ tab?: string }>();

  const activeTab = (params.tab as PreferenceTab) ?? 'liked';
  const [items, setItems] = useState<PreferenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuIngredient, setMenuIngredient] = useState<PreferenceItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const { height: screenHeight } = useWindowDimensions();
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchInputRef = useRef<TextInput>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  function toIngredient(item: PreferenceItem): Ingredient {
    return {
      id: item.ingredient_id,
      name: item.ingredients.name,
      fact: item.ingredients.fact ?? null,
      image_url: item.ingredients.image_url ?? null,
      is_flagged: item.ingredients.is_flagged ?? false,
      flag_reason: item.ingredients.flag_reason ?? null,
      dietary_tags: (item.ingredients.dietary_tags ?? []) as DietaryTag[],
    };
  }

  useEffect(() => {
    setSearchActive(false);
    setSearchQuery('');
    setSelectedCategory('all');
  }, [activeTab]);

  useEffect(() => {
    if (!session?.user || (activeTab === 'flagged' && !isPlus)) return;
    setLoading(true);
    setFetchError(null);

    (async () => {
      const col = `${activeTab}_ingredients`;
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(col)
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('[ingredient-preferences] fetch failed:', profileError.message);
        setFetchError(profileError.message);
        setLoading(false);
        return;
      }

      const ids: string[] = (profileData as any)?.[col] ?? [];

      if (!ids.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const { data: ingredients, error: ingError } = await supabase
        .from('ingredients')
        .select('id, name, category, image_url, fact, is_flagged, flag_reason, dietary_tags')
        .in('id', ids);

      if (ingError) {
        console.error('[ingredient-preferences] ingredients fetch failed:', ingError.message);
        setFetchError(ingError.message);
        setLoading(false);
        return;
      }

      setItems(
        (ingredients ?? []).map((ing) => ({
          ingredient_id: ing.id,
          ingredients: ing,
        }))
      );
      setLoading(false);
    })();
  }, [activeTab, session]);

  const categories = ['all', ...new Set(items.map((i) => i.ingredients.category).filter(Boolean))] as string[];

  const filteredItems = items.filter((item) => {
    const matchesSearch = searchQuery === '' ||
      item.ingredients.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' ||
      item.ingredients.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  async function handleRemove(ingredientId: string) {
    if (!session?.user) return;
    setItems((prev) => prev.filter((i) => i.ingredient_id !== ingredientId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(ingredientId);
      return next;
    });

    const col = `${activeTab}_ingredients`;
    const { data: profileData } = await supabase
      .from('profiles')
      .select(col)
      .eq('id', session.user.id)
      .single();
    const current: string[] = (profileData as any)?.[col] ?? [];
    await supabase
      .from('profiles')
      .update({ [col]: current.filter((id) => id !== ingredientId) })
      .eq('id', session.user.id);
  }

  async function handleDeleteSelected() {
    if (!session?.user || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setItems((prev) => prev.filter((i) => !selectedIds.has(i.ingredient_id)));
    setSelectedIds(new Set());
    setEditMode(false);

    const col = `${activeTab}_ingredients`;
    const { data: profileData } = await supabase
      .from('profiles')
      .select(col)
      .eq('id', session.user.id)
      .single();
    const current: string[] = (profileData as any)?.[col] ?? [];
    const toRemove = new Set(ids);
    await supabase
      .from('profiles')
      .update({ [col]: current.filter((id) => !toRemove.has(id)) })
      .eq('id', session.user.id);
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function closeMenu() {
    setMenuIngredient(null);
  }

  async function handleMove(ingredientId: string, targetPref: PreferenceTab) {
    closeMenu();
    if (!session?.user) return;
    setItems((prev) => prev.filter((i) => i.ingredient_id !== ingredientId));

    const fromCol = `${activeTab}_ingredients`;
    const toCol = `${targetPref}_ingredients`;
    const { data } = await supabase
      .from('profiles')
      .select(`${fromCol}, ${toCol}`)
      .eq('id', session.user.id)
      .single();
    const fromList: string[] = (data as any)?.[fromCol] ?? [];
    const toList: string[] = (data as any)?.[toCol] ?? [];
    await supabase
      .from('profiles')
      .update({
        [fromCol]: fromList.filter((id) => id !== ingredientId),
        [toCol]: [...new Set([...toList, ingredientId])],
      })
      .eq('id', session.user.id);
  }

  type MenuAction = {
    label: string;
    renderIcon: (color: string) => React.ReactNode;
    color?: string;
    onPress: () => void;
  };

  function getMenuActions(item: PreferenceItem): MenuAction[] {
    const actions: MenuAction[] = [];
    if (activeTab !== 'liked') {
      actions.push({
        label: 'Like Ingredient',
        renderIcon: (color) => <MenuLikedIcon size={18} color={color} />,
        onPress: () => handleMove(item.ingredient_id, 'liked'),
      });
    }
    if (activeTab !== 'disliked') {
      actions.push({
        label: 'Dislike Ingredient',
        renderIcon: (color) => <MenuDislikedIcon size={18} color={color} />,
        onPress: () => handleMove(item.ingredient_id, 'disliked'),
      });
    }
    if (activeTab !== 'flagged' && isPlus) {
      actions.push({
        label: 'Flag Ingredient',
        renderIcon: (color) => <MenuFlaggedIcon size={18} color={color} />,
        onPress: () => handleMove(item.ingredient_id, 'flagged'),
      });
    }
    actions.push({
      label: 'Remove Ingredient',
      renderIcon: (color) => <Ionicons name="trash-outline" size={18} color={color} />,
      color: Colors.status.negative,
      onPress: () => { closeMenu(); handleRemove(item.ingredient_id); },
    });
    return actions;
  }

  function openRowMenu(item: PreferenceItem, event: GestureResponderEvent) {
    const actions = getMenuActions(item);

    if (Platform.OS === 'ios') {
      const labels = [...actions.map((a) => a.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: item.ingredients.name,
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: actions.findIndex((a) => !!a.color),
        },
        (idx) => { if (idx < actions.length) actions[idx].onPress(); }
      );
      return;
    }

    setMenuAnchor({ x: event.nativeEvent.pageX, y: event.nativeEvent.pageY });
    setMenuIngredient(item);
  }

  function exitEditMode() {
    setEditMode(false);
    setSelectedIds(new Set());
  }

  function openSearch() {
    setSearchActive(true);
    setEditMode(false);
    setSelectedIds(new Set());
    setTimeout(() => searchInputRef.current?.focus(), 50);
  }

  function closeSearch() {
    setSearchActive(false);
    setSearchQuery('');
    setSelectedCategory('all');
  }

  const count = items.length;

  // ── Header extension ──────────────────────────────────────────────────────────
  const headerExtension = (
    <View style={styles.headerExt}>
      {/* Subtitle: "Currently you like 12 ingredients" */}
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitleLight}>Currently {COUNT_VERBS[activeTab]} </Text>
        <Text style={styles.subtitleBold}>
          {count} {count === 1 ? 'ingredient' : 'ingredients'}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionBtnRow}>
        {editMode ? (
          <TouchableOpacity style={styles.actionBtn} onPress={exitEditMode} activeOpacity={0.7}>
            <Ionicons name="close" size={16} color={Colors.secondary} />
            <Text style={styles.actionBtnText}>Cancel</Text>
          </TouchableOpacity>
        ) : searchActive ? (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setEditMode(true); closeSearch(); }}
              activeOpacity={0.7}
            >
              <ActionPenIcon size={16} color={Colors.secondary} />
              <Text style={styles.actionBtnText}>Edit list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={closeSearch} activeOpacity={0.7}>
              <Ionicons name="close" size={16} color={Colors.secondary} />
              <Text style={styles.actionBtnText}>Close</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setEditMode(true)}
              activeOpacity={0.7}
            >
              <ActionPenIcon size={20} color={Colors.secondary} />
              <Text style={styles.actionBtnText}>Edit list</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={openSearch} activeOpacity={0.7}>
              <ActionSearchIcon size={20} color={Colors.secondary} />
              <Text style={styles.actionBtnText}>Search</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Search bar */}
      {searchActive && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <ActionSearchIcon size={24} color={Colors.secondary} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search ingredients..."
              placeholderTextColor={Colors.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Ionicons name="close-circle" size={16} color={Colors.secondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Category tab bar — always visible when multiple categories exist */}
      {categories.length > 1 && (
        <View style={styles.categoryTabsOuter}>
          <LinearGradient
            colors={[Colors.background, 'rgba(226,241,238,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.categoryFadeLeft}
            pointerEvents="none"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryTab, selectedCategory === cat && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryTabText, selectedCategory === cat && styles.categoryTabTextActive]}>
                  {cat === 'all' ? 'All' : cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <LinearGradient
            colors={['rgba(226,241,238,0)', Colors.background]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.categoryFadeRight}
            pointerEvents="none"
          />
        </View>
      )}
    </View>
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
    <ScreenLayout title={PAGE_TITLES[activeTab]} headerExtension={headerExtension}>
      {activeTab === 'flagged' && !isPlus ? (
        <FlaggedUpsell />
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : fetchError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.status.negative} />
          <Text style={[styles.emptyTitle, { marginTop: 12, textAlign: 'center' }]}>
            Could not load ingredients
          </Text>
          <Text style={[styles.emptyDesc, { textAlign: 'center', paddingHorizontal: 32, marginTop: 4 }]}>
            {fetchError.includes('does not exist')
              ? 'Database migration required — please run the ALTER TABLE statements in your Supabase SQL Editor to add the ingredient preference columns.'
              : fetchError}
          </Text>
        </View>
      ) : items.length === 0 ? (
        // ── Empty state ──────────────────────────────────────────────────────
        <View style={styles.emptyOuter}>
          <View style={styles.emptyInner}>
            <View style={styles.emptyIconWrap}>
              <Ionicons
                name={activeTab === 'liked' ? 'leaf-outline' : 'close-circle-outline'}
                size={42}
                color={Colors.secondary}
              />
            </View>
            <Text style={styles.emptyTitle}>{EMPTY_TITLES[activeTab]}</Text>
            <Text style={styles.emptyDesc}>{EMPTY_DESCRIPTIONS[activeTab]}</Text>
          </View>
        </View>
      ) : (
        // ── Ingredient list ──────────────────────────────────────────────────
        <View style={styles.listOuter}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredItems.map((item) => (
              <TouchableOpacity
                key={item.ingredient_id}
                style={styles.row}
                activeOpacity={editMode ? 0.65 : 0.75}
                onPress={editMode
                  ? () => toggleSelected(item.ingredient_id)
                  : () => setSelectedIngredient(toIngredient(item))
                }
              >
                {editMode && (
                  <View
                    style={[
                      styles.checkbox,
                      selectedIds.has(item.ingredient_id) && styles.checkboxChecked,
                    ]}
                  >
                    {selectedIds.has(item.ingredient_id) && (
                      <Ionicons name="checkmark" size={11} color="#fff" />
                    )}
                  </View>
                )}
                <View style={styles.rowImage}>
                  {item.ingredients.image_url ? (
                    <Image
                      source={{ uri: getIngredientImageUrl(item.ingredients.image_url) ?? item.ingredients.image_url }}
                      style={styles.rowImageImg}
                    />
                  ) : (
                    <View style={[styles.rowImageImg, styles.rowImagePlaceholder]}>
                      <Text style={styles.rowImagePlaceholderText}>
                        {item.ingredients.name[0].toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.ingredients.name}
                </Text>
                {!editMode && (
                  <TouchableOpacity
                    style={styles.rowMenuBtn}
                    onPress={(e) => openRowMenu(item, e)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="ellipsis-horizontal" size={14} color={Colors.secondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer — edit mode only */}
          {editMode && (
            <View style={styles.footer}>
              <LinearGradient
                colors={['rgba(226,241,238,0)', '#e2f1ee']}
                locations={[0, 0.45]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.footerEditRow}>
                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    selectedIds.size === 0 && styles.deleteBtnDisabled,
                  ]}
                  onPress={handleDeleteSelected}
                  activeOpacity={0.85}
                  disabled={selectedIds.size === 0}
                >
                  <Text style={styles.deleteBtnText}>Delete selected</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={exitEditMode}
                  activeOpacity={0.85}
                >
                  <Text style={styles.outlineBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </ScreenLayout>

    {/* ── Ingredient detail modal ── */}
    <IngredientDetailModal
      ingredient={selectedIngredient}
      preference={activeTab}
      onClose={() => setSelectedIngredient(null)}
      onLike={() => {
        if (selectedIngredient && activeTab !== 'liked') handleMove(selectedIngredient.id, 'liked');
        setSelectedIngredient(null);
      }}
      onDislike={() => {
        if (selectedIngredient && activeTab !== 'disliked') handleMove(selectedIngredient.id, 'disliked');
        setSelectedIngredient(null);
      }}
      onFlag={() => {
        if (selectedIngredient && activeTab !== 'flagged') handleMove(selectedIngredient.id, 'flagged');
        setSelectedIngredient(null);
      }}
      showFlag={isPlus}
    />

    {/* ── Floating action menu — web + Android ── */}
    {menuIngredient !== null && Platform.OS !== 'ios' && (
      <Modal
        transparent
        visible
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
      >
        <TouchableOpacity style={[StyleSheet.absoluteFill, styles.menuOverlay]} onPress={closeMenu} activeOpacity={1} />
        <View style={[
          styles.actionMenuCard,
          { top: Math.max(80, Math.min(menuAnchor.y - 8, screenHeight - 240)) },
        ]}>
          {getMenuActions(menuIngredient).map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.actionMenuItem}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              {action.renderIcon(action.color ?? Colors.primary)}
              <Text style={[styles.actionMenuItemText, action.color ? { color: action.color } : null]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    )}
    </>
  );
}

// ── Flagged upsell ─────────────────────────────────────────────────────────────
function FlaggedUpsell() {
  return (
    <View style={styles.flaggedOuter}>
      {/* Dimmed placeholder rows */}
      <View style={styles.flaggedRows}>
        {FLAGGED_PLACEHOLDERS.map((p) => (
          <View key={p.name} style={[styles.row, styles.rowDimmed]}>
            <Text style={styles.rowName}>{p.name}</Text>
            <View style={styles.rowMenuBtn}>
              <Ionicons name="flag-outline" size={14} color={Colors.secondary} />
            </View>
          </View>
        ))}
      </View>

      {/* Gradient + upsell card */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <LinearGradient
          colors={['rgba(226,241,238,0)', 'rgba(226,241,238,0.94)', '#e2f1ee']}
          locations={[0, 0.28, 0.52]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.upsellOverlay}>
          <View style={styles.upsellCard}>
            <LinearGradient
              colors={['#023432', '#002923']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.upsellGradient}
            >
              <View style={styles.upsellLogoRow}>
                <Text style={styles.upsellLogoBite}>bite</Text>
                <Text style={styles.upsellLogoInsight}>insight</Text>
                <View style={styles.upsellPlusTag}>
                  <Text style={styles.upsellPlusTagText}>plus</Text>
                  <Text style={styles.upsellPlusTagSup}>+</Text>
                </View>
              </View>
              <Text style={styles.upsellTagline}>
                Flag ingredients to highlight{'\n'}them in red on every scan
              </Text>
              <TouchableOpacity style={styles.upsellBtn} activeOpacity={0.85}>
                <Text style={styles.upsellBtnText}>Upgrade to Plus+</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Header extension ─────────────────────────────────────────────────────────
  headerExt: {
    paddingTop: 4,
    paddingBottom: 0,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  subtitleLight: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 24,
  },
  subtitleBold: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  actionBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  // ── Search ────────────────────────────────────────────────────────────────────
  searchSection: {
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    padding: 0,
    margin: 0,
  },
  // ── Category tab bar ──────────────────────────────────────────────────────────
  categoryTabsOuter: {
    position: 'relative',
    paddingTop: 4,
    paddingBottom: 8,
  },
  categoryFadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 32,
    zIndex: 1,
  },
  categoryFadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 32,
    zIndex: 1,
  },
  categoryTabsContent: {
    paddingHorizontal: 24,
    gap: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  categoryTabActive: {
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1.5,
    borderColor: '#ffffff',
    ...Shadows.level3,
  },
  categoryTabText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    lineHeight: 20,
  },
  categoryTabTextActive: {
    color: Colors.primary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 20,
  },
  // ── States ───────────────────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyOuter: {
    flex: 1,
  },
  emptyInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
    paddingBottom: 100,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
    lineHeight: 28,
  },
  emptyDesc: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // ── List ─────────────────────────────────────────────────────────────────────
  listOuter: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 4,
    paddingBottom: 130,
  },

  // ── Floating action menu ─────────────────────────────────────────────────────
  menuOverlay: {
    backgroundColor: 'rgba(226, 241, 238, 0.60)',
  },
  actionMenuCard: {
    position: 'absolute',
    right: 24,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 8,
    padding: 8,
    minWidth: 192,
    maxWidth: 260,
    ...Shadows.level2,
  },
  actionMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 36,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  actionMenuItemText: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Figtree_400Regular',
    color: Colors.primary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },

  // ── Ingredient row ───────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 55,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    ...Shadows.level4,
  },
  rowDimmed: {
    opacity: 0.35,
  },
  rowName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 24,
    marginRight: 8,
  },
  rowMenuBtn: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 8,
    flexShrink: 0,
  },
  rowImageImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  rowImagePlaceholder: {
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowImagePlaceholderText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  // ── Edit mode checkbox ───────────────────────────────────────────────────────
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 48,
    justifyContent: 'flex-end',
  },
  footerEditRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    lineHeight: 20,
  },
  deleteBtn: {
    flex: 1,
    backgroundColor: Colors.status.negative,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    lineHeight: 20,
  },
  outlineBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.secondary,
    paddingVertical: 16,
    alignItems: 'center',
  },
  outlineBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 20,
  },

  // ── Flagged upsell ───────────────────────────────────────────────────────────
  flaggedOuter: {
    flex: 1,
  },
  flaggedRows: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 4,
  },
  upsellOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    top: '25%',
  },
  upsellCard: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Shadows.level4,
  },
  upsellGradient: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
    alignItems: 'center',
  },
  upsellLogoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  upsellLogoBite: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.5,
  },
  upsellLogoInsight: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.accent,
    letterSpacing: -0.5,
  },
  upsellPlusTag: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginLeft: 6,
    marginBottom: 2,
  },
  upsellPlusTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    lineHeight: 13,
  },
  upsellPlusTagSup: {
    color: '#fff',
    fontSize: 7,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    lineHeight: 9,
  },
  upsellTagline: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.32,
    lineHeight: 22,
  },
  upsellBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  upsellBtnText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
