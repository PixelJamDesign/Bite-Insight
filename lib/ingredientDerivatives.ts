/**
 * ingredientDerivatives.ts
 *
 * ⚠️  SAFETY-CRITICAL FILE  ⚠️
 *
 * This file maps parent allergens/ingredients to ALL known derivatives,
 * chemical names, E-numbers, abbreviations, and alternate names that
 * appear on food labels worldwide.
 *
 * Missing a derivative for someone with a severe allergy (e.g. peanut,
 * shellfish) could be life-threatening. When in doubt, INCLUDE the term —
 * false positives are always safer than false negatives.
 *
 * Sources: FDA, EFSA, FSANZ, Codex Alimentarius, UK FSA, and major
 * allergy organisations (FARE, Anaphylaxis UK, Allergy & Anaphylaxis
 * Australia).
 *
 * All derivative names are lowercase for case-insensitive matching.
 */

// ---------------------------------------------------------------------------
// 1.  INGREDIENT_DERIVATIVES  — Map<string, string[]>
// ---------------------------------------------------------------------------

export const INGREDIENT_DERIVATIVES = new Map<string, string[]>([

  // ═══════════════════════════════════════════════════════════════════════════
  //  ALLERGENS  (potentially life-threatening — be EXHAUSTIVE)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Peanut ──────────────────────────────────────────────────────────────
  ['peanut', [
    'peanut', 'peanuts', 'peanut butter', 'peanut oil', 'peanut flour',
    'peanut protein', 'peanut meal', 'peanut paste', 'peanut extract',
    'peanut milk', 'peanut sauce', 'peanut brittle', 'peanut butter powder',
    'arachis', 'arachis oil', 'arachis hypogaea',
    'groundnut', 'groundnuts', 'groundnut oil',
    'monkey nut', 'monkey nuts',
    'beer nut', 'beer nuts',
    'earth nut', 'earth nuts',
    'goober', 'goober pea', 'goober peas',
    'mandelonas', 'nu-nuts',
    'arachide', 'cacahuete', 'cacahuète',
    'satay', 'satay sauce',
    'hydrolysed peanut protein', 'hydrolyzed peanut protein',
    'defatted peanut flour', 'cold-pressed peanut oil',
    'refined peanut oil', 'crude peanut oil',
    'peanut sprouts', 'boiled peanuts', 'roasted peanuts',
    'dry roasted peanuts', 'crushed peanuts', 'chopped peanuts',
    'ground peanuts', 'peanut pieces',
  ]],

  // ── Almond ──────────────────────────────────────────────────────────────
  ['almond', [
    'almond', 'almonds', 'almond butter', 'almond oil', 'almond flour',
    'almond meal', 'almond milk', 'almond paste', 'almond extract',
    'almond cream', 'almond cheese', 'almond yogurt', 'almond yoghurt',
    'almond protein', 'almond brittle', 'almond praline',
    'blanched almond', 'blanched almonds', 'ground almonds',
    'flaked almonds', 'sliced almonds', 'slivered almonds',
    'roasted almonds', 'toasted almonds', 'smoked almonds',
    'marcona almond', 'marcona almonds',
    'amandine', 'marzipan', 'marchpane', 'frangipane', 'frangipani',
    'amaretti', 'orgeat', 'orgeat syrup',
    'prunus dulcis', 'prunus amygdalus',
    'amande', 'mandel', 'mandorla',
    'macaroon', 'amaretto',
  ]],

  // ── Cashew ──────────────────────────────────────────────────────────────
  ['cashew', [
    'cashew', 'cashews', 'cashew nut', 'cashew nuts',
    'cashew butter', 'cashew oil', 'cashew milk', 'cashew cream',
    'cashew cheese', 'cashew flour', 'cashew meal', 'cashew paste',
    'cashew yogurt', 'cashew yoghurt', 'cashew protein',
    'anacardium occidentale',
    'roasted cashews', 'raw cashews', 'salted cashews',
  ]],

  // ── Walnut ──────────────────────────────────────────────────────────────
  ['walnut', [
    'walnut', 'walnuts', 'walnut oil', 'walnut butter', 'walnut milk',
    'walnut flour', 'walnut meal', 'walnut paste', 'walnut extract',
    'walnut pieces', 'walnut halves',
    'english walnut', 'black walnut', 'persian walnut',
    'juglans regia', 'juglans nigra',
    'noix',
  ]],

  // ── Pecan ───────────────────────────────────────────────────────────────
  ['pecan', [
    'pecan', 'pecans', 'pecan nut', 'pecan nuts',
    'pecan butter', 'pecan oil', 'pecan flour', 'pecan meal',
    'pecan paste', 'pecan milk', 'pecan praline',
    'carya illinoinensis',
    'roasted pecans', 'candied pecans', 'praline pecans',
  ]],

  // ── Pistachio ───────────────────────────────────────────────────────────
  ['pistachio', [
    'pistachio', 'pistachios', 'pistachio nut', 'pistachio nuts',
    'pistachio butter', 'pistachio oil', 'pistachio paste',
    'pistachio cream', 'pistachio flour', 'pistachio meal',
    'pistachio milk', 'pistachio praline',
    'pistacia vera',
    'roasted pistachios', 'salted pistachios',
  ]],

  // ── Macadamia ───────────────────────────────────────────────────────────
  ['macadamia', [
    'macadamia', 'macadamias', 'macadamia nut', 'macadamia nuts',
    'macadamia butter', 'macadamia oil', 'macadamia milk',
    'macadamia flour', 'macadamia paste',
    'queensland nut', 'bush nut',
    'macadamia integrifolia', 'macadamia tetraphylla',
    'roasted macadamias',
  ]],

  // ── Brazil nut ──────────────────────────────────────────────────────────
  ['brazil nut', [
    'brazil nut', 'brazil nuts', 'brazil nut oil', 'brazil nut butter',
    'brazil nut flour', 'brazil nut milk',
    'bertholletia excelsa',
    'para nut', 'cream nut',
  ]],

  // ── Hazelnut / Filbert ──────────────────────────────────────────────────
  ['hazelnut', [
    'hazelnut', 'hazelnuts', 'hazel nut', 'hazel nuts',
    'hazelnut oil', 'hazelnut butter', 'hazelnut flour', 'hazelnut meal',
    'hazelnut milk', 'hazelnut paste', 'hazelnut cream',
    'hazelnut spread', 'hazelnut praline', 'hazelnut extract',
    'filbert', 'filberts', 'filbert nut',
    'cobnut', 'cobnuts', 'cob nut',
    'corylus avellana',
    'gianduja', 'gianduia', 'gianduja chocolate',
    'noisette', 'praline', 'praliné',
    'nutella', 'nocciola',
    'roasted hazelnuts', 'blanched hazelnuts', 'ground hazelnuts',
  ]],

  // ── Chestnut ────────────────────────────────────────────────────────────
  ['chestnut', [
    'chestnut', 'chestnuts', 'chestnut flour', 'chestnut meal',
    'chestnut puree', 'chestnut purée', 'chestnut paste', 'chestnut cream',
    'chestnut milk', 'marron', 'marron glacé', 'marrons glacés',
    'castanea', 'castanea sativa',
    'water chestnut', 'chinese chestnut',
    'roasted chestnuts',
  ]],

  // ── Pine nut ────────────────────────────────────────────────────────────
  ['pine nut', [
    'pine nut', 'pine nuts', 'pine kernel', 'pine kernels',
    'pignoli', 'pignolia', 'pigñon', 'pinon', 'piñon',
    'pignole', 'pinoli', 'indian nut',
    'pinus', 'pesto',
  ]],

  // ── Coconut ─────────────────────────────────────────────────────────────
  ['coconut', [
    'coconut', 'coconuts', 'coconut oil', 'coconut butter',
    'coconut milk', 'coconut cream', 'coconut water',
    'coconut flour', 'coconut sugar', 'coconut nectar',
    'coconut aminos', 'coconut vinegar', 'coconut yogurt', 'coconut yoghurt',
    'coconut flakes', 'desiccated coconut', 'shredded coconut',
    'coconut extract', 'coconut manna', 'coconut spread',
    'creamed coconut', 'coconut powder',
    'coconut meat', 'copra', 'cocos nucifera',
    'virgin coconut oil', 'refined coconut oil',
    'mct oil', 'coconut fat',
  ]],

  // ── Tree nuts (general / mixed) ─────────────────────────────────────────
  ['tree nuts', [
    'tree nut', 'tree nuts', 'mixed nuts', 'nut mix',
    'nut butter', 'nut oil', 'nut flour', 'nut meal', 'nut milk',
    'nut paste', 'nut cream', 'nut extract',
    'nougat', 'nougatine', 'turron', 'turrón',
    'praline', 'praliné', 'marzipan', 'marchpane',
    'gianduja', 'gianduia',
    'frangipane', 'frangipani',
    'baklava', 'nougat montelimar',
    'dukkah', 'trail mix', 'gorp',
    'nut brittle', 'nut butter spread',
    // Note: individual nuts are in their own entries above
  ]],

  // ── Milk / Dairy ────────────────────────────────────────────────────────
  ['milk', [
    'milk', 'milk powder', 'milk solids', 'milk protein',
    'milk fat', 'milk sugar', 'milkfat',
    'whole milk', 'skimmed milk', 'skim milk', 'semi-skimmed milk',
    'low fat milk', 'full cream milk', 'full fat milk',
    'dried milk', 'dry milk', 'powdered milk',
    'condensed milk', 'evaporated milk',
    'buttermilk', 'butter milk',
    'raw milk', 'pasteurised milk', 'pasteurized milk',
    'goat milk', 'goat\'s milk', 'sheep milk', 'sheep\'s milk',
    'buffalo milk',
    'milk derivative', 'milk derivatives',
    'dairy', 'dairy products',
    // Proteins
    'casein', 'caseinate', 'caseinates',
    'sodium caseinate', 'calcium caseinate', 'potassium caseinate',
    'acid casein', 'rennet casein', 'hydrolysed casein', 'hydrolyzed casein',
    'whey', 'whey protein', 'whey powder', 'whey concentrate',
    'whey isolate', 'whey protein concentrate', 'whey protein isolate',
    'whey protein hydrolysate', 'whey permeate', 'sweet whey',
    'acid whey', 'demineralised whey', 'demineralized whey',
    'lactalbumin', 'alpha-lactalbumin', 'beta-lactoglobulin',
    'lactalbumin phosphate', 'lactoglobulin',
    'lactoferrin', 'lactoperoxidase',
    // Sugars
    'lactose', 'galactose',
    // Fats
    'butter', 'butter oil', 'butter fat', 'butterfat', 'butter flavour',
    'butter flavor', 'butter extract', 'anhydrous milkfat',
    'anhydrous butter fat', 'clarified butter',
    'ghee', 'brown butter', 'cultured butter', 'salted butter',
    'unsalted butter',
    'cream', 'double cream', 'single cream', 'heavy cream',
    'light cream', 'whipping cream', 'thickened cream',
    'sour cream', 'soured cream', 'clotted cream',
    'crème fraîche', 'creme fraiche',
    'half and half', 'half-and-half',
    'coffee creamer', 'non-dairy creamer',
    // Fermented dairy
    'yogurt', 'yoghurt', 'yogourt', 'greek yogurt', 'greek yoghurt',
    'drinking yogurt', 'frozen yogurt',
    'kefir',
    'cheese', 'cheddar', 'mozzarella', 'parmesan', 'parmigiano',
    'gouda', 'brie', 'camembert', 'feta', 'gruyere', 'gruyère',
    'emmental', 'emmentaler', 'swiss cheese', 'ricotta', 'mascarpone',
    'cottage cheese', 'cream cheese', 'neufchatel', 'neufchâtel',
    'stilton', 'roquefort', 'gorgonzola', 'blue cheese',
    'haloumi', 'halloumi', 'paneer', 'quark', 'fromage blanc',
    'fromage frais', 'processed cheese', 'cheese powder',
    'cheese flavour', 'cheese flavor',
    'queso', 'pecorino', 'manchego', 'provolone', 'asiago',
    'romano', 'colby', 'monterey jack', 'fontina', 'raclette',
    'taleggio', 'burrata', 'bocconcini', 'string cheese',
    'curds', 'curd', 'cheese curds',
    // Other dairy-derived
    'ice cream', 'gelato', 'custard',
    'milk chocolate',
    'recaldent', 'simplesse',
    'nisin', 'diacetyl',
    'lactic acid starter culture',
    'nougat',
    'rennet', 'animal rennet',
    'hydrolysed milk protein', 'hydrolyzed milk protein',
    'milk albumin', 'lactulose', 'tagatose',
    'lactitol',
    // E-numbers from dairy
    'e966',
  ]],

  // ── Egg ─────────────────────────────────────────────────────────────────
  ['egg', [
    'egg', 'eggs', 'egg white', 'egg whites', 'egg yolk', 'egg yolks',
    'egg powder', 'egg solids', 'egg protein',
    'dried egg', 'dry egg', 'powdered egg',
    'whole egg', 'liquid egg', 'frozen egg',
    'pasteurised egg', 'pasteurized egg',
    'free range egg', 'free-range egg', 'free range eggs',
    'egg wash', 'egg glaze', 'egg noodle', 'egg noodles',
    'egg pasta', 'egg lecithin',
    'albumin', 'albumen', 'egg albumin', 'egg albumen',
    'globulin', 'ovoglobulin',
    'lysozyme', 'e1105',
    'ovalbumin', 'ovomucin', 'ovomucoid', 'ovovitellin',
    'ovotransferrin', 'ovoferrin', 'ovoflavin',
    'phosvitin',
    'livetin', 'vitellin',
    'silici albuminate',
    'simplesse',
    'mayonnaise', 'mayo', 'aioli',
    'meringue', 'meringue powder',
    'hollandaise', 'béarnaise', 'bearnaise',
    'eggnog', 'egg nog',
    'quiche', 'frittata', 'omelette', 'omelet',
    'surimi',
    'e322', 'lecithin',
    'apovitellin', 'ovovitelia',
  ]],

  // ── Wheat ───────────────────────────────────────────────────────────────
  ['wheat', [
    'wheat', 'wheat flour', 'wheat starch', 'wheat protein',
    'wheat germ', 'wheat germ oil', 'wheat bran', 'wheat fibre', 'wheat fiber',
    'wheat gluten', 'vital wheat gluten',
    'whole wheat', 'wholemeal', 'wholewheat', 'whole wheat flour',
    'wheat berries', 'wheat groats', 'cracked wheat',
    'wheat grass', 'wheatgrass',
    'hydrolysed wheat protein', 'hydrolyzed wheat protein',
    'modified wheat starch',
    'bulgur', 'bulghur', 'burghul',
    'couscous',
    'durum', 'durum wheat', 'durum flour', 'durum semolina',
    'einkorn',
    'emmer',
    'farina',
    'farro',
    'freekeh', 'farik',
    'kamut', 'khorasan wheat',
    'semolina',
    'spelt', 'spelt flour', 'dinkel',
    'triticale',
    'atta', 'atta flour', 'maida', 'maida flour',
    'plain flour', 'all-purpose flour', 'all purpose flour',
    'self-raising flour', 'self raising flour', 'self-rising flour',
    'bread flour', 'cake flour', 'pastry flour', 'strong flour',
    'chapati flour', 'roti flour',
    'seitan',
    'fu',
    'panko', 'breadcrumb', 'breadcrumbs',
    'pasta', 'noodle', 'noodles',
    'vermicelli',
    'orzo',
    'matzo', 'matzoh', 'matza', 'matzah',
    'tabbouleh', 'tabouli',
    'modified food starch',
    'ramen', 'udon',
    'croutons', 'crouton',
    'graham flour', 'graham cracker', 'graham crackers',
    'wonton wrapper', 'wonton wrappers', 'wonton skin',
    'spring roll wrapper', 'spring roll wrappers',
  ]],

  // ── Gluten ──────────────────────────────────────────────────────────────
  ['gluten', [
    'gluten', 'wheat gluten', 'vital wheat gluten',
    // Wheat-based (cross-reference wheat entry)
    'wheat', 'wheat flour', 'wheat starch', 'wheat protein',
    'wheat germ', 'wheat bran',
    'whole wheat', 'wholemeal', 'wholewheat',
    'bulgur', 'bulghur', 'burghul',
    'couscous', 'durum', 'durum wheat',
    'einkorn', 'emmer', 'farina', 'farro', 'freekeh',
    'kamut', 'khorasan wheat', 'semolina',
    'spelt', 'spelt flour', 'dinkel',
    'triticale',
    'seitan', 'fu',
    // Barley
    'barley', 'barley flour', 'barley malt', 'barley grass',
    'pearl barley', 'pot barley', 'barley flakes',
    'malt', 'malt extract', 'malt syrup', 'malt vinegar',
    'malt flavouring', 'malt flavoring', 'malted barley',
    'malted barley flour', 'malt powder',
    'maltose',
    // Rye
    'rye', 'rye flour', 'rye bread', 'pumpernickel',
    'rye flakes', 'rye meal',
    // Oats (unless certified GF, may be cross-contaminated)
    'oat', 'oats', 'oat flour', 'oat bran', 'oat fibre', 'oat fiber',
    'oatmeal', 'porridge oats', 'rolled oats', 'steel cut oats',
    'oat milk', 'oat groats', 'oat flakes',
    // Brewer's yeast
    'brewer\'s yeast', 'brewers yeast',
    // Other
    'hydrolysed wheat protein', 'hydrolyzed wheat protein',
    'modified wheat starch', 'modified food starch',
    'panko', 'breadcrumb', 'breadcrumbs',
    'soy sauce', 'teriyaki sauce',
    'atta', 'maida',
    'matzo', 'matzoh', 'matza', 'matzah',
    'ramen', 'udon',
    'croutons', 'crouton',
    'graham flour', 'graham cracker', 'graham crackers',
    'wonton wrapper', 'wonton wrappers', 'wonton skin',
    'spring roll wrapper', 'spring roll wrappers',
  ]],

  // ── Soy / Soya ─────────────────────────────────────────────────────────
  ['soy', [
    'soy', 'soya', 'soybean', 'soybeans', 'soya bean', 'soya beans',
    'soy protein', 'soy protein isolate', 'soy protein concentrate',
    'soy flour', 'soya flour', 'soy meal',
    'soy milk', 'soya milk', 'soy drink',
    'soy oil', 'soybean oil', 'soya oil',
    'soy sauce', 'soya sauce', 'shoyu', 'tamari',
    'soy lecithin', 'soya lecithin', 'e322',
    'soy fibre', 'soy fiber', 'soy bran',
    'soy cream', 'soy yogurt', 'soy yoghurt', 'soy cheese',
    'soy margarine',
    'textured vegetable protein', 'tvp',
    'textured soy protein', 'tsp',
    'hydrolysed soy protein', 'hydrolyzed soy protein',
    'hydrolysed vegetable protein', 'hydrolyzed vegetable protein',
    'hvp',
    'edamame',
    'miso', 'miso paste',
    'natto',
    'tempeh',
    'tofu', 'bean curd', 'silken tofu', 'firm tofu',
    'yuba', 'bean curd skin',
    'kinako',
    'okara',
    'soy nut', 'soy nuts', 'soy butter',
    'soy grits', 'soy sprouts',
    'soy albumin',
    'glycine max',
    'hoisin sauce',
    'teriyaki sauce',
    'bean paste', 'fermented bean paste', 'doenjang', 'douchi',
    'e426', 'soybean hemicellulose',
  ]],

  // ── Fish ────────────────────────────────────────────────────────────────
  ['fish', [
    'fish', 'fish sauce', 'fish oil', 'fish paste', 'fish extract',
    'fish stock', 'fish broth', 'fish powder', 'fish gelatin', 'fish gelatine',
    'fish protein', 'fish collagen',
    'omega-3', 'omega 3', 'fish omega-3',
    'cod liver oil',
    'anchovy', 'anchovies', 'anchovy paste', 'anchovy extract',
    'bass', 'sea bass', 'striped bass',
    'catfish',
    'cod', 'codfish', 'bacalao', 'bacalhau',
    'flounder',
    'grouper',
    'haddock',
    'hake',
    'halibut',
    'herring', 'kipper', 'kippered herring', 'rollmop',
    'john dory',
    'mackerel',
    'mahi mahi', 'mahi-mahi', 'dorado',
    'monkfish',
    'perch',
    'pike',
    'plaice',
    'pollock', 'pollack', 'alaska pollock',
    'red snapper', 'snapper',
    'salmon', 'smoked salmon', 'lox', 'gravlax',
    'sardine', 'sardines', 'pilchard', 'pilchards',
    'sea bream', 'bream',
    'skate',
    'sole', 'dover sole', 'lemon sole',
    'sprat', 'whitebait',
    'swordfish',
    'tilapia',
    'trout', 'rainbow trout', 'sea trout',
    'tuna', 'yellowfin tuna', 'albacore', 'skipjack',
    'turbot',
    'wahoo',
    'whiting',
    'surimi', 'imitation crab',
    'bonito', 'bonito flakes', 'katsuobushi', 'dashi',
    'worcestershire sauce', 'worcester sauce',
    'caesar dressing', 'caesar salad dressing',
    'gentleman\'s relish', 'patum peperium',
    'nam pla', 'nuoc mam', 'garum',
    'isinglass',
    'roe', 'fish roe', 'caviar', 'taramasalata', 'tobiko', 'ikura', 'masago',
    'fish meal', 'fish hydrolysate', 'fish hydrolyzate',
    'colatura', 'colatura di alici',
    'fumet', 'fish fumet',
  ]],

  // ── Shellfish / Crustacean ──────────────────────────────────────────────
  ['shellfish', [
    'shellfish',
    // Crustaceans
    'crustacean', 'crustaceans',
    'shrimp', 'shrimps', 'shrimp paste', 'shrimp powder',
    'dried shrimp', 'shrimp sauce',
    'prawn', 'prawns', 'prawn crackers', 'prawn cocktail',
    'king prawn', 'tiger prawn',
    'crab', 'crab meat', 'crab stick', 'crab paste', 'crab extract',
    'lobster', 'lobster bisque', 'lobster paste', 'lobster sauce',
    'crayfish', 'crawfish', 'crawdad', 'écrevisse',
    'langoustine', 'langostino', 'scampi',
    'krill', 'krill oil',
    // Molluscs
    'mollusc', 'molluscs', 'mollusk', 'mollusks',
    'clam', 'clams', 'clam juice', 'clam chowder',
    'mussel', 'mussels',
    'oyster', 'oysters', 'oyster sauce', 'oyster extract',
    'scallop', 'scallops',
    'squid', 'calamari', 'squid ink',
    'octopus',
    'cuttlefish',
    'snail', 'snails', 'escargot',
    'abalone',
    'whelk', 'whelks',
    'periwinkle', 'periwinkles',
    'cockle', 'cockles',
    'limpet', 'limpets',
    'conch',
    // Products
    'surimi', 'imitation crab',
    'belacan', 'blachan', 'shrimp paste',
    'bagoong', 'terasi', 'trassi',
    'chitosan', 'chitin',
    'glucosamine',
    'geoduck',
    'razor clam', 'razor clams',
    'tomalley',
  ]],

  // ── Sesame ──────────────────────────────────────────────────────────────
  ['sesame', [
    'sesame', 'sesame seed', 'sesame seeds',
    'sesame oil', 'sesame seed oil', 'toasted sesame oil',
    'sesame flour', 'sesame paste', 'sesame butter', 'sesame powder',
    'sesame protein',
    'tahini', 'tahina', 'tehina',
    'halvah', 'halva', 'halwa',
    'hummus', 'houmous', 'houmus',
    'gomasio', 'gomashio',
    'benne', 'benne seed', 'benne seeds',
    'gingelly', 'gingelly oil',
    'til', 'til oil',
    'sesamum indicum',
    'sesame salt',
    'za\'atar', 'zaatar',
    'black sesame', 'white sesame',
    'sesame snap', 'sesame snaps',
    'chikki',
  ]],

  // ── Celery ──────────────────────────────────────────────────────────────
  ['celery', [
    'celery', 'celery seed', 'celery seeds', 'celery salt',
    'celery powder', 'celery extract', 'celery juice',
    'celery leaf', 'celery leaves', 'celery stalk', 'celery stalks',
    'celery root', 'celery flakes',
    'celeriac',
    'apium graveolens',
    'celery oil',
  ]],

  // ── Mustard ─────────────────────────────────────────────────────────────
  ['mustard', [
    'mustard', 'mustard seed', 'mustard seeds',
    'mustard oil', 'mustard flour', 'mustard powder',
    'mustard paste', 'mustard extract',
    'prepared mustard', 'dijon mustard', 'english mustard',
    'french mustard', 'wholegrain mustard', 'yellow mustard',
    'honey mustard', 'hot mustard',
    'mustard greens', 'mustard leaves',
    'sinapis', 'brassica juncea', 'brassica nigra',
    'sinapis alba',
  ]],

  // ── Lupin / Lupine ──────────────────────────────────────────────────────
  ['lupin', [
    'lupin', 'lupine', 'lupin flour', 'lupin seed', 'lupin seeds',
    'lupin protein', 'lupin fibre', 'lupin fiber',
    'lupin bean', 'lupin beans',
    'lupini', 'lupini bean', 'lupini beans',
    'lupinus', 'lupinus albus',
  ]],

  // ── Sulphites / Sulfites ────────────────────────────────────────────────
  ['sulphites', [
    'sulphite', 'sulphites', 'sulfite', 'sulfites',
    'sulphur dioxide', 'sulfur dioxide',
    'sodium sulphite', 'sodium sulfite',
    'sodium bisulphite', 'sodium bisulfite',
    'sodium metabisulphite', 'sodium metabisulfite',
    'potassium bisulphite', 'potassium bisulfite',
    'potassium metabisulphite', 'potassium metabisulfite',
    'calcium sulphite', 'calcium sulfite',
    'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228',
  ]],

  // ═══════════════════════════════════════════════════════════════════════════
  //  HEALTH CONDITIONS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Sugar (for diabetics / sugar-sensitive) ─────────────────────────────
  ['sugar', [
    'sugar', 'sugars',
    'white sugar', 'brown sugar', 'raw sugar',
    'caster sugar', 'castor sugar', 'icing sugar', 'powdered sugar',
    'confectioners sugar', 'granulated sugar',
    'cane sugar', 'cane juice', 'evaporated cane juice',
    'demerara', 'demerara sugar',
    'muscovado', 'muscovado sugar',
    'turbinado', 'turbinado sugar',
    'palm sugar', 'jaggery', 'gur', 'panela', 'piloncillo', 'rapadura',
    'coconut sugar', 'coconut palm sugar',
    'date sugar',
    'beet sugar',
    // Chemical names
    'sucrose', 'glucose', 'fructose', 'dextrose',
    'maltose', 'galactose', 'trehalose',
    'levulose',
    // Syrups
    'glucose syrup', 'glucose-fructose syrup', 'fructose-glucose syrup',
    'corn syrup', 'corn syrup solids', 'high fructose corn syrup', 'hfcs',
    'golden syrup', 'treacle', 'black treacle',
    'molasses', 'blackstrap molasses',
    'maple syrup', 'maple sugar',
    'agave', 'agave syrup', 'agave nectar',
    'rice syrup', 'rice malt syrup', 'brown rice syrup',
    'barley malt syrup', 'malt syrup', 'malt extract',
    'date syrup', 'date paste',
    'honey', 'manuka honey', 'raw honey',
    'invert sugar', 'inverted sugar', 'invert sugar syrup',
    'caramel', 'caramel syrup', 'caramelised sugar', 'caramelized sugar',
    'fruit juice concentrate', 'apple juice concentrate',
    'grape juice concentrate', 'pear juice concentrate',
    'refiners syrup',
    // Maltodextrin / dextrins
    'maltodextrin', 'dextrin',
    'isoglucose', 'isomaltose',
    // Sugar alcohols (partial sugar impact)
    'sorbitol', 'e420',
    'mannitol', 'e421',
    'xylitol', 'e967',
    'maltitol', 'e965',
    'erythritol', 'e968',
    'isomalt', 'e953',
    'lactitol', 'e966',
    'hydrogenated starch hydrolysate',
    // Others
    'sucanat', 'panela',
    'tagatose',
    'crystalline fructose',
  ]],

  // ── Salt / Sodium ───────────────────────────────────────────────────────
  ['sodium', [
    'salt', 'sodium', 'sodium chloride',
    'sea salt', 'rock salt', 'himalayan salt', 'himalayan pink salt',
    'kosher salt', 'fleur de sel', 'flake salt', 'celtic salt',
    'table salt', 'iodised salt', 'iodized salt',
    'msg', 'monosodium glutamate', 'e621',
    'sodium nitrate', 'e251',
    'sodium nitrite', 'e250',
    'sodium benzoate', 'e211',
    'sodium sorbate',
    'baking soda', 'sodium bicarbonate', 'e500',
    'baking powder',
    'sodium citrate', 'e331',
    'disodium phosphate', 'e339',
    'trisodium phosphate',
    'sodium erythorbate', 'e316',
    'sodium ascorbate', 'e301',
    'sodium lactate', 'e325',
    'sodium acetate', 'e262',
    'sodium alginate', 'e401',
    'sodium carboxymethylcellulose', 'e466',
    'sodium caseinate',
    'sodium stearoyl lactylate', 'e481',
    'sodium metabisulfite', 'sodium metabisulphite', 'e223',
    'sodium tripolyphosphate', 'e451',
    'sodium acid pyrophosphate', 'e450',
    'sodium diacetate',
    'sodium gluconate',
    'sodium propionate', 'e281',
    'soy sauce', 'tamari', 'fish sauce',
    'bouillon', 'stock cube', 'stock powder',
  ]],

  // ── Saturated fat sources ───────────────────────────────────────────────
  ['saturated fat', [
    'palm oil', 'palm fat', 'palm kernel oil', 'palm olein', 'palm stearin',
    'palmitate', 'sodium palmitate', 'ethyl palmitate',
    'coconut oil', 'coconut fat',
    'lard', 'pork fat', 'pork lard', 'rendered pork fat',
    'tallow', 'beef tallow', 'beef fat', 'dripping', 'suet',
    'shortening', 'vegetable shortening',
    'hydrogenated oil', 'hydrogenated vegetable oil',
    'partially hydrogenated oil', 'partially hydrogenated vegetable oil',
    'hydrogenated fat', 'partially hydrogenated fat',
    'hydrogenated palm oil', 'hydrogenated coconut oil',
    'hydrogenated soybean oil',
    'interesterified fat', 'interesterified oil',
    'butter', 'butterfat', 'butter oil', 'anhydrous milkfat',
    'ghee', 'clarified butter',
    'cream', 'double cream', 'heavy cream',
    'cocoa butter',
  ]],

  // ── Red meat ────────────────────────────────────────────────────────────
  ['red meat', [
    'beef', 'beef extract', 'beef stock', 'beef broth', 'beef fat',
    'beef tallow', 'beef gelatin', 'beef gelatine', 'beef powder',
    'ground beef', 'minced beef', 'beef mince', 'steak',
    'veal',
    'lamb', 'lamb fat', 'lamb stock', 'mutton',
    'pork', 'pork fat', 'pork extract', 'pork gelatin', 'pork gelatine',
    'pork stock', 'pork rind', 'pork rinds', 'pork crackling',
    'ground pork', 'minced pork', 'pork mince',
    'venison', 'deer',
    'bison', 'buffalo',
    'goat', 'goat meat', 'chevon', 'cabrito',
    'horse', 'horsemeat',
    'kangaroo',
    'rabbit',
    'wild boar',
    'offal', 'liver', 'kidney', 'heart', 'tongue', 'tripe',
    'oxtail', 'ox tongue',
    'suet', 'dripping', 'tallow', 'lard',
  ]],

  // ── Processed meat ──────────────────────────────────────────────────────
  ['processed meat', [
    'bacon', 'back bacon', 'streaky bacon', 'turkey bacon',
    'bacon bits', 'bacon powder', 'bacon extract',
    'ham', 'cooked ham', 'smoked ham', 'cured ham', 'parma ham',
    'prosciutto', 'prosciutto cotto', 'prosciutto crudo',
    'salami', 'genoa salami', 'hard salami',
    'sausage', 'sausages', 'sausage meat', 'sausage roll',
    'bratwurst', 'frankfurter', 'wiener', 'vienna sausage',
    'hot dog', 'hotdog',
    'pepperoni',
    'chorizo',
    'pancetta',
    'bresaola',
    'mortadella', 'bologna', 'baloney',
    'pastrami',
    'corned beef',
    'spam',
    'jerky', 'beef jerky', 'biltong',
    'pâté', 'pate', 'liver pâté', 'liver pate',
    'liverwurst', 'leberwurst', 'braunschweiger',
    'black pudding', 'blood sausage', 'blood pudding',
    'white pudding',
    'haggis',
    'nduja', 'sobrassada',
    'luncheon meat', 'deli meat', 'cold cut', 'cold cuts',
    'cured meat', 'smoked meat',
    'coppa', 'capicola', 'capocollo',
    'guanciale', 'speck',
    'andouille', 'andouillette',
    'kielbasa', 'kolbász',
    'salchichón', 'longaniza',
  ]],

  // ═══════════════════════════════════════════════════════════════════════════
  //  DIETARY PREFERENCES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Alcohol ─────────────────────────────────────────────────────────────
  ['alcohol', [
    'alcohol', 'ethanol', 'ethyl alcohol',
    'wine', 'red wine', 'white wine', 'rosé wine', 'rose wine',
    'cooking wine', 'rice wine', 'wine vinegar', 'wine extract',
    'marsala', 'port', 'port wine', 'sherry', 'sherry vinegar',
    'madeira', 'vermouth',
    'champagne', 'prosecco', 'cava', 'sparkling wine',
    'beer', 'ale', 'lager', 'stout', 'porter',
    'malt liquor', 'malt beverage',
    'cider', 'hard cider', 'perry',
    'mead',
    'sake', 'saké', 'rice wine',
    'rum', 'dark rum', 'white rum', 'spiced rum', 'rum extract',
    'brandy', 'cognac', 'armagnac', 'brandy extract',
    'bourbon', 'whiskey', 'whisky', 'scotch', 'rye whiskey',
    'vodka',
    'gin',
    'tequila', 'mezcal',
    'liqueur', 'liquor',
    'amaretto', 'kahlúa', 'kahlua', 'cointreau', 'grand marnier',
    'baileys', 'irish cream',
    'kirsch', 'kirschwasser',
    'grappa',
    'absinthe',
    'mirin',
    'vanilla extract', 'almond extract', 'lemon extract',
    'spirit vinegar',
  ]],

  // ── Caffeine ────────────────────────────────────────────────────────────
  ['caffeine', [
    'caffeine', 'caffeine anhydrous',
    'coffee', 'coffee extract', 'coffee bean', 'coffee beans',
    'coffee powder', 'instant coffee', 'espresso',
    'decaf coffee', 'decaffeinated coffee',
    'tea', 'black tea', 'green tea', 'white tea', 'oolong tea',
    'tea extract', 'green tea extract',
    'matcha', 'matcha powder',
    'guarana', 'guarana extract', 'guarana seed',
    'yerba mate', 'yerba maté', 'mate extract',
    'kola nut', 'cola nut', 'kola extract',
    'cocoa', 'cocoa powder', 'cocoa solids', 'cacao',
    'chocolate', 'dark chocolate', 'milk chocolate',
    'theophylline', 'theobromine',
  ]],

  // ── Corn ────────────────────────────────────────────────────────────────
  ['corn', [
    'corn', 'maize',
    'cornstarch', 'corn starch', 'cornflour', 'corn flour',
    'corn syrup', 'corn syrup solids',
    'high fructose corn syrup', 'hfcs',
    'corn oil', 'maize oil',
    'cornmeal', 'corn meal', 'corn grits', 'corn masa',
    'polenta',
    'hominy', 'grits', 'hominy grits',
    'corn tortilla', 'tortilla chips', 'corn chips',
    'popcorn',
    'corn protein', 'corn gluten', 'zein',
    'corn fibre', 'corn fiber', 'corn bran',
    'modified corn starch', 'modified cornstarch',
    'dextrose', 'dextrin', 'maltodextrin',
    'citric acid',
    'corn alcohol', 'corn sugar',
    'corn malt', 'corn extract',
    'high maltose corn syrup',
    'baby corn', 'sweetcorn', 'sweet corn',
    'corn on the cob',
    'masa harina',
    'glucose syrup',
    'caramel colour', 'caramel color',
    'e150a', 'e150b', 'e150c', 'e150d',
    'xanthan gum',
    'sorbitol',
  ]],

  // ═══════════════════════════════════════════════════════════════════════════
  //  E-NUMBERS → parent mapping (standalone entries for important E-numbers)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Animal-derived (not vegan/vegetarian) ───────────────────────────────
  ['animal derived', [
    'gelatin', 'gelatine', 'e441',
    'bone phosphate', 'e542',
    'shellac', 'e904',
    'beeswax', 'e901',
    'carmine', 'cochineal', 'e120', 'carminic acid',
    'l-cysteine', 'e920',
    'lanolin', 'e913',
    'casein', 'caseinate', 'sodium caseinate', 'calcium caseinate',
    'whey', 'whey powder', 'whey protein',
    'lactose',
    'isinglass',
    'tallow', 'lard', 'suet', 'dripping',
    'anchovy', 'anchovy extract',
    'rennet', 'animal rennet',
    'pepsin',
    'bone char',
    'collagen',
    'chitosan', 'chitin',
    'stearic acid', 'e570',
    'glycerine', 'glycerol', 'e422',
    'mono and diglycerides', 'e471',
    'calcium stearate', 'magnesium stearate',
    'vitamin d3', 'cholecalciferol',
    'omega-3', 'fish oil',
    'natural flavouring', 'natural flavoring',
    'natural colour', 'natural color',
    'albumen', 'albumin',
    'lysozyme', 'e1105',
  ]],

  // ── Southampton Six (hyperactivity-linked additives) ────────────────────
  ['southampton six', [
    'tartrazine', 'e102',
    'sunset yellow', 'sunset yellow fcf', 'e110',
    'carmoisine', 'azorubine', 'e122',
    'ponceau 4r', 'e124',
    'allura red', 'allura red ac', 'e129',
    'sodium benzoate', 'e211',
  ]],

  // ── Aspartame (contains phenylalanine — relevant for PKU) ───────────────
  ['aspartame', [
    'aspartame', 'e951',
    'aspartame-acesulfame salt', 'e962',
    'phenylalanine',
    'equal', 'nutrasweet',
  ]],

  // ── Nitrates / Nitrites ─────────────────────────────────────────────────
  ['nitrates', [
    'sodium nitrate', 'e251',
    'sodium nitrite', 'e250',
    'potassium nitrate', 'e252', 'saltpetre', 'saltpeter',
    'potassium nitrite', 'e249',
    'celery powder', 'celery extract', 'celery juice powder',
  ]],

  // ── MSG (monosodium glutamate) ──────────────────────────────────────────
  ['msg', [
    'msg', 'monosodium glutamate', 'e621',
    'glutamic acid', 'e620',
    'monopotassium glutamate', 'e622',
    'calcium glutamate', 'e623',
    'monoammonium glutamate', 'e624',
    'magnesium glutamate', 'e625',
    'hydrolysed protein', 'hydrolyzed protein',
    'hydrolysed vegetable protein', 'hydrolyzed vegetable protein',
    'autolysed yeast', 'autolyzed yeast',
    'yeast extract',
    'natural flavour', 'natural flavor',
    'glutamate',
  ]],

  // ── Artificial sweeteners ───────────────────────────────────────────────
  ['artificial sweeteners', [
    'aspartame', 'e951',
    'saccharin', 'e954',
    'sucralose', 'e955',
    'acesulfame k', 'acesulfame potassium', 'e950',
    'neotame', 'e961',
    'advantame', 'e969',
    'cyclamate', 'sodium cyclamate', 'e952',
    'aspartame-acesulfame salt', 'e962',
    'stevia', 'steviol glycosides', 'e960',
    'rebaudioside a', 'reb a',
    'thaumatin', 'e957',
    'neohesperidin dc', 'e959',
    'monk fruit', 'monk fruit extract', 'luo han guo',
  ]],

  // ── Artificial colours / colors ─────────────────────────────────────────
  ['artificial colours', [
    'tartrazine', 'e102',
    'quinoline yellow', 'e104',
    'sunset yellow', 'sunset yellow fcf', 'e110',
    'carmoisine', 'azorubine', 'e122',
    'amaranth', 'e123',
    'ponceau 4r', 'e124',
    'erythrosine', 'e127',
    'allura red', 'allura red ac', 'e129',
    'patent blue v', 'e131',
    'indigo carmine', 'indigotine', 'e132',
    'brilliant blue fcf', 'e133',
    'green s', 'e142',
    'brilliant black bn', 'e151',
    'brown ht', 'e155',
    'caramel colour', 'caramel color',
    'e150a', 'e150b', 'e150c', 'e150d',
    'titanium dioxide', 'e171',
  ]],

  // ── Preservatives ───────────────────────────────────────────────────────
  ['preservatives', [
    'sorbic acid', 'e200',
    'potassium sorbate', 'e202',
    'calcium sorbate', 'e203',
    'benzoic acid', 'e210',
    'sodium benzoate', 'e211',
    'potassium benzoate', 'e212',
    'calcium benzoate', 'e213',
    'sulphur dioxide', 'sulfur dioxide', 'e220',
    'sodium sulphite', 'sodium sulfite', 'e221',
    'sodium bisulphite', 'sodium bisulfite', 'e222',
    'sodium metabisulphite', 'sodium metabisulfite', 'e223',
    'potassium metabisulphite', 'potassium metabisulfite', 'e224',
    'sodium nitrite', 'e250',
    'sodium nitrate', 'e251',
    'potassium nitrate', 'e252',
    'propionic acid', 'e280',
    'sodium propionate', 'e281',
    'calcium propionate', 'e282',
    'potassium propionate', 'e283',
    'bha', 'butylated hydroxyanisole', 'e320',
    'bht', 'butylated hydroxytoluene', 'e321',
    'tbhq', 'tert-butylhydroquinone', 'e319',
    'natamycin', 'e235',
    'nisin', 'e234',
    'lysozyme', 'e1105',
  ]],

  // ═══════════════════════════════════════════════════════════════════════════
  //  INTOLERANCES / SENSITIVITIES
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Histamine ─────────────────────────────────────────────────────────────
  // High-histamine foods and histamine-liberating ingredients
  ['histamine', [
    'histamine',
    // Fermented foods
    'fermented', 'aged', 'matured', 'cured',
    'sauerkraut', 'kimchi', 'kombucha',
    'miso', 'tempeh', 'natto', 'soy sauce', 'tamari', 'shoyu',
    'fish sauce', 'oyster sauce', 'worcestershire sauce',
    // Vinegars
    'vinegar', 'wine vinegar', 'balsamic vinegar', 'cider vinegar',
    'malt vinegar', 'rice vinegar', 'sherry vinegar',
    // Aged cheese
    'parmesan', 'parmigiano', 'aged cheese', 'blue cheese', 'gorgonzola',
    'roquefort', 'stilton', 'camembert', 'brie', 'gouda', 'gruyere',
    'emmental', 'cheddar',
    // Processed/cured meats
    'salami', 'pepperoni', 'chorizo', 'prosciutto', 'pancetta',
    'ham', 'bacon', 'sausage', 'hot dog', 'frankfurter', 'bologna',
    'corned beef', 'pastrami', 'jerky', 'bresaola', 'coppa',
    // Fish (aged/canned/smoked)
    'anchovy', 'anchovies', 'sardine', 'sardines', 'mackerel',
    'herring', 'tuna', 'smoked fish', 'smoked salmon',
    'canned fish', 'fish paste', 'shrimp paste',
    // Yeast
    'yeast extract', 'autolyzed yeast', 'autolysed yeast',
    'brewer\'s yeast', 'nutritional yeast', 'marmite', 'vegemite',
    // Tomato (processed)
    'tomato paste', 'tomato puree', 'tomato sauce', 'tomato ketchup',
    'sun dried tomato', 'sun-dried tomato',
    // Alcohol
    'wine', 'red wine', 'white wine', 'beer', 'champagne', 'prosecco',
    // Chocolate/cocoa
    'cocoa', 'cacao', 'chocolate', 'dark chocolate',
    // Citrus
    'citric acid', 'e330',
    // Nuts (some are histamine-liberating)
    'walnut', 'walnuts', 'cashew', 'cashews', 'peanut', 'peanuts',
    // Additives
    'e621', 'monosodium glutamate', 'msg', 'glutamate', 'glutamic acid',
    'e627', 'disodium guanylate', 'e631', 'disodium inosinate',
    'tartrazine', 'e102', 'sunset yellow', 'e110',
    'sodium benzoate', 'e211', 'potassium sorbate', 'e202',
  ]],

  // ── Salicylate ────────────────────────────────────────────────────────────
  // Foods and additives high in salicylates
  ['salicylate', [
    'salicylate', 'salicylates', 'salicylic acid',
    'aspirin', 'acetylsalicylic acid',
    'methyl salicylate', 'wintergreen', 'wintergreen oil',
    // High-salicylate spices/herbs
    'cinnamon', 'cumin', 'curry', 'curry powder', 'cayenne',
    'paprika', 'turmeric', 'thyme', 'rosemary', 'oregano',
    'dill', 'sage', 'tarragon', 'basil', 'mint', 'peppermint',
    'anise', 'aniseed', 'star anise', 'clove', 'cloves',
    'ginger', 'mustard powder', 'allspice', 'nutmeg', 'mace',
    'fenugreek', 'bay leaf', 'bay leaves',
    // High-salicylate fruits
    'dried fruit', 'raisins', 'sultanas', 'currants', 'prunes',
    'dried apricot', 'dried apricots', 'dates',
    // Flavourings/extracts
    'peppermint oil', 'spearmint', 'eucalyptus',
    'vanilla extract', 'almond extract',
    // Additives/preservatives with salicylate activity
    'benzoic acid', 'e210', 'sodium benzoate', 'e211',
    'potassium benzoate', 'e212', 'calcium benzoate', 'e213',
    'tartrazine', 'e102',
    'sunset yellow', 'e110',
    'amaranth', 'e123',
    'quinoline yellow', 'e104',
    'bha', 'butylated hydroxyanisole', 'e320',
    'bht', 'butylated hydroxytoluene', 'e321',
    // Honey & mint
    'honey', 'mint sauce', 'mint jelly',
  ]],
]);


// ---------------------------------------------------------------------------
// 2.  getDerivatives(parentName)
// ---------------------------------------------------------------------------

/**
 * Returns all known derivative names for a given parent allergen/ingredient.
 * Returns an empty array if the parent is not found.
 *
 * @param parentName - The parent ingredient key (case-insensitive)
 * @returns Array of lowercase derivative names
 */
export function getDerivatives(parentName: string): string[] {
  const key = parentName.toLowerCase().trim();
  return INGREDIENT_DERIVATIVES.get(key) ?? [];
}


// ---------------------------------------------------------------------------
// 3.  findParentAllergen(ingredientText)
// ---------------------------------------------------------------------------

// Pre-built reverse lookup — maps each derivative to ALL parent allergens
// (not just the first). This is SAFETY-CRITICAL: lecithin can be from egg
// OR soy, surimi can contain egg, fish, AND shellfish. Missing any parent
// could cause a life-threatening false negative.
let _reverseMap: Map<string, string[]> | null = null;

function getReverseMap(): Map<string, string[]> {
  if (_reverseMap) return _reverseMap;

  _reverseMap = new Map<string, string[]>();
  for (const [parent, derivatives] of INGREDIENT_DERIVATIVES) {
    for (const derivative of derivatives) {
      const existing = _reverseMap.get(derivative);
      if (existing) {
        if (!existing.includes(parent)) existing.push(parent);
      } else {
        _reverseMap.set(derivative, [parent]);
      }
    }
  }
  return _reverseMap;
}

/**
 * Given a raw ingredient text from a food label, checks whether it matches
 * any known derivative and returns the FIRST matching parent allergen name.
 *
 * ⚠️  For safety-critical allergy detection, use `findAllParentAllergens()`
 *     instead — it returns ALL matching parents (e.g. lecithin → [egg, soy]).
 *
 * @param ingredientText - Raw ingredient string from a food label
 * @returns The first parent allergen name, or null
 */
export function findParentAllergen(ingredientText: string): string | null {
  const all = findAllParentAllergens(ingredientText);
  return all.length > 0 ? all[0] : null;
}

/**
 * Given a raw ingredient text from a food label, returns ALL parent
 * allergen/ingredient names that this ingredient could be derived from.
 *
 * This is the SAFE version — use this for allergy detection where a single
 * derivative (e.g. "lecithin") can come from multiple allergens (egg, soy).
 *
 * @param ingredientText - Raw ingredient string from a food label
 * @returns Array of parent allergen names (may be empty)
 */
export function findAllParentAllergens(ingredientText: string): string[] {
  const text = ingredientText.toLowerCase().trim();
  if (!text) return [];

  const reverseMap = getReverseMap();
  const matched = new Set<string>();
  const boundaryChars = /[\s,;()\/\-.:'"]/;

  // 1. Exact match
  const exact = reverseMap.get(text);
  if (exact) exact.forEach((p) => matched.add(p));

  // 2. Check if any derivative is contained as a whole word in the text.
  for (const [derivative, parents] of reverseMap) {
    if (derivative.length < 3) continue;
    if (text.includes(derivative)) {
      const idx = text.indexOf(derivative);
      const before = idx > 0 ? text[idx - 1] : ' ';
      const after = idx + derivative.length < text.length
        ? text[idx + derivative.length]
        : ' ';
      if (
        (idx === 0 || boundaryChars.test(before)) &&
        (idx + derivative.length === text.length || boundaryChars.test(after))
      ) {
        parents.forEach((p) => matched.add(p));
      }
    }
  }

  return Array.from(matched);
}
