/**
 * Converts a string to sentence case: first letter uppercase, rest lowercase.
 * Handles ALL CAPS input (e.g. "COCA-COLA" → "Coca-cola").
 * Preserves empty/null strings.
 */
export function sentenceCase(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
