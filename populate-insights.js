const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk");

// ============================================
// CONFIGURATION - Fill in your credentials
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || ""; // e.g. https://xxxx.supabase.co
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ""; // Use service role key for admin access
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ""; // Optional: for auto-generating facts & dietary tags


const INSIGHTS_PER_CONDITION = 14;

// ============================================
// All conditions/profiles to generate insights for
// ============================================
const CONDITIONS = {
  "Health Conditions": [
    "Type 1 Diabetes",
    "Type 2 Diabetes",
    "PCOS",
    "Metabolic Syndrome",
    "Hypoglycaemia",
    "High Blood Pressure",
    "High Cholesterol",
    "Heart Disease",
    "Migraine",
    "ADHD",
    "Autism Spectrum",
    "Rheumatoid Arthritis",
    "Lupus",
    "Multiple Sclerosis",
    "Chronic Fatigue / ME",
    "Eczema / Psoriasis",
    "GERD / Acid Reflux",
    "IBS",
    "Crohn's Disease",
    "Ulcerative Colitis",
    "SIBO / Leaky Gut",
    "Lactose Intolerance",
    "Gluten Sensitivity / Coeliac",
    "Histamine Intolerance",
    "Salicylate Sensitivity",
    "Sulphite Sensitivity",
    "MSG Sensitivity",
    "Fructose Intolerance",
  ],
  Allergies: [
    "Peanut Allergy",
    "Tree Nut Allergy",
    "Soy Allergy",
    "Egg Allergy",
    "Sesame Allergy",
    "Shellfish Allergy",
  ],
  "Dietary Preferences": [
    "Vegan",
    "Vegetarian",
    "Dairy-Free",
    "Low-Carb / Keto",
    "Paleo",
    "Whole30",
    "FODMAP",
    "Plant-Based",
    "Clean Eating",
    "High-Protein / Fitness",
    "Pregnancy-Safe",
    "Child-Friendly",
    "Sustainable / Eco-Friendly",
    "Weight Loss",
  ],
};

// ============================================
// Initialize clients
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ============================================
// Generate insights for a single condition
// ============================================
async function generateInsights(condition, categoryType) {
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `Generate exactly ${INSIGHTS_PER_CONDITION} unique daily nutrition insights for someone with "${condition}" (category: ${categoryType}).

Rules:
- Each insight should be a short, actionable tip (1-2 sentences max)
- Focus on food choices, meal tips, ingredients to embrace or avoid, and practical nutrition advice
- Make them encouraging and empowering, not fear-based
- Vary the topics: breakfast ideas, snack swaps, nutrients to prioritise, cooking tips, ingredient alternatives, etc.
- Do NOT number them or add prefixes
- Each insight should also list which OTHER conditions from this list it could also be suitable for (only include genuinely relevant ones):
  Type 1 Diabetes, Type 2 Diabetes, PCOS, Metabolic Syndrome, Hypoglycaemia, High Blood Pressure, High Cholesterol, Heart Disease, Migraine, ADHD, Autism Spectrum, Rheumatoid Arthritis, Lupus, Multiple Sclerosis, Chronic Fatigue / ME, Eczema / Psoriasis, GERD / Acid Reflux, IBS, Crohn's Disease, Ulcerative Colitis, SIBO / Leaky Gut, Lactose Intolerance, Gluten Sensitivity / Coeliac, Histamine Intolerance, Salicylate Sensitivity, Sulphite Sensitivity, MSG Sensitivity, Fructose Intolerance, Peanut Allergy, Tree Nut Allergy, Soy Allergy, Egg Allergy, Sesame Allergy, Shellfish Allergy, Vegan, Vegetarian, Dairy-Free, Low-Carb / Keto, Paleo, Whole30, FODMAP, Plant-Based, Clean Eating, High-Protein / Fitness, Pregnancy-Safe, Child-Friendly, Sustainable / Eco-Friendly, Weight Loss

You MUST respond with ONLY a valid JSON array and nothing else. No explanation, no markdown, no text before or after. Example format:
[{"content": "your insight here", "suitable_for": ["${condition}", "Other Condition 1", "Other Condition 2"]}, ...]

IMPORTANT: Always include "${condition}" in the suitable_for array for every insight.`,
        },
      ],
    });

    let text = response.content[0].text.trim();
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    return parsed;
  } catch (error) {
    console.error(
      `  ❌ Failed to generate insights for ${condition}:`,
      error.message
    );
    return [];
  }
}

// ============================================
// Main
// ============================================
async function main() {
  console.log("🚀 Starting daily insights generation...\n");

  let totalInserted = 0;
  let totalErrors = 0;
  let totalDuplicates = 0;

  const allConditions = Object.entries(CONDITIONS);

  for (const [categoryType, conditions] of allConditions) {
    console.log(`\n📂 Category: ${categoryType}`);
    console.log("=".repeat(50));

    for (const condition of conditions) {
      console.log(`\n  🏷 Generating insights for: ${condition}`);

      const insights = await generateInsights(condition, categoryType);

      if (insights.length === 0) {
        console.log(`  ⚠ No insights generated, skipping`);
        totalErrors++;
        continue;
      }

      console.log(`  📝 Generated ${insights.length} insights`);

      for (const insight of insights) {
        // Check for duplicate content
        const { data: existing } = await supabase
          .from("daily_insights")
          .select("id")
          .eq("content", insight.content)
          .maybeSingle();

        if (existing) {
          totalDuplicates++;
          continue;
        }

        // Ensure the primary condition is always in suitable_for
        const suitableFor = insight.suitable_for || [condition];
        if (!suitableFor.includes(condition)) {
          suitableFor.unshift(condition);
        }

        const { error: insertError } = await supabase
          .from("daily_insights")
          .insert({
            content: insight.content,
            suitable_for: suitableFor,
          });

        if (insertError) {
          console.error(`  ❌ Insert error:`, insertError.message);
          totalErrors++;
        } else {
          totalInserted++;
        }
      }

      console.log(`  ✅ Inserted insights for ${condition}`);

      // Delay between API calls to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("\n========================================");
  console.log(`✅ Total inserted: ${totalInserted}`);
  console.log(`⏭ Duplicates skipped: ${totalDuplicates}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log("========================================");
}

main().catch(console.error);
