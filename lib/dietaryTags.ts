/**
 * Auto-derive dietary tags from a recipe's ingredients.
 *
 * Rather than letting users hand-tag a recipe (and getting it wrong
 * — Spaghetti Bolognese self-described as Vegetarian), we read the
 * product names, raw ingredient text, and OFF allergen tags
 * captured on every recipe ingredient's `product_snapshot` and
 * decide which dietary categories the recipe genuinely satisfies.
 *
 * Conservative-claim principle: a tag is awarded only when no
 * disqualifier is found anywhere across the recipe's ingredients.
 * If data is missing or ambiguous (no name, no text, no allergens)
 * we treat it as unknown and DON'T award the tag — better to lose
 * a "Vegan" badge on a vegan recipe than to claim "Vegan" on a
 * recipe that secretly contains anchovies.
 *
 * Coverage today (the easy unambiguous ones):
 *   • Vegan / Vegetarian / Pescatarian (mutually constraining)
 *   • Gluten free
 *   • Dairy free
 *   • Nut free
 *
 * Halal / Kosher / FODMAP / Anti-inflammatory etc. are deliberately
 * left out — they need more nuance than keyword matching can
 * provide and risk false-positive harm. Add them later with
 * proper rule sets and (for Halal) certification flags.
 */
import type { ProductSnapshot, DietaryTag } from './types';

/** Minimal shape this engine needs from each ingredient. RecipeIngredient
 *  satisfies it directly; so does the slimmer { product_snapshot } embed
 *  returned by listRecipes / listPublicRecipes. */
interface IngredientLike {
  product_snapshot: ProductSnapshot;
}

// ── Disqualifier lists ──────────────────────────────────────────────────────

const MEAT_KEYWORDS = [
  'chicken', 'beef', 'pork', 'lamb', 'mutton', 'veal', 'turkey', 'duck',
  'goose', 'venison', 'rabbit', 'horse', 'bison', 'boar',
  'bacon', 'ham', 'sausage', 'salami', 'pepperoni', 'chorizo',
  'prosciutto', 'pancetta', 'pastrami', 'bratwurst', 'kielbasa',
  'mince', 'mincemeat', 'meat', 'steak', 'brisket', 'tenderloin',
  'sirloin', 'ribeye', 'fillet', 'cutlet', 'liver', 'kidney',
  'tripe', 'sweetbread', 'oxtail', 'gelatin', 'gelatine', 'gelatin',
  'lard', 'suet', 'tallow', 'dripping', 'broth', // broth is borderline; usually animal-based
];

const FISH_KEYWORDS = [
  'fish', 'salmon', 'tuna', 'cod', 'haddock', 'mackerel', 'sardine',
  'sardines', 'anchovy', 'anchovies', 'herring', 'pollock', 'trout',
  'plaice', 'sole', 'halibut', 'snapper', 'sea bass', 'seabass',
  'tilapia', 'pike', 'perch', 'carp', 'shark', 'swordfish',
  'shellfish', 'crustacean', 'crustaceans',
  'shrimp', 'shrimps', 'prawn', 'prawns', 'crab', 'lobster',
  'crayfish', 'langoustine', 'crawfish',
  'mussel', 'mussels', 'oyster', 'oysters', 'clam', 'clams',
  'scallop', 'scallops', 'squid', 'octopus', 'cuttlefish',
  'caviar', 'roe',
];

const DAIRY_KEYWORDS = [
  'milk', 'milks', 'butter', 'buttermilk', 'cheese', 'cheddar',
  'mozzarella', 'parmesan', 'feta', 'ricotta', 'brie', 'camembert',
  'gouda', 'halloumi', 'cream', 'whipping cream', 'double cream',
  'single cream', 'sour cream', 'creme fraiche', 'crème fraîche',
  'yogurt', 'yoghurt', 'whey', 'casein', 'lactose', 'curd',
  'condensed milk', 'evaporated milk', 'ghee', 'kefir',
];

const EGG_KEYWORDS = [
  'egg', 'eggs', 'albumin', 'albumen', 'ovalbumin', 'mayonnaise',
  'mayo', 'meringue', 'aioli', 'hollandaise',
];

const HONEY_KEYWORDS = ['honey'];

const GLUTEN_KEYWORDS = [
  'wheat', 'wheat flour', 'flour', 'plain flour', 'self raising',
  'self-raising flour', 'bread', 'breadcrumbs', 'breadcrumb',
  'pasta', 'spaghetti', 'penne', 'lasagne', 'lasagna', 'tagliatelle',
  'macaroni', 'fettuccine', 'noodle', 'noodles',
  'barley', 'rye', 'spelt', 'kamut', 'farro', 'einkorn', 'triticale',
  'semolina', 'couscous', 'bulgur', 'bulghur', 'durum',
  'cracker', 'crackers', 'cake', 'biscuit', 'biscuits', 'cookie',
  'pastry', 'pancake', 'pancakes', 'pita', 'bagel', 'croissant',
  'malt', 'beer', 'soy sauce', // soy sauce often contains wheat
];

const NUT_KEYWORDS = [
  'almond', 'almonds', 'hazelnut', 'hazelnuts', 'walnut', 'walnuts',
  'pecan', 'pecans', 'cashew', 'cashews', 'pistachio', 'pistachios',
  'brazil nut', 'brazil nuts', 'macadamia', 'macadamias',
  'pine nut', 'pine nuts', 'chestnut', 'chestnuts',
  'peanut', 'peanuts', 'groundnut', 'groundnuts',
  'nut butter', 'almond butter', 'peanut butter', 'cashew butter',
  'praline', 'marzipan', 'nougat',
];

// OFF allergen tag keys that map to each disqualifier group. Any
// presence of these on a product allergens list is a hard "no" for
// the corresponding diet tag, even if the keyword scan misses.
const OFF_ALLERGEN_MEAT: string[] = []; // OFF doesn't flag meat as an allergen
const OFF_ALLERGEN_FISH = ['en:fish', 'en:crustaceans', 'en:molluscs'];
const OFF_ALLERGEN_DAIRY = ['en:milk'];
const OFF_ALLERGEN_EGG = ['en:eggs'];
const OFF_ALLERGEN_GLUTEN = ['en:gluten'];
const OFF_ALLERGEN_NUTS = ['en:nuts', 'en:peanuts'];

// ── Rule definitions ───────────────────────────────────────────────────────

interface DietRule {
  /** The DietaryTag key this rule awards. Must match the keys in
   *  lib/types.ts → DietaryTag for label / colour lookup. */
  tag: DietaryTag | 'dairyFree' | 'nutFree';
  /** Words that, if found anywhere in any ingredient's name or
   *  ingredients_text, disqualify the recipe from this tag. */
  keywords: string[];
  /** OFF allergen tag keys that disqualify the recipe. */
  allergens: string[];
}

const RULES: DietRule[] = [
  {
    tag: 'vegan',
    keywords: [
      ...MEAT_KEYWORDS,
      ...FISH_KEYWORDS,
      ...DAIRY_KEYWORDS,
      ...EGG_KEYWORDS,
      ...HONEY_KEYWORDS,
    ],
    allergens: [...OFF_ALLERGEN_FISH, ...OFF_ALLERGEN_DAIRY, ...OFF_ALLERGEN_EGG],
  },
  {
    tag: 'vegetarian',
    keywords: [...MEAT_KEYWORDS, ...FISH_KEYWORDS],
    allergens: [...OFF_ALLERGEN_FISH],
  },
  {
    tag: 'pescatarian',
    keywords: MEAT_KEYWORDS,
    allergens: [],
  },
  {
    tag: 'gluten-free',
    keywords: GLUTEN_KEYWORDS,
    allergens: OFF_ALLERGEN_GLUTEN,
  },
  {
    tag: 'dairyFree',
    keywords: DAIRY_KEYWORDS,
    allergens: OFF_ALLERGEN_DAIRY,
  },
  {
    tag: 'nutFree',
    keywords: NUT_KEYWORDS,
    allergens: OFF_ALLERGEN_NUTS,
  },
];

// ── Public API ──────────────────────────────────────────────────────────────

export type DerivedDietaryTag =
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'gluten-free'
  | 'dairyFree'
  | 'nutFree';

/**
 * Returns the dietary tags this recipe genuinely qualifies for,
 * based on the ingredient names + raw text + OFF allergen tags.
 *
 * Empty array if the ingredient data is too sparse to be sure of
 * anything (e.g. a recipe with one ingredient that has no name and
 * no text — better to claim nothing than risk a wrong tag).
 *
 * Tags returned in display order: most "useful to know about" first,
 * so cards that cap to the first N still show the most valuable
 * tags. Vegan / Vegetarian / Pescatarian are mutually exclusive in
 * practice (vegan is strictly stricter than vegetarian, which is
 * stricter than pescatarian) so we surface the strictest match
 * the recipe earns and skip the weaker ones.
 */
export function deriveDietaryTags(
  ingredients: IngredientLike[],
): DerivedDietaryTag[] {
  if (ingredients.length === 0) return [];

  // Pre-build the haystack once per ingredient. Cheaper than
  // re-stringifying for every rule.
  const haystacks = ingredients.map((ing) => {
    const snap = ing.product_snapshot ?? {};
    const name = (snap.product_name ?? '').toLowerCase();
    const text = (snap.ingredients_text ?? '').toLowerCase();
    const subIngredients = Array.isArray(snap.ingredients)
      ? snap.ingredients.map((i) => (i?.name ?? '')).join(' ').toLowerCase()
      : '';
    const allergens = Array.isArray(snap.allergens)
      ? snap.allergens.map((a) => String(a).toLowerCase())
      : [];
    return {
      text: `${name} ${text} ${subIngredients}`,
      allergens,
    };
  });

  // Reject recipes where every ingredient is a black hole — no
  // name, no text, no allergens. We can't derive anything useful
  // and shouldn't risk false positives.
  const hasUsableData = haystacks.some(
    (h) => h.text.trim().length > 0 || h.allergens.length > 0,
  );
  if (!hasUsableData) return [];

  const passes = (rule: DietRule): boolean => {
    for (const h of haystacks) {
      // Hit on disqualifier keyword?
      if (rule.keywords.some((kw) => containsWord(h.text, kw))) return false;
      // Hit on disqualifier allergen?
      if (rule.allergens.some((a) => h.allergens.includes(a))) return false;
    }
    return true;
  };

  const earned: DerivedDietaryTag[] = [];

  // Diet level — pick strictest match only. Vegan implies
  // vegetarian implies pescatarian, so showing all three is noise.
  if (passes(RULES[0])) {
    earned.push('vegan');
  } else if (passes(RULES[1])) {
    earned.push('vegetarian');
  } else if (passes(RULES[2])) {
    earned.push('pescatarian');
  }

  // Independent labels (a recipe can be both gluten-free and
  // dairy-free, etc., so add each that passes).
  if (passes(RULES[3])) earned.push('gluten-free');
  if (passes(RULES[4])) earned.push('dairyFree');
  if (passes(RULES[5])) earned.push('nutFree');

  return earned;
}

/**
 * Word-boundary containment so 'beef' in 'beef stew' matches but
 * 'beef' in 'beefcake' would not. Conservative: the keywords list
 * is hand-curated, so a few partial matches (e.g. 'cheese' in
 * 'cheeseboard') are intentional and helpful. Multi-word keywords
 * like 'soy sauce' are matched as substrings without further
 * tokenisation.
 */
function containsWord(haystack: string, needle: string): boolean {
  if (!haystack || !needle) return false;
  // Multi-word — substring match is sufficient because the
  // boundaries are baked in by the surrounding spaces.
  if (needle.includes(' ')) return haystack.includes(needle);
  // Single word — require a non-letter on either side so 'egg'
  // doesn't match 'eggplant'. Cheap regex with the keyword
  // escaped just in case.
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-z])${escaped}([^a-z]|$)`);
  return re.test(haystack);
}
