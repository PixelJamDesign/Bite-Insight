export type DietaryTag =
  | 'diabetic'
  | 'keto'
  | 'gluten-free'
  | 'vegan'
  | 'vegetarian'
  | 'lactose'
  | 'pescatarian'
  | 'kosher';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  dietary_preferences: DietaryTag[];
  // Collected during onboarding (requires columns in profiles table):
  //   ALTER TABLE profiles ADD COLUMN health_conditions text[] DEFAULT '{}';
  //   ALTER TABLE profiles ADD COLUMN allergies text[] DEFAULT '{}';
  health_conditions: string[] | null;
  allergies: string[] | null;
  age: number | null;
  is_plus: boolean;
  stripe_customer_id: string | null;
  liked_ingredients: string[] | null;
  disliked_ingredients: string[] | null;
  flagged_ingredients: string[] | null;
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
  suitable_for: DietaryTag[];
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
  created_at: string;
  updated_at: string;
}
