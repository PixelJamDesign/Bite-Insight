/**
 * UpsellSheetV2 — proposed redesign of the Bite Insight+ upsell.
 *
 * The current UpsellSheet leads with price ("£3.99 / month") and asks
 * for the upgrade up-front. This redesign leads with VALUE — four
 * feature cards stacked vertically (the desktop mock has them in a
 * horizontal row; that doesn't fit on a phone, so we stack) — and
 * offers the trial as the primary conversion lever when the user is
 * eligible.
 *
 * Trial-eligible branch:
 *   "Try all the Bite Insight+ features FREE for 7 days!"
 *   CTA: "Start your 7 day FREE trial for £0.00"
 *
 * Trial-not-eligible branch (returning customer / already used trial):
 *   "Get all the Bite Insight+ features for just £3.99 a month"
 *   CTA: "Upgrade to Bite Insight+"
 *
 * Either way "Cancel anytime in the App Store" sits below the CTA to
 * defuse the most common objection.
 *
 * Wired to purchasePlus() which returns a boolean — on success we
 * dismiss the sheet and route to /upgrade-success (same pattern as
 * TrialUpsellSheet after the Nov fix).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';
import { useSubscription } from '@/lib/subscriptionContext';
import { Colors, Radius } from '@/constants/theme';

// ── Standalone preview store ─────────────────────────────────────────────────
// V2 isn't wired into the existing UpsellSheet context yet — it has its own
// tiny store so we can mount it next to the live sheet and toggle it from
// the debug menu without affecting the production flow. When you're ready
// to make V2 the real upsell, drop this in favour of `useUpsellSheet()`.
let _v2Visible = false;
const _v2Listeners = new Set<() => void>();
function _v2Notify() { for (const l of _v2Listeners) l(); }
function _v2Subscribe(l: () => void) {
  _v2Listeners.add(l);
  return () => { _v2Listeners.delete(l); };
}
function _v2GetSnapshot() { return _v2Visible; }
export function showUpsellSheetV2() { _v2Visible = true; _v2Notify(); }
export function hideUpsellSheetV2() { _v2Visible = false; _v2Notify(); }

const SCREEN_HEIGHT = Dimensions.get('window').height;

const ICON_FAMILY  = require('@/assets/icons/upsell/family.webp');
const ICON_FLAG    = require('@/assets/icons/upsell/flag.webp');
const ICON_RECIPE  = require('@/assets/icons/upsell/recipes.webp');
const ICON_BARCODE = require('@/assets/icons/upsell/barcode.webp');

interface FeatureCardData {
  icon: any;
  title: string;
  body: string;
}

const FEATURES: FeatureCardData[] = [
  {
    icon: ICON_FAMILY,
    title: 'Create and manage family profiles',
    body: "Manage your family's health, allergies, and diets with individual profiles.",
  },
  {
    icon: ICON_FLAG,
    title: 'Flag ingredients you want to avoid',
    body: 'Have the ability to flag ingredients you want to avoid.',
  },
  {
    icon: ICON_RECIPE,
    title: 'Create and share recipes with Bite Insight+ members.',
    body: 'Join the Bite Insight+ recipe community to share and save meal ideas.',
  },
  {
    icon: ICON_BARCODE,
    title: 'Barcode scanning for Global products',
    body: 'Access 4.2 million products via a global food database.',
  },
];

export function UpsellSheetV2() {
  const visible = useSyncExternalStore(_v2Subscribe, _v2GetSnapshot, _v2GetSnapshot);
  const hideUpsell = hideUpsellSheetV2;
  const { purchasing, priceString, purchasePlus, trialEligible, trialDays } = useSubscription();
  const insets = useSafeAreaInsets();

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const hasShownRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      hasShownRef.current = true;
      setMounted(true);
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (hasShownRef.current) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible, slideAnim, backdropAnim]);

  if (!mounted) return null;

  const displayTrialDays = trialDays ?? 7;
  const currencySymbol = priceString?.match(/^[^\d.,\s]+/)?.[0] ?? '£';
  const displayPrice = priceString ?? '£3.99';

  // Copy variants
  const headline = trialEligible
    ? `Try all the Bite Insight+ features\nFREE for ${displayTrialDays} days!`
    : `Get all the Bite Insight+ features\nfor just ${displayPrice} a month`;
  const ctaLabel = trialEligible
    ? `Start your ${displayTrialDays} day FREE trial for ${currencySymbol}0.00`
    : `Upgrade to Bite Insight+`;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={hideUpsell}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={hideUpsell} activeOpacity={1} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetWrap,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <LinearGradient
          colors={['#023432', '#002923']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[styles.sheet, { paddingTop: insets.top + 24 }]}
        >
          {/* Close button — top right */}
          <TouchableOpacity style={styles.closeBtn} onPress={hideUpsell} hitSlop={10}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header — logo */}
            <View style={styles.header}>
              <BiteInsightPlusLogo width={180} height={48} />
              <Text style={styles.intro}>Premium features include:</Text>
            </View>

            {/* Stacked feature cards */}
            <View style={styles.featureList}>
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureCard}>
                  <Image source={f.icon} style={styles.featureIcon} />
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureBody}>{f.body}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Headline (trial-aware) */}
            <Text style={styles.headline}>{headline}</Text>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.primaryBtn, purchasing && styles.primaryBtnDisabled]}
              activeOpacity={0.85}
              disabled={purchasing}
              onPress={async () => {
                const ok = await purchasePlus();
                if (ok) {
                  hideUpsell();
                  setTimeout(() => router.replace('/upgrade-success'), 250);
                }
              }}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>{ctaLabel}</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.cancelNote}>Cancel anytime in the App Store</Text>
          </ScrollView>
        </LinearGradient>
      </Animated.View>
    </Modal>
  );
}

const ACCENT = '#3b9586';
const STROKE = 'rgba(59, 149, 134, 0.6)';
const CARD_BG = 'rgba(255, 255, 255, 0.04)';

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
  },
  sheet: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 32,
    gap: 24,
  },
  header: {
    gap: 16,
    alignItems: 'flex-start',
  },
  intro: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Figtree_300Light',
    color: ACCENT,
  },
  featureList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: CARD_BG,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.32,
  },
  featureBody: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Figtree_300Light',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: -0.14,
  },
  headline: {
    fontSize: 20,
    lineHeight: 26,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: Radius.m,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.55,
  },
  primaryBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.32,
  },
  cancelNote: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Figtree_300Light',
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: -8,
  },
});
