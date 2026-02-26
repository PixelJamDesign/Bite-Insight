import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Platform, Linking } from 'react-native';
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
  purchasePlus: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPlus: false,
  purchasing: false,
  purchasePlus: async () => {},
  restorePurchases: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [isPlus, setIsPlus] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
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
        Purchases.addCustomerInfoUpdateListener((info) => {
          setIsPlus(!!info.entitlements.active['plus']);
        });
      } catch {
        // Expo Go or unconfigured environment — RC unavailable, fall through to Supabase
        rcConfigured.current = false;
      }
    }

    // ── Fetch current subscription status from Supabase ─────────────────────
    supabase
      .from('profiles')
      .select('is_plus')
      .eq('id', userId)
      .single()
      .then(({ data }) => setIsPlus(data?.is_plus ?? false));

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
        (payload) => setIsPlus((payload.new as { is_plus: boolean }).is_plus ?? false),
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
        const pkg =
          offerings.current?.monthly ??
          offerings.current?.availablePackages[0];

        if (!pkg) {
          console.warn('No RevenueCat offering/package found');
          return;
        }

        const { customerInfo } = await Purchases.purchasePackage(pkg);
        if (customerInfo.entitlements.active['plus']) {
          setIsPlus(true);
        }
      } else {
        // ── Web: Stripe Checkout via Supabase Edge Function ─────────────────
        const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
          body: { user_id: session.user.id },
        });
        if (error || !data?.url) {
          console.warn('create-stripe-checkout error:', error);
          return;
        }
        (window as Window).location.href = data.url;
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function restorePurchases() {
    if (!session) return;
    if (Platform.OS !== 'web' && Purchases && rcConfigured.current) {
      // ── Native: ask StoreKit / Google Play to restore transactions ─────────
      const customerInfo = await Purchases.restorePurchases();
      setIsPlus(!!customerInfo.entitlements.active['plus']);
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
    <SubscriptionContext.Provider value={{ isPlus, purchasing, purchasePlus, restorePurchases }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
