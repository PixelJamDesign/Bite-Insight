import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTranslation } from 'react-i18next';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Shadows } from '@/constants/theme';
import { DietaryTag } from '@/components/DietaryTag';
import { StatPanel } from '@/components/StatPanel';
import { IngredientRow } from '@/components/IngredientRow';
import { IngredientDetailModal } from '@/components/IngredientDetailModal';
import { DailyInsightCard } from '@/components/DailyInsightCard';
import { useMenu } from '@/lib/menuContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { UpsellBanner } from '@/components/UpsellBanner';
import { FlagReasonSheet } from '@/components/FlagReasonSheet';
import type { UserProfile, DailyInsight, Ingredient, UserIngredientPreference } from '@/lib/types';
import Logo from '../../assets/images/logo.svg';

const scannedLabelsImg = require('../../assets/images/scanned_labels.png');
const flagImg = require('../../assets/images/flag.png');

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns the most recent Monday at 00:00:00 local time */
function getWeekStart(): Date {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const INSIGHT_DISMISS_KEY = 'insight_dismissed_date';
const todayStr = () => new Date().toISOString().slice(0, 10);

/** Pick one insight deterministically based on today's date. */
function getTodayInsight(insights: DailyInsight[]): DailyInsight | null {
  if (insights.length === 0) return null;
  const d = todayStr();
  let hash = 0;
  for (const ch of d) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  return insights[Math.abs(hash) % insights.length];
}

function getGreeting(tc: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return tc('greeting.morning');
  if (hour < 17) return tc('greeting.afternoon');
  return tc('greeting.evening');
}

function getInitials(name: string | null | undefined, fallback: string = '??'): string {
  if (!name) return fallback;
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}


export default function HomeDashboard() {
  const { t } = useTranslation('dashboard');
  const { t: tc } = useTranslation('common');
  const { t: tpo } = useTranslation('profileOptions');
  const { session, avatarUrl } = useAuth();
  const { isPlus } = useSubscription();
  const { menuOpen, menuVisible, openMenu, closeMenu, closeMenuInstant } = useMenu();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [insightDismissed, setInsightDismissed] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [allUnratedIngredients, setAllUnratedIngredients] = useState<Ingredient[]>([]);
  const [preferences, setPreferences] = useState<
    Record<string, UserIngredientPreference['preference']>
  >({});
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [flagReasonTarget, setFlagReasonTarget] = useState<Ingredient | null>(null);
  const [loading, setLoading] = useState(true);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  useEffect(() => { setAvatarLoadError(false); }, [avatarUrl]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    const userId = session.user.id;

    const weekStart = getWeekStart().toISOString();

    const [profileRes, scansRes, ingredientsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('scans').select('id').eq('user_id', userId).gte('scanned_at', weekStart),
      supabase.from('ingredients').select('*'),
    ]);

    if (profileRes.data) setProfile(profileRes.data);

    // ── Daily insight: filter by user tags, pick one for today, check dismissal ──
    const userTags: string[] = [
      ...(profileRes.data?.dietary_preferences ?? []),
      ...(profileRes.data?.health_conditions ?? []),
      ...(profileRes.data?.allergies ?? []),
    ];

    const insightQuery = userTags.length > 0
      ? supabase.from('daily_insights').select('*').overlaps('suitable_for', userTags)
      : supabase.from('daily_insights').select('*');
    const insightRes = await insightQuery;

    const picked = getTodayInsight((insightRes.data ?? []) as DailyInsight[]);
    setInsight(picked);

    // Check if already dismissed today
    try {
      const dismissedDate = Platform.OS === 'web'
        ? localStorage.getItem(INSIGHT_DISMISS_KEY)
        : await SecureStore.getItemAsync(INSIGHT_DISMISS_KEY);
      setInsightDismissed(dismissedDate === todayStr());
    } catch {
      setInsightDismissed(false);
    }
    if (scansRes.data) setScanCount(scansRes.data.length);
    const prefsMap: Record<string, UserIngredientPreference['preference']> = {};
    if (profileRes.data) {
      (profileRes.data.liked_ingredients ?? []).forEach((id: string) => { prefsMap[id] = 'liked'; });
      (profileRes.data.disliked_ingredients ?? []).forEach((id: string) => { prefsMap[id] = 'disliked'; });
      (profileRes.data.flagged_ingredients ?? []).forEach((id: string) => { prefsMap[id] = 'flagged'; });
      setPreferences(prefsMap);
    }
    if (ingredientsRes.data) {
      const ratedIds = new Set(Object.keys(prefsMap));
      const unrated = ingredientsRes.data.filter((ing) => !ratedIds.has(ing.id));
      setAllUnratedIngredients(shuffle(unrated));
    }
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  // Derived — updates instantly when rateIngredient mutates profile state
  const flaggedCount = (profile?.flagged_ingredients ?? []).length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  async function rateIngredient(
    ingredientId: string,
    pref: UserIngredientPreference['preference'],
  ) {
    if (!session?.user || !profile) return;

    // Build updated arrays — add to the chosen pref, remove from all others
    const liked = (profile.liked_ingredients ?? []) as string[];
    const disliked = (profile.disliked_ingredients ?? []) as string[];
    const flagged = (profile.flagged_ingredients ?? []) as string[];
    const newLiked = pref === 'liked'
      ? [...new Set([...liked, ingredientId])]
      : liked.filter((id) => id !== ingredientId);
    const newDisliked = pref === 'disliked'
      ? [...new Set([...disliked, ingredientId])]
      : disliked.filter((id) => id !== ingredientId);
    const newFlagged = pref === 'flagged'
      ? [...new Set([...flagged, ingredientId])]
      : flagged.filter((id) => id !== ingredientId);

    // Update local state immediately
    setPreferences((prev) => ({ ...prev, [ingredientId]: pref }));
    setProfile((prev) => prev ? {
      ...prev,
      liked_ingredients: newLiked,
      disliked_ingredients: newDisliked,
      flagged_ingredients: newFlagged,
    } : prev);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAllUnratedIngredients((prev) => prev.filter((i) => i.id !== ingredientId));

    // Persist to profiles table
    const { error } = await supabase.from('profiles').update({
      liked_ingredients: newLiked,
      disliked_ingredients: newDisliked,
      flagged_ingredients: newFlagged,
    }).eq('id', session.user.id);
    if (error) console.error('[rateIngredient] update failed:', error.message);

    // Clean up flag reason when ingredient is moved away from flagged
    if (pref !== 'flagged') {
      supabase.from('ingredient_flag_reasons')
        .delete()
        .eq('user_id', session.user.id)
        .eq('ingredient_id', ingredientId)
        .then(({ error: delErr }) => {
          if (delErr) console.warn('[rateIngredient] flag reason cleanup failed:', delErr.message);
        });
    }
  }

  const displayName = profile?.full_name ?? session?.user?.user_metadata?.full_name ?? tc('greeting.fallbackName');
  const firstName = displayName.split(' ')[0];
  const initials = getInitials(displayName, t('fallbackInitials'));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      {/* ── Dashboard content (always mounted) ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Top padding so content clears the absolute header */}
        <View style={{ height: insets.top + 68 }} />

        {/* ── Greeting + Profile ── */}
        <View style={styles.greetingRow}>
          <View style={styles.avatarLarge}>
            {avatarUrl && !avatarLoadError ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                onError={() => setAvatarLoadError(true)}
              />
            ) : (
              <Text style={styles.avatarInitials}>{initials}</Text>
            )}
          </View>

          <View style={styles.greetingText}>
            <Text style={styles.greeting}>{getGreeting(tc)}</Text>
            <Text style={styles.name}>{firstName}</Text>
            {((profile?.dietary_preferences ?? []).length > 0 ||
              (profile?.health_conditions ?? []).length > 0 ||
              (profile?.allergies ?? []).length > 0) && (
              <View style={styles.tagsRow}>
                {(profile?.dietary_preferences ?? []).map((tag) => (
                  <DietaryTag key={tag} tag={tag} />
                ))}
                {(profile?.health_conditions ?? []).map((condition) => (
                  <View key={condition} style={styles.genericChip}>
                    <Text style={styles.genericChipLabel}>{tpo(`healthConditions.${condition}`, { defaultValue: condition })}</Text>
                  </View>
                ))}
                {(profile?.allergies ?? []).map((allergy) => (
                  <View key={allergy} style={[styles.genericChip, styles.allergyChip]}>
                    <Text style={styles.genericChipLabel}>{tpo(`allergies.${allergy}`, { defaultValue: allergy })}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Daily Insight ── */}
        {insight && !insightDismissed && (
          <DailyInsightCard
            insight={insight}
            onDismiss={async () => {
              setInsightDismissed(true);
              try {
                if (Platform.OS === 'web') {
                  localStorage.setItem(INSIGHT_DISMISS_KEY, todayStr());
                } else {
                  await SecureStore.setItemAsync(INSIGHT_DISMISS_KEY, todayStr());
                }
              } catch { /* ignore storage errors */ }
            }}
            dietaryPreferences={profile?.dietary_preferences ?? []}
            healthConditions={profile?.health_conditions ?? []}
            allergies={profile?.allergies ?? []}
          />
        )}

        {/* ── Week in numbers ── */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionSubtitle}>{t('weekInNumbers')}</Text>
          <View style={styles.statsRow}>
            <StatPanel
              count={scanCount}
              label={t('scannedLabels')}
              imageSource={scannedLabelsImg}
              onPress={() => router.push('/(tabs)/history')}
            />
            <StatPanel
              count={flaggedCount}
              label={t('flaggedIngredients')}
              isPlusFeature
              imageSource={flagImg}
              onPress={() => router.push({ pathname: '/ingredient-preferences', params: { tab: 'flagged' } } as any)}
            />
          </View>
        </View>

        {/* ── Upsell Banner ── */}
        <UpsellBanner />

        {/* ── Ingredient Preferences ── */}
        {(() => {
          const displayedIngredients = allUnratedIngredients.slice(0, 4);

          if (displayedIngredients.length === 0) {
            return (
              <View style={styles.ingredientSection}>
                <View style={styles.ingredientCard}>
                  <View style={styles.completionInner}>
                    <View style={styles.completionTick}>
                      <Ionicons name="checkmark" size={24} color="#fff" />
                    </View>
                    <Text style={styles.completionTitle}>
                      {t('completionTitle')}
                    </Text>
                    <Text style={styles.completionSubtitle}>
                      {t('completionSubtitle')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewAllBtn}
                    onPress={() => router.push({ pathname: '/ingredient-preferences', params: { tab: 'liked' } } as any)}
                  >
                    <Text style={styles.viewAllText}>{t('viewLiked')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          return (
            <View style={styles.ingredientSection}>
              <View style={styles.ingredientCard}>
                <View style={styles.ingredientHeader}>
                  <Text style={styles.ingredientTitle}>{t('ingredientQuestion')}</Text>
                  <Text style={styles.ingredientSubtitle}>
                    {t('ingredientSubtitle')}
                  </Text>
                </View>

                <View style={styles.ingredientList}>
                  {displayedIngredients.map((ing) => (
                    <IngredientRow
                      key={ing.id}
                      ingredient={ing}
                      preference={preferences[ing.id]}
                      onLike={() => rateIngredient(ing.id, 'liked')}
                      onDislike={() => rateIngredient(ing.id, 'disliked')}
                      onFlag={() => setFlagReasonTarget(ing)}
                      onTap={() => setSelectedIngredient(ing)}
                      showFlag={isPlus}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => router.push({ pathname: '/ingredient-preferences', params: { tab: 'liked' } } as any)}
                >
                  <Text style={styles.viewAllText}>{t('viewLiked')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Top fade — masks content scrolling behind the header ── */}
      <LinearGradient
        colors={[Colors.background, Colors.background, 'rgba(226,241,238,0)']}
        locations={[0, 0.55, 1]}
        style={[styles.topFade, { height: insets.top + 92 }]}
        pointerEvents="none"
      />

      {/* ── Ingredient detail modal ── */}
      <IngredientDetailModal
        ingredient={selectedIngredient}
        preference={selectedIngredient ? preferences[selectedIngredient.id] : undefined}
        onClose={() => setSelectedIngredient(null)}
        onLike={() => {
          if (selectedIngredient) rateIngredient(selectedIngredient.id, 'liked');
          setSelectedIngredient(null);
        }}
        onDislike={() => {
          if (selectedIngredient) rateIngredient(selectedIngredient.id, 'disliked');
          setSelectedIngredient(null);
        }}
        onFlag={() => {
          if (selectedIngredient) {
            setFlagReasonTarget(selectedIngredient);
            setSelectedIngredient(null);
          }
        }}
        showFlag={isPlus}
      />

      {/* ── Header (always on top) ── */}
      <View style={[styles.header, menuOpen && styles.headerMenu, { paddingTop: insets.top + 24 }]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/' as any)} activeOpacity={0.7} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Logo width={141} height={36} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={menuOpen ? closeMenu : openMenu}
          activeOpacity={0.8}
        >
          <Ionicons name={menuOpen ? 'close' : 'menu-outline'} size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      {/* ── Flag Reason Sheet ── */}
      <FlagReasonSheet
        visible={!!flagReasonTarget}
        ingredientName={flagReasonTarget?.name ?? ''}
        onClose={() => setFlagReasonTarget(null)}
        onConfirm={async (reasons) => {
          if (flagReasonTarget && session?.user) {
            await rateIngredient(flagReasonTarget.id, 'flagged');
            await supabase.from('ingredient_flag_reasons').upsert({
              user_id: session.user.id,
              ingredient_id: flagReasonTarget.id,
              reason_category: reasons.map((r) => r.category).join(', '),
              reason_text: reasons.map((r) => r.text).join(', '),
            }, { onConflict: 'user_id,ingredient_id' });
          }
          setFlagReasonTarget(null);
        }}
        healthConditions={profile?.health_conditions ?? []}
        allergies={profile?.allergies ?? []}
        dietaryPreferences={profile?.dietary_preferences ?? []}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 20,
    elevation: 20,
  },
  headerMenu: {
    backgroundColor: '#fff',
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
    elevation: 15,
  },
  menuBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 24,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.accent,
    borderWidth: 4,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...Shadows.level2,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.6,
  },
  greetingText: {
    flex: 1,
    gap: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.5,
    lineHeight: 18,
  },
  name: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  genericChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#B8DFD6',
  },
  allergyChip: {
    backgroundColor: '#B8DFD6',
  },
  genericChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
  statsSection: {
    gap: 8,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ingredientSection: {},
  ingredientCard: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    padding: 16,
    gap: 24,
    ...Shadows.level4,
  },
  ingredientHeader: {
    gap: 4,
  },
  ingredientTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  ingredientSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  ingredientList: {
    gap: 8,
  },
  // ── Completion state ──
  completionInner: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
  },
  completionTick: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 4,
  },
  viewAllBtn: {
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0,
  },
});
