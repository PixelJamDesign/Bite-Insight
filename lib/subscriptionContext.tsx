import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import { supabase } from './supabase';
import { useAuth } from './auth';

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
  purchasePlus: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPlus: false,
  purchasing: false,
  priceString: null,
  purchasePlus: async () => {},
  restorePurchases: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [isPlus, setIsPlus] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [priceString, setPriceString] = useState<string | null>(null);
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

    if (rcReady && Purchases) {
      try {
        Purchases.configure({ apiKey: rcKey! });
        rcConfigured.current = true;
        if (__DEV__ && LOG_LEVEL) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        Purchases.logIn(userId).catch(() => {});
        // Fetch the monthly price from the store so the upsell sheet can display it
        Purchases.getOfferings().then((offerings) => {
          const pkg = offerings.current?.monthly ?? offerings.current?.availablePackages[0];
          if (pkg) setPriceString(pkg.product.priceString);
        }).catch(() => {});

        Purchases.addCustomerInfoUpdateListener((info) => {
          const active = !!info.entitlements.active['plus'];
          if (active) {
            // Only sync to Supabase when RevenueCat confirms an active entitlement.
            // Never write false — RevenueCat may simply have no record of a
            // subscription that was granted via another channel (manual, promo, etc.).
            setIsPlus(true);
            supabase
              .from('profiles')
              .update({ is_plus: true })
              .eq('id', userId)
              .then(({ error }) => {
                if (error) console.warn('[RC→Supabase] sync failed:', error.message);
                else console.log('[RC→Supabase] is_plus = true');
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
      .select('is_plus, is_vip, plus_expires_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setIsVip(data?.is_vip ?? false);

        // Check if points-redeemed Plus has expired
        let plus = data?.is_plus ?? false;
        if (plus && !data?.is_vip && data?.plus_expires_at) {
          const expiry = new Date(data.plus_expires_at);
          if (expiry < new Date()) {
            // Expired — clear Plus in Supabase
            plus = false;
            supabase
              .from('profiles')
              .update({ is_plus: false })
              .eq('id', userId)
              .then(() => {});
          }
        }

        setIsPlus(plus || (data?.is_vip ?? false));
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

  async function purchasePlus() {
    if (!session) return;
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
          return;
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        if (customerInfo.entitlements.active['plus']) {
          setIsPlus(true);
          // Persist to Supabase so the server knows too
          await supabase
            .from('profiles')
            .update({ is_plus: true })
            .eq('id', session.user.id);
        }
      } else if (Platform.OS === 'web') {
        // ── Web: Stripe Checkout via Supabase Edge Function ─────────────────
        const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
          body: { user_id: session.user.id },
        });
        if (error || !data?.url) {
          console.warn('create-stripe-checkout error:', error);
          return;
        }
        (window as Window).location.href = data.url;
      } else {
        // ── Native but RevenueCat not configured (Expo Go / dev build) ──────
        Alert.alert(
          'Purchases unavailable',
          'In-app purchases are not available in Expo Go. Please use a TestFlight or App Store build to subscribe.',
        );
      }
    } catch (err: any) {
      // User cancelled the purchase — RevenueCat throws with userCancelled flag
      if (err?.userCancelled) return;
      console.warn('purchasePlus error:', err);
      Alert.alert('Purchase failed', err?.message || 'Something went wrong. Please try again.');
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

  return (
    <SubscriptionContext.Provider value={{ isPlus: isPlus || isVip, purchasing, priceString, purchasePlus, restorePurchases }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
