import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActionSheetIOS,
  Modal,
  Platform,
  TextInput,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { supabase, getIngredientImageUrl } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { Colors, Shadows } from '@/constants/theme';
import { ScreenLayout } from '@/components/ScreenLayout';
import { MenuLikedIcon, MenuDislikedIcon, MenuFlaggedIcon, ActionSearchIcon, ActionClearIcon, ActionPenIcon } from '@/components/MenuIcons';
import { IngredientDetailModal } from '@/components/IngredientDetailModal';
import { FlagReasonSheet } from '@/components/FlagReasonSheet';
import { LottieLoader } from '@/components/LottieLoader';
import { PlusBadge } from '@/components/PlusBadge';
import { useTabBarSlide } from '@/lib/tabBarContext';
import { useFadeIn } from '@/lib/useFadeIn';
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

// PAGE_TITLES, COUNT_VERBS, EMPTY_TITLES, EMPTY_DESCRIPTIONS, FLAGGED_PLACEHOLDERS
// are now computed inside the component using i18n translation functions.

export default function IngredientPreferencesScreen() {
  const { t } = useTranslation('ingredients');
  const { t: tc } = useTranslation('common');
  const { session } = useAuth();
  const { isPlus } = useSubscription();
  const params = useLocalSearchParams<{ tab?: string }>();

  const activeTab = (params.tab as PreferenceTab) ?? 'liked';

  const PAGE_TITLES: Record<PreferenceTab, string> = {
    liked: t('preferences.pageTitle.liked'),
    disliked: t('preferences.pageTitle.disliked'),
    flagged: t('preferences.pageTitle.flagged'),
  };

  const COUNT_VERBS: Record<PreferenceTab, string> = {
    liked: t('preferences.countVerb.liked'),
    disliked: t('preferences.countVerb.disliked'),
    flagged: t('preferences.countVerb.flagged'),
  };

  const EMPTY_TITLES: Record<PreferenceTab, string> = {
    liked: t('preferences.empty.titleLiked'),
    disliked: t('preferences.empty.titleDisliked'),
    flagged: t('preferences.empty.titleFlagged'),
  };

  const EMPTY_DESCRIPTIONS: Record<PreferenceTab, string> = {
    liked: t('preferences.empty.descriptionLiked'),
    disliked: t('preferences.empty.descriptionDisliked'),
    flagged: t('preferences.empty.descriptionFlagged'),
  };

  const [items, setItems] = useState<PreferenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const tabBarSlide = useTabBarSlide();
  // Slide tab bar off-screen when edit mode is active
  useEffect(() => {
    Animated.timing(tabBarSlide, {
      toValue: editMode ? 150 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [editMode]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuIngredient, setMenuIngredient] = useState<PreferenceItem | null>(null);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0 });
  const { height: screenHeight } = useWindowDimensions();
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const searchInputRef = useRef<TextInput>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [flagReasonTarget, setFlagReasonTarget] = useState<PreferenceItem | null>(null);
  const [profileMeta, setProfileMeta] = useState<{
    health_conditions: string[];
    allergies: string[];
    dietary_preferences: string[];
  }>({ health_conditions: [], allergies: [], dietary_preferences: [] });

  const fadeContent = useFadeIn(!loading && items.length > 0, 0);

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

  // Fetch profile meta for FlagReasonSheet
  useEffect(() => {
    if (!session?.user) return;
    supabase
      .from('profiles')
      .select('health_conditions, allergies, dietary_preferences')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfileMeta({
            health_conditions: data.health_conditions ?? [],
            allergies: data.allergies ?? [],
            dietary_preferences: data.dietary_preferences ?? [],
          });
        }
      });
  }, [session?.user?.id]);

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

    // Clean up flag reason when removing a flagged ingredient
    if (activeTab === 'flagged') {
      await supabase
        .from('ingredient_flag_reasons')
        .delete()
        .eq('user_id', session.user.id)
        .eq('ingredient_id', ingredientId);
    }
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

    // Clean up flag reason when moving away from flagged
    if (activeTab === 'flagged' && targetPref !== 'flagged') {
      await supabase
        .from('ingredient_flag_reasons')
        .delete()
        .eq('user_id', session.user.id)
        .eq('ingredient_id', ingredientId);
    }
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
        label: t('preferences.menu.likeIngredient'),
        renderIcon: (color) => <MenuLikedIcon size={18} color={color} />,
        onPress: () => handleMove(item.ingredient_id, 'liked'),
      });
    }
    if (activeTab !== 'disliked') {
      actions.push({
        label: t('preferences.menu.dislikeIngredient'),
        renderIcon: (color) => <MenuDislikedIcon size={18} color={color} />,
        onPress: () => handleMove(item.ingredient_id, 'disliked'),
      });
    }
    if (activeTab !== 'flagged' && isPlus) {
      actions.push({
        label: t('preferences.menu.flagIngredient'),
        renderIcon: (color) => <MenuFlaggedIcon size={18} color={color} />,
        onPress: () => { closeMenu(); setFlagReasonTarget(item); },
      });
    }
    actions.push({
      label: t('preferences.menu.removeIngredient'),
      renderIcon: (color) => <Ionicons name="trash-outline" size={18} color={color} />,
      color: Colors.status.negative,
      onPress: () => { closeMenu(); handleRemove(item.ingredient_id); },
    });
    return actions;
  }

  function openRowMenu(item: PreferenceItem, event: GestureResponderEvent) {
    const actions = getMenuActions(item);

    if (Platform.OS === 'ios') {
      const labels = [...actions.map((a) => a.label), tc('buttons.cancel')];
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
        <Text style={styles.subtitleLight}>{t('preferences.subtitle.currently')}{COUNT_VERBS[activeTab]} </Text>
        <Text style={styles.subtitleBold}>
          {t('preferences.subtitle.ingredient', { count })}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionBtnRow}>
        {editMode ? (
          <TouchableOpacity style={styles.actionBtn} onPress={exitEditMode} activeOpacity={0.7}>
            <Ionicons name="close" size={16} color={Colors.secondary} />
            <Text style={styles.actionBtnText}>{tc('buttons.cancel')}</Text>
          </TouchableOpacity>
        ) : searchActive ? (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { setEditMode(true); closeSearch(); }}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconSlot}>
                <ActionPenIcon size={20} color={Colors.secondary} />
              </View>
              <Text style={styles.actionBtnText}>{tc('buttons.editList')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={closeSearch} activeOpacity={0.7}>
              {/* No 20×20 slot here — render the close X the same way
                  as the clear button inside the search field so the
                  two look identical across the screen. */}
              <ActionClearIcon size={14} color={Colors.secondary} />
              <Text style={styles.actionBtnText}>{tc('buttons.close')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setEditMode(true)}
              activeOpacity={0.7}
            >
              <View style={styles.actionIconSlot}>
                <ActionPenIcon size={20} color={Colors.secondary} />
              </View>
              <Text style={styles.actionBtnText}>{tc('buttons.editList')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={openSearch} activeOpacity={0.7}>
              <View style={styles.actionIconSlot}>
                <ActionSearchIcon size={20} color={Colors.secondary} />
              </View>
              <Text style={styles.actionBtnText}>{tc('buttons.search')}</Text>
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
              style={[
                styles.searchInput,
                searchQuery !== '' && styles.searchInputFilled,
              ]}
              placeholder={t('preferences.search.placeholder')}
              placeholderTextColor="rgba(2,52,50,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <ActionClearIcon color={Colors.secondary} size={14} />
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
                  {cat === 'all' ? tc('filters.all') : cat}
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
        <LottieLoader type="loading" fullScreen={false} />
      ) : fetchError ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={42} color={Colors.status.negative} />
          <Text style={[styles.emptyTitle, { marginTop: 12, textAlign: 'center' }]}>
            {t('preferences.error.title')}
          </Text>
          <Text style={[styles.emptyDesc, { textAlign: 'center', paddingHorizontal: 32, marginTop: 4 }]}>
            {fetchError.includes('does not exist')
              ? t('preferences.error.migrationRequired')
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
        <Animated.View style={[styles.listOuter, { opacity: fadeContent.opacity, transform: [{ translateY: fadeContent.translateY }] }]}>
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
                  <Text style={styles.deleteBtnText}>{tc('buttons.deleteSelected')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={exitEditMode}
                  activeOpacity={0.85}
                >
                  <Text style={styles.outlineBtnText}>{tc('buttons.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Animated.View>
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
        if (selectedIngredient && activeTab !== 'flagged') {
          // Find the PreferenceItem for this ingredient to pass to FlagReasonSheet
          const item = items.find((i) => i.ingredient_id === selectedIngredient.id);
          if (item) setFlagReasonTarget(item);
        }
        setSelectedIngredient(null);
      }}
      showFlag={isPlus}
    />

    {/* ── Flag reason sheet ── */}
    <FlagReasonSheet
      visible={flagReasonTarget !== null}
      ingredientName={flagReasonTarget?.ingredients.name ?? ''}
      onClose={() => setFlagReasonTarget(null)}
      onConfirm={async (reasons) => {
        if (!flagReasonTarget || !session?.user) return;
        const ingredientId = flagReasonTarget.ingredient_id;
        setFlagReasonTarget(null);

        // Move ingredient to flagged list
        await handleMove(ingredientId, 'flagged');

        // Persist the flag reason(s)
        await supabase.from('ingredient_flag_reasons').upsert(
          {
            user_id: session.user.id,
            ingredient_id: ingredientId,
            reason_category: reasons.map((r) => r.category).join(', '),
            reason_text: reasons.map((r) => r.text).join(', '),
          },
          { onConflict: 'user_id,ingredient_id' }
        );
      }}
      healthConditions={profileMeta.health_conditions}
      allergies={profileMeta.allergies}
      dietaryPreferences={profileMeta.dietary_preferences}
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
  const { t } = useTranslation('ingredients');

  const placeholders = [
    { name: t('preferences.flaggedPlaceholder.palmOil') },
    { name: t('preferences.flaggedPlaceholder.highFructoseCornSyrup') },
    { name: t('preferences.flaggedPlaceholder.sodiumBenzoate') },
  ];

  return (
    <View style={styles.flaggedOuter}>
      {/* Dimmed placeholder rows */}
      <View style={styles.flaggedRows}>
        {placeholders.map((p) => (
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
                <Text style={styles.upsellLogoBite}>{t('upsell.bite')}</Text>
                <Text style={styles.upsellLogoInsight}>{t('upsell.insight')}</Text>
                <View style={{ marginLeft: 6, marginBottom: 2 }}>
                  <PlusBadge size="small" />
                </View>
              </View>
              <Text style={styles.upsellTagline}>
                {t('upsell.tagline')}
              </Text>
              <TouchableOpacity style={styles.upsellBtn} activeOpacity={0.85}>
                <Text style={styles.upsellBtnText}>{t('upsell.upgradeButton')}</Text>
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
  searchInputFilled: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
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
    flexShrink: 0,
  },
  // Fixed 20×20 slot for every inline action icon so the pen,
  // magnifier and clear-X all occupy the same footprint — no visual
  // jump when toggling between search/close.
  actionIconSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
