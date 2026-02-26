import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useActiveFamily } from '@/lib/activeFamilyContext';
import { CachedAvatar } from '@/components/CachedAvatar';
import type { FamilyProfile, UserProfile } from '@/lib/types';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Colours to cycle through for condition/allergy/dietary tags
const TAG_COLORS = [
  Colors.dietary.diabetic,
  Colors.dietary.glutenFree,
  Colors.dietary.keto,
  Colors.dietary.vegan,
  Colors.dietary.pescatarian,
  Colors.dietary.kosher,
  Colors.dietary.lactose,
  Colors.dietary.vegetarian,
];

const DIETARY_LABELS: Record<string, string> = {
  diabetic: 'Diabetic',
  keto: 'Keto',
  'gluten-free': 'Gluten-free',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  lactose: 'Lactose-free',
  pescatarian: 'Pescatarian',
  kosher: 'Kosher',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

function getAllTags(p: FamilyProfile): string[] {
  const tags: string[] = [];
  if (p.health_conditions?.length) tags.push(...p.health_conditions);
  if (p.allergies?.length) tags.push(...p.allergies);
  if (p.dietary_preferences?.length)
    tags.push(...p.dietary_preferences.map((d) => DIETARY_LABELS[d] ?? d));
  return tags;
}

function getUserTags(p: UserProfile): string[] {
  const tags: string[] = [];
  if (p.health_conditions?.length) tags.push(...p.health_conditions);
  if (p.allergies?.length) tags.push(...p.allergies);
  if (p.dietary_preferences?.length)
    tags.push(...p.dietary_preferences.map((d) => DIETARY_LABELS[d] ?? d));
  return tags;
}

interface FamilySwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Called after selection so parent can react (e.g. refresh data) */
  onSelect?: (familyId: string | null) => void;
  /** Pass the already-loaded user profile to avoid a second fetch */
  userProfile?: UserProfile | null;
}

export function FamilySwitcherSheet({
  visible,
  onClose,
  onSelect,
  userProfile,
}: FamilySwitcherSheetProps) {
  const { session } = useAuth();
  const { activeFamilyId, setActiveFamilyId, clearActiveFamily } =
    useActiveFamily();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const hasShownRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch family profiles when sheet opens
  useEffect(() => {
    if (visible && session?.user) {
      setLoading(true);
      supabase
        .from('family_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .order('sort_order', { ascending: true })
        .then(({ data }) => {
          setFamilyProfiles((data as FamilyProfile[]) ?? []);
          setLoading(false);
        });
    }
  }, [visible, session]);

  // Animation
  useEffect(() => {
    if (visible) {
      hasShownRef.current = true;
      setMounted(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (hasShownRef.current) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  function handleSelectMain() {
    clearActiveFamily();
    onSelect?.(null);
    onClose();
  }

  function handleSelectFamily(id: string) {
    setActiveFamilyId(id);
    onSelect?.(id);
    onClose();
  }

  if (!mounted) return null;

  const mainUserName =
    userProfile?.full_name ||
    session?.user?.email?.split('@')[0] ||
    'Me';
  const mainUserTags = userProfile ? getUserTags(userProfile) : [];

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Switch Profile</Text>
          <Text style={styles.subtitle}>
            Select who you're scanning for
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* ── Main user row ── */}
            <TouchableOpacity
              style={styles.row}
              onPress={handleSelectMain}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <CachedAvatar
                  avatarUrl={userProfile?.avatar_url ?? null}
                  initials={getInitials(mainUserName)}
                  size="100%"
                  initialsStyle={styles.avatarText}
                />
              </View>
              <View style={styles.rowInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {mainUserName}
                  </Text>
                  <Text style={styles.youLabel}>(You)</Text>
                </View>
                {mainUserTags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {mainUserTags.slice(0, 3).map((tag, i) => (
                      <View
                        key={tag}
                        style={[
                          styles.tag,
                          {
                            backgroundColor:
                              TAG_COLORS[i % TAG_COLORS.length],
                          },
                        ]}
                      >
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {activeFamilyId === null && (
                <View style={styles.checkWrap}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={Colors.secondary}
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* ── Family member rows ── */}
            {familyProfiles.map((profile) => {
              const tags = getAllTags(profile);
              const isSelected = activeFamilyId === profile.id;
              return (
                <TouchableOpacity
                  key={profile.id}
                  style={styles.row}
                  onPress={() => handleSelectFamily(profile.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatar}>
                    <CachedAvatar
                      avatarUrl={profile.avatar_url}
                      initials={getInitials(profile.name)}
                      size="100%"
                      initialsStyle={styles.avatarText}
                    />
                  </View>
                  <View style={styles.rowInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {profile.name}
                      </Text>
                      {profile.relationship ? (
                        <Text style={styles.rowRelationship}>
                          {profile.relationship}
                        </Text>
                      ) : null}
                    </View>
                    {tags.length > 0 && (
                      <View style={styles.tagsRow}>
                        {tags.slice(0, 3).map((tag, i) => (
                          <View
                            key={tag}
                            style={[
                              styles.tag,
                              {
                                backgroundColor:
                                  TAG_COLORS[i % TAG_COLORS.length],
                              },
                            ]}
                          >
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.checkWrap}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={Colors.secondary}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '75%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  titleBlock: {
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
    paddingBottom: 8,
  },

  // Row — mirrors family-members.tsx normal row layout
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 999,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.2,
  },
  rowInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rowName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  rowRelationship: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  youLabel: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 16,
  },
  checkWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
