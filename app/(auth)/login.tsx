import { useState, useRef, useEffect } from 'react';
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
  LayoutAnimation,
  Animated,
  Easing,
  Image,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MenuFaceIdIcon } from '@/components/MenuIcons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import LogoFull from '../../assets/images/logo-full.svg';
import TaglineSvg from '../../assets/images/tagline.svg';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricLabel,
  enableBiometric,
  authenticateAndGetCredentials,
} from '@/lib/biometrics';


const EASE_TRANSITION = {
  duration: 300,
  create: { type: 'easeInEaseOut', property: 'opacity' },
  delete: { type: 'easeInEaseOut', property: 'opacity' },
  update: { type: 'easeInEaseOut' },
} as const;

const PLACEHOLDER = `${Colors.primary}80`;

export default function LoginScreen() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation('common');
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errorMsg, setErrorMsg]             = useState('');
  const [showSignUpNudge, setShowSignUpNudge] = useState(false);
  const [showSignInNudge, setShowSignInNudge] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [fullName, setFullName] = useState('');

  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('');

  const lastCheckedEmail = useRef('');
  const [nameFocused, setNameFocused]         = useState(false);
  const [emailFocused, setEmailFocused]       = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordRef = useRef<TextInput>(null);

  const nameOpacity    = useRef(new Animated.Value(0)).current;
  const nameTranslateY = useRef(new Animated.Value(-20)).current;

  const { width } = useWindowDimensions();
  const isDesktopWeb = Platform.OS === 'web' && width >= 1024;

  // Check biometric availability on mount
  useEffect(() => {
    (async () => {
      const avail = await isBiometricAvailable();
      if (!avail) return;
      const enabled = await isBiometricEnabled();
      if (!enabled) return;
      const label = await getBiometricLabel();
      setBiometricReady(true);
      setBiometricLabel(label);
    })();
  }, []);

  async function handleBiometricLogin() {
    const result = await authenticateAndGetCredentials();
    if (!result.success) return;
    setEmail(result.email);
    setPassword(result.password);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: result.email,
      password: result.password,
    });
    setLoading(false);
    if (error) {
      setErrorMsg(t('login.error.biometricFailed'));
    }
  }

  /** After a successful email/password login, offer to enable biometric if available. */
  async function promptBiometricOptIn(loginEmail: string, loginPassword: string) {
    const avail = await isBiometricAvailable();
    if (!avail) return;
    const alreadyEnabled = await isBiometricEnabled();
    if (alreadyEnabled) return;
    const label = await getBiometricLabel();
    Alert.alert(
      t('login.alert.enableBiometricTitle', { label }),
      t('login.alert.enableBiometricBody', { label }),
      [
        { text: t('login.alert.enableBiometricCancel'), style: 'cancel' },
        {
          text: t('login.alert.enableBiometricConfirm'),
          onPress: async () => {
            await enableBiometric(loginEmail, loginPassword);
          },
        },
      ],
    );
  }

  function clearError() {
    if (errorMsg) {
      setErrorMsg('');
      setShowSignUpNudge(false);
      setShowSignInNudge(false);
    }
  }

  // ── Mode transitions ───────────────────────────────────────────────────────

  function switchToSignUp() {
    clearError();
    LayoutAnimation.configureNext({
      duration: 340,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.9 },
    });
    setMode('signup');

    const expOut = Easing.bezier(0.16, 1, 0.3, 1);
    Animated.parallel([
      Animated.timing(nameOpacity, {
        toValue: 1, duration: 400, delay: 120, easing: expOut, useNativeDriver: true,
      }),
      Animated.timing(nameTranslateY, {
        toValue: 0, duration: 440, delay: 120, easing: expOut, useNativeDriver: true,
      }),
    ]).start();
  }

  function switchToLogin() {
    clearError();
    setResetSent(false);

    const finish = () => {
      LayoutAnimation.configureNext(EASE_TRANSITION);
      setMode('login');
      lastCheckedEmail.current = '';
    };

    if (mode === 'signup') {
      const easeIn = Easing.in(Easing.quad);
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 0, duration: 200, easing: easeIn, useNativeDriver: true,
        }),
        Animated.timing(nameTranslateY, {
          toValue: -20, duration: 220, easing: easeIn, useNativeDriver: true,
        }),
      ]).start(finish);
    } else {
      finish();
    }
  }

  function switchToForgot() {
    clearError();
    setResetSent(false);
    LayoutAnimation.configureNext(EASE_TRANSITION);
    setMode('forgot');
  }

  // ── Live email check ───────────────────────────────────────────────────────

  async function checkEmailOnBlur() {
    setEmailFocused(false);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || trimmed === lastCheckedEmail.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;

    lastCheckedEmail.current = trimmed;

    try {
      const { data, error } = await supabase.rpc('check_email_exists', {
        lookup_email: trimmed,
      });
      if (error) return;
      if (mode === 'login' && data === false) switchToSignUp();
      else if (mode === 'signup' && data === true) switchToLogin();
    } catch {
      // Network issue — login flow handles errors
    }
  }

  // ── Auth handlers ──────────────────────────────────────────────────────────

  async function handleLogin() {
    setErrorMsg('');
    setShowSignUpNudge(false);
    setShowSignInNudge(false);

    if (!email || !password) {
      setErrorMsg(t('login.error.emptyFields'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErrorMsg(t('login.error.invalidCredentials'));
        setShowSignUpNudge(true);
      } else {
        setErrorMsg(error.message);
      }
    } else {
      promptBiometricOptIn(email, password);
    }
  }

  async function handleSignUp() {
    setErrorMsg('');
    setShowSignUpNudge(false);
    setShowSignInNudge(false);

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMsg(t('signup.error.emptyFields'));
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || password.length < 8) {
      setErrorMsg(t('signup.error.passwordRequirements'));
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, display_name: fullName.trim().split(' ')[0] },
        emailRedirectTo: 'biteinsight://verify',
      },
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setErrorMsg(t('signup.error.emailAlreadyExists'));
        setShowSignInNudge(true);
      } else {
        setErrorMsg(error.message);
      }
      return;
    }

    if (data.session === null) {
      Alert.alert(t('signup.alert.checkEmailTitle'), t('signup.alert.checkEmailBody'));
      return;
    }
    // Session exists (email verification not required) — AuthGuard + JourneyGuard
    // will automatically redirect the user to the correct journey step.
  }

  async function handleForgotPassword() {
    setErrorMsg('');
    const trimmed = email.trim();
    if (!trimmed) { setErrorMsg(t('forgotPassword.error.emptyEmail')); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setErrorMsg(t('forgotPassword.error.invalidEmail')); return; }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: 'biteinsight://reset-password',
    });
    setLoading(false);
    if (error) { setErrorMsg(error.message); return; }

    LayoutAnimation.configureNext(EASE_TRANSITION);
    setResetSent(true);
  }

  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  const actionLabel = isForgot
    ? (resetSent ? t('forgotPassword.backToSignIn') : t('forgotPassword.sendResetLink'))
    : isSignUp ? t('signup.createAccountButton') : t('login.signInButton');

  const actionHandler = isForgot
    ? (resetSent ? switchToLogin : handleForgotPassword)
    : isSignUp ? handleSignUp : handleLogin;

  // ── Shared card content (used by both mobile and desktop layouts) ───────────

  const cardContent = (
    <>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>
          {isForgot ? t('forgotPassword.title') : isSignUp ? t('signup.title') : t('login.title')}
        </Text>
        <Text style={styles.cardSubtitle}>
          {isForgot
            ? t('forgotPassword.subtitle')
            : isSignUp
              ? t('signup.subtitle')
              : t('login.subtitle')}
        </Text>
      </View>

      {isForgot && resetSent ? (
        <View style={styles.successCard}>
          <View style={styles.successIconRow}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.status.positive} />
            <Text style={styles.successTitle}>{t('forgotPassword.success.title')}</Text>
          </View>
          <Text style={styles.successBody}>
            {t('forgotPassword.success.bodyPrefix')}
            <Text style={styles.successEmail}>{email.trim()}</Text>.
            {'\n'}{t('forgotPassword.success.bodySpam')}
          </Text>
        </View>
      ) : (
        <View style={styles.fields}>
          {isSignUp && (
            <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameTranslateY }] }}>
              <View style={[styles.inputWrapper, nameFocused && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="person-outline" size={22} color={Colors.primary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={tc('placeholder.fullName')}
                  placeholderTextColor={PLACEHOLDER}
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={(v) => { setFullName(v); clearError(); }}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />
                {fullName.length > 0 && (
                  <TouchableOpacity onPress={() => { setFullName(''); clearError(); }} hitSlop={8} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

          <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
            <View style={styles.inputIcon}>
              <Ionicons name="mail-outline" size={22} color={Colors.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder={tc('placeholder.emailAddress')}
              placeholderTextColor={PLACEHOLDER}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError(); }}
              onFocus={() => setEmailFocused(true)}
              onBlur={isForgot ? () => setEmailFocused(false) : checkEmailOnBlur}
              returnKeyType={isForgot ? 'go' : 'next'}
              onSubmitEditing={() => {
                if (isForgot) { handleForgotPassword(); }
                else { passwordRef.current?.focus(); }
              }}
            />
            {email.length > 0 && (
              <TouchableOpacity onPress={() => { setEmail(''); clearError(); }} hitSlop={8} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
          </View>

          {!isForgot && (
            <View style={styles.passwordBlock}>
              <View style={[styles.inputWrapper, passwordFocused && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
                </View>
                <TextInput
                  ref={passwordRef}
                  style={styles.input}
                  placeholder={tc('placeholder.password')}
                  placeholderTextColor={PLACEHOLDER}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(v) => { setPassword(v); clearError(); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  returnKeyType="go"
                  onSubmitEditing={actionHandler}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              {isSignUp && passwordFocused && (() => {
                const rules = [
                  { label: t('signup.passwordRulePrefix.atLeast'), bold: t('signup.passwordRule.oneLetter'), met: /[a-zA-Z]/.test(password) },
                  { label: t('signup.passwordRulePrefix.atLeast'), bold: t('signup.passwordRule.oneCapital'), met: /[A-Z]/.test(password) },
                  { label: t('signup.passwordRulePrefix.atLeast'), bold: t('signup.passwordRule.oneNumber'), met: /\d/.test(password) },
                  { label: t('signup.passwordRulePrefix.beAtLeast'), bold: t('signup.passwordRule.minLength'), met: password.length >= 8 },
                ];
                return (
                  <View style={styles.pwRules}>
                    <Text style={styles.pwRulesTitle}>{t('signup.passwordRulesTitle')}</Text>
                    {rules.map((r) => (
                      <View key={r.bold} style={styles.pwRuleRow}>
                        <Ionicons
                          name={r.met ? 'checkmark' : 'close'}
                          size={18}
                          color={r.met ? Colors.status.positive : Colors.status.negative}
                        />
                        <Text style={[styles.pwRuleText, { color: r.met ? Colors.status.positive : Colors.status.negative }]}>
                          {r.label}<Text style={styles.pwRuleBold}>{r.bold}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                );
              })()}
              {mode === 'login' && (
                <TouchableOpacity style={styles.forgotWrapper} activeOpacity={0.7} onPress={switchToForgot}>
                  <Text style={styles.forgotText}>{t('login.forgotPasswordLink')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {!!errorMsg && (
        <View style={styles.errorCard}>
          <View style={styles.errorBadge}>
            <Ionicons name="warning" size={11} color="#fff" />
            <Text style={styles.errorBadgeText}>{tc('error.badge')}</Text>
          </View>
          <Text style={styles.errorText}>{errorMsg}</Text>
          {showSignUpNudge && (
            <TouchableOpacity activeOpacity={0.7} onPress={switchToSignUp}>
              <Text style={styles.errorLink}>{t('signUpNudge')}</Text>
            </TouchableOpacity>
          )}
          {showSignInNudge && (
            <TouchableOpacity activeOpacity={0.7} onPress={switchToLogin}>
              <Text style={styles.errorLink}>{t('signInNudge')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.signInBtn}
        onPress={actionHandler}
        disabled={loading}
        activeOpacity={0.88}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.signInText}>{actionLabel}</Text>
        )}
      </TouchableOpacity>

      {biometricReady && mode === 'login' && !loading && (
        <TouchableOpacity
          style={styles.biometricBtn}
          onPress={handleBiometricLogin}
          activeOpacity={0.7}
        >
          {biometricLabel.includes('Face')
            ? <MenuFaceIdIcon color={Colors.secondary} size={22} />
            : <Ionicons name="finger-print-outline" size={22} color={Colors.secondary} />
          }
          <Text style={styles.biometricText}>{t('login.biometricSignIn', { label: biometricLabel })}</Text>
        </TouchableOpacity>
      )}
    </>
  );

  const signUpRow = (
    <View style={styles.signUpRow}>
      {mode === 'login' ? (
        <>
          <Text style={styles.signUpPrompt}>{t('login.noAccount')}</Text>
          <TouchableOpacity activeOpacity={0.7} onPress={switchToSignUp}>
            <Text style={styles.signUpLink}>{t('login.signUpFree')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.signUpPrompt}>
            {isForgot ? t('forgotPassword.rememberPassword') : t('signup.hasAccount')}
          </Text>
          <TouchableOpacity activeOpacity={0.7} onPress={switchToLogin}>
            <Text style={styles.signUpLink}>{tc('link.signIn')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  // ── Desktop two-column layout ────────────────────────────────────────────────

  if (isDesktopWeb) {
    const nutriColors: Record<string, string> = {
      A: '#009a1f', B: '#b8d828', C: '#ffc72d', D: '#ff8736', E: '#ff3f42',
    };
    return (
      <View style={desktopStyles.container}>

        {/* Left panel — lifestyle photo with decorative floating cards */}
        <ImageBackground
          source={require('@/assets/images/login-bg.jpg')}
          style={desktopStyles.leftPanel}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          imageStyle={{ objectPosition: '38% 70%' } as any}
          resizeMode="cover"
        >

          {/* Walkers product card */}
          <View style={[desktopStyles.floatingCard, desktopStyles.productCard]}>
            <Text style={desktopStyles.dkBrand}>{t('demoCard.brand')}</Text>
            <View style={desktopStyles.dkProductRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={desktopStyles.dkProductName}>{t('demoCard.productName')}</Text>
                <Text style={desktopStyles.dkWeight}>{t('demoCard.weight')}</Text>
              </View>
            </View>
            <View style={desktopStyles.dkNutriRow}>
              <Text style={desktopStyles.dkNutriLabel}>{t('demoCard.nutriScoreLabel')}</Text>
              <View style={desktopStyles.dkNutriBadgePoor}>
                <Text style={desktopStyles.dkNutriBadgeText}>{t('demoCard.nutriScoreBadge')}</Text>
              </View>
              <View style={desktopStyles.dkNutriCircles}>
                {(['A', 'B', 'C', 'D', 'E'] as const).map((g) => (
                  <View
                    key={g}
                    style={[
                      desktopStyles.dkNutriCircle,
                      { backgroundColor: nutriColors[g] },
                      g !== 'D' && { opacity: 0.1 },
                    ]}
                  >
                    <Text style={desktopStyles.dkNutriGrade}>{g}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Glycemic impact card */}
          <View style={[desktopStyles.floatingCard, desktopStyles.impactCard]}>
            <Ionicons name="happy-outline" size={26} color={Colors.secondary} style={{ alignSelf: 'center' }} />
            <Text style={desktopStyles.dkImpactTitle}>{t('demoCard.glycemicImpactTitle')}</Text>
            <View style={desktopStyles.dkImpactBadge}>
              <Text style={desktopStyles.dkImpactBadgeText}>{t('demoCard.glycemicImpactBadge')}</Text>
            </View>
          </View>

          {/* Harmful ingredient card */}
          <View style={[desktopStyles.floatingCard, desktopStyles.ingredientCard]}>
            <View style={desktopStyles.dkIngredientHeader}>
              <Text style={desktopStyles.dkIngredientCount}>{t('demoCard.ingredientCount')}</Text>
              <Text style={desktopStyles.dkIngredientText}>{t('demoCard.isConsidered')}</Text>
              <Text style={desktopStyles.dkIngredientHarmful}>{t('demoCard.harmful')}</Text>
            </View>
            <View style={desktopStyles.dkIngredientRow}>
              <Ionicons name="close-circle" size={13} color={Colors.status.negative} />
              <Text style={desktopStyles.dkIngredientName}>{t('demoCard.ingredientName')}</Text>
              <Ionicons name="information-circle-outline" size={13} color={Colors.secondary} />
            </View>
          </View>
        </ImageBackground>

        {/* Right panel — login form */}
        <ScrollView
          style={desktopStyles.rightPanel}
          contentContainerStyle={desktopStyles.rightScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={desktopStyles.dkLogoArea}>
            <LogoFull width={220} height={57} />
            <TaglineSvg width={178} height={12} />
          </View>
          <View style={desktopStyles.loginCard}>
            {cardContent}
          </View>
          {signUpRow}
        </ScrollView>
      </View>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoArea}>
            <LogoFull width={220} height={57} />
          </View>

          <View style={styles.card}>
            {cardContent}
          </View>

          {signUpRow}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 32,
  },
  logoArea: { alignItems: 'center', gap: 6 },
  card: {
    width: '100%',
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    padding: 24,
    gap: 24,
  },
  cardHeader: { gap: 4 },
  cardTitle: {
    fontSize: 24,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  cardSubtitle: {
    fontSize: 18,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  fields: { gap: 16 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  inputFocused: { borderColor: Colors.secondary, borderWidth: 1.5 },
  inputIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
  },
  passwordBlock: { gap: 8 },
  pwRules: { gap: 6 },
  pwRulesTitle: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.14,
    lineHeight: 21,
    marginBottom: 2,
  },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwRuleText: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  pwRuleBold: { fontFamily: 'Figtree_700Bold', fontWeight: '700' },
  forgotWrapper: { alignSelf: 'flex-end' },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  signInBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0,
    lineHeight: 20,
  },
  signUpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  signUpPrompt: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: 'rgba(0,52,44,0.7)',
    lineHeight: 21,
    letterSpacing: -0.15,
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    lineHeight: 21,
    letterSpacing: -0.15,
  },
  successCard: {
    backgroundColor: `${Colors.status.positive}12`,
    borderWidth: 1.5,
    borderColor: Colors.status.positive,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  successIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successTitle: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  successBody: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    letterSpacing: -0.14,
    lineHeight: 20,
  },
  successEmail: { fontFamily: 'Figtree_700Bold', fontWeight: '700' },
  errorCard: {
    backgroundColor: 'rgba(255,63,66,0.08)',
    borderWidth: 2,
    borderColor: '#ff3f42',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff3f42',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  errorBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 18,
  },
  errorLink: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
    lineHeight: 20,
    marginTop: 4,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
  },
  biometricText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 0,
    lineHeight: 20,
  },
});

const desktopStyles = StyleSheet.create({
  // ── Outer containers ─────────────────────────────────────────────────────────
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.background,
  },
  leftPanel: {
    flex: 1,
    overflow: 'hidden',
  },
  rightPanel: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  rightScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 32,
  },
  dkLogoArea: {
    alignItems: 'center',
    gap: 8,
  },
  loginCard: {
    width: 500,
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    padding: 24,
    gap: 24,
  },

  // ── Decorative floating cards ─────────────────────────────────────────────────
  floatingCard: {
    position: 'absolute',
    backgroundColor: Colors.surface.secondary,
    borderRadius: 10,
  },
  productCard: {
    left: '38%',
    top: '50%',
    width: 185,
    padding: 12,
    gap: 6,
  },
  impactCard: {
    left: '72%',
    top: '47%',
    width: 98,
    padding: 10,
    gap: 6,
    alignItems: 'center',
  },
  ingredientCard: {
    left: '36%',
    top: '69%',
    width: 190,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },

  // ── Product card internals ────────────────────────────────────────────────────
  dkBrand: {
    fontSize: 9,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
  },
  dkProductRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dkProductName: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 17,
  },
  dkWeight: {
    fontSize: 9,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    marginTop: 2,
  },
  dkNutriRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dkNutriLabel: {
    fontSize: 8,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.16,
    flex: 1,
  },
  dkNutriBadgePoor: {
    backgroundColor: '#ff8736',
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  dkNutriBadgeText: {
    fontSize: 8,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.16,
  },
  dkNutriCircles: {
    flexDirection: 'row',
    gap: 2,
  },
  dkNutriCircle: {
    width: 14,
    height: 17,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dkNutriGrade: {
    fontSize: 8,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
  },

  // ── Impact card internals ─────────────────────────────────────────────────────
  dkImpactTitle: {
    fontSize: 10,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  dkImpactBadge: {
    backgroundColor: '#009a1f',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'center',
  },
  dkImpactBadgeText: {
    fontSize: 10,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },

  // ── Ingredient card internals ─────────────────────────────────────────────────
  dkIngredientHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  dkIngredientCount: {
    fontSize: 11,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.22,
  },
  dkIngredientText: {
    fontSize: 11,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
  },
  dkIngredientHarmful: {
    fontSize: 11,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.status.negative,
    letterSpacing: -0.22,
  },
  dkIngredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dkIngredientName: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.2,
  },
});
