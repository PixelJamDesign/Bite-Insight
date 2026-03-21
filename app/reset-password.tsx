import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import LogoFull from '../assets/images/logo-full.svg';

const PLACEHOLDER = `${Colors.primary}80`;

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);

  // Check for a valid session on mount — if missing, the deep link token
  // didn't arrive or expired. Show a helpful message instead of letting
  // the user type a password only to hit a wall.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) setSessionMissing(true);
    });
  }, []);

  const rules = [
    { bold: 'one letter',        met: /[a-zA-Z]/.test(password) },
    { bold: 'one capital letter', met: /[A-Z]/.test(password) },
    { bold: 'one number',         met: /\d/.test(password) },
    { bold: '8 characters',       met: password.length >= 8 },
  ];
  const passwordValid = rules.every((r) => r.met);

  async function handleSubmit() {
    setErrorMsg('');
    if (!passwordValid) {
      setErrorMsg('Password does not meet all requirements.');
      return;
    }
    if (password !== confirm) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      // Translate unhelpful Supabase error into user-friendly message
      if (error.message.toLowerCase().includes('session')) {
        setSessionMissing(true);
      } else {
        setErrorMsg(error.message);
      }
      return;
    }

    setDone(true);
    // Sign out so the user logs in fresh with their new password
    await supabase.auth.signOut();
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoArea}>
            <LogoFull width={160} height={40} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>New Password</Text>
              <Text style={styles.cardSubtitle}>Choose a strong password for your account.</Text>
            </View>

            {sessionMissing ? (
              <View style={styles.errorCard}>
                <View style={styles.errorBadge}>
                  <Ionicons name="warning" size={11} color="#fff" />
                  <Text style={styles.errorBadgeText}>Link Expired</Text>
                </View>
                <Text style={styles.errorText}>
                  This password reset link has expired or is no longer valid. Please request a new one from the sign-in screen.
                </Text>
              </View>
            ) : done ? (
              <View style={styles.successCard}>
                <View style={styles.successIconRow}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.status.positive} />
                  <Text style={styles.successTitle}>Password updated</Text>
                </View>
                <Text style={styles.successBody}>
                  Your password has been changed. Sign in with your new password.
                </Text>
              </View>
            ) : (
              <View style={styles.fields}>
                {/* New password */}
                <View style={[styles.inputWrapper, passwordFocused && styles.inputFocused]}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={PLACEHOLDER}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setErrorMsg(''); }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} activeOpacity={0.7}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Password rules */}
                {passwordFocused && (
                  <View style={styles.pwRules}>
                    <Text style={styles.pwRulesTitle}>Password must contain:</Text>
                    {rules.map((r) => (
                      <View key={r.bold} style={styles.pwRuleRow}>
                        <Ionicons
                          name={r.met ? 'checkmark' : 'close'}
                          size={18}
                          color={r.met ? Colors.status.positive : Colors.status.negative}
                        />
                        <Text style={[styles.pwRuleText, { color: r.met ? Colors.status.positive : Colors.status.negative }]}>
                          At least <Text style={styles.pwRuleBold}>{r.bold}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Confirm password */}
                <View style={[styles.inputWrapper, confirmFocused && styles.inputFocused]}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="lock-closed-outline" size={22} color={Colors.primary} />
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={PLACEHOLDER}
                    secureTextEntry={!showConfirm}
                    value={confirm}
                    onChangeText={(v) => { setConfirm(v); setErrorMsg(''); }}
                    onFocus={() => setConfirmFocused(true)}
                    onBlur={() => setConfirmFocused(false)}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} activeOpacity={0.7}>
                    <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={22} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!!errorMsg && (
              <View style={styles.errorCard}>
                <View style={styles.errorBadge}>
                  <Ionicons name="warning" size={11} color="#fff" />
                  <Text style={styles.errorBadgeText}>Error</Text>
                </View>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={(done || sessionMissing) ? () => router.replace('/(auth)/login') : handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>{(done || sessionMissing) ? 'Back to Sign In' : 'Update Password'}</Text>
              )}
            </TouchableOpacity>
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
  logoArea: { alignItems: 'center' },
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
  pwRules: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  pwRulesTitle: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.26,
    marginBottom: 2,
  },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwRuleText: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    letterSpacing: -0.14,
  },
  pwRuleBold: {
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
  },
  successCard: {
    backgroundColor: `${Colors.status.positive}14`,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  successIconRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successTitle: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.status.positive,
    letterSpacing: -0.32,
  },
  successBody: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  errorCard: {
    backgroundColor: `${Colors.status.negative}12`,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.status.negative,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  errorBadgeText: {
    fontSize: 11,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.22,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.status.negative,
    letterSpacing: -0.14,
    lineHeight: 20,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.32,
  },
});
