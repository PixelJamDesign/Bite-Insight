/**
 * Scan history writes — the one place a product is saved to `scans`.
 *
 * Opening a product saves it twice in quick succession: the scanner (or
 * food search) saves straight away, then scan-result saves again once the
 * full Open Food Facts record arrives. Both used to check "is this barcode
 * already in history?" at the same moment, both saw no, and both inserted,
 * leaving duplicate rows. Saves for the same user + barcode now run one
 * after another, so the second finds the first's row and updates it.
 */
import { supabase } from '@/lib/supabase';

export interface ScanHistoryFields {
  product_name: string | null;
  brand: string | null;
  image_url: string | null;
  nutriscore_grade: string | null;
}

const queue = new Map<string, Promise<void>>();

/**
 * Add the product to the user's history, or move it to the top if it's
 * already there. Never throws. `after` lets the caller hold the write until
 * something else is done (the scanner waits for its profile upsert).
 */
export function saveScanToHistory(
  userId: string,
  barcode: string,
  fields: ScanHistoryFields,
  opts: { after?: PromiseLike<unknown>; tag?: string } = {},
): Promise<void> {
  const key = `${userId}:${barcode}`;
  const tag = opts.tag ?? 'ScanHistory';
  const prev = queue.get(key) ?? Promise.resolve();
  const next = prev
    .then(() => opts.after)
    .then(() => writeScan(userId, barcode, fields, tag))
    .catch((err) => console.warn(`[${tag}] Scan history save failed:`, err));
  queue.set(key, next);
  next.finally(() => {
    if (queue.get(key) === next) queue.delete(key);
  });
  return next;
}

async function writeScan(userId: string, barcode: string, fields: ScanHistoryFields, tag: string) {
  const { data: existing } = await supabase
    .from('scans')
    .select('id')
    .eq('user_id', userId)
    .eq('barcode', barcode)
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from('scans')
        .update({ ...fields, scanned_at: new Date().toISOString() })
        .eq('id', existing.id)
    : await supabase
        .from('scans')
        .insert({ ...fields, user_id: userId, barcode, flagged_count: 0 });
  if (error) console.warn(`[${tag}] Scan history save failed:`, error.message);
}
