import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { Colors } from '@/constants/theme';
import { ScreenLayout } from '@/components/ScreenLayout';
import { ActionSearchIcon, ActionPenIcon } from '@/components/MenuIcons';
import { CachedAvatar } from '@/components/CachedAvatar';
import type { FamilyProfile } from '@/lib/types';
import FamilyIcon from '../assets/icons/family_lg.svg';

const TAG_CHIP_BG = '#B8DFD6';

// ── Helpers ────────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

/** Merge all tags into a single array for display as pills */
function getAllTags(p: FamilyProfile): string[] {
  const tags: string[] = [];
  if (p.health_conditions?.length) tags.push(...p.health_conditions);
  if (p.allergies?.length) tags.push(...p.allergies);
  if (p.dietary_preferences?.length) tags.push(...(p.dietary_preferences as string[]));
  return tags;
}

// ── Row component for the draggable list ──────────────────────────────────────
function EditRow({
  item: profile,
  drag,
  isActive,
  selectedIds,
  onToggle,
}: RenderItemParams<FamilyProfile> & {
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const tags = getAllTags(profile);
  return (
    <ScaleDecorator>
      <TouchableOpacity
        style={[styles.row, isActive && styles.rowDragging]}
        onPress={() => onToggle(profile.id)}
        onLongPress={drag}
        delayLongPress={150}
        activeOpacity={0.65}
      >
        {/* Checkbox */}
        <View style={[styles.checkbox, selectedIds.has(profile.id) && styles.checkboxChecked]}>
          {selectedIds.has(profile.id) && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>

        {/* Avatar */}
        <View style={styles.avatar}>
          <CachedAvatar
            avatarUrl={profile.avatar_url}
            initials={getInitials(profile.name)}
            size="100%"
            initialsStyle={styles.avatarText}
          />
        </View>

        {/* Info */}
        <View style={styles.rowInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.rowName} numberOfLines={1}>{profile.name}</Text>
            {profile.relationship ? (
              <Text style={styles.rowRelationship}>{profile.relationship}</Text>
            ) : null}
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.slice(0, 3).map((tag, i) => (
                <View key={tag} style={[styles.tag, { backgroundColor: TAG_CHIP_BG }]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Drag handle — right side */}
        <View style={styles.dragHandle}>
          <Ionicons name="reorder-three" size={30} color={Colors.secondary} />
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function FamilyMembersScreen() {
  const { session } = useAuth();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();

  const [profiles, setProfiles] = useState<FamilyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!isPlus) showUpsell();
  }, [isPlus]);

  const loadProfiles = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('family_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .order('sort_order', { ascending: true });
    if (data) setProfiles(data as FamilyProfile[]);
    setLoading(false);
  }, [session?.user?.id]);

  useFocusEffect(useCallback(() => { loadProfiles(); }, [loadProfiles]));

  const count = profiles.length;

  const filteredProfiles = searchQuery.trim()
    ? profiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : profiles;

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
  }

  /** Persist new order after drag-to-reorder */
  async function handleReorder(data: FamilyProfile[]) {
    setProfiles(data);
    // Fire-and-forget: update sort_order for each profile
    data.forEach((profile, index) => {
      supabase
        .from('family_profiles')
        .update({ sort_order: index + 1 })
        .eq('id', profile.id)
        .then();
    });
  }

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const names = profiles
      .filter(p => selectedIds.has(p.id))
      .map(p => p.name);
    const nameList = names.length <= 3
      ? names.join(', ')
      : `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
    Alert.alert(
      'Delete Family Members',
      `Are you sure you want to delete ${nameList}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await supabase.from('family_profiles').delete().in('id', ids);
            setSelectedIds(new Set());
            setEditMode(false);
            loadProfiles();
          },
        },
      ],
    );
  }

  // ── Header extension ──────────────────────────────────────────────────────────
  const headerExtension = (
    <View style={styles.headerExt}>
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitleLight}>You have </Text>
        <Text style={styles.subtitleBold}>{count} family {count === 1 ? 'member' : 'members'}</Text>
      </View>

      {count > 0 && (
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
                <Text style={styles.actionBtnText}>Edit Family</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={closeSearch} activeOpacity={0.7}>
                <Ionicons name="close" size={16} color={Colors.secondary} />
                <Text style={styles.actionBtnText}>Close</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setEditMode(true)} activeOpacity={0.7}>
                <ActionPenIcon size={20} color={Colors.secondary} />
                <Text style={styles.actionBtnText}>Edit Family</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={openSearch} activeOpacity={0.7}>
                <ActionSearchIcon size={20} color={Colors.secondary} />
                <Text style={styles.actionBtnText}>Search</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {searchActive && (
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <ActionSearchIcon size={24} color={Colors.secondary} />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search family members..."
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
    </View>
  );

  // ── Render row (normal mode) ────────────────────────────────────────────────
  function renderNormalRow(profile: FamilyProfile) {
    const tags = getAllTags(profile);
    return (
      <TouchableOpacity
        key={profile.id}
        style={styles.row}
        onPress={() => router.push({ pathname: '/add-family-member', params: { id: profile.id } })}
        activeOpacity={0.75}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          <CachedAvatar
            avatarUrl={profile.avatar_url}
            initials={getInitials(profile.name)}
            size="100%"
            initialsStyle={styles.avatarText}
          />
        </View>

        {/* Info */}
        <View style={styles.rowInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.rowName} numberOfLines={1}>{profile.name}</Text>
            {profile.relationship ? (
              <Text style={styles.rowRelationship}>{profile.relationship}</Text>
            ) : null}
          </View>
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.slice(0, 3).map((tag, i) => (
                <View key={tag} style={[styles.tag, { backgroundColor: TAG_CHIP_BG }]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Chevron */}
        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={16} color={`${Colors.primary}40`} />
        </View>
      </TouchableOpacity>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <>
      <ScreenLayout title="My Family" headerExtension={headerExtension}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : profiles.length === 0 ? (
          /* ── Empty state ── */
          <View style={styles.emptyOuter}>
            <View style={styles.emptyInner}>
              <View style={styles.emptyIconWrap}>
                <FamilyIcon width={40} height={40} />
              </View>
              <Text style={styles.emptyTitle}>No family members yet</Text>
              <Text style={styles.emptyDesc}>
                Create profiles for your family members to get personalised insights based on their needs and food preferences.
              </Text>
            </View>

            {/* Add button */}
            <View style={styles.addFooter}>
              <LinearGradient
                colors={['rgba(226,241,238,0)', '#e2f1ee']}
                locations={[0, 0.14]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => router.push('/add-family-member')}
                activeOpacity={0.88}
              >
                <Text style={styles.addBtnText}>Add a family member</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : editMode ? (
          /* ── Edit mode — draggable list ── */
          <GestureHandlerRootView style={styles.listOuter}>
            <DraggableFlatList
              data={profiles}
              keyExtractor={(item) => item.id}
              onDragEnd={({ data }) => handleReorder(data)}
              renderItem={(params) => (
                <EditRow
                  {...params}
                  selectedIds={selectedIds}
                  onToggle={toggleSelected}
                />
              )}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            />

            {/* Edit mode footer */}
            <View style={styles.editFooter}>
              <LinearGradient
                colors={['rgba(226,241,238,0)', '#e2f1ee']}
                locations={[0, 0.45]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.editFooterRow}>
                <TouchableOpacity
                  style={[styles.deleteSelectedBtn, selectedIds.size === 0 && styles.deleteSelectedBtnDisabled]}
                  onPress={handleDeleteSelected}
                  disabled={selectedIds.size === 0}
                  activeOpacity={0.85}
                >
                  <Text style={styles.deleteSelectedBtnText}>Delete selected</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={exitEditMode} activeOpacity={0.85}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GestureHandlerRootView>
        ) : (
          /* ── Normal mode — static list ── */
          <View style={styles.listOuter}>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredProfiles.map(renderNormalRow)}
            </ScrollView>

            {/* Add button — inside ScreenLayout so the menu overlay covers it */}
            {!editMode && (
              <View style={styles.addFooter}>
                <LinearGradient
                  colors={['rgba(226,241,238,0)', '#e2f1ee']}
                  locations={[0, 0.14]}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => router.push('/add-family-member')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.addBtnText}>Add a family member</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScreenLayout>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  headerExt: { paddingTop: 4, paddingBottom: 0 },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  subtitleLight: {
    fontSize: 16, fontWeight: '300', fontFamily: 'Figtree_300Light',
    color: Colors.secondary, lineHeight: 24,
  },
  subtitleBold: {
    fontSize: 16, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.primary, letterSpacing: -0.32, lineHeight: 18,
  },
  actionBtnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 24, paddingBottom: 12,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: {
    fontSize: 16, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.secondary, lineHeight: 20,
  },
  searchSection: { paddingBottom: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 24, backgroundColor: Colors.surface.secondary,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#aad4cd',
  },
  searchInput: {
    flex: 1, fontSize: 16, fontFamily: 'Figtree_300Light', fontWeight: '300',
    color: Colors.primary, padding: 0, margin: 0,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Empty state
  emptyOuter: { flex: 1 },
  emptyInner: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 4, paddingBottom: 100,
  },
  emptyIconWrap: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.primary, textAlign: 'center', letterSpacing: -0.36, lineHeight: 24,
  },
  emptyDesc: {
    fontSize: 14, fontWeight: '300', fontFamily: 'Figtree_300Light',
    color: Colors.secondary, textAlign: 'center', lineHeight: 21, letterSpacing: -0.14,
  },

  // Member list
  listOuter: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 4, gap: 16, paddingBottom: 140 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  rowDragging: {
    opacity: 0.9,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 999,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: '#fff', overflow: 'hidden',
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    fontSize: 22, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: '#fff', letterSpacing: -0.2,
  },
  rowInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  rowName: {
    fontSize: 18, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.primary, letterSpacing: -0.36, lineHeight: 24,
  },
  rowRelationship: {
    fontSize: 16, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.secondary, letterSpacing: -0.32, lineHeight: 18,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
  },
  tagText: {
    fontSize: 13, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.primary, letterSpacing: -0.26, lineHeight: 16,
  },
  chevronWrap: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },

  // Checkbox (edit mode)
  checkbox: {
    width: 24, height: 23, borderRadius: 6,
    borderWidth: 1.5, borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary, borderColor: Colors.secondary,
  },

  // Footer — add button
  addFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom:40, paddingTop: 48,
  },
  addBtn: {
    backgroundColor: Colors.secondary, borderRadius: 8,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: {
    fontSize: 16, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: '#fff', lineHeight: 20,
  },

  // Footer — edit mode
  editFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 40, paddingTop: 48,
    justifyContent: 'flex-end',
  },
  editFooterRow: { flexDirection: 'row', gap: 10 },
  deleteSelectedBtn: {
    flex: 1, backgroundColor: Colors.status.negative, borderRadius: 8,
    paddingVertical: 16, alignItems: 'center',
  },
  deleteSelectedBtnDisabled: { opacity: 0.5 },
  deleteSelectedBtnText: {
    fontSize: 16, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: '#fff', lineHeight: 20,
  },
  cancelBtn: {
    flex: 1, borderRadius: 8, borderWidth: 2, borderColor: Colors.secondary,
    paddingVertical: 16, alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16, fontWeight: '700', fontFamily: 'Figtree_700Bold',
    color: Colors.secondary, lineHeight: 20,
  },
});
