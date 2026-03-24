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
  percent?: number;
  ingredients?: OffIngredient[];  // sub-ingredients from OFF JSON
  depth?: number;                 // hierarchy depth (0 = top-level)
};

// ── Text cleaning ────────────────────────────────────────────────────────────

/**
 * Cleans a single raw ingredient token coming from a comma-split of the
 * ingredients text field.
 */
function cleanToken(raw: string): string {
  return raw
    .replace(/_/g, '')                   // Strip underscore allergen markers from OFF
    .replace(/\([^)]*\)/g, '')          // Remove parenthetical content e.g. (SOYA), (2%)
    .replace(/[()]/g, '')               // Strip any orphaned parens left after pair removal
    .replace(/\d+([.,]\d+)?\s*%/g, '')  // Remove inline percentages e.g. "2%", "33.4 %"
    .replace(/\*/g, '')                 // Asterisks often denote organic — not useful here
    .replace(/\b\d+([.,]\d+)?\b/g, '')  // Standalone numbers e.g. "33 4"
    .replace(/^[\s.\-:•·]+/, '')        // Strip leading periods, bullets, dashes, colons
    .replace(/^contains\s*:\s*/i, '')   // Strip "contains:" prefix from OFF sub-ingredients
    .replace(/\s+/g, ' ')              // Collapse whitespace
    .trim();
}

/**
 * Pre-process raw ingredient text before splitting on commas:
 *
 * 1. Strip trailing disclaimers that follow the ingredient list
 *    (e.g. "Produced from genetically modified sugar beets",
 *     "May contain traces of nuts").
 *
 * 2. Flatten bracketed sub-ingredient lists by replacing [ ] with commas.
 *    "Milk chocolate flavour coating [sugar, cocoa butter, chocolate]"
 *    becomes "Milk chocolate flavour coating, sugar, cocoa butter, chocolate".
 *    This preserves both the parent ingredient name and its sub-ingredients.
 *
 * 3. Handle nested brackets and curly braces the same way.
 */
function preprocessIngredientText(text: string): string {
  // Strip underscore allergen markers from OFF (e.g. "_milk_" → "milk")
  let s = text.replace(/_/g, '');

  // Strip trailing disclaimer sentences that follow the ingredient list.
  // These are separated from the last ingredient by a period or period-space.
  // Common patterns: "Produced from …", "May contain …", "Contains …",
  // "Manufactured in …", "Packaged in …", "Made in …", "Not a …",
  // "For allergen …", "See …", "Store …", "Best before …".
  s = s.replace(
    /\.\s*(produced|may contain|contains|manufactured|packaged|made|not a|for allergen|see |store |best before)\b[^,;]*/gi,
    '',
  );

  // Remove any remaining trailing period that ended the ingredient list
  s = s.replace(/\.\s*$/, '');

  // Flatten brackets (and curly braces) into commas so sub-ingredients
  // become top-level tokens.  "coating [sugar, butter]" → "coating , sugar, butter "
  s = s.replace(/[\[\]{}<>]/g, ',');

  // Collapse multiple consecutive commas / semicolons (from bracket replacement)
  s = s.replace(/[,;]\s*[,;]+/g, ',');

  return s;
}

/**
 * Parses raw ingredients text (English) into an array of clean, sentence-cased
 * ingredient names.  Deduplicates and filters out empty / garbage entries.
 */
export function parseIngredientsText(text: string): string[] {
  if (!text) return [];

  const preprocessed = preprocessIngredientText(text);

  const cleaned = [...new Set(
    preprocessed
      .split(/[,;]/)
      .map((s) => cleanToken(s))
      .filter((s) => s.length > 1 && !/^\d+$/.test(s))
      .map((s) => s.toLowerCase()),
  )];

  return cleaned.map((s) => s.charAt(0).toUpperCase() + s.slice(1));
}

/**
 * Cleans a single structured ingredient name.  Strips bracket fragments,
 * trailing disclaimers and OCR artifacts.  Exported so scan-result.tsx can
 * scrub the OFF structured JSON entries as well.
 */
export function cleanIngredientName(raw: string): string {
  let s = raw;
  // Strip underscore allergen markers from OFF (e.g. "_milk_" → "milk")
  s = s.replace(/_/g, '');
  // Strip trailing disclaimer text after a period
  s = s.replace(
    /\.\s*(produced|may contain|contains|manufactured|packaged|made|not a|for allergen|see |store |best before)\b.*/gi,
    '',
  );
  // Remove stray brackets
  s = s.replace(/[\[\]{}<>]/g, ' ');
  // Remove trailing periods
  s = s.replace(/\.\s*$/, '');
  // Strip leading periods, bullets, dashes, colons
  s = s.replace(/^[\s.\-:•·]+/, '');
  // Strip "contains:" prefix from OFF sub-ingredients
  s = s.replace(/^contains\s*:\s*/i, '');
  // Clean token (parenthetical content, percentages, numbers, etc.)
  s = cleanToken(s);
  return s;
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

// ── Hierarchical ingredient tree parser ──────────────────────────────────────
//
// The OFF API often returns a flat ingredient list even when the raw text
// encodes hierarchy with parentheses and brackets.  These functions parse
// the raw English ingredient text into a tree, flatten it with depth info,
// then enrich each entry with vegan/vegetarian metadata from the structured
// OFF JSON.

export type IngredientNode = { text: string; children: IngredientNode[] };

/**
 * Returns true if the content starting at `startPos` (just after an opening
 * bracket) up to the matching close bracket is just a percentage (e.g. "37%")
 * or a single uppercase allergen marker (e.g. "MILK").
 */
function isPercentageOrMarker(s: string, startPos: number): boolean {
  let j = startPos;
  let depth = 1;
  while (j < s.length && depth > 0) {
    const ch = s[j];
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (depth > 0) j++;
  }
  const content = s.substring(startPos, j).trim();
  // Pure percentage: "37%", "2.5 %", "33,4%"
  if (/^\d+([.,]\d+)?\s*%$/.test(content)) return true;
  // Single uppercase word — allergen marker: "MILK", "SOYA"
  if (/^[A-Z]{2,}$/.test(content)) return true;
  return false;
}

/**
 * Parses raw ingredient text into a tree where parenthesized/bracketed
 * groups become children of the preceding ingredient.
 *
 * "Gyoza filling (chicken, cabbage), gyoza skin (flour, water)"
 * → [ {text:"Gyoza filling", children:[{text:"chicken",...}, {text:"cabbage",...}]},
 *     {text:"Gyoza skin",   children:[{text:"flour",...},    {text:"water",...}]} ]
 */
export function parseIngredientTree(rawText: string): IngredientNode[] {
  let s = rawText
    .replace(/_/g, '')  // strip underscore allergen markers from OFF
    .replace(
      /\.\s*(produced|may contain|contains|manufactured|packaged|made|not a|for allergen|see |store |best before)\b.*/gi,
      '',
    )
    .replace(/\.\s*$/, '')
    .trim();

  if (!s) return [];

  let pos = 0;

  function parseLevel(): IngredientNode[] {
    const items: IngredientNode[] = [];
    let cur = '';

    while (pos < s.length) {
      const ch = s[pos];

      if (ch === '(' || ch === '[') {
        if (isPercentageOrMarker(s, pos + 1)) {
          // Skip entire percentage / marker group
          pos++; // skip opener
          let d = 1;
          while (pos < s.length && d > 0) {
            if (s[pos] === '(' || s[pos] === '[') d++;
            if (s[pos] === ')' || s[pos] === ']') d--;
            pos++;
          }
          continue;
        }
        const parentText = cur.trim();
        pos++; // skip opener
        const children = parseLevel();
        if (parentText) {
          items.push({ text: parentText, children });
        } else {
          items.push(...children);
        }
        cur = '';
      } else if (ch === ')' || ch === ']') {
        const remaining = cur.trim();
        if (remaining) items.push({ text: remaining, children: [] });
        pos++;
        return items;
      } else if (ch === ',' || ch === ';') {
        const token = cur.trim();
        if (token) items.push({ text: token, children: [] });
        cur = '';
        pos++;
      } else {
        cur += ch;
        pos++;
      }
    }

    const remaining = cur.trim();
    if (remaining) items.push({ text: remaining, children: [] });
    return items;
  }

  return parseLevel();
}

/**
 * Light cleaning for tree-parsed tokens (parens already handled by parser).
 */
export function cleanTreeToken(raw: string): string {
  return raw
    .replace(/_/g, '')                  // strip underscore allergen markers from OFF
    .replace(/\d+([.,]\d+)?\s*%/g, '') // stray inline percentages
    .replace(/\*/g, '')                 // organic asterisks
    .replace(/[\[\]{}<>()]/g, '')       // stray brackets/parens
    // Strip lead-in phrases from Open Food Facts (e.g. "In unknown quantities:", "Traces:")
    .replace(/^(in (unknown|varying) quantities\s*:|traces(\s+of)?\s*:|may contain\s*:)\s*/i, '')
    .replace(/^[\s.\-:•·]+/, '')        // strip leading periods, bullets, dashes, colons
    .replace(/^contains\s*:\s*/i, '')   // strip "contains:" prefix from OFF sub-ingredients
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Recursively flatten a tree into a depth-annotated list.
 */
function flattenTree(
  nodes: IngredientNode[],
  depth: number = 0,
): { text: string; depth: number }[] {
  const result: { text: string; depth: number }[] = [];
  for (const node of nodes) {
    result.push({ text: node.text, depth });
    if (node.children.length > 0) {
      result.push(...flattenTree(node.children, depth + 1));
    }
  }
  return result;
}

/**
 * Parses raw ingredient text into a flat list with hierarchy depth, then
 * enriches each entry with vegan/vegetarian metadata from the structured
 * OFF JSON.
 *
 * This is the primary function to call for hierarchical ingredient display.
 */
export function parseIngredientsWithHierarchy(
  rawText: string,
  structuredJson: OffIngredient[],
): OffIngredient[] {
  if (!rawText) return [];

  // 1. Parse text into tree, flatten with depth
  const tree = parseIngredientTree(rawText);
  const flat = flattenTree(tree);

  // 2. Clean tokens and filter garbage
  const cleaned = flat
    .map(({ text, depth }) => ({ text: cleanTreeToken(text), depth }))
    .filter(({ text }) => text.length > 1 && !/^\d+$/.test(text));

  // 3. Sentence-case
  const cased = cleaned.map(({ text, depth }) => ({
    text: text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
    depth,
  }));

  // 4. Enrich with metadata from structured JSON
  // Build lookup from structured entries (flat array from OFF)
  const pool = structuredJson.map((ing) => ({ ...ing, _used: false }));

  function findMatch(name: string): number {
    const n = name.toLowerCase().replace(/\s+/g, ' ').trim();
    const nWords = new Set(n.split(' ').filter((w) => w.length > 2));

    // Pass 1 — exact normalised text or id match
    for (let i = 0; i < pool.length; i++) {
      if (pool[i]._used) continue;
      const t = pool[i].text.toLowerCase().replace(/\s+/g, ' ').trim();
      const idName = pool[i].id
        ? pool[i].id!.replace(/^en:/, '').replace(/-/g, ' ').toLowerCase()
        : '';
      if (t === n || idName === n) return i;
    }

    // Pass 2 — substring containment
    for (let i = 0; i < pool.length; i++) {
      if (pool[i]._used) continue;
      const t = pool[i].text.toLowerCase().replace(/\s+/g, ' ').trim();
      const idName = pool[i].id
        ? pool[i].id!.replace(/^en:/, '').replace(/-/g, ' ').toLowerCase()
        : '';
      if ((t.includes(n) || n.includes(t)) && Math.min(t.length, n.length) > 2)
        return i;
      if (
        idName &&
        (idName.includes(n) || n.includes(idName)) &&
        Math.min(idName.length, n.length) > 2
      )
        return i;
    }

    // Pass 3 — word overlap ≥ 50 %
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < pool.length; i++) {
      if (pool[i]._used) continue;
      const tWords = new Set(
        pool[i].text
          .toLowerCase()
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .filter((w) => w.length > 2),
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

  return cased.map(({ text, depth }) => {
    const idx = findMatch(text);
    if (idx >= 0) {
      pool[idx]._used = true;
      const { _used, ...meta } = pool[idx] as any;
      return { ...meta, text, depth } as OffIngredient;
    }
    return { text, depth };
  });
}

// ── Flagged ingredient matching ──────────────────────────────────────────────

/**
 * Strips common English plural and verb suffixes for ingredient matching.
 * Handles plurals, past tense, and -ing forms so that:
 *   "potatoes" → "potato",  "breads" → "bread",   "berries" → "berry"
 *   "sugars" → "sugar",     "modified" → "modifi", "roasted" → "roast"
 *   "dehydrated" → "dehydrat", "sweetened" → "sweeten"
 *
 * Not a full stemmer — intentionally simple to avoid over-stemming.
 */
function deplural(word: string): string {
  // -ies → -y  (berries → berry, allergies → allergy)
  if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
  // -oes → -o  (potatoes → potato, tomatoes → tomato)
  if (word.endsWith('oes') && word.length > 4) return word.slice(0, -2);
  // -ves → -f  (halves → half, loaves → loaf) — but not "olives", "chives"
  if (word.endsWith('lves') && word.length > 5) return word.slice(0, -3) + 'f';
  if (word.endsWith('aves') && word.length > 5) return word.slice(0, -3) + 'f';
  // -ses → -s for words like "cheeses" (but "ses" alone = keep)
  if (word.endsWith('ses') && word.length > 5) return word.slice(0, -2);
  // -es after sh/ch/x/z/s (dishes→dish, sauces→sauc is wrong, so be careful)
  if (word.endsWith('es') && word.length > 3) {
    const pre = word.slice(0, -2);
    const last = pre[pre.length - 1];
    // Only strip -es after sibilant-like endings where -es is the plural form
    if ('shxz'.includes(last) || pre.endsWith('ch') || pre.endsWith('ss')) return pre;
    // For other -es words, also strip (catches "potatoes" via -oes above, "spices"→"spic")
    return pre;
  }
  // -s (but not -ss, -us, -is)
  if (word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is') && word.length > 2) return word.slice(0, -1);
  return word;
}

/**
 * Negation patterns that cancel a flagged-ingredient match.
 *
 * If the product name or ingredient text contains one of these patterns
 * around the flagged term, the match is suppressed.
 *
 * Covers: "sugar-free", "no added sugar", "zero sugar", "free from sugar",
 * "without sugar", "0% sugar", "no sugar", "unsweetened", etc.
 */
const NEGATION_PREFIXES = [
  'no added',
  'free from',
  'without',
  'zero',
  '0%',
  '0 %',
  'no',
];

/**
 * Checks whether a flagged term appears in a negated context within `text`.
 * e.g. "sugar" in "no added sugar baked beans" → true (negated)
 *      "sugar" in "sugar coated peanuts"       → false (not negated)
 *      "sugar" in "sugar-free jelly"           → true (negated via -free suffix)
 */
export function isNegatedInContext(text: string, flaggedTerm: string): boolean {
  const lc = text.toLowerCase();
  const term = flaggedTerm.toLowerCase();

  // Check for "X-free" or "X free" pattern (e.g. "sugar-free", "gluten free")
  const freePattern = new RegExp(
    `${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s-]*free`,
    'i',
  );
  if (freePattern.test(lc)) return true;

  // Check for negation prefixes before the term
  // e.g. "no added sugar", "zero sugar", "free from gluten"
  for (const prefix of NEGATION_PREFIXES) {
    const pattern = new RegExp(
      `${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
      'i',
    );
    if (pattern.test(lc)) return true;
  }

  return false;
}

/**
 * Checks whether `text` matches any of the given `flaggedNames`.
 *
 * Matching strategy:
 *  - Tokenizes both strings into lowercase words
 *  - Checks if ALL words in the flagged name appear in the target text
 *  - Handles simple plurals: "bread" matches "breads"
 *  - Suppresses matches when the term appears in a negated context
 *    (e.g. "no added sugar", "sugar-free", "zero sugar")
 *
 * Returns the original (non-lowercased) flagged name that matched, or null.
 *
 * When `isAllergyFlag` is false (dietary/preference flag), refined derivatives
 * like "potato starch", "corn starch", "rice flour" etc. are excluded because
 * they are processed to the point of being nutritionally different from the
 * base ingredient. When `isAllergyFlag` is true, these still match because
 * even trace proteins in refined products can trigger allergic reactions.
 *
 * Examples:
 *   matchesFlaggedIngredient("Hovis Wholemeal Bread", ["bread"]) → "bread"
 *   matchesFlaggedIngredient("Penne Pasta 500g", ["Penne Pasta"]) → "Penne Pasta"
 *   matchesFlaggedIngredient("en:sliced-breads", ["bread"]) → "bread"
 *   matchesFlaggedIngredient("Chocolate Cake", ["bread"]) → null
 *   matchesFlaggedIngredient("No Added Sugar Beans", ["sugar"]) → null  (negated)
 *   matchesFlaggedIngredient("Sugar-Free Jelly", ["sugar"]) → null  (negated)
 *   matchesFlaggedIngredient("potato starch", ["potato"], false) → null  (refined)
 *   matchesFlaggedIngredient("potato starch", ["potato"], true) → "potato" (allergy)
 */

// Refined derivatives that should NOT trigger dietary/preference flags.
// These are processed enough that their nutritional profile differs significantly
// from the base ingredient. They SHOULD still flag for allergies.
const REFINED_EXCLUSIONS: Record<string, string[]> = {
  potato: ['potato starch', 'potato flour', 'potato maltodextrin', 'potato protein', 'potato fibre', 'potato fiber', 'modified potato starch'],
  corn: ['corn starch', 'cornstarch', 'corn flour', 'cornflour', 'corn syrup', 'corn maltodextrin', 'modified corn starch', 'corn oil'],
  rice: ['rice starch', 'rice flour', 'rice syrup', 'rice protein', 'rice bran oil', 'rice maltodextrin'],
  wheat: ['wheat starch', 'wheat glucose syrup', 'wheat maltodextrin'],
  tapioca: ['tapioca starch', 'tapioca flour', 'tapioca maltodextrin'],
  pea: ['pea starch', 'pea protein', 'pea fibre', 'pea fiber', 'pea flour'],
};

export function matchesFlaggedIngredient(
  text: string,
  flaggedNames: string[],
  isAllergyFlag: boolean = true,
): string | null {
  if (!text || flaggedNames.length === 0) return null;

  // Normalise the target text: lowercase, replace hyphens/underscores with spaces,
  // strip "en:" OFF prefix, then tokenize into depluralized words
  const normText = text
    .toLowerCase()
    .replace(/^en:/, '')
    .replace(/[-_]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ');
  const textWords = new Set(
    normText.split(/\s+/).filter(w => w.length > 1).map(deplural),
  );
  const normTextJoined = normText.trim();

  for (const flagged of flaggedNames) {
    const flagLc = flagged.toLowerCase();

    // For dietary/preference flags (not allergy), skip refined derivatives.
    // e.g. "potato starch" should not trigger a "potato" dietary flag.
    if (!isAllergyFlag) {
      const exclusions = REFINED_EXCLUSIONS[flagLc];
      if (exclusions && exclusions.some(ex => normTextJoined.includes(ex))) continue;
    }

    const flagWords = flagLc
      .replace(/[-_]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1)
      .map(deplural);

    if (flagWords.length === 0) continue;

    // ALL words in the flagged name must appear in the target text
    if (flagWords.every(fw => textWords.has(fw))) {
      // Check if the match is negated (e.g. "no added sugar", "sugar-free")
      if (isNegatedInContext(text, flagged)) continue;
      return flagged;
    }

    // Check synonyms: if the target text matches a synonym of this flagged name,
    // return the original flagged name (so dedup works correctly)
    const synonyms = _getSynonyms(flagged.toLowerCase());
    for (const syn of synonyms) {
      const synWords = syn.split(/\s+/).filter(w => w.length > 1).map(deplural);
      if (synWords.length === 0) continue;
      // For single-word synonyms, check word set; for multi-word, check substring
      if (synWords.length === 1) {
        if (textWords.has(synWords[0])) {
          if (isNegatedInContext(text, syn)) continue;
          return flagged;
        }
      } else if (synWords.every(sw => textWords.has(sw)) || normTextJoined.includes(syn)) {
        if (isNegatedInContext(text, syn)) continue;
        return flagged;
      }
    }

    // Check derivatives: "sodium caseinate" → milk, "arachis oil" → peanut
    // If the ingredient text matches a known derivative of the flagged name,
    // flag it. This catches chemical names, E-numbers, and hidden allergens.
    const derivatives = _getDerivatives(flagged.toLowerCase());
    for (const deriv of derivatives) {
      if (deriv.length < 3) continue; // skip very short to avoid false positives
      // Check if derivative appears as whole word(s) in normalised text
      if (normTextJoined.includes(deriv)) {
        // Verify whole-word boundary
        const idx = normTextJoined.indexOf(deriv);
        const before = idx > 0 ? normTextJoined[idx - 1] : ' ';
        const after = idx + deriv.length < normTextJoined.length ? normTextJoined[idx + deriv.length] : ' ';
        if (/[\s,;()\/\-.:']/.test(before) || idx === 0) {
          if (/[\s,;()\/\-.:']/.test(after) || idx + deriv.length === normTextJoined.length) {
            if (isNegatedInContext(text, deriv)) continue;
            return flagged;
          }
        }
      }
    }
  }

  // Reverse lookup: check if the ingredient itself is a known derivative
  // of ANY flagged name. e.g. "casein" on label → parents ["milk"] → if user
  // flagged "milk", return "milk".
  // Uses findAllParentAllergens to catch multi-parent derivatives like
  // lecithin (egg + soy) or surimi (egg + fish + shellfish).
  const parentAllergens = _findAllParentAllergens(normTextJoined);
  for (const parent of parentAllergens) {
    for (const flagged of flaggedNames) {
      if (flagged.toLowerCase() === parent) {
        if (!isNegatedInContext(text, flagged)) return flagged;
      }
    }
  }

  return null;
}

// Lazy imports to avoid circular deps — cached after first call
let _synonymCache: ((name: string) => string[]) | null = null;
function _getSynonyms(name: string): string[] {
  if (!_synonymCache) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./ingredientSynonyms');
      _synonymCache = mod.getSynonyms;
    } catch {
      _synonymCache = () => [];
    }
  }
  return _synonymCache!(name);
}

let _derivativesCache: ((name: string) => string[]) | null = null;
function _getDerivatives(name: string): string[] {
  if (!_derivativesCache) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./ingredientDerivatives');
      _derivativesCache = mod.getDerivatives;
    } catch {
      _derivativesCache = () => [];
    }
  }
  return _derivativesCache!(name);
}

let _findAllParentsCache: ((text: string) => string[]) | null = null;
function _findAllParentAllergens(text: string): string[] {
  if (!_findAllParentsCache) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('./ingredientDerivatives');
      _findAllParentsCache = mod.findAllParentAllergens;
    } catch {
      _findAllParentsCache = () => [];
    }
  }
  return _findAllParentsCache!(text);
}

/**
 * Normalises an OFF category tag for human-readable matching.
 * "en:sliced-breads" → "sliced breads"
 */
export function normaliseCategoryTag(tag: string): string {
  return tag
    .replace(/^[a-z]{2}:/, '')  // strip language prefix
    .replace(/-/g, ' ')          // hyphens → spaces
    .toLowerCase();
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

  // On-device translation via expo-translate-text is disabled for now.
  // The native module crashes in Expo Go/dev client and prompts users to
  // download language packs on production builds — poor UX.
  // Most OFF products already have English ingredient text via ingredients_text_en.
  // TODO: Re-enable with a silent availability check once the library matures.
  return text;
}
