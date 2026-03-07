import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

// ── English (base) ──────────────────────────────────────────────────────────
import en_common from '@/locales/en/common.json';
import en_profileOptions from '@/locales/en/profileOptions.json';
import en_auth from '@/locales/en/auth.json';
import en_onboarding from '@/locales/en/onboarding.json';
import en_dashboard from '@/locales/en/dashboard.json';
import en_scan from '@/locales/en/scan.json';
import en_menu from '@/locales/en/menu.json';
import en_profile from '@/locales/en/profile.json';
import en_flagReasons from '@/locales/en/flagReasons.json';
import en_ingredients from '@/locales/en/ingredients.json';
import en_history from '@/locales/en/history.json';
import en_scanner from '@/locales/en/scanner.json';

// ── Spanish ─────────────────────────────────────────────────────────────────
import es_common from '@/locales/es/common.json';
import es_profileOptions from '@/locales/es/profileOptions.json';
import es_auth from '@/locales/es/auth.json';
import es_onboarding from '@/locales/es/onboarding.json';
import es_dashboard from '@/locales/es/dashboard.json';
import es_scan from '@/locales/es/scan.json';
import es_menu from '@/locales/es/menu.json';
import es_profile from '@/locales/es/profile.json';
import es_flagReasons from '@/locales/es/flagReasons.json';
import es_ingredients from '@/locales/es/ingredients.json';
import es_history from '@/locales/es/history.json';
import es_scanner from '@/locales/es/scanner.json';

// ── French ──────────────────────────────────────────────────────────────────
import fr_common from '@/locales/fr/common.json';
import fr_profileOptions from '@/locales/fr/profileOptions.json';
import fr_auth from '@/locales/fr/auth.json';
import fr_onboarding from '@/locales/fr/onboarding.json';
import fr_dashboard from '@/locales/fr/dashboard.json';
import fr_scan from '@/locales/fr/scan.json';
import fr_menu from '@/locales/fr/menu.json';
import fr_profile from '@/locales/fr/profile.json';
import fr_flagReasons from '@/locales/fr/flagReasons.json';
import fr_ingredients from '@/locales/fr/ingredients.json';
import fr_history from '@/locales/fr/history.json';
import fr_scanner from '@/locales/fr/scanner.json';

// ── German ──────────────────────────────────────────────────────────────────
import de_common from '@/locales/de/common.json';
import de_profileOptions from '@/locales/de/profileOptions.json';
import de_auth from '@/locales/de/auth.json';
import de_onboarding from '@/locales/de/onboarding.json';
import de_dashboard from '@/locales/de/dashboard.json';
import de_scan from '@/locales/de/scan.json';
import de_menu from '@/locales/de/menu.json';
import de_profile from '@/locales/de/profile.json';
import de_flagReasons from '@/locales/de/flagReasons.json';
import de_ingredients from '@/locales/de/ingredients.json';
import de_history from '@/locales/de/history.json';
import de_scanner from '@/locales/de/scanner.json';

// ── Italian ─────────────────────────────────────────────────────────────────
import it_common from '@/locales/it/common.json';
import it_profileOptions from '@/locales/it/profileOptions.json';
import it_auth from '@/locales/it/auth.json';
import it_onboarding from '@/locales/it/onboarding.json';
import it_dashboard from '@/locales/it/dashboard.json';
import it_scan from '@/locales/it/scan.json';
import it_menu from '@/locales/it/menu.json';
import it_profile from '@/locales/it/profile.json';
import it_flagReasons from '@/locales/it/flagReasons.json';
import it_ingredients from '@/locales/it/ingredients.json';
import it_history from '@/locales/it/history.json';
import it_scanner from '@/locales/it/scanner.json';

// ── Portuguese ──────────────────────────────────────────────────────────────
import pt_common from '@/locales/pt/common.json';
import pt_profileOptions from '@/locales/pt/profileOptions.json';
import pt_auth from '@/locales/pt/auth.json';
import pt_onboarding from '@/locales/pt/onboarding.json';
import pt_dashboard from '@/locales/pt/dashboard.json';
import pt_scan from '@/locales/pt/scan.json';
import pt_menu from '@/locales/pt/menu.json';
import pt_profile from '@/locales/pt/profile.json';
import pt_flagReasons from '@/locales/pt/flagReasons.json';
import pt_ingredients from '@/locales/pt/ingredients.json';
import pt_history from '@/locales/pt/history.json';
import pt_scanner from '@/locales/pt/scanner.json';

// ── Dutch ───────────────────────────────────────────────────────────────────
import nl_common from '@/locales/nl/common.json';
import nl_profileOptions from '@/locales/nl/profileOptions.json';
import nl_auth from '@/locales/nl/auth.json';
import nl_onboarding from '@/locales/nl/onboarding.json';
import nl_dashboard from '@/locales/nl/dashboard.json';
import nl_scan from '@/locales/nl/scan.json';
import nl_menu from '@/locales/nl/menu.json';
import nl_profile from '@/locales/nl/profile.json';
import nl_flagReasons from '@/locales/nl/flagReasons.json';
import nl_ingredients from '@/locales/nl/ingredients.json';
import nl_history from '@/locales/nl/history.json';
import nl_scanner from '@/locales/nl/scanner.json';

// ── Polish ──────────────────────────────────────────────────────────────────
import pl_common from '@/locales/pl/common.json';
import pl_profileOptions from '@/locales/pl/profileOptions.json';
import pl_auth from '@/locales/pl/auth.json';
import pl_onboarding from '@/locales/pl/onboarding.json';
import pl_dashboard from '@/locales/pl/dashboard.json';
import pl_scan from '@/locales/pl/scan.json';
import pl_menu from '@/locales/pl/menu.json';
import pl_profile from '@/locales/pl/profile.json';
import pl_flagReasons from '@/locales/pl/flagReasons.json';
import pl_ingredients from '@/locales/pl/ingredients.json';
import pl_history from '@/locales/pl/history.json';
import pl_scanner from '@/locales/pl/scanner.json';

// ── Japanese ────────────────────────────────────────────────────────────────
import ja_common from '@/locales/ja/common.json';
import ja_profileOptions from '@/locales/ja/profileOptions.json';
import ja_auth from '@/locales/ja/auth.json';
import ja_onboarding from '@/locales/ja/onboarding.json';
import ja_dashboard from '@/locales/ja/dashboard.json';
import ja_scan from '@/locales/ja/scan.json';
import ja_menu from '@/locales/ja/menu.json';
import ja_profile from '@/locales/ja/profile.json';
import ja_flagReasons from '@/locales/ja/flagReasons.json';
import ja_ingredients from '@/locales/ja/ingredients.json';
import ja_history from '@/locales/ja/history.json';
import ja_scanner from '@/locales/ja/scanner.json';

// ── Chinese (Simplified) ────────────────────────────────────────────────────
import zh_common from '@/locales/zh/common.json';
import zh_profileOptions from '@/locales/zh/profileOptions.json';
import zh_auth from '@/locales/zh/auth.json';
import zh_onboarding from '@/locales/zh/onboarding.json';
import zh_dashboard from '@/locales/zh/dashboard.json';
import zh_scan from '@/locales/zh/scan.json';
import zh_menu from '@/locales/zh/menu.json';
import zh_profile from '@/locales/zh/profile.json';
import zh_flagReasons from '@/locales/zh/flagReasons.json';
import zh_ingredients from '@/locales/zh/ingredients.json';
import zh_history from '@/locales/zh/history.json';
import zh_scanner from '@/locales/zh/scanner.json';

// ── Korean ──────────────────────────────────────────────────────────────────
import ko_common from '@/locales/ko/common.json';
import ko_profileOptions from '@/locales/ko/profileOptions.json';
import ko_auth from '@/locales/ko/auth.json';
import ko_onboarding from '@/locales/ko/onboarding.json';
import ko_dashboard from '@/locales/ko/dashboard.json';
import ko_scan from '@/locales/ko/scan.json';
import ko_menu from '@/locales/ko/menu.json';
import ko_profile from '@/locales/ko/profile.json';
import ko_flagReasons from '@/locales/ko/flagReasons.json';
import ko_ingredients from '@/locales/ko/ingredients.json';
import ko_history from '@/locales/ko/history.json';
import ko_scanner from '@/locales/ko/scanner.json';

// ── Arabic ──────────────────────────────────────────────────────────────────
import ar_common from '@/locales/ar/common.json';
import ar_profileOptions from '@/locales/ar/profileOptions.json';
import ar_auth from '@/locales/ar/auth.json';
import ar_onboarding from '@/locales/ar/onboarding.json';
import ar_dashboard from '@/locales/ar/dashboard.json';
import ar_scan from '@/locales/ar/scan.json';
import ar_menu from '@/locales/ar/menu.json';
import ar_profile from '@/locales/ar/profile.json';
import ar_flagReasons from '@/locales/ar/flagReasons.json';
import ar_ingredients from '@/locales/ar/ingredients.json';
import ar_history from '@/locales/ar/history.json';
import ar_scanner from '@/locales/ar/scanner.json';

// ── Detect device language ──────────────────────────────────────────────────
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';

// ── Namespace list ──────────────────────────────────────────────────────────
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

// ── Helper to build a language resource bundle ──────────────────────────────
function bundle(
  common: object, profileOptions: object, auth: object, onboarding: object,
  dashboard: object, scan: object, menu: object, profile: object,
  flagReasons: object, ingredients: object, history: object, scanner: object,
) {
  return { common, profileOptions, auth, onboarding, dashboard, scan, menu, profile, flagReasons, ingredients, history, scanner };
}

// ── Initialise i18next ──────────────────────────────────────────────────────
i18n.use(initReactI18next).init({
  lng: deviceLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [...ns],
  resources: {
    en: bundle(en_common, en_profileOptions, en_auth, en_onboarding, en_dashboard, en_scan, en_menu, en_profile, en_flagReasons, en_ingredients, en_history, en_scanner),
    es: bundle(es_common, es_profileOptions, es_auth, es_onboarding, es_dashboard, es_scan, es_menu, es_profile, es_flagReasons, es_ingredients, es_history, es_scanner),
    fr: bundle(fr_common, fr_profileOptions, fr_auth, fr_onboarding, fr_dashboard, fr_scan, fr_menu, fr_profile, fr_flagReasons, fr_ingredients, fr_history, fr_scanner),
    de: bundle(de_common, de_profileOptions, de_auth, de_onboarding, de_dashboard, de_scan, de_menu, de_profile, de_flagReasons, de_ingredients, de_history, de_scanner),
    it: bundle(it_common, it_profileOptions, it_auth, it_onboarding, it_dashboard, it_scan, it_menu, it_profile, it_flagReasons, it_ingredients, it_history, it_scanner),
    pt: bundle(pt_common, pt_profileOptions, pt_auth, pt_onboarding, pt_dashboard, pt_scan, pt_menu, pt_profile, pt_flagReasons, pt_ingredients, pt_history, pt_scanner),
    nl: bundle(nl_common, nl_profileOptions, nl_auth, nl_onboarding, nl_dashboard, nl_scan, nl_menu, nl_profile, nl_flagReasons, nl_ingredients, nl_history, nl_scanner),
    pl: bundle(pl_common, pl_profileOptions, pl_auth, pl_onboarding, pl_dashboard, pl_scan, pl_menu, pl_profile, pl_flagReasons, pl_ingredients, pl_history, pl_scanner),
    ja: bundle(ja_common, ja_profileOptions, ja_auth, ja_onboarding, ja_dashboard, ja_scan, ja_menu, ja_profile, ja_flagReasons, ja_ingredients, ja_history, ja_scanner),
    zh: bundle(zh_common, zh_profileOptions, zh_auth, zh_onboarding, zh_dashboard, zh_scan, zh_menu, zh_profile, zh_flagReasons, zh_ingredients, zh_history, zh_scanner),
    ko: bundle(ko_common, ko_profileOptions, ko_auth, ko_onboarding, ko_dashboard, ko_scan, ko_menu, ko_profile, ko_flagReasons, ko_ingredients, ko_history, ko_scanner),
    ar: bundle(ar_common, ar_profileOptions, ar_auth, ar_onboarding, ar_dashboard, ar_scan, ar_menu, ar_profile, ar_flagReasons, ar_ingredients, ar_history, ar_scanner),
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
