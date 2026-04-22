import { useEffect, useRef, useState } from 'react';
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
  Modal,
  type LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FooterButtonRow } from '@/components/FooterButtonRow';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { supabase, uploadAvatar } from '@/lib/supabase';
import { Colors, Shadows } from '@/constants/theme';
import { HEALTH_CONDITION_KEYS, ALLERGY_KEYS, DIETARY_PREFERENCE_KEYS } from '@/constants/profileOptions';
import { CameraIcon, PersonalIcon, EmailIcon, BirthdayIcon, TickIcon, InfoIcon } from '@/components/MenuIcons';
import { DoneAccessory } from '@/components/DoneAccessory';
import { ConditionInfoSheet } from '@/components/ConditionInfoSheet';
import { SuggestionSheet, type SuggestionCategory } from '@/components/SuggestionSheet';
import { CONDITION_INFO } from '@/constants/conditionInfo';
import { DobPicker } from '@/components/DobPicker';
import { formatDob, toLocalDateString } from '@/lib/dateOfBirth';
import Logo from '../../assets/images/logo.svg';

// ── Step keys ────────────────────────────────────────────────────────────────
type StepKey = 'aboutYou' | 'health' | 'allergies' | 'dietary';

const STEP_SEQUENCE: StepKey[] = ['aboutYou', 'health', 'allergies', 'dietary'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.trim().split(/\s+/).map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

function toggle(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { t: ta } = useTranslation('auth');
  const { t: to } = useTranslation('onboarding');
  const { t: tpo } = useTranslation('profileOptions');
  const { t: tc } = useTranslation('common');

  const [step, setStep] = useState(1);

  // Step 1 – About you
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Step 2 – Health Conditions
  const [healthConditions, setHealthConditions] = useState<string[]>([]);

  // Step 3 – Allergies
  const [allergies, setAllergies] = useState<string[]>([]);

  // Step 4 – Dietary Preferences
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>([]);

  // Chip search
  const [chipSearch, setChipSearch]           = useState('');
  const [chipSearchActive, setChipSearchActive] = useState(false);
  const [infoKey, setInfoKey] = useState<string | null>(null);
  const [suggestionCategory, setSuggestionCategory] = useState<SuggestionCategory | null>(null);
  const chipSearchRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollContainerRef = useRef<View>(null);
  const nameRowRef = useRef<View>(null);
  const emailRowRef = useRef<View>(null);
  const passwordRowRef = useRef<View>(null);
  const dobRowRef = useRef<View>(null);
  const keyboardHeightRef = useRef(0);
  const scrollViewHeightRef = useRef(0);

  // Focus tracking
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const [loading, setLoading] = useState(false);

  // Step progress animation
  const stepAnim   = useRef(new Animated.Value(1)).current;
  const dotPops    = useRef([0, 1, 2, 3].map(() => new Animated.Value(1))).current;
  const prevStepRef = useRef(1);

  // Reset chip search on step change
  useEffect(() => {
    setChipSearch('');
    setChipSearchActive(false);
  }, [step]);

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
          tension: 400,
          friction: 5,
        }),
        Animated.spring(dotPops[doneIdx], {
          toValue: 1,
          useNativeDriver: true,
          tension: 600,
          friction: 3,
        }),
      ]).start();
    }
  }, [step]);

  // ── Avatar picker ────────────────────────────────────────────────────────────
  function pickAvatar() {
    Alert.alert(ta('signup.alert.profilePhotoTitle'), ta('signup.alert.profilePhotoMessage'), [
      {
        text: ta('signup.alert.takePhoto'),
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(ta('signup.alert.cameraPermissionTitle'), ta('signup.alert.cameraPermissionMessage'));
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
        text: ta('signup.alert.chooseFromLibrary'),
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

  // ── Step navigation ──────────────────────────────────────────────────────────
  function handleNext() {
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        Alert.alert(ta('signup.alert.missingFieldsTitle'), ta('signup.alert.missingFieldsMessage'));
        return;
      }
      if (password.length < 8) {
        Alert.alert(ta('signup.alert.weakPasswordTitle'), ta('signup.alert.weakPasswordMessage'));
        return;
      }
    }
    setStep(s => s + 1);
  }

  function handleBack() {
    if (step === 1) router.back();
    else setStep(s => s - 1);
  }

  // ── Sign-up / Finish ─────────────────────────────────────────────────────────
  async function handleFinish() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: 'biteinsight://verify',
      },
    });
    if (error) {
      setLoading(false);
      Alert.alert(ta('signup.error.signUpFailed'), error.message);
      return;
    }
    const user = data.user;
    if (user) {
      if (avatarUri) await uploadAvatar(user.id, avatarUri);
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        health_conditions: healthConditions,
        allergies,
        dietary_preferences: dietaryPrefs,
        date_of_birth: dateOfBirth ? toLocalDateString(dateOfBirth) : null,
      });
    }
    setLoading(false);
    if (data.session === null) {
      Alert.alert(
        ta('signup.alert.checkEmailTitle'),
        ta('signup.alert.checkEmailFullMessage'),
      );
    }
  }

  // ── Quick Sign-up: create account with just Step 1 data, skip to app ────────
  // Called from steps 2-4 after the user passed Step 1 validation via handleNext.
  async function handleCreateAndSkip() {
    if (!fullName.trim() || !email.trim() || !password.trim()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: 'biteinsight://verify',
      },
    });
    if (error) {
      setLoading(false);
      Alert.alert(ta('signup.error.signUpFailed'), error.message);
      return;
    }
    const user = data.user;
    if (user) {
      if (avatarUri) await uploadAvatar(user.id, avatarUri);
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: fullName,
        date_of_birth: dateOfBirth ? toLocalDateString(dateOfBirth) : null,
      });
    }
    setLoading(false);
    if (data.session === null) {
      Alert.alert(
        ta('signup.alert.checkEmailTitle'),
        ta('signup.alert.checkEmailFullMessage'),
      );
    }
    // AuthGuard will redirect to (tabs) once session is active
  }

  // ── Progress indicator ───────────────────────────────────────────────────────
  function renderProgress() {
    const nextStepKey = step < STEP_SEQUENCE.length ? STEP_SEQUENCE[step] : null;
    const nextLabel = nextStepKey ? to(`step.${nextStepKey}`) : null;
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
                {active && <TickIcon size={12} color="#fff" />}
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

  // ── Render ───────────────────────────────────────────────────────────────────
  const currentStepKey = STEP_SEQUENCE[step - 1];
  const stepTitle = to(`step.${currentStepKey}`);
  const nextStepKeyForBtn = step < STEP_SEQUENCE.length ? STEP_SEQUENCE[step] : null;
  const nextBtnLabel = step === 4
    ? tc('buttons.finish')
    : nextStepKeyForBtn
      ? to('progress.next', { label: to(`step.${nextStepKeyForBtn}`) })
      : '';

  return (
    <>
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
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
          {/* ── Step 1: About you ── */}
          {step === 1 && (
            <>
              <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.85}>
                <View style={styles.avatarCircle}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
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
                  <Text style={styles.cardTitle}>{ta('signup.aboutYouTitle')}</Text>
                  <Text style={styles.cardSubtitle}>{ta('signup.aboutYouSubtitle')}</Text>
                </View>

                <View style={styles.fields}>
                  <View
                    ref={(ref) => { (nameRowRef as any).current = ref; }}
                    style={[styles.inputRow, focusedField === 'name' && styles.inputRowFocused]}
                  >
                    <PersonalIcon size={20} color={Colors.primary} />
                    <TextInput
                      style={[styles.inputFieldInner, fullName ? styles.inputFieldBold : null]}
                      placeholder={tc('placeholder.fullName')}
                      placeholderTextColor={`${Colors.primary}50`}
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
                  <View
                    ref={(ref) => { (emailRowRef as any).current = ref; }}
                    style={[styles.inputRow, focusedField === 'email' && styles.inputRowFocused]}
                  >
                    <EmailIcon size={20} color={Colors.primary} />
                    <TextInput
                      style={[styles.inputFieldInner, email ? styles.inputFieldBold : null]}
                      placeholder={tc('placeholder.emailAddress')}
                      placeholderTextColor={`${Colors.primary}50`}
                      selectionColor={Colors.primary}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => { setFocusedField('email'); scrollInputToCenter(emailRowRef.current); }}
                      onBlur={() => setFocusedField(null)}
                    />
                    {email ? (
                      <TouchableOpacity onPress={() => setEmail('')} hitSlop={8}>
                        <Ionicons name="close" size={18} color={`${Colors.primary}80`} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <View
                    ref={(ref) => { (passwordRowRef as any).current = ref; }}
                    style={[styles.inputRow, focusedField === 'password' && styles.inputRowFocused]}
                  >
                    <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
                    <TextInput
                      style={[styles.inputFieldInner, password ? styles.inputFieldBold : null]}
                      placeholder={ta('signup.placeholder.password')}
                      placeholderTextColor={`${Colors.primary}50`}
                      selectionColor={Colors.primary}
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => { setFocusedField('password'); scrollInputToCenter(passwordRowRef.current); }}
                      onBlur={() => setFocusedField(null)}
                    />
                    {password ? (
                      <TouchableOpacity onPress={() => setPassword('')} hitSlop={8}>
                        <Ionicons name="close" size={18} color={`${Colors.primary}80`} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    ref={(ref) => { (dobRowRef as any).current = ref; }}
                    style={[styles.inputRow]}
                    activeOpacity={0.7}
                    onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}
                  >
                    <BirthdayIcon size={20} color={Colors.primary} />
                    <Text
                      style={[styles.inputFieldInner, dateOfBirth ? styles.inputFieldBold : { color: `${Colors.primary}50` }]}
                      numberOfLines={1}
                    >
                      {dateOfBirth ? formatDob(toLocalDateString(dateOfBirth)) : ta('signup.placeholder.dateOfBirth')}
                    </Text>
                    {dateOfBirth ? (
                      <TouchableOpacity onPress={() => { setDateOfBirth(null); setShowDatePicker(false); }} hitSlop={8}>
                        <Ionicons name="close" size={18} color={`${Colors.primary}80`} />
                      </TouchableOpacity>
                    ) : null}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.signInRow}>
                <Text style={styles.signInPrompt}>{ta('signup.hasAccount')}</Text>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
                  <Text style={styles.signInLink}>{tc('link.signIn')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 2: Health Conditions ── */}
          {step === 2 && (
            <View style={styles.card}>
              {renderChipHeader(
                to('question.healthCondition'),
                healthConditions.length,
                to('count.condition', { count: healthConditions.length }),
              )}
              {chipSearchActive && null /* spacer handled by card gap */}
              {renderChips(HEALTH_CONDITION_KEYS, 'healthConditions', healthConditions, key =>
                setHealthConditions(prev => toggle(prev, key))
              )}
            </View>
          )}

          {/* ── Step 3: Allergies ── */}
          {step === 3 && (
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

          {/* ── Step 4: Dietary Preferences ── */}
          {step === 4 && (
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

          {/* Quick-start link — shown on steps 2-4 so users can create
              their account without filling health/allergy/dietary prefs */}
          {step >= 2 && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={handleCreateAndSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>{tc('buttons.skip')}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 120 }} />
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
              <FooterButtonRow
                secondaryLabel={step === 1 ? tc('buttons.cancel') : tc('buttons.back')}
                primaryLabel={nextBtnLabel}
                onSecondaryPress={handleBack}
                onPrimaryPress={step === 4 ? handleFinish : handleNext}
                primaryLoading={loading}
                primaryDisabled={loading}
              />
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

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  logoArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
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

  // ── Progress ──
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

  // ── Avatar ──
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

  // ── Card ──
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

  // ── Input rows ──
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
  inputFieldInner: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
  },

  // ── Chip card header ──
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

  // ── Chips ──
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

  // ── Sign-in link ──
  signInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  signInPrompt: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: `${Colors.primary}80`,
    letterSpacing: -0.15,
    lineHeight: 21,
  },
  signInLink: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: -0.15,
    lineHeight: 21,
  },

  // ── Footer ──
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
});

