/**
 * ingredientsCleaner.ts
 *
 * Utilities for cleaning, normalising, and translating ingredient text from
 * Open Food Facts.  The structured `ingredients` JSON from OFF is often poorly
 * parsed (merged entries, OCR artifacts, multilingual fragments).  These helpers
 * let us prefer the plain-text ingredient list for **display names** while
 * still attaching vegan/vegetarian metadata from the structured array.
 */

// Minimal OffIngredient shape — mirrors the type in scan-result.tsx.
export type OffIngredient = {
  id?: string;
  text: string;
  vegan?: string;       // "yes" | "no" | "maybe"
  vegetarian?: string;  // "yes" | "no" | "maybe"
  percent_estimate?: number;
};

// ── Text cleaning ────────────────────────────────────────────────────────────

/**
 * Cleans a single raw ingredient token coming from a comma-split of the
 * ingredients text field.
 */
function cleanToken(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, '')          // Remove parenthetical content e.g. (SOYA), (2%)
    .replace(/\d+([.,]\d+)?\s*%/g, '')  // Remove inline percentages e.g. "2%", "33.4 %"
    .replace(/\*/g, '')                 // Asterisks often denote organic — not useful here
    .replace(/\b\d+([.,]\d+)?\b/g, '')  // Standalone numbers e.g. "33 4"
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();
}

/**
 * Parses raw ingredients text (English) into an array of clean, sentence-cased
 * ingredient names.  Deduplicates and filters out empty / garbage entries.
 */
export function parseIngredientsText(text: string): string[] {
  if (!text) return [];

  const cleaned = [...new Set(
    text
      .split(/[,;]/)
      .map((s) => cleanToken(s))
      .filter((s) => s.length > 1 && !/^\d+$/.test(s))
      .map((s) => s.toLowerCase()),
  )];

  return cleaned.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

// ── Hybrid ingredient builder ────────────────────────────────────────────────

/**
 * Normalise a string for fuzzy comparison: lowercase, collapse whitespace,
 * strip common filler words.
 */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds a hybrid ingredient list that combines:
 *  - **clean display names** from `parseIngredientsText()`
 *  - **vegan / vegetarian metadata** from the structured OFF JSON
 *
 * Matching strategy (in priority order):
 *  1. Exact normalised match on `text` or `id` (sans `en:` prefix)
 *  2. One string contains the other (substring match)
 *  3. Significant word overlap (>= 50 % shared words of length > 2)
 *
 * Unmatched text entries are returned as plain `{ text }` objects which will
 * default to the "safe" category during categorisation.
 */
export function buildHybridIngredients(
  textNames: string[],
  structured: OffIngredient[],
): OffIngredient[] {
  if (textNames.length === 0) return structured; // nothing to improve

  // Build a pool of structured entries we haven't matched yet
  const pool = structured.map((ing) => ({ ...ing, used: false }));

  /**
   * Try to find the best unused structured ingredient matching `name`.
   * Returns the index in `pool` or -1.
   */
  function findMatch(name: string): number {
    const n = norm(name);
    const nWords = new Set(n.split(' ').filter((w) => w.length > 2));

    // Pass 1 — exact normalised text or id match
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].used) continue;
      const t = norm(pool[i].text);
      const idName = pool[i].id
        ? norm(pool[i].id!.replace(/^en:/, '').replace(/-/g, ' '))
        : '';
      if (t === n || idName === n) return i;
    }

    // Pass 2 — substring containment
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].used) continue;
      const t = norm(pool[i].text);
      const idName = pool[i].id
        ? norm(pool[i].id!.replace(/^en:/, '').replace(/-/g, ' '))
        : '';
      if (t.includes(n) || n.includes(t)) return i;
      if (idName && (idName.includes(n) || n.includes(idName))) return i;
    }

    // Pass 3 — word overlap >= 50 %
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].used) continue;
      const tWords = new Set(
        norm(pool[i].text).split(' ').filter((w) => w.length > 2),
      );
      if (tWords.size === 0 || nWords.size === 0) continue;
      let overlap = 0;
      for (const w of nWords) if (tWords.has(w)) overlap++;
      const score = overlap / Math.max(nWords.size, tWords.size);
      if (score >= 0.5 && score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  const result: OffIngredient[] = textNames.map((name) => {
    const idx = findMatch(name);
    if (idx >= 0) {
      pool[idx].used = true;
      // Use clean name but keep original metadata
      const { used: _, ...meta } = pool[idx] as any;
      return { ...meta, text: name } as OffIngredient;
    }
    // No structured match → safe by default
    return { text: name };
  });

  return result;
}

// ── Translation ──────────────────────────────────────────────────────────────

/**
 * Translates ingredient text from `sourceLang` to English using on-device
 * translation (Apple Translation API on iOS, Google ML Kit on Android) via
 * the `expo-translate-text` package.  No network calls, no API keys, no limits.
 *
 * Falls back to the original text on any error (e.g. unsupported language,
 * older OS version).
 */
export async function translateToEnglish(
  text: string,
  sourceLang: string,
): Promise<string> {
  if (!text || sourceLang === 'en') return text;

  try {
    const { onTranslateTask } = await import('expo-translate-text');
    const result = await onTranslateTask({
      input: text,
      sourceLangCode: sourceLang,
      targetLangCode: 'en',
    });
    if (result?.translatedTexts && typeof result.translatedTexts === 'string') {
      return result.translatedTexts;
    }
  } catch {
    // On-device translation unavailable (older OS, missing model, etc.)
    // — return the original text as-is.
  }
  return text;
}
