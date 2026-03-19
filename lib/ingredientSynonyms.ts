/**
 * ingredientSynonyms.ts
 *
 * Maps common flagged ingredient names to their food-family synonyms.
 * When a user flags "bread", scanning a baguette should still trigger
 * a match because baguette IS bread.
 *
 * Keys are lowercased flagged names. Values are arrays of synonym terms
 * that should also be matched (lowercased).
 *
 * This is consulted by matchesFlaggedIngredient in ingredientsCleaner.ts.
 */

export const INGREDIENT_SYNONYMS: Record<string, string[]> = {
  // ── Bread family ──
  bread: [
    'baguette', 'ciabatta', 'sourdough', 'focaccia', 'brioche',
    'naan', 'pitta', 'pita', 'flatbread', 'tortilla', 'wrap',
    'crouton', 'breadcrumb', 'rye bread', 'pumpernickel',
    'challah', 'bagel', 'roll', 'bun', 'loaf',
  ],

  // ── Pasta family ──
  pasta: [
    'spaghetti', 'penne', 'fusilli', 'macaroni', 'tagliatelle',
    'fettuccine', 'linguine', 'rigatoni', 'farfalle', 'orzo',
    'lasagne', 'lasagna', 'ravioli', 'tortellini', 'gnocchi',
    'noodle', 'vermicelli', 'couscous',
  ],

  // ── Rice family ──
  rice: [
    'basmati', 'jasmine rice', 'arborio', 'risotto',
    'wild rice', 'brown rice', 'white rice', 'parboiled rice',
    'sticky rice', 'sushi rice', 'rice flour', 'rice starch',
    'rice noodle', 'rice cake',
  ],

  // ── Sugar family ──
  sugar: [
    'glucose', 'fructose', 'sucrose', 'dextrose', 'maltose',
    'glucose syrup', 'corn syrup', 'high fructose corn syrup',
    'golden syrup', 'treacle', 'molasses', 'agave',
    'maple syrup', 'honey', 'invert sugar', 'cane sugar',
    'brown sugar', 'icing sugar', 'demerara', 'muscovado',
    'coconut sugar', 'date syrup', 'rice syrup', 'maltodextrin',
    'isoglucose', 'caramel',
  ],

  // ── Milk / dairy family ──
  milk: [
    'cream', 'butter', 'cheese', 'yoghurt', 'yogurt',
    'whey', 'casein', 'lactose', 'ghee', 'curd',
    'buttermilk', 'skimmed milk', 'whole milk', 'semi skimmed',
    'condensed milk', 'evaporated milk', 'milk powder',
    'double cream', 'single cream', 'sour cream', 'clotted cream',
    'creme fraiche', 'fromage frais', 'quark', 'kefir',
    'mascarpone', 'ricotta', 'mozzarella', 'cheddar',
    'parmesan', 'brie', 'camembert', 'gouda', 'emmental',
  ],

  // ── Wheat / gluten family ──
  wheat: [
    'wheat flour', 'wheat starch', 'wheat gluten', 'wheat bran',
    'wheat germ', 'semolina', 'bulgur', 'spelt', 'kamut',
    'durum', 'durum wheat', 'wholemeal flour', 'plain flour',
    'self raising flour', 'strong flour',
  ],
  gluten: [
    'wheat', 'barley', 'rye', 'oat', 'spelt', 'kamut',
    'semolina', 'bulgur', 'triticale', 'malt', 'malt extract',
    'wheat flour', 'barley malt',
  ],

  // ── Egg family ──
  egg: [
    'egg white', 'egg yolk', 'egg powder', 'dried egg',
    'pasteurised egg', 'free range egg', 'liquid egg',
    'albumen', 'egg lecithin', 'mayonnaise',
  ],

  // ── Soy family ──
  soy: [
    'soya', 'soybean', 'soy sauce', 'soy lecithin', 'tofu',
    'tempeh', 'edamame', 'miso', 'soy protein',
    'soya bean', 'soya flour', 'soya oil', 'soy milk',
  ],

  // ── Nut families ──
  peanut: [
    'peanut butter', 'peanut oil', 'groundnut', 'monkey nut',
    'arachis oil',
  ],
  'tree nut': [
    'almond', 'walnut', 'cashew', 'pistachio', 'hazelnut',
    'pecan', 'macadamia', 'brazil nut', 'chestnut', 'pine nut',
    'praline', 'marzipan', 'frangipane', 'nougat',
  ],

  // ── Red meat family ──
  'red meat': [
    'beef', 'pork', 'lamb', 'mutton', 'veal', 'venison',
    'bison', 'goat', 'steak', 'mince', 'mincemeat',
    'bacon', 'ham', 'sausage', 'salami', 'pepperoni',
    'chorizo', 'prosciutto', 'pancetta',
  ],

  // ── Processed meat ──
  'processed meat': [
    'bacon', 'ham', 'sausage', 'salami', 'pepperoni',
    'chorizo', 'hot dog', 'frankfurter', 'deli meat',
    'corned beef', 'spam', 'pate', 'prosciutto', 'pancetta',
    'mortadella', 'bresaola', 'jerky',
  ],

  // ── Fish family ──
  fish: [
    'cod', 'salmon', 'tuna', 'haddock', 'mackerel', 'sardine',
    'anchovy', 'trout', 'bass', 'halibut', 'plaice', 'sole',
    'pollock', 'herring', 'pilchard', 'tilapia', 'swordfish',
    'fish finger', 'fish cake', 'fish oil', 'fish sauce',
  ],

  // ── Shellfish family ──
  shellfish: [
    'prawn', 'shrimp', 'crab', 'lobster', 'crayfish',
    'mussel', 'clam', 'oyster', 'scallop', 'squid',
    'calamari', 'octopus', 'cockle', 'whelk', 'langoustine',
  ],

  // ── Alcohol family ──
  alcohol: [
    'wine', 'beer', 'lager', 'ale', 'stout', 'cider',
    'spirits', 'vodka', 'rum', 'whisky', 'whiskey', 'gin',
    'brandy', 'liqueur', 'ethanol', 'cooking wine', 'sherry',
    'marsala', 'sake', 'mead', 'champagne', 'prosecco',
  ],

  // ── Caffeine family ──
  caffeine: [
    'coffee', 'espresso', 'tea', 'matcha', 'guarana',
    'green tea', 'black tea', 'cola', 'energy drink',
  ],

  // ── Potato family ──
  potato: [
    'chip', 'chips', 'fries', 'french fries', 'hash brown',
    'mash', 'mashed potato', 'potato starch', 'potato flour',
    'potato flake', 'crisp', 'crisps', 'wedge', 'roast potato',
    'jacket potato', 'new potato', 'sweet potato',
  ],

  // ── Chocolate family ──
  chocolate: [
    'cocoa', 'cocoa butter', 'cocoa powder', 'cocoa mass',
    'dark chocolate', 'milk chocolate', 'white chocolate',
    'chocolate chips', 'cacao', 'cacao butter',
  ],

  // ── Corn family ──
  corn: [
    'sweetcorn', 'maize', 'corn flour', 'cornflour', 'cornstarch',
    'corn starch', 'corn syrup', 'corn oil', 'cornmeal', 'polenta',
    'popcorn', 'tortilla chip',
  ],

  // ── Oil family ──
  'vegetable oil': [
    'palm oil', 'sunflower oil', 'rapeseed oil', 'canola oil',
    'soybean oil', 'coconut oil', 'olive oil', 'corn oil',
    'peanut oil', 'sesame oil', 'safflower oil', 'linseed oil',
    'flaxseed oil', 'palm fat', 'vegetable fat', 'hydrogenated fat',
    'partially hydrogenated', 'margarine', 'shortening',
  ],

  // ── Salt family ──
  salt: [
    'sodium', 'sodium chloride', 'sea salt', 'rock salt',
    'table salt', 'himalayan salt', 'msg', 'monosodium glutamate',
    'soy sauce', 'fish sauce', 'bouillon', 'stock cube',
  ],
};

/**
 * Given a flagged ingredient name, returns all synonym terms that should
 * also trigger a match. Returns empty array if no synonyms defined.
 */
export function getSynonyms(flaggedName: string): string[] {
  return INGREDIENT_SYNONYMS[flaggedName.toLowerCase()] ?? [];
}

/**
 * Expands a list of flagged names to include their synonyms.
 * Returns a map from each expanded term → the original flagged name.
 * This lets us track which flag triggered the match.
 */
export function expandFlaggedNames(
  flaggedNames: string[],
): Map<string, string> {
  const expanded = new Map<string, string>();
  for (const name of flaggedNames) {
    const lc = name.toLowerCase();
    expanded.set(lc, name);
    for (const syn of getSynonyms(lc)) {
      // Don't overwrite if the synonym is also a directly flagged name
      if (!expanded.has(syn)) {
        expanded.set(syn, name);
      }
    }
  }
  return expanded;
}
