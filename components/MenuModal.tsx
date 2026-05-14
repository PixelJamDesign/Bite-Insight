import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmSheet } from './ConfirmSheet';
import { PolicySheet } from './PolicySheet';
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
  MenuFaceIdIcon,
  MenuNotificationsIcon,
  MenuHelpIcon,
  MenuPrivacyIcon,
  MenuCookieIcon,
  MenuDataIcon,
  MenuMarketingIcon,
  MenuOfflineDbIcon,
  MenuChevronRightIcon,
  MenuArrowLeftIcon,
  EmailIcon,
} from './MenuIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import BiteInsightPlusIcon from '../assets/icons/bite-insight-plus-menu-icon.svg';
import { useDebugMenu } from '@/lib/debugMenuContext';
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
import {
  fetchGlobalManifest,
  getDownloadedRegions,
  getRegionInfo,
  startDownload,
  cancelDownload,
  deleteOfflineDb,
  deleteAllOfflineDbs,
  GlobalManifest,
  RegionDbInfo,
  RegionCode,
  REGION_INFO,
  ALL_REGIONS,
} from '@/lib/offlineDatabase';

type MenuScreen = 'main' | 'ingredients' | 'account' | 'settings' | 'security' | 'mydata' | 'password' | 'offlinedb' | 'help' | 'marketing';

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
  const { t } = useTranslation('menu');
  const { showDebugMenu } = useDebugMenu();
  return (
    <View style={styles.footer}>
      {/* 3-second long-press on the version footer opens the hidden
          debug menu. Available in all builds (incl. TestFlight + App
          Store) so QA can drive sheet triggers and reset state on
          production-signed builds. Gesture is undiscoverable to real
          users — nobody long-presses a version number. */}
      <TouchableOpacity
        onLongPress={showDebugMenu}
        delayLongPress={3000}
        activeOpacity={1}
      >
        <Text style={styles.footerText}>{t('footer.version')}</Text>
      </TouchableOpacity>
      <TouchableOpacity activeOpacity={0.7} onPress={() => Linking.openURL('https://biteinsight.co.uk/report.html')}>
        <Text style={[styles.footerText, styles.footerLink]}>{t('footer.reportProblem')}</Text>
      </TouchableOpacity>
    </View>
  );
}


// ─── Sub-screens ──────────────────────────────────────────────────────────────

function IngredientsScreen({ goBack, onGo }: { goBack: () => void; onGo: (route: any) => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
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
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('ingredients.title')}</Text>
      </View>
      <View style={styles.navList}>
        <NavItem icon={<MenuLikedIcon color={Colors.secondary} size={16} />} label={t('ingredients.liked')} onPress={() => goTo('liked')} chevron />
        <NavItem icon={<MenuDislikedIcon color={Colors.secondary} size={16} />} label={t('ingredients.disliked')} onPress={() => goTo('disliked')} chevron />
        <NavItem icon={<MenuFlaggedIcon color={Colors.secondary} size={18} />} label={t('ingredients.flagged')} onPress={isPlus ? () => goTo('flagged') : showUpsell} chevron plus={!isPlus} />
      </View>
    </>
  );
}

function AccountScreen({ goBack, onGo, onNavigate }: { goBack: () => void; onGo: (route: any) => void; onNavigate: (s: MenuScreen) => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  const { showUpsell } = useUpsellSheet();
  const { showMyPlan } = useMyPlanSheet();
  const { isPlus } = useSubscription();
  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('account.title')}</Text>
      </View>
      <View style={styles.navList}>
        <NavItem icon={<MenuPersonalIcon color={Colors.secondary} />} label={t('account.editDetails')} onPress={() => onGo('/edit-profile')} />
        <NavItem icon={<MenuFamilyIcon color={Colors.secondary} />} label={t('account.familyMembers')} onPress={isPlus ? () => onGo('/family-members') : showUpsell} chevron plus={!isPlus} />
        <NavItem
          icon={<BiteInsightPlusIcon width={22} height={22} />}
          label={t('account.biteInsightPlus')}
          onPress={isPlus ? showMyPlan : showUpsell}
        />
      </View>
    </>
  );
}

function SettingsScreen({ goBack, onNavigate, onOpenPolicy }: { goBack: () => void; onNavigate: (s: MenuScreen) => void; onOpenPolicy: (type: 'privacy' | 'cookie') => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('settings.title')}</Text>
      </View>
      <View style={styles.navList}>
        <NavItem icon={<MenuLockIcon color={Colors.secondary} />} label={t('settings.security')} onPress={() => onNavigate('security')} chevron />
        {/* <NavItem icon={<MenuNotificationsIcon color={Colors.secondary} />} label={t('settings.notifications')} onPress={() => {}} /> */}
        <NavItem icon={<MenuHelpIcon color={Colors.secondary} />} label={t('settings.helpSupport')} onPress={() => onNavigate('help')} chevron />
        <NavItem icon={<MenuPrivacyIcon color={Colors.secondary} />} label={t('settings.privacyPolicy')} onPress={() => onOpenPolicy('privacy')} />
        <NavItem icon={<MenuCookieIcon color={Colors.secondary} />} label={t('settings.cookiePolicy')} onPress={() => onOpenPolicy('cookie')} />
        <NavItem icon={<MenuMarketingIcon color={Colors.secondary} size={24} />} label={t('settings.marketingPreferences')} onPress={() => onNavigate('marketing')} chevron />
        <NavItem icon={<MenuDataIcon color={Colors.secondary} />} label={t('settings.myData')} onPress={() => onNavigate('mydata')} chevron />
        {Platform.OS !== 'web' && (
          <NavItem
            icon={<MenuOfflineDbIcon color={Colors.secondary} size={24} />}
            label={t('settings.offlineDatabase')}
            onPress={isPlus ? () => onNavigate('offlinedb') : showUpsell}
            chevron
            plus={!isPlus}
          />
        )}
      </View>
    </>
  );
}

function HelpSupportScreen({ goBack, onGo }: { goBack: () => void; onGo: (route: string) => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('help.title')}</Text>
      </View>
      <View style={styles.navList}>
        <NavItem icon={<MenuHelpIcon color={Colors.secondary} />} label={t('help.helpGuides')} onPress={() => Linking.openURL('https://biteinsight.co.uk/contact.html')} chevron />
        <NavItem icon={<MenuHelpIcon color={Colors.secondary} />} label={t('help.faqs')} onPress={() => Linking.openURL('https://biteinsight.co.uk/contact.html')} chevron />
        <NavItem icon={<MenuHelpIcon color={Colors.secondary} />} label={t('help.appOnboarding')} onPress={() => onGo('/app-tour')} />
      </View>
    </>
  );
}

function SecurityScreen({ goBack, onNavigate }: { goBack: () => void; onNavigate: (s: MenuScreen) => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState(t('security.biometricLogin'));
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
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('security.title')}</Text>
      </View>
      <View style={styles.navList}>
        {loading ? (
          <View style={styles.securityLoading}>
            <ActivityIndicator size="small" color={Colors.secondary} />
          </View>
        ) : available ? (
          <View style={styles.toggleRow}>
            <View style={styles.toggleLeft}>
              <View style={styles.navIcon}>
                <MenuFaceIdIcon color={Colors.secondary} />
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
        ) : null}
        <NavItem icon={<MenuLockIcon color={Colors.secondary} />} label={t('account.changePassword')} onPress={() => onNavigate('password')} chevron />
      </View>
    </>
  );
}

// ─── Marketing Preferences screen ───────────────────────────────────────────

import UnreadEmailIcon from '../assets/icons/unread_email.svg';
import UnreadNotificationIcon from '../assets/icons/unread_notification.svg';

// ─── Custom Toggle (matches Figma: 48×28 track, 16×16 thumb) ────────────────

// Custom toggle matching Figma exactly:
// Track: 48×28, borderRadius 999 (pill)
// Handle: 16×16 ellipse at y=6
// OFF: track fill #FFFFFF, border 2px #AAD4CD, handle #00776F at x=6
// ON:  track fill #00776F, no border, handle #FFFFFF at x=26
const TOGGLE_W = 48;
const TOGGLE_H = 28;
const THUMB_SIZE = 16;
const THUMB_OFF_X = 6;
const THUMB_ON_X = 26;

function CustomToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: value ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [value]);

  const trackBg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#ffffff', '#00776f'] });
  const thumbColor = anim.interpolate({ inputRange: [0, 1], outputRange: ['#00776f', '#ffffff'] });
  const thumbX = anim.interpolate({ inputRange: [0, 1], outputRange: [THUMB_OFF_X, THUMB_ON_X] });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onValueChange(!value)}>
      <Animated.View style={{ width: TOGGLE_W, height: TOGGLE_H, borderRadius: 999, backgroundColor: trackBg, borderWidth: 2, borderColor: '#aad4cd' }}>
        <Animated.View style={{ width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 999, backgroundColor: thumbColor, position: 'absolute', top: 4, left: thumbX }} />
      </Animated.View>
    </TouchableOpacity>
  );
}

type MarketingPrefs = {
  promotional_emails: boolean;
  product_updates: boolean;
};

const DEFAULT_MARKETING_PREFS: MarketingPrefs = {
  promotional_emails: false,
  product_updates: false,
};

function MarketingPreferencesScreen({ goBack }: { goBack: () => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  const { session } = useAuth();
  const [prefs, setPrefs] = useState<MarketingPrefs>(DEFAULT_MARKETING_PREFS);
  const [savedPrefs, setSavedPrefs] = useState<MarketingPrefs>(DEFAULT_MARKETING_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasChanges = prefs.promotional_emails !== savedPrefs.promotional_emails
    || prefs.product_updates !== savedPrefs.product_updates;

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('marketing_preferences')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.marketing_preferences) {
          const loaded = { ...DEFAULT_MARKETING_PREFS, ...(data.marketing_preferences as MarketingPrefs) };
          setPrefs(loaded);
          setSavedPrefs(loaded);
        }
        setLoading(false);
      });
  }, [session?.user?.id]);

  function handleToggle(key: keyof MarketingPrefs, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!session?.user?.id) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ marketing_preferences: prefs })
      .eq('id', session.user.id);
    setSavedPrefs(prefs);
    setSaving(false);
  }

  const toggles: { key: keyof MarketingPrefs; label: string; hint: string; Icon: React.FC<{ width: number; height: number }> }[] = [
    {
      key: 'promotional_emails',
      label: t('marketingPreferences.promotionalEmails'),
      hint: t('marketingPreferences.promotionalHint'),
      Icon: UnreadEmailIcon,
    },
    {
      key: 'product_updates',
      label: t('marketingPreferences.productUpdates'),
      hint: t('marketingPreferences.productUpdatesHint'),
      Icon: UnreadNotificationIcon,
    },
  ];

  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('marketingPreferences.title')}</Text>
      </View>
      <View style={styles.navList}>
        {loading ? (
          <View style={styles.securityLoading}>
            <ActivityIndicator size="small" color={Colors.secondary} />
          </View>
        ) : (
          <>
            <View style={marketingStyles.cards}>
              {toggles.map((item) => (
                <View key={item.key} style={marketingStyles.card}>
                  <item.Icon width={24} height={24} />
                  <View style={marketingStyles.textCol}>
                    <Text style={marketingStyles.label}>{item.label}</Text>
                    <Text style={marketingStyles.hint}>{item.hint}</Text>
                  </View>
                  <CustomToggle
                    value={prefs[item.key]}
                    onValueChange={(v) => handleToggle(item.key, v)}
                  />
                </View>
              ))}
            </View>
            {hasChanges && (
              <TouchableOpacity
                style={marketingStyles.saveBtn}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={marketingStyles.saveBtnText}>{tc('buttons.save')}</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </>
  );
}

const marketingStyles = StyleSheet.create({
  cards: {
    gap: 4,
  },
  card: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    lineHeight: 17.6,
    letterSpacing: -0.32,
    color: Colors.primary,
  },
  hint: {
    fontFamily: 'Figtree_300Light',
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: -0.14,
    color: Colors.secondary,
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: {
    fontFamily: 'Figtree_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});

// ─── My Data screen ──────────────────────────────────────────────────────────

function MyDataScreen({ goBack }: { goBack: () => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  const { session } = useAuth();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stats, setStats] = useState({
    scanCount: 0,
    familyCount: 0,
    joinedAt: '',
  });

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [scansRes, familyRes, profileRes] = await Promise.all([
        supabase.from('scans').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('family_profiles').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('profiles').select('created_at').eq('id', userId).single(),
      ]);
      setStats({
        scanCount: scansRes.count ?? 0,
        familyCount: familyRes.count ?? 0,
        joinedAt: profileRes.data?.created_at
          ? new Date(profileRes.data.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
          : '',
      });
      setLoading(false);
    })();
  }, [userId]);

  // ── Confirm sheet state ──
  const [clearSheetVisible, setClearSheetVisible] = useState(false);
  const [closeSheetVisible, setCloseSheetVisible] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function confirmClearData() {
    if (!userId) return;
    setClearing(true);
    try {
      await Promise.all([
        supabase.from('scans').delete().eq('user_id', userId),
        supabase.from('family_profiles').delete().eq('user_id', userId),
      ]);
      setStats((prev) => ({ ...prev, scanCount: 0, familyCount: 0 }));
      setClearSheetVisible(false);
    } catch {
      Alert.alert(tc('error.title'), t('myData.error.clearFailed'));
    } finally {
      setClearing(false);
    }
  }

  async function handleExport() {
    if (!userId) return;
    setExporting(true);
    try {
      const [profileRes, scansRes, familyRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('scans').select('*').eq('user_id', userId).order('scanned_at', { ascending: false }),
        supabase.from('family_profiles').select('*').eq('user_id', userId),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileRes.data,
        scans: scansRes.data ?? [],
        family_profiles: familyRes.data ?? [],
      };

      const json = JSON.stringify(exportData, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bite-insight-data.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const path = `${FileSystem.cacheDirectory}bite-insight-data.json`;
        await FileSystem.writeAsStringAsync(path, json, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: t('myData.exportDialogTitle') });
      }
    } catch {
      Alert.alert(t('myData.error.exportFailedTitle'), t('myData.error.exportFailedMessage'));
    } finally {
      setExporting(false);
    }
  }

  async function confirmCloseAccount() {
    setDeleting(true);
    try {
      await supabase.from('profiles').delete().eq('id', userId!);
      await supabase.auth.signOut();
    } catch {
      Alert.alert(tc('error.title'), t('myData.error.closeFailed'));
      setDeleting(false);
      setCloseSheetVisible(false);
    }
  }

  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <View style={myDataStyles.titleRow}>
          <Text style={styles.subTitle}>{t('myData.title')}</Text>
          {stats.joinedAt ? (
            <Text style={myDataStyles.memberSince}>{t('myData.memberSince', { date: stats.joinedAt })}</Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.securityLoading}>
          <ActivityIndicator size="small" color={Colors.secondary} />
        </View>
      ) : (
        <View style={myDataStyles.sections}>
          {/* ── Data items ── */}
          <View style={styles.navList}>
            {/* Products scanned */}
            <View style={styles.navItem}>
              <View style={styles.navIcon}>
                <MenuScannerIcon color={Colors.secondary} />
              </View>
              <Text style={styles.navLabel}>{t('myData.productsScanned')}</Text>
              <Text style={myDataStyles.statValue}>{stats.scanCount}</Text>
            </View>

            {/* Family members */}
            <View style={styles.navItem}>
              <View style={styles.navIcon}>
                <MenuFamilyIcon color={Colors.secondary} />
              </View>
              <Text style={styles.navLabel}>{t('myData.familyMembers')}</Text>
              <Text style={myDataStyles.statValue}>{stats.familyCount}</Text>
            </View>

            {/* Download my data */}
            <TouchableOpacity
              style={[styles.navItem, myDataStyles.tallItem]}
              onPress={handleExport}
              activeOpacity={0.7}
              disabled={exporting}
            >
              <View style={styles.navIcon}>
                <Ionicons name="download-outline" size={24} color={Colors.secondary} />
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color={Colors.secondary} />
              ) : (
                <View style={myDataStyles.itemTextGroup}>
                  <Text style={styles.navLabel}>{t('myData.downloadMyData')}</Text>
                  <Text style={myDataStyles.itemSubtext}>{t('myData.downloadSubtext')}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Destructive zone ── */}
          <View style={styles.navList}>
            <Text style={myDataStyles.sectionHeading}>{t('myData.destructiveZone')}</Text>

            {/* Clear my data */}
            <TouchableOpacity
              style={[styles.navItem, myDataStyles.dangerItem, myDataStyles.tallItem]}
              onPress={() => setClearSheetVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.navIcon}>
                <Ionicons name="close-circle-outline" size={22} color={Colors.status.negative} />
              </View>
              <View style={myDataStyles.itemTextGroup}>
                <Text style={[styles.navLabel, myDataStyles.dangerLabel]}>{t('myData.clearMyData')}</Text>
                <Text style={myDataStyles.dangerSubtext}>{t('myData.clearSubtext')}</Text>
              </View>
            </TouchableOpacity>

            {/* Close my account */}
            <TouchableOpacity
              style={[styles.navItem, myDataStyles.dangerItem, myDataStyles.tallestItem]}
              onPress={() => setCloseSheetVisible(true)}
              activeOpacity={0.7}
              disabled={deleting}
            >
              <View style={styles.navIcon}>
                <MenuLogoutIcon color={Colors.status.negative} />
              </View>
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.status.negative} />
              ) : (
                <View style={myDataStyles.itemTextGroup}>
                  <Text style={[styles.navLabel, myDataStyles.dangerLabel]}>{t('myData.closeMyAccount')}</Text>
                  <Text style={myDataStyles.dangerSubtext}>
                    {t('myData.closeSubtext')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Confirmation sheets ── */}
      <ConfirmSheet
        visible={clearSheetVisible}
        onClose={() => setClearSheetVisible(false)}
        onConfirm={confirmClearData}
        title={t('myData.confirm.clearTitle')}
        description={t('myData.confirm.clearDescription')}
        confirmPhrase={t('myData.confirm.clearPhrase')}
        confirmLabel={t('myData.confirm.clearLabel')}
        loading={clearing}
      />
      <ConfirmSheet
        visible={closeSheetVisible}
        onClose={() => setCloseSheetVisible(false)}
        onConfirm={confirmCloseAccount}
        title={t('myData.confirm.closeTitle')}
        description={t('myData.confirm.closeDescription')}
        confirmPhrase={t('myData.confirm.deletePhrase')}
        confirmLabel={t('myData.confirm.closeLabel')}
        loading={deleting}
      />
    </>
  );
}

const myDataStyles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  memberSince: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  sections: {
    gap: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  tallItem: {
    height: 'auto' as any,
    minHeight: 72,
    paddingVertical: 12,
  },
  tallestItem: {
    height: 'auto' as any,
    minHeight: 72,
    paddingVertical: 12,
  },
  itemTextGroup: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
  },
  itemSubtext: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  dangerItem: {
    borderColor: Colors.status.negative,
    backgroundColor: 'rgba(255,47,97,0.1)',
  },
  dangerLabel: {
    color: Colors.status.negative,
  },
  dangerSubtext: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.status.negative,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
});

// ─── Offline Database screen (native only) ──────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type RegionState = {
  info: RegionDbInfo;
  remoteSize: number | null;
  remoteProductCount: number | null;
};

function OfflineDatabaseScreen({ goBack }: { goBack: () => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  const [regions, setRegions] = useState<Record<RegionCode, RegionState>>(() => {
    const init = {} as Record<RegionCode, RegionState>;
    for (const code of ALL_REGIONS) {
      init[code] = {
        info: { status: 'not-downloaded', version: null, productCount: null, fileSizeBytes: null, downloadProgress: 0, error: null },
        remoteSize: null,
        remoteProductCount: null,
      };
    }
    return init;
  });
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<RegionCode | 'all' | null>(null);

  // Load manifest + local status on mount
  useEffect(() => {
    (async () => {
      const [manifest, downloaded] = await Promise.all([
        fetchGlobalManifest(),
        getDownloadedRegions(),
      ]);

      // Fetch info for all downloaded regions
      const infos: Record<string, RegionDbInfo> = {};
      for (const code of downloaded) {
        infos[code] = await getRegionInfo(code);
      }

      setRegions((prev) => {
        const next = { ...prev };
        for (const code of ALL_REGIONS) {
          const remote = manifest?.regions?.[code];
          next[code] = {
            info: infos[code] ?? prev[code].info,
            remoteSize: remote?.sizeBytes ?? null,
            remoteProductCount: remote?.productCount ?? null,
          };
        }
        return next;
      });
      setLoading(false);
    })();
  }, []);

  async function handleDownload(region: RegionCode) {
    setRegions((prev) => ({
      ...prev,
      [region]: {
        ...prev[region],
        info: { ...prev[region].info, status: 'downloading', downloadProgress: 0, error: null },
      },
    }));

    try {
      await startDownload(region, (progress) => {
        setRegions((prev) => ({
          ...prev,
          [region]: {
            ...prev[region],
            info: { ...prev[region].info, downloadProgress: progress },
          },
        }));
      });

      const updated = await getRegionInfo(region);
      setRegions((prev) => ({
        ...prev,
        [region]: { ...prev[region], info: updated },
      }));
    } catch (err: any) {
      setRegions((prev) => ({
        ...prev,
        [region]: {
          ...prev[region],
          info: { ...prev[region].info, status: 'error', error: err?.message || 'Download failed.' },
        },
      }));
    }
  }

  async function handleCancel(region: RegionCode) {
    await cancelDownload(region);
    setRegions((prev) => ({
      ...prev,
      [region]: {
        ...prev[region],
        info: { ...prev[region].info, status: 'not-downloaded', downloadProgress: 0 },
      },
    }));
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    if (deleteTarget === 'all') {
      await deleteAllOfflineDbs();
      setRegions((prev) => {
        const next = { ...prev };
        for (const code of ALL_REGIONS) {
          next[code] = {
            ...prev[code],
            info: { status: 'not-downloaded', version: null, productCount: null, fileSizeBytes: null, downloadProgress: 0, error: null },
          };
        }
        return next;
      });
    } else {
      await deleteOfflineDb(deleteTarget);
      setRegions((prev) => ({
        ...prev,
        [deleteTarget]: {
          ...prev[deleteTarget],
          info: { status: 'not-downloaded', version: null, productCount: null, fileSizeBytes: null, downloadProgress: 0, error: null },
        },
      }));
    }
    setDeleteTarget(null);
  }

  // Compute totals
  const downloadedRegions = ALL_REGIONS.filter((c) => regions[c].info.status === 'ready');
  const totalBytes = downloadedRegions.reduce((sum, c) => sum + (regions[c].info.fileSizeBytes ?? 0), 0);

  // Visible regions = (published in the manifest) OR (already
  // downloaded locally — even if dropped from the manifest later).
  // Lets us list new RegionCode entries (e.g. India, Australia)
  // in ALL_REGIONS before their SQLite databases ship — they stay
  // hidden until the GitHub Releases manifest catches up.
  const visibleRegions = ALL_REGIONS.filter((c) => {
    const r = regions[c];
    return r.info.status === 'ready' || r.remoteSize !== null;
  });

  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('offlineDb.title')}</Text>
      </View>

      <View style={offlineDbStyles.sections}>
        <Text style={offlineDbStyles.description}>
          {t('offlineDb.description')}
        </Text>

        {loading ? (
          <View style={offlineDbStyles.checkingRow}>
            <ActivityIndicator size="small" color={Colors.secondary} />
            <Text style={offlineDbStyles.checkingText}>{t('offlineDb.loadingRegions')}</Text>
          </View>
        ) : (
          <>
            {/* ── Region list ── */}
            <View style={{ gap: 12 }}>
              {visibleRegions.map((code) => {
                const r = regions[code];
                const { label, flag } = REGION_INFO[code];
                const { status, downloadProgress, productCount, fileSizeBytes, error } = r.info;

                return (
                  <View key={code} style={offlineDbStyles.regionCard}>
                    {/* Header row: flag + label + size */}
                    <View style={offlineDbStyles.regionHeader}>
                      <Text style={offlineDbStyles.regionFlag}>{flag}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={offlineDbStyles.regionLabel}>{label}</Text>
                        <Text style={offlineDbStyles.regionMeta}>
                          {status === 'ready'
                            ? `${(productCount ?? 0).toLocaleString()} ${t('offlineDb.products')}  ·  ${fileSizeBytes ? formatBytes(fileSizeBytes) : '-'}`
                            : r.remoteProductCount
                              ? `${(r.remoteProductCount).toLocaleString()} ${t('offlineDb.products')}  ·  ${r.remoteSize ? formatBytes(r.remoteSize) : '-'}`
                              : r.remoteSize
                                ? formatBytes(r.remoteSize)
                                : ''
                          }
                        </Text>
                      </View>
                    </View>

                    {/* Action area */}
                    {status === 'not-downloaded' && (
                      <TouchableOpacity
                        style={offlineDbStyles.downloadBtn}
                        onPress={() => handleDownload(code)}
                        activeOpacity={0.7}
                      >
                        <MenuOfflineDbIcon color="#fff" size={18} />
                        <Text style={offlineDbStyles.downloadBtnText}>{t('offlineDb.downloadButton')}</Text>
                      </TouchableOpacity>
                    )}

                    {status === 'error' && (
                      <>
                        {error && <Text style={offlineDbStyles.errorText}>{error}</Text>}
                        <TouchableOpacity
                          style={offlineDbStyles.downloadBtn}
                          onPress={() => handleDownload(code)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="refresh-outline" size={18} color="#fff" />
                          <Text style={offlineDbStyles.downloadBtnText}>{t('offlineDb.retryButton')}</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {status === 'downloading' && (
                      <View style={{ gap: 8 }}>
                        <View style={offlineDbStyles.progressCard}>
                          <Text style={offlineDbStyles.progressLabel}>
                            {t('offlineDb.downloading', { percentage: Math.round(downloadProgress * 100) })}
                          </Text>
                          <View style={offlineDbStyles.progressTrack}>
                            <View
                              style={[
                                offlineDbStyles.progressFill,
                                { width: `${Math.round(downloadProgress * 100)}%` as any },
                              ]}
                            />
                          </View>
                        </View>
                        <TouchableOpacity onPress={() => handleCancel(code)} activeOpacity={0.7}>
                          <Text style={offlineDbStyles.cancelBtnText}>{tc('buttons.cancel')}</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {status === 'ready' && (
                      <View style={offlineDbStyles.readyRow}>
                        <View style={offlineDbStyles.readyBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={Colors.status.positive} />
                          <Text style={offlineDbStyles.readyText}>{t('offlineDb.downloaded')}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setDeleteTarget(code)}
                          activeOpacity={0.7}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={Colors.status.negative} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* ── Storage summary ── */}
            {downloadedRegions.length > 0 && (
              <View style={styles.navList}>
                <Text style={myDataStyles.sectionHeading}>{t('offlineDb.storageHeading')}</Text>
                <View style={styles.navItem}>
                  <View style={styles.navIcon}>
                    <MenuDataIcon color={Colors.secondary} />
                  </View>
                  <Text style={styles.navLabel}>{t('offlineDb.totalUsed')}</Text>
                  <Text style={myDataStyles.statValue}>
                    {formatBytes(totalBytes)} ({t('offlineDb.regionCount', { count: downloadedRegions.length })})
                  </Text>
                </View>
                {downloadedRegions.length > 1 && (
                  <TouchableOpacity
                    style={[styles.navItem, myDataStyles.dangerItem, myDataStyles.tallItem]}
                    onPress={() => setDeleteTarget('all')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.navIcon}>
                      <Ionicons name="trash-outline" size={22} color={Colors.status.negative} />
                    </View>
                    <View style={myDataStyles.itemTextGroup}>
                      <Text style={[styles.navLabel, myDataStyles.dangerLabel]}>{t('offlineDb.deleteAll')}</Text>
                      <Text style={myDataStyles.dangerSubtext}>{t('offlineDb.deleteAllSubtext')}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}
      </View>

      <ConfirmSheet
        visible={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget === 'all' ? t('offlineDb.confirm.deleteAllTitle') : t('offlineDb.confirm.deleteOneTitle', { label: deleteTarget ? REGION_INFO[deleteTarget as RegionCode]?.label : '' })}
        description={
          deleteTarget === 'all'
            ? t('offlineDb.confirm.deleteAllDescription')
            : t('offlineDb.confirm.deleteOneDescription', { label: deleteTarget ? REGION_INFO[deleteTarget as RegionCode]?.label : '' })
        }
        confirmPhrase={t('offlineDb.confirm.deletePhrase')}
        confirmLabel={deleteTarget === 'all' ? t('offlineDb.confirm.deleteAllLabel') : t('offlineDb.confirm.deleteOneLabel')}
      />
    </>
  );
}

const offlineDbStyles = StyleSheet.create({
  sections: {
    gap: 16,
  },
  description: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: 0,
    lineHeight: 24,
  },
  regionCard: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  regionFlag: {
    fontSize: 28,
  },
  regionLabel: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: 0,
    lineHeight: 20,
  },
  regionMeta: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.13,
    lineHeight: 18,
    marginTop: 2,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
    textAlign: 'center',
  },
  progressCard: {
    gap: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 3,
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readyText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.status.positive,
    letterSpacing: -0.28,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.status.negative,
    letterSpacing: -0.13,
    lineHeight: 18,
  },
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  checkingText: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
});

// ─── Change Password screen ──────────────────────────────────────────────────

const PLACEHOLDER = `${Colors.primary}80`;

const PW_RULES = [
  { key: 'length', prefixKey: 'password.rulePrefix.atLeast' as const, boldKey: 'password.rule.minLength' as const, test: (pw: string) => pw.length >= 8 },
  { key: 'upper', prefixKey: 'password.rulePrefix.one' as const, boldKey: 'password.rule.uppercase' as const, test: (pw: string) => /[A-Z]/.test(pw) },
  { key: 'lower', prefixKey: 'password.rulePrefix.one' as const, boldKey: 'password.rule.lowercase' as const, test: (pw: string) => /[a-z]/.test(pw) },
  { key: 'number', prefixKey: 'password.rulePrefix.one' as const, boldKey: 'password.rule.number' as const, test: (pw: string) => /\d/.test(pw) },
];

function ChangePasswordScreen({ goBack }: { goBack: () => void }) {
  const { t } = useTranslation('menu');
  const { t: tc } = useTranslation('common');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [currentFocused, setCurrentFocused] = useState(false);
  const [newFocused, setNewFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const allRulesPass = PW_RULES.every((r) => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const canSubmit = currentPassword.length > 0 && allRulesPass && passwordsMatch && !saving;

  function clearError() {
    if (error) setError('');
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setError(t('password.error.verifyFailed'));
        setSaving(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setError(t('password.error.incorrectCurrent'));
        setSaving(false);
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        setSaving(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError(t('password.error.generic'));
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <>
        <View style={pwStyles.successWrap}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.status.positive} />
          <Text style={pwStyles.successTitle}>{t('password.success.title')}</Text>
          <Text style={pwStyles.successBody}>
            {t('password.success.body')}
          </Text>
          <TouchableOpacity style={pwStyles.doneBtn} onPress={goBack} activeOpacity={0.85}>
            <Text style={pwStyles.doneBtnText}>{tc('buttons.done')}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>{tc('buttons.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>{t('password.title')}</Text>
      </View>

      <View style={pwStyles.form}>
        <Text style={pwStyles.subtitle}>
          {t('password.subtitle')}
        </Text>

        {/* Current password */}
        <View style={pwStyles.fieldGroup}>
          <Text style={pwStyles.label}>{t('password.label.current')}</Text>
          <View style={[pwStyles.inputWrapper, currentFocused && pwStyles.inputFocused]}>
            <View style={styles.navIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={pwStyles.input}
              placeholder={t('password.placeholder.current')}
              placeholderTextColor={PLACEHOLDER}
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={(v) => { setCurrentPassword(v); clearError(); }}
              onFocus={() => setCurrentFocused(true)}
              onBlur={() => setCurrentFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} activeOpacity={0.7}>
              <Ionicons name={showCurrent ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* New password */}
        <View style={pwStyles.fieldGroup}>
          <Text style={pwStyles.label}>{t('password.label.new')}</Text>
          <View style={[pwStyles.inputWrapper, newFocused && pwStyles.inputFocused]}>
            <View style={styles.navIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={pwStyles.input}
              placeholder={t('password.placeholder.new')}
              placeholderTextColor={PLACEHOLDER}
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); clearError(); }}
              onFocus={() => setNewFocused(true)}
              onBlur={() => setNewFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowNew((v) => !v)} activeOpacity={0.7}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {(newFocused || newPassword.length > 0) && (
            <View style={pwStyles.rules}>
              {PW_RULES.map((r) => {
                const pass = r.test(newPassword);
                return (
                  <View key={r.key} style={pwStyles.ruleRow}>
                    <Ionicons
                      name={pass ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={pass ? Colors.status.positive : `${Colors.primary}40`}
                    />
                    <Text style={[pwStyles.ruleText, { color: pass ? Colors.status.positive : Colors.primary }]}>
                      {t(r.prefixKey)}<Text style={pwStyles.ruleBold}>{t(r.boldKey)}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Confirm password */}
        <View style={pwStyles.fieldGroup}>
          <Text style={pwStyles.label}>{t('password.label.confirm')}</Text>
          <View style={[
            pwStyles.inputWrapper,
            confirmFocused && pwStyles.inputFocused,
            confirmPassword.length > 0 && !passwordsMatch && pwStyles.inputError,
          ]}>
            <View style={styles.navIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={pwStyles.input}
              placeholder={t('password.placeholder.confirm')}
              placeholderTextColor={PLACEHOLDER}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearError(); }}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} activeOpacity={0.7}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <Text style={pwStyles.mismatch}>{t('password.error.mismatch')}</Text>
          )}
        </View>

        {/* Error */}
        {error ? (
          <View style={pwStyles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.status.negative} />
            <Text style={pwStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[pwStyles.doneBtn, !canSubmit && pwStyles.doneBtnDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={!canSubmit}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={pwStyles.doneBtnText}>{t('password.button.update')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </>
  );
}

const pwStyles = StyleSheet.create({
  form: {
    gap: 20,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 22,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  inputFocused: {
    borderColor: Colors.secondary,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: Colors.status.negative,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
  },
  rules: {
    gap: 6,
    paddingTop: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 13,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    letterSpacing: -0.26,
    lineHeight: 18,
  },
  ruleBold: {
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
  },
  mismatch: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.status.negative,
    letterSpacing: -0.13,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,63,66,0.08)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Figtree_400Regular',
    color: Colors.status.negative,
    lineHeight: 20,
  },
  doneBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnDisabled: {
    opacity: 0.4,
  },
  doneBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: 0,
    lineHeight: 20,
  },
  successWrap: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 16,
    gap: 16,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.44,
  },
  successBody: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
});

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
  const { t } = useTranslation('menu');
  const { showUpsell } = useUpsellSheet();
  const { isPlus } = useSubscription();
  function go(route: string) {
    onGo(route);
  }

  return (
    <>
      <View style={styles.sectionGap}>
        <Text style={styles.whereLabel}>{t('main.whereLabel')}</Text>
        <View style={styles.navList}>
          <NavItem icon={<MenuDashboardIcon color={Colors.secondary} />} label={t('main.dashboard')} onPress={() => go('/(tabs)/dashboard')} />
          <NavItem icon={<MenuIngredientsIcon color={Colors.secondary} />} label={t('main.myIngredients')} onPress={() => onNavigate('ingredients')} chevron />
          <NavItem icon={<MenuScannerIcon color={Colors.secondary} />} label={t('main.foodScanner')} onPress={() => go('/(tabs)/scanner')} />
          <NavItem icon={<MenuHistoryIcon color={Colors.secondary} />} label={t('main.scanHistory')} onPress={() => go('/(tabs)/history')} />
          <NavItem icon={<MenuRecipesIcon color={Colors.secondary} />} label={t('main.recipes')} onPress={() => go('/(tabs)/recipes')} />
        </View>
      </View>

      <View style={styles.sectionGap}>
        <View style={styles.navList}>
          <NavItem icon={<MenuAccountIcon color={Colors.secondary} />} label={t('main.myAccount')} onPress={() => onNavigate('account')} chevron />
          <NavItem icon={<MenuSettingsIcon color={Colors.secondary} />} label={t('main.settings')} onPress={() => onNavigate('settings')} chevron />
          <NavItem icon={<MenuLogoutIcon color={Colors.secondary} />} label={t('main.logOut')} onPress={onLogout} />
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
  // Combined into a single state object so frontIsA + isAnimating update
  // atomically in one render — prevents the 1-frame flicker on Android where
  // one value updates before the other.
  const [slotState, setSlotState] = useState({ frontIsA: true, isAnimating: false });
  const { frontIsA, isAnimating } = slotState;
  const [slotAScreen, setSlotAScreen] = useState<MenuScreen>('main');
  const [slotBScreen, setSlotBScreen] = useState<MenuScreen>('main');
  const [policyType, setPolicyType] = useState<'privacy' | 'cookie' | null>(null);

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Header height: insets.top + 24 (paddingTop) + 36 (logo) + 16 (paddingBottom)
  const headerHeight = insets.top + 76;

  // Slot A starts as the visible front; slot B starts invisible behind it.
  const aSlideX = useRef(new Animated.Value(0)).current;
  const aFade = useRef(new Animated.Value(1)).current;
  const bSlideX = useRef(new Animated.Value(0)).current;
  const bFade = useRef(new Animated.Value(0)).current;

  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(newScreen: MenuScreen, isBack = false) {
    if (isAnimating) return;
    const dir = isBack ? -1 : 1;
    const slideDistance = width * 0.22;
    setSlotState(prev => ({ ...prev, isAnimating: true }));

    // Safety timeout — if animation callback never fires (Android edge case),
    // unlock interaction after the animation duration + buffer.
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    animTimeoutRef.current = setTimeout(() => {
      setSlotState(prev => ({ ...prev, isAnimating: false }));
    }, 500);

    // Animation config: crossfade with subtle slide.
    // Outgoing fades out quickly while incoming fades in with a slight delay,
    // giving a clean crossfade feel without the jarring parallel slide.
    const DURATION = 280;
    const FADE_OUT = 160;
    const INCOMING_DELAY = 60;

    if (frontIsA) {
      setSlotBScreen(newScreen);
      requestAnimationFrame(() => {
        bSlideX.setValue(dir * slideDistance);
        bFade.setValue(0);
        Animated.parallel([
          // Outgoing: slide + fade out
          Animated.timing(aSlideX, { toValue: -dir * slideDistance, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(aFade, { toValue: 0, duration: FADE_OUT, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          // Incoming: slide in + delayed fade in
          Animated.timing(bSlideX, { toValue: 0, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(INCOMING_DELAY),
            Animated.timing(bFade, { toValue: 1, duration: DURATION - INCOMING_DELAY, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
          aSlideX.setValue(0);
          aFade.setValue(0);
          setSlotState({ frontIsA: false, isAnimating: false });
        });
      });
    } else {
      setSlotAScreen(newScreen);
      requestAnimationFrame(() => {
        aSlideX.setValue(dir * slideDistance);
        aFade.setValue(0);
        Animated.parallel([
          // Outgoing: slide + fade out
          Animated.timing(bSlideX, { toValue: -dir * slideDistance, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(bFade, { toValue: 0, duration: FADE_OUT, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          // Incoming: slide in + delayed fade in
          Animated.timing(aSlideX, { toValue: 0, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(INCOMING_DELAY),
            Animated.timing(aFade, { toValue: 1, duration: DURATION - INCOMING_DELAY, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          ]),
        ]).start(() => {
          if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
          bSlideX.setValue(0);
          bFade.setValue(0);
          setSlotState({ frontIsA: true, isAnimating: false });
        });
      });
    }
  }

  function handleClose() {
    // Reset both slots to clean state before closing
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    aSlideX.setValue(0);
    aFade.setValue(1);
    bSlideX.setValue(0);
    bFade.setValue(0);
    setSlotState({ frontIsA: true, isAnimating: false });
    setSlotAScreen('main');
    setSlotBScreen('main');
    onClose();
  }

  function handleNavigate(route: any) {
    // Reset slots, close the menu overlay, then hand off to the global
    // transition overlay (fade-to-surface → navigate → fade-out reveal).
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    aSlideX.setValue(0);
    aFade.setValue(1);
    bSlideX.setValue(0);
    bFade.setValue(0);
    setSlotState({ frontIsA: true, isAnimating: false });
    setSlotAScreen('main');
    setSlotBScreen('main');
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
      return <><AccountScreen goBack={() => navigate('main', true)} onGo={handleNavigate} onNavigate={(sc) => navigate(sc)} /><Footer /></>;
    }
    if (s === 'settings') {
      return <><SettingsScreen goBack={() => navigate('main', true)} onNavigate={(sc) => navigate(sc)} onOpenPolicy={setPolicyType} /><Footer /></>;
    }
    if (s === 'marketing') {
      return <><MarketingPreferencesScreen goBack={() => navigate('settings', true)} /><Footer /></>;
    }
    if (s === 'mydata') {
      return <><MyDataScreen goBack={() => navigate('settings', true)} /><Footer /></>;
    }
    if (s === 'offlinedb') {
      return <><OfflineDatabaseScreen goBack={() => navigate('settings', true)} /><Footer /></>;
    }
    if (s === 'password') {
      return <><ChangePasswordScreen goBack={() => navigate('security', true)} /><Footer /></>;
    }
    if (s === 'help') {
      return <><HelpSupportScreen goBack={() => navigate('settings', true)} onGo={handleNavigate} /><Footer /></>;
    }
    return <><SecurityScreen goBack={() => navigate('settings', true)} onNavigate={(s) => navigate(s)} /><Footer /></>;
  }

  const sharedScrollProps = {
    contentContainerStyle: [styles.scrollContent, { paddingTop: headerHeight, paddingBottom: 32 + (Platform.OS === 'android' ? insets.bottom : 0) }] as any,
    showsVerticalScrollIndicator: false,
  };

  const aIsActive = frontIsA && !isAnimating;
  const bIsActive = !frontIsA && !isAnimating;

  return (
    <View style={styles.container}>
      {/* Wrap each slot in a plain View for reliable pointerEvents + zIndex on Android.
          Hide the back slot entirely when not animating to prevent ghosting artifacts. */}
      <View
        style={[
          styles.screenOverlay,
          { zIndex: frontIsA ? 1 : 0 },
          !frontIsA && !isAnimating && styles.hiddenSlot,
        ]}
        pointerEvents={aIsActive ? 'auto' : 'none'}
      >
        <Animated.ScrollView
          {...sharedScrollProps}
          style={[styles.scroll, { opacity: aFade, transform: [{ translateX: aSlideX }] }]}
        >
          {renderScreenContent(slotAScreen)}
        </Animated.ScrollView>
      </View>
      <View
        style={[
          styles.screenOverlay,
          { zIndex: frontIsA ? 0 : 1 },
          frontIsA && !isAnimating && styles.hiddenSlot,
        ]}
        pointerEvents={bIsActive ? 'auto' : 'none'}
      >
        <Animated.ScrollView
          {...sharedScrollProps}
          style={[styles.scroll, { opacity: bFade, transform: [{ translateX: bSlideX }] }]}
        >
          {renderScreenContent(slotBScreen)}
        </Animated.ScrollView>
      </View>

      {policyType && (
        <PolicySheet
          visible={!!policyType}
          onClose={() => setPolicyType(null)}
          type={policyType}
        />
      )}
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
    backgroundColor: '#fff',
  },
  hiddenSlot: {
    opacity: 0,
  },
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    paddingHorizontal: 24,
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
