/**
 * Household impact calculator.
 *
 * Given a recipe's ingredients and the user's household (self + family_profiles),
 * returns a per-member assessment of whether the recipe is safe/cautious/avoid
 * based on each member's allergies, health conditions, and dietary preferences.
 *
 * Usage:
 *   const rows = computeHouseholdImpact(recipe.ingredients, selfProfile, familyProfiles);
 *   // rows: HouseholdImpactRow[] — one per member
 */
import type {
  RecipeIngredient,
  UserProfile,
  FamilyProfile,
  HouseholdImpactRow,
  DietaryTag,
} from './types';

// ── Allergen synonym map ─────────────────────────────────────────────────────
//
// Matches user-selected allergy names (from onboarding) to possible
// OFF allergen tags and ingredient-name keywords. Kept intentionally
// broad to favour safety (false positives > false negatives for allergies).
const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  'peanut': ['peanut', 'groundnut', 'arachis'],
  'peanuts': ['peanut', 'groundnut', 'arachis'],
  'peanut allergy': ['peanut', 'groundnut', 'arachis'],
  'tree nut': ['almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'pistachio', 'brazil', 'macadamia', 'tree nut', 'tree-nut'],
  'tree nuts': ['almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'pistachio', 'brazil', 'macadamia', 'tree nut', 'tree-nut'],
  'milk': ['milk', 'dairy', 'lactose', 'cheese', 'butter', 'cream', 'yoghurt', 'yogurt', 'whey', 'casein'],
  'dairy': ['milk', 'dairy', 'lactose', 'cheese', 'butter', 'cream', 'yoghurt', 'yogurt', 'whey', 'casein'],
  'lactose': ['lactose', 'milk', 'dairy', 'cheese', 'butter', 'cream', 'yoghurt', 'yogurt'],
  'lactose intolerance': ['lactose', 'milk', 'dairy', 'cheese', 'butter', 'cream'],
  'egg': ['egg', 'eggs', 'albumin', 'ovalbumin'],
  'eggs': ['egg', 'eggs', 'albumin', 'ovalbumin'],
  'gluten': ['gluten', 'wheat', 'barley', 'rye', 'spelt', 'kamut'],
  'gluten intolerance': ['gluten', 'wheat', 'barley', 'rye', 'spelt', 'kamut'],
  'coeliac': ['gluten', 'wheat', 'barley', 'rye', 'spelt'],
  'coeliac disease': ['gluten', 'wheat', 'barley', 'rye', 'spelt'],
  'celiac': ['gluten', 'wheat', 'barley', 'rye', 'spelt'],
  'soy': ['soy', 'soya', 'soybean', 'soybeans'],
  'soya': ['soy', 'soya', 'soybean', 'soybeans'],
  'fish': ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'anchovy', 'anchovies', 'sardine'],
  'shellfish': ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'crayfish', 'langoustine'],
  'crustacean': ['crustacean', 'shrimp', 'prawn', 'crab', 'lobster'],
  'molluscs': ['mussel', 'oyster', 'clam', 'squid', 'octopus', 'scallop'],
  'mustard': ['mustard'],
  'celery': ['celery'],
  'sesame': ['sesame', 'tahini'],
  'sulphites': ['sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228'],
  'lupin': ['lupin'],
};

// ── Dietary preference conflict map ──────────────────────────────────────────
//
// When a member has a dietary preference (e.g. 'vegan'), we flag any
// ingredient whose name contains these keywords or whose dietary_tags
// are missing the preference.
const DIETARY_CONFLICT_KEYWORDS: Record<DietaryTag, string[]> = {
  'vegan': ['meat', 'beef', 'pork', 'chicken', 'lamb', 'fish', 'milk', 'dairy', 'cheese', 'butter', 'cream', 'yoghurt', 'yogurt', 'egg', 'honey', 'gelatin', 'gelatine'],
  'vegetarian': ['meat', 'beef', 'pork', 'chicken', 'lamb', 'fish', 'salmon', 'tuna', 'gelatin', 'gelatine', 'anchovy'],
  'pescatarian': ['meat', 'beef', 'pork', 'chicken', 'lamb', 'gelatin', 'gelatine'],
  'halal': ['pork', 'bacon', 'ham', 'alcohol', 'wine', 'beer', 'rum', 'vodka', 'whisky', 'gelatin', 'gelatine', 'lard'],
  'kosher': ['pork', 'bacon', 'ham', 'shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'lard'],
  'gluten-free': ['gluten', 'wheat', 'barley', 'rye', 'spelt', 'kamut'],
  'lactose': ['lactose', 'milk', 'dairy', 'cheese', 'butter', 'cream', 'yoghurt', 'yogurt'],
  'keto': [],
  'diabetic': [],
};

// ── Health condition nutrient concerns ───────────────────────────────────────
//
// Lightweight check: given a condition, are there ingredients that are
// commonly problematic? This is intentionally conservative — the real logic
// for nutrient watchlists lives elsewhere. Here we just catch the obvious
// allergen-like conditions.
const CONDITION_KEYWORDS: Record<string, string[]> = {
  'coeliac disease': ['gluten', 'wheat', 'barley', 'rye', 'spelt'],
  'lactose intolerance': ['lactose', 'milk', 'dairy', 'cheese', 'butter', 'cream'],
  'egg allergy': ['egg', 'eggs', 'albumin'],
  'peanut allergy': ['peanut', 'groundnut'],
  'tree nut allergy': ['almond', 'hazelnut', 'walnut', 'cashew', 'pecan', 'pistachio'],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().trim();
}

function textContainsAny(text: string, keywords: string[]): boolean {
  const t = norm(text);
  return keywords.some((kw) => t.includes(norm(kw)));
}

interface HouseholdMember {
  id: string;              // 'self' or family_profile.id
  name: string;
  avatarUrl: string | null;
  allergies: string[];
  healthConditions: string[];
  dietaryPreferences: DietaryTag[];
}

function normalizeSelf(profile: UserProfile): HouseholdMember {
  return {
    id: 'self',
    name: profile.display_name || profile.full_name || 'You',
    avatarUrl: profile.avatar_url,
    allergies: profile.allergies ?? [],
    healthConditions: profile.health_conditions ?? [],
    dietaryPreferences: profile.dietary_preferences ?? [],
  };
}

function normalizeFamily(fp: FamilyProfile): HouseholdMember {
  return {
    id: fp.id,
    name: fp.name,
    avatarUrl: fp.avatar_url,
    allergies: fp.allergies ?? [],
    healthConditions: fp.health_conditions ?? [],
    dietaryPreferences: fp.dietary_preferences ?? [],
  };
}

// ── Per-ingredient conflict detection ────────────────────────────────────────

interface IngredientFlag {
  ingredientId: string;       // recipe_ingredient.id
  ingredientName: string;
  reason: string;             // human-readable: "Contains peanuts"
  severity: 'caution' | 'avoid';
}

function findFlagsForMember(
  ingredients: RecipeIngredient[],
  member: HouseholdMember,
): IngredientFlag[] {
  const flags: IngredientFlag[] = [];

  for (const ing of ingredients) {
    const snap = ing.product_snapshot;
    const productName = snap.product_name;
    const productIngredients = (snap.ingredients ?? []).map((i) => i.name).join(', ');
    const allergens = (snap.allergens ?? []).map(norm);
    const searchText = `${productName} ${productIngredients}`;

    // ── Allergies → avoid ─────────────────────────────────────────────────
    for (const allergy of member.allergies) {
      const keywords = ALLERGEN_SYNONYMS[norm(allergy)] ?? [norm(allergy)];

      // Check OFF allergens array (authoritative) first
      const hitsAllergenTag = keywords.some((kw) =>
        allergens.some((a) => a.includes(kw)),
      );
      // Fall back to ingredient text search
      const hitsText = textContainsAny(searchText, keywords);

      if (hitsAllergenTag || hitsText) {
        flags.push({
          ingredientId: ing.id,
          ingredientName: productName,
          reason: `Contains ${allergy.toLowerCase()}`,
          severity: 'avoid',
        });
        break; // one allergy flag per ingredient is enough
      }
    }

    // ── Dietary preferences → caution ─────────────────────────────────────
    for (const pref of member.dietaryPreferences) {
      const keywords = DIETARY_CONFLICT_KEYWORDS[pref] ?? [];
      if (keywords.length > 0 && textContainsAny(searchText, keywords)) {
        flags.push({
          ingredientId: ing.id,
          ingredientName: productName,
          reason: `Not suitable for ${pref}`,
          severity: 'caution',
        });
        break;
      }
    }

    // ── Health conditions → caution ───────────────────────────────────────
    for (const condition of member.healthConditions) {
      const keywords = CONDITION_KEYWORDS[norm(condition)];
      if (keywords && textContainsAny(searchText, keywords)) {
        flags.push({
          ingredientId: ing.id,
          ingredientName: productName,
          reason: `May affect ${condition.toLowerCase()}`,
          severity: 'caution',
        });
        break;
      }
    }
  }

  return flags;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Computes a row per household member showing whether the recipe is safe
 * for them. Self is always first. Members with no conflicts get 'ok'.
 */
export function computeHouseholdImpact(
  ingredients: RecipeIngredient[],
  selfProfile: UserProfile,
  familyProfiles: FamilyProfile[],
): HouseholdImpactRow[] {
  const members: HouseholdMember[] = [
    normalizeSelf(selfProfile),
    ...familyProfiles.map(normalizeFamily),
  ];

  return members.map((m) => {
    const flags = findFlagsForMember(ingredients, m);

    let status: HouseholdImpactRow['status'] = 'ok';
    if (flags.some((f) => f.severity === 'avoid')) status = 'avoid';
    else if (flags.length > 0) status = 'caution';

    // De-dupe reasons (e.g. two ingredients both contain peanuts → one reason)
    const reasons = Array.from(new Set(flags.map((f) => f.reason)));

    return {
      memberId: m.id,
      name: m.name,
      avatarUrl: m.avatarUrl,
      status,
      reasons,
      flaggedIngredientIds: flags.map((f) => f.ingredientId),
    };
  });
}

/**
 * Quick summary for list views: how many members are flagged?
 * Used on recipe cards to show "2 family flags" badges without loading
 * the full impact table.
 */
export function summariseHouseholdImpact(rows: HouseholdImpactRow[]): {
  totalMembers: number;
  okCount: number;
  cautionCount: number;
  avoidCount: number;
  anyFlag: boolean;
} {
  const okCount = rows.filter((r) => r.status === 'ok').length;
  const cautionCount = rows.filter((r) => r.status === 'caution').length;
  const avoidCount = rows.filter((r) => r.status === 'avoid').length;
  return {
    totalMembers: rows.length,
    okCount,
    cautionCount,
    avoidCount,
    anyFlag: cautionCount + avoidCount > 0,
  };
}
