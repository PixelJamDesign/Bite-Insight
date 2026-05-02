/**
 * profileConflicts.ts — detects contradictions and redundancies in the
 * user's profile selections.
 *
 * Two tiers:
 *   • Tier 1 (hardConflicts) — combinations that must be resolved before
 *     the profile can be saved. Surfaced in the Conflict Review screen.
 *   • Tier 2 (redundancies)   — silent tidy-ups (e.g. coeliac implies
 *     gluten-free, so gluten-free is redundant). Auto-resolved.
 *
 * The function is pure: give it the current selections, get back what to
 * resolve. UI decides how to present.
 */

export interface ProfileSelection {
  healthConditions: string[];
  allergies: string[];
  dietaryPreferences: string[];
  ibsSubtype?: 'C' | 'D' | 'M' | 'unsure' | null;
  cancerSubtype?: 'colorectal' | 'breast' | 'prostate' | 'stomach' | 'other' | null;
  cfSubtype?: 'standard' | 'modulator' | 'cfrd' | 'all' | null;
  pregnancyStatus?: 'pregnant' | 'breastfeeding' | null;
}

export type ConflictTier = 'hard' | 'redundancy';

export interface Conflict {
  tier: ConflictTier;
  /** Machine-readable id so the UI can key on specific conflict types */
  id: string;
  /** Short headline for the review screen */
  title: string;
  /** One-line explanation in plain English */
  message: string;
  /**
   * Which selections are in play, so the UI can let the user choose which
   * to keep. Each is a (category, key) pair.
   */
  selections: Array<{
    category: 'health' | 'allergy' | 'dietary';
    key: string;
    /** Plain-English label for display (caller fills in via locales) */
  }>;
  /**
   * For Tier 2 redundancies, which key should be auto-removed to resolve.
   * For Tier 1, omitted (user picks).
   */
  autoRemove?: { category: 'health' | 'allergy' | 'dietary'; key: string };
}

export interface ConflictResult {
  hardConflicts: Conflict[];
  redundancies: Conflict[];
  /** Resolved selection with Tier 2 auto-removals applied */
  resolved: ProfileSelection;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function has(arr: string[], key: string): boolean {
  return arr.includes(key);
}

// ── Detection ────────────────────────────────────────────────────────────────

export function detectProfileConflicts(selection: ProfileSelection): ConflictResult {
  const hc = selection.healthConditions ?? [];
  const al = selection.allergies ?? [];
  const dp = selection.dietaryPreferences ?? [];
  const hardConflicts: Conflict[] = [];
  const redundancies: Conflict[] = [];
  const removed: Conflict['autoRemove'][] = [];

  // ── Tier 1: Hard contradictions ────────────────────────────────────────────

  if (has(dp, 'vegan') && has(dp, 'pescatarian')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'vegan_vs_pescatarian',
      title: 'Vegan and Pescatarian',
      message: "Vegans don't eat fish, so these two don't mix. Pick the one that fits.",
      selections: [
        { category: 'dietary', key: 'vegan' },
        { category: 'dietary', key: 'pescatarian' },
      ],
    });
  }
  if (has(dp, 'vegan') && has(dp, 'vegetarian')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'vegan_vs_vegetarian',
      title: 'Vegan and Vegetarian',
      message: 'Vegan already covers everything vegetarian does, plus more. Pick one.',
      selections: [
        { category: 'dietary', key: 'vegan' },
        { category: 'dietary', key: 'vegetarian' },
      ],
    });
  }
  if (has(dp, 'vegetarian') && has(dp, 'pescatarian')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'vegetarian_vs_pescatarian',
      title: 'Vegetarian and Pescatarian',
      message: "Pescatarian already means vegetarian who eats fish. Pick the one that fits best.",
      selections: [
        { category: 'dietary', key: 'vegetarian' },
        { category: 'dietary', key: 'pescatarian' },
      ],
    });
  }

  // Low-fibre vs IBS-C (constipation-predominant): actively harmful
  if (has(dp, 'lowFiber') && has(hc, 'ibs') && selection.ibsSubtype === 'C') {
    hardConflicts.push({
      tier: 'hard',
      id: 'lowfiber_vs_ibsc',
      title: 'Low Fibre with IBS-C',
      message: "A low fibre diet usually makes constipation-type IBS worse. Worth checking with your GP before combining these.",
      selections: [
        { category: 'dietary', key: 'lowFiber' },
        { category: 'health', key: 'ibs' },
      ],
    });
  }

  // Cancer + Keto: keto is very low in dietary fibre, which directly
  // counters the WCRF's primary cancer prevention recommendation
  // (≥30g/day fibre).
  if (has(hc, 'cancer') && has(dp, 'keto')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'cancer_vs_keto',
      title: 'Cancer and Keto',
      message:
        "The keto diet is very low in fibre, but increasing dietary fibre is one of the strongest evidence-based recommendations for cancer prevention and colorectal cancer risk reduction. Worth discussing with your oncology or medical team before combining these.",
      selections: [
        { category: 'health', key: 'cancer' },
        { category: 'dietary', key: 'keto' },
      ],
    });
  }

  // Pregnancy + keto: medical consensus against
  if (has(hc, 'pregnancy') && has(dp, 'keto')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'pregnancy_vs_keto',
      title: 'Pregnancy and Keto',
      message: "A ketogenic diet isn't recommended during pregnancy because your baby needs steady glucose for development. Chat to your GP before continuing keto.",
      selections: [
        { category: 'health', key: 'pregnancy' },
        { category: 'dietary', key: 'keto' },
      ],
    });
  }

  // CF + Weight Loss: directly contradictory for standard CF.
  // Most CF patients need significantly more calories than average, not
  // fewer. Modulator subtype users may have weight management as a
  // legitimate concern, but that's a clinical decision for their CF team
  // — not something the app should silently endorse via a weight-loss
  // dietary preference.
  if (has(hc, 'cf') && has(dp, 'weightLoss')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'cf_vs_weightloss',
      title: 'Cystic Fibrosis and Weight Loss',
      message:
        "A weight loss diet restricts calories, but most people with cystic fibrosis need significantly more calories than average — not fewer. These two goals work against each other. If you're on a CFTR modulator and weight management has become a concern, your CF dietitian can help find the right approach.",
      selections: [
        { category: 'health', key: 'cf' },
        { category: 'dietary', key: 'weightLoss' },
      ],
    });
  }

  // High protein + CKD: directly harmful
  if (has(dp, 'highProtein') && has(hc, 'ckd')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'highprotein_vs_ckd',
      title: 'High Protein with Kidney Disease',
      message: "CKD usually means keeping protein lower to reduce strain on your kidneys. A high protein diet works against that.",
      selections: [
        { category: 'dietary', key: 'highProtein' },
        { category: 'health', key: 'ckd' },
      ],
    });
  }

  // ── Tier 2: Redundancies (auto-resolve) ────────────────────────────────────
  // For each, we pick which key should be auto-removed and explain briefly.

  function addRedundancy(c: Omit<Conflict, 'tier' | 'autoRemove'> & { autoRemove: NonNullable<Conflict['autoRemove']> }) {
    redundancies.push({ ...c, tier: 'redundancy' });
    removed.push(c.autoRemove);
  }

  // Coeliac + Gluten-Free dietary pref (and + gluten allergy)
  if (has(hc, 'coeliac')) {
    if (has(al, 'gluten')) {
      addRedundancy({
        id: 'coeliac_implies_gluten_allergy',
        title: 'Gluten intolerance already covered',
        message: "Coeliac Disease already means strict gluten avoidance, so we've tidied the duplicate up.",
        selections: [
          { category: 'health', key: 'coeliac' },
          { category: 'allergy', key: 'gluten' },
        ],
        autoRemove: { category: 'allergy', key: 'gluten' },
      });
    }
  }

  // Lactose intolerance (allergy) + dairyFree (dietary)
  if (has(al, 'lactose') && has(dp, 'dairyFree')) {
    addRedundancy({
      id: 'lactose_implies_dairyfree',
      title: 'Lactose intolerance already covered',
      message: "Lactose Intolerance already means avoiding dairy, so we've tidied the duplicate up.",
      selections: [
        { category: 'allergy', key: 'lactose' },
        { category: 'dietary', key: 'dairyFree' },
      ],
      autoRemove: { category: 'dietary', key: 'dairyFree' },
    });
  }

  // Dairy allergy + dairyFree
  if (has(al, 'dairy') && has(dp, 'dairyFree')) {
    addRedundancy({
      id: 'dairy_allergy_implies_dairyfree',
      title: 'Dairy allergy already covered',
      message: "Dairy allergy already means avoiding dairy, so we've tidied the duplicate up.",
      selections: [
        { category: 'allergy', key: 'dairy' },
        { category: 'dietary', key: 'dairyFree' },
      ],
      autoRemove: { category: 'dietary', key: 'dairyFree' },
    });
  }

  // Diabetes (health) is also in dietary prefs on older profiles — unify
  // (We don't have a 'diabetic' dietary pref key in the current list, but
  // if it appears from legacy we'd remove it. Skipping unless found.)

  // Vegan implies dairyFree, egg allergy, fish allergy are all redundant
  if (has(dp, 'vegan')) {
    if (has(al, 'dairy')) {
      addRedundancy({
        id: 'vegan_implies_dairy_allergy',
        title: 'Dairy already covered by Vegan',
        message: "Vegan excludes all dairy, so we've tidied the duplicate up.",
        selections: [
          { category: 'dietary', key: 'vegan' },
          { category: 'allergy', key: 'dairy' },
        ],
        autoRemove: { category: 'allergy', key: 'dairy' },
      });
    }
    if (has(al, 'egg')) {
      addRedundancy({
        id: 'vegan_implies_egg_allergy',
        title: 'Eggs already covered by Vegan',
        message: "Vegan excludes eggs, so we've tidied the duplicate up.",
        selections: [
          { category: 'dietary', key: 'vegan' },
          { category: 'allergy', key: 'egg' },
        ],
        autoRemove: { category: 'allergy', key: 'egg' },
      });
    }
    if (has(al, 'fish')) {
      addRedundancy({
        id: 'vegan_implies_fish_allergy',
        title: 'Fish already covered by Vegan',
        message: "Vegan excludes fish, so we've tidied the duplicate up.",
        selections: [
          { category: 'dietary', key: 'vegan' },
          { category: 'allergy', key: 'fish' },
        ],
        autoRemove: { category: 'allergy', key: 'fish' },
      });
    }
    if (has(dp, 'dairyFree')) {
      addRedundancy({
        id: 'vegan_implies_dairyfree',
        title: 'Dairy-free already covered by Vegan',
        message: "Vegan excludes dairy, so we've tidied the duplicate up.",
        selections: [
          { category: 'dietary', key: 'vegan' },
          { category: 'dietary', key: 'dairyFree' },
        ],
        autoRemove: { category: 'dietary', key: 'dairyFree' },
      });
    }
  }

  // Halal and Kosher redundancies
  if (has(dp, 'halal')) {
    if (has(al, 'alcohol' as any)) {
      // no alcohol allergy key; skip
    }
  }
  if (has(dp, 'halal') && has(al, 'shellfish')) {
    // Not redundant — halal permits shellfish (depends on school), so leave alone
  }

  // Crohn's + Leaky Gut: not redundant, conceptually overlap but keep both

  // ── Apply Tier 2 auto-removals to produce the resolved selection ──────────
  const resolved: ProfileSelection = {
    healthConditions: hc.filter(
      (k) => !removed.some((r) => r?.category === 'health' && r.key === k),
    ),
    allergies: al.filter(
      (k) => !removed.some((r) => r?.category === 'allergy' && r.key === k),
    ),
    dietaryPreferences: dp.filter(
      (k) => !removed.some((r) => r?.category === 'dietary' && r.key === k),
    ),
    ibsSubtype: selection.ibsSubtype ?? null,
    cancerSubtype: selection.cancerSubtype ?? null,
    cfSubtype: selection.cfSubtype ?? null,
    pregnancyStatus: selection.pregnancyStatus ?? null,
  };

  return { hardConflicts, redundancies, resolved };
}
