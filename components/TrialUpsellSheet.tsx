/**
 * TrialUpsellSheet — opportunistic, full-screen free-trial pitch.
 *
 * NOT the same flow as UpsellSheet. UpsellSheet is the contextual
 * upgrade prompt (shown when a user taps a Plus-locked feature).
 * This sheet is the *re-engagement* prompt — shown on app open
 * to a non-Plus user when the trigger rules in
 * `useTrialUpsellTrigger` decide to fire, regardless of what the
 * user was about to do.
 *
 * Visual spec from Figma node 4997:9763 (PIXEL-verified):
 *   - Family-photo hero fills the top ~335px of the screen.
 *   - A dark-teal panel sits flush against the hero's bottom edge
 *     with rounded top corners, padded 48px vertical / 32px
 *     horizontal, containing the headline, three-step trial
 *     timeline, CTA, and cancellation note.
 *   - The accent colour used for "Get full access…" and the active
 *     timeline dot is MINT (#00c8b3) — distinct from the green-apple
 *     (#3b9586) used for the primary button. Mint is currently
 *     a Figma-only variable; theme.ts has no token for it yet.
 *     TODO: add `Colors.accentMint` once approved by design.
 *
 * State is owned by `lib/trialUpsellContext`; this component is
 * a pure consumer of `visible` + `dismissTrialUpsell`.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTrialUpsell } from '@/lib/trialUpsellContext';
import { useSubscription } from '@/lib/subscriptionContext';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

// ── Figma-derived constants ───────────────────────────────────────────────────
// Mint accent used for the subhead + active timeline dot. Lives in
// Figma's `foreground/accent` / `Accents/Mint` variables but isn't
// in theme.ts yet. Keep hardcoded until a token lands.
const MINT = '#00c8b3';
const RAIL_INACTIVE = '#003d36';
const SURFACE_TERTIARY = 'rgba(0,119,111,0.25)';
const STROKE_PRIMARY = '#023432';
const ROOT_BG = '#001f1a';
const SHEET_BG = '#002923';
const BUTTON_BG = '#3b9586'; // Teal/green-apple — distinct from MINT

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface TimelineStep {
  day: string;
  body: string;
}

export function TrialUpsellSheet() {
  const { visible, dismissTrialUpsell, recordConversion } = useTrialUpsell();
  const { isPlus, purchasing, priceString, trialDays, purchasePlus } = useSubscription();
  const insets = useSafeAreaInsets();

  // Animation refs — slide-up from bottom with backdrop fade.
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

  // Auto-route to /upgrade-success only when the user transitions
  // from non-Plus → Plus *while the sheet is open* (i.e. a real
  // conversion). We snapshot the initial Plus state on open so an
  // already-Plus user (e.g. dev testing in the sim, or a stale state
  // collision) can still see the sheet UI without being instantly
  // bounced out.
  const initialIsPlusRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!visible) {
      initialIsPlusRef.current = null;
      return;
    }
    if (initialIsPlusRef.current === null) {
      initialIsPlusRef.current = isPlus;
      return;
    }
    if (initialIsPlusRef.current === false && isPlus) {
      recordConversion();
      dismissTrialUpsell();
      router.replace('/upgrade-success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isPlus]);

  if (!mounted) return null;

  const displayTrialDays = trialDays ?? 7;
  const reminderDay = displayTrialDays - 1;

  // Extract the currency symbol from priceString (e.g. "£3.99" → "£",
  // "$5.99" → "$", "€4.59" → "€") so the CTA's "for {currency}0.00"
  // line localises automatically. Falls back to £ for UK-first behaviour
  // when RC hasn't reported a price yet.
  const currencySymbol = priceString?.match(/^[^\d.,\s]+/)?.[0] ?? '£';
  const trialPriceLabel = `${currencySymbol}0.00`;

  const steps: TimelineStep[] = [
    {
      day: 'Today',
      body: 'Unlock full access to the Bite Insight+ membership.',
    },
    {
      // Lowercase 'in' to match Figma exactly (4997:12413).
      day: `in ${reminderDay} day${reminderDay === 1 ? '' : 's'}`,
      body: "We'll send you a reminder that your trial is ending soon.",
    },
    {
      day: `in ${displayTrialDays} day${displayTrialDays === 1 ? '' : 's'}`,
      // priceString is locale-aware (e.g. "£3.99" / "$5.99" / "€4.59")
      // so this line shows the right currency for each storefront.
      body: `You'll be charged ${priceString ?? '£3.99'} per month, cancel anytime before.`,
    },
  ];

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={dismissTrialUpsell}
      statusBarTranslucent
    >
      {/* Backdrop — tap-to-dismiss */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={dismissTrialUpsell}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[styles.root, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* ── Hero image ──────────────────────────────────────────── */}
        {/* The image is rendered top-anchored at full width so the
            family's faces sit at the very top of the screen and any
            crop happens at the BOTTOM of the image (where the sheet
            covers anyway). resizeMode='cover' would center-crop,
            chopping the heads — the wrapper + absolute child pattern
            anchors the image to the top instead. */}
        <View style={styles.heroContainer}>
          <Image
            source={require('@/assets/images/trial-hero-family.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* ── Bottom sheet panel ──────────────────────────────────── */}
        {/* Sheet is split into two stacked regions:
            1. ScrollView (flex:1) — header + timeline, scrolls if
               content overflows on shorter devices.
            2. Sticky footer — CTA + cancel note, always pinned to
               the bottom of the sheet so the primary action is
               thumb-reachable and visually anchors the screen. */}
        <View style={styles.sheet}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={dismissTrialUpsell}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollPart}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {/* Header group — logo + title + subhead */}
            <View style={styles.headerGroup}>
              <BiteInsightPlusLogo width={205} height={52} />
              <View style={styles.titleGroup}>
                <Text
                  style={styles.title}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Start your {displayTrialDays} day FREE trial
                </Text>
                <View style={styles.subheadGroup}>
                  <Text
                    style={styles.subhead}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    Get full access to Bite Insight+ for a week.
                  </Text>
                  <Text style={styles.subheadBody}>
                    If you love it, keep it. If you don't, cancel it.
                  </Text>
                </View>
              </View>
            </View>

            {/* Three-step trial timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineRail}>
                <View style={styles.activeDotWrapper}>
                  <View style={styles.activeDotInner}>
                    <View style={[styles.railDot, styles.railDotActive]}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </View>
                  </View>
                </View>
                <View style={styles.lineFirst} />
                <View style={styles.railDot} />
                <View style={styles.lineSecond} />
                <View style={styles.railDot} />
              </View>

              <View style={styles.timelineCards}>
                {steps.map((step, i) => (
                  <View
                    key={i}
                    style={[
                      styles.stepCard,
                      i < 2 ? styles.stepCardTall : styles.stepCardShort,
                    ]}
                  >
                    <Text style={styles.stepTitle}>{step.day}</Text>
                    <Text style={styles.stepBody}>{step.body}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Sticky footer — CTA + cancellation note */}
          <View
            style={[
              styles.stickyFooter,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
          >
            <TouchableOpacity
              style={[styles.primaryBtn, purchasing && styles.primaryBtnDisabled]}
              onPress={purchasePlus}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Start your {displayTrialDays} day FREE trial for {trialPriceLabel}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.cancelNote}>
              Cancel anytime in the {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

// Scaled down from Figma's 335pt (designed on a 912pt-tall frame) so
// the entire sheet — logo, title, three cards, CTA, cancel note —
// fits without scrolling on iPhone 16 Pro (852pt) and smaller. The
// hero still dominates visually; we just give the sheet body more
// room than the Figma frame allows.
const HERO_HEIGHT = 220;

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: ROOT_BG,
  },
  // Hero container — clips the image so excess height drops off the
  // BOTTOM (covered by the sheet) rather than being center-cropped.
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: ROOT_BG,
  },
  // Image inside the container — width: 100%, aspectRatio fixed to
  // the source asset's native ratio (420x336 ≈ 1.25:1). At full
  // screen width on iPhone 16 Pro this renders at ~314pt tall, of
  // which the bottom ~94pt gets clipped by the container's overflow
  // hidden — leaving the family's heads at the top intact.
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    aspectRatio: 420 / 336,
  },
  // Close button — sits inside the sheet, in the upper-right corner
  // just below the rounded top edge. Mirrors Figma 4997:9826 which
  // places the button 37px from the sheet's top edge.
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 18,
    width: 48,
    height: 48,
    backgroundColor: SURFACE_TERTIARY,
    borderWidth: 1,
    borderColor: STROKE_PRIMARY,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    // Elevation 3 from Figma: rgba(68,71,112,0.1) blur 12 y 12.
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(68,71,112,1)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      default: {},
    }),
  },
  // Sheet butts against the bottom edge of the hero. No overlap —
  // Figma puts the sheet's top edge at the hero's bottom edge.
  sheet: {
    position: 'absolute',
    top: HERO_HEIGHT,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  // Scrollable upper region — flex:1 so it absorbs available height,
  // leaving the sticky footer fixed at the bottom of the sheet.
  scrollPart: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 20,
  },
  // Sticky footer at the bottom of the sheet — CTA + cancel note.
  // Always visible regardless of content scroll position; sits flush
  // against the device's home indicator / safe area.
  stickyFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 4,
    alignItems: 'center',
    backgroundColor: SHEET_BG,
    // Subtle top border so the divide between scrolling content and
    // the sticky footer is visible when content sits behind it.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },

  // ── Header group ──
  // Figma 4997:9767 — column, gap 16 (gap/S), full width
  headerGroup: {
    gap: 16,
    width: '100%',
  },
  // Figma 4997:9769 — column, gap 8 (gap/XS)
  titleGroup: {
    gap: 8,
    width: '100%',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: -0.6,
  },
  // Figma 4997:12407 — column, gap 4 (gap/XXS)
  subheadGroup: {
    gap: 4,
    width: '100%',
  },
  // Body/Large — mint accent
  subhead: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: MINT,
    letterSpacing: -0.5,
  },
  // Body/Regular — white. NOT Body/Small (was 14/21/-0.14 before fix).
  subheadBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: 0,
  },

  // ── Timeline ──
  // Figma 4997:12425 — row, gap 16 (gap/S), items-start
  timeline: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
    width: '100%',
  },
  timelineRail: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Wrapper around the first (active) dot — pt:14 + inner pt:3 from
  // Figma. This nudges the active dot down so its centre aligns with
  // the title of card 1.
  activeDotWrapper: {
    paddingTop: 14,
  },
  activeDotInner: {
    paddingTop: 3,
  },
  // 26×26 circles — was 20 before fix.
  railDot: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: RAIL_INACTIVE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotActive: {
    backgroundColor: MINT,
    borderWidth: 1,
    borderColor: MINT,
  },
  // 5px wide rails — was 4. Heights match Figma node measurements.
  lineFirst: {
    width: 5,
    height: 79,
    backgroundColor: RAIL_INACTIVE,
  },
  lineSecond: {
    width: 5,
    height: 81,
    backgroundColor: RAIL_INACTIVE,
  },
  // Figma 4997:12427 — column, gap 8 (gap/XS), flex 1
  timelineCards: {
    flex: 1,
    gap: 8,
  },
  // Card padding 16 (margin/S), radius 16 (L), gap 4 (gap/XXS)
  stepCard: {
    backgroundColor: SURFACE_TERTIARY,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  // Card heights from Figma. Switched from `height` to `minHeight` so
  // localised / longer body copy doesn't clip when it wraps to more
  // lines than the original design assumed.
  stepCardTall: {
    minHeight: 98,
  },
  stepCardShort: {
    minHeight: 77,
  },
  // Heading 5 — 16/20 bold, letterSpacing 0
  stepTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: 0,
  },
  // Body/Small — 14/21 light. Letter spacing -0.14 per the inline
  // tailwind in the design context (the variable says -1 but tailwind
  // wins as it's the rendered value).
  // Step body — Body/Regular (16/24/0). Bumped from Body/Small per
  // the latest Figma update; matches the subhead body weight scale.
  stepBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: 0,
  },

  // ── CTA group ──
  // Figma 4997:9782 — column, gap 4, items-center justify-center
  ctaGroup: {
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  // Figma 4997:9783 — bg green-apple, radius 8 (M), px 24 (gap/M), py 16 (gap/S)
  primaryBtn: {
    backgroundColor: BUTTON_BG,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Drop shadow rgba(132,161,159,0.19) y:7 blur:7 — Figma "Elevation On Tint"
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(132,161,159,1)',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.19,
        shadowRadius: 7,
      },
      default: {},
    }),
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  // Heading 5 — 16/20 bold, ls 0
  primaryBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  // Body/Small — 14/21 light, ls -0.14, centered
  cancelNote: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: -0.14,
    textAlign: 'center',
    width: '100%',
  },

  // ── Legal row (extension to Figma — required for compliance) ──
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    fontSize: 12,
    color: '#aad4cd',
    opacity: 0.5,
  },
});
