import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/theme';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useSubscription } from '@/lib/subscriptionContext';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

export function UpsellBanner() {
  const { showUpsell } = useUpsellSheet();
  const { isPlus } = useSubscription();
  if (isPlus) return null;
  return (
    <LinearGradient
      colors={['#023432', '#002923']}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.card}
    >
      <BiteInsightPlusLogo width={145} height={38} />
      <Text style={styles.tagline}>
        Get all the Plus+ features{'\n'}for just £3.99 a month
      </Text>
      <TouchableOpacity style={styles.btn} activeOpacity={0.85} onPress={showUpsell}>
        <Text style={styles.btnText}>Upgrade today</Text>
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
    gap: 16,
    alignItems: 'center',
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
