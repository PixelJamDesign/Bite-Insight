/**
 * UpsellPanel — inline Bite Insight+ upsell on the dashboard.
 *
 * Visual reference: Figma 5149:16911. Dark-teal gradient card with:
 *   - Bite Insight+ logo
 *   - Trial-aware headline
 *   - 4 feature cards in an auto-rotating carousel (icon floats above
 *     the card body, overlapping by ~42 px)
 *   - Primary CTA + 'Cancel anytime' fineprint
 *
 * The carousel slides one card at a time, dwelling on each for a few
 * seconds, then loops infinitely. Tapping a card pauses briefly so the
 * user can read it without the next slide jumping in.
 *
 * Hidden when the user is already Plus (debug menu's 'Force non-Plus'
 * toggle bypasses that — see lib/subscriptionContext.tsx).
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';
import { useSubscription } from '@/lib/subscriptionContext';
import { Radius } from '@/constants/theme';

const ICON_FAMILY  = require('@/assets/icons/upsell/card-family.png');
const ICON_FLAG    = require('@/assets/icons/upsell/card-flag.png');
const ICON_RECIPES = require('@/assets/icons/upsell/card-recipes.png');
const ICON_BARCODE = require('@/assets/icons/upsell/card-barcode.png');

const FADE_DURATION_MS = 500;    // length of each cross-fade
const DWELL_MS = 3200;           // time each card stays fully visible

interface CardData {
  icon: any;
  title: string;
  body: string;
}

const CARDS: CardData[] = [
  {
    icon: ICON_FAMILY,
    title: 'Create and manage\nfamily profiles',
    body: "Each person you add has their own preferences, allergies and conditions.",
  },
  {
    icon: ICON_FLAG,
    title: 'Flag ingredients you\nwant to avoid',
    body: "Tell us what to watch for and we'll flag it on every scan.",
  },
  {
    icon: ICON_RECIPES,
    title: 'Create and share recipes with other Bite Insight+ members.',
    body: 'Swap meal ideas in the Bite Insight+ recipe community.',
  },
  {
    icon: ICON_BARCODE,
    title: 'Barcode scanning for global products',
    body: 'Scan over 4.2 million products from anywhere in the world.',
  },
];

export function UpsellPanel() {
  const { isPlus, purchasing, priceString, purchasePlus, trialEligible, trialDays } = useSubscription();
  const [activeIndex, setActiveIndex] = useState(0);
  // One Animated.Value per card holding its opacity. Cross-fade works by
  // animating the outgoing card to 0 and the incoming card to 1 in parallel.
  const opacities = useRef(CARDS.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let current = 0;

    const step = () => {
      if (cancelled) return;
      const next = (current + 1) % CARDS.length;
      Animated.parallel([
        Animated.timing(opacities[current], {
          toValue: 0,
          duration: FADE_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacities[next], {
          toValue: 1,
          duration: FADE_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || cancelled) return;
        current = next;
        setActiveIndex(next);
        timer = setTimeout(step, DWELL_MS);
      });
    };

    timer = setTimeout(step, DWELL_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [opacities]);

  if (isPlus) return null;

  const days = trialDays ?? 7;
  const currencySymbol = priceString?.match(/^[^\d.,\s]+/)?.[0] ?? '£';
  const displayPrice = priceString ?? '£3.99';

  const headline = trialEligible
    ? `Try all the Bite Insight+ features\nFREE for ${days} days!`
    : `Get all the Bite Insight+ features\nfor just ${displayPrice} a month`;
  const ctaLabel = trialEligible
    ? `Start your ${days} day FREE trial for ${currencySymbol}0.00`
    : `Upgrade for ${displayPrice} a month`;

  const handlePress = async () => {
    const ok = await purchasePlus();
    if (ok) {
      setTimeout(() => router.replace('/upgrade-success'), 250);
    }
  };

  return (
    <LinearGradient
      colors={['#023432', '#002923']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.panel}
    >
      {/* Logo */}
      <BiteInsightPlusLogo width={156} height={39} />

      {/* Headline */}
      <Text style={styles.headline}>{headline}</Text>

      {/* Carousel — all four cards rendered absolutely in the same slot,
          opacity-driven cross-fade between them. */}
      <View style={styles.carouselWindow}>
        {CARDS.map((c, i) => (
          <Animated.View
            key={i}
            pointerEvents={i === activeIndex ? 'auto' : 'none'}
            style={[styles.slide, { opacity: opacities[i] }]}
          >
            <View style={styles.iconWrap}>
              <Image source={c.icon} style={styles.iconImg} resizeMode="contain" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardCopy}>{c.body}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {CARDS.map((_, i) => (
          <View key={i} style={[styles.dot, i !== activeIndex && styles.dotInactive]} />
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.primaryBtn, purchasing && styles.primaryBtnDisabled]}
        activeOpacity={0.85}
        disabled={purchasing}
        onPress={handlePress}
      >
        {purchasing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text
            style={styles.primaryBtnText}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
          >
            {ctaLabel}
          </Text>
        )}
      </TouchableOpacity>
      <Text style={styles.cancelNote}>Cancel anytime in the App Store</Text>
    </LinearGradient>
  );
}

const ACCENT = '#3b9586';
const CARD_BG = 'rgba(0, 119, 111, 0.25)';

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  headline: {
    fontSize: 20,
    lineHeight: 24,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  carouselWindow: {
    width: '100%',
    // Small top buffer for the floating icon. The icon negative-margins
    // by 42 into the card body so we don't need the full 60 px.
    paddingTop: 4,
    minHeight: 220,
    marginTop: -8,
    position: 'relative',
  },
  slide: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 4,
  },
  iconWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -42,
    zIndex: 2,
  },
  iconImg: {
    width: 60,
    height: 60,
  },
  cardBody: {
    backgroundColor: CARD_BG,
    borderRadius: Radius.m,
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0,
  },
  cardCopy: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.14,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  dotInactive: {
    opacity: 0.3,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: Radius.m,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#84a19f',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.19,
    shadowRadius: 7,
    elevation: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
  cancelNote: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.14,
  },
});
