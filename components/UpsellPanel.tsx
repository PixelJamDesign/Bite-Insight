/**
 * UpsellPanel — inline Bite Insight+ upsell that lives on the dashboard.
 *
 * Replaces the smaller UpsellBanner. Leads with VALUE (four feature cards
 * stacked vertically — the desktop mock has them in a horizontal row,
 * which doesn't fit on a phone) and offers the trial as the primary
 * conversion lever when the user is eligible.
 *
 * Trial-eligible branch:
 *   Headline: "Try all the Bite Insight+ features FREE for 7 days!"
 *   CTA:      "Start your 7 day FREE trial for £0.00"
 *
 * Non-eligible branch (returning customer who's used their trial):
 *   Headline: "Get all the Bite Insight+ features for just £3.99 a month"
 *   CTA:      "Upgrade to Bite Insight+"
 *
 * "Cancel anytime in the App Store" sits below the CTA to address the
 * #1 objection. Tapping the CTA calls purchasePlus() directly — same
 * pattern as TrialUpsellSheet after the Nov fix. On success we route
 * to /upgrade-success.
 *
 * Hidden when the user is already Plus. Drop-in replacement for
 * <UpsellBanner /> in dashboard.tsx and MenuModal.tsx.
 */
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';
import { useSubscription } from '@/lib/subscriptionContext';
import { Radius } from '@/constants/theme';

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

export function UpsellPanel() {
  const { isPlus, purchasing, priceString, purchasePlus, trialEligible, trialDays } = useSubscription();
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

  return (
    <LinearGradient
      colors={['#023432', '#002923']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.panel}
    >
      {/* Header — logo */}
      <View style={styles.header}>
        <BiteInsightPlusLogo width={160} height={42} />
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

      {/* Headline + CTA */}
      <Text style={styles.headline}>{headline}</Text>
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

const ACCENT = '#3b9586';
const STROKE = 'rgba(59, 149, 134, 0.6)';
const CARD_BG = 'rgba(255, 255, 255, 0.04)';

const styles = StyleSheet.create({
  panel: {
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 20,
    gap: 20,
  },
  header: {
    gap: 12,
    alignItems: 'flex-start',
  },
  intro: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: 'Figtree_300Light',
    color: ACCENT,
    letterSpacing: -0.14,
  },
  featureList: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: STROKE,
    backgroundColor: CARD_BG,
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  featureText: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.3,
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: 'Figtree_300Light',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: -0.13,
  },
  headline: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.36,
  },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: Radius.m,
    paddingVertical: 16,
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
    marginTop: -12,
  },
});
