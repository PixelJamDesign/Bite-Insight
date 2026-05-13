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
 * Visual spec from Figma node 4997:9763:
 *   - Family-photo hero fills the top ~360px of the screen.
 *   - A dark-teal panel slides up from the bottom with rounded top
 *     corners, containing the headline, three-step trial timeline,
 *     CTA, and cancellation note.
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
  Linking,
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

interface TimelineStep {
  day: string;
  body: string;
  state: 'active' | 'future';
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function TrialUpsellSheet() {
  const { visible, dismissTrialUpsell, recordConversion } = useTrialUpsell();
  const { isPlus, purchasing, priceString, trialDays, purchasePlus, restorePurchases } =
    useSubscription();
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

  // When the user converts (isPlus flips true while sheet is open),
  // mark the conversion in trial-upsell state, dismiss the sheet,
  // and route to the upgrade-success screen.
  useEffect(() => {
    if (isPlus && visible) {
      recordConversion();
      dismissTrialUpsell();
      router.replace('/upgrade-success');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlus]);

  if (!mounted) return null;

  // Resolve trial length for display copy. Default to 7 if the store
  // hasn't reported a parseable duration — matches the App Store
  // Connect / Play Console config.
  const displayTrialDays = trialDays ?? 7;
  const reminderDay = displayTrialDays - 1;

  const steps: TimelineStep[] = [
    {
      day: 'Today',
      body: 'Unlock full access to the Bite Insight+ membership.',
      state: 'active',
    },
    {
      day: `In ${reminderDay} day${reminderDay === 1 ? '' : 's'}`,
      body: "We'll send you a reminder that your trial is ending soon.",
      state: 'future',
    },
    {
      day: `In ${displayTrialDays} day${displayTrialDays === 1 ? '' : 's'}`,
      body: "You'll be charged, cancel anytime before.",
      state: 'future',
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
        {/* The image fill in Figma is a placeholder until you drop in
            the production family photo — overwrite
            assets/images/trial-hero-family.png with the exported
            asset from Figma, no code change needed. */}
        <Image
          source={require('@/assets/images/trial-hero-family.png')}
          style={styles.hero}
          resizeMode="cover"
        />

        {/* Close button — sits on the hero, top-right corner */}
        <TouchableOpacity
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={dismissTrialUpsell}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        {/* ── Bottom sheet panel ──────────────────────────────────── */}
        <View style={styles.sheet}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetContent,
              { paddingBottom: insets.bottom + 32 },
            ]}
            bounces={false}
          >
            {/* Logo + headline */}
            <View style={styles.headerGroup}>
              <BiteInsightPlusLogo width={164} height={42} />
              <Text style={styles.title}>
                Start your {displayTrialDays} day FREE trial
              </Text>
              <Text style={styles.subhead}>
                Get full access to Bite Insight+ for a week.
              </Text>
              <Text style={styles.subheadBody}>
                If you love it, keep it. If you don't, cancel it.
              </Text>
            </View>

            {/* Three-step trial timeline */}
            <View style={styles.timeline}>
              <View style={styles.timelineRail}>
                {steps.map((step, i) => (
                  <View key={i} style={styles.railCell}>
                    <View
                      style={[
                        styles.railDot,
                        step.state === 'active' && styles.railDotActive,
                      ]}
                    >
                      {step.state === 'active' && (
                        <Ionicons name="checkmark" size={12} color="#ffffff" />
                      )}
                    </View>
                    {i < steps.length - 1 && <View style={styles.railLine} />}
                  </View>
                ))}
              </View>
              <View style={styles.timelineCards}>
                {steps.map((step, i) => (
                  <View key={i} style={styles.stepCard}>
                    <Text style={styles.stepTitle}>{step.day}</Text>
                    <Text style={styles.stepBody}>{step.body}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* CTA + cancellation note */}
            <View style={styles.ctaGroup}>
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
                    Start your {displayTrialDays} day FREE trial for {priceString ?? '£0.00'}
                  </Text>
                )}
              </TouchableOpacity>
              <Text style={styles.cancelNote}>
                Cancel anytime in the {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}
              </Text>
            </View>

            {/* Legal row */}
            <View style={styles.legalRow}>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://biteinsight.co.uk/terms.html')}
                activeOpacity={0.6}
              >
                <Text style={styles.legalLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>·</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://biteinsight.co.uk/privacy.html')}
                activeOpacity={0.6}
              >
                <Text style={styles.legalLink}>Privacy</Text>
              </TouchableOpacity>
              <Text style={styles.legalSeparator}>·</Text>
              <TouchableOpacity onPress={restorePurchases} activeOpacity={0.6}>
                <Text style={styles.legalLink}>Restore</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    backgroundColor: '#001f1a',
  },
  hero: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 360,
    backgroundColor: '#001f1a',
  },
  closeBtn: {
    position: 'absolute',
    right: 24,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0,119,111,0.45)',
    borderWidth: 1,
    borderColor: '#023432',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sheet: {
    flex: 1,
    marginTop: 280,
    backgroundColor: '#002923',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  sheetContent: {
    paddingHorizontal: 32,
    paddingTop: 32,
    gap: 32,
  },

  // ── Header group ──
  headerGroup: {
    gap: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: -0.6,
    marginTop: 12,
  },
  subhead: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#3b9586',
    letterSpacing: -0.5,
    marginTop: 6,
  },
  subheadBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: -0.14,
  },

  // ── Timeline ──
  timeline: {
    flexDirection: 'row',
    gap: 10,
  },
  timelineRail: {
    width: 20,
    alignItems: 'center',
    paddingTop: 18,
  },
  railCell: {
    alignItems: 'center',
  },
  railDot: {
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: '#003d36',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railDotActive: {
    backgroundColor: '#3b9586',
    borderWidth: 1,
    borderColor: '#3b9586',
  },
  railLine: {
    width: 4,
    backgroundColor: '#003d36',
    height: 86,
    marginVertical: 0,
  },
  timelineCards: {
    flex: 1,
    gap: 8,
  },
  stepCard: {
    backgroundColor: 'rgba(0,119,111,0.25)',
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
  },
  stepBody: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: -0.14,
  },

  // ── CTA group ──
  ctaGroup: {
    gap: 4,
    alignItems: 'center',
  },
  primaryBtn: {
    backgroundColor: '#3b9586',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  cancelNote: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    letterSpacing: -0.14,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Legal row ──
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
