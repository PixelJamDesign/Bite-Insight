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
  UIManager,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import LogoFull from '../../assets/images/logo-full.svg';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricLabel,
  enableBiometric,
  authenticateAndGetCredentials,
} from '@/lib/biometrics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EASE_TRANSITION = {
  duration: 300,
  create: { type: 'easeInEaseOut', property: 'opacity' },
  delete: { type: 'easeInEaseOut', property: 'opacity' },
  update: { type: 'easeInEaseOut' },
} as const;

const PLACEHOLDER = `${Colors.primary}80`;

export default function LoginScreen() {
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

  const nameOpacity    = useRef(new Animated.Value(0)).current;
  const nameTranslateY = useRef(new Animated.Value(-20)).current;

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
      setErrorMsg('Biometric sign-in failed. Please sign in with your password.');
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
      `Enable ${label}?`,
      `Sign in faster next time using ${label}.`,
      [
        { text: 'Not Now', style: 'cancel' },
        {
          text: 'Enable',
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
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      if (error.message === 'Invalid login credentials') {
        setErrorMsg('Incorrect email or password. Please try again.');
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
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || password.length < 8) {
      setErrorMsg('Please meet all password requirements.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('already registered')) {
        setErrorMsg('An account with this email already exists.');
        setShowSignInNudge(true);
      } else {
        setErrorMsg(error.message);
      }
      return;
    }

    if (data.session === null) {
      Alert.alert('Check your email', 'We sent a confirmation link. Verify your email to continue.');
      return;
    }
    router.push('/onboarding');
  }

  async function handleForgotPassword() {
    setErrorMsg('');
    const trimmed = email.trim();
    if (!trimmed) { setErrorMsg('Please enter your email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) { setErrorMsg('Please enter a valid email address.'); return; }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
    setLoading(false);
    if (error) { setErrorMsg(error.message); return; }

    LayoutAnimation.configureNext(EASE_TRANSITION);
    setResetSent(true);
  }

  const isSignUp = mode === 'signup';
  const isForgot = mode === 'forgot';

  const actionLabel = isForgot
    ? (resetSent ? 'Back to Sign In' : 'Send Reset Link')
    : isSignUp ? 'Create Account' : 'Sign in';

  const actionHandler = isForgot
    ? (resetSent ? switchToLogin : handleForgotPassword)
    : isSignUp ? handleSignUp : handleLogin;

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
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {isForgot ? 'Reset Password' : isSignUp ? 'Create Account' : 'Hello there!'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isForgot
                  ? 'Enter your email and we\'ll send you a reset link.'
                  : isSignUp
                    ? 'Start your healthy journey today.'
                    : 'Enter your details to sign in.'}
              </Text>
            </View>

            {isForgot && resetSent ? (
              <View style={styles.successCard}>
                <View style={styles.successIconRow}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.status.positive} />
                  <Text style={styles.successTitle}>Check your inbox</Text>
                </View>
                <Text style={styles.successBody}>
                  We've sent a password reset link to{' '}
                  <Text style={styles.successEmail}>{email.trim()}</Text>.
                  {'\n'}Check your spam folder if you don't see it.
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
                      placeholder="Full name"
                      placeholderTextColor={PLACEHOLDER}
                      autoCapitalize="words"
                      value={fullName}
                      onChangeText={(v) => { setFullName(v); clearError(); }}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                    />
                  </View>
                </Animated.View>
              )}

              <View style={[styles.inputWrapper, emailFocused && styles.inputFocused]}>
                <View style={styles.inputIcon}>
                  <Ionicons name="mail-outline" size={22} color={Colors.primary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={PLACEHOLDER}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={(v) => { setEmail(v); clearError(); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={isForgot ? () => setEmailFocused(false) : checkEmailOnBlur}
                />
              </View>

              {!isForgot && (
              <View style={styles.passwordBlock}>
                <View style={[styles.inputWrapper, passwordFocused && styles.inputFocused]}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={PLACEHOLDER}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError(); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
                {isSignUp && passwordFocused && (() => {
                  const rules = [
                    { label: 'At least ', bold: 'one letter', met: /[a-zA-Z]/.test(password) },
                    { label: 'At least ', bold: 'one capital letter', met: /[A-Z]/.test(password) },
                    { label: 'At least ', bold: 'one number', met: /\d/.test(password) },
                    { label: 'Be at least ', bold: '8 characters', met: password.length >= 8 },
                  ];
                  return (
                    <View style={styles.pwRules}>
                      <Text style={styles.pwRulesTitle}>Password must meet the following requirements:</Text>
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
                    <Text style={styles.forgotText}>Forgotten password?</Text>
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
                  <Text style={styles.errorBadgeText}>Error</Text>
                </View>
                <Text style={styles.errorText}>{errorMsg}</Text>
                {showSignUpNudge && (
                  <TouchableOpacity activeOpacity={0.7} onPress={switchToSignUp}>
                    <Text style={styles.errorLink}>Don't have an account? Sign Up</Text>
                  </TouchableOpacity>
                )}
                {showSignInNudge && (
                  <TouchableOpacity activeOpacity={0.7} onPress={switchToLogin}>
                    <Text style={styles.errorLink}>Already have an account? Sign In</Text>
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
                <Ionicons
                  name={biometricLabel.includes('Face') ? 'scan-outline' : 'finger-print-outline'}
                  size={22}
                  color={Colors.secondary}
                />
                <Text style={styles.biometricText}>Sign in with {biometricLabel}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.signUpRow}>
            {mode === 'login' ? (
              <>
                <Text style={styles.signUpPrompt}>Don't have an account? </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={switchToSignUp}>
                  <Text style={styles.signUpLink}>Sign Up for Free</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.signUpPrompt}>
                  {isForgot ? 'Remember your password? ' : 'Already have an account? '}
                </Text>
                <TouchableOpacity activeOpacity={0.7} onPress={switchToLogin}>
                  <Text style={styles.signUpLink}>Sign In</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
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
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.26,
    lineHeight: 18,
    marginBottom: 2,
  },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwRuleText: {
    fontSize: 13,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    letterSpacing: -0.26,
    lineHeight: 18,
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
