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
import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  TextInput,
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
import { showUpsellSheetV2 } from '@/components/UpsellSheetV2';
import { ancestorsOf, matchingAncestors } from '@/lib/taxonomyWalker';
import {
  HEALTH_CONDITION_INGREDIENTS,
  DIETARY_PREFERENCE_INGREDIENTS,
} from '@/constants/healthIngredientFlags';

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

// ── Flag inspector ──────────────────────────────────────────────────────────
// Type an OFF ingredient ID (en:caramel-colour, en:e150d, en:dextrose…) or
// a raw ingredient name (we'll lowercase + slug-ify it) and see exactly
// which conditions/preferences would flag it, via which taxonomy ancestor.
// Lets us debug "why did this flag?" or "why DIDN'T this flag?" without
// rebuilding and rescanning a product.

function FlagInspector() {
  const [input, setInput] = useState('');

  const normalisedId = useMemo(() => {
    const raw = input.trim().toLowerCase();
    if (!raw) return '';
    if (raw.startsWith('en:')) return raw;
    // Slug-ify a raw name into an OFF-style ID.
    return 'en:' + raw.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }, [input]);

  const result = useMemo(() => {
    if (!normalisedId) return null;
    const ancestors = Array.from(ancestorsOf(normalisedId));

    // For each migrated condition + dietary pref, compute which ancestors
    // would flag this ingredient.
    type Hit = { key: string; via: string };
    const hits: Hit[] = [];
    const allEntries = [
      ...Object.entries(HEALTH_CONDITION_INGREDIENTS),
      ...Object.entries(DIETARY_PREFERENCE_INGREDIENTS),
    ];
    for (const [key, entry] of allEntries) {
      const targets = entry.flagsTaxonomyAncestors ?? [];
      if (targets.length === 0) continue;
      const matched = matchingAncestors(normalisedId, targets);
      for (const m of matched) hits.push({ key, via: m });
    }
    return { ancestors, hits };
  }, [normalisedId]);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>── Flag inspector ──</Text>
      <Text style={styles.inspectorHint}>
        Type an OFF id (en:e150d, en:dextrose) or an ingredient name.
      </Text>
      <TextInput
        style={styles.inspectorInput}
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="en:caramel-colour"
        placeholderTextColor={Colors.secondary}
      />
      {result && (
        <View style={styles.inspectorOutput}>
          <StateRow label="resolved id" value={normalisedId} />
          <StateRow
            label="ancestors"
            value={result.ancestors.length ? result.ancestors.join(' › ') : '(root)'}
          />
          <View style={{ height: Spacing.xs }} />
          <Text style={styles.inspectorVerdict}>
            {result.hits.length === 0
              ? '✓ would NOT flag for any migrated condition'
              : `✗ would flag for ${result.hits.length} condition${result.hits.length > 1 ? 's' : ''}:`}
          </Text>
          {result.hits.map((h, i) => (
            <Text key={i} style={styles.inspectorHit}>
              · {h.key.padEnd(20)} (via {h.via})
            </Text>
          ))}
        </View>
      )}
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

  const triggerUpsellV2 = () => {
    hideDebugMenu();
    // Small delay so the debug menu's fade-out completes before V2's
    // slide-up — otherwise the modals fight for the screen.
    setTimeout(() => showUpsellSheetV2(), 250);
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
              <ActionButton label="Show Upsell V2 (preview)" onPress={triggerUpsellV2} />
              <ActionButton label="Show My Plan sheet" onPress={triggerMyPlan} />
            </Section>

            <Section title="Reset">
              <ActionButton label="Reset trial cooldown" onPress={resetTrialCooldown} />
              <ActionButton label={`Reset "What's New" seen`} onPress={resetWhatsNewSeen} />
              <ActionButton label="Nuke AsyncStorage" onPress={resetAllStorage} />
            </Section>

            <FlagInspector />

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
  inspectorHint: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    marginBottom: 6,
  },
  inspectorInput: {
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.s,
    fontFamily: 'Figtree_300Light',
    fontSize: 14,
    color: Colors.primary,
  },
  inspectorOutput: {
    marginTop: Spacing.xs,
    padding: Spacing.xs,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
  },
  inspectorVerdict: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    marginBottom: 4,
  },
  inspectorHit: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
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
