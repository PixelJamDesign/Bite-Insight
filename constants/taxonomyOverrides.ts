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
  // Saturated-fat-heavy animal fats
  'en:lard': ['en:animal-fat'],
  'en:tallow': ['en:animal-fat'],
  'en:beef-fat': ['en:animal-fat'],
  'en:suet': ['en:animal-fat'],
  'en:dripping': ['en:animal-fat'],

  // ── Sodium sources (hypertension, heartDisease) ───────────────────────
  'en:monosodium-glutamate': ['en:sodium-source'],
  'en:msg': ['en:sodium-source'],
  'en:e621': ['en:sodium-source'],
  'en:sodium-bicarbonate': ['en:sodium-source'],
  'en:sodium-nitrate': ['en:sodium-source'],
  'en:sodium-nitrite': ['en:sodium-source'],
  'en:sodium-benzoate': ['en:sodium-source'],
  'en:sodium-phosphate': ['en:sodium-source'],
  'en:disodium-phosphate': ['en:sodium-source'],
  'en:sodium-citrate': ['en:sodium-source'],
  'en:sodium-lactate': ['en:sodium-source'],
  'en:sodium-acetate': ['en:sodium-source'],
  'en:salt': ['en:sodium-source'],
  'en:fish-sauce': ['en:sodium-source'],
  'en:soy-sauce': ['en:sodium-source'],
  'en:oyster-sauce': ['en:sodium-source'],
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
  'en:soy-protein': ['en:soy-derivative'],
  'en:soya-protein': ['en:soy-derivative'],
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
};
