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

export type ConflictTier = 'hard' | 'redundancy' | 'caution';

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
  /**
   * Tier 3 only. When a caution comes down to a single nutrient the two sides
   * disagree on (e.g. salt for CF vs high blood pressure), this carries enough
   * to (a) explain the tension on that nutrient's row in the watchlist step and
   * (b) record which side the user chose to follow. `options[].direction` is
   * what following that side means for the nutrient: a condition that wants the
   * nutrient kept down is 'limit', one that wants more is 'boost'.
   */
  resolvable?: {
    offKey: string;
    /** Display name for the nutrient heading, e.g. "Sodium", "Fibre". */
    nutrientName: string;
    /** Plain lowercase nutrient word for copy, e.g. "salt", "fibre". */
    nutrientLabel: string;
    options: Array<{
      category: 'health' | 'dietary';
      key: string;
      direction: 'limit' | 'boost';
    }>;
  };
}

export interface ConflictResult {
  hardConflicts: Conflict[];
  redundancies: Conflict[];
  /**
   * Tier 3 — non-blocking cautions. Combinations that pull in opposite
   * directions but can't be "resolved" by dropping one (e.g. two real
   * conditions), or that are an individual clinical call. We advise the user's
   * healthcare provider rather than forcing a choice. These do NOT block save.
   */
  cautions: Conflict[];
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
  const cautions: Conflict[] = [];
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

  // Keto + CKD: keto is high in protein and fat, so it has the same problem as
  // a high-protein diet for kidney disease.
  if (has(dp, 'keto') && has(hc, 'ckd')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'keto_vs_ckd',
      title: 'Keto with Kidney Disease',
      message: "Keto is high in protein and fat, but kidney disease usually means keeping protein down. Worth checking with your kidney team before combining these.",
      selections: [
        { category: 'dietary', key: 'keto' },
        { category: 'health', key: 'ckd' },
      ],
    });
  }

  // Pregnancy + Weight Loss: deliberately restricting calories isn't safe in pregnancy.
  if (has(hc, 'pregnancy') && has(dp, 'weightLoss')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'pregnancy_vs_weightloss',
      title: 'Pregnancy and Weight Loss',
      message: "Cutting calories to lose weight isn't recommended during pregnancy, when you and your baby need steady nutrition. Speak to your midwife or GP about the right approach.",
      selections: [
        { category: 'health', key: 'pregnancy' },
        { category: 'dietary', key: 'weightLoss' },
      ],
    });
  }

  // Gout + high-purine diets: high protein / keto are meat-heavy and raise uric acid.
  if (has(hc, 'gout') && has(dp, 'highProtein')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'gout_vs_highprotein',
      title: 'Gout and High Protein',
      message: "A high protein, meat-heavy diet raises uric acid, which is what triggers gout flares. These two work against each other.",
      selections: [
        { category: 'health', key: 'gout' },
        { category: 'dietary', key: 'highProtein' },
      ],
    });
  }
  if (has(hc, 'gout') && has(dp, 'keto')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'gout_vs_keto',
      title: 'Gout and Keto',
      message: "Keto tends to be meat-heavy and can push uric acid up, which makes gout flares more likely. Worth checking with your GP before combining these.",
      selections: [
        { category: 'health', key: 'gout' },
        { category: 'dietary', key: 'keto' },
      ],
    });
  }

  // Paleo is built around meat and fish — it can't sit alongside vegan,
  // plant-based or vegetarian. Pick one.
  for (const veg of ['vegan', 'plantBased', 'vegetarian'] as const) {
    if (has(dp, 'paleo') && has(dp, veg)) {
      const label = veg === 'plantBased' ? 'Plant-Based' : veg.charAt(0).toUpperCase() + veg.slice(1);
      hardConflicts.push({
        tier: 'hard',
        id: `paleo_vs_${veg}`,
        title: `Paleo and ${label}`,
        message: `Paleo is built around meat and fish, so it doesn't fit with a ${label.toLowerCase()} diet. Pick the one that matches how you eat.`,
        selections: [
          { category: 'dietary', key: 'paleo' },
          { category: 'dietary', key: veg },
        ],
      });
    }
  }
  // Whole30 needs meat and eggs and bans legumes and grains — nothing left for vegan.
  if (has(dp, 'whole30') && has(dp, 'vegan')) {
    hardConflicts.push({
      tier: 'hard',
      id: 'whole30_vs_vegan',
      title: 'Whole30 and Vegan',
      message: "Whole30 is built around meat, fish and eggs and rules out legumes and grains, so there's nothing left for a vegan diet. Pick the one that fits.",
      selections: [
        { category: 'dietary', key: 'whole30' },
        { category: 'dietary', key: 'vegan' },
      ],
    });
  }

  // ── Tier 3: Cautions (non-blocking — advise the healthcare provider) ────────

  function addCaution(c: Omit<Conflict, 'tier'>) {
    cautions.push({ ...c, tier: 'caution' });
  }

  // Cystic Fibrosis pulls toward high salt / fat / calories; cardiovascular and
  // blood-pressure conditions pull the other way. Two real conditions — we
  // don't force a choice, we point them to their care team.
  if (has(hc, 'cf') && has(hc, 'hypertension')) {
    addCaution({
      id: 'cf_vs_hypertension',
      title: 'Cystic Fibrosis and High Blood Pressure',
      message: "These two pull in opposite directions on salt — CF often needs more to replace what's lost in sweat, while high blood pressure needs it kept low. Your care team can tell you which to prioritise. Until then we'll leave salt off your watchlist.",
      selections: [
        { category: 'health', key: 'cf' },
        { category: 'health', key: 'hypertension' },
      ],
      resolvable: {
        offKey: 'salt_100g',
        nutrientName: 'Sodium',
        nutrientLabel: 'salt',
        options: [
          { category: 'health', key: 'cf', direction: 'boost' },
          { category: 'health', key: 'hypertension', direction: 'limit' },
        ],
      },
    });
  }
  if (has(hc, 'cf') && has(hc, 'heartDisease')) {
    addCaution({
      id: 'cf_vs_heartdisease',
      title: 'Cystic Fibrosis and Heart Disease',
      message: "CF often needs more salt and calories, while heart disease usually means keeping salt down. That's a balance for your care team to set. Until then we'll leave salt off your watchlist.",
      selections: [
        { category: 'health', key: 'cf' },
        { category: 'health', key: 'heartDisease' },
      ],
      resolvable: {
        offKey: 'salt_100g',
        nutrientName: 'Sodium',
        nutrientLabel: 'salt',
        options: [
          { category: 'health', key: 'cf', direction: 'boost' },
          { category: 'health', key: 'heartDisease', direction: 'limit' },
        ],
      },
    });
  }
  if (has(hc, 'cf') && has(hc, 'highCholesterol')) {
    addCaution({
      id: 'cf_vs_highcholesterol',
      title: 'Cystic Fibrosis and High Cholesterol',
      message: "CF tends to need high fat and calories, while high cholesterol usually means keeping fat down. Your care team can guide the balance. Until then we'll hold off flagging fat in either direction.",
      selections: [
        { category: 'health', key: 'cf' },
        { category: 'health', key: 'highCholesterol' },
      ],
    });
  }

  // Keto + Diabetes: can help Type 2, but risky with insulin / Type 1. Don't
  // block it — flag it as something to do with medical supervision.
  if (has(dp, 'keto') && has(hc, 'diabetes')) {
    addCaution({
      id: 'keto_with_diabetes',
      title: 'Keto with Diabetes',
      message: "Keto can help some people with Type 2 diabetes, but it needs medical supervision — especially if you take insulin — because of the risk of lows and ketoacidosis. Worth setting up with your diabetes team.",
      selections: [
        { category: 'dietary', key: 'keto' },
        { category: 'health', key: 'diabetes' },
      ],
    });
  }

  // Pregnancy + Whole30: not designed for pregnancy (restrictive elimination).
  if (has(hc, 'pregnancy') && has(dp, 'whole30')) {
    addCaution({
      id: 'pregnancy_with_whole30',
      title: 'Pregnancy and Whole30',
      message: "Whole30's own guidance says it isn't designed for pregnancy — it cuts out whole food groups you may need right now. Worth a word with your midwife or GP before continuing.",
      selections: [
        { category: 'health', key: 'pregnancy' },
        { category: 'dietary', key: 'whole30' },
      ],
    });
  }

  // Low fibre alongside conditions where fibre actively helps. Low-fibre is a
  // legitimate therapeutic diet (flares), so we don't force its removal.
  for (const cond of ['diabetes', 'heartDisease', 'highCholesterol'] as const) {
    if (has(dp, 'lowFiber') && has(hc, cond)) {
      const label = cond === 'heartDisease' ? 'heart disease' : cond === 'highCholesterol' ? 'high cholesterol' : 'diabetes';
      addCaution({
        id: `lowfiber_with_${cond}`,
        title: `Low Fibre with ${label.replace(/\b\w/g, (m) => m.toUpperCase())}`,
        message: `Fibre usually helps ${label}, so a low fibre diet works against it. If you're low fibre for a flare-up, that's fine — just worth raising with your GP so it's the right call for you.`,
        selections: [
          { category: 'dietary', key: 'lowFiber' },
          { category: 'health', key: cond },
        ],
        resolvable: {
          offKey: 'fiber_100g',
          nutrientName: 'Fibre',
          nutrientLabel: 'fibre',
          options: [
            { category: 'health', key: cond, direction: 'boost' },
            { category: 'dietary', key: 'lowFiber', direction: 'limit' },
          ],
        },
      });
    }
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

  return { hardConflicts, redundancies, cautions, resolved };
}

// ── Phase 2: applying the user's "which leads?" decision ──────────────────────
//
// Resolvable cautions come down to one nutrient the two sides disagree on. The
// app never forces a side — but the nutrient watchlist step already lets the
// user set that nutrient to limit / boost / neutral. These helpers read that
// per-nutrient choice back into a durable record of which side they followed,
// so we can remember it and label it later without re-nagging.

/** Map of conflict id → followed selection key, or 'both' when left neutral. */
export type ConflictPriorities = Record<string, string>;

/** The resolvable caution (if any) whose nutrient is this offKey. */
export function resolvableCautionForOffKey(
  offKey: string,
  cautions: Conflict[],
): Conflict | null {
  return cautions.find((c) => c.resolvable?.offKey === offKey) ?? null;
}

/** A disputed nutrient and the sides that disagree on it, for the notice card. */
export interface NutrientConflictGroup {
  offKey: string;
  nutrientName: string;
  nutrientLabel: string;
  sides: Array<{ category: 'health' | 'dietary'; key: string; direction: 'limit' | 'boost' }>;
}

/**
 * Collapse the resolvable cautions into one entry per disputed nutrient, with
 * the disagreeing sides unioned (so e.g. CF + hypertension + heart disease
 * shows a single "Sodium" block with all three sides, not two near-duplicates).
 */
export function nutrientConflictGroups(cautions: Conflict[]): NutrientConflictGroup[] {
  const byKey = new Map<string, NutrientConflictGroup>();
  for (const c of cautions) {
    const r = c.resolvable;
    if (!r) continue;
    let g = byKey.get(r.offKey);
    if (!g) {
      g = { offKey: r.offKey, nutrientName: r.nutrientName, nutrientLabel: r.nutrientLabel, sides: [] };
      byKey.set(r.offKey, g);
    }
    for (const o of r.options) {
      if (!g.sides.some((s) => s.category === o.category && s.key === o.key)) g.sides.push(o);
    }
  }
  return Array.from(byKey.values());
}

/**
 * Derive which side of each resolvable caution the user ended up following,
 * from their per-nutrient watchlist choices. A direction match → that side's
 * key; anything else (neutral / unset) → 'both', meaning no side chosen yet.
 */
export function deriveConflictPriorities(
  cautions: Conflict[],
  nutrientChoices: Record<string, 'limit' | 'boost' | 'none'>,
): ConflictPriorities {
  const out: ConflictPriorities = {};
  for (const c of cautions) {
    if (!c.resolvable) continue;
    const choice = nutrientChoices[c.resolvable.offKey];
    if (choice === 'limit' || choice === 'boost') {
      const side = c.resolvable.options.find((o) => o.direction === choice);
      out[c.id] = side ? side.key : 'both';
    } else {
      out[c.id] = 'both';
    }
  }
  return out;
}
