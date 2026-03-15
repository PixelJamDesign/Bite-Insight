/**
 * Additive severity classification for health-condition-aware ingredient highlighting.
 *
 * Each additive is assigned a severity level:
 *   'high'     — strong research evidence of harm (e.g. Southampton Six for ADHD)
 *   'moderate' — moderate concern or limited research
 *   'low'      — generally recognised as safe / benign
 *
 * Additives not in this map default to 'low'.
 *
 * Keys are lowercase OFF ingredient IDs (e.g. "en:e129") or plain names.
 * Each entry specifies which health conditions it's relevant to and a short reason.
 */

export type AdditiveSeverity = 'high' | 'moderate' | 'low';

export interface AdditiveEntry {
  severity: AdditiveSeverity;
  /** Which health conditions this additive is relevant to */
  conditions: string[];
  /** Short reason shown in the UI */
  reason: string;
  /** Optional group label (e.g. "Southampton Six") */
  group?: string;
}

// ── Southampton Six ──────────────────────────────────────────────────────────
// McCann et al. 2007 RCT — EU warning labels required on products containing these.

const SOUTHAMPTON_SIX: AdditiveEntry = {
  severity: 'high',
  conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
  reason: 'One of the Southampton Six dyes linked to hyperactivity in children (McCann et al. 2007)',
  group: 'Southampton Six',
};

// ── Severity map ─────────────────────────────────────────────────────────────
// Keyed by lowercase OFF ingredient ID (en:eNNN) or plain name.

export const ADDITIVE_SEVERITY_MAP: Record<string, AdditiveEntry> = {
  // ═══ HIGH SEVERITY — Strong research evidence ═════════════════════════════

  // Southampton Six artificial colors
  'en:e102': { ...SOUTHAMPTON_SIX, reason: 'Tartrazine (E102) — Southampton Six dye linked to hyperactivity in children' },
  'en:e104': { ...SOUTHAMPTON_SIX, reason: 'Quinoline Yellow (E104) — Southampton Six dye linked to hyperactivity in children' },
  'en:e110': { ...SOUTHAMPTON_SIX, reason: 'Sunset Yellow (E110) — Southampton Six dye linked to hyperactivity in children' },
  'en:e122': { ...SOUTHAMPTON_SIX, reason: 'Carmoisine (E122) — Southampton Six dye linked to hyperactivity in children' },
  'en:e124': { ...SOUTHAMPTON_SIX, reason: 'Ponceau 4R (E124) — Southampton Six dye linked to hyperactivity in children' },
  'en:e129': { ...SOUTHAMPTON_SIX, reason: 'Allura Red (E129) — Southampton Six dye linked to hyperactivity in children' },

  // Sodium benzoate — tested alongside Southampton Six
  'en:e211': {
    severity: 'high',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Sodium benzoate — linked to hyperactivity when combined with artificial colors (Southampton study)',
  },

  // Calcium propionate — 52% of children showed worsened behavior in challenge trial
  'en:e282': {
    severity: 'high',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Calcium propionate — associated with behavioral changes in children in challenge trials',
  },

  // ═══ MODERATE SEVERITY — Moderate concern / Feingold & FAILSAFE protocols ══

  // Other artificial colors of concern
  'en:e127': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Erythrosine (E127) — artificial color with thyroid and behavioral concerns',
  },
  'en:e132': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Indigo Carmine (E132) — artificial color flagged for behavioral sensitivity',
  },
  'en:e133': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Brilliant Blue (E133) — artificial color flagged for behavioral sensitivity',
  },
  'en:e143': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Fast Green (E143) — artificial color flagged for behavioral sensitivity',
  },

  // Preservatives — Feingold diet excludes
  'en:e212': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Potassium benzoate — same class as sodium benzoate (E211)',
  },
  'en:e320': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free', 'Clean Eating'],
    reason: 'BHA — synthetic antioxidant excluded by the Feingold diet',
  },
  'en:e321': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free', 'Clean Eating'],
    reason: 'BHT — synthetic antioxidant excluded by the Feingold diet',
  },
  'en:e319': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free', 'Clean Eating'],
    reason: 'TBHQ — synthetic antioxidant excluded by the Feingold diet',
  },

  // Propionates (other forms)
  'en:e280': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism'],
    reason: 'Propionic acid — animal studies show ASD-like behavioral effects',
  },
  'en:e281': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism'],
    reason: 'Sodium propionate — related to calcium propionate (E282) behavioral concerns',
  },
  'en:e283': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism'],
    reason: 'Potassium propionate — related to calcium propionate (E282) behavioral concerns',
  },

  // Nitrites / nitrates — processed meat preservatives
  'en:e250': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free', 'Clean Eating'],
    reason: 'Sodium nitrite — preservative in processed meats; Feingold diet excludes',
  },
  'en:e251': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free', 'Clean Eating'],
    reason: 'Sodium nitrate — preservative in cured meats; Feingold diet excludes',
  },

  // Artificial sweeteners
  'en:e951': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Aspartame — research found synergistic neurotoxic effects when combined with food colorings',
  },
  'en:e950': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Acesulfame K — artificial sweetener flagged by parent communities',
  },
  'en:e955': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Sucralose — concerns about gut microbiome disruption',
  },
  'en:e954': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Child-Friendly / Additive-Free'],
    reason: 'Saccharin — artificial sweetener flagged by Feingold diet',
  },

  // MSG and flavor enhancers
  'en:e621': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Migraine / Chronic Headaches', 'Child-Friendly / Additive-Free'],
    reason: 'MSG — excitatory neurotransmitter concerns; flagged by FAILSAFE diet',
  },
  'en:e627': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Migraine / Chronic Headaches'],
    reason: 'Disodium guanylate — flavor enhancer often paired with MSG',
  },
  'en:e631': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Migraine / Chronic Headaches'],
    reason: 'Disodium inosinate — flavor enhancer often paired with MSG',
  },

  // Sulfites
  'en:e220': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Eczema / Psoriasis', 'IBS'],
    reason: 'Sulphur dioxide — preservative that can trigger sensitivities',
  },
  'en:e223': {
    severity: 'moderate',
    conditions: ['ADHD', 'Autism', 'Eczema / Psoriasis', 'IBS'],
    reason: 'Sodium metabisulphite — sulfite preservative linked to sensitivities',
  },

  // Emulsifiers with gut-barrier concerns
  'en:e433': {
    severity: 'moderate',
    conditions: ['Autism', 'IBS', 'Leaky Gut Syndrome'],
    reason: 'Polysorbate 80 — associated with gut barrier disruption in animal studies',
  },
  'en:e407': {
    severity: 'moderate',
    conditions: ['IBS', 'Leaky Gut Syndrome', 'Clean Eating'],
    reason: 'Carrageenan — inflammatory concerns in gut health research',
  },
};

/**
 * Look up the severity of an additive by its OFF ingredient ID.
 * Returns the entry if found and relevant to at least one of the user's conditions,
 * or null if the additive is benign / not in the map.
 */
export function getAdditiveSeverity(
  offId: string,
  userConditions: string[],
): AdditiveEntry | null {
  const entry = ADDITIVE_SEVERITY_MAP[offId.toLowerCase()];
  if (!entry) return null;
  // Only flag if the additive is relevant to at least one of the user's conditions
  if (!entry.conditions.some((c) => userConditions.includes(c))) return null;
  return entry;
}

/**
 * Compute the overall additive severity score for the insight card.
 * Returns the highest severity found among all ingredients, weighted by count.
 */
export function computeAdditiveSeverity(
  ingredients: { id?: string }[],
  userConditions: string[],
): { severity: AdditiveSeverity; highCount: number; moderateCount: number; totalAdditives: number } {
  let highCount = 0;
  let moderateCount = 0;
  let totalAdditives = 0;

  for (const ing of ingredients) {
    const id = (ing.id ?? '').toLowerCase();
    if (!/^en:e\d+/.test(id)) continue;
    totalAdditives++;

    const entry = getAdditiveSeverity(id, userConditions);
    if (entry?.severity === 'high') highCount++;
    else if (entry?.severity === 'moderate') moderateCount++;
  }

  let severity: AdditiveSeverity = 'low';
  if (highCount > 0) severity = 'high';
  else if (moderateCount > 0) severity = 'moderate';

  return { severity, highCount, moderateCount, totalAdditives };
}
