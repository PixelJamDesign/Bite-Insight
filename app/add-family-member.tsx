import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { safeBack } from '@/lib/safeBack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { supabase, uploadAvatar, getAvatarUrl } from '@/lib/supabase';
import { useCachedAvatar } from '@/lib/useCachedAvatar';
import { useAuth } from '@/lib/auth';
import { Colors, Shadows } from '@/constants/theme';
import { CONDITION_NUTRIENT_MAP } from '@/constants/conditionNutrientMap';
import {
  HEALTH_CONDITION_KEYS, ALLERGY_KEYS, DIETARY_PREFERENCE_KEYS, RELATIONSHIP_KEYS,
  normalizeHealthCondition, normalizeAllergy, normalizeDietaryPreference,
} from '@/constants/profileOptions';
import type { NutrientWatchlistEntry } from '@/lib/types';
import { CameraIcon, PersonalIcon, TickIcon } from '@/components/MenuIcons';
import Logo from '../assets/images/logo.svg';

// ── Step types ────────────────────────────────────────────────────────────────
type StepKey = 'about' | 'health' | 'nutrients' | 'allergies' | 'dietary';

// ── Unique nutrient type (tri-state) ─────────────────────────────────────────
type UniqueNutrient = {
  offKey: string;
  nutrient: string;
  unit: 'mg' | 'µg' | 'g';
  source: string;
  recommendedDirection: 'limit' | 'boost';
  hasConflict: boolean;
};

/** Build de-duped nutrient list from selected health conditions */
function buildUniqueNutrients(conditions: string[]): UniqueNutrient[] {
  const map = new Map<string, UniqueNutrient>();
  const limitKeys = new Set<string>();
  const boostKeys = new Set<string>();

  for (const condition of conditions) {
    const profile = CONDITION_NUTRIENT_MAP[condition];
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

  // Flag conflicts: nutrient in both limit and boost across conditions
  for (const [key, n] of map) {
    if (limitKeys.has(key) && boostKeys.has(key)) n.hasConflict = true;
  }

  return Array.from(map.values());
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddFamilyMemberScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;
  const { t: tp } = useTranslation('profile');
  const { t: to } = useTranslation('onboarding');
  const { t: tpo } = useTranslation('profileOptions');
  const { t: tc } = useTranslation('common');

  const [step, setStep] = useState(1);
  const [fetched, setFetched] = useState(!isEditing);

  // Step 1 – About them
  const [fullName, setFullName]     = useState('');
  const [relationship, setRelationship] = useState('');
  const [avatarUri, setAvatarUri]   = useState<string | null>(null);
  const [existingAvatar, setExistingAvatar] = useState<string | null>(null);
  const cachedExistingAvatar = useCachedAvatar(existingAvatar);

  // Step 2 – Health Conditions
  const [healthConditions, setHealthConditions] = useState<string[]>([]);

  // Step 3 – Allergies
  const [allergies, setAllergies] = useState<string[]>([]);

  // Step 4 – Dietary Preferences
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

  // ── Nutrient watchlist ──────────────────────────────────────────────────────
  const [nutrientChoices, setNutrientChoices] = useState<Record<string, 'limit' | 'boost' | 'none'>>({});

  const showNutrientStep = healthConditions.length > 0;

  const stepSequence: StepKey[] = useMemo(() => [
    'about',
    'health',
    ...(showNutrientStep ? ['nutrients' as StepKey] : []),
    'allergies',
    'dietary',
  ], [showNutrientStep]);

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

  const limitNutrients = uniqueNutrients.filter(n => nutrientChoices[n.offKey] === 'limit');
  const boostNutrients = uniqueNutrients.filter(n => nutrientChoices[n.offKey] === 'boost');
  const noChangeNutrients = uniqueNutrients.filter(n => !nutrientChoices[n.offKey] || nutrientChoices[n.offKey] === 'none');

  function setNutrientChoice(offKey: string, choice: 'limit' | 'boost' | 'none') {
    setNutrientChoices(prev => ({ ...prev, [offKey]: choice }));
  }

  function buildFinalWatchlist(): NutrientWatchlistEntry[] {
    return uniqueNutrients
      .filter(n => {
        const choice = nutrientChoices[n.offKey];
        return choice === 'limit' || choice === 'boost';
      })
      .map(n => ({
        offKey: n.offKey,
        nutrient: n.nutrient,
        direction: nutrientChoices[n.offKey] as 'limit' | 'boost',
        unit: n.unit,
        source: n.source,
        reason: '',
      }));
  }

  // Chip search
  const [chipSearch, setChipSearch]           = useState('');
  const [chipSearchActive, setChipSearchActive] = useState(false);
  const chipSearchRef = useRef<TextInput>(null);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);

  // ── Load existing profile (edit mode) ───────────────────────────────────────
  useEffect(() => {
    if (!params.id) return;
    supabase
      .from('family_profiles')
      .select('*')
      .eq('id', params.id)
      .single()
      .then(({ data, error }) => {
        if (error) console.error('Family profile load error:', error.message);
        if (data) {
          setFullName(data.name ?? '');
          setRelationship(data.relationship ?? '');
          setExistingAvatar(getAvatarUrl(data.avatar_url));
          setHealthConditions(((data.health_conditions as string[]) ?? []).map(normalizeHealthCondition));
          setAllergies(((data.allergies as string[]) ?? []).map(normalizeAllergy));
          setDietaryPrefs(((data.dietary_preferences as string[]) ?? []).map(normalizeDietaryPreference));

          // Load existing nutrient watchlist choices
          const existing = (data.nutrient_watchlist as NutrientWatchlistEntry[] | null) ?? [];
          if (existing.length > 0) {
            const choices: Record<string, 'limit' | 'boost' | 'none'> = {};
            for (const e of existing) choices[e.offKey] = e.direction;
            setNutrientChoices(choices);
          }
        }
        setFetched(true);
      });
  }, [params.id]);

  // Auto-select non-userConfirmRequired nutrients when suggestions change
  const hasLoadedExistingRef = useRef(false);
  useEffect(() => {
    if (!fetched) return;
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
  const dotPops     = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(1))).current;
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

  // Reset chip search on step change
  useEffect(() => {
    setChipSearch('');
    setChipSearchActive(false);
  }, [step]);

  // ── Avatar picker ──────────────────────────────────────────────────────────
  function pickAvatar() {
    Alert.alert(tp('editProfile.avatar.alertTitle'), tp('editProfile.avatar.alertMessage'), [
      {
        text: tp('editProfile.avatar.takePhoto'),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(tp('editProfile.avatar.permissionTitle'), tp('editProfile.avatar.permissionMessage'));
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setAvatarUri(result.assets[0].uri);
        },
      },
      {
        text: tp('editProfile.avatar.chooseFromLibrary'),
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
          if (!result.canceled) setAvatarUri(result.assets[0].uri);
        },
      },
      { text: tc('buttons.cancel'), style: 'cancel' },
    ]);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleNext() {
    if (currentStepKey === 'about' && !fullName.trim()) {
      Alert.alert(tp('familyMember.alert.nameRequiredTitle'), tp('familyMember.alert.nameRequiredMessage'));
      return;
    }
    setStep(s => Math.min(s + 1, totalSteps));
  }

  function handleBack() {
    if (step === 1) safeBack();
    else setStep(s => s - 1);
  }

  // ── Save / Finish ─────────────────────────────────────────────────────────
  async function handleSave() {
    if (!session?.user?.id) return;
    setSaving(true);

    // Upload avatar if a new one was picked
    let avatarUrl: string | null = existingAvatar;
    if (avatarUri) {
      const uploaded = await uploadAvatar(session.user.id, avatarUri, true);
      if (uploaded) avatarUrl = uploaded;
    }

    const payload = {
      user_id: session.user.id,
      name: fullName.trim(),
      relationship: relationship || null,
      avatar_url: avatarUrl,
      health_conditions: healthConditions,
      allergies,
      dietary_preferences: dietaryPrefs,
      nutrient_watchlist: buildFinalWatchlist(),
    };

    const { error } = isEditing
      ? await supabase.from('family_profiles').update(payload).eq('id', params.id!)
      : await supabase.from('family_profiles').insert(payload);

    setSaving(false);
    if (error) Alert.alert(tc('alert.saveFailedTitle'), error.message);
    else safeBack();
  }

  // ── Progress indicator ────────────────────────────────────────────────────
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
              <Animated.View key={s} style={{ transform: [{ scale: dotPops[s - 1] }] }}>
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

  // ── Chip card header ──────────────────────────────────────────────────────
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
        )}
      </View>
    );
  }

  // ── Chip grid ─────────────────────────────────────────────────────────────
  function renderChips(
    keys: readonly string[],
    labelPrefix: string,
    selected: string[],
    onToggle: (key: string) => void,
  ) {
    const filtered = chipSearch.trim()
      ? keys.filter(k => tpo(`${labelPrefix}.${k}`).toLowerCase().includes(chipSearch.toLowerCase()))
      : keys;
    return (
      <View style={styles.chipWrap}>
        {filtered.map(key => {
          const active = selected.includes(key);
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
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Nutrient watchlist step ────────────────────────────────────────────────
  function renderNutrientRow(n: UniqueNutrient) {
    const choice = nutrientChoices[n.offKey] ?? 'none';
    return (
      <View key={n.offKey} style={styles.nutrientRow}>
        <View style={styles.nutrientTopRow}>
          <Text style={styles.nutrientName}>{n.nutrient}</Text>
          <Text style={styles.sourceBadge}>{n.source}</Text>
        </View>
        <View style={styles.segmentedRow}>
          <TouchableOpacity
            style={[styles.segmentBtn, choice === 'limit' && styles.segmentBtnLimitActive]}
            onPress={() => setNutrientChoice(n.offKey, 'limit')}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, styles.segmentTextLimit, choice === 'limit' && styles.segmentTextActive]}>{tc('nutrientDirections.limit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, choice === 'boost' && styles.segmentBtnBoostActive]}
            onPress={() => setNutrientChoice(n.offKey, 'boost')}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, styles.segmentTextBoost, choice === 'boost' && styles.segmentTextActive]}>{tc('nutrientDirections.boost')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, choice === 'none' && styles.segmentBtnNoneActive]}
            onPress={() => setNutrientChoice(n.offKey, 'none')}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, styles.segmentTextNone, choice === 'none' && styles.segmentTextNoneActive]}>{tc('nutrientDirections.noChange')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderNutrientStep() {
    const activeCount = limitNutrients.length + boostNutrients.length;
    return (
      <View style={styles.card}>
        <View style={styles.chipCardInfo}>
          <Text style={styles.cardTitle}>
            {to('nutrient.suggestionFamily')}
          </Text>
          <View style={styles.countRow}>
            <Text style={styles.countText}>{to('nutrient.tracking')}</Text>
            <Text style={styles.countBold}>
              {to('nutrient.nutrientCount', { count: activeCount })}
            </Text>
          </View>
          <Text style={styles.nutrientSubtext}>
            {to('nutrient.instructions')}
          </Text>
        </View>

        {limitNutrients.length > 0 && (
          <View style={styles.nutrientSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="arrow-down-circle" size={16} color={Colors.status.negative} />
              <Text style={[styles.sectionHeader, { color: Colors.status.negative }]}>
                {to('nutrient.sectionLimiting')}
              </Text>
            </View>
            {limitNutrients.map(renderNutrientRow)}
          </View>
        )}

        {boostNutrients.length > 0 && (
          <View style={styles.nutrientSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="arrow-up-circle" size={16} color={Colors.status.positive} />
              <Text style={[styles.sectionHeader, { color: Colors.status.positive }]}>
                {to('nutrient.sectionBoosting')}
              </Text>
            </View>
            {boostNutrients.map(renderNutrientRow)}
          </View>
        )}

        {noChangeNutrients.length > 0 && (
          <View style={styles.nutrientSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="remove-circle" size={16} color={Colors.secondary} />
              <Text style={[styles.sectionHeader, { color: Colors.secondary }]}>
                {to('nutrient.sectionNoChange')}
              </Text>
            </View>
            {noChangeNutrients.map(renderNutrientRow)}
          </View>
        )}
      </View>
    );
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (!fetched) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Step: About them ── */}
          {currentStepKey === 'about' && (
            <>
              <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.85}>
                <View style={styles.avatarCircle}>
                  {(avatarUri ?? cachedExistingAvatar) ? (
                    <Image source={{ uri: (avatarUri ?? cachedExistingAvatar)! }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarInitials}>{getInitials(fullName)}</Text>
                  )}
                </View>
                <View style={styles.cameraBadge}>
                  <CameraIcon size={16} color="#fff" />
                </View>
              </TouchableOpacity>

              <View style={[styles.card, styles.cardWithAvatar]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>
                    {isEditing ? tp('familyMember.aboutTitleEdit') : tp('familyMember.aboutTitleAdd')}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {isEditing
                      ? tp('familyMember.aboutSubtitleEdit')
                      : tp('familyMember.aboutSubtitleAdd')}
                  </Text>
                </View>

                <View style={styles.fields}>
                  <View style={[styles.inputRow, focusedField === 'name' && styles.inputRowFocused]}>
                    <PersonalIcon size={16} color={Colors.primary} />
                    <TextInput
                      style={[styles.inputFieldInner, fullName ? styles.inputFieldBold : null]}
                      placeholder={tc('placeholder.fullName')}
                      placeholderTextColor={`${Colors.secondary}`}
                      selectionColor={Colors.primary}
                      autoCapitalize="words"
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {fullName ? (
                      <TouchableOpacity onPress={() => setFullName('')} hitSlop={8}>
                        <Ionicons name="close" size={18} color={`${Colors.primary}80`} />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Relationship chips */}
                  <Text style={styles.fieldLabel}>{tp('familyMember.field.relationship')}</Text>
                  <View style={styles.relationshipWrap}>
                    {RELATIONSHIP_KEYS.map(key => {
                      const active = relationship === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[styles.relationshipChip, active && styles.relationshipChipActive]}
                          onPress={() => setRelationship(active ? '' : key)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.relationshipChipLabel, active && styles.relationshipChipLabelActive]}>
                            {tpo(`relationships.${key}`)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Step: Health Conditions ── */}
          {currentStepKey === 'health' && (
            <View style={styles.card}>
              {renderChipHeader(
                to('question.healthConditionFamily'),
                healthConditions.length,
                to('count.condition', { count: healthConditions.length }),
              )}
              {renderChips(HEALTH_CONDITION_KEYS, 'healthConditions', healthConditions, key =>
                setHealthConditions(prev => toggle(prev, key))
              )}
            </View>
          )}

          {/* ── Step: Nutrient Watchlist ── */}
          {currentStepKey === 'nutrients' && renderNutrientStep()}

          {/* ── Step: Allergies ── */}
          {currentStepKey === 'allergies' && (
            <View style={styles.card}>
              {renderChipHeader(
                to('question.allergiesFamily'),
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
                to('question.dietaryPreferencesFamily'),
                dietaryPrefs.length,
                to('count.preference', { count: dietaryPrefs.length }),
              )}
              {renderChips(DIETARY_PREFERENCE_KEYS, 'dietaryPreferences', dietaryPrefs, key =>
                setDietaryPrefs(prev => toggle(prev, key))
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Footer ── */}
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
              style={styles.nextBtn}
              onPress={isLastStep ? handleSave : handleNext}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextBtnText} numberOfLines={1} adjustsFontSizeToFit>
                  {isLastStep
                    ? (isEditing ? tp('editProfile.saveChanges') : tc('buttons.finish'))
                    : to('progress.next', { label: nextLabel })}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingBottom: 30,
  },

  stepHeader: {
    paddingHorizontal: 24,
    paddingBottom: 24,
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
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
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
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00776F',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
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
  fieldLabel: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
    marginTop: 6,
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
  inputFieldInner: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
  },

  // Relationship chips (simple select, no checkbox)
  relationshipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  relationshipChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 8,
  },
  relationshipChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    ...Shadows.level2,
  },
  relationshipChipLabel: {
    fontSize: 15,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  relationshipChipLabelActive: {
    color: '#fff',
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
  chipSearchInput: {
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    gap: 8,
    paddingLeft: 8,
    paddingRight: 16,
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
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  chipLabelActive: {
    color: '#fff',
  },

  // ── Nutrient watchlist step styles ──────────────────────────────────────────
  nutrientSubtext: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  nutrientSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    letterSpacing: -0.28,
    lineHeight: 17,
  },
  nutrientRow: {
    gap: 8,
    padding: 12,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 8,
  },
  nutrientTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutrientName: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  sourceBadge: {
    fontSize: 12,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.12,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  segmentBtnLimitActive: {
    backgroundColor: Colors.status.negative,
    borderColor: Colors.status.negative,
  },
  segmentBtnBoostActive: {
    backgroundColor: Colors.status.positive,
    borderColor: Colors.status.positive,
  },
  segmentBtnNoneActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    letterSpacing: -0.26,
  },
  segmentTextLimit: {
    color: Colors.status.negative,
  },
  segmentTextBoost: {
    color: Colors.status.positive,
  },
  segmentTextNone: {
    color: Colors.secondary,
  },
  segmentTextActive: {
    color: '#fff',
  },
  segmentTextNoneActive: {
    color: '#fff',
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
