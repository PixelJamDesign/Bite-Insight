/**
 * TrialUpsellSheet — full-screen, family-hero variant of the upsell.
 *
 * Shown to users who are eligible for the App Store / Play Store free
 * trial (i.e. haven't used one before on this account). The paid-only
 * sheet (current UpsellSheet content) is the fallback for everyone
 * else.
 *
 * Layout mirrors Figma node 4997:9763:
 *   - Hero image of a family fills the top ~360px of the screen.
 *   - A dark-teal panel slides up from the bottom with rounded top
 *     corners, containing the headline, three-step trial timeline,
 *     CTA, and cancellation note.
 *
 * The Modal + slide + backdrop wiring lives in the parent UpsellSheet
 * so we can swap this body in / out without re-implementing animations.
 */
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

interface TrialUpsellSheetProps {
  priceString: string | null;
  trialDays: number;
  purchasing: boolean;
  onClose: () => void;
  onStartTrial: () => void;
  onRestorePurchases: () => void;
}

interface TimelineStep {
  day: string;
  body: string;
  state: 'active' | 'future';
}

export function TrialUpsellSheet({
  priceString,
  trialDays,
  purchasing,
  onClose,
  onStartTrial,
  onRestorePurchases,
}: TrialUpsellSheetProps) {
  const insets = useSafeAreaInsets();

  // Localise day-count language for the two supported "future" steps.
  // Hardcoded English to match the rest of UpsellSheet; localise in a
  // future pass when the full sheet goes through i18n.
  const reminderDay = trialDays - 1;
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
      day: `In ${trialDays} day${trialDays === 1 ? '' : 's'}`,
      body: "You'll be charged, cancel anytime before.",
      state: 'future',
    },
  ];

  return (
    <View style={styles.root}>
      {/* ── Hero image ────────────────────────────────────────────── */}
      {/* Sits in the dark area above the sheet. The user needs to
          drop the real family photo into assets/images/trial-hero-
          family.png — Figma's MCP exporter returned a blank
          placeholder, so the file in-repo is a stub until you swap
          in the production asset. */}
      <Image
        source={require('@/assets/images/trial-hero-family.png')}
        style={styles.hero}
        resizeMode="cover"
      />

      {/* ── Close button — top-right, sits on the hero ───────────── */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>

      {/* ── Bottom sheet panel ───────────────────────────────────── */}
      <View style={styles.sheet}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.sheetContent,
            { paddingBottom: insets.bottom + 32 },
          ]}
          bounces={false}
        >
          {/* Logo + headline group */}
          <View style={styles.headerGroup}>
            <BiteInsightPlusLogo width={164} height={42} />
            <Text style={styles.title}>Start your {trialDays} day FREE trial</Text>
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

          {/* Primary CTA + cancellation note */}
          <View style={styles.ctaGroup}>
            <TouchableOpacity
              style={[styles.primaryBtn, purchasing && styles.primaryBtnDisabled]}
              onPress={onStartTrial}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  Start your {trialDays} day FREE trial for {priceString ?? '£0.00'}
                </Text>
              )}
            </TouchableOpacity>
            <Text style={styles.cancelNote}>
              Cancel anytime in the {Platform.OS === 'ios' ? 'App Store' : 'Play Store'}
            </Text>
          </View>

          {/* Legal row — terms + privacy + restore. Kept compact so
              the timeline + CTA remain the visual focus. */}
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
            <TouchableOpacity onPress={onRestorePurchases} activeOpacity={0.6}>
              <Text style={styles.legalLink}>Restore</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
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
    // Total step card height (98) + the 8px gap between cards minus
    // the dot dimensions — keeps the line meeting the dots cleanly.
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
