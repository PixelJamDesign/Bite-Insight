import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// ── English namespace imports ────────────────────────────────────────────────
import common from '@/locales/en/common.json';
import profileOptions from '@/locales/en/profileOptions.json';
import auth from '@/locales/en/auth.json';
import onboarding from '@/locales/en/onboarding.json';
import dashboard from '@/locales/en/dashboard.json';
import scan from '@/locales/en/scan.json';
import menu from '@/locales/en/menu.json';
import profile from '@/locales/en/profile.json';
import flagReasons from '@/locales/en/flagReasons.json';
import ingredients from '@/locales/en/ingredients.json';
import history from '@/locales/en/history.json';
import scanner from '@/locales/en/scanner.json';

// ── Detect device language ───────────────────────────────────────────────────
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

// ── Namespace list ───────────────────────────────────────────────────────────
const ns = [
  'common',
  'profileOptions',
  'auth',
  'onboarding',
  'dashboard',
  'scan',
  'menu',
  'profile',
  'flagReasons',
  'ingredients',
  'history',
  'scanner',
] as const;

// ── Initialise i18next ───────────────────────────────────────────────────────
i18n.use(initReactI18next).init({
  lng: deviceLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [...ns],
  resources: {
    en: {
      common,
      profileOptions,
      auth,
      onboarding,
      dashboard,
      scan,
      menu,
      profile,
      flagReasons,
      ingredients,
      history,
      scanner,
    },
  },
  interpolation: {
    escapeValue: false, // React Native handles XSS
  },
  react: {
    useSuspense: false, // App manages its own loading states
  },
  // Log missing keys in development
  ...(process.env.NODE_ENV === 'development' && {
    saveMissing: true,
    missingKeyHandler: (
      _lngs: readonly string[],
      ns: string,
      key: string,
    ) => {
      console.warn(`[i18n] Missing key: ${ns}:${key}`);
    },
  }),
});

export default i18n;
