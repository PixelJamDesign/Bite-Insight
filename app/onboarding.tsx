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
  Modal,
  Pressable,
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
import {
  HEALTH_CONDITION_KEYS, ALLERGY_KEYS, DIETARY_PREFERENCE_KEYS,
  HEALTH_CONDITION_LEGACY_MAP,
} from '@/constants/profileOptions';
import type { NutrientWatchlistEntry } from '@/lib/types';
import Logo from '../assets/images/logo.svg';

// ── Step types ────────────────────────────────────────────────────────────────
type StepKey = 'health' | 'nutrients' | 'allergies' | 'dietary';

// ── Condition key helpers ──────────────────────────────────────────────────
// CONDITION_NUTRIENT_MAP uses legacy English keys ("Diabetes") while the
// onboarding state uses new camelCase keys ("diabetes"). Build a reverse map.
const KEY_TO_LEGACY: Record<string, string> = {};
for (const [legacy, key] of Object.entries(HEALTH_CONDITION_LEGACY_MAP)) {
  KEY_TO_LEGACY[key] = legacy;
}
function conditionMapKey(conditionKey: string): string {
  return KEY_TO_LEGACY[conditionKey] ?? conditionKey;
}

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

/** Build per-condition nutrient groups for the grouped card layout */
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

  const conditionGroups = useMemo(
    () => buildConditionGroups(healthConditions),
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

  // ── Nutrient dropdown ────────────────────────────────────────────────────
  type NutrientDir = 'limit' | 'boost' | 'none';

  const DROPDOWN_CONFIG: Record<NutrientDir, { label: string; bg: string; iconColor: string }> = {
    none:  { label: tc('nutrientDirections.balance'),  bg: '#aad4cd', iconColor: Colors.primary },
    boost: { label: tc('nutrientDirections.increase'), bg: '#009a1f', iconColor: '#fff' },
    limit: { label: tc('nutrientDirections.limit'),    bg: Colors.status.negative, iconColor: '#fff' },
  };

  function renderDropdownIcon(dir: NutrientDir) {
    if (dir === 'none') {
      // Equals sign (two horizontal bars)
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
        {/* Header text */}
        <View style={styles.nutrientHeader}>
          <Text style={styles.cardTitle}>
            {t('nutrient.conditionTitle')}
          </Text>
          <Text style={styles.nutrientSubtitle}>
            {t('nutrient.conditionSubtitle')}
          </Text>
        </View>

        {/* Per-condition groups */}
        {conditionGroups.map((group) => (
          <View key={group.conditionKey} style={styles.conditionSection}>
            {/* Pill tag */}
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
        <View style={currentStepKey === 'nutrients' ? styles.nutrientCard : styles.card}>
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

  // ── Nutrient watchlist step (redesigned) ──────────────────────────────────
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
    shadowColor: 'rgba(86,138,130,0.1)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 2,
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
  nutrientRowBorder: {
    // visual separator via gap; no actual border needed between rows
  },
  nutrientName: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  // ── Dropdown ──
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
