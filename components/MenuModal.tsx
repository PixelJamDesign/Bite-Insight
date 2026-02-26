import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  useWindowDimensions,
  Switch,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { PlusBadge } from './PlusBadge';
import {
  MenuDashboardIcon,
  MenuIngredientsIcon,
  MenuScannerIcon,
  MenuHistoryIcon,
  MenuRecipesIcon,
  MenuAccountIcon,
  MenuSettingsIcon,
  MenuLogoutIcon,
  MenuLikedIcon,
  MenuDislikedIcon,
  MenuFlaggedIcon,
  MenuPersonalIcon,
  MenuFamilyIcon,
  MenuLockIcon,
  MenuNotificationsIcon,
  MenuHelpIcon,
  MenuPrivacyIcon,
  MenuCookieIcon,
  MenuDataIcon,
  MenuChevronRightIcon,
  MenuArrowLeftIcon,
} from './MenuIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import BiteInsightPlusIcon from '../assets/icons/bite-insight-plus-menu-icon.svg';
import { Colors } from '@/constants/theme';
import { useTransition } from '@/lib/transitionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useMyPlanSheet } from '@/lib/myPlanSheetContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { UpsellBanner } from './UpsellBanner';
import {
  isBiometricAvailable,
  isBiometricEnabled,
  getBiometricLabel,
  disableBiometric,
} from '@/lib/biometrics';

type MenuScreen = 'main' | 'ingredients' | 'account' | 'settings' | 'security';

// ─── Shared sub-components ────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  chevron?: boolean;
  plus?: boolean;
}

function NavItem({ icon, label, onPress, chevron = false, plus = false }: NavItemProps) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.navIcon}>{icon}</View>
      <Text style={styles.navLabel} numberOfLines={1}>{label}</Text>
      {plus && <PlusBadge />}
      {chevron && (
        <MenuChevronRightIcon color={Colors.secondary} size={14} />
      )}
    </TouchableOpacity>
  );
}

function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>ver. 1.0.0</Text>
      <TouchableOpacity activeOpacity={0.7}>
        <Text style={[styles.footerText, styles.footerLink]}>Report a problem</Text>
      </TouchableOpacity>
    </View>
  );
}


// ─── Sub-screens ──────────────────────────────────────────────────────────────

function IngredientsScreen({ goBack, onGo }: { goBack: () => void; onGo: (route: any) => void }) {
  const { showUpsell } = useUpsellSheet();
  const { isPlus } = useSubscription();
  function goTo(tab: string) {
    onGo({ pathname: '/ingredient-preferences', params: { tab } });
  }
  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>My Ingredients</Text>
      </View>
      <View style={styles.navList}>
        <NavItem icon={<MenuLikedIcon color={Colors.secondary} size={16} />} label="Liked Ingredients" onPress={() => goTo('liked')} chevron />
        <NavItem icon={<MenuDislikedIcon color={Colors.secondary} size={16} />} label="Disliked Ingredients" onPress={() => goTo('disliked')} chevron />
        <NavItem icon={<MenuFlaggedIcon color={Colors.secondary} size={18} />} label="Flagged Ingredients" onPress={isPlus ? () => goTo('flagged') : showUpsell} chevron plus={!isPlus} />
      </View>
    </>
  );
}

function AccountScreen({ goBack, onGo }: { goBack: () => void; onGo: (route: any) => void }) {
  const { showUpsell } = useUpsellSheet();
  const { showMyPlan } = useMyPlanSheet();
  const { isPlus } = useSubscription();
  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>My Account</Text>
      </View>
      <View style={styles.navList}>
        <NavItem icon={<MenuPersonalIcon color={Colors.secondary} />} label="Edit My Details" onPress={() => onGo('/edit-profile')} />
        <NavItem icon={<MenuFamilyIcon color={Colors.secondary} />} label="Family Members" onPress={isPlus ? () => onGo('/family-members') : showUpsell} chevron plus={!isPlus} />
        <NavItem
          icon={<BiteInsightPlusIcon width={22} height={22} />}
          label="Bite Insight+"
          onPress={isPlus ? showMyPlan : showUpsell}
        />
        <NavItem icon={<MenuLockIcon color={Colors.secondary} />} label="Change password" onPress={() => {}} />
      </View>
    </>
  );
}

function SettingsScreen({ goBack, onNavigate }: { goBack: () => void; onNavigate: (s: MenuScreen) => void }) {
  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>Settings</Text>
      </View>
      <View style={styles.navList}>
        <NavItem icon={<MenuLockIcon color={Colors.secondary} />} label="Security" onPress={() => onNavigate('security')} chevron />
        <NavItem icon={<MenuNotificationsIcon color={Colors.secondary} />} label="Notifications" onPress={() => {}} />
        <NavItem icon={<MenuHelpIcon color={Colors.secondary} />} label="Help & Support" onPress={() => {}} />
        <NavItem icon={<MenuPrivacyIcon color={Colors.secondary} />} label="Privacy Policy" onPress={() => {}} />
        <NavItem icon={<MenuCookieIcon color={Colors.secondary} />} label="Cookie Policy" onPress={() => {}} />
        <NavItem icon={<MenuDataIcon color={Colors.secondary} />} label="My Data" onPress={() => {}} />
      </View>
    </>
  );
}

function SecurityScreen({ goBack }: { goBack: () => void }) {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState('Biometric Login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const avail = await isBiometricAvailable();
      setAvailable(avail);
      if (avail) {
        const [on, name] = await Promise.all([isBiometricEnabled(), getBiometricLabel()]);
        setEnabled(on);
        setLabel(name);
      }
      setLoading(false);
    })();
  }, []);

  async function handleToggle(value: boolean) {
    if (!value) {
      setEnabled(false);
      await disableBiometric();
    } else {
      // Can only enable from the login screen (credentials needed).
      // Show a hint instead of toggling on.
      setEnabled(false);
    }
  }

  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>Security</Text>
      </View>
      <View style={styles.navList}>
        {loading ? (
          <View style={styles.securityLoading}>
            <ActivityIndicator size="small" color={Colors.secondary} />
          </View>
        ) : available ? (
          <>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <View style={styles.navIcon}>
                  <MenuLockIcon color={Colors.secondary} />
                </View>
                <Text style={styles.navLabel}>{label}</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={handleToggle}
                trackColor={{ false: '#d6e8e5', true: Colors.accent }}
                thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                ios_backgroundColor="#d6e8e5"
              />
            </View>
            <Text style={styles.securityHint}>
              {enabled
                ? `${label} is enabled. You can sign in without typing your password.`
                : `Sign in with your email and password to enable ${label}.`}
            </Text>
          </>
        ) : (
          <Text style={styles.securityHint}>
            Biometric login is not available on this device. Please ensure you have Face ID, Touch ID, or fingerprint set up in your device settings.
          </Text>
        )}
      </View>
    </>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function MainScreen({
  onNavigate,
  onLogout,
  onGo,
}: {
  onNavigate: (s: MenuScreen) => void;
  onLogout: () => void;
  onGo: (route: any) => void;
}) {
  const { showUpsell } = useUpsellSheet();
  const { isPlus } = useSubscription();
  function go(route: string) {
    onGo(route);
  }

  return (
    <>
      <View style={styles.sectionGap}>
        <Text style={styles.whereLabel}>Where would you like to go?</Text>
        <View style={styles.navList}>
          <NavItem icon={<MenuDashboardIcon color={Colors.secondary} />} label="Dashboard" onPress={() => go('/(tabs)/')} />
          <NavItem icon={<MenuIngredientsIcon color={Colors.secondary} />} label="My Ingredients" onPress={() => onNavigate('ingredients')} chevron />
          <NavItem icon={<MenuScannerIcon color={Colors.secondary} />} label="Snack Scanner" onPress={() => go('/(tabs)/scanner')} />
          <NavItem icon={<MenuHistoryIcon color={Colors.secondary} />} label="Scan History" onPress={() => go('/(tabs)/history')} />
          <NavItem icon={<MenuRecipesIcon color={Colors.secondary} />} label="Recipes" onPress={() => go('/(tabs)/recipes')} />
        </View>
      </View>

      <View style={styles.sectionGap}>
        <View style={styles.navList}>
          <NavItem icon={<MenuAccountIcon color={Colors.secondary} />} label="My Account" onPress={() => onNavigate('account')} chevron />
          <NavItem icon={<MenuSettingsIcon color={Colors.secondary} />} label="Settings" onPress={() => onNavigate('settings')} chevron />
          <NavItem icon={<MenuLogoutIcon color={Colors.secondary} />} label="Log out" onPress={onLogout} />
        </View>
        <UpsellBanner />
      </View>
      <Footer />
    </>
  );
}

// ─── MenuModal (rendered inline, no Modal wrapper) ────────────────────────────

interface MenuModalProps {
  onClose: () => void;
  onNavigate: () => void;
}

export function MenuModal({ onClose, onNavigate }: MenuModalProps) {
  const { transitionTo } = useTransition();

  // Two permanent slots — one is always the front, one is always the back.
  // We never unmount a slot; we just swap which one is active. This avoids
  // any flash because the outgoing slot stays at opacity 1 until it animates out.
  const [frontIsA, setFrontIsA] = useState(true);
  const [slotAScreen, setSlotAScreen] = useState<MenuScreen>('main');
  const [slotBScreen, setSlotBScreen] = useState<MenuScreen>('main');
  const [isAnimating, setIsAnimating] = useState(false);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Header height: insets.top + 24 (paddingTop) + 36 (logo) + 16 (paddingBottom)
  const headerHeight = insets.top + 76;

  // Slot A starts as the visible front; slot B starts invisible behind it.
  const aSlideX = useRef(new Animated.Value(0)).current;
  const aFade = useRef(new Animated.Value(1)).current;
  const bSlideX = useRef(new Animated.Value(0)).current;
  const bFade = useRef(new Animated.Value(0)).current;

  function navigate(newScreen: MenuScreen, isBack = false) {
    if (isAnimating) return;
    const dir = isBack ? -1 : 1;
    setIsAnimating(true);

    if (frontIsA) {
      // A is outgoing (already at opacity 1), load new screen into B then slide B in
      setSlotBScreen(newScreen);
      bSlideX.setValue(dir * width * 0.22);
      bFade.setValue(0);
      Animated.parallel([
        Animated.timing(aSlideX, { toValue: -dir * width * 0.22, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(aFade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(bSlideX, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(bFade, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        aSlideX.setValue(0);
        aFade.setValue(0); // A is now the silent back slot
        setFrontIsA(false);
        setIsAnimating(false);
      });
    } else {
      // B is outgoing (already at opacity 1), load new screen into A then slide A in
      setSlotAScreen(newScreen);
      aSlideX.setValue(dir * width * 0.22);
      aFade.setValue(0);
      Animated.parallel([
        Animated.timing(bSlideX, { toValue: -dir * width * 0.22, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bFade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(aSlideX, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(aFade, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start(() => {
        bSlideX.setValue(0);
        bFade.setValue(0); // B is now the silent back slot
        setFrontIsA(true);
        setIsAnimating(false);
      });
    }
  }

  function handleClose() {
    // Reset both slots to clean state before closing
    aSlideX.setValue(0);
    aFade.setValue(1);
    bSlideX.setValue(0);
    bFade.setValue(0);
    setFrontIsA(true);
    setSlotAScreen('main');
    setSlotBScreen('main');
    setIsAnimating(false);
    onClose();
  }

  function handleNavigate(route: any) {
    // Reset slots, close the menu overlay, then hand off to the global
    // transition overlay (fade-to-surface → navigate → fade-out reveal).
    aSlideX.setValue(0);
    aFade.setValue(1);
    bSlideX.setValue(0);
    bFade.setValue(0);
    setFrontIsA(true);
    setSlotAScreen('main');
    setSlotBScreen('main');
    setIsAnimating(false);
    onNavigate();
    transitionTo(route);
  }

  async function handleLogout() {
    handleClose();
    await supabase.auth.signOut();
  }

  function renderScreenContent(s: MenuScreen) {
    if (s === 'main') {
      return <MainScreen onNavigate={(sc) => navigate(sc)} onGo={handleNavigate} onLogout={handleLogout} />;
    }
    if (s === 'ingredients') {
      return <><IngredientsScreen goBack={() => navigate('main', true)} onGo={handleNavigate} /><Footer /></>;
    }
    if (s === 'account') {
      return <><AccountScreen goBack={() => navigate('main', true)} onGo={handleNavigate} /><Footer /></>;
    }
    if (s === 'settings') {
      return <><SettingsScreen goBack={() => navigate('main', true)} onNavigate={(sc) => navigate(sc)} /><Footer /></>;
    }
    return <><SecurityScreen goBack={() => navigate('settings', true)} /><Footer /></>;
  }

  const sharedScrollProps = {
    contentContainerStyle: [styles.scrollContent, { paddingTop: headerHeight }] as any,
    showsVerticalScrollIndicator: false,
  };

  return (
    <View style={styles.container}>
      <Animated.ScrollView
        {...sharedScrollProps}
        style={[styles.scroll, styles.screenOverlay, { opacity: aFade, transform: [{ translateX: aSlideX }] }]}
        pointerEvents={frontIsA && !isAnimating ? 'auto' : 'none'}
      >
        {renderScreenContent(slotAScreen)}
      </Animated.ScrollView>
      <Animated.ScrollView
        {...sharedScrollProps}
        style={[styles.scroll, styles.screenOverlay, { opacity: bFade, transform: [{ translateX: bSlideX }] }]}
        pointerEvents={!frontIsA && !isAnimating ? 'auto' : 'none'}
      >
        {renderScreenContent(slotBScreen)}
      </Animated.ScrollView>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  screenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 24,
    flexGrow: 1,
  },
  sectionGap: {
    gap: 16,
  },
  whereLabel: {
    fontSize: 18,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.5,
    lineHeight: 30,
    paddingTop: 8,
  },
  navList: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: 16,
    gap: 16,
    overflow: 'hidden',
  },
  navIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  subHeader: {
    gap: 12,
    paddingTop: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  subTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 13,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
  },
  toggleLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  securityHint: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 20,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  securityLoading: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
