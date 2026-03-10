/**
 * Health disclaimer screen — part of the new customer journey.
 * All 4 checkboxes must be ticked before the user can proceed.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useJourney } from '@/lib/journeyContext';
import { Colors, Shadows } from '@/constants/theme';
import Logo from '../assets/images/logo.svg';

const CHECKS = ['check1', 'check2', 'check3', 'check4'] as const;

// TODO: Replace with real URLs
const TERMS_URL = 'https://biteinsight.app/terms';
const PRIVACY_URL = 'https://biteinsight.app/privacy';

export default function DisclaimerScreen() {
  const { advanceTo } = useJourney();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('journey');

  const [checked, setChecked] = useState<Record<string, boolean>>({
    check1: false,
    check2: false,
    check3: false,
    check4: false,
  });
  const [saving, setSaving] = useState(false);

  const allChecked = CHECKS.every((k) => checked[k]);

  function toggleCheck(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function tickAll() {
    const allCurrentlyChecked = CHECKS.every((k) => checked[k]);
    const newValue = !allCurrentlyChecked;
    setChecked({
      check1: newValue,
      check2: newValue,
      check3: newValue,
      check4: newValue,
    });
  }

  async function handleFinish() {
    if (!allChecked) return;
    setSaving(true);
    try {
      await advanceTo('app_tour');
    } catch {
      Alert.alert('Error', 'Failed to continue. Please try again.');
    }
    setSaving(false);
  }

  function handleBack() {
    // Go back to onboarding (account creation)
    // advanceTo('create_profile') would reset the step — instead just navigate back.
    // JourneyGuard won't interfere because the step is 'disclaimer' and
    // we'll handle this by manually setting step back.
    advanceTo('create_profile').catch(() => {});
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <Logo width={141} height={36} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>{t('disclaimer.header')}</Text>
          <Text style={styles.headerBody}>{t('disclaimer.intro')}</Text>
          <Text style={styles.headerBody}>{t('disclaimer.body')}</Text>
        </View>

        {/* Checkboxes card */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.understandLabel}>{t('disclaimer.understand')}</Text>
            <TouchableOpacity onPress={tickAll} activeOpacity={0.7}>
              <Text style={styles.tickAllLink}>{t('disclaimer.tickAll')}</Text>
            </TouchableOpacity>
          </View>

          {CHECKS.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.checkRow}
              onPress={() => toggleCheck(key)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, checked[key] && styles.checkboxActive]}>
                {checked[key] && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkLabel}>{t(`disclaimer.${key}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Legal text */}
        <Text style={styles.legalText}>
          {'By continuing you agree to our\n'}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL(TERMS_URL)}
          >
            {t('disclaimer.termsOfService')}
          </Text>
          {' and '}
          <Text
            style={styles.legalLink}
            onPress={() => Linking.openURL(PRIVACY_URL)}
          >
            {t('disclaimer.privacyPolicy')}
          </Text>
          {'.'}
        </Text>

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
            <Text style={styles.backBtnText}>{t('disclaimer.back')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.finishBtn, !allChecked && styles.finishBtnDisabled]}
            onPress={handleFinish}
            disabled={!allChecked || saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.finishBtnText}>{t('disclaimer.finish')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

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
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 20,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerSection: {
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  headerBody: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
  },

  // ── Checkboxes card ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    ...Shadows.level4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  understandLabel: {
    fontSize: 18,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  tickAllLink: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: -0.32,
    lineHeight: 20,
  },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    marginTop: 1,
  },
  checkboxActive: {
    backgroundColor: '#3b9586',
    borderColor: '#3b9586',
  },
  checkLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },

  // ── Legal text ──────────────────────────────────────────────────────────────
  legalText: {
    fontSize: 13,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  legalLink: {
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    textDecorationLine: 'underline',
  },

  // ── Footer ──────────────────────────────────────────────────────────────────
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
  finishBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: Colors.secondary,
  },
  finishBtnDisabled: {
    opacity: 0.4,
  },
  finishBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
  },
});
