// ── OFF Taxonomy Overrides ──────────────────────────────────────────────────
// The upstream Open Food Facts ingredient taxonomy is the source of truth for
// "is ingredient X under category Y", but it has gaps — root-level nodes that
// logically should have parents. We patch those here.
//
// Each entry maps an OFF ingredient ID to additional parent IDs that the
// taxonomy walker should treat as ancestors. The added parents can be real
// OFF tags (en:added-sugar) or virtual tags we coin ourselves
// (en:refined-starch, en:trans-fat-source) — virtual tags exist only in
// this file and in HealthFlagEntry.flagsTaxonomyAncestors references.
//
// Adding here should be a stopgap. The right long-term fix is to file PRs
// upstream at https://github.com/openfoodfacts/openfoodfacts-server in
// taxonomies/ingredients/ingredients.txt — once accepted the entry here
// can be removed.

export const TAXONOMY_OVERRIDES: Record<string, string[]> = {
  // ── Sugars / refined carbs (diabetes, preDiabetes, insulinResistance) ──
  'en:maltodextrin': ['en:added-sugar', 'en:refined-starch'],
  'en:dextrin': ['en:refined-starch'],
  'en:white-flour': ['en:refined-starch'],
  'en:refined-flour': ['en:refined-starch'],
  'en:bleached-flour': ['en:refined-starch'],
  'en:enriched-flour': ['en:refined-starch'],
  'en:cornstarch': ['en:refined-starch'],
  'en:corn-starch': ['en:refined-starch'],
  'en:tapioca-starch': ['en:refined-starch'],
  'en:potato-starch': ['en:refined-starch'],
  'en:rice-starch': ['en:refined-starch'],
  'en:modified-starch': ['en:refined-starch'],
  'en:white-rice': ['en:refined-starch'],
  'en:instant-rice': ['en:refined-starch'],
  'en:puffed-rice': ['en:refined-starch'],
  'en:rice-syrup': ['en:added-sugar'],
  'en:brown-rice-syrup': ['en:added-sugar'],
  'en:date-syrup': ['en:added-sugar'],
  'en:coconut-sugar': ['en:added-sugar'],
  'en:palm-sugar': ['en:added-sugar'],
  'en:jaggery': ['en:added-sugar'],
  'en:treacle': ['en:added-sugar'],
  'en:molasses': ['en:added-sugar'],
  'en:golden-syrup': ['en:added-sugar'],
  'en:invert-sugar-syrup': ['en:added-sugar'],

  // ── Trans / hydrogenated fats (heartDisease, highCholesterol) ─────────
  'en:trans-fats': ['en:trans-fat-source'],
  'en:partially-hydrogenated-vegetable-oil': ['en:hydrogenated-oil', 'en:trans-fat-source'],
  'en:partially-hydrogenated-oil': ['en:hydrogenated-oil', 'en:trans-fat-source'],
  'en:hydrogenated-fat': ['en:hydrogenated-oil', 'en:trans-fat-source'],
  'en:hydrogenated-palm-oil': ['en:hydrogenated-oil'],
  'en:margarine': ['en:trans-fat-source'],
  'en:shortening': ['en:trans-fat-source'],
  'en:interesterified-fat': ['en:trans-fat-source'],
  // Saturated-fat-heavy animal fats — see also red-meat section below where
  // lard/tallow/suet/dripping get pork-derivative + animal-fat tagging.

  // ── Sodium sources (hypertension, heartDisease) ───────────────────────
  // Items also relevant to other categories (sodium-nitrite for cancer,
  // sodium-benzoate for ADHD, sodium-phosphate for CKD) are tagged with
  // multiple parents in the relevant sections further down.
  'en:monosodium-glutamate': ['en:sodium-source'],
  'en:msg': ['en:sodium-source'],
  'en:e621': ['en:sodium-source'],
  'en:sodium-bicarbonate': ['en:sodium-source'],
  'en:sodium-citrate': ['en:sodium-source'],
  'en:sodium-lactate': ['en:sodium-source'],
  'en:sodium-acetate': ['en:sodium-source'],
  'en:salt': ['en:sodium-source'],
  'en:soy-sauce': ['en:sodium-source'],
  'en:worcestershire-sauce': ['en:sodium-source'],
  'en:bouillon': ['en:sodium-source'],
  'en:stock-cube': ['en:sodium-source'],
  // Explicitly NOT a sodium source — low-sodium salt substitute:
  // 'en:potassium-chloride': []  (left alone — root is fine)
  // 'en:sodium-ascorbate' is technically sodium but the contribution is
  // negligible (vitamin C carrier). Leave as root — won't false-flag.

  // ── Gluten-containing cereals (coeliac) ───────────────────────────────
  // Wheat / barley / rye / spelt / kamut / triticale all roll up to
  // en:cereal in OFF — but so do corn, rice, oats. We coin a tighter
  // category here so coeliac flags don't false-fire on naturally gf cereals.
  'en:wheat': ['en:gluten-cereal'],
  'en:durum-wheat': ['en:gluten-cereal'],
  'en:khorasan-wheat': ['en:gluten-cereal'],
  'en:einkorn': ['en:gluten-cereal'],
  'en:emmer': ['en:gluten-cereal'],
  'en:spelt': ['en:gluten-cereal'],
  'en:kamut': ['en:gluten-cereal'],
  'en:barley': ['en:gluten-cereal'],
  'en:malted-barley': ['en:gluten-cereal'],
  'en:rye': ['en:gluten-cereal'],
  'en:triticale': ['en:gluten-cereal'],
  'en:semolina': ['en:gluten-cereal'],
  'en:bulgur': ['en:gluten-cereal'],
  'en:couscous': ['en:gluten-cereal'],
  'en:seitan': ['en:gluten-cereal'],
  'en:malt-extract': ['en:gluten-cereal'],
  'en:barley-malt': ['en:gluten-cereal'],
  'en:barley-malt-extract': ['en:gluten-cereal'],
  // Oats are technically gluten-free but commonly cross-contaminated; we
  // flag them for coeliac to stay on the safe side. Conservative.
  'en:oats': ['en:gluten-cereal'],
  'en:oat-flour': ['en:gluten-cereal'],
  'en:oat-fibre': ['en:gluten-cereal'],

  // ── Dairy derivatives (dairyFree, IBS lactose, vegan) ─────────────────
  'en:lactose': ['en:dairy-derivative'],
  'en:casein': ['en:dairy-derivative'],
  'en:caseinate': ['en:dairy-derivative'],
  'en:sodium-caseinate': ['en:dairy-derivative'],
  'en:calcium-caseinate': ['en:dairy-derivative'],
  'en:milk-powder': ['en:dairy-derivative'],
  'en:skimmed-milk-powder': ['en:dairy-derivative'],
  'en:whey-powder': ['en:dairy-derivative'],
  'en:milk-protein': ['en:dairy-derivative'],
  'en:milk-solids': ['en:dairy-derivative'],
  'en:butter-fat': ['en:dairy-derivative'],
  'en:milk-fat': ['en:dairy-derivative'],
  'en:ghee': ['en:dairy-derivative'],
  'en:buttermilk': ['en:dairy-derivative'],
  'en:condensed-milk': ['en:dairy-derivative'],
  'en:evaporated-milk': ['en:dairy-derivative'],

  // ── Soy derivatives (soy allergy, peanut-adjacent allergens) ──────────
  'en:soy-lecithin': ['en:soy-derivative'],
  'en:soya-lecithin': ['en:soy-derivative'],
  'en:lecithin': [], // lecithin alone is multi-source; don't auto-flag
  // soy-protein / soya-protein moved to goitrogen section below (multi-parent)
  'en:hydrolysed-soy-protein': ['en:soy-derivative'],
  'en:textured-soy-protein': ['en:soy-derivative'],
  'en:tofu': ['en:soy-derivative'],
  'en:edamame': ['en:soy-derivative'],
  'en:soya-bean': ['en:soy-derivative'],

  // ── High-FODMAP markers (IBS) ─────────────────────────────────────────
  'en:inulin': ['en:high-fodmap'],
  'en:chicory-root': ['en:high-fodmap'],
  'en:chicory-root-fibre': ['en:high-fodmap'],
  'en:fructo-oligosaccharides': ['en:high-fodmap'],
  'en:oligofructose': ['en:high-fodmap'],
  'en:sorbitol': ['en:high-fodmap', 'en:polyol'],
  'en:mannitol': ['en:high-fodmap', 'en:polyol'],
  'en:xylitol': ['en:high-fodmap', 'en:polyol'],
  'en:maltitol': ['en:high-fodmap', 'en:polyol'],
  'en:isomalt': ['en:high-fodmap', 'en:polyol'],
  'en:erythritol': ['en:polyol'],

  // ── Artificial sweeteners (cleanEating, pregnancy caution) ────────────
  'en:aspartame': ['en:artificial-sweetener'],
  'en:e951': ['en:artificial-sweetener'],
  'en:acesulfame-k': ['en:artificial-sweetener'],
  'en:acesulfame-potassium': ['en:artificial-sweetener'],
  'en:e950': ['en:artificial-sweetener'],
  'en:sucralose': ['en:artificial-sweetener'],
  'en:e955': ['en:artificial-sweetener'],
  'en:saccharin': ['en:artificial-sweetener'],
  'en:e954': ['en:artificial-sweetener'],
  'en:cyclamate': ['en:artificial-sweetener'],
  'en:e952': ['en:artificial-sweetener'],
  'en:neotame': ['en:artificial-sweetener'],
  'en:advantame': ['en:artificial-sweetener'],
  'en:steviol-glycosides': ['en:natural-sweetener'],
  'en:e960': ['en:natural-sweetener'],

  // ── Caffeine sources (migraine, ME, pregnancy, breastfeeding, ADHD,
  //    childFriendly, GERD, crohns, uc) ─────────────────────────────────
  'en:caffeine': ['en:caffeine-source'],
  'en:coffee': ['en:caffeine-source'],
  'en:coffee-extract': ['en:caffeine-source'],
  'en:instant-coffee': ['en:caffeine-source'],
  'en:guarana': ['en:caffeine-source'],
  'en:guarana-extract': ['en:caffeine-source'],
  'en:tea-extract': ['en:caffeine-source'],
  'en:black-tea': ['en:caffeine-source'],
  'en:green-tea': ['en:caffeine-source'],
  'en:kola-nut': ['en:caffeine-source'],
  'en:cocoa': ['en:caffeine-source', 'en:chocolate-source'],
  'en:cocoa-powder': ['en:caffeine-source', 'en:chocolate-source'],
  'en:cocoa-butter': ['en:chocolate-source'],
  'en:cocoa-mass': ['en:caffeine-source', 'en:chocolate-source'],
  'en:chocolate': ['en:caffeine-source', 'en:chocolate-source'],
  'en:dark-chocolate': ['en:caffeine-source', 'en:chocolate-source'],
  'en:milk-chocolate': ['en:caffeine-source', 'en:chocolate-source', 'en:dairy-derivative'],

  // ── Processed meat (cancer baseline, cancerColorectal, diverticular,
  //    mediterraneanDiet) ─────────────────────────────────────────────────
  // OFF has many of these as children of en:meat already. We pin the
  // ones that are root-level and tag the whole class.
  'en:bacon': ['en:processed-meat'],
  'en:smoked-bacon': ['en:processed-meat'],
  'en:cured-bacon': ['en:processed-meat'],
  'en:streaky-bacon': ['en:processed-meat'],
  'en:back-bacon': ['en:processed-meat'],
  'en:ham': ['en:processed-meat'],
  'en:cooked-ham': ['en:processed-meat'],
  'en:cured-ham': ['en:processed-meat'],
  'en:smoked-ham': ['en:processed-meat'],
  'en:gammon': ['en:processed-meat'],
  'en:salami': ['en:processed-meat'],
  'en:pepperoni': ['en:processed-meat'],
  'en:chorizo': ['en:processed-meat'],
  'en:mortadella': ['en:processed-meat'],
  'en:prosciutto': ['en:processed-meat'],
  'en:parma-ham': ['en:processed-meat'],
  'en:pancetta': ['en:processed-meat'],
  'en:coppa': ['en:processed-meat'],
  'en:nduja': ['en:processed-meat'],
  'en:lardons': ['en:processed-meat'],
  'en:bresaola': ['en:processed-meat'],
  'en:hot-dog': ['en:processed-meat'],
  'en:frankfurter': ['en:processed-meat'],
  'en:wiener': ['en:processed-meat'],
  'en:bratwurst': ['en:processed-meat'],
  'en:sausage': ['en:processed-meat'],
  'en:pork-sausage': ['en:processed-meat'],
  'en:beef-sausage': ['en:processed-meat'],
  'en:chipolata': ['en:processed-meat'],
  'en:cumberland-sausage': ['en:processed-meat'],
  'en:luncheon-meat': ['en:processed-meat'],
  'en:corned-beef': ['en:processed-meat'],
  'en:beef-jerky': ['en:processed-meat'],
  'en:pastrami': ['en:processed-meat'],
  'en:bologna': ['en:processed-meat'],
  'en:liverwurst': ['en:processed-meat'],
  'en:smoked-sausage': ['en:processed-meat'],
  'en:smoked-meat': ['en:processed-meat'],
  'en:smoked-turkey': ['en:processed-meat'],
  'en:smoked-chicken': ['en:processed-meat'],

  // ── Red meat (cancerColorectal, endometriosis, paleo deny) ────────────
  'en:beef': ['en:red-meat'],
  'en:minced-beef': ['en:red-meat'],
  'en:beef-mince': ['en:red-meat'],
  'en:beef-steak': ['en:red-meat'],
  'en:lamb': ['en:red-meat'],
  'en:minced-lamb': ['en:red-meat'],
  'en:mutton': ['en:red-meat'],
  'en:pork': ['en:red-meat', 'en:pork-derivative'],
  'en:minced-pork': ['en:red-meat', 'en:pork-derivative'],
  'en:pork-belly': ['en:red-meat', 'en:pork-derivative'],
  'en:pork-meat': ['en:red-meat', 'en:pork-derivative'],
  'en:pork-fat': ['en:pork-derivative', 'en:animal-fat'],
  'en:pork-rind': ['en:pork-derivative'],
  'en:veal': ['en:red-meat'],
  'en:venison': ['en:red-meat'],
  'en:bison': ['en:red-meat'],
  'en:goat': ['en:red-meat'],

  // Pork-derivative shared with halal (everything red-meat tagged 'pork'
  // above also flagged as pork-derivative).
  'en:lard': ['en:pork-derivative', 'en:animal-fat'],

  // ── Nitrite preservatives (cancer, migraine, pregnancy, mediterraneanDiet,
  //    cleanEating, leakyGut) ─────────────────────────────────────────────
  'en:sodium-nitrite': ['en:nitrite-preservative', 'en:sodium-source'],
  'en:potassium-nitrite': ['en:nitrite-preservative'],
  'en:sodium-nitrate': ['en:nitrite-preservative', 'en:sodium-source'],
  'en:potassium-nitrate': ['en:nitrite-preservative'],
  'en:e249': ['en:nitrite-preservative'],
  'en:e250': ['en:nitrite-preservative'],
  'en:e251': ['en:nitrite-preservative'],
  'en:e252': ['en:nitrite-preservative'],

  // ── Alcohol (already en:alcohol exists in OFF as a root; many
  //    children already roll up. Patch a few that don't and add halal
  //    parentage). ───────────────────────────────────────────────────────
  'en:alcohol': ['en:alcohol-source'],
  'en:ethanol': ['en:alcohol-source'],
  'en:wine': ['en:alcohol-source'],
  'en:beer': ['en:alcohol-source'],
  'en:cider': ['en:alcohol-source'],
  'en:rum': ['en:alcohol-source'],
  'en:vodka': ['en:alcohol-source'],
  'en:gin': ['en:alcohol-source'],
  'en:whisky': ['en:alcohol-source'],
  'en:whiskey': ['en:alcohol-source'],
  'en:bourbon': ['en:alcohol-source'],
  'en:brandy': ['en:alcohol-source'],
  'en:cognac': ['en:alcohol-source'],
  'en:liqueur': ['en:alcohol-source'],
  'en:champagne': ['en:alcohol-source'],
  'en:port': ['en:alcohol-source'],
  'en:sherry': ['en:alcohol-source'],
  'en:sake': ['en:alcohol-source'],
  'en:tequila': ['en:alcohol-source'],
  'en:cooking-wine': ['en:alcohol-source'],
  'en:red-wine': ['en:alcohol-source'],
  'en:white-wine': ['en:alcohol-source'],
  'en:lager': ['en:alcohol-source'],
  'en:ale': ['en:alcohol-source'],
  'en:stout': ['en:alcohol-source'],
  'en:malt-liquor': ['en:alcohol-source'],

  // ── Southampton Six + broader artificial-colour (ADHD, autism,
  //    childFriendly, eczema, cleanEating, fibromyalgia) ─────────────────
  'en:e102': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:tartrazine': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:e110': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:sunset-yellow': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:e122': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:carmoisine': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:e124': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:ponceau-4r': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:e129': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:allura-red': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:e104': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:quinoline-yellow': ['en:southampton-six-colour', 'en:artificial-colour'],
  'en:e131': ['en:artificial-colour'],
  'en:patent-blue': ['en:artificial-colour'],
  'en:e132': ['en:artificial-colour'],
  'en:indigo-carmine': ['en:artificial-colour'],
  'en:e133': ['en:artificial-colour'],
  'en:brilliant-blue': ['en:artificial-colour'],
  'en:e120': ['en:artificial-colour', 'en:non-halal-additive'],
  'en:cochineal': ['en:artificial-colour', 'en:non-halal-additive'],
  'en:carmine': ['en:artificial-colour', 'en:non-halal-additive'],

  // ── Artificial preservatives (ADHD, autism, eczema, cleanEating) ──────
  'en:sodium-benzoate': ['en:artificial-preservative', 'en:sodium-source'],
  'en:e211': ['en:artificial-preservative'],
  'en:potassium-benzoate': ['en:artificial-preservative'],
  'en:e212': ['en:artificial-preservative'],
  'en:calcium-benzoate': ['en:artificial-preservative'],
  'en:e213': ['en:artificial-preservative'],
  // potassium-sorbate gets artificial-preservative + high-potassium —
  // see combined entry in high-potassium section below.
  'en:e202': ['en:artificial-preservative'],
  'en:bha': ['en:artificial-preservative'],
  'en:e320': ['en:artificial-preservative'],
  'en:bht': ['en:artificial-preservative'],
  'en:e321': ['en:artificial-preservative'],
  'en:tbhq': ['en:artificial-preservative'],
  'en:e319': ['en:artificial-preservative'],

  // ── Sulphites (UC, eczema, whole30) ─────────────────────────────────
  'en:sulphite': ['en:sulphite-preservative'],
  'en:sulfite': ['en:sulphite-preservative'],
  'en:sulphur-dioxide': ['en:sulphite-preservative'],
  'en:sulfur-dioxide': ['en:sulphite-preservative'],
  'en:e220': ['en:sulphite-preservative'],
  'en:e221': ['en:sulphite-preservative'],
  'en:e222': ['en:sulphite-preservative'],
  'en:e223': ['en:sulphite-preservative'],
  'en:e224': ['en:sulphite-preservative'],
  'en:e226': ['en:sulphite-preservative'],
  'en:e227': ['en:sulphite-preservative'],
  'en:e228': ['en:sulphite-preservative'],

  // ── High-purine (gout) ────────────────────────────────────────────
  'en:liver': ['en:high-purine', 'en:offal'],
  'en:kidney': ['en:high-purine', 'en:offal'],
  'en:offal': ['en:high-purine'],
  'en:pate': ['en:high-purine'],
  'en:foie-gras': ['en:high-purine'],
  'en:yeast-extract': ['en:high-purine', 'en:histamine-rich'],
  'en:brewers-yeast': ['en:high-purine'],
  'en:beef-extract': ['en:high-purine'],
  'en:meat-extract': ['en:high-purine'],
  'en:anchovy': ['en:high-purine'],
  'en:anchovies': ['en:high-purine'],
  'en:sardine': ['en:high-purine'],
  'en:sardines': ['en:high-purine'],
  'en:herring': ['en:high-purine'],
  'en:mackerel': ['en:high-purine'],
  'en:trout': ['en:high-purine'],

  // ── High-mercury fish (pregnancy, breastfeeding) ──────────────────
  'en:shark': ['en:high-mercury-fish', 'en:fish'],
  'en:swordfish': ['en:high-mercury-fish'],
  'en:marlin': ['en:high-mercury-fish', 'en:fish'],
  'en:king-mackerel': ['en:high-mercury-fish', 'en:fish'],
  'en:tilefish': ['en:high-mercury-fish', 'en:fish'],
  'en:bigeye-tuna': ['en:high-mercury-fish'],
  'en:yellowfin-tuna': ['en:high-mercury-fish'],

  // ── Raw / unpasteurised (pregnancy) ────────────────────────────────
  'en:raw-fish': ['en:raw-animal-product'],
  'en:sushi': ['en:raw-animal-product'],
  'en:sashimi': ['en:raw-animal-product'],
  'en:raw-egg': ['en:raw-animal-product'],
  'en:carpaccio': ['en:raw-animal-product'],
  'en:steak-tartare': ['en:raw-animal-product'],
  'en:beef-tartare': ['en:raw-animal-product'],
  'en:raw-milk': ['en:raw-animal-product', 'en:unpasteurised-dairy'],
  'en:unpasteurised-milk': ['en:unpasteurised-dairy'],
  'en:unpasteurized-milk': ['en:unpasteurised-dairy'],
  'en:raw-cheese': ['en:unpasteurised-dairy'],
  'en:brie': ['en:unpasteurised-dairy'],
  'en:camembert': ['en:unpasteurised-dairy'],
  'en:roquefort': ['en:unpasteurised-dairy'],
  'en:gorgonzola': ['en:unpasteurised-dairy'],
  'en:danish-blue': ['en:unpasteurised-dairy'],
  'en:chevre': ['en:unpasteurised-dairy'],
  'en:goat-cheese': ['en:unpasteurised-dairy'],

  // ── Histamine-rich (migraine, eczema, leakyGut) ────────────────────
  'en:parmesan': ['en:histamine-rich', 'en:dairy', 'en:cheese'],
  'en:cheddar': ['en:histamine-rich'],
  'en:blue-cheese': ['en:histamine-rich'],
  'en:stilton': ['en:histamine-rich'],
  'en:sauerkraut': ['en:histamine-rich'],
  'en:kimchi': ['en:histamine-rich'],
  'en:miso': ['en:histamine-rich', 'en:soy-derivative'],

  // ── High-potassium (CKD) ──────────────────────────────────────────
  'en:banana': ['en:high-potassium'],
  'en:dried-fruit': ['en:high-potassium'],
  'en:prune': ['en:high-potassium'],
  'en:prunes': ['en:high-potassium'],
  'en:raisin': ['en:high-potassium'],
  'en:raisins': ['en:high-potassium'],
  // tomato-paste / tomato-puree get high-potassium + nightshade — see
  // nightshade section below for combined entry.
  // potassium-chloride: CKD wants to AVOID it (high K), but hypertension
  // it's a salt substitute (LOW Na). Conflicting. Tag as high-potassium
  // only — hypertension's sodium-source ancestor walk won't catch it.
  'en:potassium-chloride': ['en:high-potassium'],
  'en:potassium-sorbate': ['en:high-potassium', 'en:artificial-preservative'],
  'en:potassium-citrate': ['en:high-potassium'],

  // ── High-phosphorus (CKD) ─────────────────────────────────────────
  'en:phosphoric-acid': ['en:high-phosphorus'],
  'en:sodium-phosphate': ['en:high-phosphorus', 'en:sodium-source'],
  'en:disodium-phosphate': ['en:high-phosphorus', 'en:sodium-source'],
  'en:calcium-phosphate': ['en:high-phosphorus'],
  'en:dicalcium-phosphate': ['en:high-phosphorus'],
  'en:trisodium-phosphate': ['en:high-phosphorus', 'en:sodium-source'],
  'en:sodium-tripolyphosphate': ['en:high-phosphorus', 'en:sodium-source'],

  // ── Emulsifiers (leakyGut, cleanEating) ───────────────────────────
  'en:polysorbate-80': ['en:emulsifier'],
  'en:e433': ['en:emulsifier'],
  'en:carboxymethylcellulose': ['en:emulsifier'],
  'en:e466': ['en:emulsifier'],
  'en:carrageenan': ['en:emulsifier'],
  'en:e407': ['en:emulsifier'],
  // Mono- and diglycerides — also non-halal concern (animal-derived)
  'en:e471': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e472': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e472a': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e472b': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e472c': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e472e': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e473': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e474': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e475': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e476': ['en:emulsifier'],
  'en:e477': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e478': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e481': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e482': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e483': ['en:emulsifier', 'en:non-halal-additive'],
  'en:e491': ['en:emulsifier'],
  'en:e492': ['en:emulsifier'],
  'en:e493': ['en:emulsifier'],
  'en:e494': ['en:emulsifier'],
  'en:e495': ['en:emulsifier'],

  // ── Halal-relevant additives that aren't emulsifiers ──────────────
  'en:e441': ['en:non-halal-additive'], // gelatine
  'en:e542': ['en:non-halal-additive'], // bone phosphate
  'en:e904': ['en:non-halal-additive'], // shellac
  'en:shellac': ['en:non-halal-additive'],
  'en:gelatin': ['en:non-halal-additive', 'en:animal-derivative'],
  'en:gelatine': ['en:non-halal-additive', 'en:animal-derivative'],
  'en:gelatin-powder': ['en:non-halal-additive', 'en:animal-derivative'],
  'en:l-cysteine': ['en:non-halal-additive'],
  'en:rennet': ['en:non-halal-additive'],
  'en:animal-rennet': ['en:non-halal-additive'],

  // ── Animal fats (heartDisease, highCholesterol, noGallbladder, halal) ─
  'en:tallow': ['en:animal-fat', 'en:non-halal-additive'],
  'en:suet': ['en:animal-fat', 'en:non-halal-additive'],
  'en:dripping': ['en:animal-fat', 'en:non-halal-additive'],
  'en:beef-fat': ['en:animal-fat'],
  'en:duck-fat': ['en:animal-fat'],
  'en:goose-fat': ['en:animal-fat'],
  'en:animal-fat': [], // already a virtual cat — leave as root

  // ── Nightshades (lupus, RA aggressive; gerd via tomato) ───────────
  'en:tomato': ['en:nightshade'],
  'en:tomato-paste': ['en:nightshade', 'en:high-potassium'],
  'en:tomato-puree': ['en:nightshade', 'en:high-potassium'],
  'en:tomato-sauce': ['en:nightshade'],
  'en:tomato-powder': ['en:nightshade'],
  'en:potato': ['en:nightshade'],
  'en:potatoes': ['en:nightshade'],
  'en:aubergine': ['en:nightshade'],
  'en:eggplant': ['en:nightshade'],
  'en:bell-pepper': ['en:nightshade'],
  'en:pepper': ['en:nightshade'],
  'en:chilli': ['en:nightshade', 'en:spicy-food'],
  'en:cayenne': ['en:nightshade', 'en:spicy-food'],
  'en:jalapeno': ['en:nightshade', 'en:spicy-food'],
  'en:paprika': ['en:nightshade'],

  // ── Cruciferous / goitrogens (hashimotos, hypothyroidism) ─────────
  // en:broccoli, en:cauliflower, en:kale already roll up to en:brassica
  // via OFF. We tag soy and millet as additional goitrogens.
  'en:soy': ['en:goitrogen', 'en:soy-derivative'],
  'en:soya': ['en:goitrogen', 'en:soy-derivative'],
  'en:soy-protein': ['en:goitrogen', 'en:soy-derivative'],
  'en:soya-protein': ['en:goitrogen', 'en:soy-derivative'],
  'en:soy-flour': ['en:goitrogen', 'en:soy-derivative'],
  'en:soya-flour': ['en:goitrogen', 'en:soy-derivative'],
  'en:soy-isoflavone': ['en:goitrogen', 'en:soy-derivative'],
  'en:tempeh': ['en:soy-derivative'],
  'en:soya-bean-oil': ['en:soy-derivative', 'en:omega-6-oil'],
  'en:soybean-oil': ['en:soy-derivative', 'en:omega-6-oil'],
  'en:millet': ['en:goitrogen'],

  // ── Omega-6 oils (RA) ─────────────────────────────────────────────
  'en:sunflower-oil': ['en:omega-6-oil'],
  'en:corn-oil': ['en:omega-6-oil'],
  'en:safflower-oil': ['en:omega-6-oil'],
  'en:cottonseed-oil': ['en:omega-6-oil'],
  'en:grapeseed-oil': ['en:omega-6-oil'],

  // ── Egg / animal products (plantBased) ────────────────────────────
  'en:egg': ['en:egg-product', 'en:animal-derivative'],
  'en:eggs': ['en:egg-product', 'en:animal-derivative'],
  'en:egg-white': ['en:egg-product', 'en:animal-derivative'],
  'en:egg-yolk': ['en:egg-product', 'en:animal-derivative'],
  'en:albumin': ['en:egg-product', 'en:animal-derivative'],
  'en:honey-as-animal-product': [], // virtual, no real OFF id
  'en:honey': ['en:added-sugar', 'en:animal-derivative'], // augment existing
  'en:beeswax': ['en:animal-derivative'],

  // ── Fish (plantBased) ─────────────────────────────────────────────
  // en:fish already exists in OFF as parent of salmon/tuna/etc.
  // Pin a few stragglers:
  'en:fish-sauce': ['en:fish', 'en:sodium-source'],
  'en:oyster-sauce': ['en:sodium-source'],
  'en:shrimp': ['en:seafood', 'en:animal-derivative'],
  'en:prawn': ['en:seafood', 'en:animal-derivative'],
  'en:lobster': ['en:seafood', 'en:animal-derivative'],
  'en:crab': ['en:seafood', 'en:animal-derivative'],

  // ── Citrus / chocolate / mint / allium (GERD triggers) ────────────
  'en:citric-acid': ['en:citrus-derivative'],
  'en:lemon-juice': ['en:citrus-derivative'],
  'en:lime-juice': ['en:citrus-derivative'],
  'en:orange-juice': ['en:citrus-derivative'],
  'en:peppermint': ['en:mint-source'],
  'en:peppermint-oil': ['en:mint-source'],
  'en:mint': ['en:mint-source'],
  'en:spearmint': ['en:mint-source'],

  // ── Carbonated drinks (GERD, postBariatric) ───────────────────────
  'en:carbonated-water': ['en:carbonated-drink-source'],
  'en:sparkling-water': ['en:carbonated-drink-source'],
};
