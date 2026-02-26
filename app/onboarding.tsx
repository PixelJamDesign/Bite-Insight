/**
 * Post-signup onboarding (steps 2–4).
 * Navigated to from the login screen after basic account creation.
 * Lives outside (auth) so the session→tabs redirect doesn't fire.
 */
import { useEffect, useRef, useState } from 'react';
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

// Step metadata — 4 total, we start on step 2 (step 1 done on signup screen)
const STEPS = [
  { title: 'Health Conditions',   nextLabel: 'Allergies' },
  { title: 'Allergies',           nextLabel: 'Dietary Preferences' },
  { title: 'Dietary Preferences', nextLabel: null },
] as const;

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
}

export default function OnboardingScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();

  // Onboarding position: 0 = Health, 1 = Allergies, 2 = Dietary (maps to steps 2/3/4)
  const [pos, setPos] = useState(0);

  const [healthConditions, setHealthConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

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

  // ── Progress indicator (4-step, step 1 pre-done) ─────────────────────────────
  // pos 0 → overall step 2, pos 1 → step 3, pos 2 → step 4
  const overallStep = pos + 2;

  function renderProgress() {
    const { nextLabel } = STEPS[pos];
    return (
      <View style={styles.progressRow}>
        <View style={styles.progressDots}>
          {([1, 2, 3, 4] as const).map((s) => {
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

  // ── Render ────────────────────────────────────────────────────────────────────
  const stepInfo = STEPS[pos];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <Logo width={141} height={36} />
      </View>

      {/* Step header */}
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>{stepInfo.title}</Text>
          <View style={{ opacity: 0.5 }}><InfoIcon width={20} height={20} /></View>
        </View>
        {renderProgress()}
      </View>

      {/* Scrollable chips */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {pos === 0 && renderChipHeader(
            'Do you have any health condition?',
            healthConditions.length,
            `condition${healthConditions.length !== 1 ? 's' : ''}`,
          )}
          {pos === 1 && renderChipHeader(
            'Do you have any allergies?',
            allergies.length,
            `allerg${allergies.length !== 1 ? 'ies' : 'y'}`,
          )}
          {pos === 2 && renderChipHeader(
            'Do you have any dietary preferences?',
            dietaryPrefs.length,
            `preference${dietaryPrefs.length !== 1 ? 's' : ''}`,
          )}

          {pos === 0 && renderChips(HEALTH_CONDITIONS, healthConditions, item =>
            setHealthConditions(prev => toggle(prev, item))
          )}
          {pos === 1 && renderChips(ALLERGIES, allergies, item =>
            setAllergies(prev => toggle(prev, item))
          )}
          {pos === 2 && renderChips(DIETARY_PREFERENCES, dietaryPrefs, item =>
            setDietaryPrefs(prev => toggle(prev, item))
          )}
        </View>

        {/* Skip link */}
        {pos === 0 && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/(tabs)/')}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}

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
            onPress={pos === 2 ? handleFinish : handleNext}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextBtnText} numberOfLines={1} adjustsFontSizeToFit>
                {pos === 2 ? 'Finish' : `Next: ${stepInfo.nextLabel}`}
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

  skipBtn: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: `${Colors.primary}70`,
    letterSpacing: -0.14,
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
