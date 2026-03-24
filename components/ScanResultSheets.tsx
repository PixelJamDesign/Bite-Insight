// ── Bottom sheets for Scan Result screen ─────────────────────────────────────
// Extracted from app/scan-result.tsx for file size reduction.

import { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { BottomSheet } from '@/components/BottomSheet';
import { TickIcon } from '@/components/MenuIcons';
import { getSubstitutes, type FlagReason } from '@/lib/ingredientSubstitutes';
import { HEALTH_CONDITION_INGREDIENTS, DIETARY_PREFERENCE_INGREDIENTS } from '@/constants/healthIngredientFlags';

// ── Types (mirrored from scan-result.tsx) ────────────────────────────────────
export type OffIngredient = {
  id?: string;
  text: string;
  vegan?: string;
  vegetarian?: string;
  percent_estimate?: number;
  percent?: number;
  ingredients?: OffIngredient[];
  depth?: number;
};

export type FlaggedIngredient = OffIngredient & {
  flagReason: FlagReason;
  personalReason?: { category: string; text: string };
  matchSource?: 'ingredient' | 'product-name' | 'category';
  matchedFlagName?: string;  // the user-flagged name that triggered this match
  healthConditionKey?: string;  // which health condition / dietary pref triggered this flag
  additiveSeverity?: { severity: 'high' | 'moderate' | 'low'; conditions: string[]; reason: string; group?: string };
};

type ImpactKey = 'low' | 'moderate' | 'high' | 'veryHigh';
type ImpactResult = { label: string; color: string; iconKey: ImpactKey };

type InsightKey =
  | 'glycemic' | 'sodium' | 'saturatedFat' | 'sugar' | 'fiber'
  | 'protein' | 'calorie' | 'inflammatoryFat' | 'digestiveLoad'
  | 'carbLoad' | 'additives';

export type InsightDef = {
  key: InsightKey;
  label: string;
  iconWidth: number;
  iconHeight: number;
  relevantTo: string[];
  compute: (data: any) => ImpactResult | null;
  icons: Record<ImpactKey, React.FC<{ width?: number; height?: number }>>;
};

// ── Design tokens ────────────────────────────────────────────────────────────
const Extra = {
  positiveGreen: '#009a1f',
  poorOrange: '#ff8736',
};

// ── Common food additive / ingredient descriptions ──────────────────────────
const ADDITIVE_DESCRIPTIONS: Record<string, { what: string; why: string }> = {
  'en:e322': { what: 'Lecithin, a natural emulsifier usually derived from soy or sunflower seeds.', why: 'It helps blend ingredients that normally don\'t mix (like oil and water). Widely used and considered safe.' },
  'en:e322i': { what: 'Lecithin, a natural emulsifier usually derived from soy or sunflower seeds.', why: 'It helps blend ingredients that normally don\'t mix (like oil and water). Widely used and considered safe.' },
  'en:e330': { what: 'Citric acid, a natural acid found in citrus fruits like lemons and oranges.', why: 'Used as a preservative and flavour enhancer. It occurs naturally in many foods and is considered safe.' },
  'en:e331': { what: 'Sodium citrate, the sodium salt of citric acid.', why: 'Used as a flavour enhancer and acidity regulator. Found naturally in citrus fruits and considered safe.' },
  'en:e339': { what: 'Sodium phosphate, a mineral salt used in food processing.', why: 'Acts as an emulsifier and moisture retainer. Safe in normal food amounts, though excessive phosphate intake should be monitored.' },
  'en:e412': { what: 'Guar gum, a natural thickener extracted from guar beans.', why: 'Used to thicken and stabilise foods. It\'s a soluble fibre and generally well tolerated.' },
  'en:e414': { what: 'Gum arabic, a natural gum from acacia trees.', why: 'Used as a stabiliser and emulsifier. It\'s a natural plant-based ingredient and considered safe.' },
  'en:e415': { what: 'Xanthan gum, a thickener produced by bacterial fermentation.', why: 'Widely used in sauces, dressings and gluten-free baking. Considered safe and is a common kitchen ingredient.' },
  'en:e440': { what: 'Pectin, a natural gelling agent found in fruit.', why: 'Used to set jams and jellies. It\'s a natural plant fibre and perfectly safe.' },
  'en:e450': { what: 'Diphosphates, mineral salts used as raising agents.', why: 'Commonly found in baking powder. Safe in normal food amounts.' },
  'en:e460': { what: 'Cellulose, plant fibre, the main structural component of plant cell walls.', why: 'Used as a bulking agent and anti-caking agent. It\'s indigestible fibre and safe to consume.' },
  'en:e466': { what: 'Carboxymethyl cellulose, a modified plant fibre used as a thickener.', why: 'Used to improve texture in sauces and ice cream. Generally recognised as safe.' },
  'en:e471': { what: 'Mono- and diglycerides of fatty acids, emulsifiers derived from plant or animal fats.', why: 'Used to help ingredients mix smoothly. Very common in bread, ice cream and margarine.' },
  'en:e472e': { what: 'DATEM (diacetyl tartaric acid esters), an emulsifier used in baking.', why: 'Strengthens dough and improves bread texture. Considered safe.' },
  'en:e476': { what: 'Polyglycerol polyricinoleate (PGPR), an emulsifier made from castor oil and glycerol.', why: 'Used in chocolate to improve flow and reduce the amount of cocoa butter needed. Approved as safe by food authorities worldwide.' },
  'en:e500': { what: 'Sodium bicarbonate, also known as baking soda.', why: 'A common household ingredient used as a raising agent. Perfectly safe.' },
  'en:e501': { what: 'Potassium carbonate, a mineral salt used as a raising agent.', why: 'Similar to baking soda. Used in baking and considered safe.' },
  'en:e503': { what: 'Ammonium carbonate, a traditional raising agent.', why: 'Used in flat baked goods like cookies. Breaks down completely during baking.' },
  'en:e507': { what: 'Hydrochloric acid, a mineral acid used for pH adjustment.', why: 'Used in tiny amounts to regulate acidity. Naturally present in your stomach.' },
  'en:e509': { what: 'Calcium chloride, a mineral salt.', why: 'Used as a firming agent in canned vegetables and cheese-making. Considered safe.' },
  'en:e516': { what: 'Calcium sulphate, a mineral used in food processing.', why: 'Used in tofu-making and as a dough conditioner. A natural mineral and considered safe.' },
  'en:e551': { what: 'Silicon dioxide, a natural mineral (silica).', why: 'Used as an anti-caking agent to keep powders flowing freely. Found naturally in many foods.' },
  'en:e621': { what: 'Monosodium glutamate (MSG), a flavour enhancer.', why: 'Adds savoury/umami flavour. Glutamate occurs naturally in tomatoes, parmesan cheese and mushrooms. Generally considered safe, though some people report sensitivity.' },
  'en:e901': { what: 'Beeswax, a natural wax produced by honeybees.', why: 'Used as a glazing agent on sweets and fruit. Natural and safe (not suitable for vegans).' },
  'en:e903': { what: 'Carnauba wax, a natural plant wax from Brazilian palm leaves.', why: 'Used as a coating/glazing agent. Plant-based and considered safe.' },
  'en:e904': { what: 'Shellac, a natural resin secreted by lac insects.', why: 'Used as a glazing agent on sweets and pills. Considered safe (not suitable for vegans).' },
  'en:e950': { what: 'Acesulfame K, an artificial sweetener.', why: 'About 200x sweeter than sugar with zero calories. Approved by food safety authorities, though some prefer to avoid artificial sweeteners.' },
  'en:e951': { what: 'Aspartame, an artificial sweetener.', why: 'One of the most studied food additives. Approved as safe, though people with PKU (phenylketonuria) should avoid it.' },
  'en:e955': { what: 'Sucralose, an artificial sweetener made from sugar.', why: 'About 600x sweeter than sugar with zero calories. Widely approved as safe.' },
  'en:e960': { what: 'Steviol glycosides (Stevia), a natural sweetener from the stevia plant.', why: 'A plant-based, zero-calorie sweetener. Considered safe and a popular sugar alternative.' },
  'en:e965': { what: 'Maltitol, a sugar alcohol used as a sweetener.', why: 'Lower calorie than sugar with less impact on blood glucose. May cause digestive discomfort in large amounts.' },
  'polyglycerol polyricinoleate': { what: 'An emulsifier (also known as E476 or PGPR) made from castor oil and glycerol.', why: 'Used in chocolate to improve flow and reduce cocoa butter. Approved as safe worldwide.' },
  'soy lecithin': { what: 'A natural emulsifier extracted from soybeans.', why: 'One of the most common food additives. Helps blend oil and water. Safe unless you have a soy allergy.' },
  'soya lecithin': { what: 'A natural emulsifier extracted from soybeans.', why: 'One of the most common food additives. Helps blend oil and water. Safe unless you have a soy allergy.' },
  'sunflower lecithin': { what: 'A natural emulsifier extracted from sunflower seeds.', why: 'Allergen-friendly alternative to soy lecithin. Considered safe.' },
  'xanthan gum': { what: 'A thickener produced by bacterial fermentation of sugar.', why: 'Widely used in sauces, dressings and gluten-free baking. Considered safe.' },
  'guar gum': { what: 'A natural thickener extracted from guar beans.', why: 'Used to thicken and stabilise foods. It\'s a soluble fibre and generally well tolerated.' },
  'carrageenan': { what: 'A thickener and stabiliser extracted from red seaweed.', why: 'Used in dairy products and plant milks. Generally recognised as safe, though some studies suggest it may irritate sensitive guts.' },
  'maltodextrin': { what: 'A starch-derived carbohydrate used as a thickener or filler.', why: 'Has a high glycemic index but is used in small amounts. Considered safe as a food additive.' },
  'sodium benzoate': { what: 'A preservative, the sodium salt of benzoic acid, which occurs naturally in berries.', why: 'Prevents mould and bacterial growth. Safe at approved levels.' },
  'potassium sorbate': { what: 'A preservative, the potassium salt of sorbic acid.', why: 'Prevents mould and yeast growth. Widely used and considered safe.' },
  'calcium carbonate': { what: 'Chalk, a natural mineral and a source of calcium.', why: 'Used as a colour (white), acidity regulator and calcium supplement. Perfectly safe.' },
  'mono- and diglycerides of fatty acids': { what: 'Emulsifiers derived from plant or animal fats (also known as E471).', why: 'Used to help ingredients mix smoothly. Very common in processed foods and considered safe.' },
  'tbhq': { what: 'Tert-butylhydroquinone, a synthetic antioxidant.', why: 'Used in small amounts to prevent fats from going rancid. Approved as safe at regulated levels.' },
  'pgpr': { what: 'Polyglycerol polyricinoleate (E476), an emulsifier.', why: 'Used in chocolate to improve texture. Approved as safe worldwide.' },
  'ascorbic acid': { what: 'Vitamin C, an essential nutrient.', why: 'Used as an antioxidant and preservative. It\'s simply vitamin C and perfectly safe.' },
  'tocopherol': { what: 'Vitamin E, a natural antioxidant.', why: 'Used to prevent fats from going rancid. It\'s an essential vitamin and safe.' },
  'sodium bicarbonate': { what: 'Baking soda, a common raising agent.', why: 'Used in baking to help doughs rise. A household staple and perfectly safe.' },
  'citric acid': { what: 'A natural acid found in citrus fruits like lemons and oranges.', why: 'Used as a preservative and flavour enhancer. Occurs naturally in many foods and is safe.' },
  'malic acid': { what: 'A natural acid found in apples and other fruits.', why: 'Used as a flavour enhancer to add tartness. Natural and safe.' },
  'lactic acid': { what: 'A natural acid produced during fermentation.', why: 'Found in yoghurt, sauerkraut and sourdough. Natural and safe.' },
  'pectin': { what: 'A natural gelling agent found in fruit (especially apples and citrus peel).', why: 'Used to set jams and jellies. It\'s a natural plant fibre and perfectly safe.' },
  'inulin': { what: 'A natural prebiotic fibre found in chicory root.', why: 'Supports gut health by feeding beneficial bacteria. Generally safe, though large amounts can cause bloating.' },
};

function getAdditiveDescription(ing: OffIngredient): { what: string; why: string } | null {
  const id = (ing.id ?? '').toLowerCase();
  if (ADDITIVE_DESCRIPTIONS[id]) return ADDITIVE_DESCRIPTIONS[id];

  const name = ing.text.toLowerCase().trim();
  if (ADDITIVE_DESCRIPTIONS[name]) return ADDITIVE_DESCRIPTIONS[name];

  const eMatch = id.match(/^(en:e\d+)/);
  if (eMatch && ADDITIVE_DESCRIPTIONS[eMatch[1]]) return ADDITIVE_DESCRIPTIONS[eMatch[1]];

  return null;
}

// ── Insight explanation text ─────────────────────────────────────────────────
const INSIGHT_EXPLANATIONS: Record<string, string> = {
  glycemic:        'Glycemic impact estimates how quickly this product may raise blood sugar based on its sugar, carbohydrate and fibre content. This is especially relevant for managing diabetes, PCOS and metabolic conditions.',
  sodium:          'Sodium levels indicate the salt content of this product. High sodium intake is linked to elevated blood pressure and increased cardiovascular risk.',
  saturatedFat:    'Saturated fat content is associated with raised cholesterol and heart disease risk when consumed in excess.',
  sugar:           'Sugar load reflects the total sugar content per serving. High sugar intake can affect blood glucose control, energy levels and long-term metabolic health.',
  fiber:           'Fibre content matters for digestive conditions. While fibre is generally beneficial, high-fibre foods can aggravate symptoms in IBS, Crohn\'s disease and other gut conditions.',
  protein:         'Protein content is important for muscle repair, satiety and post-surgical recovery. Higher protein is generally preferred for fitness and weight management goals.',
  calorie:         'Calorie density measures the energy content per 100g. Monitoring calorie intake supports weight management and post-bariatric dietary goals.',
  inflammatoryFat: 'Inflammatory fat is a proxy based on saturated fat content, which can promote inflammation relevant to autoimmune and inflammatory conditions.',
  digestiveLoad:   'Digestive load combines fat and fibre content to estimate how demanding this product is on your digestive system. High values may trigger symptoms in GERD, IBS and other gut conditions.',
  carbLoad:        'Carb load reflects the total carbohydrate content. This is key for low-carb, keto and diabetic diets where carbohydrate restriction is central.',
  additives:       'This rating is based on the severity of additives found in this product, not just the count. High-risk additives include the Southampton Six artificial colours (linked to hyperactivity in children), sodium benzoate, and propionates. These are flagged based on your health profile.',
};

// ── Harmful ingredient descriptions (what it is and why it matters) ──────────
const HARMFUL_INGREDIENT_DESCRIPTIONS: Record<string, string> = {
  // Oils & fats
  'palm oil': 'A vegetable oil high in saturated fat, commonly used in processed foods for its stability and texture.',
  'palm kernel oil': 'An oil extracted from the kernel of the oil palm fruit. It is very high in saturated fat, even more so than regular palm oil.',
  'partially hydrogenated': 'An oil that has been chemically processed to become more solid. This process creates trans fats, which raise bad cholesterol and lower good cholesterol.',
  'hydrogenated fat': 'A fat that has been processed to make it more solid and shelf-stable. Often contains trans fats which are linked to heart disease.',
  'hydrogenated oil': 'An oil that has been chemically hardened. This process can create trans fats which are harmful to cardiovascular health.',
  'coconut oil': 'An oil extracted from coconut meat. While popular, it is very high in saturated fat.',
  'lard': 'Rendered pig fat, high in saturated fat. Used in baking and frying.',
  'tallow': 'Rendered beef or mutton fat, high in saturated fat.',
  'shortening': 'A solid fat used in baking, often made from hydrogenated vegetable oils.',
  // Sugars
  'sugar': 'Refined sucrose, typically from sugar cane or sugar beet. Provides quick energy but has no nutritional value beyond calories.',
  'high fructose corn syrup': 'A sweetener made from corn starch. It has been linked to obesity and metabolic issues when consumed in excess.',
  'glucose syrup': 'A concentrated sugar solution made from starch. It has a very high glycemic index and can spike blood sugar rapidly.',
  'glucose-fructose syrup': 'A blend of glucose and fructose sugars derived from starch. Similar to high fructose corn syrup.',
  'dextrose': 'A simple sugar (glucose) derived from corn. It has a very high glycemic index.',
  'maltodextrin': 'A processed starch with a very high glycemic index, often used as a thickener or filler in processed foods.',
  'invert sugar': 'A liquid sweetener made by splitting sucrose into glucose and fructose. Commonly used in confectionery.',
  'caramel': 'Heated sugar used for colour and flavour. Some forms (caramel colour E150) may contain processing byproducts.',
  // Sodium
  'salt': 'Sodium chloride, essential in small amounts but excess intake is linked to high blood pressure and cardiovascular risk.',
  'sodium': 'A mineral found naturally in foods and added as salt. High intake is associated with elevated blood pressure.',
  'monosodium glutamate': 'A flavour enhancer (MSG) that adds umami/savoury taste. Some people report sensitivity, and it contributes to sodium intake.',
  // Starches
  'white flour': 'Refined wheat flour with the bran and germ removed. It has a high glycemic index and less fibre than wholegrain alternatives.',
  'modified starch': 'Starch that has been chemically or physically altered to change its properties. Often high glycemic.',
  'cornstarch': 'A refined starch from corn. Very high glycemic index with minimal nutritional value.',
  // Meat
  'bacon': 'Cured pork, classified as processed meat by the WHO. Regular consumption is linked to increased risk of colorectal cancer.',
  'ham': 'Cured or processed pork. As a processed meat, it is associated with increased cancer risk when consumed regularly.',
  'sausage': 'Processed meat typically containing preservatives like nitrates. Linked to increased cancer risk with regular consumption.',
  'salami': 'A cured, fermented meat product. High in saturated fat, sodium, and nitrates.',
  // Common allergens / flagged items
  'peanut': 'A legume (not a true nut) that is one of the most common causes of severe allergic reactions.',
  'hazelnut': 'A tree nut commonly used in chocolate and spreads. A common allergen with cross-reactivity to other tree nuts and pollen.',
  'almond': 'A tree nut rich in healthy fats and protein, but a common allergen.',
  'cashew': 'A tree nut that can cause severe allergic reactions. Cross-reactivity with pistachio is common.',
  'walnut': 'A tree nut that is a common allergen. Cross-reactivity with pecan is well documented.',
  'milk': 'Contains lactose (milk sugar) and casein/whey proteins. Common trigger for lactose intolerance and milk allergy.',
  'milk powder': 'Dehydrated milk that retains all the proteins and lactose of liquid milk.',
  'skimmed milk powder': 'Dried milk with fat removed. Still contains lactose and milk proteins.',
  'whey': 'A milk protein found in dairy products. Contains lactose and can trigger milk allergy symptoms.',
  'casein': 'The main protein in milk. A common allergen even in small amounts.',
  'butter': 'A dairy product made from churned cream. Contains milk proteins and lactose.',
  'cream': 'The high-fat portion of milk. Contains lactose and milk proteins.',
  'cheese': 'A dairy product that retains casein and may contain lactose depending on aging.',
  'egg': 'A common allergen. Both egg white and egg yolk proteins can trigger reactions.',
  'gluten': 'A protein found in wheat, barley, and rye. Triggers an immune response in people with coeliac disease.',
  'wheat': 'A cereal grain containing gluten. One of the most common food allergens.',
  'soy': 'A legume and common allergen. Found in many processed foods as oil, lecithin, or protein.',
  'soya': 'Another name for soy. Common in processed foods and can trigger allergic reactions.',
  'shellfish': 'Includes crustaceans and molluscs. A common cause of food allergy, sometimes severe.',
  'sesame': 'A seed increasingly recognised as a major allergen. Found in bread, hummus, and Asian cuisine.',
  'celery': 'A vegetable that is a recognised allergen in the EU. Can cause severe reactions in sensitive individuals.',
  'mustard': 'A condiment and spice that is a recognised allergen. Can be hidden in sauces and dressings.',
  'lupin': 'A legume used in gluten-free baking. Cross-reactivity with peanut allergy is common.',
  // Additives
  'sodium nitrite': 'A preservative (E250) used in processed meats. Linked to formation of nitrosamines, which are associated with cancer risk.',
  'sodium nitrate': 'A preservative (E251) that converts to nitrite in the body. Used in cured meats.',
  'aspartame': 'An artificial sweetener (E951). Generally recognised as safe, though people with PKU should avoid it.',
  'acesulfame k': 'An artificial sweetener (E950). Some studies raise questions about long-term consumption.',
};

/** Find the description for an ingredient by checking text and id. */
function getHarmfulDescription(text: string, id?: string): string | null {
  const t = text.toLowerCase().trim();
  if (HARMFUL_INGREDIENT_DESCRIPTIONS[t]) return HARMFUL_INGREDIENT_DESCRIPTIONS[t];
  // Check if any key is contained in the text
  for (const [key, desc] of Object.entries(HARMFUL_INGREDIENT_DESCRIPTIONS)) {
    if (t === key || t.includes(key)) return desc;
  }
  // Check additive descriptions too
  if (id) {
    const addDesc = getAdditiveDescription({ text, id } as OffIngredient);
    if (addDesc) return `${addDesc.what} ${addDesc.why}`;
  }
  return null;
}

/**
 * Find ALL profile conditions, allergies and dietary preferences that
 * match a given ingredient. Returns an array of display-ready labels.
 */
function findAllMatchingProfileTags(
  ingredientText: string,
  ingredientId: string | undefined,
  conditions: string[],
  allergies: string[],
  dietaryPreferences: string[],
  tpo: (key: string, opts?: any) => string,
): string[] {
  const tags: string[] = [];
  const ingText = ingredientText.toLowerCase().trim();
  const ingId = ingredientId?.toLowerCase() ?? '';

  // Check health conditions
  for (const key of conditions) {
    const entry = HEALTH_CONDITION_INGREDIENTS[key];
    if (!entry) continue;
    const matched = entry.keywords.some((kw) => {
      if (kw.includes(' ')) return ingText.includes(kw);
      return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(ingText);
    }) || entry.ingredientIds.some((id) => ingId === id || ingId.includes(id));
    if (matched) {
      const label = tpo(`healthConditions.${key}`, { defaultValue: key });
      if (!tags.includes(label)) tags.push(label);
    }
  }

  // Check allergies
  for (const key of allergies) {
    const label = tpo(`allergies.${key}`, { defaultValue: key });
    // Simple check: does the ingredient name relate to this allergy?
    // The ingredient is already flagged, so if its healthConditionKey exists we trust it
    if (!tags.includes(label)) {
      // Check via allergen derivative map keywords
      const allergyKeywords: Record<string, string[]> = {
        peanut: ['peanut', 'groundnut', 'arachis', 'monkey nut'],
        treeNut: ['hazelnut', 'almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'macadamia', 'brazil nut', 'chestnut', 'pine nut', 'coconut', 'praline', 'gianduja', 'marzipan', 'frangipane', 'filbert', 'tree nut', 'mixed nuts', 'nut'],
        egg: ['egg', 'albumin', 'albumen', 'lysozyme', 'ovomucin', 'ovalbumin', 'meringue', 'mayonnaise'],
        lactose: ['milk', 'lactose', 'dairy', 'whey', 'casein', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'curd'],
        gluten: ['gluten', 'wheat', 'barley', 'rye', 'oat', 'spelt', 'kamut', 'semolina', 'couscous', 'bulgur', 'seitan'],
        soy: ['soy', 'soya', 'soybean', 'tofu', 'tempeh', 'edamame', 'miso', 'natto'],
        fish: ['fish', 'anchovy', 'cod', 'salmon', 'tuna', 'sardine', 'mackerel', 'haddock', 'herring', 'surimi'],
        shellfish: ['shellfish', 'shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'oyster', 'scallop', 'squid', 'clam'],
        sesame: ['sesame', 'tahini', 'halvah', 'halva'],
        celery: ['celery', 'celeriac'],
        mustard: ['mustard'],
        lupin: ['lupin', 'lupine'],
        sulphite: ['sulphite', 'sulfite', 'sulphur dioxide', 'e220', 'e221', 'e222', 'e223', 'e224', 'e225', 'e226', 'e227', 'e228'],
        histamine: ['histamine'],
        salicylate: ['salicylate'],
        msg: ['msg', 'monosodium glutamate', 'e621'],
        fructose: ['fructose'],
      };
      const kws = allergyKeywords[key];
      if (kws?.some((kw) => ingText.includes(kw))) {
        tags.push(label);
      }
    }
  }

  // Check dietary preferences
  for (const key of dietaryPreferences) {
    const entry = DIETARY_PREFERENCE_INGREDIENTS[key];
    if (!entry) continue;
    const matched = entry.keywords.some((kw) => {
      if (kw.includes(' ')) return ingText.includes(kw);
      return new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(ingText);
    }) || entry.ingredientIds.some((id) => ingId === id || ingId.includes(id));
    if (matched) {
      const label = tpo(`dietaryPreferences.${key}`, { defaultValue: key });
      if (!tags.includes(label)) tags.push(label);
    }
  }

  // For vegan / vegetarian flag reasons, add those as tags
  return tags;
}

// ─── 1) Flagged Ingredient Sheet ─────────────────────────────────────────────
export function FlaggedIngredientSheet({
  ingredient,
  onClose,
  conditions,
  allergies,
  dietaryPreferences,
}: {
  ingredient: FlaggedIngredient | null;
  onClose: () => void;
  conditions: string[];
  allergies: string[];
  dietaryPreferences?: string[];
}) {
  const { t } = useTranslation('scan');
  const { t: tpo } = useTranslation('profileOptions');
  const lastIngRef = useRef<FlaggedIngredient | null>(null);
  if (ingredient) lastIngRef.current = ingredient;
  const display = ingredient ?? lastIngRef.current;

  // Build condition-specific body text for health_condition flags
  const healthConditionBody = (() => {
    if (!display?.healthConditionKey) return t('flagReason.healthConditionBody', 'This ingredient may be harmful based on your health conditions or dietary preferences.');
    const key = display.healthConditionKey;
    // Try health conditions first, then dietary preferences
    const label = tpo(`healthConditions.${key}`, '') || tpo(`dietaryPreferences.${key}`, '') || key;
    return t('flagReason.healthConditionBodySpecific', {
      defaultValue: `This ingredient may be harmful for people with {{condition}}.`,
      condition: label,
    });
  })();

  const FLAG_REASON_TEXT_LOCAL: Record<FlagReason, { title: string; body: string }> = {
    vegan: { title: t('flagReason.veganTitle'), body: t('flagReason.veganBody') },
    vegetarian: { title: t('flagReason.vegetarianTitle'), body: t('flagReason.vegetarianBody') },
    user_flagged: { title: t('flagReason.userFlaggedTitle'), body: t('flagReason.userFlaggedBody') },
    additive_concern: { title: t('flagReason.additiveConcernTitle', 'Additive of Concern'), body: '' },
    health_condition: { title: t('flagReason.healthConditionTitle', 'Flagged for Your Health'), body: healthConditionBody },
  };

  const reason = display?.additiveSeverity
    ? {
        title: display.additiveSeverity.group ?? t('flagReason.additiveConcernTitle', 'Additive of Concern'),
        body: display.additiveSeverity.reason,
      }
    : display?.personalReason
    ? {
        title: display.personalReason.text,
        body: t('flagReason.personalBody', { category: display.personalReason.category }),
      }
    : display ? FLAG_REASON_TEXT_LOCAL[display.flagReason as FlagReason] : { title: '', body: '' };
  const substitutes = display
    ? getSubstitutes(display.text, display.flagReason as FlagReason, conditions, allergies)
    : [];

  // Get ingredient description
  const description = display ? getHarmfulDescription(display.text, display.id) : null;

  // Find ALL matching profile tags for this ingredient
  const profileTags = display
    ? findAllMatchingProfileTags(
        display.text,
        display.id,
        conditions,
        allergies,
        dietaryPreferences ?? [],
        tpo,
      )
    : [];

  // Add vegan/vegetarian as a tag if that's the flag reason
  if (display?.flagReason === 'vegan') {
    const veganLabel = tpo('dietaryTags.vegan', { defaultValue: 'Vegan' });
    if (!profileTags.includes(veganLabel)) profileTags.unshift(veganLabel);
  }
  if (display?.flagReason === 'vegetarian') {
    const vegLabel = tpo('dietaryTags.vegetarian', { defaultValue: 'Vegetarian' });
    if (!profileTags.includes(vegLabel)) profileTags.unshift(vegLabel);
  }

  return (
    <BottomSheet visible={!!ingredient} onClose={onClose}>
      {display && (
        <>
          <View style={localStyles.iconCircle}>
            <Ionicons name="warning" size={24} color={Colors.status.negative} />
          </View>
          <Text style={localStyles.ingredientName}>
            {display.text.charAt(0).toUpperCase() + display.text.slice(1)}
          </Text>

          {/* Ingredient description */}
          {description && (
            <Text style={localStyles.ingredientDescription}>{description}</Text>
          )}

          {/* Unsuitable for: condition/allergy/diet tags */}
          {profileTags.length > 0 && (
            <View style={localStyles.unsuitableSection}>
              <Text style={localStyles.unsuitableLabel}>
                {t('flaggedSheet.unsuitableFor', { defaultValue: 'Unsuitable for:' })}
              </Text>
              <View style={localStyles.tagRow}>
                {profileTags.map((tag) => (
                  <View key={tag} style={localStyles.conditionTag}>
                    <Text style={localStyles.conditionTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {substitutes.length > 0 && (
            <View style={localStyles.substituteCard}>
              <Text style={localStyles.substituteTitle}>
                {t('flaggedSheet.substitutesTitle')}
              </Text>
              <View style={localStyles.substituteList}>
                {substitutes.map((sub) => (
                  <View key={sub} style={localStyles.substituteRow}>
                    <View style={localStyles.substituteIconWrap}>
                      <TickIcon size={14} color={Colors.secondary} strokeWidth={2} />
                    </View>
                    <Text style={localStyles.substituteText}>{sub}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </BottomSheet>
  );
}

// ─── 2) Ingredient Info Sheet ────────────────────────────────────────────────
export function IngredientInfoSheet({
  ingredient,
  category,
  onClose,
}: {
  ingredient: OffIngredient | null;
  category: 'ok' | 'safe';
  onClose: () => void;
}) {
  const { t } = useTranslation('scan');
  const lastRef = useRef<OffIngredient | null>(null);
  if (ingredient) lastRef.current = ingredient;
  const display = ingredient ?? lastRef.current;

  const desc = display ? getAdditiveDescription(display) : null;
  const iconColor = category === 'ok' ? Extra.poorOrange : Extra.positiveGreen;
  const iconName = category === 'ok' ? 'alert-circle' : 'checkmark-circle';
  const categoryLabel = category === 'ok' ? t('ingredientSheet.categoryOk') : t('ingredientSheet.categorySafe');

  return (
    <BottomSheet visible={!!ingredient} onClose={onClose}>
      {display && (
        <>
          <View style={[localStyles.iconCircle, { backgroundColor: `${iconColor}18` }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          <Text style={localStyles.ingredientName}>
            {display.text.charAt(0).toUpperCase() + display.text.slice(1)}
          </Text>
          <View style={localStyles.descriptionBox}>
            <Text style={localStyles.reasonTitle}>
              {t('ingredientSheet.classifiedAs', { category: categoryLabel })}
            </Text>
            {desc ? (
              <>
                <Text style={localStyles.reasonBody}>{desc.what}</Text>
                <Text style={localStyles.reasonBody}>{desc.why}</Text>
              </>
            ) : (
              <>
                <Text style={localStyles.reasonBody}>
                  {t('ingredientSheet.defaultAdditiveLine1')}
                </Text>
                <Text style={localStyles.reasonBody}>
                  {t('ingredientSheet.defaultAdditiveLine2')}
                </Text>
              </>
            )}
          </View>
        </>
      )}
    </BottomSheet>
  );
}

// ─── 3) Insight Detail Sheet ─────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  high: '#ff3f42',
  moderate: '#ff8736',
  low: '#ffc72d',
};

const SEVERITY_ICONS: Record<string, string> = {
  high: 'close-circle',
  moderate: 'alert-circle',
  low: 'information-circle',
};

export function InsightDetailSheet({
  insight,
  onClose,
  flaggedAdditives,
}: {
  insight: { def: InsightDef; result: ImpactResult } | null;
  onClose: () => void;
  flaggedAdditives?: FlaggedIngredient[];
}) {
  const { t } = useTranslation('scan');
  const lastRef = useRef<{ def: InsightDef; result: ImpactResult } | null>(null);
  if (insight) lastRef.current = insight;
  const display = insight ?? lastRef.current;

  if (!display) return <BottomSheet visible={false} onClose={onClose}><View /></BottomSheet>;

  const { def, result } = display;
  const Icon = def.icons[result.iconKey];
  const explanation = t(`insightExplanation.${def.key}`, INSIGHT_EXPLANATIONS[def.key] ?? '');

  // For additives insight, show the list of problematic additives
  const isAdditives = def.key === 'additives';
  const additiveList = isAdditives ? (flaggedAdditives ?? []) : [];

  return (
    <BottomSheet visible={!!insight} onClose={onClose}>
      <Icon width={def.iconWidth * 1.4} height={def.iconHeight * 1.4} />
      <Text style={insightStyles.label}>{def.label}</Text>
      <View style={[insightStyles.pill, { backgroundColor: result.color }]}>
        <Text style={insightStyles.pillText}>{result.label}</Text>
      </View>
      <View style={localStyles.descriptionBox}>
        <Text style={insightStyles.explanation}>{explanation}</Text>
      </View>

      {/* Additive list — only shown for the additives insight card */}
      {additiveList.length > 0 && (
        <View style={additiveStyles.listCard}>
          <Text style={additiveStyles.listTitle}>
            Additives found in this product
          </Text>
          <View style={additiveStyles.list}>
            {additiveList.map((ing, i) => {
              const sev = ing.additiveSeverity?.severity ?? 'low';
              const color = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS.low;
              const iconName = SEVERITY_ICONS[sev] ?? SEVERITY_ICONS.low;
              const name = ing.text.charAt(0).toUpperCase() + ing.text.slice(1);
              const reason = ing.additiveSeverity?.reason;
              return (
                <View key={`${ing.id ?? ing.text}-${i}`} style={additiveStyles.row}>
                  <Ionicons name={iconName as any} size={20} color={color} />
                  <View style={additiveStyles.rowText}>
                    <Text style={additiveStyles.rowName}>{name}</Text>
                    {reason ? <Text style={additiveStyles.rowReason}>{reason}</Text> : null}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const localStyles = StyleSheet.create({
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,63,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  ingredientDescription: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  unsuitableSection: {
    width: '100%',
    gap: 8,
  },
  unsuitableLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionTag: {
    backgroundColor: Colors.surface.contrast,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  conditionTagText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.26,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    textAlign: 'center',
  },
  descriptionBox: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 24,
    width: '100%',
    gap: 8,
    alignItems: 'center',
  },
  reasonBody: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 22,
    textAlign: 'center',
  },
  substituteCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingVertical: 24,
    paddingHorizontal: 16,
    gap: 16,
  },
  substituteTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  substituteList: {
    gap: 2,
  },
  substituteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  substituteIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  substituteText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#00342c',
    letterSpacing: -0.26,
    lineHeight: 16,
  },
});

const additiveStyles = StyleSheet.create({
  listCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.3,
  },
  rowReason: {
    fontSize: 13,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    lineHeight: 18,
    letterSpacing: -0.26,
  },
});

const insightStyles = StyleSheet.create({
  label: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
  explanation: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 22,
    textAlign: 'center',
  },
});
