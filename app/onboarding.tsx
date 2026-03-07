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
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Shadows } from '@/constants/theme';
import { CONDITION_NUTRIENT_MAP } from '@/constants/conditionNutrientMap';
import type { NutrientWatchlistEntry } from '@/lib/types';
import Logo from '../assets/images/logo.svg';

// ── Selection lists ───────────────────────────────────────────────────────────
const HEALTH_CONDITIONS = [
  'ADHD', 'Autism', "Chron's Disease", 'Diabetes', 'Eczema / Psoriasis',
  'GERD / Acid Reflux', 'Heart Disease', 'High Cholesterol', 'Hypertension', 'IBS',
  'Leaky Gut Syndrome', 'Lupus', 'ME / Chronic Fatigue', 'Metabolic Syndrome',
  'Migraine / Chronic Headaches', 'Multiple Sclerosis', 'PCOS', 'Rheumatoid Arthritis',
  'SIBO', 'Ulcerative Colitis',
];

const ALLERGIES = [
  'Celery Allergy', 'Egg Allergy', 'Fish Allergy', 'Fructose Intolerance',
  'Gluten Intolerance', 'Histamine Intolerance', 'Lactose Intolerance',
  'Lupin Allergy', 'MSG Sensitivity', 'Mustard Allergy', 'Peanut Allergy',
  'Salicylate Sensitivity', 'Sesame Allergy', 'Shellfish Allergy',
  'Soy Allergy', 'Sulphite Sensitivity', 'Tree Nut Allergy',
];

const DIETARY_PREFERENCES = [
  'Child-Friendly / Additive-Free', 'Clean Eating', 'Dairy-Free', 'FODMAP Diet',
  'Low-Carb / Keto', 'High-Protein / Fitness', 'Paleo', 'Plant-Based',
  'Post-Bariatric Surgery', 'Pregnancy-safe Diet', 'Sustainable / Eco',
  'Weight Loss', 'Whole30', 'Vegan', 'Vegetarian',
];

// ── Step types ────────────────────────────────────────────────────────────────
type StepKey = 'health' | 'nutrients' | 'allergies' | 'dietary';

const STEP_META: Record<StepKey, { title: string }> = {
  health:    { title: 'Health Conditions' },
  nutrients: { title: 'Nutrient Watchlist' },
  allergies: { title: 'Allergies' },
  dietary:   { title: 'Dietary Preferences' },
};

// ── Nutrient suggestion type ─────────────────────────────────────────────────
type NutrientSuggestion = NutrientWatchlistEntry & {
  userConfirmRequired?: boolean;
};

/** Build de-duped nutrient suggestions from selected health conditions */
function buildNutrientSuggestions(conditions: string[]): NutrientSuggestion[] {
  const suggestions: NutrientSuggestion[] = [];
  const limitSeen = new Set<string>();
  const boostSeen = new Set<string>();
  const limitKeys = new Set<string>();
  const boostKeys = new Set<string>();

  for (const condition of conditions) {
    const profile = CONDITION_NUTRIENT_MAP[condition];
    if (!profile) continue;

    for (const item of profile.limit) {
      if (!limitSeen.has(item.offKey)) {
        limitSeen.add(item.offKey);
        limitKeys.add(item.offKey);
        suggestions.push({
          offKey: item.offKey,
          nutrient: item.nutrient,
          direction: 'limit',
          unit: item.unit,
          source: condition,
          reason: item.reason,
          userConfirmRequired: item.userConfirmRequired,
        });
      }
    }
    for (const item of profile.boost) {
      if (!boostSeen.has(item.offKey)) {
        boostSeen.add(item.offKey);
        boostKeys.add(item.offKey);
        suggestions.push({
          offKey: item.offKey,
          nutrient: item.nutrient,
          direction: 'boost',
          unit: item.unit,
          source: condition,
          reason: item.reason,
          userConfirmRequired: item.userConfirmRequired,
        });
      }
    }
  }

  // Flag conflicts: nutrient in both limit and boost across conditions
  for (const s of suggestions) {
    if (s.direction === 'limit' && boostKeys.has(s.offKey)) s.userConfirmRequired = true;
    if (s.direction === 'boost' && limitKeys.has(s.offKey)) s.userConfirmRequired = true;
  }

  return suggestions;
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
}

export default function OnboardingScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // Onboarding position
  const [pos, setPos] = useState(0);

  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

  // ── Nutrient watchlist ──────────────────────────────────────────────────────
  const [selectedNutrientKeys, setSelectedNutrientKeys] = useState<Set<string>>(new Set());

  const showNutrientStep = healthConditions.length > 0;

  const nutrientSuggestions = useMemo(
    () => buildNutrientSuggestions(healthConditions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [healthConditions.join(',')],
  );

  // Auto-select non-userConfirmRequired nutrients when suggestions change
  useEffect(() => {
    const autoSelected = new Set<string>();
    for (const s of nutrientSuggestions) {
      if (!s.userConfirmRequired) {
        autoSelected.add(`${s.direction}:${s.offKey}`);
      }
    }
    setSelectedNutrientKeys(autoSelected);
  }, [nutrientSuggestions]);

  const limitSuggestions = nutrientSuggestions.filter(s => s.direction === 'limit');
  const boostSuggestions = nutrientSuggestions.filter(s => s.direction === 'boost');

  function toggleNutrient(key: string) {
    setSelectedNutrientKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Build final watchlist entries from selected keys
  function buildFinalWatchlist(): NutrientWatchlistEntry[] {
    return nutrientSuggestions
      .filter(s => selectedNutrientKeys.has(`${s.direction}:${s.offKey}`))
      .map(({ userConfirmRequired: _, ...entry }) => entry);
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

  const stepTitle = STEP_META[currentStepKey].title;
  const nextStepKey = pos < stepSequence.length - 1 ? stepSequence[pos + 1] : null;
  const nextLabel = nextStepKey ? STEP_META[nextStepKey].title : null;

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
        {nextLabel && <Text style={styles.nextLabel}>Next: {nextLabel}</Text>}
      </View>
    );
  }

  // ── Chip card header ─────────────────────────────────────────────────────────
  function renderChipHeader(question: string, count: number, word: string) {
    return (
      <View style={styles.chipCardInfo}>
        <Text style={styles.cardTitle}>{question}</Text>
        <View style={styles.countRow}>
          <Text style={styles.countText}>You've selected </Text>
          <Text style={styles.countBold}>{count} {word}</Text>
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
          <Text style={styles.searchLinkText}>Search</Text>
        </TouchableOpacity>
        {chipSearchActive && (
          <TextInput
            ref={chipSearchRef}
            style={styles.chipSearchInput}
            placeholder="Search..."
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
    items: string[],
    selected: string[],
    onToggle: (item: string) => void,
  ) {
    const filtered = chipSearch.trim()
      ? items.filter(i => i.toLowerCase().includes(chipSearch.toLowerCase()))
      : items;
    return (
      <View style={styles.chipWrap}>
        {filtered.map(item => {
          const active = selected.includes(item);
          return (
            <TouchableOpacity
              key={item}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onToggle(item)}
              activeOpacity={0.75}
            >
              <View style={[styles.chipCheck, active && styles.chipCheckActive]}>
                {active && <Ionicons name="checkmark" size={12} color="#fff" />}
              </View>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // ── Nutrient watchlist step ────────────────────────────────────────────────
  function renderNutrientRow(s: NutrientSuggestion) {
    const key = `${s.direction}:${s.offKey}`;
    const isSelected = selectedNutrientKeys.has(key);
    const isLimit = s.direction === 'limit';
    const accentColor = isLimit ? Colors.status.negative : Colors.status.positive;

    return (
      <TouchableOpacity
        key={key}
        style={[
          styles.nutrientRow,
          isSelected && { borderColor: accentColor, backgroundColor: `${accentColor}08` },
        ]}
        onPress={() => toggleNutrient(key)}
        activeOpacity={0.75}
      >
        <View style={[styles.chipCheck, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}>
          {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
        <View style={styles.nutrientInfo}>
          <View style={styles.nutrientNameRow}>
            <Text style={[styles.nutrientName, isSelected && { color: Colors.primary }]}>
              {s.nutrient}
            </Text>
            {s.userConfirmRequired && (
              <View style={styles.confirmBadge}>
                <Ionicons name="information-circle" size={12} color={Colors.secondary} />
              </View>
            )}
          </View>
          <Text style={styles.nutrientReason} numberOfLines={2}>{s.reason}</Text>
          <View style={styles.nutrientMeta}>
            <View style={[styles.directionBadge, { backgroundColor: `${accentColor}18` }]}>
              <Text style={[styles.directionText, { color: accentColor }]}>
                {isLimit ? 'Limit' : 'Boost'}
              </Text>
            </View>
            <Text style={styles.sourceBadge}>{s.source}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderNutrientStep() {
    const selectedCount = selectedNutrientKeys.size;
    return (
      <>
        <View style={styles.chipCardInfo}>
          <Text style={styles.cardTitle}>
            Based on your conditions, we suggest watching these nutrients
          </Text>
          <View style={styles.countRow}>
            <Text style={styles.countText}>You've selected </Text>
            <Text style={styles.countBold}>
              {selectedCount} nutrient{selectedCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text style={styles.nutrientSubtext}>
            Tap to select or deselect. We'll alert you when scanned products contain these.
          </Text>
        </View>

        {limitSuggestions.length > 0 && (
          <View style={styles.nutrientSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="arrow-down-circle" size={16} color={Colors.status.negative} />
              <Text style={[styles.sectionHeader, { color: Colors.status.negative }]}>
                Nutrients to Limit
              </Text>
            </View>
            {limitSuggestions.map(renderNutrientRow)}
          </View>
        )}

        {boostSuggestions.length > 0 && (
          <View style={styles.nutrientSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="arrow-up-circle" size={16} color={Colors.status.positive} />
              <Text style={[styles.sectionHeader, { color: Colors.status.positive }]}>
                Nutrients to Boost
              </Text>
            </View>
            {boostSuggestions.map(renderNutrientRow)}
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
            'Do you have any health condition?',
            healthConditions.length,
            `condition${healthConditions.length !== 1 ? 's' : ''}`,
          )}
          {currentStepKey === 'allergies' && renderChipHeader(
            'Do you have any allergies?',
            allergies.length,
            `allerg${allergies.length !== 1 ? 'ies' : 'y'}`,
          )}
          {currentStepKey === 'dietary' && renderChipHeader(
            'Do you have any dietary preferences?',
            dietaryPrefs.length,
            `preference${dietaryPrefs.length !== 1 ? 's' : ''}`,
          )}

          {currentStepKey === 'health' && renderChips(HEALTH_CONDITIONS, healthConditions, item =>
            setHealthConditions(prev => toggle(prev, item))
          )}
          {currentStepKey === 'nutrients' && renderNutrientStep()}
          {currentStepKey === 'allergies' && renderChips(ALLERGIES, allergies, item =>
            setAllergies(prev => toggle(prev, item))
          )}
          {currentStepKey === 'dietary' && renderChips(DIETARY_PREFERENCES, dietaryPrefs, item =>
            setDietaryPrefs(prev => toggle(prev, item))
          )}
        </View>

        {/* Skip link — available on every step */}
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => router.replace('/(tabs)/')}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>Skip for now — I'll set this up later</Text>
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
            <Text style={styles.backBtnText}>{pos === 0 ? 'Cancel' : 'Back'}</Text>
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
                {isLastStep ? 'Finish' : `Next: ${nextLabel}`}
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  nutrientInfo: {
    flex: 1,
    gap: 4,
  },
  nutrientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nutrientName: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  confirmBadge: {
    opacity: 0.7,
  },
  nutrientReason: {
    fontSize: 13,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.13,
    lineHeight: 18,
  },
  nutrientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  directionText: {
    fontSize: 12,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    letterSpacing: -0.24,
  },
  sourceBadge: {
    fontSize: 12,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.12,
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
