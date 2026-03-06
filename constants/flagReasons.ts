// ── Flag Reason Mappings ──────────────────────────────────────────────────────
// Dynamically builds predefined reasons based on the user's health conditions,
// allergies, and dietary preferences from onboarding. Used by FlagReasonSheet.

export interface FlagReasonOption {
  text: string;
  source: string; // The condition/allergy/preference label, e.g. "Diabetes"
}

export interface FlagReasonGroup {
  source: string;
  reasons: string[];
}

// ── Health Conditions ────────────────────────────────────────────────────────

const HEALTH_CONDITION_REASONS: Record<string, string[]> = {
  Diabetes: [
    'Spikes blood sugar',
    'Causes energy crash',
    'Affects insulin levels',
    'Doctor advised to avoid',
    'Monitoring carb intake',
  ],
  Hypertension: [
    'Raises blood pressure',
    'Too high in sodium',
    'Doctor advised to avoid',
    'Retaining water',
    'Heart health concern',
  ],
  IBS: [
    'Causes bloating / gas',
    'Triggers stomach cramps',
    'Causes diarrhoea',
    'FODMAP trigger',
    'Makes symptoms worse',
  ],
  'High Cholesterol': [
    'Raises cholesterol',
    'Too high in saturated fat',
    'Doctor advised to avoid',
    'Heart health concern',
    'Trying to lower LDL',
  ],
  'Eczema / Psoriasis': [
    'Triggers flare-up',
    'Causes itching',
    'Causes inflammation',
    'Dermatologist advised',
    'Skin reaction',
  ],
  'Heart Disease': [
    'Heart health concern',
    'Too high in saturated fat',
    'Doctor advised to avoid',
    'Raises cholesterol',
    'High sodium risk',
  ],
  'GERD / Acid Reflux': [
    'Triggers acid reflux',
    'Causes heartburn',
    'Irritates stomach',
    'Doctor advised to avoid',
    'Makes symptoms worse',
  ],
  PCOS: [
    'Spikes blood sugar',
    'Causes hormonal imbalance',
    'Doctor advised to avoid',
    'Affects insulin levels',
    'Worsens symptoms',
  ],
  'Metabolic Syndrome': [
    'Spikes blood sugar',
    'Too high in saturated fat',
    'Doctor advised to avoid',
    'Weight management',
    'Affects insulin levels',
  ],
  'Migraine / Chronic Headaches': [
    'Triggers migraines',
    'Contains trigger compounds',
    'Doctor advised to avoid',
    'Causes headaches',
    'Makes symptoms worse',
  ],
  "Chron's Disease": [
    'Causes flare-up',
    'Irritates gut lining',
    'Doctor advised to avoid',
    'Causes diarrhoea',
    'Makes symptoms worse',
  ],
  'Ulcerative Colitis': [
    'Causes flare-up',
    'Irritates colon',
    'Doctor advised to avoid',
    'Causes diarrhoea',
    'Makes symptoms worse',
  ],
  'Leaky Gut Syndrome': [
    'Irritates gut lining',
    'Increases permeability',
    'Doctor advised to avoid',
    'Causes inflammation',
    'Makes symptoms worse',
  ],
  SIBO: [
    'Feeds bacterial overgrowth',
    'Causes bloating / gas',
    'Doctor advised to avoid',
    'FODMAP trigger',
    'Makes symptoms worse',
  ],
  'ME / Chronic Fatigue': [
    'Causes energy crash',
    'Worsens fatigue',
    'Doctor advised to avoid',
    'Causes brain fog',
    'Makes symptoms worse',
  ],
  'Rheumatoid Arthritis': [
    'Causes inflammation',
    'Triggers joint pain',
    'Doctor advised to avoid',
    'Worsens symptoms',
    'Increases stiffness',
  ],
  Lupus: [
    'Causes inflammation',
    'Triggers flare-up',
    'Doctor advised to avoid',
    'Worsens symptoms',
    'Affects immune system',
  ],
  'Multiple Sclerosis': [
    'Causes inflammation',
    'Worsens symptoms',
    'Doctor advised to avoid',
    'Affects nerve health',
    'Triggers flare-up',
  ],
  Osteoporosis: [
    'Leaches calcium',
    'Weakens bone density',
    'Doctor advised to avoid',
    'Affects mineral absorption',
    'Not bone-friendly',
  ],
  ADHD: [
    'Affects focus / attention',
    'Contains artificial additives',
    'Causes hyperactivity',
    'Doctor advised to avoid',
    'Makes symptoms worse',
  ],
  Autism: [
    'Causes sensory reaction',
    'Contains artificial additives',
    'Affects behaviour',
    'Doctor advised to avoid',
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

/** Classify each allergy label from onboarding into its sub-type */
const ALLERGY_CLASSIFICATION: Record<string, 'allergy' | 'intolerance' | 'sensitivity'> = {
  'Celery Allergy': 'allergy',
  'Egg Allergy': 'allergy',
  'Fish Allergy': 'allergy',
  'Fructose Intolerance': 'intolerance',
  'Gluten Intolerance': 'intolerance',
  'Histamine Intolerance': 'intolerance',
  'Lactose Intolerance': 'intolerance',
  'Lupin Allergy': 'allergy',
  'MSG Sensitivity': 'sensitivity',
  'Mustard Allergy': 'allergy',
  'Peanut Allergy': 'allergy',
  'Salicylate Sensitivity': 'sensitivity',
  'Sesame Allergy': 'allergy',
  'Shellfish Allergy': 'allergy',
  'Soy Allergy': 'allergy',
  'Sulphite Sensitivity': 'sensitivity',
  'Tree Nut Allergy': 'allergy',
};

// ── Dietary Preferences ─────────────────────────────────────────────────────

const DIETARY_PREFERENCE_REASONS: Record<string, string[]> = {
  Vegan: [
    'Against my diet',
    'Ethical reasons',
    'Environmental concerns',
    'Animal welfare',
    "Don't want to consume",
  ],
  Vegetarian: [
    'Against my diet',
    'Ethical reasons',
    'Environmental concerns',
    'Animal welfare',
    "Don't want to consume",
  ],
  'Plant-Based': [
    'Against my diet',
    'Ethical reasons',
    'Environmental concerns',
    'Animal welfare',
    "Don't want to consume",
  ],
  'Low-Carb / Keto': [
    'Too many carbs',
    'Knocks me out of ketosis',
    'Too much sugar',
    'Stalls weight loss',
    'Not keto-friendly',
  ],
  'Weight Loss': [
    'Too many calories',
    'Too high in sugar',
    'Too high in fat',
    'Stalls progress',
    'Trying to cut out',
  ],
  'FODMAP Diet': [
    'High FODMAP ingredient',
    'Causes bloating',
    'Triggers IBS symptoms',
    'Dietitian advised to avoid',
    'Elimination phase',
  ],
  'Dairy-Free': [
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

// ── Builder ─────────────────────────────────────────────────────────────────

/**
 * Given a user's profile data, builds a grouped list of flag reason options
 * dynamically based on their health conditions, allergies and dietary prefs.
 */
export function buildFlagReasonGroups(
  healthConditions: string[],
  allergies: string[],
  dietaryPreferences: string[],
): FlagReasonGroup[] {
  const groups: FlagReasonGroup[] = [];

  // Health conditions
  for (const condition of healthConditions) {
    const reasons = HEALTH_CONDITION_REASONS[condition] ?? GENERIC_CONDITION_REASONS;
    groups.push({ source: condition, reasons });
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
    groups.push({ source: allergy, reasons });
  }

  // Dietary preferences
  for (const pref of dietaryPreferences) {
    const reasons = DIETARY_PREFERENCE_REASONS[pref] ?? GENERIC_DIETARY_REASONS;
    groups.push({ source: pref, reasons });
  }

  return groups;
}
