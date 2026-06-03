/**
 * Anonymous Open Food Facts contributor id (`app_uuid`).
 *
 * OFF asks that writes made through a single app account carry a per-user
 * "salted random UUID" so contributions can be traced for moderation without
 * exposing who the user is. We generate one random v4 UUID per install, keep
 * it in SecureStore, and reuse it. It is NOT derived from the user's email or
 * account id — it's an opaque, stable, anonymous handle.
 */
import * as SecureStore from 'expo-secure-store';

const KEY = 'off_contributor_uuid';

/** RFC-4122 v4 UUID. Uniqueness (not crypto strength) is what matters here. */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get (or lazily create) this install's anonymous OFF contributor id. */
export async function getOffContributorId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(KEY);
    if (existing) return existing;
  } catch {
    /* SecureStore unavailable — fall through to a fresh id */
  }
  const id = uuidv4();
  try {
    await SecureStore.setItemAsync(KEY, id);
  } catch {
    /* best-effort persistence; a per-session id is still acceptable */
  }
  return id;
}
