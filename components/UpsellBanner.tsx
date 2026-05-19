/**
 * UpsellBanner — ambient Bite Insight+ prompt that lives in the menu
 * and on the dashboard.
 *
 * Trial-eligible users see the FREE trial pitch (much stronger
 * conversion lever); everyone else sees the standard monthly price.
 * Tapping the button opens the full UpsellSheet (V2 if wired) where
 * the actual purchase is made.
 */
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useSubscription } from '@/lib/subscriptionContext';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

export function UpsellBanner() {
  const { showUpsell } = useUpsellSheet();
  const { isPlus, priceString, trialEligible, trialDays } = useSubscription();
  if (isPlus) return null;

  // Trial-aware copy. When the user is eligible we lead with the FREE
  // trial — the strongest conversion lever. When not (returning user
  // who's already used their trial), fall back to the monthly price.
  const days = trialDays ?? 7;
  const headline = trialEligible
    ? `Try Bite Insight+\nFREE for ${days} days`
    : `Get all the Plus+ features\nfor just ${priceString ?? '£3.99'} a month`;
  const subline = trialEligible
    ? `Then ${priceString ?? '£3.99'} a month. Cancel anytime.`
    : null;
  const ctaLabel = trialEligible ? 'Start your free trial' : 'Upgrade today';

  return (
    <LinearGradient
      colors={['#023432', '#002923']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.card}
    >
      <BiteInsightPlusLogo width={145} height={38} />
      <View style={styles.copyBlock}>
        <Text style={styles.tagline}>{headline}</Text>
        {subline && <Text style={styles.subline}>{subline}</Text>}
      </View>
      <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={showUpsell}>
        <Text style={styles.btnText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 12,
    alignItems: 'center',
  },
  copyBlock: {
    alignItems: 'center',
    gap: 4,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  subline: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    letterSpacing: -0.13,
    lineHeight: 17,
  },
  btn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: 0,
  },
});
