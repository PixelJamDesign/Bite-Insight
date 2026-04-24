/**
 * FamilyIngredientPreferencesPanel — the inline content of the ingredient
 * preferences UI. Shared by:
 *   • FamilyIngredientPreferencesSheet (bottom sheet wrapper)
 *   • The add-family-member flow (rendered as the 'ingredients' step)
 *
 * This is a fully-controlled component — the parent owns the draft state
 * and receives a fresh draft via onChange on every toggle. Each entry point
 * decides when to commit (bottom sheet: on Save; step flow: on final submit).
 *
 * Layout matches Figma node 4819-24905:
 *   • Optional member header (80px avatar + name + tag pills + divider)
 *   • Segmented control: Liked / Disliked / Flagged
 *   • Section title + count line + inline Edit list / Search actions
 *   • Horizontal-scroll category tabs (All + caller's categories)
 *   • Ingredient rows: thumb + name + dislike / like / flag trio
 */
import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android (iOS has it on by default). This lets
// a row fade / collapse when a user rates an ingredient, with the rows
// below sliding up to fill the gap.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Custom layout animation preset tuned for the "rate → row disappears"
// interaction. The opacity fade on delete makes the removal feel
// intentional, and the linked update keeps the rows below smoothly
// sliding up to fill the gap.
const ROW_REMOVE_ANIMATION = {
  duration: 240,
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};
import { Colors, Radius } from '@/constants/theme';
import { CachedAvatar } from '@/components/CachedAvatar';
import { ActionPenIcon, ActionSearchIcon, ActionClearIcon } from '@/components/MenuIcons';
import { IngredientRow } from '@/components/IngredientRow';
import type { Ingredient } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────

/**
 * The three concrete preference states an ingredient can hold.
 */
export type PreferenceState = 'liked' | 'disliked' | 'flagged';

/**
 * Tab selection for the panel.
 *   - 'all' shows only unrated ingredients, so rating one removes it
 *     from the view (matches the dashboard's unrated-ingredient flow).
 *   - 'liked' / 'disliked' / 'flagged' filter the list to only show
 *     ingredients currently in that preference.
 */
export type PreferenceTab = 'all' | PreferenceState;

/**
 * Ingredient shape for the preferences panel. Matches `Ingredient` from
 * lib/types plus an optional `category` used for the horizontal filter tabs.
 */
export interface PreferenceIngredient extends Ingredient {
  category?: string | null;
}

export interface FamilyMemberSummary {
  id: string;
  name: string;
  avatar_url?: string | null;
  /** Tag labels rendered beneath the name (conditions + allergies + prefs). */
  tags: string[];
}

/**
 * Per-ingredient preferences. Preferences are mutually exclusive — an
 * ingredient is in at most one of these three arrays at any time.
 */
export interface PreferenceDraft {
  liked: string[];
  disliked: string[];
  flagged: string[];
}

interface Props {
  member: FamilyMemberSummary;
  ingredients: PreferenceIngredient[];

  /** The currently-selected tab (liked / disliked / flagged). */
  tab: PreferenceTab;
  onTabChange: (tab: PreferenceTab) => void;

  /** Category filter label (or "All"). */
  category: string;
  onCategoryChange: (c: string) => void;

  /** Caller-supplied category labels — "All" is prepended automatically. */
  categories: string[];

  /** Fully-controlled preference draft. */
  draft: PreferenceDraft;
  onDraftChange: (next: PreferenceDraft) => void;

  /** Hide the 80px member header when the parent already has its own. */
  showMemberHeader?: boolean;

  /**
   * Called when the user taps the flag icon on a row. If provided, the
   * caller is expected to open a flag-reason sheet and — on confirm —
   * update the draft to include that ingredient in `flagged`.
   * If omitted, tapping flag toggles the ingredient directly (matches the
   * legacy dashboard behaviour when no reason sheet is available).
   */
  onFlagRequest?: (ingredient: PreferenceIngredient) => void;

  /** Whether the flag action is allowed (Plus-gated on the dashboard). */
  showFlag?: boolean;

  /** Tap the ingredient (not the buttons) — typically opens a detail modal. */
  onIngredientTap?: (ingredient: PreferenceIngredient) => void;

  onEditList?: (tab: PreferenceTab) => void;
  onSearch?: (tab: PreferenceTab) => void;
}

// ── Constants ────────────────────────────────────────────────────────────

export const ALL_CATEGORY = 'All';

const TABS: { key: PreferenceTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'liked', label: 'Liked' },
  { key: 'disliked', label: 'Disliked' },
  { key: 'flagged', label: 'Flagged' },
];

// ── Component ────────────────────────────────────────────────────────────

export function FamilyIngredientPreferencesPanel({
  member,
  ingredients,
  tab,
  onTabChange,
  category,
  onCategoryChange,
  categories,
  draft,
  onDraftChange,
  showMemberHeader = true,
  onFlagRequest,
  showFlag = true,
  onIngredientTap,
  onEditList,
  onSearch,
}: Props) {
  const counts = {
    liked: draft.liked.length,
    disliked: draft.disliked.length,
    flagged: draft.flagged.length,
  };

  // Inline search. Tapping the "Search" inline action toggles the field
  // visible. While a non-empty query is entered, the ingredient list is
  // filtered by a case-insensitive name match — the category filter and
  // tab filter still apply on top.
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const trimmedQuery = searchQuery.trim();

  // Quick lookup so each row can check its current preference in O(1).
  const preferenceById = useMemo(() => {
    const map: Record<string, PreferenceState> = {};
    draft.liked.forEach((id) => { map[id] = 'liked'; });
    draft.disliked.forEach((id) => { map[id] = 'disliked'; });
    draft.flagged.forEach((id) => { map[id] = 'flagged'; });
    return map;
  }, [draft]);

  // Tab + category + search filters, all stacked.
  //   - 'all' tab surfaces UNRATED ingredients so users can work through
  //     the catalog. Rating one moves it to its tab and disappears here,
  //     mirroring the dashboard's unrated-ingredient flow.
  //   - The three concrete tabs surface ingredients currently in that
  //     preference state so users can see or change what's been rated.
  const displayIngredients = useMemo(() => {
    let list = ingredients;
    if (tab === 'all') {
      list = list.filter((i) => !preferenceById[i.id]);
    } else {
      const idsForTab = new Set(draft[tab]);
      list = list.filter((i) => idsForTab.has(i.id));
    }
    if (category !== ALL_CATEGORY) {
      const needle = category.toLowerCase();
      list = list.filter((i) => (i.category ?? '').toLowerCase() === needle);
    }
    if (trimmedQuery.length > 0) {
      const q = trimmedQuery.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [ingredients, draft, tab, category, trimmedQuery, preferenceById]);

  /**
   * Mutually-exclusive toggle. Setting an ingredient to a state removes
   * it from the other two arrays first. Tapping the active state clears
   * the preference entirely.
   *
   * When the change will cause the ingredient to leave the visible list
   * (because it no longer matches the active tab), we request a one-shot
   * LayoutAnimation so the row fades out and the rows below slide up.
   */
  function setPreference(id: string, state: PreferenceState | null) {
    const current = preferenceById[id] ?? null;
    const willLeaveList =
      tab === 'all'
        ? state !== null              // All shows unrated; assigning a state removes it
        : state !== tab;              // Tab shows this state; anything else removes it
    if (willLeaveList) {
      LayoutAnimation.configureNext(ROW_REMOVE_ANIMATION);
    }

    const next: PreferenceDraft = {
      liked: draft.liked.filter((x) => x !== id),
      disliked: draft.disliked.filter((x) => x !== id),
      flagged: draft.flagged.filter((x) => x !== id),
    };
    if (state) next[state] = [...next[state], id];
    onDraftChange(next);
    // Silence the unused `current` — it may be useful later for distinct
    // animations per transition direction.
    void current;
  }

  function handleLike(ing: PreferenceIngredient) {
    setPreference(ing.id, preferenceById[ing.id] === 'liked' ? null : 'liked');
  }

  function handleDislike(ing: PreferenceIngredient) {
    setPreference(ing.id, preferenceById[ing.id] === 'disliked' ? null : 'disliked');
  }

  function handleFlag(ing: PreferenceIngredient) {
    // If the caller wants to capture a reason first, delegate and wait
    // for them to update the draft. Otherwise toggle directly.
    if (onFlagRequest) {
      onFlagRequest(ing);
    } else {
      setPreference(ing.id, preferenceById[ing.id] === 'flagged' ? null : 'flagged');
    }
  }

  const sectionTitle =
    tab === 'all' ? 'All ingredients'
    : tab === 'liked' ? 'Liked ingredients'
    : tab === 'disliked' ? 'Disliked ingredients'
    : 'Flagged ingredients';

  const sectionVerb =
    tab === 'all' ? 'has rated'
    : tab === 'liked' ? 'likes'
    : tab === 'disliked' ? 'dislikes'
    : 'has flagged';

  // On the 'All' tab the count represents the number of rated ingredients
  // (liked + disliked + flagged), so users see their overall progress.
  const sectionCount =
    tab === 'all'
      ? counts.liked + counts.disliked + counts.flagged
      : counts[tab];
  const countNoun = sectionCount === 1 ? 'ingredient' : 'ingredients';
  const allCategories = [ALL_CATEGORY, ...categories];

  return (
    <View style={styles.wrap}>
      {/* Member header (optional) */}
      {showMemberHeader && (
        <View style={styles.memberRow}>
          <View style={styles.avatarWrap}>
            <CachedAvatar
              avatarUrl={member.avatar_url ?? null}
              initials={initialsFrom(member.name)}
              size={80}
            />
          </View>
          <View style={styles.memberText}>
            <Text style={styles.memberName} numberOfLines={1}>
              {member.name}
            </Text>
            {member.tags.length > 0 && (
              <View style={styles.tagWrap}>
                {member.tags.map((t) => (
                  <View key={t} style={styles.tag}>
                    <Text style={styles.tagText}>{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

      {/* Segmented: Liked / Disliked / Flagged */}
      <View style={styles.segmented}>
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => onTabChange(t.key)}
              style={[styles.segment, active && styles.segmentActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.segmentText, active && styles.segmentTextActive]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <View style={styles.countRow}>
          <Text style={styles.countPrefix}>
            Currently, {member.name} {sectionVerb}
          </Text>
          <Text style={styles.countBold}>
            {sectionCount} {countNoun}
          </Text>
        </View>
        <View style={styles.inlineActions}>
          {onEditList && (
            <TouchableOpacity
              onPress={() => onEditList(tab)}
              style={styles.inlineBtn}
              activeOpacity={0.7}
            >
              {/* Fixed 20×20 slot — keeps every inline icon on the same
                  vertical baseline regardless of the glyph inside. */}
              <View style={styles.inlineIconSlot}>
                <ActionPenIcon color={Colors.secondary} size={20} />
              </View>
              <Text style={styles.inlineText}>Edit list</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => {
              setSearchVisible((prev) => {
                const next = !prev;
                if (!next) setSearchQuery('');
                return next;
              });
              onSearch?.(tab);
            }}
            style={styles.inlineBtn}
            activeOpacity={0.7}
          >
            <View style={styles.inlineIconSlot}>
              {searchVisible ? (
                // 14 inside a 20×20 slot — 3px of empty space each
                // side is the close button's visual padding.
                <ActionClearIcon color={Colors.secondary} size={14} />
              ) : (
                <ActionSearchIcon color={Colors.secondary} size={20} />
              )}
            </View>
            <Text style={styles.inlineText}>
              {searchVisible ? 'Close' : 'Search'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Inline search field. Mirrors common iOS pattern of revealing on
          tap rather than always occupying screen space. */}
      {searchVisible && (
        <View style={styles.searchRow}>
          <ActionSearchIcon color={Colors.secondary} size={20} />
          <TextInput
            style={[
              styles.searchInput,
              searchQuery.length > 0 && styles.searchInputFilled,
            ]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search ingredients…"
            placeholderTextColor="rgba(2,52,50,0.5)"
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <ActionClearIcon color={Colors.secondary} size={14} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {allCategories.map((c) => {
          const active = c === category;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => onCategoryChange(c)}
              style={[styles.categoryPill, active && styles.categoryPillActive]}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.categoryText, active && styles.categoryTextActive]}
              >
                {c}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Ingredient rows — shares the dashboard IngredientRow so the look
          and feel are identical across the app. */}
      <View style={styles.ingList}>
        {displayIngredients.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              {emptyCopy(tab, category, member.name, trimmedQuery.length > 0)}
            </Text>
          </View>
        ) : (
          displayIngredients.map((ing) => (
            <IngredientRow
              key={ing.id}
              ingredient={ing}
              preference={preferenceById[ing.id]}
              onLike={() => handleLike(ing)}
              onDislike={() => handleDislike(ing)}
              onFlag={() => handleFlag(ing)}
              onTap={onIngredientTap ? () => onIngredientTap(ing) : undefined}
              showFlag={showFlag}
            />
          ))
        )}
      </View>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function emptyCopy(
  tab: PreferenceTab,
  category: string,
  name: string,
  hasSearch: boolean,
): string {
  if (hasSearch) return 'No ingredients match your search.';
  const scope = category === ALL_CATEGORY ? '' : ` in ${category}`;
  if (tab === 'all') return `No ingredients${scope} in the catalog yet.`;
  if (tab === 'liked') return `${name} hasn't liked any ingredients${scope} yet.`;
  if (tab === 'disliked') return `${name} hasn't disliked any ingredients${scope} yet.`;
  return `No flagged ingredients${scope} yet.`;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// ── Styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrap: { gap: 24 },

  // Member row
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(170, 212, 205, 0.5)',
    paddingBottom: 16,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  memberText: { flex: 1, gap: 8, justifyContent: 'center' },
  memberName: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    backgroundColor: '#e2f1ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },

  // Segmented
  segmented: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  segment: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  segmentActive: {
    backgroundColor: '#e4f1ef',
    borderColor: '#aad4cd',
  },
  segmentText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  segmentTextActive: { color: Colors.primary },

  // Section header
  sectionHeader: { gap: 4 },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
  },
  countPrefix: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  countBold: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
  inlineActions: { flexDirection: 'row', gap: 16, marginTop: 4 },
  // flexShrink:0 keeps the icon + label intact when the "Search" text
  // flips to "Close search" (which is wider). Without this, the parent
  // row repacks and the pen icon appears to "shrink" on activation.
  inlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  // Fixed 20×20 slot so every inline action icon (pen, magnifier,
  // clear-X) occupies the same footprint. All three render at size
  // 20 — stroke widths are tuned at the icon-component level so they
  // read as a consistent set.
  inlineIconSlot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  // Inline search field — sits between the section header and the
  // category tabs when revealed.
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    padding: 0,
  },
  // Bolden the typed text — placeholder stays light so the empty
  // state still reads as a hint rather than a typed value.
  searchInputFilled: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },

  // Category tabs
  categoryRow: { gap: 0, alignItems: 'center' },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#e4f1ef',
    borderColor: '#fff',
  },
  categoryText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  categoryTextActive: { color: Colors.primary },

  // Ingredient list — rows themselves come from the shared IngredientRow
  // component so spacing is applied here only. The dashboard uses the same
  // pattern.
  ingList: { gap: 16 },

  // Empty state
  emptyCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    textAlign: 'center',
  },
});
