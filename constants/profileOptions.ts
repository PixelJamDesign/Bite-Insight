/**
 * Stable keys for health conditions, allergies, dietary preferences, and relationships.
 *
 * These keys are used for:
 *  - Supabase storage (new writes save keys, not English strings)
 *  - i18n translation lookups: t('profileOptions:healthConditions.<key>')
 *  - Deduplicating the arrays that were previously copied across
 *    onboarding.tsx, signup.tsx, edit-profile.tsx, and add-family-member.tsx
 */

// ── Health Conditions ────────────────────────────────────────────────────────
export const HEALTH_CONDITION_KEYS = [
  'adhd',
  'autism',
  'ckd',
  'coeliac',
  'crohns',
  'diabetes',
  'diverticular',
  'eczema',
  'endometriosis',
  'fibromyalgia',
  'gerd',
  'gout',
  'hashimotos',
  'heartDisease',
  'highCholesterol',
  'hypertension',
  'hypothyroidism',
  'ibs',
  'insulinResistance',
  'leakyGut',
  'lupus',
  'me',
  'migraine',
  'ms',
  'nafld',
  'pcos',
  'preDiabetes',
  'ra',
  'sibo',
  'uc',
] as const;

export type HealthConditionKey = (typeof HEALTH_CONDITION_KEYS)[number];

// ── Allergies ────────────────────────────────────────────────────────────────
export const ALLERGY_KEYS = [
  'aloeVera',
  'celery',
  'dairy',
  'egg',
  'fish',
  'fructose',
  'gluten',
  'histamine',
  'lactose',
  'lupin',
  'msg',
  'mustard',
  'peanut',
  'raspberry',
  'salicylate',
  'sesame',
  'shellfish',
  'soy',
  'sulphite',
  'treeNut',
] as const;

export type AllergyKey = (typeof ALLERGY_KEYS)[number];

// ── Dietary Preferences ──────────────────────────────────────────────────────
export const DIETARY_PREFERENCE_KEYS = [
  'childFriendly',
  'cleanEating',
  'dairyFree',
  'fodmap',
  'highProtein',
  'keto',
  'mediterraneanDiet',
  'paleo',
  'plantBased',
  'postBariatric',
  'pregnancy',
  'sustainable',
  'vegan',
  'vegetarian',
  'weightLoss',
  'whole30',
] as const;

export type DietaryPreferenceKey = (typeof DIETARY_PREFERENCE_KEYS)[number];

// ── Relationships (family members) ───────────────────────────────────────────
export const RELATIONSHIP_KEYS = [
  'partner',
  'wife',
  'husband',
  'son',
  'daughter',
  'mother',
  'father',
  'sister',
  'brother',
  'other',
] as const;

export type RelationshipKey = (typeof RELATIONSHIP_KEYS)[number];

// ── Legacy Maps ──────────────────────────────────────────────────────────────
// Maps the OLD English string values (currently in Supabase) to the new keys.
// Used when reading existing profile data.

export const HEALTH_CONDITION_LEGACY_MAP: Record<string, HealthConditionKey> = {
  'ADHD': 'adhd',
  'Autism': 'autism',
  'CKD': 'ckd',
  'Chronic Kidney Disease': 'ckd',
  "Chron's Disease": 'crohns',
  'Diabetes': 'diabetes',
  'Eczema / Psoriasis': 'eczema',
  'GERD / Acid Reflux': 'gerd',
  'Heart Disease': 'heartDisease',
  'High Cholesterol': 'highCholesterol',
  'Hypertension': 'hypertension',
  'IBS': 'ibs',
  'Leaky Gut Syndrome': 'leakyGut',
  'Lupus': 'lupus',
  'ME / Chronic Fatigue': 'me',
  'Metabolic Syndrome': 'metabolicSyndrome' as HealthConditionKey, // legacy – removed from UI but kept for existing users
  'Migraine / Chronic Headaches': 'migraine',
  'Multiple Sclerosis': 'ms',
  'PCOS': 'pcos',
  'Rheumatoid Arthritis': 'ra',
  'SIBO': 'sibo',
  'Ulcerative Colitis': 'uc',
  'Coeliac Disease': 'coeliac',
  'Diverticular Disease': 'diverticular',
  'Endometriosis': 'endometriosis',
  'Fibromyalgia': 'fibromyalgia',
  'Gout': 'gout',
  "Hashimoto's Thyroiditis": 'hashimotos',
  'Hypothyroidism': 'hypothyroidism',
  'Insulin Resistance': 'insulinResistance',
  'NAFLD': 'nafld',
  'Pre-diabetes': 'preDiabetes',
};

export const ALLERGY_LEGACY_MAP: Record<string, AllergyKey> = {
  'Celery Allergy': 'celery',
  'Egg Allergy': 'egg',
  'Fish Allergy': 'fish',
  'Fructose Intolerance': 'fructose',
  'Gluten Intolerance': 'gluten',
  'Histamine Intolerance': 'histamine',
  'Lactose Intolerance': 'lactose',
  'Lupin Allergy': 'lupin',
  'MSG Sensitivity': 'msg',
  'Mustard Allergy': 'mustard',
  'Peanut Allergy': 'peanut',
  'Salicylate Sensitivity': 'salicylate',
  'Sesame Allergy': 'sesame',
  'Shellfish Allergy': 'shellfish',
  'Soy Allergy': 'soy',
  'Aloe Vera Allergy': 'aloeVera',
  'Dairy Allergy': 'dairy',
  'Raspberry Allergy': 'raspberry',
  'Sulphite Sensitivity': 'sulphite',
  'Tree Nut Allergy': 'treeNut',
};

export const DIETARY_PREFERENCE_LEGACY_MAP: Record<string, DietaryPreferenceKey> = {
  'Child-Friendly / Additive-Free': 'childFriendly',
  'Clean Eating': 'cleanEating',
  'Dairy-Free': 'dairyFree',
  'FODMAP Diet': 'fodmap',
  'Low-Carb / Keto': 'keto',
  'High-Protein / Fitness': 'highProtein',
  'Paleo': 'paleo',
  'Plant-Based': 'plantBased',
  'Post-Bariatric Surgery': 'postBariatric',
  'Pregnancy-safe Diet': 'pregnancy',
  'Sustainable / Eco': 'sustainable',
  'Weight Loss': 'weightLoss',
  'Whole30': 'whole30',
  'Mediterranean Diet': 'mediterraneanDiet',
  'Vegan': 'vegan',
  'Vegetarian': 'vegetarian',
};

// ── Normalise helpers ────────────────────────────────────────────────────────
// Accept either a legacy English string or a new key and return the key.

export function normalizeHealthCondition(value: string): HealthConditionKey {
  if ((HEALTH_CONDITION_KEYS as readonly string[]).includes(value)) {
    return value as HealthConditionKey;
  }
  return HEALTH_CONDITION_LEGACY_MAP[value] ?? (value as HealthConditionKey);
}

export function normalizeAllergy(value: string): AllergyKey {
  if ((ALLERGY_KEYS as readonly string[]).includes(value)) {
    return value as AllergyKey;
  }
  return ALLERGY_LEGACY_MAP[value] ?? (value as AllergyKey);
}

export function normalizeDietaryPreference(value: string): DietaryPreferenceKey {
  if ((DIETARY_PREFERENCE_KEYS as readonly string[]).includes(value)) {
    return value as DietaryPreferenceKey;
  }
  return DIETARY_PREFERENCE_LEGACY_MAP[value] ?? (value as DietaryPreferenceKey);
}
