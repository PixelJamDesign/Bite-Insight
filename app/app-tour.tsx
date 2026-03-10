import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useJourney } from '@/lib/journeyContext';
import { Colors, Shadows } from '@/constants/theme';

// ── Step data (extensible — add more steps here) ────────────────────────────
interface TourStep {
  key: string;
  lottieSource: any;
  nextStepName?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    key: 'navigation',
    lottieSource: require('@/assets/lottie/onboarding/tab-bar-nav.json'),
    nextStepName: 'Health Conditions',
  },
  // Future steps go here
];

const TOTAL_DOTS = 4; // Visual dot count (matches Figma — shows upcoming steps)

// ── Time-based greeting ─────────────────────────────────────────────────────
function getGreeting(tc: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return tc('greeting.morning');
  if (hour < 17) return tc('greeting.afternoon');
  return tc('greeting.evening');
}

export default function AppTourScreen() {
  const insets = useSafeAreaInsets();
  const { t: tc } = useTranslation('common');
  const { t } = useTranslation('tour');
  const { session } = useAuth();
  const { advanceTo } = useJourney();

  // -2 = welcome (word-by-word), -1 = intro, 0+ = step index
  const [currentIndex, setCurrentIndex] = useState(-2);
  // Prevent the Lottie key from changing on re-renders
  const lottieKey = useRef(0);
  // Screen-level fade for transitions
  const screenOpacity = useRef(new Animated.Value(1)).current;

  const fullName = session?.user?.user_metadata?.full_name as string | undefined;
  const firstName = fullName?.split(' ')[0] ?? '';
  const greeting = getGreeting(tc);

  // ── Welcome word-by-word animation ─────────────────────────────────────────
  const welcomeLine1 = t('welcome.line1');
  const welcomeLine2 = t('welcome.line2');
  const allWords = [...welcomeLine1.split(' '), '\n', ...welcomeLine2.split(' ')];
  const wordAnims = useRef(allWords.map(() => new Animated.Value(0))).current;
  const welcomeFooterOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentIndex !== -2) return;
    const WORD_DELAY = 120; // ms between each word — gentle reading pace
    const START_DELAY = 500; // initial pause after screen appears
    const WORD_FADE = 600; // each word fades in slowly

    const wordTimings = wordAnims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: WORD_FADE,
        delay: START_DELAY + i * WORD_DELAY,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    Animated.parallel(wordTimings).start();

    // Fade in footer buttons after all words finish
    const totalWordsTime = START_DELAY + allWords.length * WORD_DELAY + WORD_FADE;
    Animated.timing(welcomeFooterOpacity, {
      toValue: 1,
      duration: 500,
      delay: totalWordsTime + 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [currentIndex]);

  // ── Intro entrance animations ─────────────────────────────────────────────
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (currentIndex !== -1) return;
    // Reset intro anims for fresh entrance
    cardOpacity.setValue(0);
    cardTranslateY.setValue(16);
    heroOpacity.setValue(0);
    heroTranslateY.setValue(30);

    // 1. Card fades in
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 450,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 450,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Hero image slides up from +30 after card starts
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 500,
        delay: 550,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 500,
        delay: 550,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentIndex]);

  // ── Fade transition helper ──────────────────────────────────────────────────
  const fadeToIndex = (nextIndex: number) => {
    Animated.timing(screenOpacity, {
      toValue: 0,
      duration: 300,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      if (nextIndex >= 0) lottieKey.current += 1;
      setCurrentIndex(nextIndex);
      Animated.timing(screenOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    });
  };

  // ── Completion ──────────────────────────────────────────────────────────────
  const completeTour = async () => {
    try {
      await advanceTo('complete');
    } catch {
      // JourneyGuard will redirect on next render
    }
  };

  // ── Skip confirmation ───────────────────────────────────────────────────────
  const handleSkip = () => {
    Alert.alert(
      t('skip.title'),
      t('skip.message'),
      [
        { text: t('skip.cancel'), style: 'cancel' },
        { text: t('skip.confirm'), style: 'destructive', onPress: completeTour },
      ],
    );
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (currentIndex < TOUR_STEPS.length - 1) {
      lottieKey.current += 1;
      setCurrentIndex(currentIndex + 1);
    } else {
      completeTour();
    }
  };

  const handleWelcomeNext = () => {
    fadeToIndex(-1);
  };

  const handleBegin = () => {
    fadeToIndex(0);
  };

  const isLastStep = currentIndex === TOUR_STEPS.length - 1;
  const step = currentIndex >= 0 ? TOUR_STEPS[currentIndex] : null;

  // ══════════════════════════════════════════════════════════════════════════════
  // WELCOME VIEW — word-by-word fade
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentIndex === -2) {
    let wordIdx = 0;
    return (
      <View style={[styles.container, styles.welcomeContainer]}>
        <Animated.View style={[styles.fadeContent, { opacity: screenOpacity }]}>
          {/* Greeting */}
          <View style={styles.introGreeting}>
            <View style={styles.greetingWrap}>
              <Text style={styles.greetingLabel}>{greeting}</Text>
              <Text style={styles.greetingName}>{firstName || ''}</Text>
            </View>
          </View>

          {/* Word-by-word text */}
          <View style={styles.welcomeTextWrap}>
            <View style={styles.welcomeWordRow}>
              {welcomeLine1.split(' ').map((word, i) => {
                const idx = wordIdx++;
                return (
                  <Animated.Text key={`l1-${i}`} style={[styles.welcomeLine1, { opacity: wordAnims[idx] }]}>
                    {word}{' '}
                  </Animated.Text>
                );
              })}
            </View>
            {/* Skip the '\n' separator */}
            {(() => { wordIdx++; return null; })()}
            <View style={styles.welcomeWordRow}>
              {welcomeLine2.split(' ').map((word, i) => {
                const idx = wordIdx++;
                return (
                  <Animated.Text key={`l2-${i}`} style={[styles.welcomeLine2, { opacity: wordAnims[idx] }]}>
                    {word}{' '}
                  </Animated.Text>
                );
              })}
            </View>
          </View>
        </Animated.View>

        {/* Footer buttons — fade in after words finish, always on top of bg */}
        <Animated.View style={[styles.welcomeFooter, { opacity: welcomeFooterOpacity }]}>
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.85}>
              <Text style={styles.skipBtnText}>{t('buttons.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={handleWelcomeNext} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{t('buttons.next')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // INTRO VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentIndex === -1) {
    return (
      <View style={[styles.container, styles.introContainer]}>
        <Animated.View style={[styles.fadeContent, { opacity: screenOpacity }]}>
          {/* Greeting */}
          <View style={styles.introGreeting}>
            <View style={styles.greetingWrap}>
              <Text style={styles.greetingLabel}>
                {greeting}
              </Text>
              <Text style={styles.greetingName}>
                {firstName || ''}
              </Text>
            </View>
          </View>

          {/* Card — fades in first */}
          <Animated.View
            style={[
              styles.introCard,
              { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
            ]}
          >
            <Text style={styles.introCardTitle}>{t('intro.cardTitle')}</Text>
            <Text style={styles.introCardBody}>{t('intro.cardBody')}</Text>
          </Animated.View>

          {/* Hero image — slides up after card */}
          <Animated.View
            style={[
              styles.heroWrap,
              { opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] },
            ]}
          >
            <Image
              source={require('@/assets/images/hands.webp')}
              style={styles.heroImage}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>

        {/* Footer buttons — always visible */}
        <LinearGradient
          colors={['rgba(226,241,238,0)', '#e2f1ee']}
          locations={[0, 0.45]}
          style={styles.introFooterGradient}
        >
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.85}>
              <Text style={styles.skipBtnText}>{t('buttons.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={handleBegin} activeOpacity={0.85}>
              <Text style={styles.nextBtnText}>{t('buttons.next')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, { paddingTop: 120 }]}>
      <Animated.View style={[styles.fadeContent, { opacity: screenOpacity }]}>
        {/* Section title */}
        <View style={styles.stepHeader}>
          <Text style={styles.sectionTitle}>
            {t(`steps.${step!.key}.section`)}
          </Text>
        </View>

        {/* Progress dots + next label */}
        <View style={styles.progressRow}>
          <View style={styles.progressInner}>
            <View style={styles.dotsRow}>
              {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          </View>
          {step?.nextStepName && (
            <Text style={styles.nextLabel}>
              {t('progress.next', { stepName: step.nextStepName })}
            </Text>
          )}
        </View>

        {/* Step content */}
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>
            {t(`steps.${step!.key}.title`)}
          </Text>
          <Text style={styles.stepSubtitle}>
            {t(`steps.${step!.key}.subtitle`)}
          </Text>
        </View>

        {/* Lottie animation */}
        <View style={styles.lottieContainer}>
          <LottieView
            key={lottieKey.current}
            source={step!.lottieSource}
            autoPlay
            loop
            resizeMode="contain"
            style={styles.lottie}
          />
        </View>
      </Animated.View>

      {/* Footer buttons — always visible */}
      <LinearGradient
        colors={['rgba(226,241,238,0)', '#e2f1ee']}
        locations={[0, 0.45]}
        style={styles.stepFooterGradient}
      >
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.85}>
            <Text style={styles.skipBtnText}>{t('buttons.skip')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>
              {isLastStep ? t('buttons.finish') : t('buttons.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fadeContent: {
    flex: 1,
  },

  // ── Welcome ────────────────────────────────────────────────────────────────
  welcomeContainer: {
    paddingTop: 120,
  },
  welcomeTextWrap: {
    paddingHorizontal: 24,
    gap: 16,
  },
  welcomeWordRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  welcomeLine1: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -1,
  },
  welcomeLine2: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.5,
  },
  welcomeFooter: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  // ── Intro ──────────────────────────────────────────────────────────────────
  introContainer: {
    paddingTop: 120,
    paddingBottom: 140,
  },
  introGreeting: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  greetingWrap: {
    gap: 0,
  },
  greetingLabel: {
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -1,
  },
  greetingName: {
    fontSize: 48,
    lineHeight: 60,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -2,
  },
  introCard: {
    marginHorizontal: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    gap: 10,
    shadowColor: 'rgba(86,138,130,0.1)',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  introCardTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
  },
  introCardBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: 0,
  },
  heroWrap: {
    flex: 1,
    marginTop: 20,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    alignSelf: 'center',
  },
  introFooterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    paddingBottom: 40,
  },

  // ── Shared footer buttons ─────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skipBtn: {
    width: 91,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: '#00776f',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: 0,
  },

  // ── Step ───────────────────────────────────────────────────────────────────
  stepHeader: {
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  progressInner: {
    flex: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    height: 10,
    borderRadius: 999,
  },
  dotActive: {
    width: 48,
    backgroundColor: '#023432',
  },
  dotInactive: {
    width: 16,
    backgroundColor: '#aad4cd',
  },
  nextLabel: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  stepContent: {
    paddingHorizontal: 24,
    gap: 8,
  },
  stepTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
  },
  stepSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: 0,
  },
  lottieContainer: {
    flex: 1,
    alignItems: 'center',
  },
  lottie: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
  },
  stepFooterGradient: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
});
