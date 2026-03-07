/**
 * Post-signup onboarding (steps 2–4, or 2–5 if health conditions selected).
 * Navigated to from the login screen after basic account creation.
 * Lives outside (auth) so the session→tabs redirect doesn't fire.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import InfoIcon from '@/assets/icons/info.svg';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Shadows } from '@/constants/theme';
import { CONDITION_NUTRIENT_MAP } from '@/constants/conditionNutrientMap';
import { HEALTH_CONDITION_KEYS, ALLERGY_KEYS, DIETARY_PREFERENCE_KEYS } from '@/constants/profileOptions';
import type { NutrientWatchlistEntry } from '@/lib/types';
import Logo from '../assets/images/logo.svg';

// ── Step types ────────────────────────────────────────────────────────────────
type StepKey = 'health' | 'nutrients' | 'allergies' | 'dietary';

// ── Nutrient types ──────────────────────────────────────────────────────────
type UniqueNutrient = {
  offKey: string;
  nutrient: string;
  unit: 'mg' | 'µg' | 'g';
  source: string;
  recommendedDirection: 'limit' | 'boost';
  hasConflict: boolean;
};

/** Build de-duped unique nutrients from selected health conditions */
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

  for (const [key, n] of map) {
    if (limitKeys.has(key) && boostKeys.has(key)) n.hasConflict = true;
  }

  return Array.from(map.values());
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
}

export default function OnboardingScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('onboarding');
  const { t: tpo } = useTranslation('profileOptions');
  const { t: tc } = useTranslation('common');

  // Onboarding position
  const [pos, setPos] = useState(0);

  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

  // ── Nutrient watchlist ──────────────────────────────────────────────────────
  const [nutrientChoices, setNutrientChoices] = useState<Record<string, 'limit' | 'boost' | 'none'>>({});

  const showNutrientStep = healthConditions.length > 0;

  const uniqueNutrients = useMemo(
    () => buildUniqueNutrients(healthConditions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [healthConditions.join(',')],
  );

  // Auto-populate choices with recommended directions
  useEffect(() => {
    const choices: Record<string, 'limit' | 'boost' | 'none'> = {};
    for (const n of uniqueNutrients) {
      choices[n.offKey] = n.hasConflict ? 'none' : n.recommendedDirection;
    }
    setNutrientChoices(choices);
  }, [uniqueNutrients]);

  const limitNutrients = uniqueNutrients.filter(n => nutrientChoices[n.offKey] === 'limit');
  const boostNutrients = uniqueNutrients.filter(n => nutrientChoices[n.offKey] === 'boost');
  const noChangeNutrients = uniqueNutrients.filter(n => !nutrientChoices[n.offKey] || nutrientChoices[n.offKey] === 'none');

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

  // ── Dynamic step sequence ──────────────────────────────────────────────────
  const stepSequence: StepKey[] = useMemo(() => [
    'health',
    ...(showNutrientStep ? ['nutrients' as StepKey] : []),
    'allergies',
    'dietary',
  ], [showNutrientStep]);

  const currentStepKey = stepSequence[pos] ?? 'health';
  const isLastStep = pos === stepSequence.length - 1;
  const totalSteps = stepSequence.length + 1; // +1 for signup step (done)
  const overallStep = pos + 2; // step 1 is signup (done)

  const stepTitle = t(`step.${currentStepKey}`);
  const nextStepKey = pos < stepSequence.length - 1 ? stepSequence[pos + 1] : null;
  const nextLabel = nextStepKey ? t(`step.${nextStepKey}`) : null;

  // Chip search
  const [chipSearch, setChipSearch]           = useState('');
  const [chipSearchActive, setChipSearchActive] = useState(false);
  const chipSearchRef = useRef<TextInput>(null);

  const [saving, setSaving] = useState(false);

  // Reset chip search on step change
  useEffect(() => {
    setChipSearch('');
    setChipSearchActive(false);
  }, [pos]);

  // ── Navigation ───────────────────────────────────────────────────────────────
  function handleNext() {
    setPos(p => p + 1);
  }

  function handleBack() {
    if (pos === 0) router.replace('/(auth)/login');
    else setPos(p => p - 1);
  }

  // ── Finish ────────────────────────────────────────────────────────────────────
  async function handleFinish() {
    setSaving(true);
    const userId = session?.user?.id;
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({
          health_conditions: healthConditions,
          allergies,
          dietary_preferences: dietaryPrefs,
          nutrient_watchlist: buildFinalWatchlist(),
        })
        .eq('id', userId);
      if (error) {
        setSaving(false);
        Alert.alert('Save failed', error.message);
        return;
      }
    }
    setSaving(false);
    router.replace('/(tabs)/');
  }

  // ── Progress indicator ─────────────────────────────────────────────────────
  function renderProgress() {
    const dots = Array.from({ length: totalSteps }, (_, i) => i + 1);
    return (
      <View style={styles.progressRow}>
        <View style={styles.progressDots}>
          {dots.map((s) => {
            if (s < overallStep) {
              return (
                <View key={s} style={styles.stepDone}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              );
            }
            if (s === overallStep) return <View key={s} style={styles.stepCurrent} />;
            return <View key={s} style={styles.stepUpcoming} />;
          })}
        </View>
        {nextLabel && <Text style={styles.nextLabel}>{t('progress.next', { label: nextLabel })}</Text>}
      </View>
    );
  }

  // ── Chip card header ─────────────────────────────────────────────────────────
  function renderChipHeader(question: string, count: number, countText: string) {
    return (
      <View style={styles.chipCardInfo}>
        <Text style={styles.cardTitle}>{question}</Text>
        <View style={styles.countRow}>
          <Text style={styles.countText}>{t('chip.youveSelected')}</Text>
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

  // ── Chip grid ─────────────────────────────────────────────────────────────────
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
                {active && <Ionicons name="checkmark" size={12} color="#fff" />}
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
            <Text style={[styles.segmentText, styles.segmentTextLimit, choice === 'limit' && styles.segmentTextActive]}>
              {tc('nutrientDirections.limit')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, choice === 'boost' && styles.segmentBtnBoostActive]}
            onPress={() => setNutrientChoice(n.offKey, 'boost')}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, styles.segmentTextBoost, choice === 'boost' && styles.segmentTextActive]}>
              {tc('nutrientDirections.boost')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, choice === 'none' && styles.segmentBtnNoneActive]}
            onPress={() => setNutrientChoice(n.offKey, 'none')}
            activeOpacity={0.75}
          >
            <Text style={[styles.segmentText, styles.segmentTextNone, choice === 'none' && styles.segmentTextNoneActive]}>
              {tc('nutrientDirections.noChange')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderNutrientStep() {
    return (
      <>
        <View style={styles.chipCardInfo}>
          <Text style={styles.cardTitle}>
            {t('nutrient.suggestion')}
          </Text>
          <View style={styles.countRow}>
            <Text style={styles.countText}>{t('nutrient.limiting')}</Text>
            <Text style={styles.countBold}>{limitNutrients.length}</Text>
            <Text style={styles.countText}>{t('nutrient.boosting')}</Text>
            <Text style={styles.countBold}>{boostNutrients.length}</Text>
          </View>
          <Text style={styles.nutrientSubtext}>
            {t('nutrient.alertSubtext')}
          </Text>
        </View>

        {limitNutrients.length > 0 && (
          <View style={styles.nutrientSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="arrow-down-circle" size={16} color={Colors.status.negative} />
              <Text style={[styles.sectionHeader, { color: Colors.status.negative }]}>
                {t('nutrient.sectionLimit')}
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
                {t('nutrient.sectionBoost')}
              </Text>
            </View>
            {boostNutrients.map(renderNutrientRow)}
          </View>
        )}

        {noChangeNutrients.length > 0 && (
          <View style={styles.nutrientSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="remove-circle" size={16} color={`${Colors.primary}50`} />
              <Text style={[styles.sectionHeader, { color: `${Colors.primary}50` }]}>
                {t('nutrient.sectionNoChange')}
              </Text>
            </View>
            {noChangeNutrients.map(renderNutrientRow)}
          </View>
        )}
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <Logo width={141} height={36} />
      </View>

      {/* Step header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>{stepTitle}</Text>
          <View style={{ opacity: 0.5 }}><InfoIcon width={20} height={20} /></View>
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
        <View style={styles.card}>
          {currentStepKey === 'health' && renderChipHeader(
            t('question.healthCondition'),
            healthConditions.length,
            t('count.condition', { count: healthConditions.length }),
          )}
          {currentStepKey === 'allergies' && renderChipHeader(
            t('question.allergies'),
            allergies.length,
            t('count.allergy', { count: allergies.length }),
          )}
          {currentStepKey === 'dietary' && renderChipHeader(
            t('question.dietaryPreferences'),
            dietaryPrefs.length,
            t('count.preference', { count: dietaryPrefs.length }),
          )}

          {currentStepKey === 'health' && renderChips(HEALTH_CONDITION_KEYS, 'healthConditions', healthConditions, key =>
            setHealthConditions(prev => toggle(prev, key))
          )}
          {currentStepKey === 'nutrients' && renderNutrientStep()}
          {currentStepKey === 'allergies' && renderChips(ALLERGY_KEYS, 'allergies', allergies, key =>
            setAllergies(prev => toggle(prev, key))
          )}
          {currentStepKey === 'dietary' && renderChips(DIETARY_PREFERENCE_KEYS, 'dietaryPreferences', dietaryPrefs, key =>
            setDietaryPrefs(prev => toggle(prev, key))
          )}
        </View>

        {/* Skip link — available on every step */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => router.replace('/(tabs)/')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>{tc('buttons.skip')}</Text>
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <LinearGradient
          colors={['rgba(226,241,238,0)', Colors.background]}
          style={styles.footerFade}
          pointerEvents="none"
        />
        <View style={styles.footerButtons}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>{pos === 0 ? tc('buttons.cancel') : tc('buttons.back')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextBtn}
            onPress={isLastStep ? handleFinish : handleNext}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText} numberOfLines={1} adjustsFontSizeToFit>
                {isLastStep ? tc('buttons.finish') : t('progress.next', { label: nextLabel })}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  logoArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
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
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3b9586',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCurrent: {
    width: 48,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  stepUpcoming: {
    width: 16,
    height: 10,
    borderRadius: 5,
    backgroundColor: `${Colors.primary}25`,
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

  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    ...Shadows.level4,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
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

  // ── Nutrient watchlist step ────────────────────────────────────────────────
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
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 8,
    padding: 12,
    gap: 8,
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
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}30`,
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
    color: `${Colors.primary}50`,
  },
  segmentTextActive: {
    color: '#fff',
  },
  segmentTextNoneActive: {
    color: Colors.primary,
  },

  skipBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Figtree_400Regular',
    fontWeight: '400',
    color: Colors.secondary,
    letterSpacing: -0.15,
    textDecorationLine: 'underline',
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
