import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Image,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useSubscription } from '@/lib/subscriptionContext';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

// Feature icon image sources — local assets
const ICON_FAMILY   = require('@/assets/icons/upsell/family.webp');
const ICON_FLAG     = require('@/assets/icons/upsell/flag.webp');
const ICON_RECIPE   = require('@/assets/icons/upsell/recipes.webp');
const ICON_BARCODE  = require('@/assets/icons/upsell/barcode.webp');
const ICON_FREE     = require('@/assets/icons/upsell/plus.webp');

const FEATURES = [
  { icon: ICON_FAMILY,  label: 'Create and manage family profiles' },
  { icon: ICON_FLAG,    label: 'Report ingredients you want to avoid' },
  { icon: ICON_RECIPE,  label: 'Recipe ideas based on your preferences' },
  {
    icon: ICON_BARCODE,
    label: 'Global Barcode Scanner',
    subLabel: '(Access to over 4.2 million products - Powered by a global food database)',
  },
  { icon: ICON_FREE,    label: 'Plus everything in the free version' },
];

const SCREEN_HEIGHT = Dimensions.get('window').height;

function FeatureRow({
  icon,
  label,
  subLabel,
}: {
  icon: { uri: string };
  label: string;
  subLabel?: string;
}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconWrap}>
        <Image source={icon} style={styles.featureIcon} resizeMode="contain" />
      </View>
      <View style={styles.featureLabelCard}>
        <Text style={styles.featureLabelText}>{label}</Text>
        {subLabel && <Text style={styles.featureSubLabel}>{subLabel}</Text>}
      </View>
    </View>
  );
}

export function UpsellSheet() {
  const { visible, hideUpsell } = useUpsellSheet();
  const { isPlus, purchasing, priceString, purchasePlus, restorePurchases } = useSubscription();

  // When purchase completes (isPlus flips to true while the sheet is open),
  // dismiss the sheet and navigate to the success screen.
  useEffect(() => {
    if (isPlus && visible) {
      hideUpsell();
      router.replace('/upgrade-success');
    }
  }, [isPlus]);
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
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={hideUpsell}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={hideUpsell}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sheet — paid upsell. The free-trial variant is a separate
          component (TrialUpsellSheet) with its own trigger gate; this
          sheet is the *contextual* upsell shown when a user taps a
          Plus-locked feature, regardless of trial eligibility. */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={hideUpsell} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* ── Logo + Tagline ── */}
          <View style={styles.logoSection}>
            <BiteInsightPlusLogo width={190} height={50} />
            <Text style={styles.tagline}>
              Additional tools to support healthier food choices for you and your family.
            </Text>
          </View>

          {/* ── Features ── */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresTitle}>Bite Insight+ includes</Text>
            <View style={styles.featuresList}>
              {FEATURES.map((f) => (
                <FeatureRow key={f.label} icon={f.icon} label={f.label} subLabel={f.subLabel} />
              ))}
            </View>
          </View>

        </ScrollView>

        {/* ── Sticky Pricing + CTAs ── */}
        <View style={[styles.ctaSection, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.pricingSection}>
            <Text style={styles.pricingJust}>Just</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>{priceString ?? '£3.99'}</Text>
              <Text style={styles.priceUnit}> / month</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, purchasing && styles.primaryBtnDisabled]}
            activeOpacity={0.85}
            onPress={purchasePlus}
            disabled={purchasing}
          >
            {purchasing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Upgrade to Bite Insight+</Text>
            )}
          </TouchableOpacity>
          <Text style={styles.priceFineprint}>
            Subscription renews automatically. Cancel anytime.
          </Text>
          {/* "No thanks" — primary dismiss action per the latest Figma.
              Replaces the formal Terms/Privacy/Restore row as the most
              prominent secondary action; the legal links remain below
              at a smaller scale so App Review still finds them. */}
          <TouchableOpacity style={styles.noThanksBtn} onPress={hideUpsell} activeOpacity={0.6}>
            <Text style={styles.noThanksText}>No thanks</Text>
          </TouchableOpacity>
          <View style={styles.legalRow}>
            <TouchableOpacity onPress={() => Linking.openURL('https://biteinsight.co.uk/terms.html')} activeOpacity={0.6}>
              <Text style={styles.legalLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://biteinsight.co.uk/privacy.html')} activeOpacity={0.6}>
              <Text style={styles.legalLink}>Privacy</Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}>·</Text>
            <TouchableOpacity onPress={restorePurchases} activeOpacity={0.6}>
              <Text style={styles.legalLink}>Restore</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '92%',
    backgroundColor: '#002923',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 24,
    width: 48,
    height: 48,
    backgroundColor: 'rgba(0,119,111,0.25)',
    borderWidth: 1,
    borderColor: '#023432',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: 56,
    paddingHorizontal: 32,
    paddingBottom: 16,
    gap: 24,
  },
  // ── Logo + Tagline ──
  logoSection: {
    gap: 8,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#fff',
    lineHeight: 24,
  },
  // ── Features ──
  featuresSection: {
    gap: 16,
  },
  featuresTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  featuresList: {
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
  },
  featureLabelCard: {
    flex: 1,
    minHeight: 48,
    backgroundColor: 'rgba(0,119,111,0.25)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  featureLabelText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: 0,
    lineHeight: 20,
  },
  featureSubLabel: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#fff',
    letterSpacing: -0.14,
    lineHeight: 21,
    marginTop: 2,
  },
  // ── Pricing ──
  pricingSection: {
    gap: 0,
    alignSelf: 'flex-start',
    width: '100%',
  },
  pricingJust: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
  priceUnit: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  priceFineprint: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    letterSpacing: -0.14,
    lineHeight: 21,
    marginTop: 4,
  },
  // ── CTAs ──
  ctaSection: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 12,
    backgroundColor: '#002923',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: '#00776f',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    width: '100%',
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: 0,
    lineHeight: 20,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    width: '100%',
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#aad4cd',
    letterSpacing: 0,
    lineHeight: 20,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
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
  noThanksBtn: {
    paddingVertical: 12,
    marginTop: 4,
  },
  noThanksText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: 0,
    textAlign: 'center',
  },
});
