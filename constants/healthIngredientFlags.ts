// ── Health Condition & Dietary Preference → Harmful Ingredient Map ───────────
// Maps each health condition key and dietary preference key to ingredients that
// should be flagged when scanning products.
//
// Keys match constants/profileOptions.ts (e.g. 'diabetes', 'keto', 'coeliac').
// Keywords are lowercase — matching is done case-insensitively in the cleaner.
//
// Sources: NHS, ADA, BDA, Mayo Clinic, Diabetes UK, BHF, Kidney Care UK,
// Coeliac UK, Crohn's & Colitis UK, NICE guidelines, peer-reviewed literature.

export interface HealthFlagEntry {
  /** Ingredient keywords to match (lowercase) */
  keywords: string[];
  /** OFF structured ingredient IDs (lowercase, en: prefix) */
  ingredientIds: string[];
}

// ── Health Conditions ────────────────────────────────────────────────────────

export const HEALTH_CONDITION_INGREDIENTS: Record<string, HealthFlagEntry> = {
  diabetes: {
    keywords: [
      // Sugars & sweeteners that spike blood glucose
      'sugar', 'sucrose', 'glucose', 'glucose syrup', 'glucose-fructose syrup',
      'fructose', 'fructose syrup', 'high fructose corn syrup', 'hfcs',
      'dextrose', 'maltose', 'maltodextrin', 'corn syrup', 'corn syrup solids',
      'golden syrup', 'treacle', 'molasses', 'brown sugar', 'cane sugar',
      'raw sugar', 'demerara sugar', 'muscovado', 'turbinado',
      'icing sugar', 'powdered sugar', 'confectioners sugar',
      'invert sugar', 'invert sugar syrup', 'caramel', 'caramel syrup',
      'honey', 'agave', 'agave syrup', 'agave nectar',
      'maple syrup', 'rice syrup', 'brown rice syrup', 'rice malt syrup',
      'date syrup', 'coconut sugar', 'palm sugar', 'jaggery',
      'fruit juice concentrate', 'apple juice concentrate',
      'grape juice concentrate', 'pear juice concentrate',
      // Refined starches (high GI)
      'white flour', 'refined flour', 'enriched flour', 'bleached flour',
      'cornflour', 'cornstarch', 'corn starch', 'modified starch',
      'modified corn starch', 'modified maize starch',
      'potato starch', 'tapioca starch', 'rice starch',
      'white rice', 'instant rice', 'puffed rice',
    ],
    ingredientIds: [
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:glucose-syrup',
      'en:glucose-fructose-syrup', 'en:fructose', 'en:fructose-syrup',
      'en:high-fructose-corn-syrup', 'en:dextrose', 'en:maltose',
      'en:maltodextrin', 'en:corn-syrup', 'en:golden-syrup',
      'en:molasses', 'en:treacle', 'en:brown-sugar', 'en:cane-sugar',
      'en:invert-sugar', 'en:invert-sugar-syrup', 'en:caramel',
      'en:honey', 'en:agave-syrup', 'en:maple-syrup',
      'en:rice-syrup', 'en:brown-rice-syrup', 'en:date-syrup',
      'en:coconut-sugar', 'en:palm-sugar',
      'en:fruit-juice-concentrate', 'en:apple-juice-concentrate',
      'en:white-flour', 'en:wheat-flour', 'en:cornstarch',
      'en:corn-starch', 'en:modified-starch', 'en:modified-corn-starch',
      'en:potato-starch', 'en:tapioca-starch', 'en:rice-starch',
    ],
  },

  preDiabetes: {
    keywords: [
      'sugar', 'sucrose', 'glucose', 'glucose syrup', 'glucose-fructose syrup',
      'fructose', 'high fructose corn syrup', 'hfcs', 'dextrose',
      'maltose', 'maltodextrin', 'corn syrup', 'golden syrup',
      'honey', 'agave syrup', 'maple syrup', 'invert sugar',
      'caramel', 'brown sugar', 'cane sugar', 'rice syrup',
      'fruit juice concentrate', 'white flour', 'refined flour',
      'cornstarch', 'modified starch',
    ],
    ingredientIds: [
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:glucose-syrup',
      'en:fructose', 'en:high-fructose-corn-syrup', 'en:dextrose',
      'en:maltose', 'en:maltodextrin', 'en:corn-syrup',
      'en:honey', 'en:agave-syrup', 'en:maple-syrup', 'en:invert-sugar',
      'en:brown-sugar', 'en:cane-sugar', 'en:rice-syrup',
      'en:white-flour', 'en:cornstarch', 'en:modified-starch',
    ],
  },

  insulinResistance: {
    keywords: [
      'sugar', 'sucrose', 'glucose', 'glucose syrup', 'fructose',
      'high fructose corn syrup', 'hfcs', 'dextrose', 'maltose',
      'maltodextrin', 'corn syrup', 'invert sugar', 'caramel',
      'honey', 'agave syrup', 'maple syrup', 'brown sugar', 'cane sugar',
      'white flour', 'refined flour', 'cornstarch', 'modified starch',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'hydrogenated fat', 'margarine',
    ],
    ingredientIds: [
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:glucose-syrup',
      'en:fructose', 'en:high-fructose-corn-syrup', 'en:dextrose',
      'en:maltose', 'en:maltodextrin', 'en:corn-syrup', 'en:invert-sugar',
      'en:honey', 'en:agave-syrup', 'en:maple-syrup',
      'en:white-flour', 'en:cornstarch', 'en:modified-starch',
      'en:hydrogenated-vegetable-oil', 'en:margarine',
    ],
  },

  hypertension: {
    keywords: [
      'salt', 'sodium', 'sodium chloride', 'sea salt', 'rock salt',
      'himalayan salt', 'table salt', 'iodised salt', 'iodized salt',
      'monosodium glutamate', 'msg', 'e621',
      'sodium bicarbonate', 'baking soda', 'sodium nitrate', 'sodium nitrite',
      'sodium benzoate', 'sodium phosphate', 'disodium phosphate',
      'sodium citrate', 'sodium lactate', 'sodium acetate',
      'soy sauce', 'fish sauce', 'oyster sauce', 'worcestershire sauce',
      'stock cube', 'bouillon', 'gravy granules',
    ],
    ingredientIds: [
      'en:salt', 'en:sea-salt', 'en:sodium-chloride',
      'en:monosodium-glutamate', 'en:e621',
      'en:sodium-bicarbonate', 'en:sodium-nitrate', 'en:sodium-nitrite',
      'en:sodium-benzoate', 'en:sodium-phosphate',
      'en:soy-sauce', 'en:fish-sauce', 'en:oyster-sauce',
    ],
  },

  heartDisease: {
    keywords: [
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'hydrogenated fat', 'hydrogenated palm oil', 'shortening',
      'margarine', 'interesterified fat',
      'salt', 'sodium', 'sodium chloride', 'msg', 'monosodium glutamate',
      'soy sauce', 'fish sauce',
      'palm oil', 'palm fat', 'coconut oil',
      'lard', 'beef fat', 'tallow', 'dripping', 'suet',
    ],
    ingredientIds: [
      'en:hydrogenated-vegetable-oil', 'en:hydrogenated-fat',
      'en:hydrogenated-palm-oil', 'en:margarine', 'en:shortening',
      'en:salt', 'en:sea-salt', 'en:monosodium-glutamate',
      'en:palm-oil', 'en:palm-fat', 'en:coconut-oil',
      'en:lard', 'en:beef-fat', 'en:tallow',
    ],
  },

  highCholesterol: {
    keywords: [
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'hydrogenated fat', 'shortening', 'margarine',
      'palm oil', 'palm fat', 'palm kernel oil', 'coconut oil',
      'lard', 'beef fat', 'tallow', 'dripping', 'suet',
      'butter', 'cream', 'double cream', 'clotted cream',
      'full fat milk', 'whole milk',
    ],
    ingredientIds: [
      'en:hydrogenated-vegetable-oil', 'en:hydrogenated-fat',
      'en:shortening', 'en:margarine',
      'en:palm-oil', 'en:palm-fat', 'en:palm-kernel-oil', 'en:coconut-oil',
      'en:lard', 'en:beef-fat', 'en:tallow',
      'en:butter', 'en:cream', 'en:whole-milk',
    ],
  },

  coeliac: {
    keywords: [
      'gluten', 'wheat', 'wheat flour', 'wheat starch', 'wheat protein',
      'wheat germ', 'wheat bran', 'durum wheat', 'semolina',
      'barley', 'barley malt', 'malt extract', 'malt vinegar', 'malt flavouring',
      'rye', 'rye flour',
      'oats', 'oat flour', 'oat fibre',
      'spelt', 'spelt flour', 'kamut', 'triticale', 'einkorn', 'emmer',
      'couscous', 'bulgur', 'seitan',
      'modified starch', 'hydrolysed wheat protein', 'hydrolyzed wheat protein',
      'breadcrumbs', 'bread crumbs', 'flour',
    ],
    ingredientIds: [
      'en:gluten', 'en:wheat', 'en:wheat-flour', 'en:wheat-starch',
      'en:durum-wheat', 'en:durum-wheat-semolina', 'en:semolina',
      'en:barley', 'en:barley-malt', 'en:barley-malt-extract',
      'en:malt-extract', 'en:malt-vinegar',
      'en:rye', 'en:rye-flour', 'en:oats', 'en:oat-flour',
      'en:spelt', 'en:spelt-flour', 'en:kamut', 'en:triticale',
      'en:bulgur', 'en:couscous', 'en:seitan',
    ],
  },

  ibs: {
    keywords: [
      // High FODMAP ingredients
      'garlic', 'garlic powder', 'onion', 'onion powder', 'shallot', 'leek',
      'inulin', 'chicory root', 'chicory root fibre', 'fos',
      'fructo-oligosaccharides', 'oligofructose',
      'lactose', 'milk', 'cream', 'whey', 'whey powder',
      'sorbitol', 'mannitol', 'xylitol', 'maltitol', 'isomalt',
      'erythritol', 'polydextrose',
      'apple juice concentrate', 'pear juice concentrate',
      'high fructose corn syrup', 'agave', 'honey',
      'wheat', 'rye', 'barley',
      'cashew', 'pistachio',
      'artichoke', 'asparagus', 'cauliflower', 'mushroom', 'mushrooms',
    ],
    ingredientIds: [
      'en:garlic', 'en:garlic-powder', 'en:onion', 'en:onion-powder',
      'en:shallot', 'en:leek', 'en:inulin', 'en:chicory-root',
      'en:lactose', 'en:milk', 'en:cream', 'en:whey', 'en:whey-powder',
      'en:sorbitol', 'en:mannitol', 'en:xylitol', 'en:maltitol', 'en:isomalt',
      'en:erythritol', 'en:polydextrose',
      'en:high-fructose-corn-syrup', 'en:agave-syrup', 'en:honey',
      'en:wheat', 'en:rye', 'en:barley',
      'en:cashew', 'en:pistachio', 'en:mushroom', 'en:mushrooms',
    ],
  },

  crohns: {
    keywords: [
      'inulin', 'chicory root', 'chicory root fibre',
      'sorbitol', 'mannitol', 'xylitol', 'maltitol', 'isomalt',
      'polydextrose', 'psyllium',
      'popcorn', 'whole corn', 'sweetcorn',
      'raw bran', 'wheat bran',
      'dried fruit', 'prune', 'prunes', 'dried apricot',
      'spicy', 'chilli', 'chili', 'cayenne', 'hot pepper',
      'caffeine', 'coffee', 'coffee extract',
      'alcohol', 'beer', 'wine', 'spirits',
    ],
    ingredientIds: [
      'en:inulin', 'en:chicory-root',
      'en:sorbitol', 'en:mannitol', 'en:xylitol', 'en:maltitol', 'en:isomalt',
      'en:popcorn', 'en:sweetcorn',
      'en:wheat-bran', 'en:psyllium',
      'en:dried-fruit', 'en:prune', 'en:prunes',
      'en:chilli', 'en:cayenne', 'en:coffee',
    ],
  },

  uc: {
    keywords: [
      'inulin', 'chicory root', 'chicory root fibre',
      'sorbitol', 'mannitol', 'xylitol', 'maltitol',
      'raw bran', 'wheat bran', 'psyllium',
      'popcorn', 'whole corn', 'sweetcorn',
      'spicy', 'chilli', 'chili', 'cayenne', 'hot pepper',
      'caffeine', 'coffee', 'coffee extract',
      'alcohol', 'beer', 'wine',
      'sulphite', 'sulfite', 'sulphur dioxide', 'sulfur dioxide',
    ],
    ingredientIds: [
      'en:inulin', 'en:chicory-root',
      'en:sorbitol', 'en:mannitol', 'en:xylitol', 'en:maltitol',
      'en:wheat-bran', 'en:psyllium',
      'en:popcorn', 'en:sweetcorn',
      'en:chilli', 'en:cayenne', 'en:coffee',
      'en:sulphur-dioxide', 'en:sulfur-dioxide',
    ],
  },

  gerd: {
    keywords: [
      'tomato', 'tomato paste', 'tomato puree', 'tomato sauce', 'tomato powder',
      'citric acid', 'lemon juice', 'lime juice', 'orange juice',
      'vinegar', 'wine vinegar', 'balsamic vinegar', 'cider vinegar',
      'chocolate', 'cocoa', 'cocoa powder', 'cocoa butter', 'cocoa mass',
      'peppermint', 'peppermint oil', 'mint', 'spearmint',
      'caffeine', 'coffee', 'coffee extract',
      'chilli', 'chili', 'cayenne', 'hot pepper', 'jalapeno',
      'garlic', 'onion', 'raw onion',
      'alcohol', 'beer', 'wine',
      'carbonated water', 'sparkling water',
    ],
    ingredientIds: [
      'en:tomato', 'en:tomato-paste', 'en:tomato-puree', 'en:tomato-sauce',
      'en:citric-acid', 'en:lemon-juice', 'en:lime-juice', 'en:orange-juice',
      'en:vinegar', 'en:wine-vinegar', 'en:balsamic-vinegar',
      'en:chocolate', 'en:cocoa', 'en:cocoa-powder', 'en:cocoa-butter',
      'en:peppermint', 'en:mint', 'en:coffee',
      'en:chilli', 'en:cayenne', 'en:garlic', 'en:onion',
    ],
  },

  gout: {
    keywords: [
      // High-purine foods
      'yeast extract', 'yeast', 'brewers yeast', 'nutritional yeast',
      'marmite', 'vegemite', 'bovril',
      'anchovy', 'anchovies', 'sardine', 'sardines', 'herring',
      'mackerel', 'trout', 'tuna',
      'liver', 'kidney', 'offal', 'pate', 'foie gras',
      'game', 'venison', 'pheasant',
      'gravy', 'meat extract', 'beef extract', 'stock cube', 'bouillon',
      'alcohol', 'beer', 'lager', 'ale', 'stout',
      'high fructose corn syrup', 'fructose syrup',
    ],
    ingredientIds: [
      'en:yeast-extract', 'en:yeast', 'en:brewers-yeast',
      'en:anchovy', 'en:anchovies', 'en:sardine', 'en:sardines',
      'en:herring', 'en:mackerel', 'en:trout', 'en:tuna',
      'en:liver', 'en:pate', 'en:high-fructose-corn-syrup',
    ],
  },

  ckd: {
    keywords: [
      // High potassium
      'potassium chloride', 'potassium sorbate', 'potassium citrate',
      'banana', 'dried fruit', 'prune', 'prunes', 'raisin', 'raisins',
      'tomato paste', 'tomato puree', 'tomato sauce',
      // High phosphorus
      'phosphoric acid', 'phosphate', 'sodium phosphate', 'disodium phosphate',
      'calcium phosphate', 'dicalcium phosphate', 'trisodium phosphate',
      'sodium tripolyphosphate',
      // High sodium
      'salt', 'sodium', 'sodium chloride', 'msg', 'monosodium glutamate',
      'soy sauce', 'fish sauce',
      'sodium nitrate', 'sodium nitrite', 'sodium benzoate',
      // High protein (excessive)
      'whey protein', 'whey protein concentrate', 'whey protein isolate',
      'casein', 'caseinate', 'sodium caseinate',
      'protein isolate', 'soy protein isolate', 'pea protein isolate',
    ],
    ingredientIds: [
      'en:potassium-chloride', 'en:potassium-sorbate',
      'en:banana', 'en:dried-fruit', 'en:raisins',
      'en:tomato-paste', 'en:tomato-puree',
      'en:phosphoric-acid', 'en:sodium-phosphate',
      'en:salt', 'en:sea-salt', 'en:monosodium-glutamate',
      'en:soy-sauce', 'en:fish-sauce',
      'en:whey-protein', 'en:casein', 'en:caseinate',
    ],
  },

  nafld: {
    keywords: [
      'sugar', 'sucrose', 'fructose', 'high fructose corn syrup', 'hfcs',
      'glucose syrup', 'glucose-fructose syrup', 'corn syrup',
      'invert sugar', 'agave', 'agave syrup',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'hydrogenated fat', 'shortening',
      'alcohol', 'beer', 'wine', 'spirits',
    ],
    ingredientIds: [
      'en:sugar', 'en:fructose', 'en:high-fructose-corn-syrup',
      'en:glucose-syrup', 'en:glucose-fructose-syrup', 'en:corn-syrup',
      'en:invert-sugar', 'en:agave-syrup',
      'en:hydrogenated-vegetable-oil', 'en:hydrogenated-fat',
    ],
  },

  noGallbladder: {
    keywords: [
      // Fried / high-fat preparations (hardest without stored bile)
      'fried', 'deep fried', 'breaded', 'battered', 'crumbed',
      // Trans / hydrogenated fats
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'hydrogenated fat', 'shortening',
      // High-fat dairy
      'cream', 'double cream', 'heavy cream', 'clotted cream',
      'mascarpone', 'creme fraiche', 'sour cream',
      'whole milk', 'full-fat milk', 'full fat milk',
      'butter', 'ghee', 'margarine',
      'cheddar', 'brie', 'camembert', 'stilton', 'gorgonzola',
      // Fatty cuts of meat / processed meats
      'lard', 'beef dripping', 'tallow', 'bacon', 'pork belly',
      'sausage', 'salami', 'chorizo', 'pepperoni',
      'duck fat', 'goose fat', 'streaky bacon',
      // Coconut oil & tropical oils (high saturated fat)
      'coconut oil', 'coconut cream', 'palm oil', 'palm kernel oil',
      // Rich desserts
      'pastry', 'puff pastry', 'shortcrust pastry', 'buttery',
    ],
    ingredientIds: [
      'en:hydrogenated-vegetable-oil', 'en:hydrogenated-fat', 'en:shortening',
      'en:cream', 'en:double-cream', 'en:heavy-cream',
      'en:butter', 'en:ghee', 'en:margarine',
      'en:cheddar', 'en:brie', 'en:camembert',
      'en:lard', 'en:bacon', 'en:sausage', 'en:salami', 'en:chorizo',
      'en:coconut-oil', 'en:palm-oil', 'en:palm-kernel-oil',
    ],
  },

  pcos: {
    keywords: [
      'sugar', 'sucrose', 'glucose', 'glucose syrup', 'fructose',
      'high fructose corn syrup', 'hfcs', 'dextrose', 'maltose',
      'maltodextrin', 'corn syrup', 'invert sugar',
      'honey', 'agave syrup', 'maple syrup',
      'white flour', 'refined flour', 'cornstarch', 'modified starch',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'soy', 'soya', 'soy protein', 'soy lecithin',
    ],
    ingredientIds: [
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:glucose-syrup',
      'en:fructose', 'en:high-fructose-corn-syrup', 'en:dextrose',
      'en:maltose', 'en:maltodextrin', 'en:corn-syrup', 'en:invert-sugar',
      'en:honey', 'en:agave-syrup', 'en:maple-syrup',
      'en:white-flour', 'en:cornstarch', 'en:modified-starch',
      'en:hydrogenated-vegetable-oil', 'en:soy', 'en:soy-protein',
    ],
  },

  migraine: {
    keywords: [
      'msg', 'monosodium glutamate', 'e621', 'glutamate',
      'aspartame', 'e951',
      'nitrate', 'nitrite', 'sodium nitrate', 'sodium nitrite',
      'tyramine',
      'aged cheese', 'parmesan', 'cheddar', 'blue cheese', 'stilton',
      'chocolate', 'cocoa', 'cocoa powder',
      'caffeine', 'coffee', 'coffee extract',
      'red wine', 'wine', 'alcohol', 'beer',
      'citric acid', 'citrus',
      'yeast extract', 'autolyzed yeast',
      'sauerkraut', 'kimchi', 'fermented',
    ],
    ingredientIds: [
      'en:monosodium-glutamate', 'en:e621',
      'en:aspartame', 'en:e951',
      'en:sodium-nitrate', 'en:sodium-nitrite',
      'en:parmesan', 'en:cheddar',
      'en:chocolate', 'en:cocoa', 'en:cocoa-powder',
      'en:coffee', 'en:yeast-extract', 'en:sauerkraut',
    ],
  },

  adhd: {
    keywords: [
      // Artificial colours (Southampton Six + others)
      'tartrazine', 'e102', 'sunset yellow', 'e110',
      'carmoisine', 'e122', 'ponceau 4r', 'e124',
      'allura red', 'e129', 'quinoline yellow', 'e104',
      'brilliant blue', 'e133', 'patent blue', 'e131',
      'indigo carmine', 'e132',
      'artificial colour', 'artificial color', 'food colouring',
      // Preservatives
      'sodium benzoate', 'e211', 'potassium benzoate', 'e212',
      'calcium benzoate', 'e213',
      // Artificial sweeteners
      'aspartame', 'e951', 'acesulfame', 'e950',
      // Caffeine
      'caffeine', 'coffee', 'guarana',
      // Sugar
      'sugar', 'glucose syrup', 'high fructose corn syrup',
    ],
    ingredientIds: [
      'en:e102', 'en:e110', 'en:e122', 'en:e124', 'en:e129', 'en:e104',
      'en:e133', 'en:e131', 'en:e132',
      'en:e211', 'en:e212', 'en:e213',
      'en:aspartame', 'en:e951', 'en:e950',
      'en:caffeine', 'en:guarana',
      'en:sugar', 'en:glucose-syrup', 'en:high-fructose-corn-syrup',
    ],
  },

  autism: {
    keywords: [
      // Same artificial colours as ADHD
      'tartrazine', 'e102', 'sunset yellow', 'e110',
      'carmoisine', 'e122', 'ponceau 4r', 'e124',
      'allura red', 'e129', 'quinoline yellow', 'e104',
      'artificial colour', 'artificial color', 'food colouring',
      'sodium benzoate', 'e211', 'potassium benzoate', 'e212',
      'aspartame', 'e951', 'acesulfame', 'e950',
      'msg', 'monosodium glutamate', 'e621',
      'gluten', 'wheat', 'casein', 'milk protein',
    ],
    ingredientIds: [
      'en:e102', 'en:e110', 'en:e122', 'en:e124', 'en:e129', 'en:e104',
      'en:e211', 'en:e212',
      'en:aspartame', 'en:e951', 'en:e950',
      'en:monosodium-glutamate', 'en:e621',
      'en:gluten', 'en:wheat', 'en:casein',
    ],
  },

  eczema: {
    keywords: [
      'artificial colour', 'artificial color', 'food colouring',
      'tartrazine', 'e102', 'sunset yellow', 'e110',
      'sodium benzoate', 'e211', 'potassium sorbate', 'e202',
      'sulphite', 'sulfite', 'sulphur dioxide', 'e220',
      'msg', 'monosodium glutamate', 'e621',
      'histamine', 'fermented', 'yeast extract',
      'soy', 'soya', 'soy sauce',
      'egg', 'egg white', 'egg yolk',
      'milk', 'dairy', 'whey', 'casein',
      'gluten', 'wheat',
      'peanut', 'tree nut', 'almond', 'cashew', 'walnut',
    ],
    ingredientIds: [
      'en:e102', 'en:e110', 'en:e211', 'en:e202', 'en:e220',
      'en:monosodium-glutamate', 'en:e621',
      'en:yeast-extract', 'en:soy', 'en:soy-sauce',
      'en:egg', 'en:milk', 'en:whey', 'en:casein', 'en:gluten', 'en:wheat',
      'en:peanut', 'en:almond', 'en:cashew', 'en:walnut',
    ],
  },

  ra: {
    keywords: [
      'sugar', 'sucrose', 'glucose syrup', 'high fructose corn syrup',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'refined flour', 'white flour',
      'omega 6', 'sunflower oil', 'corn oil', 'soybean oil',
      'msg', 'monosodium glutamate', 'e621',
      'aspartame', 'e951',
      'alcohol', 'beer', 'wine',
      'salt', 'sodium',
    ],
    ingredientIds: [
      'en:sugar', 'en:glucose-syrup', 'en:high-fructose-corn-syrup',
      'en:hydrogenated-vegetable-oil',
      'en:sunflower-oil', 'en:corn-oil', 'en:soybean-oil',
      'en:monosodium-glutamate', 'en:e621',
      'en:aspartame', 'en:e951', 'en:salt',
    ],
  },

  lupus: {
    keywords: [
      'alfalfa', 'alfalfa sprouts',
      'garlic', 'garlic powder',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'sugar', 'sucrose', 'high fructose corn syrup',
      'salt', 'sodium', 'msg',
      'alcohol', 'beer', 'wine',
      'aspartame', 'e951',
    ],
    ingredientIds: [
      'en:alfalfa', 'en:garlic',
      'en:hydrogenated-vegetable-oil',
      'en:sugar', 'en:high-fructose-corn-syrup',
      'en:salt', 'en:monosodium-glutamate',
      'en:aspartame', 'en:e951',
    ],
  },

  ms: {
    keywords: [
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'saturated fat', 'palm oil', 'coconut oil', 'lard', 'butter',
      'sugar', 'sucrose', 'high fructose corn syrup',
      'refined flour', 'white flour',
      'msg', 'monosodium glutamate', 'e621',
      'aspartame', 'e951',
      'gluten', 'wheat',
      'alcohol', 'beer', 'wine',
    ],
    ingredientIds: [
      'en:hydrogenated-vegetable-oil', 'en:palm-oil', 'en:coconut-oil',
      'en:lard', 'en:butter',
      'en:sugar', 'en:high-fructose-corn-syrup',
      'en:white-flour', 'en:monosodium-glutamate', 'en:e621',
      'en:aspartame', 'en:e951', 'en:gluten', 'en:wheat',
    ],
  },

  me: {
    keywords: [
      'sugar', 'sucrose', 'glucose syrup', 'high fructose corn syrup',
      'caffeine', 'coffee', 'guarana',
      'aspartame', 'e951', 'acesulfame', 'e950',
      'msg', 'monosodium glutamate', 'e621',
      'alcohol', 'beer', 'wine',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'artificial colour', 'artificial color',
    ],
    ingredientIds: [
      'en:sugar', 'en:glucose-syrup', 'en:high-fructose-corn-syrup',
      'en:caffeine', 'en:coffee', 'en:guarana',
      'en:aspartame', 'en:e951', 'en:e950',
      'en:monosodium-glutamate', 'en:e621',
      'en:hydrogenated-vegetable-oil',
    ],
  },

  hashimotos: {
    keywords: [
      'soy', 'soya', 'soy protein', 'soy lecithin', 'soy flour', 'tofu',
      'gluten', 'wheat', 'wheat flour', 'barley', 'rye',
      'refined sugar', 'sugar', 'high fructose corn syrup',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'artificial sweetener', 'aspartame', 'sucralose',
    ],
    ingredientIds: [
      'en:soy', 'en:soya', 'en:soy-protein', 'en:soy-lecithin',
      'en:soy-flour', 'en:tofu',
      'en:gluten', 'en:wheat', 'en:wheat-flour', 'en:barley', 'en:rye',
      'en:sugar', 'en:high-fructose-corn-syrup',
      'en:hydrogenated-vegetable-oil', 'en:aspartame', 'en:sucralose',
    ],
  },

  hypothyroidism: {
    keywords: [
      'soy', 'soya', 'soy protein', 'soy lecithin', 'soy flour', 'tofu',
      'soy isoflavone',
      'gluten', 'wheat',
      'refined sugar', 'sugar', 'high fructose corn syrup',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
    ],
    ingredientIds: [
      'en:soy', 'en:soya', 'en:soy-protein', 'en:soy-lecithin',
      'en:soy-flour', 'en:tofu',
      'en:gluten', 'en:wheat',
      'en:sugar', 'en:high-fructose-corn-syrup',
      'en:hydrogenated-vegetable-oil',
    ],
  },

  endometriosis: {
    keywords: [
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'red meat', 'beef', 'pork', 'lamb',
      'sugar', 'sucrose', 'high fructose corn syrup',
      'alcohol', 'beer', 'wine',
      'caffeine', 'coffee',
      'soy', 'soya', 'soy protein',
      'gluten', 'wheat',
    ],
    ingredientIds: [
      'en:hydrogenated-vegetable-oil',
      'en:beef', 'en:pork', 'en:lamb',
      'en:sugar', 'en:high-fructose-corn-syrup',
      'en:coffee', 'en:soy', 'en:soya', 'en:gluten', 'en:wheat',
    ],
  },

  diverticular: {
    keywords: [
      'popcorn', 'sweetcorn', 'whole corn',
      'sesame', 'sesame seeds',
      'poppy seed', 'poppy seeds',
      'sunflower seed', 'sunflower seeds',
      'flaxseed', 'linseed',
      'chia seed', 'chia seeds',
      'red meat', 'processed meat', 'bacon', 'sausage', 'salami', 'ham',
      'hot dog', 'pepperoni',
    ],
    ingredientIds: [
      'en:popcorn', 'en:sweetcorn',
      'en:sesame-seeds', 'en:poppy-seeds',
      'en:sunflower-seeds', 'en:flaxseed', 'en:linseed',
      'en:chia-seeds', 'en:bacon', 'en:sausage', 'en:salami', 'en:ham',
    ],
  },

  leakyGut: {
    keywords: [
      'gluten', 'wheat', 'wheat flour', 'barley', 'rye',
      'sugar', 'sucrose', 'high fructose corn syrup', 'corn syrup',
      'alcohol', 'beer', 'wine',
      'artificial sweetener', 'aspartame', 'sucralose', 'saccharin',
      'emulsifier', 'polysorbate 80', 'e433', 'carboxymethylcellulose', 'e466',
      'carrageenan', 'e407',
      'msg', 'monosodium glutamate', 'e621',
      'trans fat', 'partially hydrogenated',
      'soy', 'soya',
      'lectins', 'lectin',
    ],
    ingredientIds: [
      'en:gluten', 'en:wheat', 'en:wheat-flour', 'en:barley', 'en:rye',
      'en:sugar', 'en:high-fructose-corn-syrup', 'en:corn-syrup',
      'en:aspartame', 'en:sucralose', 'en:saccharin',
      'en:e433', 'en:e466', 'en:e407', 'en:carrageenan',
      'en:monosodium-glutamate', 'en:e621',
      'en:soy', 'en:soya',
    ],
  },

  fibromyalgia: {
    keywords: [
      // Excitotoxins and additives linked to pain amplification
      'aspartame', 'monosodium glutamate', 'msg', 'e621',
      'artificial sweetener', 'saccharin', 'sucralose', 'acesulfame',
      // Processed / refined foods that worsen inflammation and fatigue
      'white flour', 'refined flour', 'corn syrup', 'high fructose corn syrup',
      'sugar', 'sucrose', 'glucose syrup', 'maltodextrin',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      // Common dietary triggers reported by fibromyalgia patients
      'alcohol', 'caffeine', 'artificial colour', 'artificial color',
    ],
    ingredientIds: [
      'en:aspartame', 'en:monosodium-glutamate', 'en:e621',
      'en:saccharin', 'en:sucralose', 'en:acesulfame-k',
      'en:sugar', 'en:sucrose', 'en:glucose-syrup',
      'en:corn-syrup', 'en:high-fructose-corn-syrup', 'en:maltodextrin',
      'en:white-flour', 'en:hydrogenated-vegetable-oil',
    ],
  },

  sibo: {
    keywords: [
      // High FODMAP — same as IBS but stricter
      'garlic', 'garlic powder', 'onion', 'onion powder', 'shallot', 'leek',
      'inulin', 'chicory root', 'fos', 'fructo-oligosaccharides',
      'lactose', 'milk', 'cream', 'whey',
      'sorbitol', 'mannitol', 'xylitol', 'maltitol', 'isomalt',
      'honey', 'agave', 'high fructose corn syrup',
      'wheat', 'rye', 'barley',
      'apple juice concentrate', 'pear juice concentrate',
      'mushroom', 'mushrooms', 'cauliflower', 'artichoke', 'asparagus',
      'cashew', 'pistachio',
      'sugar alcohol', 'polyol',
    ],
    ingredientIds: [
      'en:garlic', 'en:garlic-powder', 'en:onion', 'en:onion-powder',
      'en:shallot', 'en:leek', 'en:inulin', 'en:chicory-root',
      'en:lactose', 'en:milk', 'en:cream', 'en:whey',
      'en:sorbitol', 'en:mannitol', 'en:xylitol', 'en:maltitol', 'en:isomalt',
      'en:honey', 'en:agave-syrup', 'en:high-fructose-corn-syrup',
      'en:wheat', 'en:rye', 'en:barley',
      'en:mushroom', 'en:mushrooms', 'en:cashew', 'en:pistachio',
    ],
  },
};

// ── Dietary Preferences ──────────────────────────────────────────────────────

export const DIETARY_PREFERENCE_INGREDIENTS: Record<string, HealthFlagEntry> = {
  halal: {
    keywords: [
      // Pork & pork derivatives
      'pork', 'pork fat', 'pork gelatin', 'pork gelatine', 'pork meat',
      'bacon', 'bacon fat', 'bacon bits', 'ham', 'prosciutto', 'pancetta',
      'salami', 'chorizo', 'pepperoni', 'lard', 'lard oil',
      'pork rind', 'pork rinds', 'pork crackling', 'chicharron',
      'pork sausage', 'bratwurst',
      'pepsin', 'porcine pepsin',
      // Generic gelatin (may be pork-derived)
      'gelatin', 'gelatine', 'gelatin powder',
      // Alcohol & alcohol-derived
      'alcohol', 'ethanol', 'ethyl alcohol',
      'wine', 'red wine', 'white wine', 'wine vinegar', 'sherry',
      'beer', 'ale', 'lager', 'stout', 'malt liquor',
      'rum', 'brandy', 'cognac', 'whisky', 'whiskey', 'bourbon',
      'vodka', 'gin', 'tequila', 'liqueur', 'kirsch', 'amaretto',
      'cooking wine', 'marsala', 'port', 'champagne',
      // Animal fats / derivatives (non-specified source)
      'animal fat', 'animal shortening', 'tallow', 'dripping',
      'suet', 'bone marrow',
      // E-numbers commonly derived from pork / non-halal sources
      'e120', 'cochineal', 'carmine', 'carminic acid',
      'e441', 'e542',
      'e904', 'shellac',
      'e471',  // mono- and diglycerides (often animal-derived)
      'e472', 'e472a', 'e472b', 'e472c', 'e472e',
      'e473', 'e474', 'e475', 'e476', 'e477', 'e478',
      'e481', 'e482', 'e483',
      'e491', 'e492', 'e493', 'e494', 'e495',
      // Other potentially haram ingredients
      'rennet', 'animal rennet',
      'l-cysteine',
      'blood', 'blood plasma', 'blood meal',
    ],
    ingredientIds: [
      'en:pork', 'en:pork-fat', 'en:pork-meat', 'en:pork-gelatin',
      'en:bacon', 'en:ham', 'en:prosciutto', 'en:pancetta',
      'en:salami', 'en:chorizo', 'en:pepperoni', 'en:lard',
      'en:pork-rind', 'en:pork-sausage',
      'en:gelatin', 'en:gelatine', 'en:gelatin-powder',
      'en:alcohol', 'en:ethanol', 'en:wine', 'en:red-wine', 'en:white-wine',
      'en:beer', 'en:rum', 'en:brandy', 'en:cognac', 'en:whisky',
      'en:vodka', 'en:gin', 'en:liqueur', 'en:cooking-wine',
      'en:animal-fat', 'en:tallow', 'en:suet', 'en:dripping',
      'en:cochineal', 'en:carmine', 'en:shellac',
      'en:e120', 'en:e441', 'en:e542', 'en:e904',
      'en:e471', 'en:e472', 'en:e473', 'en:e474', 'en:e475', 'en:e476',
      'en:e481', 'en:e482', 'en:e491', 'en:e492',
      'en:rennet', 'en:l-cysteine',
    ],
  },

  keto: {
    keywords: [
      'sugar', 'sucrose', 'glucose', 'glucose syrup', 'glucose-fructose syrup',
      'fructose', 'high fructose corn syrup', 'hfcs', 'dextrose',
      'maltose', 'maltodextrin', 'corn syrup', 'golden syrup',
      'honey', 'agave syrup', 'maple syrup', 'brown sugar', 'cane sugar',
      'invert sugar', 'treacle', 'molasses',
      'wheat flour', 'white flour', 'flour', 'bread', 'breadcrumbs',
      'cornflour', 'cornstarch', 'rice flour', 'potato starch',
      'rice', 'white rice', 'brown rice', 'pasta', 'noodles',
      'potato', 'potatoes', 'sweet potato',
      'oats', 'oat flour', 'porridge oats',
      'corn', 'sweetcorn', 'maize',
    ],
    ingredientIds: [
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:glucose-syrup',
      'en:fructose', 'en:high-fructose-corn-syrup', 'en:dextrose',
      'en:maltose', 'en:maltodextrin', 'en:corn-syrup',
      'en:honey', 'en:agave-syrup', 'en:maple-syrup',
      'en:invert-sugar', 'en:treacle', 'en:molasses',
      'en:wheat-flour', 'en:white-flour', 'en:bread', 'en:breadcrumbs',
      'en:cornstarch', 'en:rice-flour', 'en:potato-starch',
      'en:rice', 'en:pasta', 'en:noodles', 'en:potato', 'en:sweet-potato',
      'en:oats', 'en:corn', 'en:sweetcorn', 'en:maize',
    ],
  },

  fodmap: {
    keywords: [
      'garlic', 'garlic powder', 'onion', 'onion powder', 'shallot', 'leek',
      'inulin', 'chicory root', 'chicory root fibre', 'fos',
      'fructo-oligosaccharides', 'oligofructose',
      'lactose', 'milk', 'cream', 'whey', 'whey powder', 'ricotta',
      'sorbitol', 'mannitol', 'xylitol', 'maltitol', 'isomalt',
      'apple juice concentrate', 'pear juice concentrate',
      'high fructose corn syrup', 'agave', 'honey',
      'wheat', 'rye', 'barley',
      'cashew', 'pistachio',
      'artichoke', 'asparagus', 'cauliflower', 'mushroom', 'mushrooms',
      'watermelon', 'mango', 'dried fruit',
      'black bean', 'kidney bean', 'baked beans', 'chickpea', 'lentil',
    ],
    ingredientIds: [
      'en:garlic', 'en:garlic-powder', 'en:onion', 'en:onion-powder',
      'en:shallot', 'en:leek', 'en:inulin', 'en:chicory-root',
      'en:lactose', 'en:milk', 'en:cream', 'en:whey', 'en:whey-powder',
      'en:sorbitol', 'en:mannitol', 'en:xylitol', 'en:maltitol', 'en:isomalt',
      'en:high-fructose-corn-syrup', 'en:agave-syrup', 'en:honey',
      'en:wheat', 'en:rye', 'en:barley',
      'en:cashew', 'en:pistachio', 'en:mushroom', 'en:mushrooms',
      'en:chickpea', 'en:lentil', 'en:kidney-bean',
    ],
  },

  dairyFree: {
    keywords: [
      'milk', 'whole milk', 'skimmed milk', 'semi skimmed milk',
      'milk powder', 'dried milk', 'milk solids', 'milk protein', 'milk fat',
      'condensed milk', 'evaporated milk', 'buttermilk',
      'cream', 'sour cream', 'double cream', 'single cream', 'whipping cream',
      'butter', 'butter oil', 'butterfat', 'ghee',
      'cheese', 'cheddar', 'mozzarella', 'parmesan', 'cream cheese',
      'whey', 'whey powder', 'whey protein', 'whey permeate',
      'casein', 'caseinate', 'sodium caseinate', 'calcium caseinate',
      'lactose', 'lactalbumin', 'lactoglobulin',
      'yoghurt', 'yogurt', 'kefir', 'quark', 'fromage frais',
      'ice cream', 'custard', 'curds',
    ],
    ingredientIds: [
      'en:milk', 'en:whole-milk', 'en:skimmed-milk', 'en:semi-skimmed-milk',
      'en:milk-powder', 'en:skimmed-milk-powder', 'en:whole-milk-powder',
      'en:condensed-milk', 'en:evaporated-milk', 'en:buttermilk',
      'en:cream', 'en:sour-cream', 'en:butter', 'en:ghee',
      'en:cheese', 'en:cheddar', 'en:mozzarella', 'en:parmesan',
      'en:whey', 'en:whey-powder', 'en:whey-protein',
      'en:casein', 'en:caseinate', 'en:sodium-caseinate',
      'en:lactose', 'en:yogurt', 'en:yoghurt', 'en:kefir',
    ],
  },

  cleanEating: {
    keywords: [
      // Artificial colours
      'artificial colour', 'artificial color', 'food colouring',
      'tartrazine', 'e102', 'sunset yellow', 'e110',
      'carmoisine', 'e122', 'allura red', 'e129',
      // Artificial sweeteners
      'aspartame', 'e951', 'acesulfame', 'e950', 'sucralose', 'e955',
      'saccharin', 'e954', 'neotame', 'e961',
      // Artificial preservatives
      'sodium benzoate', 'e211', 'potassium sorbate', 'e202',
      'sodium nitrate', 'e251', 'sodium nitrite', 'e250',
      'bha', 'e320', 'bht', 'e321', 'tbhq', 'e319',
      // Artificial flavours
      'artificial flavour', 'artificial flavor', 'artificial flavouring',
      // Trans fats
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'hydrogenated fat',
      // Processed
      'high fructose corn syrup', 'hfcs', 'maltodextrin',
      'msg', 'monosodium glutamate', 'e621',
      'carrageenan', 'e407',
    ],
    ingredientIds: [
      'en:e102', 'en:e110', 'en:e122', 'en:e129',
      'en:aspartame', 'en:e951', 'en:e950', 'en:e955',
      'en:saccharin', 'en:e954',
      'en:e211', 'en:e202', 'en:e251', 'en:e250',
      'en:e320', 'en:e321', 'en:e319',
      'en:hydrogenated-vegetable-oil', 'en:hydrogenated-fat',
      'en:high-fructose-corn-syrup', 'en:maltodextrin',
      'en:monosodium-glutamate', 'en:e621', 'en:carrageenan', 'en:e407',
    ],
  },

  childFriendly: {
    keywords: [
      // Southampton Six artificial colours
      'tartrazine', 'e102', 'sunset yellow', 'e110',
      'carmoisine', 'e122', 'ponceau 4r', 'e124',
      'allura red', 'e129', 'quinoline yellow', 'e104',
      'artificial colour', 'artificial color', 'food colouring',
      // Preservatives
      'sodium benzoate', 'e211', 'potassium benzoate', 'e212',
      // Artificial sweeteners
      'aspartame', 'e951', 'acesulfame', 'e950', 'sucralose', 'e955',
      'saccharin', 'e954',
      // Caffeine
      'caffeine', 'coffee', 'guarana',
      // MSG
      'msg', 'monosodium glutamate', 'e621',
      // Trans fats
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      // High sodium
      'high fructose corn syrup',
    ],
    ingredientIds: [
      'en:e102', 'en:e110', 'en:e122', 'en:e124', 'en:e129', 'en:e104',
      'en:e211', 'en:e212',
      'en:aspartame', 'en:e951', 'en:e950', 'en:e955', 'en:saccharin', 'en:e954',
      'en:caffeine', 'en:coffee', 'en:guarana',
      'en:monosodium-glutamate', 'en:e621',
      'en:hydrogenated-vegetable-oil', 'en:high-fructose-corn-syrup',
    ],
  },

  weightLoss: {
    keywords: [
      'sugar', 'sucrose', 'glucose syrup', 'high fructose corn syrup',
      'corn syrup', 'invert sugar', 'honey', 'agave syrup',
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'palm oil', 'lard', 'shortening',
      'white flour', 'refined flour', 'cornstarch',
      'maltodextrin',
    ],
    ingredientIds: [
      'en:sugar', 'en:glucose-syrup', 'en:high-fructose-corn-syrup',
      'en:corn-syrup', 'en:invert-sugar', 'en:honey', 'en:agave-syrup',
      'en:hydrogenated-vegetable-oil', 'en:palm-oil', 'en:lard', 'en:shortening',
      'en:white-flour', 'en:cornstarch', 'en:maltodextrin',
    ],
  },

  paleo: {
    keywords: [
      // Grains
      'wheat', 'wheat flour', 'barley', 'rye', 'oats', 'corn', 'rice',
      'bread', 'pasta', 'noodles', 'couscous', 'bulgur',
      // Legumes
      'soy', 'soya', 'tofu', 'tempeh', 'peanut', 'lentil', 'lentils',
      'chickpea', 'chickpeas', 'black bean', 'kidney bean',
      // Dairy
      'milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'yoghurt',
      // Refined sugar
      'sugar', 'sucrose', 'high fructose corn syrup', 'corn syrup',
      // Processed
      'vegetable oil', 'canola oil', 'soybean oil', 'corn oil',
      'margarine', 'shortening',
    ],
    ingredientIds: [
      'en:wheat', 'en:wheat-flour', 'en:barley', 'en:rye', 'en:oats',
      'en:corn', 'en:rice', 'en:bread', 'en:pasta', 'en:noodles',
      'en:soy', 'en:soya', 'en:tofu', 'en:tempeh', 'en:peanut',
      'en:lentil', 'en:chickpea', 'en:black-bean', 'en:kidney-bean',
      'en:milk', 'en:cream', 'en:butter', 'en:cheese', 'en:whey', 'en:casein',
      'en:sugar', 'en:high-fructose-corn-syrup', 'en:corn-syrup',
      'en:canola-oil', 'en:soybean-oil', 'en:corn-oil', 'en:margarine',
    ],
  },

  whole30: {
    keywords: [
      // Grains
      'wheat', 'wheat flour', 'barley', 'rye', 'oats', 'corn', 'rice',
      'bread', 'pasta', 'noodles', 'quinoa', 'buckwheat',
      // Legumes
      'soy', 'soya', 'tofu', 'peanut', 'lentil', 'chickpea', 'bean',
      // Dairy
      'milk', 'cream', 'butter', 'cheese', 'whey', 'casein', 'yoghurt',
      // Sugar (all forms)
      'sugar', 'sucrose', 'glucose', 'fructose', 'honey', 'agave',
      'maple syrup', 'coconut sugar', 'stevia', 'xylitol', 'erythritol',
      'aspartame', 'sucralose', 'saccharin', 'acesulfame',
      // Alcohol
      'alcohol', 'beer', 'wine',
      // Processed
      'carrageenan', 'msg', 'sulphite', 'sulfite',
    ],
    ingredientIds: [
      'en:wheat', 'en:wheat-flour', 'en:barley', 'en:rye', 'en:oats',
      'en:corn', 'en:rice', 'en:bread', 'en:pasta',
      'en:soy', 'en:soya', 'en:tofu', 'en:peanut',
      'en:lentil', 'en:chickpea',
      'en:milk', 'en:cream', 'en:butter', 'en:cheese', 'en:whey', 'en:casein',
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:fructose',
      'en:honey', 'en:agave-syrup', 'en:maple-syrup',
      'en:stevia', 'en:xylitol', 'en:erythritol',
      'en:aspartame', 'en:sucralose', 'en:saccharin',
      'en:carrageenan', 'en:monosodium-glutamate',
    ],
  },

  pregnancy: {
    keywords: [
      'caffeine', 'coffee', 'coffee extract', 'guarana',
      'alcohol', 'beer', 'wine', 'spirits',
      'raw egg', 'unpasteurised', 'unpasteurized',
      'liver', 'pate', 'liver pate',
      'mercury', 'swordfish', 'shark', 'marlin', 'king mackerel',
      'raw fish', 'sushi',
      'sodium nitrate', 'sodium nitrite', 'e250', 'e251',
      'quinine',
      'liquorice', 'licorice', 'glycyrrhizin',
      'aspartame', 'saccharin',
    ],
    ingredientIds: [
      'en:caffeine', 'en:coffee', 'en:guarana',
      'en:liver', 'en:pate',
      'en:swordfish', 'en:shark', 'en:marlin',
      'en:sodium-nitrate', 'en:sodium-nitrite', 'en:e250', 'en:e251',
      'en:quinine', 'en:liquorice', 'en:licorice',
      'en:aspartame', 'en:saccharin',
    ],
  },

  postBariatric: {
    keywords: [
      'sugar', 'sucrose', 'glucose', 'glucose syrup', 'high fructose corn syrup',
      'corn syrup', 'honey', 'agave syrup', 'maple syrup',
      'carbonated water', 'sparkling water',
      'alcohol', 'beer', 'wine',
      'bread', 'pasta', 'rice', 'white flour',
      'fried', 'deep fried',
      'sorbitol', 'mannitol', 'xylitol', 'maltitol',
    ],
    ingredientIds: [
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:glucose-syrup',
      'en:high-fructose-corn-syrup', 'en:corn-syrup',
      'en:honey', 'en:agave-syrup', 'en:maple-syrup',
      'en:bread', 'en:pasta', 'en:rice', 'en:white-flour',
      'en:sorbitol', 'en:mannitol', 'en:xylitol', 'en:maltitol',
    ],
  },

  highProtein: {
    keywords: [
      // Flag high-sugar / empty-carb ingredients that work against high-protein goals
      'sugar', 'sucrose', 'glucose syrup', 'high fructose corn syrup',
      'corn syrup', 'maltodextrin',
      'white flour', 'refined flour', 'cornstarch',
    ],
    ingredientIds: [
      'en:sugar', 'en:glucose-syrup', 'en:high-fructose-corn-syrup',
      'en:corn-syrup', 'en:maltodextrin',
      'en:white-flour', 'en:cornstarch',
    ],
  },

  plantBased: {
    keywords: [
      'meat', 'beef', 'pork', 'lamb', 'chicken', 'turkey', 'duck', 'veal',
      'bacon', 'ham', 'sausage', 'salami', 'pepperoni',
      'fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawn',
      'gelatin', 'gelatine', 'collagen',
      'milk', 'cream', 'butter', 'cheese', 'whey', 'casein',
      'egg', 'egg white', 'egg yolk', 'albumin',
      'honey', 'beeswax', 'shellac',
      'lard', 'tallow', 'suet', 'dripping',
      'anchovy', 'anchovies', 'fish sauce', 'oyster sauce',
    ],
    ingredientIds: [
      'en:meat', 'en:beef', 'en:pork', 'en:lamb', 'en:chicken', 'en:turkey',
      'en:bacon', 'en:ham', 'en:sausage',
      'en:fish', 'en:salmon', 'en:tuna', 'en:cod', 'en:shrimp', 'en:prawn',
      'en:gelatin', 'en:gelatine', 'en:collagen',
      'en:milk', 'en:cream', 'en:butter', 'en:cheese', 'en:whey', 'en:casein',
      'en:egg', 'en:eggs', 'en:honey', 'en:beeswax',
      'en:lard', 'en:tallow', 'en:anchovy', 'en:fish-sauce', 'en:oyster-sauce',
    ],
  },

  sustainable: {
    keywords: [
      'palm oil', 'palm fat', 'palm kernel oil',
      'hydrogenated palm oil',
    ],
    ingredientIds: [
      'en:palm-oil', 'en:palm-fat', 'en:palm-kernel-oil',
      'en:hydrogenated-palm-oil',
    ],
  },

  mediterraneanDiet: {
    keywords: [
      // Processed meats — not aligned with Mediterranean principles
      'processed meat', 'deli meat', 'hot dog', 'sausage', 'salami', 'pepperoni',
      'bacon', 'ham', 'luncheon meat',
      // Trans fats and heavily processed oils
      'trans fat', 'partially hydrogenated', 'hydrogenated vegetable oil',
      'hydrogenated fat', 'shortening', 'margarine',
      // Refined grains and starches
      'white flour', 'refined flour', 'enriched flour', 'bleached flour',
      'cornstarch', 'corn starch', 'modified starch',
      // Excess added sugars
      'sugar', 'sucrose', 'high fructose corn syrup', 'glucose syrup',
      'corn syrup', 'invert sugar', 'maltodextrin',
      // Artificial additives inconsistent with whole-food focus
      'artificial colour', 'artificial color', 'artificial flavour', 'artificial flavor',
    ],
    ingredientIds: [
      'en:bacon', 'en:ham', 'en:salami', 'en:pepperoni',
      'en:hydrogenated-vegetable-oil', 'en:hydrogenated-fat',
      'en:margarine', 'en:shortening',
      'en:white-flour', 'en:refined-flour', 'en:cornstarch', 'en:modified-starch',
      'en:sugar', 'en:sucrose', 'en:high-fructose-corn-syrup',
      'en:glucose-syrup', 'en:corn-syrup', 'en:maltodextrin',
    ],
  },
};
