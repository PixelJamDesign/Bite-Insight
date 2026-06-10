# FEATURE — Yeast intolerance + Candida overgrowth (SIFO)

**Status:** Ready to implement
**Origin:** Trial user request (Natalya Cole, 2026) — yeast intolerant + Candida/SIFO; says the app marks yeast-containing foods as "safe" when they aren't. High-intent: will convert if solved, churn if not.
**Version:** target 1.9.0

This spec adds two things:
1. **Yeast** as a new intolerance (`ALLERGY_KEYS`) so users can flag yeast in any form.
2. **Candida overgrowth (SIFO)** as a new health condition — the fungal cousin of the existing `sibo` (bacterial) condition.

No subtypes are needed for either.

---

## 1. Research summary

### Yeast intolerance — where yeast hides
Yeast isn't an EU-14 allergen, so OFF has **no `allergens_tag` for it** — detection must be by ingredient name/ID, not the allergen field. Sources to catch:

- **Direct yeast:** baker's yeast, brewer's yeast, nutritional yeast, active/instant dry yeast, dried yeast, deactivated yeast.
- **Yeast extract / flavour enhancers** (the big hidden one): yeast extract, **autolysed/autolyzed yeast extract**, hydrolysed yeast protein, torula yeast. Used as a savoury flavour / MSG substitute in **crisps, savoury crackers, ready meals, soups, stock cubes, gravy granules, sausages, sauces**. Marmite / Vegemite / Bovril.
- **Fermented / yeast-derived:** beer, wine, cider, **malt extract**, **malt vinegar**, soy sauce, tamari, miso, most breads.
- **Supplements:** B-complex / multivitamins using brewer's yeast as a B-vitamin source.

Sources: [ScienceInsights](https://scienceinsights.org/what-foods-to-avoid-if-you-have-a-yeast-intolerance/), [Smartblood](https://smartblood.co.uk/blogs/food-intolerance/what-foods-to-avoid-with-yeast-intolerance), [Frontier Allergist](https://www.frontierallergist.com/yeast-allergy-foods-to-avoid/).

### Candida overgrowth (SIFO) — the anti-candida diet
Candida (a yeast) feeds on sugar, so the protocol removes its fuel. Foods to flag:

- **All sugars & refined sweeteners** (refined sugar/glucose are the biggest driver), incl. honey, agave, syrups, fruit-juice concentrate, dried fruit.
- **Refined carbs** — white flour, white rice, refined starch.
- **Yeast & yeast extract** (overlaps with the yeast intolerance above).
- **Fermented foods** — vinegar, soy sauce, miso, sauerkraut, kombucha; **alcohol** (beer/wine).
- **Mould-prone** — aged/blue cheese, peanuts; mushrooms/fungi (some protocols).
- Encouraged (not flagged): non-starchy vegetables, lean protein, healthy fats, low-sugar fruit, probiotics.

Sources: [Amy Myers MD](https://www.amymyersmd.com/blogs/articles/anti-candida-foods), [Mary Vance NC](https://maryvancenc.com/the-candida-diet/), [Dr Brody (SIFO)](https://brodynd.com/gastroenterology/sifo/).

> Note: individual tolerance varies and distilled (white) vinegar is sometimes tolerated; we flag conservatively and let users dislike/allow per ingredient (the app already supports per-ingredient overrides).

---

## 2. Part A — Yeast intolerance (new allergy)

### A1. `constants/profileOptions.ts`
Add `'yeast'` to `ALLERGY_KEYS` (alphabetical — after `treeNut`, or keep the existing ordering and append):
```ts
export const ALLERGY_KEYS = [
  'aloeVera', 'celery', 'dairy', 'egg', 'fish', 'fructose', 'gluten',
  'histamine', 'lactose', 'lupin', 'msg', 'mustard', 'peanut', 'raspberry',
  'salicylate', 'sesame', 'shellfish', 'soy', 'sulphite', 'treeNut',
  'yeast',
] as const;
```
Add to `ALLERGY_LEGACY_MAP`:
```ts
  'Yeast Intolerance': 'yeast',
```

### A2. `lib/allergenKeywords.ts`
Add a new entry (keyed by the legacy English label, like the others). No OFF allergen tag exists for yeast, so `tags: []` — detection is by keyword + ingredient ID:
```ts
  'Yeast Intolerance': {
    tags: [],
    keywords: [
      'yeast', 'yeast extract', 'bakers yeast', "baker's yeast",
      'brewers yeast', "brewer's yeast", 'nutritional yeast',
      'autolyzed yeast', 'autolysed yeast', 'autolyzed yeast extract',
      'autolysed yeast extract', 'hydrolyzed yeast', 'hydrolysed yeast',
      'hydrolyzed yeast protein', 'torula yeast', 'deactivated yeast',
      'dried yeast', 'active dry yeast', 'instant yeast', 'yeast powder',
      'malt extract', 'malt vinegar',
      'marmite', 'vegemite', 'bovril',
    ],
    ingredientIds: [
      'en:yeast', 'en:yeast-extract', 'en:bakers-yeast', 'en:brewers-yeast',
      'en:nutritional-yeast', 'en:autolysed-yeast-extract',
      'en:autolyzed-yeast-extract', 'en:torula-yeast', 'en:deactivated-yeast',
      'en:dried-yeast', 'en:yeast-powder', 'en:malt-extract', 'en:malt-vinegar',
    ],
  },
```
> ⚠️ The bare keyword `'yeast'` is intentional (it's the literal ingredient) but watch for `yeast-free`/`yeast free` — add a deny pattern in the matcher if false positives show up. `'malt extract'`/`'malt vinegar'` are included because both are yeast-derived; if that's too aggressive for some users, split them into a separate "strict" pass later.

### A3. `app/scan-result.tsx` — `ALLERGY_DERIVATIVE_MAP`
Map the short profile key to the keyword entry (mirrors how the others resolve):
```ts
  yeast: ['Yeast Intolerance'],
```

### A4. `constants/flagReasons.ts` — `ALLERGY_CLASSIFICATION`
```ts
  yeast: 'intolerance',
```

### A5. `constants/conditionInfo.ts`
Add under the Allergies / Intolerances section:
```ts
  yeast: {
    fullName: 'Yeast Intolerance',
    description:
      "A yeast intolerance means your body reacts to yeast and the ingredients made from it. It hides in a lot of processed food: yeast extract and autolysed yeast are added to crisps, stock cubes, gravy, soups and savoury snacks for flavour. Baker's and brewer's yeast, malt extract and malt vinegar are common sources too.",
  },
```

### A6. Locales — `locales/<lang>/profileOptions.json` (all 12)
Add under `"allergies"`:
```json
    "yeast": "Yeast Intolerance"
```
(English value is fine as a starting point for all 12 via fallback; translate properly later.)

---

## 3. Part B — Candida overgrowth (SIFO) (new condition)

### B1. `constants/profileOptions.ts`
Add `'candida'` to `HEALTH_CONDITION_KEYS` (after `cancer`/`cf`, or alphabetical):
```ts
  'cancer', 'candida', 'cf', 'ckd', …
```
Add to `HEALTH_CONDITION_LEGACY_MAP`:
```ts
  'Candida Overgrowth (SIFO)': 'candida',
  'Candida': 'candida',
  'SIFO': 'candida',
```

### B2. `constants/healthIngredientFlags.ts` — `HEALTH_CONDITION_INGREDIENTS`
```ts
  candida: {
    flagsTaxonomyAncestors: ['en:added-sugar', 'en:refined-starch'],
    keywords: [
      // Sugars (candida's fuel)
      'sugar', 'sucrose', 'glucose', 'glucose syrup', 'fructose',
      'high fructose corn syrup', 'hfcs', 'dextrose', 'maltose', 'maltodextrin',
      'corn syrup', 'golden syrup', 'treacle', 'molasses', 'cane sugar',
      'invert sugar', 'honey', 'agave', 'maple syrup', 'rice syrup',
      'fruit juice concentrate', 'dried fruit', 'dates', 'raisins', 'sultanas',
      // Yeast & malt
      'yeast', 'yeast extract', 'brewers yeast', 'bakers yeast',
      'autolyzed yeast', 'autolysed yeast', 'malt', 'malt extract',
      // Fermented
      'malt vinegar', 'vinegar', 'soy sauce', 'tamari', 'miso',
      'kombucha', 'sauerkraut', 'wine', 'beer', 'alcohol',
      // Refined carbs
      'white flour', 'refined flour', 'enriched flour', 'white rice',
      // Mould-prone
      'mushroom', 'blue cheese', 'peanut',
    ],
    ingredientIds: [
      'en:sugar', 'en:sucrose', 'en:glucose', 'en:glucose-syrup', 'en:fructose',
      'en:high-fructose-corn-syrup', 'en:dextrose', 'en:maltose',
      'en:maltodextrin', 'en:corn-syrup', 'en:golden-syrup', 'en:treacle',
      'en:molasses', 'en:cane-sugar', 'en:invert-sugar', 'en:honey',
      'en:agave-syrup', 'en:maple-syrup', 'en:rice-syrup',
      'en:fruit-juice-concentrate', 'en:dried-fruit',
      'en:yeast', 'en:yeast-extract', 'en:brewers-yeast', 'en:malt-extract',
      'en:malt-vinegar', 'en:vinegar', 'en:soy-sauce',
      'en:white-flour', 'en:wheat-flour', 'en:white-rice',
      'en:mushroom',
    ],
    denyTextPatterns: ['sugar-free', 'no added sugar', 'yeast-free', 'alcohol-free'],
  },
```

### B3. `constants/conditionInfo.ts`
```ts
  candida: {
    fullName: 'Candida Overgrowth (SIFO)',
    description:
      'Candida overgrowth, also called SIFO (small intestinal fungal overgrowth), is when yeast in the gut grows beyond healthy levels. The yeast feeds on sugar, so the usual approach cuts back on sugar, refined carbs, yeast, alcohol and fermented foods. Probiotics and plenty of non-starchy vegetables can help alongside it.',
  },
```

### B4. `constants/conditionNutrientMap.ts` — `CONDITION_NUTRIENT_MAP`
Keyed by English display name (like the others). Candida is driven by *ingredients*, not micronutrients, so the macro side is handled by B2. Keep a light entry so onboarding nutrient pre-selection has something coherent:
```ts
  'Candida Overgrowth (SIFO)': {
    limit: [],
    boost: [
      {
        nutrient: 'Fibre',
        offKey: 'fiber_100g',
        unit: 'g',
        reason: 'Fibre from non-starchy vegetables supports gut balance while starving yeast of refined carbs.',
        userConfirmRequired: true,
      },
    ],
  },
```
> Verify the lookup name matches `HEALTH_CONDITION_LEGACY_MAP` (it keys cancer as `'Cancer'`, cf as `'CF'`). Use `'Candida Overgrowth (SIFO)'` consistently in both, OR follow whatever resolver the codebase uses (check `KEY_TO_LEGACY`).

### B5. `constants/flagReasons.ts`
If conditions are classified there too, add `candida` to the relevant map (mirror `sibo`).

### B6. Locales — `locales/<lang>/profileOptions.json` (all 12)
Add under `"healthConditions"`:
```json
    "candida": "Candida Overgrowth (SIFO)"
```

---

## 4. Overlap / conflict rules
- **Yeast intolerance ⊂ Candida** — candida already flags yeast, so a user with both won't get duplicate flags (the engine dedupes by ingredient; the flag reason shows the highest-priority match). No special handling needed, but confirm the de-dupe in `scan-result` picks one reason cleanly.
- **Candida vs diabetes/SIBO** — heavy keyword overlap on sugars/FODMAPs. That's fine; the maps are independent and matches dedupe per ingredient.
- **`vinegar`** is broad — distilled/white vinegar is often tolerated. Ship conservative (flag it); users can mark individual ingredients as "liked/allowed" via the existing per-ingredient override.

## 5. Copy guidelines (per brand voice)
Short, plain, human. No tricolons or brochure verbs. The descriptions above follow that. Names: keep "Bite Insight" two words anywhere in copy.

## 6. Testing checklist
- [ ] `yeast` appears as a selectable intolerance in onboarding, signup, edit-profile, add-family-member.
- [ ] Scan **Marmite / a yeast-extract crisp / a stock cube** with yeast selected → flagged (not "safe").
- [ ] Scan a plain product (no yeast) → not flagged for yeast.
- [ ] `candida` appears as a selectable condition in all four selectors.
- [ ] Scan a sugary / yeast / vinegar product with candida selected → flagged.
- [ ] A product with `yeast-free` / `sugar-free` in the text isn't falsely flagged (deny patterns work).
- [ ] User with **both** yeast + candida sees one clean flag per ingredient (no dupes).
- [ ] `npx tsc --noEmit` clean; the new keys resolve in `CONDITION_NUTRIENT_MAP` / legacy maps with no lookup gaps.
- [ ] Locale chips render in all 12 languages (English fallback acceptable initially).

## 7. Files touched (implementation order)
1. `constants/profileOptions.ts` — keys + legacy maps
2. `lib/allergenKeywords.ts` — yeast entry
3. `constants/healthIngredientFlags.ts` — candida entry
4. `constants/conditionInfo.ts` — yeast + candida info
5. `constants/conditionNutrientMap.ts` — candida entry
6. `constants/flagReasons.ts` — classifications
7. `app/scan-result.tsx` — `ALLERGY_DERIVATIVE_MAP`
8. `locales/<lang>/profileOptions.json` ×12 — chip labels
