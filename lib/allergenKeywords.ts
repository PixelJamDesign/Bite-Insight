// ── Allergen keyword mapping ─────────────────────────────────────────────────
// Maps each profile allergy label → the data needed to detect it in OFF data.
//   tags:           OFF allergens_tags values (after stripping "en:" and replacing "-" with " ")
//   keywords:       derivative ingredient names to match in raw ingredients text
//   ingredientIds:  OFF structured ingredient IDs (lowercase, with "en:" prefix)

export type AllergyEntry = {
  tags: string[];
  keywords: string[];
  ingredientIds: string[];
};

export const ALLERGY_KEYWORDS: Record<string, AllergyEntry> = {
  'Egg Allergy': {
    tags: ['eggs', 'egg'],
    keywords: [
      'egg white', 'egg yolk', 'egg powder', 'dried egg', 'whole egg',
      'pasteurised egg', 'pasteurized egg', 'free range egg',
      'albumin', 'albumen', 'globulin', 'lysozyme', 'ovomucin',
      'ovomucoid', 'ovovitellin', 'ovalbumin', 'livetin',
      'meringue', 'mayonnaise', 'aioli', 'eggnog',
      'lecithin', 'emulsifier e322',
    ],
    ingredientIds: [
      'en:egg', 'en:eggs', 'en:egg-white', 'en:egg-yolk', 'en:egg-powder',
      'en:whole-egg', 'en:dried-egg', 'en:pasteurised-egg', 'en:pasteurized-egg',
      'en:free-range-egg', 'en:free-range-eggs', 'en:liquid-egg',
      'en:egg-white-powder', 'en:egg-yolk-powder',
    ],
  },
  'Fructose Intolerance': {
    tags: ['fructose'],
    keywords: [
      'fructose', 'high fructose corn syrup', 'hfcs', 'fructose syrup',
      'fructose glucose syrup', 'glucose fructose syrup',
      'agave', 'agave syrup', 'agave nectar',
      'honey', 'apple juice concentrate', 'pear juice concentrate',
      'fruit juice concentrate', 'invert sugar', 'sorbitol',
    ],
    ingredientIds: [
      'en:fructose', 'en:high-fructose-corn-syrup', 'en:fructose-syrup',
      'en:fructose-glucose-syrup', 'en:glucose-fructose-syrup',
      'en:agave-syrup', 'en:honey', 'en:invert-sugar', 'en:sorbitol',
    ],
  },
  'Gluten Intolerance': {
    tags: ['gluten', 'wheat', 'barley', 'rye', 'oats', 'cereals containing gluten', 'cereals'],
    keywords: [
      'gluten', 'wheat', 'wheat flour', 'wheat starch', 'wheat protein',
      'wheat germ', 'wheat bran', 'durum wheat', 'semolina',
      'barley', 'barley malt', 'malt extract', 'malt vinegar', 'malt flavouring',
      'rye', 'rye flour',
      'oats', 'oat flour', 'oat fibre', 'oat fiber',
      'spelt', 'spelt flour', 'kamut', 'triticale', 'einkorn', 'emmer',
      'couscous', 'bulgur', 'seitan',
      'modified starch', 'hydrolysed wheat protein', 'hydrolyzed wheat protein',
    ],
    ingredientIds: [
      'en:gluten', 'en:wheat', 'en:wheat-flour', 'en:wheat-starch',
      'en:durum-wheat', 'en:durum-wheat-semolina', 'en:semolina',
      'en:barley', 'en:barley-malt', 'en:barley-malt-extract',
      'en:malt-extract', 'en:malt-vinegar',
      'en:rye', 'en:rye-flour', 'en:oats', 'en:oat-flour', 'en:oat-fibre',
      'en:spelt', 'en:spelt-flour', 'en:kamut', 'en:triticale',
      'en:bulgur', 'en:couscous', 'en:seitan',
    ],
  },
  'Histamine Intolerance': {
    tags: ['histamine'],
    keywords: [
      'histamine', 'fermented', 'aged cheese', 'parmesan',
      'sauerkraut', 'kimchi', 'vinegar', 'wine vinegar', 'balsamic vinegar',
      'soy sauce', 'fish sauce', 'anchovy', 'anchovies',
      'tomato paste', 'tomato puree', 'yeast extract', 'autolyzed yeast',
    ],
    ingredientIds: [
      'en:vinegar', 'en:wine-vinegar', 'en:balsamic-vinegar',
      'en:soy-sauce', 'en:fish-sauce', 'en:anchovy', 'en:anchovies',
      'en:yeast-extract', 'en:tomato-paste', 'en:tomato-puree',
      'en:sauerkraut', 'en:parmesan',
    ],
  },
  'Lactose Intolerance': {
    tags: ['milk', 'dairy', 'lactose'],
    keywords: [
      'milk', 'lactose', 'whole milk', 'skimmed milk', 'skim milk',
      'semi skimmed milk', 'milk powder', 'dried milk', 'milk solids',
      'milk protein', 'milk fat', 'condensed milk', 'evaporated milk',
      'buttermilk', 'cream', 'sour cream', 'double cream', 'single cream',
      'whipping cream', 'clotted cream',
      'butter', 'butter oil', 'butterfat', 'ghee',
      'cheese', 'cheddar', 'mozzarella', 'parmesan', 'gouda', 'brie',
      'camembert', 'feta', 'ricotta', 'mascarpone', 'cream cheese',
      'whey', 'whey powder', 'whey protein', 'whey permeate',
      'casein', 'caseinate', 'sodium caseinate', 'calcium caseinate',
      'lactalbumin', 'lactoglobulin', 'lactoferrin',
      'yoghurt', 'yogurt', 'kefir', 'quark', 'fromage frais',
      'ice cream', 'custard',
      'curds',
    ],
    ingredientIds: [
      'en:milk', 'en:whole-milk', 'en:skimmed-milk', 'en:semi-skimmed-milk',
      'en:milk-powder', 'en:skimmed-milk-powder', 'en:whole-milk-powder',
      'en:dried-milk', 'en:milk-solids', 'en:milk-protein', 'en:milk-fat',
      'en:condensed-milk', 'en:sweetened-condensed-milk', 'en:evaporated-milk',
      'en:buttermilk', 'en:cream', 'en:sour-cream', 'en:whipping-cream',
      'en:butter', 'en:butter-oil', 'en:butterfat', 'en:ghee',
      'en:cheese', 'en:cheddar', 'en:mozzarella', 'en:parmesan',
      'en:whey', 'en:whey-powder', 'en:whey-protein',
      'en:casein', 'en:caseinate', 'en:sodium-caseinate',
      'en:yogurt', 'en:yoghurt', 'en:kefir',
      'en:lactose', 'en:cream-cheese', 'en:mascarpone', 'en:ricotta',
    ],
  },
  'MSG Sensitivity': {
    tags: ['msg', 'monosodium glutamate'],
    keywords: [
      'monosodium glutamate', 'msg', 'glutamate', 'glutamic acid',
      'sodium glutamate', 'e621',
      'hydrolysed vegetable protein', 'hydrolyzed vegetable protein',
      'hydrolysed protein', 'hydrolyzed protein',
      'autolyzed yeast', 'autolysed yeast', 'yeast extract',
      'calcium glutamate', 'e623', 'monopotassium glutamate', 'e622',
    ],
    ingredientIds: [
      'en:monosodium-glutamate', 'en:e621', 'en:glutamic-acid',
      'en:yeast-extract', 'en:hydrolysed-vegetable-protein',
      'en:hydrolyzed-vegetable-protein',
    ],
  },
  'Peanut Allergy': {
    tags: ['peanuts', 'peanut'],
    keywords: [
      'peanut', 'peanuts', 'peanut oil', 'peanut butter', 'peanut flour',
      'peanut paste', 'groundnut', 'groundnuts', 'groundnut oil',
      'arachis oil', 'arachis hypogaea', 'monkey nuts',
      'beer nuts', 'earth nuts',
    ],
    ingredientIds: [
      'en:peanut', 'en:peanuts', 'en:peanut-oil', 'en:peanut-butter',
      'en:peanut-flour', 'en:peanut-paste', 'en:groundnut', 'en:groundnut-oil',
      'en:roasted-peanuts',
    ],
  },
  'Salicylate Sensitivity': {
    tags: ['salicylate', 'salicylates'],
    keywords: [
      'salicylate', 'salicylates', 'salicylic acid',
      'aspirin', 'acetylsalicylic acid',
      'methyl salicylate', 'wintergreen',
    ],
    ingredientIds: [
      'en:salicylic-acid',
    ],
  },
  'Sesame Allergy': {
    tags: ['sesame seeds', 'sesame'],
    keywords: [
      'sesame', 'sesame seeds', 'sesame oil', 'sesame paste', 'sesame flour',
      'tahini', 'tahina', 'halvah', 'halva', 'hummus', 'houmous',
      'gomashio', 'gomasio',
      'sesame seed oil', 'toasted sesame',
    ],
    ingredientIds: [
      'en:sesame', 'en:sesame-seeds', 'en:sesame-oil', 'en:sesame-paste',
      'en:tahini', 'en:toasted-sesame-seeds', 'en:sesame-seed-oil',
      'en:hulled-sesame-seeds',
    ],
  },
  'Shellfish Allergy': {
    tags: ['crustaceans', 'molluscs', 'shellfish'],
    keywords: [
      'shellfish', 'crustacean', 'crustaceans', 'mollusc', 'molluscs',
      'mollusk', 'mollusks',
      'shrimp', 'shrimps', 'prawn', 'prawns', 'crab', 'lobster',
      'crayfish', 'crawfish', 'langoustine', 'scampi', 'krill',
      'mussel', 'mussels', 'clam', 'clams', 'oyster', 'oysters',
      'scallop', 'scallops', 'squid', 'calamari', 'octopus',
      'snail', 'escargot', 'abalone', 'whelk', 'cockle', 'cockles',
      'cuttlefish',
      'chitin', 'chitosan', 'glucosamine',
      'shrimp paste', 'fish sauce', 'oyster sauce',
    ],
    ingredientIds: [
      'en:crustaceans', 'en:molluscs', 'en:shrimp', 'en:prawns', 'en:prawn',
      'en:crab', 'en:lobster', 'en:crayfish', 'en:langoustine',
      'en:mussel', 'en:mussels', 'en:clam', 'en:clams',
      'en:oyster', 'en:oysters', 'en:scallop', 'en:scallops',
      'en:squid', 'en:calamari', 'en:octopus', 'en:cuttlefish',
      'en:oyster-sauce', 'en:fish-sauce', 'en:shrimp-paste',
    ],
  },
  'Soy Allergy': {
    tags: ['soybeans', 'soy', 'soya'],
    keywords: [
      'soy', 'soya', 'soybeans', 'soybean', 'soya bean', 'soya beans',
      'soy sauce', 'soya sauce', 'shoyu', 'tamari',
      'soy lecithin', 'soya lecithin', 'soy protein', 'soya protein',
      'soy flour', 'soya flour', 'soy oil', 'soybean oil', 'soya oil',
      'soy milk', 'soya milk',
      'tofu', 'tempeh', 'miso', 'natto', 'edamame',
      'textured vegetable protein', 'tvp',
      'hydrolysed soy protein', 'hydrolyzed soy protein',
      'soy concentrate', 'soy isolate', 'soy fibre', 'soy fiber',
      'e322', 'e426',
    ],
    ingredientIds: [
      'en:soy', 'en:soya', 'en:soybeans', 'en:soybean', 'en:soya-beans',
      'en:soy-sauce', 'en:soya-sauce', 'en:tamari',
      'en:soy-lecithin', 'en:soya-lecithin', 'en:e322',
      'en:soy-protein', 'en:soya-protein', 'en:soy-flour', 'en:soya-flour',
      'en:soybean-oil', 'en:soy-oil', 'en:soya-oil',
      'en:tofu', 'en:tempeh', 'en:miso', 'en:edamame',
    ],
  },
  'Sulphite Sensitivity': {
    tags: [
      'sulphur dioxide and sulphites', 'sulphur dioxide', 'sulphites',
      'sulfur dioxide', 'sulfites',
    ],
    keywords: [
      'sulphite', 'sulphites', 'sulfite', 'sulfites',
      'sulphur dioxide', 'sulfur dioxide',
      'sodium sulphite', 'sodium sulfite', 'sodium bisulphite', 'sodium bisulfite',
      'sodium metabisulphite', 'sodium metabisulfite',
      'potassium bisulphite', 'potassium bisulfite',
      'potassium metabisulphite', 'potassium metabisulfite',
      'calcium sulphite', 'calcium sulfite',
      'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228',
    ],
    ingredientIds: [
      'en:sulphur-dioxide', 'en:sulfur-dioxide', 'en:sulphites', 'en:sulfites',
      'en:sodium-metabisulphite', 'en:sodium-metabisulfite',
      'en:potassium-metabisulphite', 'en:potassium-metabisulfite',
      'en:e220', 'en:e221', 'en:e222', 'en:e223', 'en:e224',
      'en:e225', 'en:e226', 'en:e227', 'en:e228',
    ],
  },
  'Tree Nut Allergy': {
    tags: ['nuts', 'tree nuts'],
    keywords: [
      'tree nut', 'tree nuts',
      'almond', 'almonds', 'almond oil', 'almond flour', 'almond milk',
      'almond butter', 'almond paste', 'marzipan', 'frangipane',
      'walnut', 'walnuts', 'walnut oil',
      'cashew', 'cashews', 'cashew nut', 'cashew butter',
      'pecan', 'pecans', 'pecan nut',
      'pistachio', 'pistachios', 'pistachio nut',
      'hazelnut', 'hazelnuts', 'hazel nut', 'filbert', 'filberts',
      'hazelnut oil', 'hazelnut paste', 'praline', 'gianduja', 'nutella',
      'macadamia', 'macadamia nut', 'macadamia nuts',
      'brazil nut', 'brazil nuts',
      'pine nut', 'pine nuts', 'pignoli', 'pinon',
      'chestnut', 'chestnuts',
      'coconut',
      'mixed nuts', 'nut mix',
    ],
    ingredientIds: [
      'en:nuts', 'en:tree-nuts',
      'en:almond', 'en:almonds', 'en:almond-oil', 'en:almond-flour',
      'en:almond-paste', 'en:almond-butter', 'en:marzipan',
      'en:walnut', 'en:walnuts', 'en:walnut-oil',
      'en:cashew', 'en:cashews', 'en:cashew-nut', 'en:cashew-nuts',
      'en:pecan', 'en:pecans', 'en:pecan-nut',
      'en:pistachio', 'en:pistachios', 'en:pistachio-nut',
      'en:hazelnut', 'en:hazelnuts', 'en:hazelnut-oil', 'en:hazelnut-paste',
      'en:macadamia', 'en:macadamia-nut', 'en:macadamia-nuts',
      'en:brazil-nut', 'en:brazil-nuts',
      'en:pine-nut', 'en:pine-nuts',
      'en:chestnut', 'en:chestnuts', 'en:coconut',
      'en:praline',
    ],
  },
  // ── EU14 additions (not in original list) ──
  'Fish Allergy': {
    tags: ['fish'],
    keywords: [
      'fish', 'cod', 'salmon', 'tuna', 'trout', 'haddock', 'halibut',
      'mackerel', 'sardine', 'sardines', 'anchovy', 'anchovies',
      'herring', 'plaice', 'sole', 'bass', 'bream', 'pike', 'perch',
      'swordfish', 'pollock', 'pollack', 'tilapia', 'catfish', 'snapper',
      'fish oil', 'fish sauce', 'fish paste', 'fish stock', 'fish extract',
      'fish gelatin', 'fish gelatine', 'isinglass',
      'omega 3', 'omega-3',
      'worcestershire sauce',
      'surimi', 'fish finger', 'fish cake',
    ],
    ingredientIds: [
      'en:fish', 'en:cod', 'en:salmon', 'en:tuna', 'en:trout',
      'en:haddock', 'en:halibut', 'en:mackerel', 'en:sardine', 'en:sardines',
      'en:anchovy', 'en:anchovies', 'en:herring', 'en:pollock',
      'en:fish-oil', 'en:fish-sauce', 'en:fish-stock', 'en:fish-extract',
      'en:fish-gelatin', 'en:fish-gelatine', 'en:isinglass',
      'en:surimi', 'en:tilapia',
    ],
  },
  'Celery Allergy': {
    tags: ['celery'],
    keywords: [
      'celery', 'celeriac', 'celery seed', 'celery seeds', 'celery salt',
      'celery powder', 'celery leaf', 'celery stalk', 'celery root',
      'celery extract', 'celery juice',
    ],
    ingredientIds: [
      'en:celery', 'en:celeriac', 'en:celery-seed', 'en:celery-seeds',
      'en:celery-salt', 'en:celery-powder', 'en:celery-extract',
    ],
  },
  'Mustard Allergy': {
    tags: ['mustard'],
    keywords: [
      'mustard', 'mustard seed', 'mustard seeds', 'mustard powder',
      'mustard flour', 'mustard oil', 'mustard paste',
      'dijon mustard', 'english mustard', 'french mustard',
      'wholegrain mustard', 'yellow mustard', 'brown mustard',
    ],
    ingredientIds: [
      'en:mustard', 'en:mustard-seed', 'en:mustard-seeds',
      'en:mustard-powder', 'en:mustard-flour', 'en:mustard-oil',
      'en:dijon-mustard',
    ],
  },
  'Lupin Allergy': {
    tags: ['lupin', 'lupine'],
    keywords: [
      'lupin', 'lupine', 'lupin flour', 'lupin seed', 'lupin seeds',
      'lupin protein', 'lupin fibre', 'lupin fiber',
      'lupini beans', 'lupini',
    ],
    ingredientIds: [
      'en:lupin', 'en:lupine', 'en:lupin-flour', 'en:lupin-seeds',
      'en:lupin-protein', 'en:lupini-beans',
    ],
  },
};
