/**
 * Connected devices — link or unlink a Dexcom CGM account.
 * Reached from Menu → Settings → Connected devices.
 *
 * Layout follows the simple pushed-screen pattern (app/recipes/pick-scan.tsx):
 * back button + centred title, then content.
 *
 * When connected, the card shows the most recent reading from the last
 * 24 hours. That doubles as a check that the whole chain works:
 * app → edge function → token refresh → Dexcom API.
 */
import { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import { LottieLoader } from '@/components/LottieLoader';
import { safeBack } from '@/lib/safeBack';
import { useToast } from '@/lib/toastContext';
import {
  connectDexcom,
  disconnectDexcom,
  fetchGlucose,
  getDexcomStatus,
  toMmol,
  type DexcomStatus,
  type GlucoseReading,
} from '@/lib/dexcom';

const DAY_MS = 24 * 60 * 60 * 1000;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ConnectedDevicesScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();

  const [status, setStatus] = useState<DexcomStatus | null>(null);
  const [latest, setLatest] = useState<GlucoseReading | null | undefined>(undefined);
  const [busy, setBusy] = useState<'connect' | 'disconnect' | 'refresh' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);

  const loadLatest = useCallback(async () => {
    try {
      const end = new Date();
      const readings = await fetchGlucose(new Date(end.getTime() - DAY_MS), end);
      if (readings === null) {
        // Dexcom revoked access — the function has already forgotten the tokens.
        setStatus((s) => (s ? { ...s, connected: false } : s));
        setLatest(undefined);
        return;
      }
      const newest = [...readings].sort((a, b) => b.time.localeCompare(a.time))[0] ?? null;
      setLatest(newest);
    } catch (e) {
      console.warn('[connected-devices] glucose fetch failed:', e);
      setError("We couldn't get your latest reading from Dexcom.");
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    const s = await getDexcomStatus();
    setStatus(s);
    if (s.connected) await loadLatest();
  }, [loadLatest]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleConnect() {
    setBusy('connect');
    setError(null);
    const result = await connectDexcom();
    setBusy(null);
    if (result.outcome === 'connected') {
      showToast({ message: 'Dexcom connected', variant: 'success' });
      await load();
    } else if (result.outcome === 'error') {
      setError(result.message);
    }
  }

  async function doDisconnect() {
    setBusy('disconnect');
    const ok = await disconnectDexcom();
    setBusy(null);
    if (!ok) {
      setError('Could not disconnect. Please try again.');
      return;
    }
    setLatest(undefined);
    showToast({ message: 'Dexcom disconnected', variant: 'info' });
    await load();
  }

  function handleDisconnect() {
    // Alert buttons are a no-op on web, so only confirm on native.
    if (Platform.OS === 'web') {
      doDisconnect();
      return;
    }
    Alert.alert(
      'Disconnect Dexcom?',
      "Bite Insight will stop reading your glucose. You can connect again at any time.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: doDisconnect },
      ],
    );
  }

  async function handleRefresh() {
    setBusy('refresh');
    setError(null);
    await loadLatest();
    setBusy(null);
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack()}
          style={styles.backBtn}
          activeOpacity={0.85}
          hitSlop={8}
          accessibilityLabel="Back"
        >
          <MenuArrowLeftIcon color={Colors.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Connected devices</Text>
        <View style={styles.headerSpacer} />
      </View>

      {status === null ? (
        <View style={styles.loadingWrap}>
          <LottieLoader type="loading" fullScreen={false} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.l }]}>
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.iconTile}>
                <Ionicons name="pulse" size={24} color={Colors.secondary} />
              </View>
              <View style={styles.cardHeadText}>
                <Text style={styles.cardTitle}>Dexcom</Text>
                <Text style={styles.cardSub}>
                  {status.connected && status.connectedAt
                    ? `Connected since ${formatDate(status.connectedAt)}`
                    : 'Not connected'}
                </Text>
              </View>
              {status.connected && status.environment === 'sandbox' && (
                <View style={styles.testPill}>
                  <Text style={styles.testPillText}>Test data</Text>
                </View>
              )}
            </View>

            {status.connected ? (
              <>
                <View style={styles.reading}>
                  {latest === undefined ? (
                    <ActivityIndicator color={Colors.secondary} />
                  ) : latest === null ? (
                    <Text style={styles.body}>No readings in the last 24 hours.</Text>
                  ) : (
                    <>
                      <Text style={styles.readingLabel}>Latest reading</Text>
                      <Text style={styles.readingValue}>{toMmol(latest.value)} mmol/L</Text>
                      <Text style={styles.body}>
                        {latest.value} mg/dL at {formatTime(latest.time)}
                      </Text>
                    </>
                  )}
                </View>
                <Text style={styles.note}>
                  Dexcom shares readings about 3 hours after they're taken (1 hour in the US), so
                  this won't match your receiver exactly.
                </Text>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.outlineBtn}
                    onPress={handleDisconnect}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                  >
                    {busy === 'disconnect' ? (
                      <ActivityIndicator color={Colors.secondary} />
                    ) : (
                      <Text style={styles.outlineBtnText}>Disconnect</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, styles.flexOne]}
                    onPress={handleRefresh}
                    disabled={busy !== null}
                    activeOpacity={0.85}
                  >
                    {busy === 'refresh' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Refresh</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.body}>
                  Link your Dexcom account and Bite Insight can show how the meals you plan affect
                  your glucose.
                </Text>
                {/* What the user is agreeing to. Glucose is special category
                    health data under UK GDPR, so this is explicit, opt-in
                    consent — Connect stays disabled until it's ticked. */}
                <View style={styles.consentBox}>
                  <Text style={styles.consentTitle}>Before you connect</Text>
                  <Text style={styles.consentItem}>
                    <Text style={styles.consentLead}>What we read: </Text>
                    your glucose readings, plus the device, calibration and event details Dexcom
                    shares with every connected app.
                  </Text>
                  <Text style={styles.consentItem}>
                    <Text style={styles.consentLead}>What for: </Text>
                    showing how the meals you plan and eat affect your glucose. Nothing else. We
                    don't sell it or use it for ads.
                  </Text>
                  <Text style={styles.consentItem}>
                    <Text style={styles.consentLead}>What we keep: </Text>
                    the access Dexcom gives us, held on our servers. Readings are fetched when you
                    look at them.
                  </Text>
                  <Text style={styles.consentItem}>
                    <Text style={styles.consentLead}>Changing your mind: </Text>
                    tap Disconnect here at any time and we delete that access straight away. You
                    can also remove Bite Insight from your Dexcom account.
                  </Text>
                  <Text style={styles.note}>
                    You sign in on Dexcom's own page. We never see your Dexcom password.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.consentRow}
                  onPress={() => setConsented((v) => !v)}
                  activeOpacity={0.8}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consented }}
                >
                  <View style={[styles.checkbox, consented && styles.checkboxChecked]}>
                    {consented && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.consentLabel}>
                    I agree to Bite Insight reading my Dexcom data as described above.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, !consented && styles.primaryBtnDisabled]}
                  onPress={handleConnect}
                  disabled={busy !== null || !consented}
                  activeOpacity={0.85}
                >
                  {busy === 'connect' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Connect Dexcom</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={18} color={Colors.status.negative} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
    gap: Spacing.s,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 48,
    height: 48,
  },
  title: {
    ...Typography.h4,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    padding: Spacing.l,
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Spacing.s,
    paddingTop: Spacing.s,
  },

  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: Spacing.s,
    gap: Spacing.s,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeadText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    ...Typography.h4,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  cardSub: {
    ...Typography.label,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  testPill: {
    backgroundColor: '#fff3cc',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  testPillText: {
    ...Typography.label,
    fontFamily: 'Figtree_700Bold',
    color: '#8a6a00',
  },

  body: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },
  note: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },

  reading: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    padding: Spacing.s,
    gap: 2,
    minHeight: 72,
    justifyContent: 'center',
  },
  readingLabel: {
    ...Typography.label,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  readingValue: {
    ...Typography.h3,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },

  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outlineBtn: {
    height: 52,
    paddingHorizontal: Spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  outlineBtnText: {
    ...Typography.h5,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  primaryBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  // Refresh shares the row with Disconnect and takes the remaining width.
  flexOne: {
    flex: 1,
  },
  primaryBtnText: {
    ...Typography.h5,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },

  consentBox: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    padding: Spacing.s,
    gap: Spacing.xs,
  },
  consentTitle: {
    ...Typography.h5,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  consentItem: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },
  consentLead: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  consentLabel: {
    flex: 1,
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: '#ffe1e2',
    borderRadius: Radius.m,
    padding: 12,
  },
  errorText: {
    flex: 1,
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: '#c02e30',
  },
});
