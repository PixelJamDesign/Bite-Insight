const { createClient } = require("@supabase/supabase-js");
const Anthropic = require("@anthropic-ai/sdk");

// ============================================
// CONFIGURATION - Fill in your credentials
// ============================================
const SUPABASE_URL = process.env.SUPABASE_URL || ""; // e.g. https://xxxx.supabase.co
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ""; // Use service role key for admin access
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ""; // Optional: for auto-generating facts & dietary tags

const BUCKET_NAME = "ingredients";
const FOLDERS = [
  "Carbs & Wheat",
  "Dairy",
  "Drinks",
  "Fruit",
  "Herbs & Spices",
  "Legumes",
  "Meat & Protein",
  "Nuts",
  "Seeds",
  "Sweets",
  "Vegetables",
];

// ============================================
// Initialize clients
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let anthropic = null;
if (ANTHROPIC_API_KEY && ANTHROPIC_API_KEY !== "YOUR_ANTHROPIC_API_KEY") {
  anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
}

// ============================================
// Helper: Extract ingredient name from filename
// ============================================
function extractName(filename) {
  const name = filename.replace(/\.[^/.]+$/, "");
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

// ============================================
// Helper: Get public URL for a file
// ============================================
function getPublicUrl(filePath) {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

// ============================================
// Helper: Use Claude to generate fact & dietary tags
// ============================================
async function generateMetadata(ingredientName, category) {
  if (!anthropic) {
    return { fact: null, dietary_tags: null };
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `For the ingredient "${ingredientName}" (category: ${category}), provide:
1. A short nutritional fact (1-2 sentences max). Focus on key vitamins, minerals, macronutrients, or specific health benefits (e.g. "Rich in vitamin C and potassium, supporting immune function and heart health.")
2. Dietary tags as a comma-separated string (e.g. "vegan, gluten-free, high-protein")

Only use relevant tags from this list: vegan, vegetarian, gluten-free, dairy-free, nut-free, keto, paleo, high-protein, low-carb, whole-grain, sugar-free, lactose-free, soy-free, egg-free, halal, kosher

You MUST respond with ONLY valid JSON and nothing else. No explanation, no markdown, no text before or after. Just this exact format:
{"fact": "your fact here", "dietary_tags": "tag1, tag2, tag3"}`,
        },
      ],
    });

    let text = response.content[0].text.trim();
    // Remove markdown code fences if present
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(text);
    return {
      fact: parsed.fact || null,
      dietary_tags: parsed.dietary_tags || null,
    };
  } catch (error) {
    console.warn(
      `  ⚠ Could not generate metadata for ${ingredientName}:`,
      error.message
    );
    return { fact: null, dietary_tags: null };
  }
}

// ============================================
// Main: Process all folders and insert ingredients
// ============================================
async function main() {
  console.log("🚀 Starting ingredient population...\n");

  let totalInserted = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const folder of FOLDERS) {
    console.log(`📁 Processing folder: ${folder}`);

    // List all files in the folder
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, { limit: 1000 });

    if (error) {
      console.error(`  ❌ Error listing files in ${folder}:`, error.message);
      totalErrors++;
      continue;
    }

    if (!files || files.length === 0) {
      console.log(`  (empty folder, skipping)`);
      continue;
    }

    // Filter out non-image files and .emptyFolderPlaceholder
    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
    );

    console.log(`  Found ${imageFiles.length} images`);

    for (const file of imageFiles) {
      const ingredientName = extractName(file.name);
      const filePath = `${folder}/${file.name}`;
      const imageUrl = getPublicUrl(filePath);
      const category = folder;

      // Generate fact and dietary tags using Claude API
      const { fact, dietary_tags } = await generateMetadata(
        ingredientName,
        category
      );
      console.log(`  🔍 fact: ${fact}`);

      // Upsert into the ingredients table (update if exists, insert if not)
      const { error: insertError } = await supabase
        .from("ingredients")
        .upsert(
          {
            name: ingredientName,
            category: category,
            fact: fact,
            image_url: imageUrl,
            dietary_tags: dietary_tags
              ? dietary_tags.split(",").map((t) => t.trim())
              : null,
          },
          { onConflict: "name" }
        );

      if (insertError) {
        console.error(
          `  ❌ Error inserting "${ingredientName}":`,
          insertError.message
        );
        totalErrors++;
      } else {
        console.log(
          `  ✅ Inserted: ${ingredientName} | ${category} | ${dietary_tags || "no tags"}`
        );
        totalInserted++;
      }

      // Small delay to avoid rate limiting (Claude API)
      if (anthropic) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("");
  }

  console.log("========================================");
  console.log(`✅ Inserted: ${totalInserted}`);
  console.log(`⏭ Skipped (duplicates): ${totalSkipped}`);
  console.log(`❌ Errors: ${totalErrors}`);
  console.log("========================================");
}

main().catch(console.error);
