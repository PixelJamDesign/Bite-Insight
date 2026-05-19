// ── OFF Taxonomy Walker ─────────────────────────────────────────────────────
// Walks the Open Food Facts ingredient taxonomy to determine whether a given
// ingredient ID is descended from a target ancestor (e.g. is en:dextrose
// under en:added-sugar?). Replaces brittle keyword matching for any
// ingredient that OFF has parsed into a structured ID.
//
// The merged parent map combines:
//   1. The pruned OFF taxonomy (constants/offTaxonomy.json) — ~5,100 nodes
//   2. Our local overrides (constants/taxonomyOverrides.ts) — gap fixes
//
// Both lookup and isDescendantOf cache results in-memory after first call.

import OFF_TAXONOMY_RAW from '@/constants/offTaxonomy.json';
import { TAXONOMY_OVERRIDES } from '@/constants/taxonomyOverrides';

// Type assertion — the JSON is a Record<string, string[]> by construction
// (see scripts/build-taxonomy.js).
const OFF_TAXONOMY = OFF_TAXONOMY_RAW as Record<string, string[]>;

/**
 * Returns the direct parents of an ingredient ID, merging OFF taxonomy
 * with our local overrides. Overrides are additive — they don't replace
 * OFF parents, they extend them.
 */
function getParents(id: string): string[] {
  const lc = id.toLowerCase();
  const off = OFF_TAXONOMY[lc] || [];
  const overrides = TAXONOMY_OVERRIDES[lc] || [];
  if (overrides.length === 0) return off;
  if (off.length === 0) return overrides;
  // Merge + dedup
  const merged = new Set([...off, ...overrides]);
  return Array.from(merged);
}

// Memoised ancestor sets — built lazily and cached for the process lifetime.
const ancestorCache = new Map<string, Set<string>>();

/**
 * Returns the full set of ancestor IDs for an ingredient (excluding the
 * ingredient itself). Walks the parent chain breadth-first with a cycle
 * guard. Result is cached.
 *
 *   ancestorsOf('en:dextrose')
 *     → { 'en:glucose', 'en:monosaccharide', 'en:added-sugar' }
 *   ancestorsOf('en:e150d')
 *     → {}  (root-level — E150d has no parents)
 */
export function ancestorsOf(id: string): Set<string> {
  const lc = id.toLowerCase();
  const cached = ancestorCache.get(lc);
  if (cached) return cached;

  const ancestors = new Set<string>();
  const queue: string[] = [lc];
  const seen = new Set<string>([lc]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const parents = getParents(current);
    for (const p of parents) {
      const pLc = p.toLowerCase();
      if (seen.has(pLc)) continue; // cycle guard
      seen.add(pLc);
      ancestors.add(pLc);
      queue.push(pLc);
    }
  }

  ancestorCache.set(lc, ancestors);
  return ancestors;
}

/**
 * Is `id` either equal to, or a descendant of, any of `targetAncestors`?
 *
 *   isDescendantOf('en:dextrose', ['en:added-sugar']) → true
 *   isDescendantOf('en:e150d',    ['en:added-sugar']) → false
 *   isDescendantOf('en:sea-salt', ['en:salt'])        → true
 *   isDescendantOf('en:salt',     ['en:salt'])        → true  (self-match)
 */
export function isDescendantOf(id: string, targetAncestors: string[]): boolean {
  if (!id || targetAncestors.length === 0) return false;
  const lc = id.toLowerCase();
  for (const target of targetAncestors) {
    const tLc = target.toLowerCase();
    if (lc === tLc) return true;
    if (ancestorsOf(lc).has(tLc)) return true;
  }
  return false;
}

/**
 * Returns which of `targetAncestors` the ingredient is descended from.
 * Useful for diagnostics and for reporting the most specific match.
 */
export function matchingAncestors(id: string, targetAncestors: string[]): string[] {
  if (!id || targetAncestors.length === 0) return [];
  const lc = id.toLowerCase();
  const anc = ancestorsOf(lc);
  const matched: string[] = [];
  for (const target of targetAncestors) {
    const tLc = target.toLowerCase();
    if (lc === tLc || anc.has(tLc)) matched.push(target);
  }
  return matched;
}

/**
 * Debugging helper — dumps the ancestor chain for one or more IDs.
 * Use from a REPL or a debug screen, not on the hot path.
 */
export function debugAncestors(ids: string | string[]): Record<string, string[]> {
  const list = Array.isArray(ids) ? ids : [ids];
  const out: Record<string, string[]> = {};
  for (const id of list) out[id] = Array.from(ancestorsOf(id));
  return out;
}
