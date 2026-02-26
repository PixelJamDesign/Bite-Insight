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
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMyPlanSheet } from '@/lib/myPlanSheetContext';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import BiteInsightPlusLogo from '../assets/images/logo-biteinsight-plus.svg';

const SCREEN_HEIGHT = Dimensions.get('window').height;

function StatCard({
  iconName,
  count,
  label,
}: {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  count: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={iconName} size={32} color="#aad4cd" />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function MyPlanSheet() {
  const { visible, hideMyPlan } = useMyPlanSheet();
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const hasShownRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [flaggedCount, setFlaggedCount] = useState(0);
  const [familyCount, setFamilyCount] = useState(0);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);

  // Fetch stats when sheet opens
  useEffect(() => {
    if (visible && session?.user) {
      // Flagged ingredients + renewal date from profiles
      supabase
        .from('profiles')
        .select('flagged_ingredients, subscription_renewal_date')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          setFlaggedCount((data?.flagged_ingredients ?? []).length);
          setRenewalDate(data?.subscription_renewal_date ?? null);
        });

      // Family member count
      supabase
        .from('family_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .then(({ count }) => {
          setFamilyCount(count ?? 0);
        });
    }
  }, [visible, session]);

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

  function handleManageSubscription() {
    if (Platform.OS === 'ios') {
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  }

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={hideMyPlan}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={hideMyPlan}
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
        <TouchableOpacity style={styles.closeBtn} onPress={hideMyPlan} activeOpacity={0.8}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          {/* ── Logo + Active badge + Thank you ── */}
          <View style={styles.headerGroup}>
            <View style={styles.logoRow}>
              <BiteInsightPlusLogo width={190} height={50} />
              <View style={styles.activeBadge}>
                <View style={styles.activeTick}>
                  <Ionicons name="checkmark" size={11} color="#002923" />
                </View>
                <Text style={styles.activeText}>Active</Text>
              </View>
            </View>

            {/* ── Thank you message ── */}
            <Text style={styles.thankYou}>
              Thank you for being an amazing Bite Insight+ member
            </Text>
          </View>

          {/* ── Account summary ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your account summary</Text>
            <View style={styles.statsRow}>
              <StatCard iconName="people-outline" count={familyCount} label="Family members" />
              <StatCard iconName="flag-outline" count={flaggedCount} label="Flagged ingredients" />
            </View>
          </View>

          {/* ── Plan details ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your plan</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceAmount}>£3.99</Text>
              <Text style={styles.priceUnit}> / month</Text>
            </View>
            <Text style={styles.renewText}>
              {renewalDate
                ? `Renews ${new Date(renewalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'Your subscription is active'}
            </Text>
          </View>

          {/* ── Actions ── */}
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleManageSubscription}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Manage Subscription</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleManageSubscription}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel subscription</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.finePrint}>
            Your access continues until the end of your billing period.
          </Text>
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
    paddingTop: 96,
    paddingHorizontal: 32,
    gap: 32,
    paddingBottom: 8,
  },
  // ── Header group (logo + thank you) ──
  headerGroup: {
    gap: 12,
  },
  // ── Logo row ──
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00776f',
    borderRadius: 999,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    marginTop: 4,
  },
  activeTick: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#00c8b3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
  },
  // ── Thank you ──
  thankYou: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  // ── Section ──
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    lineHeight: 20,
  },
  // ── Stat cards ──
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(0,119,111,0.25)',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statCount: {
    fontSize: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.6,
    lineHeight: 36,
    textAlign: 'center',
    width: '100%',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
    lineHeight: 18,
    textAlign: 'center',
    width: '100%',
  },
  // ── Plan details ──
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
  renewText: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#aad4cd',
    letterSpacing: -0.14,
    lineHeight: 21,
    marginTop: -8,
  },
  // ── Actions ──
  actionsSection: {
    gap: 0,
    alignItems: 'center',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00776f',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
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
  cancelBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#aad4cd',
    letterSpacing: 0,
    lineHeight: 20,
  },
  // ── Fine print ──
  finePrint: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.26,
    lineHeight: 16,
  },
});
