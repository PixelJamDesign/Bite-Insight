/**
 * Health disclaimer screen — part of the new customer journey.
 * All 4 checkboxes must be ticked before the user can proceed.
 *
 * Figma: node 4362-16760
 */
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Linking,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useJourney } from '@/lib/journeyContext';
import { Colors, Shadows } from '@/constants/theme';
import { TickIcon } from '@/components/MenuIcons';
import Logo from '../assets/images/logo.svg';

const CHECKS = ['check1', 'check2', 'check3', 'check4'] as const;

const TERMS_URL = 'https://biteinsight.co.uk/terms.html';
const PRIVACY_URL = 'https://biteinsight.co.uk/privacy.html';

export default function DisclaimerScreen() {
  const { advanceTo } = useJourney();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('journey');

  // Entrance/exit animation (horizontal slide, matching the journey flow)
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateX = useRef(new Animated.Value(40)).current;
  const isTransitioning = useRef(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1, duration: 800, easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: 0, duration: 800, easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function animateExit(direction: 'forward' | 'backward', onComplete: () => void) {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    const slideTo = direction === 'forward' ? -40 : 40;
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0, duration: 800, easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateX, {
        toValue: slideTo, duration: 800, easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isTransitioning.current = false;
      onComplete();
    });
  }

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
    animateExit('forward', async () => {
      setSaving(true);
      try {
        await advanceTo('app_tour');
      } catch {
        Alert.alert('Error', 'Failed to continue. Please try again.');
      }
      setSaving(false);
    });
  }

  function handleBack() {
    animateExit('backward', () => {
      advanceTo('create_profile').catch(() => {});
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Logo — matches onboarding screen positioning */}
      <View style={styles.logoArea}>
        <Logo width={141} height={36} />
        {/* Fade overlay — content fades as it scrolls behind the logo */}
        <LinearGradient
          colors={[Colors.background, 'rgba(226,241,238,0)']}
          style={styles.logoFade}
          pointerEvents="none"
        />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: contentOpacity, transform: [{ translateX: contentTranslateX }] }}>

          {/* ── Header section (title + intro + body) — gap 16 ── */}
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>{t('disclaimer.header')}</Text>
          <Text style={styles.headerIntro}>{t('disclaimer.intro')}</Text>
          <Text style={styles.headerBody}>{t('disclaimer.body')}</Text>
        </View>

        {/* ── Checkbox section ── */}
        <View style={styles.checkSection}>
          {/* "I understand" + "Tick all" row — outside the cards */}
          <View style={styles.understandRow}>
            <Text style={styles.understandLabel}>{t('disclaimer.understand')}</Text>
            <TouchableOpacity onPress={tickAll} activeOpacity={0.7}>
              <Text style={styles.tickAllLink}>{t('disclaimer.tickAll')}</Text>
            </TouchableOpacity>
          </View>

          {/* Each checkbox in its own card */}
          {CHECKS.map((key) => (
            <TouchableOpacity
              key={key}
              style={styles.checkCard}
              onPress={() => toggleCheck(key)}
              activeOpacity={0.75}
            >
              <View style={[styles.checkbox, checked[key] && styles.checkboxActive]}>
                {checked[key] && <TickIcon size={14} color="#fff" />}
              </View>
              <Text style={styles.checkLabel}>{t(`disclaimer.${key}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Legal section ── */}
        <View style={styles.legalSection}>
          <Text style={styles.legalText}>
            {'By continuing you agree to our\n'}
            <Text style={styles.legalTextBold}>{t('disclaimer.termsOfService')}</Text>
            {' and '}
            <Text style={styles.legalTextBold}>{t('disclaimer.privacyPolicy')}</Text>
            {'.'}
          </Text>

          <View style={styles.legalLinks}>
            <TouchableOpacity
              style={styles.legalLinkRow}
              onPress={() => Linking.openURL(TERMS_URL)}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={16} color={Colors.secondary} />
              <Text style={styles.legalLinkText}>{t('disclaimer.termsOfService')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.legalLinkRow}
              onPress={() => Linking.openURL(PRIVACY_URL)}
              activeOpacity={0.7}
            >
              <Ionicons name="open-outline" size={16} color={Colors.secondary} />
              <Text style={styles.legalLinkText}>{t('disclaimer.privacyPolicy')}</Text>
            </TouchableOpacity>
          </View>
        </View>

          <View style={{ height: 180 }} />
          </Animated.View>
        </ScrollView>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <LinearGradient
          colors={['rgba(226,241,238,0)', Colors.background]}
          style={styles.footerFade}
          pointerEvents="none"
        />
        <View style={[styles.footerButtons, { paddingBottom: insets.bottom + 12 }]}>
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

  // ── Logo — matches onboarding.tsx exactly ──────────────────────────────────
  logoArea: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 12,
    backgroundColor: Colors.background,
    zIndex: 2,
    overflow: 'visible',
  },
  logoFade: {
    position: 'absolute',
    bottom: -32,
    left: 0,
    right: 0,
    height: 32,
  },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 36,
  },

  // ── Header (gap 16 between items, gap 32 below) ──────────────────────────
  headerSection: {
    gap: 16,
    marginBottom: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  headerIntro: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
  },
  headerBody: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    lineHeight: 21,
  },

  // ── Checkbox section ──────────────────────────────────────────────────────
  checkSection: {
    gap: 8,
    marginBottom: 32,
  },
  understandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 0,
  },
  understandLabel: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  tickAllLink: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    textDecorationLine: 'underline',
    lineHeight: 20,
  },

  // Each checkbox in its own card
  checkCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: Colors.surface.secondary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...Shadows.level4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
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
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    lineHeight: 24,
  },

  // ── Legal text section ────────────────────────────────────────────────────
  legalSection: {
    gap: 16,
  },
  legalText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 24,
  },
  legalTextBold: {
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
  },
  legalLinks: {
    gap: 8,
  },
  legalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legalLinkText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
    lineHeight: 20,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
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
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  backBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.secondary,
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
