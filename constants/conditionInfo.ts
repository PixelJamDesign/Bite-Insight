/**
 * Condition info for the info bottom sheet.
 * Every selectable condition, allergy and dietary preference has an entry
 * so users can tap the ℹ️ icon on any chip to learn more.
 * Keys must match the keys in profileOptions.ts / profileOptions.json.
 */

export type ConditionInfoEntry = {
  fullName: string;
  description: string;
};

export const CONDITION_INFO: Record<string, ConditionInfoEntry> = {
  // ── Health Conditions ──────────────────────────────────────────────────────
  adhd: {
    fullName: 'Attention Deficit Hyperactivity Disorder (ADHD)',
    description:
      'ADHD affects focus, impulse control and energy levels. Certain food additives, especially artificial colours, and blood sugar spikes can make symptoms worse. Eating a balanced diet with plenty of omega-3, iron and zinc may help with concentration.',
  },
  autism: {
    fullName: 'Autism Spectrum Condition',
    description:
      'Autism can affect sensory processing, which often influences food preferences and tolerances. Some people on the spectrum are sensitive to certain textures, tastes or additives. A varied, nutrient-dense diet is important, and identifying personal trigger foods can help with comfort and wellbeing.',
  },
  cancer: {
    fullName: 'Cancer',
    description:
      "Diet can play a meaningful role in cancer prevention, treatment support and survivorship. BiteInsight uses evidence from the World Cancer Research Fund and American Cancer Society to highlight ingredients research has linked to cancer risk — like processed meat preservatives, excess saturated fat and added sugars — and surfaces nutrients worth prioritising, like dietary fibre. This is dietary support, not medical advice. Always follow guidance from your oncology or medical team.",
  },
  cf: {
    fullName: 'Cystic Fibrosis',
    description:
      "Cystic fibrosis (CF) means your body produces thick, sticky mucus that affects your lungs and digestive system. Because your gut struggles to absorb fat and nutrients, people with CF typically need significantly more calories and fat than others — often 110–200% of the standard daily requirement. BiteInsight highlights products that are calorie-dense and nutritious, and flags 'diet', 'light' or low-fat products that may not meet your energy needs. It also tracks vitamins A, D, E and K, calcium, zinc and iron — nutrients that are commonly low in CF due to malabsorption. If you're on a CFTR modulator like Trikafta or Kaftrio, your needs may have shifted — pick the matching subtype to adjust the recommendations. Always follow guidance from your CF dietitian.",
  },
  ckd: {
    fullName: 'Chronic Kidney Disease (CKD)',
    description:
      'CKD means the kidneys gradually lose their ability to filter waste and excess fluid from the blood. Diet plays a big role in managing it, particularly limiting sodium, potassium, phosphorus and protein depending on the stage. Working with a renal dietitian is really important to get the balance right.',
  },
  coeliac: {
    fullName: 'Coeliac Disease',
    description:
      'Coeliac disease is an autoimmune condition where eating gluten damages the lining of the small intestine and stops it absorbing nutrients properly. The only treatment is a strict gluten-free diet. Even tiny amounts of gluten can cause a flare-up.',
  },
  crohns: {
    fullName: "Crohn's Disease",
    description:
      "Crohn's is a type of inflammatory bowel disease that can affect any part of the digestive tract. Foods that are high in fibre, spicy or rich in dairy can sometimes trigger flare-ups. Nutritional deficiencies are common, so keeping an eye on what you eat really matters.",
  },
  diabetes: {
    fullName: 'Diabetes (Type 1 or Type 2)',
    description:
      'Diabetes affects how your body processes blood sugar. Whether type 1 or type 2, managing carbohydrate intake, choosing low-GI foods and keeping sugar levels steady throughout the day are all central to feeling your best. Fibre, healthy fats and lean protein all help.',
  },
  diverticular: {
    fullName: 'Diverticular Disease',
    description:
      'Diverticular disease is when small pouches form in the wall of the colon. Eating plenty of fibre helps keep things moving and prevents flare-ups. If things do flare up (diverticulitis), a temporary switch to low-fibre or liquid foods is usually recommended.',
  },
  eczema: {
    fullName: 'Eczema / Psoriasis',
    description:
      'Eczema and psoriasis are inflammatory skin conditions that can be influenced by diet. Common food triggers include dairy, eggs, gluten and processed foods. Omega-3 fatty acids, zinc and foods rich in antioxidants may help calm inflammation and support skin health.',
  },
  endometriosis: {
    fullName: 'Endometriosis',
    description:
      'Endometriosis is a condition where tissue similar to the womb lining grows in other parts of the body, causing pain and inflammation. An anti-inflammatory diet rich in omega-3, fruits, vegetables and whole grains may help manage symptoms. Some people also find it helpful to reduce red meat and processed foods.',
  },
  gerd: {
    fullName: 'Gastroesophageal Reflux Disease (GERD)',
    description:
      'GERD happens when stomach acid regularly flows back up into the oesophagus, causing heartburn and irritation. Common triggers include acidic, fatty and spicy foods, as well as caffeine and alcohol. Eating smaller, more frequent meals can make a real difference.',
  },
  gout: {
    fullName: 'Gout',
    description:
      'Gout is a form of arthritis caused by a build-up of uric acid, which forms painful crystals in the joints. Foods high in purines, like red meat, organ meats and certain seafood, can trigger attacks. Staying hydrated and eating more plant-based foods can help keep uric acid levels in check.',
  },
  hashimotos: {
    fullName: "Hashimoto's Thyroiditis",
    description:
      "Hashimoto's is an autoimmune condition where the immune system attacks the thyroid gland, which often leads to an underactive thyroid. Nutrients like selenium, zinc and iodine support thyroid health. Some people also find it helps to cut back on gluten and heavily processed foods.",
  },
  heartDisease: {
    fullName: 'Heart Disease',
    description:
      'Heart disease covers a range of conditions affecting the heart and blood vessels. A heart-healthy diet focuses on reducing saturated fat, trans fats and sodium while increasing fibre, omega-3 fatty acids and plenty of fruit and vegetables. Small, consistent changes make the biggest impact over time.',
  },
  highCholesterol: {
    fullName: 'High Cholesterol',
    description:
      'High cholesterol means there is too much cholesterol in your blood, which can increase the risk of heart disease. Reducing saturated fats, eating more soluble fibre (oats, beans, lentils) and including heart-healthy fats like olive oil and nuts can all help bring levels down.',
  },
  hypertension: {
    fullName: 'Hypertension (High Blood Pressure)',
    description:
      'High blood pressure means the force of blood against your artery walls stays too high for too long, raising the risk of heart disease and stroke. Cutting down on salt, eating more potassium-rich foods and staying at a healthy weight are some of the most effective things you can do.',
  },
  hypothyroidism: {
    fullName: 'Hypothyroidism (Underactive Thyroid)',
    description:
      'Hypothyroidism means the thyroid gland does not produce enough hormones, which can slow your metabolism and leave you feeling tired. Iodine, selenium and zinc all support thyroid function. Some people find that reducing soy and cruciferous vegetables (when eaten raw in large amounts) helps too.',
  },
  ibs: {
    fullName: 'Irritable Bowel Syndrome (IBS)',
    description:
      'IBS is a common gut condition that causes bloating, cramps, diarrhoea or constipation. FODMAPs (certain fermentable carbohydrates) are one of the best-known triggers. Many people find that a low-FODMAP diet, ideally guided by a dietitian, makes a big difference.',
  },
  insulinResistance: {
    fullName: 'Insulin Resistance',
    description:
      'Insulin resistance means your cells do not respond to insulin as well as they should, which leads to higher blood sugar levels. It can be an early step on the path to type 2 diabetes. Eating low-GI foods, more fibre and fewer refined carbs can help your body use insulin more effectively.',
  },
  leakyGut: {
    fullName: 'Leaky Gut Syndrome',
    description:
      'Leaky gut is when the intestinal lining becomes more permeable than it should be, potentially letting toxins and undigested food particles through. Cutting out processed foods, alcohol and common allergens while adding gut-friendly nutrients like glutamine, zinc and probiotics may help repair the barrier.',
  },
  lupus: {
    fullName: 'Lupus',
    description:
      'Lupus is an autoimmune condition where the immune system attacks healthy tissue, causing widespread inflammation. An anti-inflammatory diet rich in omega-3, antioxidants and whole foods may help manage symptoms. It is also worth being mindful of vitamin D levels, as deficiency is common.',
  },
  me: {
    fullName: 'Myalgic Encephalomyelitis (ME / Chronic Fatigue Syndrome)',
    description:
      'ME causes extreme, lasting fatigue that rest alone does not fix. While there is no single dietary cure, eating anti-inflammatory foods, keeping blood sugar steady and getting enough B vitamins, magnesium and vitamin D may help manage energy levels day to day.',
  },
  migraine: {
    fullName: 'Migraine / Chronic Headaches',
    description:
      'Migraines are intense, recurring headaches often accompanied by nausea or sensitivity to light. Common dietary triggers include aged cheese, chocolate, alcohol (especially red wine), caffeine and foods containing tyramine or MSG. Keeping a food diary can help identify your personal triggers.',
  },
  ms: {
    fullName: 'Multiple Sclerosis (MS)',
    description:
      'MS is a condition where the immune system damages the protective coating around nerves, disrupting signals between the brain and body. Vitamin D, omega-3 fatty acids and an anti-inflammatory diet may all play a role in supporting nerve health.',
  },
  nafld: {
    fullName: 'Non-Alcoholic Fatty Liver Disease (NAFLD)',
    description:
      'NAFLD is a build-up of extra fat in the liver that is not caused by alcohol. It is closely tied to obesity, insulin resistance and high sugar intake. Reducing added sugars, refined carbs and saturated fats can help reverse it in its early stages.',
  },
  noGallbladder: {
    fullName: 'No Gallbladder',
    description:
      "Without a gallbladder, bile drips into the small intestine continuously instead of releasing in bursts when you eat. That makes large amounts of fat hard to digest, especially fried foods, high-fat dairy and fatty meats. You might notice bloating, diarrhoea or general discomfort after rich meals. Eating smaller, lower-fat meals and choosing unsaturated fats like olive oil and omega-3s is usually much better tolerated.",
  },
  pregnancy: {
    fullName: 'Pregnancy',
    description:
      "Pregnancy shifts your nutritional needs quite a bit. Folate, iron, calcium, iodine, choline and omega-3s all become more important, and some everyday foods like high mercury fish, unpasteurised dairy, pâté and deli meats are best avoided. With this turned on, we'll watch for those and suggest alternatives where we can. We'll also check in with you around your due date to see how things have progressed.",
  },
  pcos: {
    fullName: 'Polycystic Ovary Syndrome (PCOS)',
    description:
      'PCOS is a hormonal condition that affects the ovaries and is often linked to insulin resistance. Choosing low-GI foods, cutting back on refined carbs and eating more fibre can help balance hormones and ease symptoms.',
  },
  preDiabetes: {
    fullName: 'Pre-diabetes',
    description:
      'Pre-diabetes means your blood sugar levels are higher than normal but not yet high enough for a diabetes diagnosis. The good news is that it is often reversible with the right changes. Eating more whole grains, fibre and lean protein while cutting back on sugar and refined carbs can help bring levels back to normal.',
  },
  ra: {
    fullName: 'Rheumatoid Arthritis (RA)',
    description:
      'RA is an autoimmune condition that causes painful inflammation in the joints. Omega-3 fatty acids, antioxidants and anti-inflammatory foods may help reduce swelling, while processed foods and too much sugar can make things worse.',
  },
  fibromyalgia: {
    fullName: 'Fibromyalgia',
    description:
      'Fibromyalgia causes widespread muscle pain, fatigue and cognitive difficulties. While there is no single dietary cure, an anti-inflammatory approach may help manage symptoms. Reducing processed foods, refined sugars and artificial additives, while boosting magnesium, vitamin D and omega-3 intake, is generally recommended.',
  },
  sibo: {
    fullName: 'Small Intestinal Bacterial Overgrowth (SIBO)',
    description:
      'SIBO is when too much bacteria builds up in the small intestine, causing bloating, gas and poor nutrient absorption. A low-FODMAP or elemental diet is often used to bring the overgrowth under control. Fermented foods may need to be avoided during treatment.',
  },
  uc: {
    fullName: 'Ulcerative Colitis (UC)',
    description:
      'UC is a type of inflammatory bowel disease that affects the colon and rectum. During flare-ups, gentle, easy-to-digest foods tend to work best. Omega-3s and probiotics may help support remission alongside medication.',
  },

  // ── Allergies / Intolerances ───────────────────────────────────────────────
  celery: {
    fullName: 'Celery Allergy',
    description:
      'Celery allergy can cause reactions ranging from mild tingling in the mouth to severe anaphylaxis. Celery and celeriac are found in many soups, stocks, salads and seasoning blends. In the EU, celery is one of the 14 major allergens that must be listed on food labels.',
  },
  egg: {
    fullName: 'Egg Allergy',
    description:
      'Egg allergy is one of the most common food allergies, especially in children. Eggs can be hidden in baked goods, pasta, sauces and processed foods. Look out for ingredients like albumin, lysozyme and lecithin (though lecithin is more often soy-based).',
  },
  fish: {
    fullName: 'Fish Allergy',
    description:
      'A fish allergy means your immune system reacts to proteins found in finned fish. It is different from a shellfish allergy and one does not necessarily mean you have the other. Fish proteins can also turn up in Worcestershire sauce, Caesar dressing and some Asian condiments.',
  },
  fructose: {
    fullName: 'Fructose Intolerance',
    description:
      'Fructose intolerance means your body has difficulty absorbing fructose, the natural sugar found in fruit, honey and many processed foods. It can cause bloating, cramps and diarrhoea. Reducing high-fructose foods and avoiding sweeteners like agave and high-fructose corn syrup usually helps.',
  },
  gluten: {
    fullName: 'Gluten Intolerance',
    description:
      'Gluten intolerance (non-coeliac gluten sensitivity) causes digestive discomfort, fatigue or brain fog after eating gluten, but without the intestinal damage seen in coeliac disease. Reducing or avoiding wheat, barley and rye usually resolves symptoms. Oats are tolerated by most people but can be cross-contaminated.',
  },
  histamine: {
    fullName: 'Histamine Intolerance',
    description:
      'Histamine intolerance happens when your body cannot break down histamine efficiently, leading to headaches, flushing, hives or digestive issues. High-histamine foods include aged cheeses, cured meats, fermented foods and alcohol. Eating fresh, unprocessed foods is the best way to manage it.',
  },
  lactose: {
    fullName: 'Lactose Intolerance',
    description:
      'Lactose intolerance means your body does not produce enough lactase to break down the sugar in milk and dairy products. This causes bloating, cramps and diarrhoea. Hard cheeses and yoghurt are often better tolerated, and there are plenty of lactose-free alternatives available.',
  },
  lupin: {
    fullName: 'Lupin Allergy',
    description:
      'Lupin is a legume increasingly used in gluten-free baking and continental European foods. If you are allergic to peanuts, you may also react to lupin. It is listed as one of the 14 major allergens in the EU and must be declared on food packaging.',
  },
  msg: {
    fullName: 'MSG Sensitivity',
    description:
      'Some people are sensitive to monosodium glutamate (MSG), a flavour enhancer found in many processed and restaurant foods. It can cause headaches, flushing and sweating. On labels, look out for "MSG", "glutamate" or "E621".',
  },
  mustard: {
    fullName: 'Mustard Allergy',
    description:
      'Mustard allergy can cause reactions from mild skin irritation to severe anaphylaxis. Mustard is found in obvious places like condiments and dressings, but also in less obvious ones like marinades, sausages and curry powders. It is one of the 14 EU-listed allergens.',
  },
  peanut: {
    fullName: 'Peanut Allergy',
    description:
      'Peanut allergy is one of the most common causes of severe allergic reactions (anaphylaxis). Peanuts are legumes, not tree nuts, but cross-reactivity can occur. They can be hidden in sauces, baked goods and processed snacks, so careful label reading is essential.',
  },
  salicylate: {
    fullName: 'Salicylate Sensitivity',
    description:
      'Salicylates are natural chemicals found in many fruits, vegetables, herbs and spices, as well as aspirin. Sensitivity can cause hives, nasal congestion, digestive issues or asthma-like symptoms. A low-salicylate diet, guided by a dietitian, can help identify your tolerance level.',
  },
  sesame: {
    fullName: 'Sesame Allergy',
    description:
      'Sesame allergy can range from mild to life-threatening. Sesame seeds and sesame oil are common in hummus, tahini, bread, Asian cooking and many processed foods. It is now recognised as a major allergen in the UK, EU and US.',
  },
  shellfish: {
    fullName: 'Shellfish Allergy',
    description:
      'Shellfish allergy covers reactions to crustaceans (prawns, crab, lobster) and sometimes molluscs (mussels, oysters, squid). It is one of the most common food allergies in adults. Shellfish proteins can also be found in fish sauces, stock cubes and some supplements like glucosamine.',
  },
  soy: {
    fullName: 'Soy Allergy',
    description:
      'Soy is found in a huge range of processed foods, from bread and cereals to sauces and ready meals. Soy lecithin, soy protein and soybean oil are all common ingredients. If you have a soy allergy, reading labels carefully is a must.',
  },
  sulphite: {
    fullName: 'Sulphite Sensitivity',
    description:
      'Sulphites are preservatives used in dried fruits, wine, beer, pickled foods and some processed meats. Sensitivity can trigger asthma-like symptoms, headaches and skin reactions. On labels, they appear as E220 to E228, or as "sulphur dioxide" or "sulphites".',
  },
  aloeVera: {
    fullName: 'Aloe Vera Allergy',
    description:
      'Aloe vera allergy can cause skin reactions, stomach cramps, or diarrhoea in sensitive individuals. Aloe vera latex (the yellow part beneath the skin) is a stronger irritant than the gel. It is increasingly found in functional drinks, supplements, skincare-adjacent food products and some plant-based products.',
  },
  dairy: {
    fullName: 'Dairy Allergy',
    description:
      'A dairy allergy is an immune response to proteins in milk — primarily casein and whey — and is distinct from lactose intolerance. Reactions can range from hives and digestive upset to anaphylaxis. Dairy proteins can be hidden in processed foods labelled as "non-dairy" if they still contain casein or whey.',
  },
  raspberry: {
    fullName: 'Raspberry Allergy',
    description:
      'Raspberry allergy is related to salicylates and naturally occurring compounds in the fruit. Reactions can include oral allergy syndrome, hives, digestive upset or, rarely, anaphylaxis. Raspberry flavouring, seeds and extracts may also trigger reactions and are commonly found in desserts, yoghurts, drinks and confectionery.',
  },
  treeNut: {
    fullName: 'Tree Nut Allergy',
    description:
      'Tree nut allergy covers almonds, cashews, walnuts, hazelnuts, pecans, pistachios, Brazil nuts and macadamias. Reactions can be severe, including anaphylaxis. Tree nuts turn up in baked goods, cereals, pesto, marzipan and many processed foods, so label checking is important.',
  },

  // ── Dietary Preferences ────────────────────────────────────────────────────
  childFriendly: {
    fullName: 'Child-Friendly / Additive-Free',
    description:
      'This preference highlights products that are free from artificial colours, flavours and preservatives, particularly the "Southampton Six" additives linked to hyperactivity in children. Great for parents who want cleaner ingredient lists for their family.',
  },
  cleanEating: {
    fullName: 'Clean Eating',
    description:
      'Clean eating focuses on whole, minimally processed foods and avoiding artificial additives, refined sugars and heavily processed ingredients. It is about choosing foods that are as close to their natural state as possible.',
  },
  dairyFree: {
    fullName: 'Dairy-Free',
    description:
      'A dairy-free diet avoids all milk and milk-derived products, including cheese, butter, cream and yoghurt. This may be for allergy, intolerance or personal preference. Watch out for hidden dairy in processed foods (whey, casein, lactose).',
  },
  fodmap: {
    fullName: 'FODMAP Diet',
    description:
      'The FODMAP diet limits certain short-chain carbohydrates (Fermentable Oligosaccharides, Disaccharides, Monosaccharides and Polyols) that are poorly absorbed and can trigger IBS symptoms. It starts with an elimination phase, then gradually reintroduces foods to find your personal triggers.',
  },
  keto: {
    fullName: 'Low-Carb / Keto',
    description:
      'A ketogenic or low-carb diet significantly reduces carbohydrate intake and replaces it with fat, pushing the body into a state called ketosis. This preference will flag high-carb products and highlight those that fit within a low-carb framework.',
  },
  lowFiber: {
    fullName: 'Low Fibre',
    description:
      "A low fibre diet is usually something a doctor recommends rather than a lifestyle choice. It's often used during an IBS or IBD flare, after bowel surgery, during chemotherapy, or to prepare for a colonoscopy. With this turned on, high fibre foods like wholegrains, beans, nuts, seeds and the skins of raw fruit and veg will be flagged. Talk to your healthcare provider if you're not sure whether this is right for you.",
  },
  highProtein: {
    fullName: 'High-Protein / Fitness',
    description:
      'A high-protein diet supports muscle growth, recovery and satiety. This preference highlights products with strong protein content and flags those that are low in protein relative to their calories. Useful for anyone focused on fitness, strength training or active lifestyles.',
  },
  paleo: {
    fullName: 'Paleo Diet',
    description:
      'The paleo diet focuses on foods our ancestors would have eaten: meat, fish, vegetables, fruits, nuts and seeds, while avoiding grains, legumes, dairy and processed foods. The idea is to eat in a way that is more aligned with how humans evolved.',
  },
  plantBased: {
    fullName: 'Plant-Based',
    description:
      'A plant-based diet emphasises foods from plants, including vegetables, fruits, grains, legumes, nuts and seeds. It does not necessarily mean fully vegan, but it puts plant foods at the centre of every meal.',
  },
  postBariatric: {
    fullName: 'Post-Bariatric Surgery',
    description:
      'After bariatric (weight loss) surgery, the stomach is much smaller and nutrient absorption changes. Meals need to be small, high in protein and low in sugar. This preference helps identify suitable products and flags those that could cause dumping syndrome or discomfort.',
  },
  sustainable: {
    fullName: 'Sustainable / Eco',
    description:
      'This preference supports making food choices with a lower environmental impact. It considers factors like packaging, food miles, palm oil use and ingredients linked to deforestation or high carbon emissions.',
  },
  weightLoss: {
    fullName: 'Weight Loss',
    description:
      'This preference is for anyone managing their weight. It highlights calorie-dense products, flags high sugar and saturated fat, and helps identify foods that are lower in calories while still nutritious and satisfying.',
  },
  whole30: {
    fullName: 'Whole30',
    description:
      'Whole30 is a 30-day elimination programme that removes sugar, alcohol, grains, legumes, soy and dairy to help identify how different foods affect your body. After the 30 days, foods are gradually reintroduced one at a time.',
  },
  mediterraneanDiet: {
    fullName: 'Mediterranean Diet',
    description:
      'The Mediterranean diet is based on the traditional eating patterns of countries bordering the Mediterranean Sea. It emphasises fruits, vegetables, whole grains, legumes, nuts, olive oil and fish, while limiting red meat, processed foods and saturated fats. It is consistently linked to improved heart health, reduced inflammation and longevity.',
  },
  vegan: {
    fullName: 'Vegan',
    description:
      'A vegan diet excludes all animal products, including meat, fish, dairy, eggs and honey. It is important to pay attention to protein sources, vitamin B12, iron, calcium and omega-3 to make sure nutritional needs are fully met.',
  },
  vegetarian: {
    fullName: 'Vegetarian',
    description:
      'A vegetarian diet excludes meat and fish but typically includes dairy and eggs. It is one of the most common dietary choices worldwide. Getting enough iron, zinc, omega-3 and vitamin B12 is worth keeping in mind.',
  },
};
