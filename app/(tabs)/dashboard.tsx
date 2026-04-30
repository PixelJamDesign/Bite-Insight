import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  LayoutAnimation,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useFadeIn } from '@/lib/useFadeIn';
import { useFocusFadeIn } from '@/lib/useFocusFadeIn';
import { useTranslation } from 'react-i18next';


import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { fetchAndCacheProfile } from '@/lib/profileCache';
import { Colors, Shadows } from '@/constants/theme';
import { DietaryTag } from '@/components/DietaryTag';
import { StatPanel } from '@/components/StatPanel';
import { IngredientRow } from '@/components/IngredientRow';
import { IngredientDetailModal } from '@/components/IngredientDetailModal';
import { DailyInsightCard } from '@/components/DailyInsightCard';
import { useMenu } from '@/lib/menuContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { UpsellBanner } from '@/components/UpsellBanner';
import { PlusBadge } from '@/components/PlusBadge';
import { CameraIcon } from '@/components/MenuIcons';
import { FlagReasonSheet } from '@/components/FlagReasonSheet';
import { useAvatarPicker } from '@/lib/useAvatarPicker';
import { uploadAvatar } from '@/lib/supabase';
import { LottieLoader } from '@/components/LottieLoader';
import {
  HEALTH_CONDITION_LEGACY_MAP,
  ALLERGY_LEGACY_MAP,
  DIETARY_PREFERENCE_LEGACY_MAP,
} from '@/constants/profileOptions';
import type { UserProfile, DailyInsight, Ingredient, UserIngredientPreference } from '@/lib/types';
import Logo from '../../assets/images/logo.svg';

const scannedLabelsImg = require('../../assets/images/scanned_labels.png');
const flagImg = require('../../assets/images/flag.png');

/**
 * Build a reverse map from normalised key → legacy display string(s).
 * e.g. 'diabetes' → 'Diabetes', 'keto' → 'Low-Carb / Keto'
 */
const KEY_TO_LEGACY: Record<string, string[]> = {};
for (const map of [HEALTH_CONDITION_LEGACY_MAP, ALLERGY_LEGACY_MAP, DIETARY_PREFERENCE_LEGACY_MAP]) {
  for (const [legacy, key] of Object.entries(map)) {
    (KEY_TO_LEGACY[key] ??= []).push(legacy);
  }
}

/** Expand normalised keys to also include their legacy display strings. */
function expandTagsForQuery(tags: string[]): string[] {
  const set = new Set<string>();
  for (const t of tags) {
    set.add(t);
    for (const legacy of KEY_TO_LEGACY[t] ?? []) set.add(legacy);
  }
  return [...set];
}

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
const INSIGHT_TODAY_KEY = 'insight_today_id';       // which insight is shown today
const INSIGHT_TODAY_DATE_KEY = 'insight_today_date'; // date it was picked
const INSIGHT_SEEN_KEY = 'insight_seen_ids';         // JSON array of recently shown IDs
const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Pick today's insight — random, never repeats until all have been shown.
 * Persists the pick so it stays stable across re-renders within the same day.
 */
async function pickTodayInsight(insights: DailyInsight[]): Promise<DailyInsight | null> {
  if (insights.length === 0) return null;
  const today = todayStr();

  // Check if we already picked one today
  try {
    const storedDate = Platform.OS === 'web'
      ? localStorage.getItem(INSIGHT_TODAY_DATE_KEY)
      : await SecureStore.getItemAsync(INSIGHT_TODAY_DATE_KEY);

    if (storedDate === today) {
      const storedId = Platform.OS === 'web'
        ? localStorage.getItem(INSIGHT_TODAY_KEY)
        : await SecureStore.getItemAsync(INSIGHT_TODAY_KEY);
      if (storedId) {
        const found = insights.find((i) => i.id === storedId);
        if (found) return found;
      }
    }
  } catch { /* continue to pick fresh */ }

  // Load seen IDs
  let seenIds: string[] = [];
  try {
    const raw = Platform.OS === 'web'
      ? localStorage.getItem(INSIGHT_SEEN_KEY)
      : await SecureStore.getItemAsync(INSIGHT_SEEN_KEY);
    if (raw) seenIds = JSON.parse(raw);
  } catch { /* start fresh */ }

  // Filter out already-seen insights
  let pool = insights.filter((i) => !seenIds.includes(i.id));
  if (pool.length === 0) {
    // All seen — reset and start fresh
    seenIds = [];
    pool = insights;
  }

  // Pick a random one
  const picked = pool[Math.floor(Math.random() * pool.length)];

  // Save pick + update seen list
  seenIds.push(picked.id);
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(INSIGHT_TODAY_KEY, picked.id);
      localStorage.setItem(INSIGHT_TODAY_DATE_KEY, today);
      localStorage.setItem(INSIGHT_SEEN_KEY, JSON.stringify(seenIds));
    } else {
      await SecureStore.setItemAsync(INSIGHT_TODAY_KEY, picked.id);
      await SecureStore.setItemAsync(INSIGHT_TODAY_DATE_KEY, today);
      await SecureStore.setItemAsync(INSIGHT_SEEN_KEY, JSON.stringify(seenIds));
    }
  } catch { /* non-critical */ }

  return picked;
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
  const { session, avatarUrl, setAvatarUrl } = useAuth();
  const pickAvatar = useAvatarPicker();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleAvatarPick() {
    if (!session?.user?.id) return;
    pickAvatar(async (localUri) => {
      setUploadingAvatar(true);
      try {
        const uploaded = await uploadAvatar(session.user.id, localUri);
        if (uploaded) {
          setAvatarUrl(uploaded);
          setAvatarLoadError(false);
        }
      } finally {
        setUploadingAvatar(false);
      }
    });
  }
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
  const pendingFlagRef = useRef<Ingredient | null>(null);
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

    if (profileRes.data) {
      setProfile(profileRes.data);
      // Populate profile cache so scan-result renders insights instantly
      fetchAndCacheProfile(userId).catch(() => {});
    }

    // ── Daily insight: filter by user tags, pick one for today, check dismissal ──
    // Build tag list that includes BOTH normalised keys (e.g. 'diabetes') AND
    // legacy display strings (e.g. 'Diabetes') so the overlaps() query matches
    // insights whose suitable_for was seeded with either format.
    const rawTags: string[] = [
      ...(profileRes.data?.dietary_preferences ?? []),
      ...(profileRes.data?.health_conditions ?? []),
      ...(profileRes.data?.allergies ?? []),
    ];
    const userTags = expandTagsForQuery(rawTags);

    const insightQuery = userTags.length > 0
      ? supabase.from('daily_insights').select('*').overlaps('suitable_for', userTags)
      : supabase.from('daily_insights').select('*');
    const insightRes = await insightQuery;

    const picked = await pickTodayInsight((insightRes.data ?? []) as DailyInsight[]);
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

  // Staggered fade-in animations for dashboard sections
  const fadeGreeting = useFadeIn(!loading, 0);
  const fadeInsight  = useFadeIn(!loading, 80);
  const fadeStats    = useFadeIn(!loading, 160);
  const fadeIngList  = useFadeIn(!loading, 240);
  // Subtle re-entrance animation when returning from a pushed screen
  const focusAnim = useFocusFadeIn();

  if (loading) {
    return <LottieLoader type="loading" />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
      <Animated.View style={{ flex: 1, opacity: focusAnim.opacity, transform: [{ translateY: focusAnim.translateY }] }}>
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
        <Animated.View style={[styles.greetingRow, { opacity: fadeGreeting.opacity, transform: [{ translateY: fadeGreeting.translateY }] }]}>
          <View style={styles.avatarWrap}>
            {/* Image taps go to edit-profile */}
            <TouchableOpacity
              style={[styles.avatarLarge, focusAnim.showElevation && Shadows.level2]}
              onPress={() => router.push('/edit-profile' as never)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              {avatarUrl && !avatarLoadError ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </TouchableOpacity>
            {/* Camera badge taps trigger the photo picker + upload */}
            <TouchableOpacity
              style={styles.avatarEditBadge}
              onPress={handleAvatarPick}
              disabled={uploadingAvatar}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            >
              {uploadingAvatar ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <CameraIcon color="#fff" size={20} />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.greetingText}>
            <Text style={styles.greeting}>{getGreeting(tc)}</Text>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{firstName}</Text>
              {isPlus && (
                <View style={styles.plusBadgeWrap}>
                  <PlusBadge />
                </View>
              )}
            </View>
            {((profile?.dietary_preferences ?? []).length > 0 ||
              (profile?.health_conditions ?? []).length > 0 ||
              (profile?.allergies ?? []).length > 0) && (() => {
              // Combine all tags in display-priority order (dietary, then conditions, then allergies)
              // and cap the visible count. Extra tags collapse into a "+N" overflow chip so
              // the row stays tidy when the profile has lots of selections.
              const MAX_VISIBLE = 2;
              const diet = (profile?.dietary_preferences ?? []).map((tag) => ({
                key: `d:${tag}`, type: 'dietary' as const, value: tag,
              }));
              const conds = (profile?.health_conditions ?? []).map((c) => ({
                key: `h:${c}`, type: 'condition' as const, value: c,
              }));
              const algs = (profile?.allergies ?? []).map((a) => ({
                key: `a:${a}`, type: 'allergy' as const, value: a,
              }));
              const all = [...diet, ...conds, ...algs];
              const visible = all.slice(0, MAX_VISIBLE);
              const overflow = all.length - visible.length;
              return (
                <View style={styles.tagsRow}>
                  {visible.map((t) => {
                    if (t.type === 'dietary') {
                      return <DietaryTag key={t.key} tag={t.value as any} />;
                    }
                    if (t.type === 'condition') {
                      return (
                        <View key={t.key} style={styles.genericChip}>
                          <Text style={styles.genericChipLabel}>
                            {tpo(`healthConditions.${t.value}`, { defaultValue: t.value })}
                          </Text>
                        </View>
                      );
                    }
                    return (
                      <View key={t.key} style={[styles.genericChip, styles.allergyChip]}>
                        <Text style={styles.genericChipLabel}>
                          {tpo(`allergies.${t.value}`, { defaultValue: t.value })}
                        </Text>
                      </View>
                    );
                  })}
                  {overflow > 0 && (
                    <View style={styles.overflowChip}>
                      <Text style={styles.overflowChipLabel}>+{overflow}</Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        </Animated.View>

        {/* ── Daily Insight ── */}
        {insight && !insightDismissed && (
          <Animated.View style={{ opacity: fadeInsight.opacity, transform: [{ translateY: fadeInsight.translateY }] }}>
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
            showElevation={focusAnim.showElevation}
          />
          </Animated.View>
        )}

        {/* ── Week in numbers ── */}
        <Animated.View style={[styles.statsSection, { opacity: fadeStats.opacity, transform: [{ translateY: fadeStats.translateY }] }]}>
          <Text style={styles.sectionSubtitle}>{t('weekInNumbers')}</Text>
          <View style={styles.statsRow}>
            <StatPanel
              count={scanCount}
              label={t('scannedLabels')}
              imageSource={scannedLabelsImg}
              onPress={() => router.push('/(tabs)/history')}
              showElevation={focusAnim.showElevation}
            />
            <StatPanel
              count={flaggedCount}
              label={t('flaggedIngredients')}
              isPlusFeature
              imageSource={flagImg}
              onPress={() => router.push({ pathname: '/ingredient-preferences', params: { tab: 'flagged' } } as any)}
              showElevation={focusAnim.showElevation}
            />
          </View>
        </Animated.View>

        {/* ── Upsell Banner ── */}
        <UpsellBanner />

        {/* ── Ingredient Preferences ── */}
        <Animated.View style={{ opacity: fadeIngList.opacity, transform: [{ translateY: fadeIngList.translateY }] }}>
        {(() => {
          const displayedIngredients = allUnratedIngredients.slice(0, 4);

          if (displayedIngredients.length === 0) {
            return (
              <View style={styles.ingredientSection}>
                <View style={[styles.ingredientCard, focusAnim.showElevation && Shadows.level4]}>
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
              <View style={[styles.ingredientCard, focusAnim.showElevation && Shadows.level4]}>
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
        </Animated.View>

        <View style={{ height: 120 + (Platform.OS === 'android' ? insets.bottom : 0) }} />
      </ScrollView>
      </Animated.View>

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
            pendingFlagRef.current = selectedIngredient;
            setSelectedIngredient(null);
            // FlagReasonSheet opens via onExitComplete callback below
          }
        }}
        showFlag={isPlus}
        onExitComplete={() => {
          if (pendingFlagRef.current) {
            setFlagReasonTarget(pendingFlagRef.current);
            pendingFlagRef.current = null;
          }
        }}
      />

      {/* ── Header (always on top) ── */}
      <View style={[styles.header, menuOpen && styles.headerMenu, { paddingTop: insets.top + 24 }]}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/dashboard' as any)} activeOpacity={0.7} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
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
  // Outer wrapper — lets the camera badge extend outside the circle.
  // Size matches the avatar so the badge positions correctly against its edge.
  avatarWrap: {
    width: 120,
    height: 120,
    position: 'relative',
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
  },
  // Camera badge floating on the bottom-right of the avatar. Signals tap-to-edit.
  avatarEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    borderWidth: 3,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  plusBadgeWrap: {
    paddingTop: 4,
    flexShrink: 0,
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
  // "+N" overflow pill matches the other tag chips visually.
  overflowChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#B8DFD6',
  },
  overflowChipLabel: {
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
