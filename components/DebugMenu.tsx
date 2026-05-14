/**
 * DebugMenu — hidden testing panel.
 *
 * Triggered by a 3-second long-press on the version footer inside
 * MenuModal. Available in ALL builds (including TestFlight / App
 * Store) so QA can drive sheet visibility and reset persisted state
 * directly on production-signed builds.
 *
 * Deliberately unstyled — no Figma frame, no animations beyond the
 * Modal's default. Looks like a debug menu because it IS one.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { useDebugMenu } from '@/lib/debugMenuContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { useTrialUpsell, TRIAL_UPSELL_KEYS } from '@/lib/trialUpsellContext';
import { useTrialDay6Reminder } from '@/lib/trialDay6ReminderContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useMyPlanSheet } from '@/lib/myPlanSheetContext';
import { useRegion } from '@/lib/regionContext';
import { useAuth } from '@/lib/auth';
import { debugForceShowUpdateToast } from '@/lib/useUpdateAvailable';

// ── Shared sub-components ────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>── {title} ──</Text>
      {children}
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function StateRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stateRow}>
      <Text style={styles.stateLabel}>{label}</Text>
      <Text style={styles.stateValue}>{value}</Text>
    </View>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function DebugMenu() {
  const { visible, hideDebugMenu } = useDebugMenu();
  const insets = useSafeAreaInsets();

  const { session } = useAuth();
  const { isPlus, priceString, trialEligible, trialDays } = useSubscription();
  const { showTrialUpsell } = useTrialUpsell();
  const { showTrialDay6Reminder } = useTrialDay6Reminder();
  const { showUpsell } = useUpsellSheet();
  const { showMyPlan } = useMyPlanSheet();
  const { selectedRegion, homeCountryCode } = useRegion();

  // Read trial-related AsyncStorage state when the menu opens so the
  // state-readout reflects on-disk values, not just in-memory React state.
  const [storedState, setStoredState] = useState<Record<string, string | null>>({});
  useEffect(() => {
    if (!visible) return;
    (async () => {
      const keys = [
        TRIAL_UPSELL_KEYS.firstSeenAt,
        TRIAL_UPSELL_KEYS.lastShownAt,
        TRIAL_UPSELL_KEYS.dismissCount,
        TRIAL_UPSELL_KEYS.convertedAt,
        'lastSeenWhatsNewVersion',
      ];
      const pairs = await Promise.all(
        keys.map(async (k) => [k, await AsyncStorage.getItem(k)] as const),
      );
      setStoredState(Object.fromEntries(pairs));
    })();
  }, [visible]);

  if (!visible) return null;

  const installedVersion = Constants.expoConfig?.version ?? 'unknown';
  const buildNumber =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber ?? '?'
      : String(Constants.expoConfig?.android?.versionCode ?? '?');

  // ── Sheet triggers ────────────────────────────────────────────
  // Each closes the debug menu first so the user sees the target
  // sheet/screen cleanly.

  const triggerWhatsNew = () => {
    hideDebugMenu();
    router.push('/whats-new');
  };

  const triggerTrialSheet = () => {
    hideDebugMenu();
    showTrialUpsell();
  };

  const triggerTrialDay6 = () => {
    hideDebugMenu();
    showTrialDay6Reminder();
  };

  const triggerUpdateToast = () => {
    hideDebugMenu();
    // Small delay so the menu close animation finishes before the
    // toast slides up; otherwise the toast appears mid-fade and
    // looks broken.
    setTimeout(() => debugForceShowUpdateToast(), 350);
  };

  const triggerPaidUpsell = () => {
    hideDebugMenu();
    showUpsell();
  };

  const triggerMyPlan = () => {
    hideDebugMenu();
    showMyPlan();
  };

  // ── Reset actions ─────────────────────────────────────────────

  const resetTrialCooldown = async () => {
    await AsyncStorage.multiRemove([
      TRIAL_UPSELL_KEYS.firstSeenAt,
      TRIAL_UPSELL_KEYS.lastShownAt,
      TRIAL_UPSELL_KEYS.dismissCount,
      TRIAL_UPSELL_KEYS.convertedAt,
    ]);
    Alert.alert('Reset', 'Trial cooldown + dismiss count cleared.');
  };

  const resetWhatsNewSeen = async () => {
    await AsyncStorage.removeItem('lastSeenWhatsNewVersion');
    Alert.alert('Reset', 'What\'s New seen flag cleared. Reopen the app to see it again.');
  };

  const resetAllStorage = async () => {
    Alert.alert(
      'Nuke AsyncStorage?',
      'Clears EVERYTHING the app has stored locally (trial state, prefs, caches). You will be signed out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert('Cleared', 'Restart the app to re-bootstrap.');
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={hideDebugMenu}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.panel,
            {
              marginTop: insets.top + 24,
              marginBottom: insets.bottom + 24,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>🧪 Debug menu</Text>
            <Text style={styles.subtitle}>
              v{installedVersion} (build {buildNumber})
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <Section title="Sheets">
              <ActionButton label="Show What's New" onPress={triggerWhatsNew} />
              <ActionButton label="Show Trial sheet" onPress={triggerTrialSheet} />
              <ActionButton label="Show Day-6 reminder" onPress={triggerTrialDay6} />
              <ActionButton label="Show Update toast" onPress={triggerUpdateToast} />
              <ActionButton label="Show paid Upsell sheet" onPress={triggerPaidUpsell} />
              <ActionButton label="Show My Plan sheet" onPress={triggerMyPlan} />
            </Section>

            <Section title="Reset">
              <ActionButton label="Reset trial cooldown" onPress={resetTrialCooldown} />
              <ActionButton label={`Reset "What's New" seen`} onPress={resetWhatsNewSeen} />
              <ActionButton label="Nuke AsyncStorage" onPress={resetAllStorage} />
            </Section>

            <Section title="State (in-memory)">
              <StateRow label="user.id" value={session?.user?.id?.slice(0, 8) ?? '—'} />
              <StateRow label="isPlus" value={String(isPlus)} />
              <StateRow label="priceString" value={priceString ?? '—'} />
              <StateRow label="trialEligible" value={String(trialEligible)} />
              <StateRow label="trialDays" value={String(trialDays ?? '—')} />
              <StateRow label="home_country_code" value={homeCountryCode ?? '—'} />
              <StateRow label="selectedRegion" value={selectedRegion.code} />
            </Section>

            <Section title="State (AsyncStorage)">
              <StateRow
                label="trial_first_seen_at"
                value={storedState[TRIAL_UPSELL_KEYS.firstSeenAt] ?? '—'}
              />
              <StateRow
                label="trial_last_shown_at"
                value={storedState[TRIAL_UPSELL_KEYS.lastShownAt] ?? '—'}
              />
              <StateRow
                label="trial_dismiss_count"
                value={storedState[TRIAL_UPSELL_KEYS.dismissCount] ?? '0'}
              />
              <StateRow
                label="trial_converted_at"
                value={storedState[TRIAL_UPSELL_KEYS.convertedAt] ?? '—'}
              />
              <StateRow
                label="lastSeenWhatsNewVersion"
                value={storedState.lastSeenWhatsNewVersion ?? '—'}
              />
            </Section>
          </ScrollView>

          <TouchableOpacity style={styles.closeBtn} onPress={hideDebugMenu} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
// Intentionally minimal — matches the theme so it doesn't look broken,
// but no design polish beyond that.

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: Spacing.s,
    justifyContent: 'center',
  },
  panel: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    overflow: 'hidden',
    flexShrink: 1,
  },
  header: {
    paddingHorizontal: Spacing.s,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  title: {
    ...Typography.h4,
    color: Colors.primary,
    fontFamily: 'Figtree_700Bold',
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.secondary,
    fontFamily: 'Figtree_300Light',
    marginTop: 2,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    padding: Spacing.s,
    gap: Spacing.s,
  },
  section: {
    gap: Spacing.xxs,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.secondary,
    fontFamily: 'Figtree_700Bold',
    marginBottom: 4,
  },
  btn: {
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.s,
  },
  btnText: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  stateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: 2,
  },
  stateLabel: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    flexShrink: 0,
    marginRight: Spacing.xs,
  },
  stateValue: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    flex: 1,
    textAlign: 'right',
  },
  closeBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.s,
    alignItems: 'center',
  },
  closeBtnText: {
    ...Typography.h5,
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
  },
});
