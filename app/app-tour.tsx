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
import { useVideoPlayer, VideoView } from 'expo-video';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useJourney } from '@/lib/journeyContext';
import { safeBack } from '@/lib/safeBack';
import Svg, { Path } from 'react-native-svg';
import { Colors, Shadows } from '@/constants/theme';
import FoodCarousel from '@/components/FoodCarousel';

// ── Looping muted video player (hook-based, needs its own component) ────────
function StepVideo({ source, style }: { source: any; style: any }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.volume = 0;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls={false}
      allowsPictureInPicture={false}
    />
  );
}

// ── Step data (extensible — add more steps here) ────────────────────────────
interface TourStep {
  key: string;
  videoSource: any;
  nextStepName?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    key: 'navigation',
    videoSource: require('@/assets/videos/onboarding/tab-bar-nav.mp4'),
    nextStepName: 'Food Scanner',
  },
  {
    key: 'food_scanner',
    videoSource: require('@/assets/videos/onboarding/food-scanner.mp4'),
    nextStepName: 'Personalised Insights',
  },
  {
    key: 'personalised_insights',
    videoSource: require('@/assets/videos/onboarding/personalised-insights.mp4'),
    nextStepName: 'Ingredient Preferences',
  },
  {
    key: 'ingredient_preferences',
    videoSource: require('@/assets/videos/onboarding/ingredient-preferences.mp4'),
  },
];

const TOTAL_DOTS = 4;

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
  const { t: tj } = useTranslation('journey');
  const { session } = useAuth();
  const { onboardingStep, advanceTo } = useJourney();

  // When re-visiting from the menu, the journey is already complete
  const isRevisit = onboardingStep === 'complete';

  // -2 = welcome (word-by-word), -1 = intro, 0+ = step index
  // On revisit, skip the greeting and jump straight to the first tour step
  const [currentIndex, setCurrentIndex] = useState(isRevisit ? 0 : -2);
  // Prevent the video key from changing on re-renders
  const videoKey = useRef(0);
  // Screen-level slide + fade for transitions
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateX = useRef(new Animated.Value(0)).current;
  // Greeting fades out when transitioning to step view (hidden on revisit)
  const greetingOpacity = useRef(new Animated.Value(isRevisit ? 0 : 1)).current;

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

  // ── Step entrance animations ─────────────────────────────────────────────
  const stepSectionOpacity = useRef(new Animated.Value(0)).current;
  const stepSectionTranslateY = useRef(new Animated.Value(14)).current;
  const stepDotsOpacity = useRef(new Animated.Value(0)).current;
  const stepDotsTranslateY = useRef(new Animated.Value(14)).current;
  const stepTextOpacity = useRef(new Animated.Value(0)).current;
  const stepTextTranslateY = useRef(new Animated.Value(14)).current;
  const stepVideoOpacity = useRef(new Animated.Value(0)).current;
  const stepVideoTranslateY = useRef(new Animated.Value(20)).current;
  const stepFooterOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (currentIndex < 0) return;
    // Reset step anims for fresh entrance
    stepSectionOpacity.setValue(0);
    stepSectionTranslateY.setValue(14);
    stepDotsOpacity.setValue(0);
    stepDotsTranslateY.setValue(14);
    stepTextOpacity.setValue(0);
    stepTextTranslateY.setValue(14);
    stepVideoOpacity.setValue(0);
    stepVideoTranslateY.setValue(20);
    stepFooterOpacity.setValue(0);

    const makeEntrance = (opacity: Animated.Value, translateY: Animated.Value, delay: number, duration = 400) =>
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration, delay, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]);

    Animated.parallel([
      makeEntrance(stepSectionOpacity, stepSectionTranslateY, 250),
      makeEntrance(stepDotsOpacity, stepDotsTranslateY, 380),
      makeEntrance(stepTextOpacity, stepTextTranslateY, 500),
      makeEntrance(stepVideoOpacity, stepVideoTranslateY, 620, 500),
      Animated.timing(stepFooterOpacity, { toValue: 1, duration: 400, delay: 700, useNativeDriver: true }),
    ]).start();
  }, [currentIndex]);

  // ── Slide + fade transition helper ────────────────────────────────────────
  const isTransitioning = useRef(false);

  const fadeToIndex = (nextIndex: number) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;

    const EXIT_MS = 400;
    const ENTER_MS = 450;

    const exitAnims = [
      Animated.timing(screenOpacity, {
        toValue: 0, duration: EXIT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(screenTranslateX, {
        toValue: -30, duration: EXIT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true,
      }),
    ];
    // Fade greeting out when leaving intro for the step view
    if (nextIndex >= 0) {
      exitAnims.push(
        Animated.timing(greetingOpacity, {
          toValue: 0, duration: EXIT_MS, easing: Easing.in(Easing.cubic), useNativeDriver: true,
        }),
      );
    }
    Animated.parallel(exitAnims).start(() => {
      if (nextIndex >= 0) videoKey.current += 1;
      setCurrentIndex(nextIndex);
      // Reset for entrance: slide in from right
      screenTranslateX.setValue(30);
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 1, duration: ENTER_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(screenTranslateX, {
          toValue: 0, duration: ENTER_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]).start(() => {
        isTransitioning.current = false;
      });
    });
  };

  // ── Completion ──────────────────────────────────────────────────────────────
  const completeTour = async () => {
    if (isRevisit) {
      // Re-visiting from menu — just navigate back
      safeBack();
      return;
    }
    try {
      await advanceTo('disclaimer');
    } catch {
      // JourneyGuard will redirect on next render
    }
  };

  // ── Skip confirmation ───────────────────────────────────────────────────────
  const handleSkip = () => {
    if (isRevisit) {
      // Re-visiting from menu — no confirmation needed, just go back
      safeBack();
      return;
    }
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
      fadeToIndex(currentIndex + 1);
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
  // WELCOME (-2) & INTRO (-1) — shared layout with persistent greeting
  // ══════════════════════════════════════════════════════════════════════════════
  if (currentIndex <= -1) {
    let wordIdx = 0;
    const isWelcome = currentIndex === -2;

    return (
      <View style={[styles.container, isWelcome ? styles.welcomeContainer : styles.introContainer]}>
        {/* Greeting — stays on screen across welcome ↔ intro, fades out before steps */}
        <Animated.View style={[styles.introGreeting, { opacity: greetingOpacity }]}>
          <View style={styles.greetingWrap}>
            <Text style={styles.greetingLabel}>{greeting}</Text>
            <Text style={styles.greetingName}>{firstName || ''}</Text>
          </View>
        </Animated.View>

        {/* Content — only this part fades between welcome and intro */}
        <Animated.View style={[styles.fadeContent, { opacity: screenOpacity, transform: [{ translateX: screenTranslateX }] }]}>
          {isWelcome ? (
            /* ── Welcome: greeting text + food carousel ── */
            <View style={styles.welcomeCarouselWrap}>
              <View style={styles.welcomeTextWrap}>
                <Text style={styles.welcomeLine1}>{tj('welcome.thanks')}</Text>
                <Text style={styles.welcomeLine2}>{tj('welcome.subtitle')}</Text>
              </View>
              <FoodCarousel />
            </View>
          ) : (
            /* ── Intro: card + hero image ── */
            <>
              <Animated.View
                style={[
                  styles.introCard,
                  { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
                ]}
              >
                <Text style={styles.introCardTitle}>{t('intro.cardTitle')}</Text>
                <Text style={styles.introCardBody}>{t('intro.cardBody')}</Text>
              </Animated.View>

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
            </>
          )}
        </Animated.View>

        {/* Skip — top right */}
        <TouchableOpacity style={[styles.skipTopRight, { top: insets.top + 12 }]} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipTopRightText}>{t('buttons.skip')}</Text>
        </TouchableOpacity>

        {/* Footer — single full-width button */}
        {isWelcome ? (
          <Animated.View style={[styles.welcomeFooter, { paddingBottom: insets.bottom + 12, opacity: welcomeFooterOpacity }]}>
            <TouchableOpacity style={styles.fullWidthBtn} onPress={handleWelcomeNext} activeOpacity={0.85}>
              <Text style={styles.fullWidthBtnText}>{t('buttons.next')}</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <LinearGradient
            colors={['rgba(226,241,238,0)', '#e2f1ee']}
            locations={[0, 0.45]}
            style={[styles.introFooterGradient, { paddingBottom: insets.bottom + 12 }]}
          >
            <TouchableOpacity style={styles.fullWidthBtn} onPress={handleBegin} activeOpacity={0.85}>
              <Text style={styles.fullWidthBtnText}>{t('buttons.next')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // STEP VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, { paddingTop: 120 }]}>
      <Animated.View style={[styles.fadeContent, { opacity: screenOpacity, transform: [{ translateX: screenTranslateX }] }]}>
        {/* Section title */}
        <Animated.View style={[styles.stepHeader, { opacity: stepSectionOpacity, transform: [{ translateY: stepSectionTranslateY }] }]}>
          <Text style={styles.sectionTitle}>
            {t(`steps.${step!.key}.section`)}
          </Text>
        </Animated.View>

        {/* Progress dots + next label */}
        <Animated.View style={[styles.progressRow, { opacity: stepDotsOpacity, transform: [{ translateY: stepDotsTranslateY }] }]}>
          <View style={styles.progressInner}>
            <View style={styles.dotsRow}>
              {Array.from({ length: TOTAL_DOTS }).map((_, i) => {
                if (i < currentIndex) {
                  // Completed step — teal circle with white checkmark
                  return (
                    <View key={i} style={styles.dotCompleted}>
                      <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
                        <Path d="M2.5 6.5L4.5 8.5L9.5 3.5" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </Svg>
                    </View>
                  );
                }
                return (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      i === currentIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                );
              })}
            </View>
          </View>
          {step?.nextStepName && (
            <Text style={styles.nextLabel}>
              {t('progress.next', { stepName: step.nextStepName })}
            </Text>
          )}
        </Animated.View>

        {/* Step content */}
        <Animated.View style={[styles.stepContent, { opacity: stepTextOpacity, transform: [{ translateY: stepTextTranslateY }] }]}>
          <Text style={styles.stepTitle}>
            {t(`steps.${step!.key}.title`)}
          </Text>
          <Text style={styles.stepSubtitle}>
            {t(`steps.${step!.key}.subtitle`)}
          </Text>
        </Animated.View>

        {/* Video animation */}
        <Animated.View style={[styles.videoContainer, { opacity: stepVideoOpacity, transform: [{ translateY: stepVideoTranslateY }] }]}>
          <StepVideo
            key={videoKey.current}
            source={step!.videoSource}
            style={styles.video}
          />
        </Animated.View>
      </Animated.View>

      {/* Footer — Skip + Next side by side */}
      <Animated.View style={{ opacity: stepFooterOpacity, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <LinearGradient
          colors={['rgba(226,241,238,0)', '#e2f1ee']}
          locations={[0, 0.45]}
          style={[styles.stepFooterGradient, { paddingBottom: insets.bottom + 12 }]}
        >
          <View style={styles.stepFooterRow}>
            <TouchableOpacity style={styles.skipOutlineBtn} onPress={handleSkip} activeOpacity={0.85}>
              <Text style={styles.skipOutlineBtnText}>{t('buttons.skip')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextFilledBtn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.fullWidthBtnText}>
                {isLastStep ? t('buttons.finish') : step?.nextStepName ? t('progress.next', { stepName: step.nextStepName }) : t('buttons.next')}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
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
  welcomeCarouselWrap: {
    flex: 1,
    gap: 20,
  },
  welcomeTextWrap: {
    paddingHorizontal: 24,
    gap: 16,
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

  // ── Skip top-right ───────────────────────────────────────────────────────
  skipTopRight: {
    position: 'absolute',
    right: 24,
    zIndex: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipTopRightText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0,
  },

  // ── Full-width button ───────────────────────────────────────────────────
  fullWidthBtn: {
    backgroundColor: '#00776f',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthBtnText: {
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
  dotCompleted: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#3b9586',
    alignItems: 'center',
    justifyContent: 'center',
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
  videoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  video: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
  },
  stepFooterGradient: {
    paddingTop: 16,
    paddingBottom: 40,
    paddingLeft: 24,
    paddingRight: 24,
  },
  stepFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skipOutlineBtn: {
    borderWidth: 2,
    borderColor: '#00776f',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  skipOutlineBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#00776f',
    letterSpacing: 0,
  },
  nextFilledBtn: {
    flex: 1,
    backgroundColor: '#00776f',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
