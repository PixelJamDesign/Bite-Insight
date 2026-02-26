import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

// Same Figma asset icons used in the UpsellSheet
const ICON_FAMILY  = { uri: 'https://www.figma.com/api/mcp/asset/9113b1c6-0f94-465a-8bc0-bd4d5c5d0774' };
const ICON_FLAG    = { uri: 'https://www.figma.com/api/mcp/asset/f5c2d33c-946a-4c46-86dc-d5aeded3b5e7' };
const ICON_RECIPE  = { uri: 'https://www.figma.com/api/mcp/asset/475db745-dfb2-4d81-875d-3bbaacc23ac1' };
const ICON_BARCODE = { uri: 'https://www.figma.com/api/mcp/asset/9dcb5e2a-6c18-4ee6-895d-fb9dc436abdd' };

const FEATURES = [
  {
    icon: ICON_FAMILY,
    title: 'Family Profiles',
    body: 'Create profiles for your family members with their own dietary needs, health conditions, and allergies. Scan products and get personalised insights for each person.',
  },
  {
    icon: ICON_FLAG,
    title: 'Flagged Ingredients',
    body: 'Flag specific ingredients you want to watch out for. Every time you scan a product, we\'ll highlight them so nothing slips through.',
  },
  {
    icon: ICON_RECIPE,
    title: 'Recipe Ideas',
    body: 'Get recipe suggestions tailored to your dietary preferences and the ingredients you love. Discover new meals that work for you.',
  },
  {
    icon: ICON_BARCODE,
    title: 'Global Product Scanning',
    body: 'Access a database of over 4.2 million products from around the world. Scan barcodes wherever you shop and get instant ingredient breakdowns.',
  },
];

const SLIDE_DURATION = 5000; // ms each slide is visible
const FADE_OUT_DURATION = 600;
const FADE_IN_DURATION = 600;
const FADE_GAP = 200; // blank pause between slides

export default function UpgradeSuccessScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Entrance animations ────────────────────────────────────────────────────
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;
  const carouselOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnTranslateY = useRef(new Animated.Value(16)).current;

  // Single animated value for the slide container — fades out then back in
  const slideFade = useRef(new Animated.Value(1)).current;
  const activeIndexRef = useRef(0);

  const advanceSlide = useCallback(() => {
    const next = (activeIndexRef.current + 1) % FEATURES.length;

    // 1. Fade out
    Animated.timing(slideFade, {
      toValue: 0,
      duration: FADE_OUT_DURATION,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // 2. Swap content while invisible
      activeIndexRef.current = next;
      setActiveIndex(next);

      // 3. Pause, then fade in
      setTimeout(() => {
        Animated.timing(slideFade, {
          toValue: 1,
          duration: FADE_IN_DURATION,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }).start();
      }, FADE_GAP);
    });
  }, [slideFade]);

  useEffect(() => {
    // 1. Heading fades in (Lottie auto-plays its own entrance)
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 400,
        delay: 300,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 400,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Carousel area fades in
    Animated.timing(carouselOpacity, {
      toValue: 1,
      duration: 400,
      delay: 550,
      useNativeDriver: true,
    }).start();

    // 4. Button fades in
    Animated.parallel([
      Animated.timing(btnOpacity, {
        toValue: 1,
        duration: 400,
        delay: 700,
        useNativeDriver: true,
      }),
      Animated.timing(btnTranslateY, {
        toValue: 0,
        duration: 400,
        delay: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 5. Start carousel auto-advance
    const interval = setInterval(advanceSlide, SLIDE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
      {/* ── Success Lottie ── */}
      <View style={styles.lottieWrap}>
        <LottieView
          source={require('../assets/lottie/success.json')}
          autoPlay
          loop={false}
          style={styles.lottie}
        />
      </View>

      {/* ── Heading + logo ── */}
      <Animated.View
        style={[
          styles.headingSection,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        <Text style={styles.welcomeText}>Welcome to</Text>
        <BiteInsightPlusLogo width={210} height={56} />
        <Text style={styles.subtitle}>
          You've unlocked the full power of Bite Insight. Here's what's now available to you:
        </Text>
      </Animated.View>

      {/* ── Feature carousel ── */}
      <Animated.View style={[styles.carouselContainer, { opacity: carouselOpacity }]}>
        <View style={styles.slideArea}>
          <Animated.View style={[styles.slide, { opacity: slideFade }]}>
            <View style={styles.slideIconWrap}>
              <Image source={FEATURES[activeIndex].icon} style={styles.slideIcon} resizeMode="contain" />
            </View>
            <Text style={styles.slideTitle}>{FEATURES[activeIndex].title}</Text>
            <Text style={styles.slideBody}>{FEATURES[activeIndex].body}</Text>
          </Animated.View>
        </View>

        {/* Dot indicators */}
        <View style={styles.dots}>
          {FEATURES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === activeIndex && styles.dotActive]}
            />
          ))}
        </View>
      </Animated.View>

      {/* ── Spacer ── */}
      <View style={{ flex: 1 }} />

      {/* ── CTA ── */}
      <Animated.View
        style={[
          styles.ctaSection,
          { opacity: btnOpacity, transform: [{ translateY: btnTranslateY }] },
        ]}
      >
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => router.replace('/(tabs)/')}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={styles.fineprint}>
          Manage your subscription anytime from the menu.
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#002923',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  // ── Lottie (native 597×500 → scaled to 192 wide, keeping aspect ratio) ──
  lottieWrap: {
    width: 192,
    height: 161, // 192 * (500/597) ≈ 161
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lottie: {
    width: 192,
    height: 161,
  },
  // ── Heading ──
  headingSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 36,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    letterSpacing: -0.18,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 340,
  },
  // ── Carousel ──
  carouselContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  slideArea: {
    width: '100%',
    backgroundColor: 'rgba(0,119,111,0.25)',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    minHeight: 220,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 4,
  },
  slideIconWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  slideIcon: {
    width: 64,
    height: 64,
  },
  slideTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  slideBody: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    textAlign: 'center',
    lineHeight: 21,
  },
  // ── Dots ──
  dots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(170,212,205,0.3)',
  },
  dotActive: {
    backgroundColor: '#00c8b3',
  },
  // ── CTA ──
  ctaSection: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: '#00776f',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: 0,
    lineHeight: 20,
  },
  fineprint: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    letterSpacing: -0.13,
  },
});
