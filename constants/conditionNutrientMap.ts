// ── Condition → Nutrient Watchlist Map ──────────────────────────────────────
// Medically-informed mapping of health conditions to micronutrients that
// patients should LIMIT or BOOST, based on established clinical guidelines
// (AHA, ADA, NHS, Mayo Clinic, NIH/NHLBI, Crohn's & Colitis Foundation, etc.)
//
// Data sources include: PMC systematic reviews, AHA dietary guidelines,
// ADA Standards of Care, DASH diet (NHLBI), Bone Health & Osteoporosis
// Foundation, American Headache Society, National MS Society, Lupus
// Foundation of America, and Crohn's & Colitis Foundation fact sheets.
//
// IMPORTANT: This data is used to PRE-SELECT suggestions during onboarding.
// Users always confirm/customise their selections. This is NOT medical advice.
//
// Open Food Facts nutriment keys reference:
//   sodium_100g, potassium_100g, calcium_100g, iron_100g, magnesium_100g,
//   zinc_100g, phosphorus_100g, cholesterol_100g, trans-fat_100g,
//   vitamin-a_100g, vitamin-c_100g, vitamin-d_100g, vitamin-e_100g,
//   vitamin-k_100g, copper_100g, manganese_100g, selenium_100g,
//   vitamin-b9_100g (folate), omega-3-fat_100g
// ────────────────────────────────────────────────────────────────────────────

export interface NutrientWatchItem {
  /** Human-readable nutrient name */
  nutrient: string;
  /** Open Food Facts nutriments key (per 100 g) */
  offKey: string;
  /** Display unit */
  unit: 'mg' | 'µg' | 'g';
  /** Plain-English reason for the recommendation */
  reason: string;
  /**
   * When true, the recommendation is controversial or highly individual —
   * the UI should present it as a suggestion the user must actively confirm,
   * rather than auto-selecting it.
   */
  userConfirmRequired?: boolean;
}

export interface ConditionNutrientProfile {
  /** Nutrients to reduce / limit intake of */
  limit: NutrientWatchItem[];
  /** Nutrients to increase / boost intake of */
  boost: NutrientWatchItem[];
}

export const CONDITION_NUTRIENT_MAP: Record<string, ConditionNutrientProfile> = {

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ADHD
  // ═══════════════════════════════════════════════════════════════════════════
  ADHD: {
    limit: [
      {
        nutrient: 'Copper',
        offKey: 'copper_100g',
        unit: 'mg',
        reason:
          'Elevated copper-to-zinc ratio is associated with worse ADHD symptoms; excess copper depletes zinc',
        userConfirmRequired: true,
      },
    ],
    boost: [
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Lower zinc levels are consistently found in ADHD patients; zinc supports dopamine regulation and neurotransmitter function',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Iron deficiency is linked to worse ADHD symptoms; iron is essential for dopamine synthesis',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Low magnesium is associated with greater ADHD symptom severity; magnesium supports neurotransmitter regulation',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids (EPA/DHA) support myelination, serotonergic and dopaminergic function; clinical trials show symptom improvement',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D insufficiency is common in ADHD; it plays a role in brain development and neurotransmitter pathways',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Autism
  // ═══════════════════════════════════════════════════════════════════════════
  Autism: {
    limit: [],
    boost: [
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency prevalence is ~25% in ASD; lower levels correlate with symptom severity',
      },
      {
        nutrient: 'Vitamin A',
        offKey: 'vitamin-a_100g',
        unit: 'µg',
        reason:
          'Vitamin A deficiency is found in ~25% of children with ASD due to food selectivity; important for immune function and vision',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Ferritin levels are consistently lower in ASD children; iron supports cognitive development',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Calcium deficiency found in ~11% of ASD children due to restrictive eating; essential for bone and neurological health',
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'ASD children may be more likely to have folate deficiency than controls; folate is critical for neurodevelopment',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc intake is often inadequate in children with ASD due to selective eating; supports immune and neurological function',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids are commonly deficient in ASD; they support brain development and may reduce neuroinflammation',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin K',
        offKey: 'vitamin-k_100g',
        unit: 'µg',
        reason:
          'Children with ASD consume significantly lower amounts of vitamin K due to restricted diets',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3a. Chronic Kidney Disease (CKD)
  // ═══════════════════════════════════════════════════════════════════════════
  'Chronic Kidney Disease': {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'g',
        reason:
          'High sodium intake increases blood pressure and fluid retention, accelerating kidney damage in CKD',
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Damaged kidneys struggle to remove excess potassium, which can cause dangerous heart rhythm problems',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Phosphorus',
        offKey: 'phosphorus_100g',
        unit: 'mg',
        reason:
          'The kidneys cannot remove excess phosphorus effectively in CKD, leading to bone and cardiovascular complications',
      },
    ],
    boost: [
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Anaemia is very common in CKD because the kidneys produce less erythropoietin, so adequate iron intake is important',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'CKD disrupts calcium and phosphorus balance, and maintaining calcium intake helps protect bone health',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3b. Crohn's Disease
  // ═══════════════════════════════════════════════════════════════════════════
  "Chron's Disease": {
    limit: [
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats promote intestinal inflammation and may worsen Crohn\'s flare-ups',
      },
    ],
    boost: [
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Anaemia affects ~70% of Crohn\'s patients; iron deficiency is the most common cause due to malabsorption and blood loss',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Calcium absorption is impaired, especially in patients on corticosteroids or avoiding dairy; 1000–1500 mg/day is recommended',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is very common in Crohn\'s due to malabsorption; important for calcium absorption and immune regulation',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc is lost through diarrhoea; all Crohn\'s patients with significant diarrhoea should supplement zinc (20–40 mg/day)',
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'Folate deficiency is common (~29% of CD patients) due to malabsorption and medications like sulfasalazine and methotrexate',
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium levels are often reduced in IBD patients; selenium is an essential antioxidant that supports gut immune function',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium depletion occurs through diarrhoea and malabsorption; supports enzyme function and electrolyte balance',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids have anti-inflammatory properties that may help reduce intestinal inflammation',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Diabetes
  // ═══════════════════════════════════════════════════════════════════════════
  Diabetes: {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'People with diabetes are at higher cardiovascular risk; sodium intake should be limited to <2,300 mg/day per ADA guidelines',
      },
      {
        nutrient: 'Cholesterol',
        offKey: 'cholesterol_100g',
        unit: 'mg',
        reason:
          'Diabetes increases cardiovascular risk; limiting dietary cholesterol supports heart health',
      },
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats worsen insulin resistance and raise cardiovascular risk, which is already elevated in diabetes',
      },
    ],
    boost: [
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Higher dietary magnesium intake is associated with reduced risk of type 2 diabetes; magnesium supports insulin sensitivity',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc plays a role in insulin storage, secretion, and signalling; deficiency may aggravate carbohydrate intolerance',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is more prevalent in diabetes and is associated with impaired insulin secretion and sensitivity',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Adequate potassium intake supports cardiovascular health and blood pressure control, both critical in diabetes management',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Eczema / Psoriasis
  // ═══════════════════════════════════════════════════════════════════════════
  'Eczema / Psoriasis': {
    limit: [],
    boost: [
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Blood levels of vitamin D are lower in eczema/psoriasis patients; supplementation reduces severity of clinical signs and symptoms',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Fish oil / omega-3 has the highest evidence of benefit in RCTs for psoriasis and may modestly benefit eczema',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc supports skin cell renewal and may improve inflammatory skin conditions, especially when deficiency is present',
      },
      {
        nutrient: 'Vitamin A',
        offKey: 'vitamin-a_100g',
        unit: 'µg',
        reason:
          'Vitamin A supports skin barrier integrity and cell turnover; deficiency can worsen skin conditions',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin E',
        offKey: 'vitamin-e_100g',
        unit: 'mg',
        reason:
          'Vitamin E is an antioxidant that protects skin cells from oxidative damage and supports the skin barrier',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium supports antioxidant defence in skin; some evidence links deficiency to worsened psoriasis',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. GERD / Acid Reflux
  // ═══════════════════════════════════════════════════════════════════════════
  'GERD / Acid Reflux': {
    limit: [],
    boost: [
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'PPI medications decrease calcium absorption and increase hip fracture risk; adequate dietary calcium is important',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'PPI use can cause magnesium depletion; magnesium supports the lower oesophageal sphincter function',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Reduced stomach acid from PPIs impairs iron absorption (reduced by 28–65%); dietary iron intake becomes important',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D activation occurs partly in the stomach; PPI use can impair this process and reduce vitamin D levels',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin C',
        offKey: 'vitamin-c_100g',
        unit: 'mg',
        reason:
          'PPIs lower vitamin C concentration in stomach acid; adequate dietary vitamin C helps compensate',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Acid suppression may impair zinc absorption; zinc supports tissue repair in the oesophageal lining',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. Heart Disease
  // ═══════════════════════════════════════════════════════════════════════════
  'Heart Disease': {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'AHA recommends <2,300 mg/day (ideally <1,500 mg); excess sodium raises blood pressure and strains the heart',
      },
      {
        nutrient: 'Cholesterol',
        offKey: 'cholesterol_100g',
        unit: 'mg',
        reason:
          'Dietary cholesterol contributes to arterial plaque buildup; limiting intake supports LDL-C reduction',
      },
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats raise LDL ("bad") cholesterol and lower HDL ("good") cholesterol; no safe level of intake exists',
      },
    ],
    boost: [
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'AHA dietary patterns emphasise potassium; it helps regulate blood pressure and reduces cardiovascular risk',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids reduce triglycerides, lower blood pressure, reduce inflammation, and improve endothelial function',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium acts as a natural calcium channel blocker, promotes vasodilation, and supports healthy heart rhythm',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Adequate dietary calcium supports vascular reactivity and smooth muscle relaxation (dietary sources preferred over supplements)',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'Folate helps reduce homocysteine levels, an independent risk factor for cardiovascular disease',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. High Cholesterol
  // ═══════════════════════════════════════════════════════════════════════════
  'High Cholesterol': {
    limit: [
      {
        nutrient: 'Cholesterol',
        offKey: 'cholesterol_100g',
        unit: 'mg',
        reason:
          'Reducing dietary cholesterol intake directly supports LDL-C reduction',
      },
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats raise total and LDL cholesterol while lowering HDL; there is no safe amount to consume',
      },
    ],
    boost: [
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids reduce triglycerides; AHA recommends at least 2 servings of fatty fish per week',
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Potassium-rich diets support cardiovascular health and help maintain healthy blood pressure alongside cholesterol management',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. Hypertension
  // ═══════════════════════════════════════════════════════════════════════════
  Hypertension: {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'DASH diet limits sodium to <2,300 mg/day (ideally <1,500 mg); sodium raises blood pressure by increasing extracellular fluid volume',
      },
    ],
    boost: [
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'DASH diet is rich in potassium; it promotes sodium excretion and reduces vascular smooth muscle contraction',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium acts as a natural calcium channel blocker, promoting vasodilation and improving endothelial function (DASH nutrient)',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Calcium supports vascular reactivity and helps relax smooth muscles; DASH diet includes 2–3 servings of low-fat dairy daily',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids help lower blood pressure and reduce systemic inflammation',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. IBS
  // ═══════════════════════════════════════════════════════════════════════════
  IBS: {
    limit: [],
    boost: [
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is common in IBS, especially on restrictive diets; supplementation may improve symptoms',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Following a dairy-free or low-FODMAP diet commonly results in calcium deficiency; dietary sources should be prioritised',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Iron deficiency is a known cause of chronic fatigue in IBS patients and may worsen both physical and psychological symptoms',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc intake is often inadequate in IBS patients, particularly on restrictive diets; supports gut barrier function',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium deficiency is reported in IBS patients on restrictive diets; supports muscle relaxation and bowel motility',
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'Folate intake is commonly inadequate in IBS patients due to dietary restrictions, especially on low-FODMAP diets',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. Leaky Gut Syndrome
  // ═══════════════════════════════════════════════════════════════════════════
  'Leaky Gut Syndrome': {
    limit: [],
    boost: [
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc modifies tight junctions of the intestinal lining and limits gut permeability; essential for gut cell renewal',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D helps maintain intestinal barrier integrity; 2,000 IU/day maintained permeability in a Crohn\'s RCT',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids reduce intestinal inflammation and support mucosal healing and barrier repair',
      },
      {
        nutrient: 'Vitamin A',
        offKey: 'vitamin-a_100g',
        unit: 'µg',
        reason:
          'Vitamin A supports epithelial cell integrity and mucosal immune function in the gut lining',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. Lupus
  // ═══════════════════════════════════════════════════════════════════════════
  Lupus: {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'SLE patients should restrict sodium to <3 g/day; excess sodium raises blood pressure and cardiovascular risk, already elevated in lupus',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Excess iron can aggravate renal impairment in SLE patients; iron should only be supplemented in confirmed anaemia',
        userConfirmRequired: true,
      },
    ],
    boost: [
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is very common in lupus (patients avoid sun); supplementation supports bone health and immune modulation',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Corticosteroid use increases osteoporosis risk; ACR recommends increased calcium intake during steroid treatment',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 supplementation significantly reduces lupus disease activity, inflammatory markers, and improves endothelial function',
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium supports antioxidant defence and immune regulation; dietary sources are recommended for SLE patients',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc supports immune function and wound healing; adequate intake is recommended as part of a balanced SLE diet',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin E',
        offKey: 'vitamin-e_100g',
        unit: 'mg',
        reason:
          'Vitamin E is an antioxidant that may help combat oxidative stress in SLE patients',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 13. ME / Chronic Fatigue
  // ═══════════════════════════════════════════════════════════════════════════
  'ME / Chronic Fatigue': {
    limit: [],
    boost: [
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Low magnesium levels are frequently found in ME/CFS patients; supplementation may improve energy levels and reduce muscle pain',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc levels are often reduced in ME/CFS patients; zinc supports immune function and energy metabolism',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Iron deficiency is a known cause of chronic fatigue and should be investigated in ME/CFS patients',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Essential fatty acid deficiency is reported in ME/CFS; omega-3 supports mitochondrial function and reduces inflammation',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is common in ME/CFS patients, particularly those with limited mobility or sun exposure',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin C',
        offKey: 'vitamin-c_100g',
        unit: 'mg',
        reason:
          'Vitamin C levels may be reduced in ME/CFS; it supports immune function and acts as an antioxidant to reduce oxidative stress',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 14. Metabolic Syndrome
  // ═══════════════════════════════════════════════════════════════════════════
  'Metabolic Syndrome': {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'Metabolic syndrome includes hypertension; DASH diet guidance recommends limiting sodium to <2,300 mg/day',
      },
      {
        nutrient: 'Cholesterol',
        offKey: 'cholesterol_100g',
        unit: 'mg',
        reason:
          'Metabolic syndrome includes dyslipidaemia; reducing dietary cholesterol supports cardiovascular risk reduction',
      },
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats worsen insulin resistance, raise LDL cholesterol, and increase cardiovascular risk in metabolic syndrome',
      },
    ],
    boost: [
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Every 100 mg/day increase in magnesium reduces metabolic syndrome risk by 17%; magnesium improves insulin sensitivity',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Low zinc is associated with obesity and diabetes risk; zinc supports over 300 metabolic processes including insulin signalling',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is strongly associated with metabolic syndrome; it supports calcium metabolism and insulin function',
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Potassium-rich diets (DASH pattern) help manage hypertension, a key component of metabolic syndrome',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids improve lipid profiles and reduce inflammation, both critical in metabolic syndrome management',
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium supports antioxidant defence and thyroid function, both relevant to metabolic regulation',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 15. Migraine / Chronic Headaches
  // ═══════════════════════════════════════════════════════════════════════════
  'Migraine / Chronic Headaches': {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'High sodium intake may trigger migraines through dehydration and blood pressure changes; moderation is recommended',
        userConfirmRequired: true,
      },
    ],
    boost: [
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'American Headache Society recommends 400–500 mg/day; magnesium inhibits glutamate (excitatory neurotransmitter) and is lower in migraine patients',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is associated with chronic migraines; adequate levels may reduce migraine frequency',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids have anti-inflammatory properties that may reduce migraine frequency and severity',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Adequate potassium helps maintain electrolyte balance and proper nerve function, which may reduce migraine triggers',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 16. Multiple Sclerosis
  // ═══════════════════════════════════════════════════════════════════════════
  'Multiple Sclerosis': {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'Preclinical studies show high salt promotes pro-inflammatory Th17 cells; limit to <2,300 mg/day for general health, though human evidence is mixed',
        userConfirmRequired: true,
      },
    ],
    boost: [
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Women with higher vitamin D intake had 33% lower MS incidence; vitamin D supplementation (>=400 IU/day) reduced risk by 41%',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids reduce inflammation and may improve quality of life, reduce fatigue, and lower relapse rates in MS',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'MS patients on corticosteroids have increased osteoporosis risk; adequate calcium intake supports bone health',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin E',
        offKey: 'vitamin-e_100g',
        unit: 'mg',
        reason:
          'Vitamin E is an antioxidant that may help protect against oxidative nerve damage in MS',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium can counteract pathogenic effects and downregulate inflammatory molecules relevant to neuroinflammation',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 17. Osteoporosis
  // ═══════════════════════════════════════════════════════════════════════════
  Osteoporosis: {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'Every 2,300 mg of sodium causes ~40 mg calcium loss in urine; limit to <2,300 mg/day to protect bone density',
      },
      {
        nutrient: 'Phosphorus',
        offKey: 'phosphorus_100g',
        unit: 'mg',
        reason:
          'Excessive phosphorus (especially with low calcium intake) draws calcium from bones; limit intake from processed foods',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin A',
        offKey: 'vitamin-a_100g',
        unit: 'µg',
        reason:
          'Excessive preformed vitamin A (retinol) intake is associated with increased risk of osteoporosis and fractures',
        userConfirmRequired: true,
      },
    ],
    boost: [
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Foundation of bone health; 700–1,200 mg/day recommended depending on age (NHS/Bone Health Foundation guidelines)',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Essential for calcium absorption; 10–20 µg (400–800 IU)/day recommended to prevent bone loss',
      },
      {
        nutrient: 'Vitamin K',
        offKey: 'vitamin-k_100g',
        unit: 'µg',
        reason:
          'Vitamin K activates osteocalcin, a protein that binds calcium to bone matrix; important for bone mineralisation',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium helps metabolise calcium and activates vitamin D; essential co-factor for bone health',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc is needed for bone tissue renewal and collagen synthesis; supports overall skeletal health',
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Potassium-rich diets reduce urinary calcium excretion; indirectly benefits bone mineral density',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin C',
        offKey: 'vitamin-c_100g',
        unit: 'mg',
        reason:
          'Vitamin C is essential for collagen synthesis, a key structural component of bone tissue',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 18. PCOS
  // ═══════════════════════════════════════════════════════════════════════════
  PCOS: {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'PCOS increases cardiovascular risk; DASH eating plan recommends 1,500 mg/day sodium limit',
      },
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats worsen insulin resistance and inflammation, both key drivers of PCOS symptoms',
      },
    ],
    boost: [
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is common in PCOS and linked to insulin resistance, ovulatory issues, and infertility; supplementation improves ovulation rates',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'RCT showed 250 mg/day magnesium for 2 months improved insulin resistance, blood glucose, and lipid profiles in PCOS',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Women with PCOS have significantly lower serum zinc; supplementation (50 mg elemental zinc for 8 weeks) improved metabolic parameters in RCTs',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 improves insulin resistance, lipid profiles, and has anti-inflammatory properties in PCOS patients',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Combined calcium + vitamin D supplementation shows synergistic benefits for metabolic parameters in PCOS',
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium supports antioxidant defence and thyroid function; lower levels are observed in PCOS patients',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'Folate is important for women of childbearing age with PCOS, especially those planning pregnancy',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 19. Rheumatoid Arthritis
  // ═══════════════════════════════════════════════════════════════════════════
  'Rheumatoid Arthritis': {
    limit: [
      {
        nutrient: 'Sodium',
        offKey: 'sodium_100g',
        unit: 'mg',
        reason:
          'Salt intake >6 g/day may promote inflammation via immune system changes; aim for <1,500 mg/day, especially on steroids',
      },
    ],
    boost: [
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Strong evidence: 2–3 g/day reduces joint pain and stiffness; one trial found 5.5 g/day doubled remission rates in RA',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D supports immune regulation and bone health; supplementation recommended to decrease osteoporosis risk from corticosteroids',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Calcium supplementation recommended alongside vitamin D to prevent corticosteroid-induced osteoporosis',
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium may decrease free-radical damage to joint linings, reducing swelling and pain; supports antioxidant defence',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Anaemia is common in RA due to chronic inflammation and impaired iron absorption; adequate dietary iron prevents fatigue',
      },
      {
        nutrient: 'Copper',
        offKey: 'copper_100g',
        unit: 'mg',
        reason:
          'Copper supports connective tissue formation, immune function, and acts as an antioxidant by removing free radicals',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin E',
        offKey: 'vitamin-e_100g',
        unit: 'mg',
        reason:
          'Vitamin E may decrease free-radical damage to joint linings and support anti-inflammatory processes',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 20. SIBO
  // ═══════════════════════════════════════════════════════════════════════════
  SIBO: {
    limit: [],
    boost: [
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'SIBO bacteria consume iron; ferritin levels are commonly low. Note: oral iron supplements may feed overgrowth — dietary sources preferred',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Fat-soluble vitamin D absorption is impaired due to fat maldigestion in SIBO; deficiency is common',
      },
      {
        nutrient: 'Vitamin A',
        offKey: 'vitamin-a_100g',
        unit: 'µg',
        reason:
          'Fat malabsorption in SIBO leads to deficiency in fat-soluble vitamins including A; supports gut mucosal integrity',
      },
      {
        nutrient: 'Vitamin E',
        offKey: 'vitamin-e_100g',
        unit: 'mg',
        reason:
          'Fat-soluble vitamin E levels are commonly reduced due to malabsorption in SIBO',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Poor calcium absorption in SIBO can lead to osteoporosis or kidney stones long-term',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc deficiency is common in SIBO; zinc supports gut barrier integrity and immune function',
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'While bacteria produce some folate, overall nutritional status is often compromised in SIBO',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 21. Ulcerative Colitis
  // ═══════════════════════════════════════════════════════════════════════════
  'Ulcerative Colitis': {
    limit: [
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats promote gut inflammation and may disrupt the intestinal barrier; IOIBD recommends limiting intake',
      },
    ],
    boost: [
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Iron deficiency anaemia is the most common extraintestinal manifestation of UC due to chronic blood loss from colon ulcers',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is very common in UC, especially in patients on steroids; supports immune regulation and bone health',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Calcium is at risk due to dairy avoidance and corticosteroid use; adequate intake prevents osteoporosis',
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'Folate deficiency is common (~9% of UC patients); sulfasalazine medication directly lowers folate levels',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Serum zinc is significantly lower in UC patients vs. healthy controls; zinc supports wound healing and immune function',
      },
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium levels are significantly lower in UC patients; selenium supports antioxidant defence and may reduce inflammation',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium is often depleted through diarrhoea; supports electrolyte balance and enzyme function',
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids have anti-inflammatory properties that may help reduce colonic inflammation in UC',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin K',
        offKey: 'vitamin-k_100g',
        unit: 'µg',
        reason:
          'Vitamin K deficiency is reported in IBD patients; important for blood clotting and bone health',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 22. Coeliac Disease
  // ═══════════════════════════════════════════════════════════════════════════
  'Coeliac Disease': {
    limit: [],
    boost: [
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Iron deficiency is one of the most common nutritional problems in coeliac disease because damage to the small intestine reduces iron absorption',
      },
      {
        nutrient: 'Calcium',
        offKey: 'calcium_100g',
        unit: 'mg',
        reason:
          'Calcium absorption is impaired in coeliac disease, increasing the risk of osteoporosis. Adequate intake is essential even after going gluten-free',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is very common in coeliac disease due to malabsorption. It works alongside calcium to protect bone density',
      },
      {
        nutrient: 'Folate',
        offKey: 'vitamin-b9_100g',
        unit: 'µg',
        reason:
          'Folate deficiency is frequently seen at diagnosis because the damaged small intestine cannot absorb it properly',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc deficiency is common in coeliac patients and can affect immune function, wound healing and taste perception',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium absorption is often compromised in coeliac disease, contributing to fatigue and muscle cramps',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 23. Diverticular Disease
  // ═══════════════════════════════════════════════════════════════════════════
  'Diverticular Disease': {
    limit: [],
    boost: [
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium supports bowel motility and helps prevent constipation, which is a key factor in managing diverticular disease',
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Potassium supports muscle function in the colon walls and helps maintain regular bowel movements',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin C',
        offKey: 'vitamin-c_100g',
        unit: 'mg',
        reason:
          'Vitamin C supports collagen production, which is important for maintaining the structural integrity of the colon wall',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 24. Endometriosis
  // ═══════════════════════════════════════════════════════════════════════════
  'Endometriosis': {
    limit: [
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats promote systemic inflammation and have been associated with a higher risk of endometriosis in observational studies',
      },
    ],
    boost: [
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids have anti-inflammatory properties that may help reduce the pain and inflammation associated with endometriosis',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Heavy menstrual bleeding is common with endometriosis, making iron deficiency a frequent concern',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium can help relax smooth muscle and may ease cramping. Many women with endometriosis are deficient',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D plays a role in immune regulation and inflammation. Low levels have been linked to more severe endometriosis symptoms',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Vitamin E',
        offKey: 'vitamin-e_100g',
        unit: 'mg',
        reason:
          'Vitamin E is an antioxidant that may help reduce oxidative stress and pelvic pain in endometriosis',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 25. Gout
  // ═══════════════════════════════════════════════════════════════════════════
  'Gout': {
    limit: [
      {
        nutrient: 'Cholesterol',
        offKey: 'cholesterol_100g',
        unit: 'mg',
        reason:
          'High cholesterol intake often correlates with purine-rich animal products. Gout patients benefit from reducing organ meats and rich fatty foods',
        userConfirmRequired: true,
      },
    ],
    boost: [
      {
        nutrient: 'Vitamin C',
        offKey: 'vitamin-c_100g',
        unit: 'mg',
        reason:
          'Vitamin C has been shown to lower uric acid levels by increasing its excretion through the kidneys. Studies suggest 500mg/day may reduce gout risk',
      },
      {
        nutrient: 'Potassium',
        offKey: 'potassium_100g',
        unit: 'mg',
        reason:
          'Potassium helps the kidneys excrete uric acid more efficiently. A potassium-rich diet supports overall kidney health in gout patients',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium deficiency is linked to higher uric acid levels. Adequate magnesium supports kidney function and may help prevent gout attacks',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 26. Hashimoto's Thyroiditis
  // ═══════════════════════════════════════════════════════════════════════════
  "Hashimoto's Thyroiditis": {
    limit: [],
    boost: [
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium is essential for thyroid hormone conversion and has been shown to reduce thyroid antibodies in Hashimoto\'s patients',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc is needed for thyroid hormone synthesis. Deficiency is common in hypothyroid conditions and can worsen symptoms',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Iron deficiency impairs thyroid hormone production. Hashimoto\'s patients are at higher risk of anaemia',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Low vitamin D levels are strongly associated with autoimmune thyroid disease. Adequate levels may help modulate the immune response',
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium supports thyroid function and energy metabolism. Many thyroid patients are deficient without realising it',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 27. Hypothyroidism
  // ═══════════════════════════════════════════════════════════════════════════
  'Hypothyroidism': {
    limit: [],
    boost: [
      {
        nutrient: 'Selenium',
        offKey: 'selenium_100g',
        unit: 'µg',
        reason:
          'Selenium is critical for converting the thyroid hormone T4 into its active form T3. The thyroid gland contains the highest concentration of selenium in the body',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc supports thyroid hormone production and helps regulate TSH levels. Deficiency can slow metabolism further',
      },
      {
        nutrient: 'Iron',
        offKey: 'iron_100g',
        unit: 'mg',
        reason:
          'Iron deficiency reduces the activity of thyroid peroxidase, the enzyme that produces thyroid hormones. Anaemia and hypothyroidism often coexist',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is more prevalent in hypothyroid patients. Adequate levels support immune balance and bone health',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium plays a role in thyroid hormone metabolism and energy production. Low levels can contribute to fatigue and muscle weakness',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 28. Insulin Resistance
  // ═══════════════════════════════════════════════════════════════════════════
  'Insulin Resistance': {
    limit: [
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats worsen insulin resistance by promoting inflammation and impairing cell membrane function, making it harder for insulin to do its job',
      },
    ],
    boost: [
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium plays a key role in insulin signalling. Low magnesium levels are strongly associated with insulin resistance and type 2 diabetes risk',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc is involved in insulin storage and secretion. Adequate zinc helps maintain healthy blood sugar regulation',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is linked to impaired insulin secretion and increased insulin resistance. Supplementation may improve sensitivity',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids help reduce inflammation and may improve insulin sensitivity in people with insulin resistance',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 29. NAFLD (Non-Alcoholic Fatty Liver Disease)
  // ═══════════════════════════════════════════════════════════════════════════
  'NAFLD': {
    limit: [
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats accelerate fat accumulation in the liver and worsen liver inflammation. They should be avoided as much as possible with NAFLD',
      },
      {
        nutrient: 'Cholesterol',
        offKey: 'cholesterol_100g',
        unit: 'mg',
        reason:
          'Excess dietary cholesterol can contribute to liver fat accumulation and worsen NAFLD progression',
        userConfirmRequired: true,
      },
    ],
    boost: [
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3 fatty acids have been shown to reduce liver fat content and improve liver enzyme levels in NAFLD patients',
      },
      {
        nutrient: 'Vitamin E',
        offKey: 'vitamin-e_100g',
        unit: 'mg',
        reason:
          'Vitamin E is one of the few supplements with clinical evidence for improving liver histology in non-diabetic NAFLD patients',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D deficiency is common in NAFLD and is associated with more severe liver fibrosis. Adequate levels may support liver health',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Magnesium supports insulin sensitivity and energy metabolism. Low levels are associated with both NAFLD and insulin resistance',
        userConfirmRequired: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 30. Pre-diabetes
  // ═══════════════════════════════════════════════════════════════════════════
  'Pre-diabetes': {
    limit: [
      {
        nutrient: 'Trans Fat',
        offKey: 'trans-fat_100g',
        unit: 'g',
        reason:
          'Trans fats increase insulin resistance and inflammation, raising the risk of progressing from pre-diabetes to type 2 diabetes',
      },
    ],
    boost: [
      {
        nutrient: 'Magnesium',
        offKey: 'magnesium_100g',
        unit: 'mg',
        reason:
          'Higher magnesium intake is associated with a significantly lower risk of developing type 2 diabetes. It plays a direct role in glucose metabolism',
      },
      {
        nutrient: 'Zinc',
        offKey: 'zinc_100g',
        unit: 'mg',
        reason:
          'Zinc helps the pancreas produce, store and release insulin. Maintaining adequate zinc levels supports healthy blood sugar control',
      },
      {
        nutrient: 'Vitamin D',
        offKey: 'vitamin-d_100g',
        unit: 'µg',
        reason:
          'Vitamin D improves insulin sensitivity and supports pancreatic beta-cell function. Deficiency is associated with higher diabetes risk',
        userConfirmRequired: true,
      },
      {
        nutrient: 'Omega-3',
        offKey: 'omega-3-fat_100g',
        unit: 'g',
        reason:
          'Omega-3s reduce systemic inflammation and may help improve insulin sensitivity, supporting the body in managing blood sugar more effectively',
        userConfirmRequired: true,
      },
    ],
  },
};

// ── Helper utilities ────────────────────────────────────────────────────────

/** Get all unique OFF nutrient keys referenced across all conditions */
export function getAllWatchedNutrientKeys(): string[] {
  const keys = new Set<string>();
  for (const profile of Object.values(CONDITION_NUTRIENT_MAP)) {
    for (const item of [...profile.limit, ...profile.boost]) {
      keys.add(item.offKey);
    }
  }
  return Array.from(keys);
}

/**
 * Given a list of user health conditions, returns a merged nutrient profile
 * with de-duplicated limit/boost lists. When a nutrient appears in both
 * limit and boost across different conditions, it gets `userConfirmRequired`.
 */
export function getMergedNutrientProfile(
  conditions: string[],
): ConditionNutrientProfile {
  const limitMap = new Map<string, NutrientWatchItem>();
  const boostMap = new Map<string, NutrientWatchItem>();

  for (const condition of conditions) {
    const profile = CONDITION_NUTRIENT_MAP[condition];
    if (!profile) continue;

    for (const item of profile.limit) {
      if (!limitMap.has(item.offKey)) {
        limitMap.set(item.offKey, { ...item });
      }
    }
    for (const item of profile.boost) {
      if (!boostMap.has(item.offKey)) {
        boostMap.set(item.offKey, { ...item });
      }
    }
  }

  // Flag conflicts: nutrient appears in both limit and boost
  boostMap.forEach((boostItem, key) => {
    if (limitMap.has(key)) {
      boostItem.userConfirmRequired = true;
      const limitItem = limitMap.get(key)!;
      limitItem.userConfirmRequired = true;
    }
  });

  return {
    limit: Array.from(limitMap.values()),
    boost: Array.from(boostMap.values()),
  };
}
