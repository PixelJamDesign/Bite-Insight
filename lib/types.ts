export type DietaryTag =
  | 'diabetic'
  | 'keto'
  | 'gluten-free'
  | 'vegan'
  | 'vegetarian'
  | 'lactose'
  | 'pescatarian'
  | 'kosher'
  | 'halal';

export interface NutrientWatchlistEntry {
  offKey: string;        // e.g. "potassium_100g"
  nutrient: string;      // "Potassium"
  direction: 'limit' | 'boost';
  unit: 'mg' | 'µg' | 'g';
  source: string;        // "Heart Disease" — which condition suggested it
  reason: string;        // "May worsen heart condition"
}

export type OnboardingStep =
  | 'create_profile'
  | 'disclaimer'
  | 'app_tour'
  | 'complete';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  dietary_preferences: DietaryTag[];
  // Collected during onboarding (requires columns in profiles table):
  //   ALTER TABLE profiles ADD COLUMN health_conditions text[] DEFAULT '{}';
  //   ALTER TABLE profiles ADD COLUMN allergies text[] DEFAULT '{}';
  health_conditions: string[] | null;
  allergies: string[] | null;
  date_of_birth: string | null;
  is_plus: boolean;
  stripe_customer_id: string | null;
  liked_ingredients: string[] | null;
  disliked_ingredients: string[] | null;
  flagged_ingredients: string[] | null;
  nutrient_watchlist: NutrientWatchlistEntry[] | null;
  marketing_preferences: {
    promotional_emails: boolean;
    product_updates: boolean;
  } | null;
  onboarding_step: OnboardingStep;
  created_at: string;
}

export interface Scan {
  id: string;
  user_id: string;
  barcode: string;
  product_name: string;
  brand: string | null;
  image_url: string | null;
  nutriscore_grade: string | null;
  ingredients: Ingredient[];
  flagged_count: number;
  scanned_at: string;
}

export interface Ingredient {
  id: string;
  name: string;
  fact: string | null;
  image_url: string | null;
  is_flagged: boolean;
  flag_reason: string | null;
  dietary_tags: DietaryTag[];
}

export interface UserIngredientPreference {
  user_id: string;
  ingredient_id: string;
  preference: 'liked' | 'disliked' | 'flagged';
}

export interface DailyInsight {
  id: string;
  content: string;
  suitable_for: string[];
  created_at: string;
}

export interface FamilyProfile {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  avatar_url: string | null;
  dietary_preferences: DietaryTag[];
  health_conditions: string[];
  allergies: string[];
  nutrient_watchlist: NutrientWatchlistEntry[];
  created_at: string;
  updated_at: string;
}

// ── Recipes (Phase 1: My Recipes) ───────────────────────────────────────────

export type QuantityUnit = 'g' | 'ml' | 'unit' | 'pack' | 'tbsp' | 'tsp' | 'cup';

export type RecipeVisibility = 'private' | 'household' | 'public';

/**
 * Snapshot of a product taken at the moment it's added to a recipe.
 * Recipes must stay stable even if the OFF product is delisted/updated,
 * so we never fetch live data for cached recipes.
 */
export interface ProductSnapshot {
  product_name: string;
  brand: string | null;
  image_url: string | null;
  nutriscore_grade: string | null;
  nutrition_per_100g: {
    energy_kcal?: number;
    fat_g?: number;
    saturated_fat_g?: number;
    carbs_g?: number;
    sugars_g?: number;
    fiber_g?: number;
    protein_g?: number;
    salt_g?: number;
  };
  allergens: string[];
  ingredients: Array<{
    id?: string;
    name: string;
    is_flagged: boolean;
    dietary_tags?: DietaryTag[];
  }>;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  position: number;
  barcode: string | null;
  scan_id: string | null;
  quantity_value: number;
  quantity_unit: QuantityUnit;
  quantity_display: string | null;
  product_snapshot: ProductSnapshot;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  cover_image_url: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  method: string[];
  tags: string[];
  // Denormalised nutrition totals per serving
  total_kcal: number | null;
  total_fat_g: number | null;
  total_sat_fat_g: number | null;
  total_carbs_g: number | null;
  total_sugars_g: number | null;
  total_fiber_g: number | null;
  total_protein_g: number | null;
  total_salt_g: number | null;
  nutriscore_grade: string | null;
  visibility: RecipeVisibility;
  created_at: string;
  updated_at: string;
}

/** Recipe + its ingredients, as returned by getRecipe() */
export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

/** Household impact row — one per member + the active user */
export interface HouseholdImpactRow {
  memberId: string;         // 'self' for the active user, else family_profile.id
  name: string;
  avatarUrl: string | null;
  status: 'ok' | 'caution' | 'avoid';
  reasons: string[];        // human-readable reasons, e.g. "Contains gluten (coeliac)"
  flaggedIngredientIds: string[];  // recipe_ingredients.id values that triggered flags
}
