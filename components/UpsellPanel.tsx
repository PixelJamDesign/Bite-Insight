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
  LayoutChangeEvent,
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

const SLIDE_DURATION_MS = 600;   // time to cross-fade between slides
const DWELL_MS = 3200;           // time each slide stays fully visible

interface CardData {
  icon: any;
  title: string;
  body: string;
}

const CARDS: CardData[] = [
  {
    icon: ICON_FAMILY,
    title: 'Create and manage\nfamily profiles',
    body: "Easily manage your family's health, allergies, and dietary needs with individual member profiles.",
  },
  {
    icon: ICON_FLAG,
    title: 'Flag ingredients you\nwant to avoid',
    body: 'Have the ability to flag ingredients you want to avoid.',
  },
  {
    icon: ICON_RECIPES,
    title: 'Create and share recipes with other Bite Insight+ members.',
    body: 'Access to the Bite Insight+ recipe community where you can share and save ideas for you next meal.',
  },
  {
    icon: ICON_BARCODE,
    title: 'Barcode scanning for Global products',
    body: 'Access to over 4.2 millions products — Powered by a global food database.',
  },
];

export function UpsellPanel() {
  const { isPlus, purchasing, priceString, purchasePlus, trialEligible, trialDays } = useSubscription();
  const [carouselWidth, setCarouselWidth] = useState(0);
  const offset = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  // Schedule the next slide whenever the carousel width is known. Each
  // step animates a single card-width to the left, then snaps back to
  // zero once we've passed the last card to create the seamless loop.
  useEffect(() => {
    if (carouselWidth <= 0) return;

    let cancelled = false;

    const step = () => {
      if (cancelled) return;
      indexRef.current = (indexRef.current + 1) % CARDS.length;
      const target = indexRef.current === 0 ? 0 : -indexRef.current * carouselWidth;
      // When wrapping from last → first, fade through 0 instead of an
      // ugly long scroll back. We do that by snapping invisibly: jump
      // offset to one card past the end (so the loop appears continuous)
      // before animating back to 0. Simpler: just animate to target
      // with no jump — for 4 cards this looks fine and avoids the snap.
      animRef.current = Animated.timing(offset, {
        toValue: target,
        duration: SLIDE_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      });
      animRef.current.start(({ finished }) => {
        if (!finished || cancelled) return;
        setTimeout(step, DWELL_MS);
      });
    };

    const initial = setTimeout(step, DWELL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      animRef.current?.stop();
    };
  }, [carouselWidth, offset]);

  if (isPlus) return null;

  const days = trialDays ?? 7;
  const currencySymbol = priceString?.match(/^[^\d.,\s]+/)?.[0] ?? '£';
  const displayPrice = priceString ?? '£3.99';

  const headline = trialEligible
    ? `Try all the Bite Insight+ features\nFREE for ${days} days!`
    : `Get all the Bite Insight+ features\nfor just ${displayPrice} a month`;
  const ctaLabel = trialEligible
    ? `Start your ${days} day FREE trial for ${currencySymbol}0.00`
    : `Upgrade to Bite Insight+`;

  const handlePress = async () => {
    const ok = await purchasePlus();
    if (ok) {
      setTimeout(() => router.replace('/upgrade-success'), 250);
    }
  };

  const onCarouselLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== carouselWidth) setCarouselWidth(w);
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

      {/* Carousel — fixed-width window, four slides positioned in a row,
          animated horizontally as a single Animated.View. */}
      <View style={styles.carouselWindow} onLayout={onCarouselLayout}>
        {carouselWidth > 0 && (
          <Animated.View
            style={[
              styles.carouselTrack,
              {
                width: carouselWidth * CARDS.length,
                transform: [{ translateX: offset }],
              },
            ]}
          >
            {CARDS.map((c, i) => (
              <View key={i} style={[styles.slide, { width: carouselWidth }]}>
                <View style={styles.iconWrap}>
                  <Image source={c.icon} style={styles.iconImg} resizeMode="contain" />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{c.title}</Text>
                  <Text style={styles.cardCopy}>{c.body}</Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}
      </View>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {CARDS.map((_, i) => (
          <DotIndicator key={i} index={i} offset={offset} carouselWidth={carouselWidth} />
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
          <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.cancelNote}>Cancel anytime in the App Store</Text>
    </LinearGradient>
  );
}

// ── Dot indicator ────────────────────────────────────────────────────────────
// Interpolates from the same offset value so the dots stay in sync with
// the actual carousel position — fade-in the active dot as it nears center.
function DotIndicator({
  index,
  offset,
  carouselWidth,
}: {
  index: number;
  offset: Animated.Value;
  carouselWidth: number;
}) {
  if (carouselWidth <= 0) {
    return <View style={[styles.dot, styles.dotInactive]} />;
  }
  const opacity = offset.interpolate({
    inputRange: [
      -carouselWidth * (index + 1),
      -carouselWidth * index,
      -carouselWidth * (index - 1),
    ],
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp',
  });
  return <Animated.View style={[styles.dot, { opacity }]} />;
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
    overflow: 'hidden',
    // Small top buffer just so the icon's outline doesn't sit flush
    // against the headline above it. The icon negative-margins by 42
    // into the card body so we don't need to reserve the full 60 px.
    paddingTop: 4,
    minHeight: 220,
    marginTop: -8,
  },
  carouselTrack: {
    flexDirection: 'row',
  },
  slide: {
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
    paddingHorizontal: 24,
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
