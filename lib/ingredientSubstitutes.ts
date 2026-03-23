// ── Substitute ingredient mapping ────────────────────────────────────────────
// Covers dietary preferences, allergens, and health conditions.
// getSubstitutes checks the ingredient against ALL maps relevant to the
// active profile and returns the first match.

export type FlagReason = 'vegan' | 'vegetarian' | 'user_flagged' | 'additive_concern' | 'health_condition';

export const DIETARY_SUBSTITUTES: Record<string, Record<string, string[]>> = {
  vegan: {
    milk: ['Oat milk', 'Almond milk', 'Soy milk', 'Coconut milk'],
    cream: ['Coconut cream', 'Cashew cream', 'Oat cream'],
    butter: ['Vegan butter', 'Coconut oil', 'Olive oil'],
    cheese: ['Nutritional yeast', 'Cashew cheese', 'Vegan cheese'],
    egg: ['Flax egg', 'Chia egg', 'Aquafaba', 'Silken tofu'],
    honey: ['Maple syrup', 'Agave nectar', 'Date syrup'],
    gelatin: ['Agar-agar', 'Pectin', 'Carrageenan'],
    gelatine: ['Agar-agar', 'Pectin', 'Carrageenan'],
    whey: ['Pea protein', 'Soy protein', 'Rice protein'],
    casein: ['Pea protein', 'Soy protein', 'Rice protein'],
    lard: ['Coconut oil', 'Vegetable shortening', 'Olive oil'],
    tallow: ['Coconut oil', 'Vegetable shortening'],
    yoghurt: ['Coconut yoghurt', 'Soy yoghurt', 'Oat yoghurt'],
    yogurt: ['Coconut yoghurt', 'Soy yoghurt', 'Oat yoghurt'],
    lactose: ['Oat milk', 'Almond milk', 'Soy milk'],
    shellac: ['Zein coating', 'Carnauba wax'],
    beeswax: ['Candelilla wax', 'Carnauba wax'],
    carmine: ['Beetroot powder', 'Paprika extract'],
    cochineal: ['Beetroot powder', 'Paprika extract'],
    'l-cysteine': ['Synthetic L-cysteine', 'Fermented L-cysteine'],
    anchov: ['Capers', 'Seaweed flakes', 'Miso paste'],
  },
  vegetarian: {
    gelatin: ['Agar-agar', 'Pectin', 'Carrageenan'],
    gelatine: ['Agar-agar', 'Pectin', 'Carrageenan'],
    lard: ['Butter', 'Coconut oil', 'Vegetable shortening'],
    tallow: ['Butter', 'Coconut oil'],
    anchov: ['Capers', 'Miso paste', 'Soy sauce'],
    rennet: ['Vegetarian rennet', 'Microbial rennet'],
    carmine: ['Beetroot powder', 'Paprika extract'],
    cochineal: ['Beetroot powder', 'Paprika extract'],
    shellac: ['Zein coating', 'Carnauba wax'],
    'l-cysteine': ['Synthetic L-cysteine', 'Fermented L-cysteine'],
    isinglass: ['Bentonite', 'Irish moss'],
  },
};

export const ALLERGEN_SUBSTITUTES: Record<string, Record<string, string[]>> = {
  'Egg Allergy': {
    egg: ['Flax egg', 'Chia egg', 'Aquafaba', 'Applesauce'],
  },
  'Lactose Intolerance': {
    milk: ['Lactose-free milk', 'Oat milk', 'Almond milk'],
    cream: ['Lactose-free cream', 'Coconut cream'],
    cheese: ['Lactose-free cheese', 'Aged hard cheese'],
    yoghurt: ['Lactose-free yoghurt', 'Coconut yoghurt'],
    yogurt: ['Lactose-free yoghurt', 'Coconut yoghurt'],
    butter: ['Ghee', 'Olive oil', 'Coconut oil'],
    lactose: ['Lactose-free milk', 'Oat milk'],
    whey: ['Pea protein', 'Rice protein'],
  },
  'Gluten Intolerance': {
    wheat: ['Rice flour', 'Almond flour', 'Oat flour'],
    flour: ['Rice flour', 'Almond flour', 'Coconut flour'],
    barley: ['Quinoa', 'Buckwheat', 'Millet'],
    rye: ['Buckwheat flour', 'Rice flour'],
    semolina: ['Corn semolina', 'Rice flour'],
    couscous: ['Quinoa', 'Cauliflower rice'],
    breadcrumb: ['Gluten-free breadcrumbs', 'Ground almonds'],
    pasta: ['Rice pasta', 'Lentil pasta', 'Buckwheat noodles'],
    gluten: ['Rice flour', 'Almond flour', 'Tapioca starch'],
  },
  'Peanut Allergy': {
    peanut: ['Sunflower seed butter', 'Tahini', 'Almond butter'],
  },
  'Tree Nut Allergy': {
    almond: ['Sunflower seeds', 'Pumpkin seeds', 'Oat flour'],
    walnut: ['Sunflower seeds', 'Pumpkin seeds'],
    cashew: ['Sunflower seeds', 'Hemp seeds'],
    hazelnut: ['Sunflower seeds', 'Toasted coconut'],
    pistachio: ['Pumpkin seeds', 'Sunflower seeds'],
    pecan: ['Sunflower seeds', 'Toasted coconut'],
    macadamia: ['Coconut', 'Sunflower seeds'],
    nut: ['Sunflower seeds', 'Pumpkin seeds', 'Hemp seeds'],
  },
  'Soy Allergy': {
    soy: ['Coconut aminos', 'Fish sauce', 'Chickpea miso'],
    tofu: ['Chickpea tofu', 'Paneer', 'Tempeh-style grain cake'],
    soya: ['Coconut aminos', 'Sunflower lecithin'],
    lecithin: ['Sunflower lecithin'],
    edamame: ['Broad beans', 'Lima beans'],
  },
  'Sesame Allergy': {
    sesame: ['Sunflower seed butter', 'Poppy seeds', 'Hemp seeds'],
    tahini: ['Sunflower seed butter'],
  },
  'Shellfish Allergy': {
    shrimp: ['Hearts of palm', 'King oyster mushroom'],
    prawn: ['Hearts of palm', 'King oyster mushroom'],
    crab: ['Hearts of palm', 'Artichoke hearts'],
    lobster: ['Hearts of palm', 'King oyster mushroom'],
    shellfish: ['White fish', 'Hearts of palm'],
  },
  'Fish Allergy': {
    fish: ['Seaweed', 'Mushroom', 'Jackfruit'],
    anchov: ['Capers', 'Seaweed flakes', 'Miso paste'],
    sardine: ['Seaweed', 'Mushroom'],
    tuna: ['Chickpeas', 'Jackfruit'],
    salmon: ['Carrots', 'Beetroot', 'Jackfruit'],
    cod: ['Tofu', 'Banana blossom'],
  },
  'Celery Allergy': {
    celery: ['Fennel', 'Cucumber', 'Bok choy'],
    celeriac: ['Parsnip', 'Turnip'],
  },
  'Mustard Allergy': {
    mustard: ['Horseradish', 'Wasabi', 'Turmeric'],
  },
  'Lupin Allergy': {
    lupin: ['Chickpea flour', 'Soy flour'],
  },
  'Sulphite Sensitivity': {
    sulphite: ['Citric acid', 'Ascorbic acid'],
    sulfite: ['Citric acid', 'Ascorbic acid'],
    'sulphur dioxide': ['Citric acid', 'Ascorbic acid'],
  },
  'Fructose Intolerance': {
    fructose: ['Glucose', 'Dextrose', 'Rice malt syrup'],
    'high fructose': ['Glucose syrup', 'Rice malt syrup'],
    'fruit juice': ['Glucose syrup', 'Maple syrup'],
    honey: ['Rice malt syrup', 'Maple syrup'],
    agave: ['Rice malt syrup', 'Glucose syrup'],
  },
  'Histamine Intolerance': {
    vinegar: ['Citric acid', 'Lemon juice'],
    tomato: ['Beetroot', 'Pumpkin puree'],
    fermented: ['Fresh alternatives', 'Unfermented options'],
  },
  'MSG Sensitivity': {
    'monosodium glutamate': ['Herbs', 'Spices', 'Nutritional yeast'],
    msg: ['Herbs', 'Spices', 'Mushroom powder'],
    glutamate: ['Herbs', 'Spices', 'Coconut aminos'],
  },
  'Salicylate Sensitivity': {
    salicylate: ['Peeled pears', 'Iceberg lettuce'],
  },
};

export const CONDITION_SUBSTITUTES: Record<string, Record<string, string[]>> = {
  'Diabetes': {
    sugar: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    glucose: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    fructose: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    dextrose: ['Stevia', 'Erythritol'],
    sucrose: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    maltose: ['Stevia', 'Monk fruit sweetener'],
    'corn syrup': ['Stevia', 'Monk fruit sweetener'],
    honey: ['Stevia', 'Monk fruit sweetener', 'Erythritol'],
    'white flour': ['Almond flour', 'Coconut flour', 'Lupin flour'],
    'white rice': ['Cauliflower rice', 'Brown rice', 'Quinoa'],
    potato: ['Cauliflower', 'Turnip', 'Celeriac'],
  },
  'IBS': {
    onion: ['Chives', 'Green part of spring onion', 'Asafoetida'],
    garlic: ['Garlic-infused oil', 'Asafoetida', 'Chives'],
    wheat: ['Oats', 'Rice', 'Quinoa'],
    lactose: ['Lactose-free milk', 'Oat milk'],
    milk: ['Lactose-free milk', 'Oat milk'],
    apple: ['Blueberries', 'Strawberries', 'Grapes'],
    sorbitol: ['Stevia', 'Maple syrup'],
    mannitol: ['Stevia', 'Maple syrup'],
    inulin: ['Psyllium husk', 'Oat bran'],
    chicory: ['Psyllium husk', 'Oat bran'],
  },
  "Chron's Disease": {
    'whole grain': ['White rice', 'White bread', 'Refined pasta'],
    bran: ['White bread', 'Refined oats'],
    seed: ['Smooth nut butter', 'Peeled fruit'],
    popcorn: ['Rice cakes', 'Pretzels'],
  },
  'Ulcerative Colitis': {
    'whole grain': ['White rice', 'Refined pasta'],
    seed: ['Smooth nut butter', 'Peeled fruit'],
    spice: ['Mild herbs', 'Turmeric', 'Ginger'],
  },
  'GERD / Acid Reflux': {
    tomato: ['Pumpkin puree', 'Butternut squash'],
    citrus: ['Banana', 'Melon', 'Papaya'],
    chocolate: ['Carob', 'Vanilla'],
    mint: ['Basil', 'Ginger'],
    vinegar: ['Lemon juice (small amounts)'],
    coffee: ['Low-acid coffee', 'Chicory root tea'],
  },
  'High Cholesterol': {
    butter: ['Olive oil', 'Avocado oil', 'Plant sterol spread'],
    lard: ['Olive oil', 'Avocado oil'],
    'palm oil': ['Olive oil', 'Rapeseed oil'],
    'coconut oil': ['Olive oil', 'Avocado oil'],
    cream: ['Low-fat yoghurt', 'Cashew cream'],
  },
  'Hypertension': {
    salt: ['Herbs', 'Spices', 'Lemon juice', 'Garlic'],
    sodium: ['Potassium salt', 'Herbs', 'Spices'],
    'soy sauce': ['Coconut aminos', 'Low-sodium soy sauce'],
    bacon: ['Turkey bacon', 'Mushroom bacon'],
  },
  'Heart Disease': {
    butter: ['Olive oil', 'Avocado oil'],
    lard: ['Olive oil', 'Rapeseed oil'],
    'palm oil': ['Olive oil', 'Rapeseed oil'],
    cream: ['Low-fat yoghurt', 'Oat cream'],
    salt: ['Herbs', 'Spices', 'Lemon juice'],
  },
  'PCOS': {
    sugar: ['Stevia', 'Monk fruit sweetener', 'Cinnamon'],
    'white flour': ['Almond flour', 'Coconut flour'],
    'white rice': ['Quinoa', 'Brown rice', 'Cauliflower rice'],
  },
  'Metabolic Syndrome': {
    sugar: ['Stevia', 'Erythritol', 'Monk fruit sweetener'],
    'white flour': ['Almond flour', 'Oat flour'],
    'corn syrup': ['Stevia', 'Monk fruit sweetener'],
  },
  'Eczema / Psoriasis': {
    'artificial colour': ['Beetroot powder', 'Turmeric', 'Spirulina'],
    'artificial flavor': ['Natural vanilla', 'Herbs', 'Spices'],
  },
  'Migraine / Chronic Headaches': {
    msg: ['Herbs', 'Spices', 'Mushroom powder'],
    'monosodium glutamate': ['Herbs', 'Spices'],
    aspartame: ['Stevia', 'Monk fruit sweetener'],
    nitrate: ['Uncured meat', 'Fresh meat'],
    nitrite: ['Uncured meat', 'Fresh meat'],
  },
  'ADHD': {
    'artificial colour': ['Beetroot powder', 'Turmeric', 'Spirulina'],
    'artificial flavor': ['Natural flavourings', 'Herbs'],
    'sodium benzoate': ['Citric acid', 'Ascorbic acid'],
  },
  'SIBO': {
    onion: ['Chives', 'Garlic-infused oil', 'Asafoetida'],
    garlic: ['Garlic-infused oil', 'Asafoetida'],
    wheat: ['Rice', 'Quinoa', 'Oats'],
    lactose: ['Lactose-free milk', 'Oat milk'],
    milk: ['Lactose-free milk', 'Almond milk'],
  },
  'Leaky Gut Syndrome': {
    gluten: ['Rice flour', 'Almond flour', 'Coconut flour'],
    wheat: ['Rice', 'Quinoa', 'Buckwheat'],
    sugar: ['Stevia', 'Raw honey (small amounts)'],
  },
  'Rheumatoid Arthritis': {
    sugar: ['Stevia', 'Monk fruit sweetener'],
  },
  'Lupus': {
    salt: ['Herbs', 'Spices', 'Lemon juice'],
  },
};

export function getSubstitutes(
  ingredientText: string,
  flagReason: FlagReason,
  conditions: string[],
  allergies: string[],
): string[] {
  const lower = ingredientText.toLowerCase();

  const findMatch = (map: Record<string, string[]>): string[] | null => {
    for (const [keyword, subs] of Object.entries(map)) {
      if (lower.includes(keyword)) return subs;
    }
    return null;
  };

  // 1. Dietary preference substitutes (from flag reason)
  if (flagReason === 'vegan' || flagReason === 'vegetarian') {
    const dietMap = DIETARY_SUBSTITUTES[flagReason];
    if (dietMap) {
      const match = findMatch(dietMap);
      if (match) return match;
    }
  }

  // 2. Allergen-based substitutes
  for (const allergy of allergies) {
    const allergyMap = ALLERGEN_SUBSTITUTES[allergy];
    if (allergyMap) {
      const match = findMatch(allergyMap);
      if (match) return match;
    }
  }

  // 3. Condition-based substitutes
  for (const condition of conditions) {
    const condMap = CONDITION_SUBSTITUTES[condition];
    if (condMap) {
      const match = findMatch(condMap);
      if (match) return match;
    }
  }

  return [];
}
