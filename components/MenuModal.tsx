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
  Alert,
  TextInput,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { ConfirmSheet } from './ConfirmSheet';
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
  MenuChevronRightIcon,
  MenuArrowLeftIcon,
} from './MenuIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
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

type MenuScreen = 'main' | 'ingredients' | 'account' | 'settings' | 'security' | 'mydata' | 'password' | 'offlinedb';

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

function AccountScreen({ goBack, onGo, onNavigate }: { goBack: () => void; onGo: (route: any) => void; onNavigate: (s: MenuScreen) => void }) {
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
        <NavItem icon={<MenuLockIcon color={Colors.secondary} />} label="Change password" onPress={() => onNavigate('password')} chevron />
      </View>
    </>
  );
}

function SettingsScreen({ goBack, onNavigate }: { goBack: () => void; onNavigate: (s: MenuScreen) => void }) {
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
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
        <NavItem icon={<MenuDataIcon color={Colors.secondary} />} label="My Data" onPress={() => onNavigate('mydata')} chevron />
        {Platform.OS !== 'web' && (
          <NavItem
            icon={<Ionicons name="cloud-download-outline" size={22} color={Colors.secondary} />}
            label="Offline Database"
            onPress={isPlus ? () => onNavigate('offlinedb') : showUpsell}
            chevron
            plus={!isPlus}
          />
        )}
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

// ─── My Data screen ──────────────────────────────────────────────────────────

function MyDataScreen({ goBack }: { goBack: () => void }) {
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
      Alert.alert('Error', 'Failed to clear your data. Please try again.');
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
        await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export your data' });
      }
    } catch {
      Alert.alert('Export failed', 'Something went wrong while exporting your data. Please try again.');
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
      Alert.alert('Error', 'Failed to close your account. Please contact support.');
      setDeleting(false);
      setCloseSheetVisible(false);
    }
  }

  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={myDataStyles.titleRow}>
          <Text style={styles.subTitle}>Your Data</Text>
          {stats.joinedAt ? (
            <Text style={myDataStyles.memberSince}>Member since: {stats.joinedAt}</Text>
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
              <Text style={styles.navLabel}>Products scanned</Text>
              <Text style={myDataStyles.statValue}>{stats.scanCount}</Text>
            </View>

            {/* Family members */}
            <View style={styles.navItem}>
              <View style={styles.navIcon}>
                <MenuFamilyIcon color={Colors.secondary} />
              </View>
              <Text style={styles.navLabel}>Family members</Text>
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
                  <Text style={styles.navLabel}>Download my data</Text>
                  <Text style={myDataStyles.itemSubtext}>Export all your data as a JSON file.</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Destructive zone ── */}
          <View style={styles.navList}>
            <Text style={myDataStyles.sectionHeading}>Destructive zone</Text>

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
                <Text style={[styles.navLabel, myDataStyles.dangerLabel]}>Clear my data</Text>
                <Text style={myDataStyles.dangerSubtext}>This will clear all current data on this account.</Text>
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
                  <Text style={[styles.navLabel, myDataStyles.dangerLabel]}>Close my account</Text>
                  <Text style={myDataStyles.dangerSubtext}>
                    Permanently delete your account and all associated data. This cannot be undone.
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
        title="Clear all your data?"
        description="This will permanently delete your scan history and all family profiles. Your account and preferences will remain intact."
        confirmPhrase="CLEAR"
        confirmLabel="Clear my data"
        loading={clearing}
      />
      <ConfirmSheet
        visible={closeSheetVisible}
        onClose={() => setCloseSheetVisible(false)}
        onConfirm={confirmCloseAccount}
        title="Close your account?"
        description="This will permanently delete your profile, scan history, family members, preferences, and all associated data. This action cannot be undone."
        confirmPhrase="DELETE"
        confirmLabel="Close my account"
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

  return (
    <>
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <MenuArrowLeftIcon color={Colors.secondary} size={16} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>Offline Database</Text>
      </View>

      <View style={offlineDbStyles.sections}>
        <Text style={offlineDbStyles.description}>
          Download regional food databases for offline barcode scanning. Once downloaded, scans work without an internet connection.
        </Text>

        {loading ? (
          <View style={offlineDbStyles.checkingRow}>
            <ActivityIndicator size="small" color={Colors.secondary} />
            <Text style={offlineDbStyles.checkingText}>Loading regions...</Text>
          </View>
        ) : (
          <>
            {/* ── Region list ── */}
            <View style={{ gap: 12 }}>
              {ALL_REGIONS.map((code) => {
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
                            ? `${(productCount ?? 0).toLocaleString()} products  ·  ${fileSizeBytes ? formatBytes(fileSizeBytes) : '-'}`
                            : r.remoteProductCount
                              ? `${(r.remoteProductCount).toLocaleString()} products  ·  ${r.remoteSize ? formatBytes(r.remoteSize) : '-'}`
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
                        <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                        <Text style={offlineDbStyles.downloadBtnText}>Download</Text>
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
                          <Text style={offlineDbStyles.downloadBtnText}>Retry</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {status === 'downloading' && (
                      <View style={{ gap: 8 }}>
                        <View style={offlineDbStyles.progressCard}>
                          <Text style={offlineDbStyles.progressLabel}>
                            Downloading... {Math.round(downloadProgress * 100)}%
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
                          <Text style={offlineDbStyles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {status === 'ready' && (
                      <View style={offlineDbStyles.readyRow}>
                        <View style={offlineDbStyles.readyBadge}>
                          <Ionicons name="checkmark-circle" size={16} color={Colors.status.positive} />
                          <Text style={offlineDbStyles.readyText}>Downloaded</Text>
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
                <Text style={myDataStyles.sectionHeading}>Storage</Text>
                <View style={styles.navItem}>
                  <View style={styles.navIcon}>
                    <MenuDataIcon color={Colors.secondary} />
                  </View>
                  <Text style={styles.navLabel}>Total used</Text>
                  <Text style={myDataStyles.statValue}>
                    {formatBytes(totalBytes)} ({downloadedRegions.length} {downloadedRegions.length === 1 ? 'region' : 'regions'})
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
                      <Text style={[styles.navLabel, myDataStyles.dangerLabel]}>Delete all databases</Text>
                      <Text style={myDataStyles.dangerSubtext}>Free up all offline storage.</Text>
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
        title={deleteTarget === 'all' ? 'Delete all offline databases?' : `Delete ${deleteTarget ? REGION_INFO[deleteTarget as RegionCode]?.label : ''} database?`}
        description={
          deleteTarget === 'all'
            ? 'This will remove all downloaded food databases from your device. You can download them again at any time. Your scan history will not be affected.'
            : `This will remove the ${deleteTarget ? REGION_INFO[deleteTarget as RegionCode]?.label : ''} food database from your device. You can download it again at any time.`
        }
        confirmPhrase="DELETE"
        confirmLabel={deleteTarget === 'all' ? 'Delete all' : 'Delete database'}
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
  { key: 'length', label: 'At least ', bold: '8 characters', test: (pw: string) => pw.length >= 8 },
  { key: 'upper', label: 'One ', bold: 'uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { key: 'lower', label: 'One ', bold: 'lowercase letter', test: (pw: string) => /[a-z]/.test(pw) },
  { key: 'number', label: 'One ', bold: 'number', test: (pw: string) => /\d/.test(pw) },
];

function ChangePasswordScreen({ goBack }: { goBack: () => void }) {
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
        setError('Unable to verify your identity. Please try again.');
        setSaving(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (signInError) {
        setError('Current password is incorrect.');
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
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (success) {
    return (
      <>
        <View style={pwStyles.successWrap}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.status.positive} />
          <Text style={pwStyles.successTitle}>Password updated</Text>
          <Text style={pwStyles.successBody}>
            Your password has been changed successfully.
          </Text>
          <TouchableOpacity style={pwStyles.doneBtn} onPress={goBack} activeOpacity={0.85}>
            <Text style={pwStyles.doneBtnText}>Done</Text>
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
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.subTitle}>Change Password</Text>
      </View>

      <View style={pwStyles.form}>
        <Text style={pwStyles.subtitle}>
          Enter your current password and choose a new one.
        </Text>

        {/* Current password */}
        <View style={pwStyles.fieldGroup}>
          <Text style={pwStyles.label}>Current password</Text>
          <View style={[pwStyles.inputWrapper, currentFocused && pwStyles.inputFocused]}>
            <View style={styles.navIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={pwStyles.input}
              placeholder="Enter current password"
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
          <Text style={pwStyles.label}>New password</Text>
          <View style={[pwStyles.inputWrapper, newFocused && pwStyles.inputFocused]}>
            <View style={styles.navIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
            </View>
            <TextInput
              style={pwStyles.input}
              placeholder="Enter new password"
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
                      {r.label}<Text style={pwStyles.ruleBold}>{r.bold}</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Confirm password */}
        <View style={pwStyles.fieldGroup}>
          <Text style={pwStyles.label}>Confirm new password</Text>
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
              placeholder="Re-enter new password"
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
            <Text style={pwStyles.mismatch}>Passwords do not match</Text>
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
            <Text style={pwStyles.doneBtnText}>Update password</Text>
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
      return <><AccountScreen goBack={() => navigate('main', true)} onGo={handleNavigate} onNavigate={(sc) => navigate(sc)} /><Footer /></>;
    }
    if (s === 'settings') {
      return <><SettingsScreen goBack={() => navigate('main', true)} onNavigate={(sc) => navigate(sc)} /><Footer /></>;
    }
    if (s === 'mydata') {
      return <><MyDataScreen goBack={() => navigate('settings', true)} /><Footer /></>;
    }
    if (s === 'offlinedb') {
      return <><OfflineDatabaseScreen goBack={() => navigate('settings', true)} /><Footer /></>;
    }
    if (s === 'password') {
      return <><ChangePasswordScreen goBack={() => navigate('account', true)} /><Footer /></>;
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
