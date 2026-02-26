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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useSubscription } from '@/lib/subscriptionContext';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

// Feature icon image sources — sourced from Figma.
// Replace with local require() assets before going to production.
const ICON_FAMILY   = { uri: 'https://www.figma.com/api/mcp/asset/9113b1c6-0f94-465a-8bc0-bd4d5c5d0774' };
const ICON_FLAG     = { uri: 'https://www.figma.com/api/mcp/asset/f5c2d33c-946a-4c46-86dc-d5aeded3b5e7' };
const ICON_RECIPE   = { uri: 'https://www.figma.com/api/mcp/asset/475db745-dfb2-4d81-875d-3bbaacc23ac1' };
const ICON_BARCODE  = { uri: 'https://www.figma.com/api/mcp/asset/9dcb5e2a-6c18-4ee6-895d-fb9dc436abdd' };
const ICON_FREE     = { uri: 'https://www.figma.com/api/mcp/asset/9abc6e9b-b7d2-4b20-aaf1-3dbb2c8c09a3' };

const FEATURES = [
  { icon: ICON_FAMILY,  label: 'Create and manage family profiles' },
  { icon: ICON_FLAG,    label: 'Flag ingredients you want to avoid' },
  { icon: ICON_RECIPE,  label: 'Recipe ideas based on your preferences' },
  {
    icon: ICON_BARCODE,
    label: 'Barcode scanning for Global products',
    subLabel: '(Access to over 4.2 millions products - Powered by a global food database)',
  },
  { icon: ICON_FREE,    label: 'Plus, everything in the Free version' },
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
  const { isPlus, purchasing, purchasePlus, restorePurchases } = useSubscription();

  // Auto-dismiss the sheet the moment the user becomes a subscriber
  useEffect(() => {
    if (isPlus && visible) hideUpsell();
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

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 32 },
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
              Extra tools to support healthier food choices for you and your family.
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

          {/* ── Pricing ── */}
          <View style={styles.pricingSection}>
            <Text style={styles.pricingJust}>Just</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>£3.99</Text>
              <Text style={styles.priceUnit}> / month</Text>
            </View>
            <Text style={styles.priceFineprint}>
              Subscription renews automatically. Cancel anytime.
            </Text>
          </View>

          {/* ── CTAs ── */}
          <View style={styles.ctaSection}>
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
            <TouchableOpacity style={styles.secondaryBtn} onPress={hideUpsell} activeOpacity={0.7}>
              <Ionicons name="arrow-up" size={16} color="#aad4cd" />
              <Text style={styles.secondaryBtnText}>No thanks</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restoreBtn} onPress={restorePurchases} activeOpacity={0.6}>
              <Text style={styles.restoreBtnText}>Restore purchases</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    top: 24,
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
    paddingTop: 80,
    paddingHorizontal: 32,
    gap: 32,
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
  restoreBtn: {
    paddingVertical: 8,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    letterSpacing: -0.13,
    textDecorationLine: 'underline',
  },
});
