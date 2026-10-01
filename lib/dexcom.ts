/**
 * Dexcom — app-side helpers for connecting a Dexcom account and reading
 * glucose.
 *
 * The app never holds a Dexcom token or the client secret. Everything
 * goes through the dexcom-* edge functions (supabase/functions/), which
 * keep the tokens server side and refresh them.
 *
 * Connecting:
 *   connectDexcom() → dexcom-oauth-start gives us Dexcom's login URL →
 *   opened in an auth browser session → Dexcom redirects to our
 *   dexcom-oauth-callback function → that redirects back to RETURN_PATH
 *   in the app with ?status=connected (or =error), which closes the session.
 */
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

/** In-app route the callback returns to. Must exist (app/dexcom-connected.tsx)
 *  so the web build's popup has a page to land on. */
const RETURN_PATH = 'dexcom-connected';

export interface DexcomStatus {
  connected: boolean;
  environment: 'sandbox' | 'production' | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

export interface GlucoseReading {
  /** ISO timestamp (UTC). */
  time: string;
  /** mg/dL — Dexcom's native unit. Convert with toMmol() for display. */
  value: number;
  trend: string | null;
}

export type ConnectResult =
  | { outcome: 'connected' }
  | { outcome: 'cancelled' }
  | { outcome: 'error'; message: string };

const MG_DL_PER_MMOL_L = 18.0182;

export function toMmol(mgdl: number): number {
  return Math.round((mgdl / MG_DL_PER_MMOL_L) * 10) / 10;
}

export async function getDexcomStatus(): Promise<DexcomStatus> {
  const { data, error } = await supabase.rpc('dexcom_connection_status');
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) {
    if (error) console.warn('[dexcom] status error:', error.message);
    return { connected: false, environment: null, connectedAt: null, lastSyncedAt: null };
  }
  return {
    connected: Boolean(row.connected),
    environment: row.environment ?? null,
    connectedAt: row.connected_at ?? null,
    lastSyncedAt: row.last_synced_at ?? null,
  };
}

/** Friendly text for the ?reason= the callback sends back on failure. */
function reasonMessage(reason: string | null): string {
  switch (reason) {
    case 'access_denied':
      return 'Dexcom access was declined.';
    case 'expired':
      return 'That took a little too long. Please try again.';
    case 'token_exchange':
      return "Dexcom didn't accept the connection. Please try again.";
    default:
      return 'Could not connect to Dexcom. Please try again.';
  }
}

export async function connectDexcom(): Promise<ConnectResult> {
  const returnUrl = Linking.createURL(RETURN_PATH);

  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(
    'dexcom-oauth-start',
    { body: { return_url: returnUrl } },
  );
  if (error || !data?.url) {
    console.warn('[dexcom] start failed:', error?.message ?? data?.error);
    return { outcome: 'error', message: 'Dexcom sign-in is not available right now.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, returnUrl);
  if (result.type !== 'success') return { outcome: 'cancelled' };

  const { queryParams } = Linking.parse(result.url);
  if (queryParams?.status === 'connected') return { outcome: 'connected' };
  const reason = typeof queryParams?.reason === 'string' ? queryParams.reason : null;
  return { outcome: 'error', message: reasonMessage(reason) };
}

export async function disconnectDexcom(): Promise<boolean> {
  const { error } = await supabase.functions.invoke('dexcom-disconnect', { body: {} });
  if (error) console.warn('[dexcom] disconnect failed:', error.message);
  return !error;
}

/**
 * Glucose readings between two times (max 30 days). Returns null when the
 * user isn't connected, or has to reconnect because Dexcom revoked access.
 */
export async function fetchGlucose(start: Date, end: Date): Promise<GlucoseReading[] | null> {
  const { data, error } = await supabase.functions.invoke<{
    connected: boolean;
    readings?: GlucoseReading[];
  }>('dexcom-egvs', { body: { start: start.toISOString(), end: end.toISOString() } });
  if (error) throw new Error(error.message);
  if (!data?.connected) return null;
  return data.readings ?? [];
}
