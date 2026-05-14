/**
 * TrialDay6ReminderSheet — in-app sheet shown on Day 6 of the trial.
 *
 * Same visual system as TrialUpsellSheet (hero + dark-teal sticky
 * panel) so users recognise the timeline pattern from when they
 * started the trial. Differences:
 *   - Hero image is the lifestyle shot (hand-holding-phone-among-veg),
 *     not the family photo. Day-6 user has been using the app; we want
 *     contextual not aspirational.
 *   - Title is "Your FREE trial ends tomorrow." — action-clear.
 *   - Two-card timeline (Today + Tomorrow), not three.
 *   - Two-button CTA: "Keep my subscription" (dismiss) + "Manage
 *     subscription" (deep-link to App Store / Play Store subs page).
 *
 * Trigger source: a push notification from a server-side cron job
 * (TODO — not yet wired). For now this sheet is only reachable via
 * the hidden debug menu so we can preview / QA the UI.
 *
 * Visual spec from Figma node 5022:8877.
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
  Linking,
  Platform,
  Modal,
  Animated,
  Dimensions,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTrialDay6Reminder } from '@/lib/trialDay6ReminderContext';
import { useSubscription } from '@/lib/subscriptionContext';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

// Figma-derived constants — same palette as TrialUpsellSheet so the
// two sheets feel like part of one flow.
const MINT = '#00c8b3';
const PALE = '#aad4cd';
const RAIL_INACTIVE = '#003d36';
const SURFACE_TERTIARY = 'rgba(0,119,111,0.25)';
const STROKE_PRIMARY = '#023432';
const ROOT_BG = '#001f1a';
const SHEET_BG = '#002923';
const BUTTON_BG = '#3b9586';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Hero trimmed from 220→180 to absorb the larger Body/Regular step
// copy without forcing scroll on iPhone 16 Pro. The hand+phone+
// produce composition remains readable at this height.
const HERO_HEIGHT = 180;

export function TrialDay6ReminderSheet() {
  const { visible, hideTrialDay6Reminder } = useTrialDay6Reminder();
  const { priceString, purchasing } = useSubscription();
  const insets = useSafeAreaInsets();

  // Slide-up + backdrop-fade animations — matches the trial sheet so
  // users get the same motion language.
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

  // ── Action handlers ──────────────────────────────────────────
  // "Keep my subscription" — just dismisses. The user's subscription
  // is already active; this is an affirmation tap with no
  // server-side change required.
  const handleKeep = () => {
    hideTrialDay6Reminder();
  };

  // "Manage subscription" — deep-links to the platform's subscription
  // management page. Same pattern used in MyPlanSheet so users have
  // one consistent path to cancellation.
  const handleManage = async () => {
    hideTrialDay6Reminder();
    if (Platform.OS === 'ios') {
      await Linking.openURL('https://apps.apple.com/account/subscriptions').catch(() => {});
    } else if (Platform.OS === 'android') {
      await Linking.openURL('https://play.google.com/store/account/subscriptions').catch(() => {});
    }
  };

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={hideTrialDay6Reminder}
      statusBarTranslucent
    >
      {/* Backdrop — tap to dismiss */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={hideTrialDay6Reminder}
          activeOpacity={1}
        />
      </Animated.View>

      <Animated.View
        style={[styles.root, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* ── Hero image ──────────────────────────────────────────── */}
        <View style={styles.heroContainer}>
          <Image
            source={require('@/assets/images/trial-day6-hero.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* ── Sheet panel ─────────────────────────────────────────── */}
        <View style={styles.sheet}>
          {/* Close button — top-right of the sheet, same placement
              as the trial sheet for consistency. */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={hideTrialDay6Reminder}
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
            {/* Header: logo + title + subhead + body */}
            <View style={styles.headerGroup}>
              <BiteInsightPlusLogo width={179} height={45} />
              <View style={styles.titleGroup}>
                <Text
                  style={styles.title}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  Your FREE trial ends tomorrow.
                </Text>
                <View style={styles.subheadGroup}>
                  <Text style={styles.subhead}>Loving Bite Insight+ so far?</Text>
                  <Text style={styles.subheadBody}>
                    If you love it, keep it. If you don't, cancel it.
                  </Text>
                </View>
              </View>
            </View>

            {/* Two-step timeline — Today (active mint) + Tomorrow (inactive) */}
            <View style={styles.timeline}>
              <View style={styles.timelineRail}>
                <View style={styles.activeDotWrapper}>
                  <View style={styles.activeDotInner}>
                    <View style={[styles.railDot, styles.railDotActive]}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </View>
                  </View>
                </View>
                <View style={styles.railLine} />
                <View style={styles.railDot} />
              </View>

              <View style={styles.timelineCards}>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>Today</Text>
                  <Text style={styles.stepBody}>
                    Your trial is ending. We're letting you know now so you have time to cancel if Bite Insight+ isn't for you.
                  </Text>
                </View>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>Tomorrow</Text>
                  <Text style={styles.stepBody}>
                    Your subscription begins. {priceString ?? '£3.99'} per month, cancel anytime before.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Sticky two-button footer */}
          <View
            style={[
              styles.stickyFooter,
              { paddingBottom: Math.max(insets.bottom, 16) + 16 },
            ]}
          >
            <TouchableOpacity
              style={[styles.primaryBtn, purchasing && styles.btnDisabled]}
              onPress={handleKeep}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Keep my subscription</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleManage}
              activeOpacity={0.75}
            >
              <Text style={styles.secondaryBtnText}>Manage subscription</Text>
              <Ionicons name="open-outline" size={16} color={PALE} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  // Hero clips so anything below the visible 220pt gets covered by
  // the sheet's rounded top corners.
  heroContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
    overflow: 'hidden',
    backgroundColor: ROOT_BG,
  },
  // Source image is 420×280 (aspect ratio ~1.5:1). Rendered at full
  // width with native aspect ratio, top-anchored, so the food + phone
  // composition stays composed and the bottom (which would be empty
  // wood texture) gets clipped behind the sheet.
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    aspectRatio: 420 / 280,
  },
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
  scrollPart: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 24,
  },

  // ── Header ──
  headerGroup: {
    gap: 16,
    width: '100%',
  },
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
  subheadGroup: {
    gap: 4,
    width: '100%',
  },
  subhead: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: MINT,
    letterSpacing: -0.5,
  },
  subheadBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: 0,
  },

  // ── Timeline (2 cards) ──
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
  activeDotWrapper: {
    paddingTop: 14,
  },
  activeDotInner: {
    paddingTop: 3,
  },
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
  // Figma 5022:8939 — line height 101.039px between the two dots
  // (taller than the trial sheet's lines because each card is taller
  // with the longer body copy).
  railLine: {
    width: 5,
    height: 101,
    backgroundColor: RAIL_INACTIVE,
  },
  timelineCards: {
    flex: 1,
    gap: 8,
  },
  stepCard: {
    backgroundColor: SURFACE_TERTIARY,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  stepTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: 0,
  },
  // Step body — Body/Regular (16/24/0) per latest Figma. Matches
  // the typography scale used by the trial sheet.
  stepBody: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: 0,
  },

  // ── Sticky footer with two CTAs ──
  stickyFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 8,
    alignItems: 'center',
    backgroundColor: SHEET_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  primaryBtn: {
    backgroundColor: BUTTON_BG,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
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
  primaryBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  // Secondary: 2px pale outline, transparent fill, with external-link
  // chevron icon. Matches Figma 5022:8966.
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: PALE,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(132,161,159,1)',
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: 0.19,
        shadowRadius: 14,
      },
      default: {},
    }),
  },
  secondaryBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: PALE,
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
