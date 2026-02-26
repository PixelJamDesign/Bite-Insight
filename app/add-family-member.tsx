import { useEffect, useRef, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase, uploadAvatar, getAvatarUrl } from '@/lib/supabase';
import { useCachedAvatar } from '@/lib/useCachedAvatar';
import { useAuth } from '@/lib/auth';
import { Colors, Shadows } from '@/constants/theme';
import { CameraIcon, PersonalIcon, TickIcon } from '@/components/MenuIcons';
import Logo from '../assets/images/logo.svg';

// ── Step metadata ─────────────────────────────────────────────────────────────
const STEPS = [
  { title: 'About Them',          nextLabel: 'Health Conditions' },
  { title: 'Health Conditions',    nextLabel: 'Allergies' },
  { title: 'Allergies',           nextLabel: 'Dietary Preferences' },
  { title: 'Dietary Preferences', nextLabel: null },
] as const;

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

const RELATIONSHIP_OPTIONS = [
  'Partner', 'Wife', 'Husband', 'Son', 'Daughter',
  'Mother', 'Father', 'Sister', 'Brother', 'Other',
];

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
          setHealthConditions((data.health_conditions as string[]) ?? []);
          setAllergies((data.allergies as string[]) ?? []);
          setDietaryPrefs((data.dietary_preferences as string[]) ?? []);
        }
        setFetched(true);
      });
  }, [params.id]);

  // Step progress animation
  const stepAnim    = useRef(new Animated.Value(1)).current;
  const dotPops     = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;
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
    Alert.alert('Profile Photo', 'Choose an option', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera access is required to take a photo.');
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
        text: 'Choose from Library',
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
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function handleNext() {
    if (step === 1 && !fullName.trim()) {
      Alert.alert('Name required', 'Please enter a name for this family member.');
      return;
    }
    setStep(s => s + 1);
  }

  function handleBack() {
    if (step === 1) router.back();
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
    };

    const { error } = isEditing
      ? await supabase.from('family_profiles').update(payload).eq('id', params.id!)
      : await supabase.from('family_profiles').insert(payload);

    setSaving(false);
    if (error) Alert.alert('Save failed', error.message);
    else router.back();
  }

  // ── Progress indicator ────────────────────────────────────────────────────
  function renderProgress() {
    const { nextLabel } = STEPS[step - 1];
    return (
      <View style={styles.progressRow}>
        <View style={styles.progressDots}>
          {([1, 2, 3, 4] as const).map((s) => {
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
        {nextLabel && <Text style={styles.nextLabel}>Next: {nextLabel}</Text>}
      </View>
    );
  }

  // ── Chip card header ──────────────────────────────────────────────────────
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

  // ── Chip grid ─────────────────────────────────────────────────────────────
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
                {active && <TickIcon size={14} color="#fff" />}
              </View>
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item}</Text>
            </TouchableOpacity>
          );
        })}
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
  const stepInfo = STEPS[step - 1];

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
            <Text style={styles.stepTitle}>{stepInfo.title}</Text>
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
          {/* ── Step 1: About them ── */}
          {step === 1 && (
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
                    {isEditing ? 'Update their details' : 'Tell us about them'}
                  </Text>
                  <Text style={styles.cardSubtitle}>
                    {isEditing
                      ? 'Edit the profile for your family member.'
                      : 'Add details for your family member.'}
                  </Text>
                </View>

                <View style={styles.fields}>
                  <View style={[styles.inputRow, focusedField === 'name' && styles.inputRowFocused]}>
                    <PersonalIcon size={16} color={Colors.primary} />
                    <TextInput
                      style={[styles.inputFieldInner, fullName ? styles.inputFieldBold : null]}
                      placeholder="Full name"
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
                  <Text style={styles.fieldLabel}>Relationship</Text>
                  <View style={styles.relationshipWrap}>
                    {RELATIONSHIP_OPTIONS.map(option => {
                      const active = relationship === option;
                      return (
                        <TouchableOpacity
                          key={option}
                          style={[styles.relationshipChip, active && styles.relationshipChipActive]}
                          onPress={() => setRelationship(active ? '' : option)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.relationshipChipLabel, active && styles.relationshipChipLabelActive]}>
                            {option}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </>
          )}

          {/* ── Step 2: Health Conditions ── */}
          {step === 2 && (
            <View style={styles.card}>
              {renderChipHeader(
                'Do they have any health conditions?',
                healthConditions.length,
                `condition${healthConditions.length !== 1 ? 's' : ''}`,
              )}
              {renderChips(HEALTH_CONDITIONS, healthConditions, item =>
                setHealthConditions(prev => toggle(prev, item))
              )}
            </View>
          )}

          {/* ── Step 3: Allergies ── */}
          {step === 3 && (
            <View style={styles.card}>
              {renderChipHeader(
                'Do they have any allergies?',
                allergies.length,
                `allerg${allergies.length !== 1 ? 'ies' : 'y'}`,
              )}
              {renderChips(ALLERGIES, allergies, item =>
                setAllergies(prev => toggle(prev, item))
              )}
            </View>
          )}

          {/* ── Step 4: Dietary Preferences ── */}
          {step === 4 && (
            <View style={styles.card}>
              {renderChipHeader(
                'Do they have any dietary preferences?',
                dietaryPrefs.length,
                `preference${dietaryPrefs.length !== 1 ? 's' : ''}`,
              )}
              {renderChips(DIETARY_PREFERENCES, dietaryPrefs, item =>
                setDietaryPrefs(prev => toggle(prev, item))
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
              <Text style={styles.backBtnText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.nextBtn}
              onPress={step === 4 ? handleSave : handleNext}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextBtnText} numberOfLines={1} adjustsFontSizeToFit>
                  {step === 4
                    ? (isEditing ? 'Save Changes' : 'Finish')
                    : `Next: ${stepInfo.nextLabel}`}
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
