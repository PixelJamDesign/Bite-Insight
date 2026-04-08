// ── Date of Birth Helpers ───────────────────────────────────────────────────
// Compute age from a date string and format DOB for display.
// Supabase returns `date` columns as ISO strings (YYYY-MM-DD).

/**
 * Compute the user's current age in whole years from a date-of-birth string.
 * Returns `null` if the input is null/undefined/empty.
 */
export function computeAge(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob + 'T00:00:00'); // force local midnight — avoids timezone shift
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/**
 * Extract a YYYY-MM-DD string from a Date using LOCAL timezone (not UTC).
 * Avoids the classic off-by-one bug where toISOString() shifts the date
 * backwards for timezones ahead of UTC.
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format a DOB string for display using the device locale.
 * e.g. "1990-06-15" → "15 June 1990" (en-GB) or "June 15, 1990" (en-US).
 */
export function formatDob(dob: string | null | undefined): string {
  if (!dob) return '';
  const d = new Date(dob + 'T00:00:00');
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}
