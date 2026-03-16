// ── Flag Reason Mappings ──────────────────────────────────────────────────────
// Dynamically builds predefined reasons based on the user's health conditions,
// allergies, and dietary preferences from onboarding. Used by FlagReasonSheet.
//
// Keys match the lowercase keys stored in the profiles table and defined in
// constants/profileOptions.ts  (e.g. 'diabetes', 'keto', 'celery').

export interface FlagReasonOption {
  text: string;
  source: string; // Display-ready label resolved via i18n
}

export interface FlagReasonGroup {
  source: string;
  reasons: string[];
}

// ── Health Conditions ────────────────────────────────────────────────────────

const HEALTH_CONDITION_REASONS: Record<string, string[]> = {
  ckd: [
    'Too high in sodium',
    'Too much potassium',
    'High in phosphorus',
    'Too much protein for kidneys',
    'Doctor advised to avoid',
  ],
  diabetes: [
    'Spikes blood sugar',
    'Causes energy crash',
    'Affects insulin levels',
    'Doctor advised to avoid',
    'Monitoring carb intake',
  ],
  hypertension: [
    'Raises blood pressure',
    'Too high in sodium',
    'Doctor advised to avoid',
    'Retaining water',
    'Heart health concern',
  ],
  ibs: [
    'Causes bloating / gas',
    'Triggers stomach cramps',
    'Causes diarrhoea',
    'FODMAP trigger',
    'Makes symptoms worse',
  ],
  highCholesterol: [
    'Raises cholesterol',
    'Too high in saturated fat',
    'Doctor advised to avoid',
    'Heart health concern',
    'Trying to lower LDL',
  ],
  eczema: [
    'Triggers flare-up',
    'Causes itching',
    'Causes inflammation',
    'Dermatologist advised',
    'Skin reaction',
  ],
  heartDisease: [
    'Heart health concern',
    'Too high in saturated fat',
    'Doctor advised to avoid',
    'Raises cholesterol',
    'High sodium risk',
  ],
  gerd: [
    'Triggers acid reflux',
    'Causes heartburn',
    'Irritates stomach',
    'Doctor advised to avoid',
    'Makes symptoms worse',
  ],
  pcos: [
    'Spikes blood sugar',
    'Causes hormonal imbalance',
    'Doctor advised to avoid',
    'Affects insulin levels',
    'Worsens symptoms',
  ],
  metabolicSyndrome: [
    'Spikes blood sugar',
    'Too high in saturated fat',
    'Doctor advised to avoid',
    'Weight management',
    'Affects insulin levels',
  ],
  migraine: [
    'Triggers migraines',
    'Contains trigger compounds',
    'Doctor advised to avoid',
    'Causes headaches',
    'Makes symptoms worse',
  ],
  crohns: [
    'Causes flare-up',
    'Irritates gut lining',
    'Doctor advised to avoid',
    'Causes diarrhoea',
    'Makes symptoms worse',
  ],
  uc: [
    'Causes flare-up',
    'Irritates colon',
    'Doctor advised to avoid',
    'Causes diarrhoea',
    'Makes symptoms worse',
  ],
  leakyGut: [
    'Irritates gut lining',
    'Increases permeability',
    'Doctor advised to avoid',
    'Causes inflammation',
    'Makes symptoms worse',
  ],
  sibo: [
    'Feeds bacterial overgrowth',
    'Causes bloating / gas',
    'Doctor advised to avoid',
    'FODMAP trigger',
    'Makes symptoms worse',
  ],
  me: [
    'Causes energy crash',
    'Worsens fatigue',
    'Doctor advised to avoid',
    'Causes brain fog',
    'Makes symptoms worse',
  ],
  ra: [
    'Causes inflammation',
    'Triggers joint pain',
    'Doctor advised to avoid',
    'Worsens symptoms',
    'Increases stiffness',
  ],
  lupus: [
    'Causes inflammation',
    'Triggers flare-up',
    'Doctor advised to avoid',
    'Worsens symptoms',
    'Affects immune system',
  ],
  ms: [
    'Causes inflammation',
    'Worsens symptoms',
    'Doctor advised to avoid',
    'Affects nerve health',
    'Triggers flare-up',
  ],
  osteoporosis: [
    'Leaches calcium',
    'Weakens bone density',
    'Doctor advised to avoid',
    'Affects mineral absorption',
    'Not bone-friendly',
  ],
  adhd: [
    'Affects focus / attention',
    'Contains artificial additives',
    'Causes hyperactivity',
    'Doctor advised to avoid',
    'Makes symptoms worse',
  ],
  autism: [
    'Causes sensory reaction',
    'Contains artificial additives',
    'Affects behaviour',
    'Doctor advised to avoid',
    'Makes symptoms worse',
  ],
  coeliac: [
    'Contains gluten',
    'Risk of cross-contamination',
    'Doctor advised to avoid',
    'Causes intestinal damage',
    'Makes symptoms worse',
  ],
  diverticular: [
    'Irritates the colon',
    'May trigger flare-up',
    'Doctor advised to avoid',
    'Causes discomfort',
    'Makes symptoms worse',
  ],
  endometriosis: [
    'Causes inflammation',
    'Worsens pain / cramps',
    'Doctor advised to avoid',
    'Hormonal disruption',
    'Makes symptoms worse',
  ],
  gout: [
    'High in purines',
    'Raises uric acid levels',
    'Doctor advised to avoid',
    'Triggers flare-up',
    'Makes symptoms worse',
  ],
  hashimotos: [
    'Affects thyroid function',
    'Causes inflammation',
    'Doctor advised to avoid',
    'Worsens autoimmune response',
    'Makes symptoms worse',
  ],
  hypothyroidism: [
    'Affects thyroid function',
    'Slows metabolism further',
    'Doctor advised to avoid',
    'Interferes with medication',
    'Makes symptoms worse',
  ],
  insulinResistance: [
    'Spikes blood sugar',
    'Worsens insulin resistance',
    'Doctor advised to avoid',
    'Affects insulin levels',
    'Makes symptoms worse',
  ],
  nafld: [
    'Increases liver fat',
    'Too high in sugar',
    'Doctor advised to avoid',
    'Too high in saturated fat',
    'Makes symptoms worse',
  ],
  preDiabetes: [
    'Spikes blood sugar',
    'Causes energy crash',
    'Doctor advised to avoid',
    'Monitoring carb intake',
    'Makes symptoms worse',
  ],
};

const GENERIC_CONDITION_REASONS: string[] = [
  'Makes symptoms worse',
  'Doctor advised to avoid',
  'Causes discomfort',
  'Worsens my condition',
  'Trying to eliminate',
];

// ── Allergies / Intolerances / Sensitivities ────────────────────────────────

const ALLERGY_REASONS: string[] = [
  'Risk of allergic reaction',
  'Causes hives / rash',
  'Causes swelling',
  'Doctor diagnosed',
  'Causes breathing difficulty',
];

const INTOLERANCE_REASONS: string[] = [
  'Causes bloating',
  'Causes stomach pain',
  'Causes nausea / diarrhoea',
  "Can't digest it",
  'Makes me feel unwell',
];

const SENSITIVITY_REASONS: string[] = [
  'Causes headaches',
  'Triggers reaction',
  'Causes skin flushing',
  'Doctor advised to avoid',
  'Sensitivity confirmed',
];

/** Classify each allergy key into its sub-type */
const ALLERGY_CLASSIFICATION: Record<string, 'allergy' | 'intolerance' | 'sensitivity'> = {
  celery: 'allergy',
  egg: 'allergy',
  fish: 'allergy',
  fructose: 'intolerance',
  gluten: 'intolerance',
  histamine: 'intolerance',
  lactose: 'intolerance',
  lupin: 'allergy',
  msg: 'sensitivity',
  mustard: 'allergy',
  peanut: 'allergy',
  salicylate: 'sensitivity',
  sesame: 'allergy',
  shellfish: 'allergy',
  soy: 'allergy',
  sulphite: 'sensitivity',
  treeNut: 'allergy',
};

// ── Dietary Preferences ─────────────────────────────────────────────────────

const DIETARY_PREFERENCE_REASONS: Record<string, string[]> = {
  vegan: [
    'Against my diet',
    'Ethical reasons',
    'Environmental concerns',
    'Animal welfare',
    "Don't want to consume",
  ],
  vegetarian: [
    'Against my diet',
    'Ethical reasons',
    'Environmental concerns',
    'Animal welfare',
    "Don't want to consume",
  ],
  plantBased: [
    'Against my diet',
    'Ethical reasons',
    'Environmental concerns',
    'Animal welfare',
    "Don't want to consume",
  ],
  keto: [
    'Too many carbs',
    'Knocks me out of ketosis',
    'Too much sugar',
    'Stalls weight loss',
    'Not keto-friendly',
  ],
  weightLoss: [
    'Too many calories',
    'Too high in sugar',
    'Too high in fat',
    'Stalls progress',
    'Trying to cut out',
  ],
  fodmap: [
    'High FODMAP ingredient',
    'Causes bloating',
    'Triggers IBS symptoms',
    'Dietitian advised to avoid',
    'Elimination phase',
  ],
  dairyFree: [
    'Contains dairy',
    'Avoiding all dairy',
    'Causes digestive issues',
    'Skin reaction',
    'Personal choice',
  ],
};

const GENERIC_DIETARY_REASONS: string[] = [
  "Doesn't fit my diet",
  'Trying to avoid',
  'Personal choice',
  'Health reasons',
  'Lifestyle choice',
];

// ── Display Name Resolver ─────────────────────────────────────────────────────
// Maps lowercase profile keys → human-readable display names.
// These are used as section headers in the FlagReasonSheet.
// A translation function can be passed for i18n support.

type TranslateFn = (key: string) => string;

function resolveDisplayName(
  key: string,
  namespace: 'healthConditions' | 'allergies' | 'dietaryPreferences',
  tpo?: TranslateFn,
): string {
  if (tpo) {
    const translated = tpo(`${namespace}.${key}`);
    // i18next returns the key path if missing — check for that
    if (translated && !translated.includes(`.${key}`)) {
      return translated;
    }
  }
  // Fallback: just return the key as-is
  return key;
}

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Given a user's profile data, builds a grouped list of flag reason options
 * dynamically based on their health conditions, allergies and dietary prefs.
 *
 * @param tpo — optional i18n translate function for the 'profileOptions' namespace.
 *              Pass `t` from `useTranslation('profileOptions')` to get localised headers.
 */
export function buildFlagReasonGroups(
  healthConditions: string[],
  allergies: string[],
  dietaryPreferences: string[],
  tpo?: TranslateFn,
): FlagReasonGroup[] {
  const groups: FlagReasonGroup[] = [];

  // Health conditions
  for (const condition of healthConditions) {
    const reasons = HEALTH_CONDITION_REASONS[condition] ?? GENERIC_CONDITION_REASONS;
    const source = resolveDisplayName(condition, 'healthConditions', tpo);
    groups.push({ source, reasons });
  }

  // Allergies / Intolerances / Sensitivities
  for (const allergy of allergies) {
    const classification = ALLERGY_CLASSIFICATION[allergy] ?? 'allergy';
    const reasons =
      classification === 'intolerance'
        ? INTOLERANCE_REASONS
        : classification === 'sensitivity'
          ? SENSITIVITY_REASONS
          : ALLERGY_REASONS;
    const source = resolveDisplayName(allergy, 'allergies', tpo);
    groups.push({ source, reasons });
  }

  // Dietary preferences
  for (const pref of dietaryPreferences) {
    const reasons = DIETARY_PREFERENCE_REASONS[pref] ?? GENERIC_DIETARY_REASONS;
    const source = resolveDisplayName(pref, 'dietaryPreferences', tpo);
    groups.push({ source, reasons });
  }

  return groups;
}
