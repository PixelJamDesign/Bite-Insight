import { createContext, useContext, useState, useEffect, useRef, useSyncExternalStore, ReactNode } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { useAuth } from './auth';

// ── Debug-only "force non-Plus" toggle ───────────────────────────────────────
// Lets QA see the dashboard's UpsellPanel (and any other non-Plus UI) while
// signed in as a Plus user. Persisted to AsyncStorage so it survives reloads.
// When the toggle is on, the SubscriptionContext value reports isPlus=false
// regardless of the real entitlement.
const DEBUG_FORCE_NON_PLUS_KEY = 'debug_force_non_plus';
let _forceNonPlus = false;
const _forceNonPlusListeners = new Set<() => void>();
function _forceNonPlusNotify() { for (const l of _forceNonPlusListeners) l(); }
function _forceNonPlusSubscribe(l: () => void) {
  _forceNonPlusListeners.add(l);
  return () => { _forceNonPlusListeners.delete(l); };
}
function _forceNonPlusGetSnapshot() { return _forceNonPlus; }
// Hydrate the in-memory flag from disk at module load so reloads keep state.
AsyncStorage.getItem(DEBUG_FORCE_NON_PLUS_KEY)
  .then((v) => { if (v === '1') { _forceNonPlus = true; _forceNonPlusNotify(); } })
  .catch(() => {});
export function setDebugForceNonPlus(on: boolean) {
  _forceNonPlus = on;
  AsyncStorage.setItem(DEBUG_FORCE_NON_PLUS_KEY, on ? '1' : '0').catch(() => {});
  _forceNonPlusNotify();
}
export function getDebugForceNonPlus(): boolean { return _forceNonPlus; }

// ── Debug-only "force trial-eligible" toggle ─────────────────────────────────
// Pairs with the force-non-Plus toggle. RevenueCat isn't configured in the
// sim, so trialEligible is normally false there — meaning the UpsellPanel
// only ever shows the price version. This override forces it true so the
// trial version of any trial-aware UI is previewable.
const DEBUG_FORCE_TRIAL_ELIGIBLE_KEY = 'debug_force_trial_eligible';
let _forceTrialEligible = false;
const _forceTrialEligibleListeners = new Set<() => void>();
function _forceTrialEligibleNotify() { for (const l of _forceTrialEligibleListeners) l(); }
function _forceTrialEligibleSubscribe(l: () => void) {
  _forceTrialEligibleListeners.add(l);
  return () => { _forceTrialEligibleListeners.delete(l); };
}
function _forceTrialEligibleGetSnapshot() { return _forceTrialEligible; }
AsyncStorage.getItem(DEBUG_FORCE_TRIAL_ELIGIBLE_KEY)
  .then((v) => { if (v === '1') { _forceTrialEligible = true; _forceTrialEligibleNotify(); } })
  .catch(() => {});
export function setDebugForceTrialEligible(on: boolean) {
  _forceTrialEligible = on;
  AsyncStorage.setItem(DEBUG_FORCE_TRIAL_ELIGIBLE_KEY, on ? '1' : '0').catch(() => {});
  _forceTrialEligibleNotify();
}
export function getDebugForceTrialEligible(): boolean { return _forceTrialEligible; }

// react-native-purchases is a native module — not available on web.
// We import it lazily at runtime so the web bundle never tries to load it.
let Purchases: typeof import('react-native-purchases').default | null = null;
let LOG_LEVEL: typeof import('react-native-purchases').LOG_LEVEL | null = null;
if (Platform.OS !== 'web') {
  const mod = require('react-native-purchases');
  Purchases = mod.default;
  LOG_LEVEL = mod.LOG_LEVEL;
}

interface SubscriptionContextValue {
  isPlus: boolean;
  purchasing: boolean;
  priceString: string | null;
  /** True when the active offering has a free-trial intro phase AND
   *  the current user is eligible (i.e. hasn't used the trial on
   *  this Apple ID / Google account before). When false the UpsellSheet
   *  should fall back to the standard "Upgrade" CTA. */
  trialEligible: boolean;
  /** Length of the trial in days, parsed from the intro offer's
   *  ISO-8601 billing period (e.g. "P7D" → 7). Null when no trial. */
  trialDays: number | null;
  /** Returns true when the purchase (or trial activation) completed
   *  successfully, false on user cancel or error. Callers can use this
   *  to drive immediate navigation (e.g. to /upgrade-success) without
   *  relying on the slower isPlus state-transition effect. */
  purchasePlus: () => Promise<boolean>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPlus: false,
  purchasing: false,
  priceString: null,
  trialEligible: false,
  trialDays: null,
  purchasePlus: async () => false,
  restorePurchases: async () => {},
});

/** Parse an ISO-8601 duration like "P7D" / "P1W" / "P1M" into days.
 *  Returns null when the input doesn't match those simple forms — we
 *  don't currently configure anything more exotic on App Store
 *  Connect / Play Console, so anything else is treated as "show no
 *  number" rather than misleading the user. */
function parseTrialDurationDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const m = /^P(\d+)([DWMY])$/.exec(iso);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  switch (m[2]) {
    case 'D': return n;
    case 'W': return n * 7;
    case 'M': return n * 30; // close enough for UI copy
    case 'Y': return n * 365;
    default:  return null;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [isPlus, setIsPlus] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [priceString, setPriceString] = useState<string | null>(null);
  const [trialEligible, setTrialEligible] = useState(false);
  const [trialDays, setTrialDays] = useState<number | null>(null);
  // Tracks whether Purchases.configure() has actually succeeded this session.
  // Guards purchasePlus / restorePurchases so they never call into an
  // unconfigured SDK (Expo Go, placeholder key, or configure() threw).
  const rcConfigured = useRef(false);

  useEffect(() => {
    if (!session?.user.id) {
      setIsPlus(false);
      return;
    }

    const userId = session.user.id;

    // ── Configure RevenueCat on native ──────────────────────────────────────
    // Skipped in Expo Go (native store not available) and when key is still a placeholder.
    const rcKey = Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
    const rcReady = Platform.OS !== 'web' && Purchases &&
      rcKey && !rcKey.startsWith('appl_REPLACE') && !rcKey.startsWith('goog_REPLACE');

    // ── Dev fallback: surface the trial UI in Expo Go / sim ────────────
    // RevenueCat can't return an intro offer in Expo Go (no native
    // StoreKit / Play Billing), so trialEligible would stay false and
    // the UpsellSheet would render the paid variant — making it
    // impossible to QA the trial sheet in a sim. When __DEV__ is on
    // AND RC won't configure, fake a trial offer so the UI fires.
    // The real production build still relies entirely on RC.
    if (__DEV__ && !rcReady) {
      setTrialEligible(true);
      setTrialDays(7);
      setPriceString('£3.99');
    }

    if (rcReady && Purchases) {
      try {
        Purchases.configure({ apiKey: rcKey! });
        rcConfigured.current = true;
        if (__DEV__ && LOG_LEVEL) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.logIn(userId).catch(() => {});
        // Fetch the monthly price + intro-offer details so the upsell
        // sheet can display the trial copy when one is configured.
        // Trial eligibility is checked against StoreKit / Play Billing
        // directly — RevenueCat won't return an `introPrice` for users
        // who've already used the trial on this Apple ID / Google
        // account, so we only show the trial CTA to genuinely-eligible
        // users.
        Purchases.getOfferings().then(async (offerings) => {
          const pkg = offerings.current?.monthly ?? offerings.current?.availablePackages[0];
          if (!pkg) return;
          setPriceString(pkg.product.priceString);

          // RevenueCat surfaces the intro offer on the product. Free
          // trials have priceString "Free" / price 0 and a non-null
          // periodNumberOfUnits + periodUnit. We use the ISO period
          // when available (Android), falling back to the
          // numberOfUnits + unit pair (iOS-flavoured field set).
          const intro: any = (pkg.product as any).introPrice;
          const isFreeTrial =
            !!intro &&
            (intro.price === 0 || intro.priceString === 'Free' || intro.priceString === '0');
          if (!isFreeTrial) return;

          // Try iso period first ("P7D"), then unit-based fields.
          let days: number | null = parseTrialDurationDays(intro.period);
          if (days == null && typeof intro.periodNumberOfUnits === 'number' && intro.periodUnit) {
            const unitsToDays: Record<string, number> = {
              DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365,
              day: 1, week: 7, month: 30, year: 365,
            };
            const multiplier = unitsToDays[intro.periodUnit] ?? null;
            if (multiplier != null) days = intro.periodNumberOfUnits * multiplier;
          }
          setTrialDays(days);

          // Per-user eligibility check — defaults to "eligible" if the
          // SDK can't tell (older Android, missing receipt). False
          // negatives are worse than false positives here: a user who
          // sees "Start free trial" but isn't eligible just falls back
          // to a paid purchase on the store sheet, no harm done.
          try {
            const productId = pkg.product.identifier;
            const eligibility = await Purchases!.checkTrialOrIntroductoryPriceEligibility([productId]);
            const status = eligibility[productId]?.status;
            // status: 0=unknown, 1=ineligible, 2=eligible, 3=no_intro_offer
            setTrialEligible(status === 2 || status === 0);
          } catch {
            setTrialEligible(true);
          }
        }).catch(() => {});

        Purchases.addCustomerInfoUpdateListener((info) => {
          const plusEnt = info.entitlements.active['plus'];
          const active = !!plusEnt;
          if (active) {
            // Only sync to Supabase when RevenueCat confirms an active entitlement.
            // Never write false — RevenueCat may simply have no record of a
            // subscription that was granted via another channel (manual, promo, etc.).
            setIsPlus(true);

            // Trial detection — RevenueCat reports periodType='trial'
            // while the user is in their intro-offer period. We capture
            // trial_started_at / trial_ends_at so the Day-6 reminder
            // cron has accurate boundaries. Once periodType flips to
            // 'normal' (post-trial paid) we leave the timestamps alone
            // — they're a historical record.
            const isTrial = (plusEnt as any).periodType === 'trial';
            const update: Record<string, any> = { is_plus: true };
            if (isTrial) {
              const trialEndsAt = (plusEnt as any).expirationDate;
              if (trialEndsAt) {
                update.trial_ends_at = trialEndsAt;
                // Stamp trial_started_at on first observation. The
                // server-side RC webhook is the canonical writer for
                // this (handles users who don't open the app right
                // after purchase), but writing client-side too means
                // the value is set within seconds for normal flows.
                update.trial_started_at = new Date().toISOString();
                // Clear any stale reminder flag from a previous trial
                // cycle so the Day-6 push fires again.
                update.trial_reminder_sent_at = null;
              }
            }

            supabase
              .from('profiles')
              .update(update)
              .eq('id', userId)
              .then(({ error }) => {
                if (error) console.warn('[RC→Supabase] sync failed:', error.message);
                else console.log('[RC→Supabase] is_plus = true', isTrial ? '(trial)' : '');
              });
          }
        });
      } catch (e) {
        // Expo Go or unconfigured environment — RC unavailable, fall through to Supabase
        console.warn('[RevenueCat] configure() failed:', e);
        rcConfigured.current = false;
      }
    }

    // ── Fetch current subscription status from Supabase ─────────────────────
    supabase
      .from('profiles')
      .select('is_plus, is_vip, full_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setIsVip(data?.is_vip ?? false);
        setIsPlus(data?.is_plus ?? data?.is_vip ?? false);

        // Push the user's display name + email to RevenueCat as
        // subscriber attributes. The reserved keys $displayName and
        // $email replace the raw UUID on the RC customer profile page,
        // so support / refund / debugging flows show "Lorraine McCartney
        // (lorraine@example.com)" instead of "b470afd2-e03f-…". RC docs:
        // https://docs.revenuecat.com/docs/subscriber-attributes
        if (rcConfigured.current && Purchases) {
          const attrs: Record<string, string> = {};
          if (data?.full_name) attrs.$displayName = data.full_name;
          if (session.user.email) attrs.$email = session.user.email;
          if (Object.keys(attrs).length > 0) {
            Purchases.setAttributes(attrs).catch((e: unknown) => {
              console.warn('[RC] setAttributes failed:', e);
            });
          }
        }
      });

    // ── Real-time listener — fires when stripe-webhook / revenuecat-webhook
    //    updates profiles.is_plus after a successful purchase or cancellation ─
    const channel = supabase
      .channel(`profile-plus-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { is_plus: boolean; is_vip?: boolean };
          if (row.is_vip) { setIsVip(true); setIsPlus(true); return; }
          setIsPlus(row.is_plus ?? false);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user.id]);

  async function purchasePlus(): Promise<boolean> {
    if (!session) return false;
    setPurchasing(true);
    try {
      if (Platform.OS !== 'web' && Purchases && rcConfigured.current) {
        // ── Native: StoreKit (iOS) / Google Play (Android) ──────────────────
        const offerings = await Purchases.getOfferings();

        // Debug: log exactly what RevenueCat returns so we can diagnose issues
        console.log('[RC] offerings.current:', JSON.stringify({
          id: offerings.current?.identifier,
          monthly: offerings.current?.monthly?.identifier ?? null,
          packagesCount: offerings.current?.availablePackages.length ?? 0,
          packages: offerings.current?.availablePackages.map(p => ({
            id: p.identifier,
            product: p.product.identifier,
            price: p.product.priceString,
          })) ?? [],
          allOfferingsCount: offerings.all ? Object.keys(offerings.all).length : 0,
        }, null, 2));

        const pkg =
          offerings.current?.monthly ??
          offerings.current?.availablePackages[0];

        if (!pkg) {
          console.warn('[RC] No package found. offerings.current is', offerings.current?.identifier ?? 'null');
          Alert.alert(
            'No subscription available',
            `We couldn't find any subscription packages. This usually means Apple is still processing your products. Please try again in a few hours.\n\nOffering: ${offerings.current?.identifier ?? 'none'}\nPackages: ${offerings.current?.availablePackages.length ?? 0}`,
          );
          return false;
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        // RC considers an entitlement "active" whenever it grants access
        // right now — that includes the trial window. We also check
        // entitlements.all as a belt-and-braces fallback for edge cases
        // (sandbox timing, RC config quirks) where active might lag a
        // few hundred ms behind the StoreKit transaction settling.
        const entActive = customerInfo.entitlements.active['plus'];
        const entAll = customerInfo.entitlements.all['plus'];
        const expIso = entActive?.expirationDate ?? entAll?.expirationDate;
        const stillValid = expIso ? new Date(expIso).getTime() > Date.now() : false;
        const purchased = Boolean(entActive) || stillValid;
        if (purchased) {
          setIsPlus(true);
          // Persist to Supabase so the server knows too
          await supabase
            .from('profiles')
            .update({ is_plus: true })
            .eq('id', session.user.id);
          return true;
        }
        console.warn(
          '[RC] purchase resolved but no plus entitlement.',
          'active keys:', Object.keys(customerInfo.entitlements.active),
          'all keys:', Object.keys(customerInfo.entitlements.all),
        );
        return false;
      } else if (Platform.OS === 'web') {
        // ── Web: Stripe Checkout via Supabase Edge Function ─────────────────
        const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
          body: { user_id: session.user.id },
        });
        if (error || !data?.url) {
          console.warn('create-stripe-checkout error:', error);
          return false;
        }
        (window as Window).location.href = data.url;
        // The page is about to redirect; treat as "in-flight" rather than
        // success — the actual conversion will be confirmed when Stripe
        // redirects back and the webhook fires.
        return false;
      } else {
        // ── Native but RevenueCat not configured (Expo Go / dev build) ──────
        Alert.alert(
          'Purchases unavailable',
          'In-app purchases are not available in Expo Go. Please use a TestFlight or App Store build to subscribe.',
        );
        return false;
      }
    } catch (err: any) {
      // User cancelled the purchase — RevenueCat throws with userCancelled flag
      if (err?.userCancelled) return false;
      console.warn('purchasePlus error:', err);
      Alert.alert('Purchase failed', err?.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setPurchasing(false);
    }
  }

  async function restorePurchases() {
    if (!session) return;
    if (Platform.OS !== 'web' && Purchases && rcConfigured.current) {
      // ── Native: ask StoreKit / Google Play to restore transactions ─────────
      const customerInfo = await Purchases.restorePurchases();
      const active = !!customerInfo.entitlements.active['plus'];
      if (active) {
        setIsPlus(true);
        await supabase
          .from('profiles')
          .update({ is_plus: true })
          .eq('id', session.user.id);
      }
    } else {
      // ── Web: re-fetch from Supabase (webhook should have already updated it)
      const { data } = await supabase
        .from('profiles')
        .select('is_plus')
        .eq('id', session.user.id)
        .single();
      setIsPlus(data?.is_plus ?? false);
    }
  }

  // Subscribe to the debug "force non-Plus" toggle. When on, we report
  // isPlus=false to consumers regardless of the real entitlement. Has no
  // effect in release builds unless someone explicitly flips the toggle
  // via the debug menu, which itself only ships in the debug-accessible
  // version footer long-press flow.
  const forceNonPlus = useSyncExternalStore(_forceNonPlusSubscribe, _forceNonPlusGetSnapshot, _forceNonPlusGetSnapshot);
  const forceTrialEligible = useSyncExternalStore(_forceTrialEligibleSubscribe, _forceTrialEligibleGetSnapshot, _forceTrialEligibleGetSnapshot);
  const effectiveIsPlus = forceNonPlus ? false : (isPlus || isVip);
  const effectiveTrialEligible = forceTrialEligible ? true : trialEligible;

  return (
    <SubscriptionContext.Provider value={{ isPlus: effectiveIsPlus, purchasing, priceString, trialEligible: effectiveTrialEligible, trialDays, purchasePlus, restorePurchases }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
