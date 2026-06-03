/**
 * Open Food Facts API helpers — a single source of truth for how we identify
 * ourselves to OFF and stay within their terms of use.
 *
 * OFF require a custom User-Agent in the form `AppName/Version (ContactEmail)`
 * on every request (https://openfoodfacts.github.io/openfoodfacts-server/api/).
 * Building it here means the version tracks app.json automatically and the
 * contact email lives in one place.
 */
import Constants from 'expo-constants';

/** Contact email OFF can reach us on (sent in the User-Agent). */
export const OFF_CONTACT_EMAIL = 'hello@biteinsight.app';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

/** Conforming OFF User-Agent, e.g. "BiteInsight/1.8.0 (hello@biteinsight.app)". */
export const OFF_USER_AGENT = `BiteInsight/${APP_VERSION} (${OFF_CONTACT_EMAIL})`;

/** Headers to spread into every fetch to an Open Food Facts endpoint. */
export const OFF_HEADERS: Record<string, string> = {
  'User-Agent': OFF_USER_AGENT,
};

/** Public attribution link, per ODbL. */
export const OFF_URL = 'https://world.openfoodfacts.org';
