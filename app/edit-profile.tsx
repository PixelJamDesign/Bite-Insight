import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Modal,
  Pressable,
  type LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { safeBack } from '@/lib/safeBack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { supabase, getAvatarUrl, uploadAvatar } from '@/lib/supabase';
import { useCachedAvatar } from '@/lib/useCachedAvatar';
import { useAuth } from '@/lib/auth';
import { Colors, Shadows } from '@/constants/theme';
import { CONDITION_NUTRIENT_MAP } from '@/constants/conditionNutrientMap';
import {
  HEALTH_CONDITION_KEYS, ALLERGY_KEYS, DIETARY_PREFERENCE_KEYS,
  HEALTH_CONDITION_LEGACY_MAP,
  normalizeHealthCondition, normalizeAllergy, normalizeDietaryPreference,
} from '@/constants/profileOptions';
import type { NutrientWatchlistEntry } from '@/lib/types';
import { CameraIcon, PersonalIcon, EmailIcon, BirthdayIcon, TickIcon, InfoIcon } from '@/components/MenuIcons';
import { AvatarViewer } from '@/components/AvatarViewer';
import { useAvatarPicker } from '@/lib/useAvatarPicker';
import { DobPicker } from '@/components/DobPicker';
import { formatDob, toLocalDateString } from '@/lib/dateOfBirth';
import { ConditionInfoSheet } from '@/components/ConditionInfoSheet';
import { SuggestionSheet, type SuggestionCategory } from '@/components/SuggestionSheet';
import { LottieLoader } from '@/components/LottieLoader';
import { CONDITION_INFO } from '@/constants/conditionInfo';
import { IbsSubtypePicker } from '@/components/IbsSubtypePicker';
import { PregnancyStep } from '@/components/PregnancyStep';
import { ConflictReviewStep } from '@/components/ConflictReviewStep';
import { detectProfileConflicts, type Conflict } from '@/lib/profileConflicts';
import type { IbsSubtype, PregnancyStatus } from '@/lib/types';
import Logo from '../assets/images/logo.svg';

// ── Condition key helpers ──────────────────────────────────────────────────────
const KEY_TO_LEGACY: Record<string, string> = {};
for (const [legacy, key] of Object.entries(HEALTH_CONDITION_LEGACY_MAP)) {
  KEY_TO_LEGACY[key] = legacy;
}
function conditionMapKey(conditionKey: string): string {
  return KEY_TO_LEGACY[conditionKey] ?? conditionKey;
}

// ── Step types ────────────────────────────────────────────────────────────────
type StepKey = 'about' | 'health' | 'ibsSubtype' | 'pregnancy' | 'nutrients' | 'allergies' | 'dietary' | 'conflicts';

// ── Nutrient types ──────────────────────────────────────────────────────────
type UniqueNutrient = {
  offKey: string;
  nutrient: string;
  unit: 'mg' | 'µg' | 'g';
  source: string;
  recommendedDirection: 'limit' | 'boost';
  hasConflict: boolean;
};

type ConditionNutrientItem = {
  offKey: string;
  nutrient: string;
  unit: 'mg' | 'µg' | 'g';
  recommendedDirection: 'limit' | 'boost';
};

type ConditionGroup = {
  conditionKey: string;
  nutrients: ConditionNutrientItem[];
};

/** Build de-duped unique nutrients from selected health conditions */
function buildUniqueNutrients(conditions: string[]): UniqueNutrient[] {
  const map = new Map<string, UniqueNutrient>();
  const limitKeys = new Set<string>();
  const boostKeys = new Set<string>();

  for (const condition of conditions) {
    const profile = CONDITION_NUTRIENT_MAP[conditionMapKey(condition)];
    if (!profile) continue;

    for (const item of profile.limit) {
      limitKeys.add(item.offKey);
      if (!map.has(item.offKey)) {
        map.set(item.offKey, {
          offKey: item.offKey, nutrient: item.nutrient, unit: item.unit,
          source: condition, recommendedDirection: 'limit', hasConflict: false,
        });
      }
    }
    for (const item of profile.boost) {
      boostKeys.add(item.offKey);
      if (!map.has(item.offKey)) {
        map.set(item.offKey, {
          offKey: item.offKey, nutrient: item.nutrient, unit: item.unit,
          source: condition, recommendedDirection: 'boost', hasConflict: false,
        });
      }
    }
  }

  for (const [, n] of map) {
    if (limitKeys.has(n.offKey) && boostKeys.has(n.offKey)) n.hasConflict = true;
  }

  return Array.from(map.values());
}

/** Build condition-grouped nutrients for the new dropdown UI */
function buildConditionGroups(conditions: string[]): ConditionGroup[] {
  return conditions
    .map((conditionKey) => {
      const profile = CONDITION_NUTRIENT_MAP[conditionMapKey(conditionKey)];
      if (!profile) return null;
      const nutrients: ConditionNutrientItem[] = [
        ...profile.limit.map((n) => ({
          offKey: n.offKey, nutrient: n.nutrient, unit: n.unit,
          recommendedDirection: 'limit' as const,
        })),
        ...profile.boost.map((n) => ({
          offKey: n.offKey, nutrient: n.nutrient, unit: n.unit,
          recommendedDirection: 'boost' as const,
        })),
      ];
      return { conditionKey, nutrients };
    })
    .filter(Boolean) as ConditionGroup[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const { session, setAvatarUrl: setContextAvatarUrl } = useAuth();
  const insets = useSafeAreaInsets();
  const { t: tp } = useTranslation('profile');
  const { t: to } = useTranslation('onboarding');
  const { t: tpo } = useTranslation('profileOptions');
  const { t: tc } = useTranslation('common');

  const [step, setStep] = useState(1);
  const [fetched, setFetched] = useState(false);

  // Step 1 – About you
  const [fullName, setFullName]             = useState('');
  const [dateOfBirth, setDateOfBirth]       = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarUri, setAvatarUri]           = useState<string | null>(null);
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null);
  const cachedExistingAvatar = useCachedAvatar(existingAvatar);

  // Step 2 – Health Conditions
  const [healthConditions, setHealthConditions] = useState<string[]>([]);

  // Step 2a – IBS subtype (only shown when IBS is in healthConditions)
  const [ibsSubtype, setIbsSubtype] = useState<IbsSubtype | null>(null);

  // Step 2b – Pregnancy (only shown when Pregnancy is in healthConditions)
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus | null>(null);
  const [pregnancyDueDate, setPregnancyDueDate] = useState<string | null>(null);

  // Step 3 – Allergies
  const [allergies, setAllergies] = useState<string[]>([]);

  // Step 4 – Dietary Preferences
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

  // Conflict review state — populated when user reaches the conflicts step
  const [hardConflicts, setHardConflicts] = useState<Conflict[]>([]);
  const [redundancies, setRedundancies] = useState<Conflict[]>([]);

  // ── Nutrient watchlist ──────────────────────────────────────────────────────
  const [nutrientChoices, setNutrientChoices] = useState<Record<string, 'limit' | 'boost' | 'none'>>({});

  const showNutrientStep = healthConditions.length > 0;
  const hasIbs = healthConditions.includes('ibs');
  const hasPregnancy = healthConditions.includes('pregnancy');

  // Compute conflicts against the current selection
  const conflictResult = useMemo(
    () =>
      detectProfileConflicts({
        healthConditions,
        allergies,
        dietaryPreferences: dietaryPrefs,
        ibsSubtype,
        pregnancyStatus,
      }),
    [healthConditions, allergies, dietaryPrefs, ibsSubtype, pregnancyStatus],
  );
  const showConflictStep = conflictResult.hardConflicts.length > 0 || conflictResult.redundancies.length > 0;

  const stepSequence: StepKey[] = useMemo(() => [
    'about',
    'health',
    ...(hasIbs ? ['ibsSubtype' as StepKey] : []),
    ...(hasPregnancy ? ['pregnancy' as StepKey] : []),
    ...(showNutrientStep ? ['nutrients' as StepKey] : []),
    'allergies',
    'dietary',
    ...(showConflictStep ? ['conflicts' as StepKey] : []),
  ], [hasIbs, hasPregnancy, showNutrientStep, showConflictStep]);

  const totalSteps = stepSequence.length;
  const currentStepKey = stepSequence[step - 1] ?? 'about';
  const isLastStep = step === totalSteps;
  const nextStepKey = step < totalSteps ? stepSequence[step] : null;
  const nextLabel = nextStepKey ? to(`step.${nextStepKey}`) : null;
  const stepTitle = to(`step.${currentStepKey}`);

  const uniqueNutrients = useMemo(
    () => buildUniqueNutrients(healthConditions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [healthConditions.join(',')],
  );

  const conditionGroups = useMemo(
    () => buildConditionGroups(healthConditions),
    [healthConditions.join(',')],
  );

  function setNutrientChoice(offKey: string, dir: 'limit' | 'boost' | 'none') {
    setNutrientChoices(prev => ({ ...prev, [offKey]: dir }));
  }

  function buildFinalWatchlist(): NutrientWatchlistEntry[] {
    return uniqueNutrients
      .filter(n => nutrientChoices[n.offKey] === 'limit' || nutrientChoices[n.offKey] === 'boost')
      .map(n => ({
        offKey: n.offKey, nutrient: n.nutrient,
        direction: nutrientChoices[n.offKey] as 'limit' | 'boost',
        unit: n.unit, source: n.source, reason: '',
      }));
  }

  // ScrollView ref for resetting scroll position
  const scrollRef = useRef<ScrollView>(null);
  const scrollContainerRef = useRef<View>(null);
  const nameRowRef = useRef<View>(null);
  const dobRowRef = useRef<View>(null);
  const keyboardHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => { keyboardHeightRef.current = e.endCoordinates.height; });
    const hideSub = Keyboard.addListener(hideEvent, () => { keyboardHeightRef.current = 0; });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  function scrollInputToCenter(inputRef: View | null) {
    if (!inputRef || !scrollContainerRef.current || !scrollRef.current) return;
    setTimeout(() => {
      inputRef.measureLayout(
        scrollContainerRef.current!,
        (_x, y, _w, h) => {
          const visibleHeight = scrollViewHeightRef.current - keyboardHeightRef.current;
          const targetY = y - (visibleHeight / 2) + (h / 2);
          scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
        },
        () => {},
      );
    }, 150);
  }

  // Content transition animation (horizontal slide)
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateX = useRef(new Animated.Value(40)).current;
  const slideDirectionRef = useRef<'forward' | 'backward'>('forward');
  const isTransitioning = useRef(false);

  // Chip search
  const [chipSearch, setChipSearch]           = useState('');
  const [chipSearchActive, setChipSearchActive] = useState(false);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const [suggestionCategory, setSuggestionCategory] = useState<SuggestionCategory | null>(null);
  const chipSearchRef = useRef<TextInput>(null);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // ── Load existing profile ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('full_name, avatar_url, health_conditions, allergies, dietary_preferences, date_of_birth, nutrient_watchlist, ibs_subtype, pregnancy_status, pregnancy_due_date')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Profile load error:', error.message);
        if (data) {
          setFullName(data.full_name ?? '');
          setExistingAvatar(getAvatarUrl(data.avatar_url));
          setHealthConditions(((data.health_conditions as string[]) ?? []).map(normalizeHealthCondition));
          setAllergies(((data.allergies as string[]) ?? []).map(normalizeAllergy));
          setDietaryPrefs(((data.dietary_preferences as string[]) ?? []).map(normalizeDietaryPreference));
          setDateOfBirth(data.date_of_birth ? new Date(data.date_of_birth + 'T00:00:00') : null);
          setIbsSubtype((data.ibs_subtype as IbsSubtype | null) ?? null);
          setPregnancyStatus((data.pregnancy_status as PregnancyStatus | null) ?? null);
          setPregnancyDueDate((data.pregnancy_due_date as string | null) ?? null);

          // Pre-load existing nutrient watchlist choices
          const existing = (data.nutrient_watchlist as NutrientWatchlistEntry[] | null) ?? [];
          if (existing.length > 0) {
            const choices: Record<string, 'limit' | 'boost' | 'none'> = {};
            for (const e of existing) choices[e.offKey] = e.direction;
            setNutrientChoices(choices);
          }
        }
        setFetched(true);
      });
  }, [session]);

  // Auto-select non-userConfirmRequired nutrients when suggestions change
  // (only if user hasn't already got a saved watchlist — we detect this via fetched + empty keys)
  const hasLoadedExistingRef = useRef(false);
  useEffect(() => {
    if (!fetched) return;
    // Only auto-select on first load or if user had no existing watchlist
    if (hasLoadedExistingRef.current) return;
    hasLoadedExistingRef.current = true;
  }, [fetched]);

  // When health conditions change after initial load, recalculate choices
  useEffect(() => {
    if (!hasLoadedExistingRef.current) return;
    setNutrientChoices(prev => {
      const choices: Record<string, 'limit' | 'boost' | 'none'> = {};
      for (const n of uniqueNutrients) {
        choices[n.offKey] = prev[n.offKey] ?? (n.hasConflict ? 'none' : n.recommendedDirection);
      }
      return choices;
    });
  }, [uniqueNutrients]);

  // Step progress animation (5 dots max to support optional nutrient step)
  const stepAnim    = useRef(new Animated.Value(1)).current;
  // Max possible steps: about, health, ibsSubtype, pregnancy, nutrients,
  // allergies, dietary, conflicts = 8. Sized to the max so dynamic step
  // counts (e.g. after toggling IBS or Pregnancy) never index past the end.
  const dotPops     = useRef(Array.from({ length: 8 }, () => new Animated.Value(1))).current;
  const prevStepRef = useRef(1);

  // Animate step tracker on step change
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;

    Animated.spring(stepAnim, {
      toValue: step,
      useNativeDriver: false,
      tension: 120,
      friction: 10,
    }).start();

    if (step > prev) {
      const doneIdx = prev - 1;
      // Skip animation if the dot is out of range (shouldn't happen now we
      // size dotPops to the max step count, but stays safe if more steps are added)
      if (!dotPops[doneIdx]) return;
      Animated.sequence([
        Animated.spring(dotPops[doneIdx], {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 200,
          friction: 2,
        }),
        Animated.spring(dotPops[doneIdx], {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 1,
        }),
      ]).start();
    }
  }, [step]);

  // Enter animation: slide in new content after step changes
  useEffect(() => {
    setChipSearch('');
    setChipSearchActive(false);
    scrollRef.current?.scrollTo({ y: 0, animated: false });

    const slideFrom = slideDirectionRef.current === 'forward' ? 40 : -40;

    contentOpacity.setValue(0);
    contentTranslateX.setValue(slideFrom);
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1, duration: 800, easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: 0, duration: 800, easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => { isTransitioning.current = false; });
  }, [step]);

  // Exit animation helper
  function animateExit(direction: 'forward' | 'backward', onComplete: () => void) {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    slideDirectionRef.current = direction;

    const slideTo = direction === 'forward' ? -40 : 40;

    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0, duration: 800, easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: slideTo, duration: 800, easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => onComplete());
  }

  // ── Avatar picker (shared hook — see lib/useAvatarPicker.ts) ────────────────
  const pickAvatar = useAvatarPicker();
  function handleAvatarPick() {
    pickAvatar((uri) => setAvatarUri(uri));
  }

  // ── Fullscreen avatar viewer ────────────────────────────────────────────────
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  // ── Navigation ───────────────────────────────────────────────────────────────
  function handleNext() {
    if (currentStepKey === 'about' && !fullName.trim()) {
      Alert.alert(tp('editProfile.alert.nameRequiredTitle'), tp('editProfile.alert.nameRequiredMessage'));
      return;
    }
    if (currentStepKey === 'ibsSubtype' && !ibsSubtype) {
      Alert.alert('Pick an option', 'Please pick the IBS subtype that fits best, or choose "I\'m not sure".');
      return;
    }
    if (currentStepKey === 'pregnancy') {
      if (!pregnancyStatus) {
        Alert.alert('Pick an option', 'Please tell us whether you\'re currently pregnant or breastfeeding.');
        return;
      }
      if (!pregnancyDueDate) {
        Alert.alert('Date needed', pregnancyStatus === 'pregnant' ? 'Please pick your due date.' : 'Please pick your baby\'s birth date.');
        return;
      }
    }
    animateExit('forward', () => setStep(s => Math.min(s + 1, totalSteps)));
  }

  // Save blocked while hard conflicts remain unresolved
  const saveBlocked = currentStepKey === 'conflicts' && conflictResult.hardConflicts.length > 0;

  function handleBack() {
    if (step === 1) safeBack();
    else animateExit('backward', () => setStep(s => s - 1));
  }

  // ── Save changes ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!session?.user?.id) return;
    setSaving(true);

    let newAvatarUrl: string | null = existingAvatar;
    if (avatarUri) {
      const uploaded = await uploadAvatar(session.user.id, avatarUri);
      if (uploaded) {
        newAvatarUrl = uploaded;
        setContextAvatarUrl(uploaded);
      }
    }

    // Apply Tier 2 (redundancy) auto-resolutions before saving
    const resolved = conflictResult.resolved;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        avatar_url: newAvatarUrl,
        health_conditions: resolved.healthConditions,
        allergies: resolved.allergies,
        dietary_preferences: resolved.dietaryPreferences,
        date_of_birth: dateOfBirth ? toLocalDateString(dateOfBirth) : null,
        nutrient_watchlist: buildFinalWatchlist(),
        ibs_subtype: hasIbs ? ibsSubtype : null,
        pregnancy_status: hasPregnancy ? pregnancyStatus : null,
        pregnancy_due_date: hasPregnancy ? pregnancyDueDate : null,
      })
      .eq('id', session.user.id);

    setSaving(false);
    if (error) Alert.alert(tc('alert.saveFailedTitle'), error.message);
    else safeBack();
  }

  // ── Progress indicator ───────────────────────────────────────────────────────
  function renderProgress() {
    const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);
    return (
      <View style={styles.progressRow}>
        <View style={styles.progressDots}>
          {dots.map((s) => {
            const isDone = s < step;
            const bgColor = isDone ? '#3b9586' : s === step ? Colors.primary : `${Colors.primary}25`;
            const animWidth  = stepAnim.interpolate({ inputRange: [s - 1, s, s + 1], outputRange: [16, 48, 20], extrapolate: 'clamp' });
            const animHeight = stepAnim.interpolate({ inputRange: [s - 1, s, s + 1], outputRange: [10, 10, 20], extrapolate: 'clamp' });
            const animRadius = stepAnim.interpolate({ inputRange: [s - 1, s, s + 1], outputRange: [5,  5,  10], extrapolate: 'clamp' });
            return (
              <Animated.View key={s} style={{ transform: [{ scale: dotPops[s - 1] ?? 1 }] }}>
                <Animated.View style={{ width: animWidth, height: animHeight, borderRadius: animRadius, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
                  {isDone && <TickIcon size={10} color="#fff" />}
                </Animated.View>
              </Animated.View>
            );
          })}
        </View>
        {nextLabel && <Text style={styles.nextLabel}>{to('progress.next', { label: nextLabel })}</Text>}
      </View>
    );
  }

  // ── Chip card header ─────────────────────────────────────────────────────────
  function renderChipHeader(question: string, count: number, countText: string) {
    return (
      <View style={styles.chipCardInfo}>
        <Text style={styles.cardTitle}>{question}</Text>
        <View style={styles.countRow}>
          <Text style={styles.countText}>{to('chip.youveSelected')}</Text>
          <Text style={styles.countBold}>{countText}</Text>
        </View>
        <TouchableOpacity
          style={styles.searchLink}
          onPress={() => {
            const next = !chipSearchActive;
            setChipSearchActive(next);
            setChipSearch('');
            if (next) setTimeout(() => chipSearchRef.current?.focus(), 50);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="search-outline" size={16} color={Colors.secondary} />
          <Text style={styles.searchLinkText}>{tc('buttons.search')}</Text>
        </TouchableOpacity>
        {chipSearchActive && (
          <View style={styles.chipSearchWrapper}>
            <TextInput
              ref={chipSearchRef}
              style={styles.chipSearchInput}
              placeholder={tc('placeholder.search')}
              placeholderTextColor={`${Colors.primary}50`}
              selectionColor={Colors.primary}
              value={chipSearch}
              onChangeText={setChipSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {chipSearch.length > 0 && (
              <TouchableOpacity onPress={() => setChipSearch('')} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={`${Colors.primary}80`} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  // ── Chip grid ────────────────────────────────────────────────────────────────
  const LABEL_TO_CATEGORY: Record<string, SuggestionCategory> = {
    healthConditions: 'health_condition',
    allergies: 'allergy',
    dietaryPreferences: 'dietary_preference',
  };

  function renderChips(
    keys: readonly string[],
    labelPrefix: string,
    selected: string[],
    onToggle: (key: string) => void,
  ) {
    const q = chipSearch.trim().toLowerCase();
    const filtered = q
      ? keys.filter(k => {
          if (tpo(`${labelPrefix}.${k}`).toLowerCase().includes(q)) return true;
          const info = CONDITION_INFO[k];
          if (info && (info.fullName.toLowerCase().includes(q) || info.description.toLowerCase().includes(q))) return true;
          return false;
        })
      : keys;
    return (
      <>
      <View style={styles.chipWrap}>
        {filtered.map(key => {
          const active = selected.includes(key);
          const hasInfo = !!CONDITION_INFO[key];
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(key)}
              activeOpacity={0.75}
            >
              <View style={[styles.chipCheck, active && styles.chipCheckActive]}>
                {active && <TickIcon size={14} color="#fff" />}
              </View>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{tpo(`${labelPrefix}.${key}`)}</Text>
              {hasInfo && (
                <TouchableOpacity
                  style={styles.chipInfo}
                  onPress={(e) => { e.stopPropagation(); setInfoKey(key); }}
                  hitSlop={8}
                >
                  <InfoIcon size={16} color={active ? '#fff' : Colors.secondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {/* "Can't find yours?" text link */}
      <TouchableOpacity
        style={styles.suggestLink}
        onPress={() => setSuggestionCategory(LABEL_TO_CATEGORY[labelPrefix] ?? 'health_condition')}
        activeOpacity={0.7}
      >
        <Text style={styles.suggestLinkText}>Can't find yours? Suggest one</Text>
      </TouchableOpacity>
      </>
    );
  }

  // ── Nutrient dropdown ────────────────────────────────────────────────────
  type NutrientDir = 'limit' | 'boost' | 'none';

  const DROPDOWN_CONFIG: Record<NutrientDir, { label: string; bg: string; iconColor: string }> = {
    none:  { label: tc('nutrientDirections.balance'),  bg: '#aad4cd', iconColor: Colors.primary },
    boost: { label: tc('nutrientDirections.increase'), bg: '#009a1f', iconColor: '#fff' },
    limit: { label: tc('nutrientDirections.limit'),    bg: Colors.status.negative, iconColor: '#fff' },
  };

  function renderDropdownIcon(dir: NutrientDir) {
    if (dir === 'none') {
      return (
        <View style={{ width: 14, height: 14, justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 9, height: 1.8, backgroundColor: Colors.primary, borderRadius: 1, marginBottom: 2.5 }} />
          <View style={{ width: 9, height: 1.8, backgroundColor: Colors.primary, borderRadius: 1 }} />
        </View>
      );
    }
    return (
      <Ionicons
        name={dir === 'boost' ? 'arrow-up' : 'arrow-down'}
        size={14}
        color="#fff"
      />
    );
  }

  function NutrientDropdown({ offKey }: { offKey: string }) {
    const [open, setOpen] = useState(false);
    const value: NutrientDir = nutrientChoices[offKey] ?? 'none';
    const config = DROPDOWN_CONFIG[value];
    const options: NutrientDir[] = ['boost', 'none', 'limit'];
    const triggerRef = useRef<View>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });

    function handleOpen() {
      triggerRef.current?.measureInWindow((x, y, w, h) => {
        setMenuPos({ top: y + h + 4, left: x, width: w });
        setOpen(true);
      });
    }

    function handleSelect(dir: NutrientDir) {
      setNutrientChoice(offKey, dir);
      setOpen(false);
    }

    return (
      <>
        <TouchableOpacity
          ref={triggerRef}
          style={styles.dropdown}
          onPress={handleOpen}
          activeOpacity={0.75}
        >
          <View style={[styles.dropdownCircle, { backgroundColor: config.bg }]}>
            {renderDropdownIcon(value)}
          </View>
          <Text style={styles.dropdownLabel} numberOfLines={1}>{config.label}</Text>
          <Ionicons name="chevron-down" size={14} color={Colors.primary} style={{ opacity: 0.5 }} />
        </TouchableOpacity>

        <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
          <Pressable style={styles.dropdownOverlay} onPress={() => setOpen(false)}>
            <View style={[styles.dropdownMenu, { top: menuPos.top, left: menuPos.left, minWidth: menuPos.width }]}>
              {options.map((dir) => {
                const opt = DROPDOWN_CONFIG[dir];
                const isActive = dir === value;
                return (
                  <TouchableOpacity
                    key={dir}
                    style={[styles.dropdownMenuItem, isActive && styles.dropdownMenuItemActive]}
                    onPress={() => handleSelect(dir)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.dropdownMenuCircle, { backgroundColor: opt.bg }]}>
                      {renderDropdownIcon(dir)}
                    </View>
                    <Text style={[styles.dropdownMenuItemLabel, isActive && styles.dropdownMenuItemLabelActive]}>
                      {opt.label}
                    </Text>
                    {isActive ? (
                      <Ionicons name="checkmark" size={16} color={Colors.primary} />
                    ) : (
                      <View style={{ width: 16 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Modal>
      </>
    );
  }

  // ── Nutrient watchlist step ────────────────────────────────────────────────
  function renderNutrientStep() {
    return (
      <>
        <View style={styles.nutrientHeader}>
          <Text style={styles.cardTitle}>
            {to('nutrient.conditionTitle')}
          </Text>
          <Text style={styles.nutrientSubtitle}>
            {to('nutrient.conditionSubtitle')}
          </Text>
        </View>

        {conditionGroups.map((group) => (
          <View key={group.conditionKey} style={styles.conditionSection}>
            <View style={styles.conditionPill}>
              <Text style={styles.conditionPillText}>
                {tpo(`healthConditions.${group.conditionKey}`)}
              </Text>
            </View>

            {/* Nutrient rows */}
            {group.nutrients.map((n) => (
              <View
                key={`${group.conditionKey}-${n.offKey}`}
                style={styles.nutrientRow}
              >
                <Text style={styles.nutrientName}>{n.nutrient}</Text>
                <NutrientDropdown offKey={n.offKey} />
              </View>
            ))}
          </View>
        ))}
      </>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────────
  if (!fetched) {
    return (
      <SafeAreaView style={styles.safe}>
        <LottieLoader type="loading" />
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const displayAvatar = avatarUri ?? cachedExistingAvatar;

  return (
    <>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <Logo width={141} height={36} />
        </View>

        {/* Step header */}
        <View style={styles.stepHeader}>
          <View style={styles.stepTitleRow}>
            <Text style={styles.stepTitle}>{stepTitle}</Text>
          </View>
          {renderProgress()}
        </View>

        {/* Scrollable content */}
        <ScrollView
          ref={(ref) => {
            (scrollRef as any).current = ref;
            (scrollContainerRef as any).current = ref;
          }}
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onLayout={(e: LayoutChangeEvent) => {
            scrollViewHeightRef.current = e.nativeEvent.layout.height;
          }}
        >
          <Animated.View style={{ opacity: contentOpacity, transform: [{ translateX: contentTranslateX }] }}>
          {/* ── Step: About you ── */}
          {currentStepKey === 'about' && (
            <>
              <View style={styles.avatarContainer}>
                {/* Tap the image to see it larger */}
                <TouchableOpacity
                  style={styles.avatarCircle}
                  onPress={() => setAvatarViewerOpen(true)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="View profile photo"
                >
                  {displayAvatar ? (
                    <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>{getInitials(fullName)}</Text>
                  )}
                </TouchableOpacity>
                {/* Tap the camera to change photo */}
                <TouchableOpacity
                  style={styles.cameraBadge}
                  onPress={handleAvatarPick}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                  hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                >
                  <CameraIcon size={20} color="#fff" />
                </TouchableOpacity>
              </View>

              <View style={[styles.card, styles.cardWithAvatar]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{tp('editProfile.aboutTitle')}</Text>
                  <Text style={styles.cardSubtitle}>{tp('editProfile.aboutSubtitle')}</Text>
                </View>

                <View style={styles.fields}>
                  <View
                    ref={(ref) => { (nameRowRef as any).current = ref; }}
                    style={[styles.inputRow, focusedField === 'name' && styles.inputRowFocused]}
                  >
                    <PersonalIcon size={16} color={Colors.primary} />
                    <TextInput
                      style={[styles.inputFieldInner, fullName ? styles.inputFieldBold : null]}
                      placeholder={tc('placeholder.fullName')}
                      placeholderTextColor={`${Colors.secondary}`}
                      selectionColor={Colors.primary}
                      autoCapitalize="words"
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => { setFocusedField('name'); scrollInputToCenter(nameRowRef.current); }}
                      onBlur={() => setFocusedField(null)}
                    />
                    {fullName ? (
                      <TouchableOpacity onPress={() => setFullName('')} hitSlop={8}>
                        <Ionicons name="close" size={18} color={`${Colors.primary}80`} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View style={[styles.inputRow, styles.inputRowReadOnly]}>
                    <EmailIcon size={20} color={`${Colors.primary}50`} />
                    <TextInput
                      style={[styles.inputFieldInner, styles.inputReadOnly]}
                      value={session?.user?.email ?? ''}
                      editable={false}
                      selectTextOnFocus={false}
                    />
                  </View>
                  <TouchableOpacity
                    ref={(ref) => { (dobRowRef as any).current = ref; }}
                    style={[styles.inputRow]}
                    activeOpacity={0.7}
                    onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
                  >
                    <BirthdayIcon size={20} color={Colors.primary} />
                    <Text
                      style={[styles.inputFieldInner, dateOfBirth ? styles.inputFieldBold : { color: Colors.secondary }]}
                      numberOfLines={1}
                    >
                      {dateOfBirth ? formatDob(toLocalDateString(dateOfBirth)) : tp('editProfile.placeholder.dateOfBirth')}
                    </Text>
                    {dateOfBirth ? (
                      <TouchableOpacity onPress={() => { setDateOfBirth(null); setShowDatePicker(false); }} hitSlop={8}>
                        <Ionicons name="close" size={18} color={`${Colors.primary}80`} />
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* ── Step: Health Conditions ── */}
          {currentStepKey === 'health' && (
            <View style={styles.card}>
              {renderChipHeader(
                to('question.healthCondition'),
                healthConditions.length,
                to('count.condition', { count: healthConditions.length }),
              )}
              {renderChips(HEALTH_CONDITION_KEYS, 'healthConditions', healthConditions, key =>
                setHealthConditions(prev => toggle(prev, key))
              )}
            </View>
          )}

          {/* ── Step: IBS Subtype (conditional follow-up to Health) ── */}
          {currentStepKey === 'ibsSubtype' && (
            <View style={styles.card}>
              <IbsSubtypePicker value={ibsSubtype} onChange={setIbsSubtype} />
            </View>
          )}

          {/* ── Step: Pregnancy (conditional follow-up to Health) ── */}
          {currentStepKey === 'pregnancy' && (
            <View style={styles.card}>
              <PregnancyStep
                status={pregnancyStatus}
                dueDate={pregnancyDueDate}
                onChange={(s, d) => { setPregnancyStatus(s); setPregnancyDueDate(d); }}
              />
            </View>
          )}

          {/* ── Step: Conflict Review (only shown when conflicts detected) ── */}
          {currentStepKey === 'conflicts' && (
            <ConflictReviewStep
              hardConflicts={conflictResult.hardConflicts}
              redundancies={conflictResult.redundancies}
              onResolve={(_id, category, key) => {
                if (category === 'health') setHealthConditions(prev => prev.filter(k => k !== key));
                if (category === 'allergy') setAllergies(prev => prev.filter(k => k !== key));
                if (category === 'dietary') setDietaryPrefs(prev => prev.filter(k => k !== key));
              }}
              labelFor={(category, key) => {
                if (category === 'health') return tpo(`healthConditions.${key}` as any) || key;
                if (category === 'allergy') return tpo(`allergies.${key}` as any) || key;
                return tpo(`dietaryPreferences.${key}` as any) || key;
              }}
            />
          )}

          {/* ── Step: Nutrient Watchlist ── */}
          {currentStepKey === 'nutrients' && (
            <View style={styles.nutrientCard}>
              {renderNutrientStep()}
            </View>
          )}

          {/* ── Step: Allergies ── */}
          {currentStepKey === 'allergies' && (
            <View style={styles.card}>
              {renderChipHeader(
                to('question.allergies'),
                allergies.length,
                to('count.allergy', { count: allergies.length }),
              )}
              {renderChips(ALLERGY_KEYS, 'allergies', allergies, key =>
                setAllergies(prev => toggle(prev, key))
              )}
            </View>
          )}

          {/* ── Step: Dietary Preferences ── */}
          {currentStepKey === 'dietary' && (
            <View style={styles.card}>
              {renderChipHeader(
                to('question.dietaryPreferences'),
                dietaryPrefs.length,
                to('count.preference', { count: dietaryPrefs.length }),
              )}
              {renderChips(DIETARY_PREFERENCE_KEYS, 'dietaryPreferences', dietaryPrefs, key =>
                setDietaryPrefs(prev => toggle(prev, key))
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
          </Animated.View>
        </ScrollView>

        {/* ── Footer — hidden when date picker is open ── */}
        {!showDatePicker && (
          <View style={styles.footer}>
            <LinearGradient
              colors={['rgba(226,241,238,0)', Colors.background]}
              style={styles.footerFade}
              pointerEvents="none"
            />
            <View style={[styles.footerButtons, { paddingBottom: insets.bottom + 12 }]}>
              <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
                <Text style={styles.backBtnText}>{step === 1 ? tc('buttons.cancel') : tc('buttons.back')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.nextBtn, saveBlocked && { opacity: 0.5 }]}
                onPress={isLastStep ? handleSave : handleNext}
                disabled={saving || saveBlocked}
                activeOpacity={0.88}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextBtnText} numberOfLines={1} adjustsFontSizeToFit>
                    {isLastStep ? tp('editProfile.saveChanges') : to('progress.next', { label: nextLabel })}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
    <ConditionInfoSheet conditionKey={infoKey} onClose={() => setInfoKey(null)} />
    <SuggestionSheet
      visible={!!suggestionCategory}
      onClose={() => setSuggestionCategory(null)}
      category={suggestionCategory ?? 'health_condition'}
    />
    <AvatarViewer
      visible={avatarViewerOpen}
      uri={displayAvatar}
      initials={getInitials(fullName)}
      onClose={() => setAvatarViewerOpen(false)}
    />
    <DobPicker
      visible={showDatePicker}
      value={dateOfBirth}
      onChange={setDateOfBirth}
      onClose={() => setShowDatePicker(false)}
      onClear={() => setDateOfBirth(null)}
      clearLabel={tc('buttons.clear')}
      doneLabel={tc('buttons.done')}
    />
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoArea: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 48,
  },

  stepHeader: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 8,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepTitle: {
    fontSize: 24,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 21,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextLabel: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },

  avatarContainer: {
    marginLeft: 16,
    marginBottom: -60,
    zIndex: 2,
    width: 120,
    height: 120,
  },
  avatarCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3b9586',
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarInitials: {
    fontSize: 36,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00776F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Shadows.level2,
  },

  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    ...Shadows.level4,
  },
  cardWithAvatar: {
    paddingTop: 80,
  },
  cardHeader: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  cardSubtitle: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
  },

  fields: {
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputRowFocused: {
    borderWidth: 2,
    borderColor: Colors.accent,
    margin: -1,
  },
  inputFieldBold: {
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
  },
  inputRowReadOnly: {
    opacity: 0.5,
  },
  inputFieldInner: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
  },
  inputReadOnly: {
    color: `${Colors.primary}80`,
  },

  chipCardInfo: {
    gap: 8,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 4,
  },
  countText: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
  },
  countBold: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  searchLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  searchLinkText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    lineHeight: 20,
  },
  chipSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  chipSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 8,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.level2,
  },
  chipCheck: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  chipCheckActive: {
    backgroundColor: '#3b9586',
    borderColor: '#3b9586',
  },
  chipLabel: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  chipLabelActive: {
    color: '#fff',
  },
  chipInfo: {
    marginLeft: -4,
    padding: 2,
  },
  suggestLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  suggestLinkText: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.14,
    textDecorationLine: 'underline',
  },

  // ── Nutrient watchlist step styles ──────────────────────────────────────────
  nutrientCard: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surface.secondary,
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 24,
    ...Shadows.level4,
  },
  nutrientHeader: {
    gap: 4,
  },
  nutrientSubtitle: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
  },
  conditionSection: {
    gap: 12,
  },
  conditionPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#b8dfd6',
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conditionPillText: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 16,
    textAlign: 'center',
  },
  conditionCard: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutrientRowBorder: {},
  nutrientName: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  dropdown: {
    width: 154,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    padding: 8,
  },
  dropdownCircle: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  dropdownOverlay: {
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    backgroundColor: Colors.surface.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingVertical: 4,
    ...Shadows.level4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  dropdownMenuItemActive: {
    backgroundColor: Colors.surface.tertiary,
  },
  dropdownMenuCircle: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownMenuItemLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  dropdownMenuItemLabelActive: {
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerFade: {
    height: 40,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 91,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
  },
  nextBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 8,
  },
  nextBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});

