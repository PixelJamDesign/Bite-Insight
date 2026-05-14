#!/usr/bin/env node

/**
 * build-offline-db.js
 *
 * Downloads the Open Food Facts CSV data dump and builds lean SQLite
 * databases for offline barcode scanning, one per supported region.
 *
 * Usage:
 *   npm run build:offline-db            # Build all 6 regions (single-pass)
 *   npm run build:offline-db -- --region gb   # Build only one region
 *
 * Prerequisites (devDependencies):
 *   npm install --save-dev better-sqlite3 csv-parse
 *
 * Output:
 *   scripts/output/offline_{code}_products.db   — SQLite databases
 *   scripts/output/manifest.json                — Global manifest for the app
 *
 * After running, upload all files to your Supabase Storage bucket
 * ("offline-databases") for the app to download.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const zlib = require('zlib');
const { parse } = require('csv-parse');
const Database = require('better-sqlite3');

// ── Config ───────────────────────────────────────────────────────────────────
const CSV_URL =
  'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';
const OUTPUT_DIR = path.join(__dirname, 'output');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');
const BATCH_SIZE = 5000;
const MIN_COMPLETENESS = 0; // No completeness filter — include all products with a name

// ── Region definitions ───────────────────────────────────────────────────────
const REGION_FILTERS = {
  gb: {
    label: 'United Kingdom',
    flag: '🇬🇧',
    tags: ['en:united-kingdom', 'en:uk', 'en:great-britain'],
  },
  us: {
    label: 'United States',
    flag: '🇺🇸',
    tags: ['en:united-states', 'en:us'],
  },
  fr: {
    label: 'France',
    flag: '🇫🇷',
    tags: ['en:france'],
  },
  de: {
    label: 'Germany',
    flag: '🇩🇪',
    tags: ['en:germany'],
  },
  es: {
    label: 'Spain',
    flag: '🇪🇸',
    tags: ['en:spain'],
  },
  it: {
    label: 'Italy',
    flag: '🇮🇹',
    tags: ['en:italy'],
  },
  in: {
    label: 'India',
    flag: '🇮🇳',
    tags: ['en:india'],
  },
  au: {
    label: 'Australia',
    flag: '🇦🇺',
    tags: ['en:australia'],
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function download(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        console.log(`  ↳ Redirecting to ${res.headers.location}`);
        download(res.headers.location).then(resolve).catch(reject);
        res.resume();
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        res.resume();
        return;
      }
      resolve(res);
    }).on('error', reject);
  });
}

/** Check which regions a product belongs to. Returns array of matching region codes. */
function matchRegions(countriesTags, regionCodes) {
  if (!countriesTags) return [];
  const lower = countriesTags.toLowerCase();
  const matches = [];
  for (const code of regionCodes) {
    const filter = REGION_FILTERS[code];
    if (filter.tags.some((tag) => lower.includes(tag))) {
      matches.push(code);
    }
  }
  return matches;
}

/** Parse a numeric field, returning null if empty or NaN. */
function num(val) {
  if (val === '' || val === undefined || val === null) return null;
  const n = parseFloat(val);
  return Number.isNaN(n) ? null : n;
}

/** Return a string or null if empty. */
function str(val) {
  if (val === '' || val === undefined || val === null) return null;
  return val;
}

/** Check if a product meets the quality threshold. */
function meetsQualityThreshold(record) {
  // Must have a barcode
  if (!str(record.code)) return false;

  // Must have a product name (minimum for user identification)
  const name =
    str(record.product_name) ||
    str(record.product_name_en) ||
    str(record.abbreviated_product_name) ||
    str(record.generic_name);
  if (!name) return false;

  // Everything else (nutrition, completeness) is optional — products
  // without nutrition data can still be identified when scanned offline.
  return true;
}

const CREATE_TABLE_SQL = `
  CREATE TABLE products (
    barcode               TEXT PRIMARY KEY,
    product_name          TEXT NOT NULL DEFAULT '',
    brand                 TEXT,
    image_url             TEXT,
    quantity              TEXT,
    nutriscore_grade      TEXT,
    energy_kcal           REAL,
    carbs                 REAL,
    sugars                REAL,
    fiber                 REAL,
    fat                   REAL,
    saturated_fat         REAL,
    proteins              REAL,
    salt                  REAL,
    serving_size          TEXT,
    energy_kcal_serving   REAL,
    carbs_serving         REAL,
    sugars_serving        REAL,
    fiber_serving         REAL,
    fat_serving           REAL,
    saturated_fat_serving REAL,
    proteins_serving      REAL,
    salt_serving          REAL,
    ingredients_text      TEXT,
    allergens             TEXT,
    ingredients_json      TEXT,
    off_lang              TEXT
  );

  CREATE TABLE metadata (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`;

const INSERT_SQL = `
  INSERT OR IGNORE INTO products (
    barcode, product_name, brand, image_url, quantity, nutriscore_grade,
    energy_kcal, carbs, sugars, fiber, fat, saturated_fat, proteins, salt,
    serving_size, energy_kcal_serving, carbs_serving, sugars_serving,
    fiber_serving, fat_serving, saturated_fat_serving, proteins_serving, salt_serving,
    ingredients_text, allergens, ingredients_json, off_lang
  ) VALUES (
    ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?
  )
`;

/** Extract a product row array from a CSV record. */
function extractRow(record) {
  const barcode = str(record.code);
  if (!barcode) return null;

  const productName =
    str(record.product_name) ||
    str(record.product_name_en) ||
    str(record.abbreviated_product_name) ||
    str(record.generic_name) ||
    '';

  return [
    barcode,
    productName,
    str(record.brands),
    str(record.image_front_url) || str(record.image_url),
    str(record.quantity),
    str(record.nutriscore_grade) || str(record.nutrition_grade_fr),
    num(record['energy-kcal_100g']),
    num(record.carbohydrates_100g),
    num(record.sugars_100g),
    num(record.fiber_100g),
    num(record.fat_100g),
    num(record['saturated-fat_100g']),
    num(record.proteins_100g),
    num(record.salt_100g),
    str(record.serving_size),
    num(record['energy-kcal_serving']),
    num(record.carbohydrates_serving),
    num(record.sugars_serving),
    num(record.fiber_serving),
    num(record.fat_serving),
    num(record['saturated-fat_serving']),
    num(record.proteins_serving),
    num(record.salt_serving),
    str(record.ingredients_text_en) || str(record.ingredients_text),
    str(record.allergens_tags),
    null, // ingredients_json — skip to save space
    str(record.lang) || str(record.lc) || 'en',
  ];
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Parse CLI args
  const args = process.argv.slice(2);
  const regionArgIdx = args.indexOf('--region');
  let regionCodes;

  if (regionArgIdx !== -1 && args[regionArgIdx + 1]) {
    const code = args[regionArgIdx + 1].toLowerCase();
    if (!REGION_FILTERS[code]) {
      console.error(`Unknown region: ${code}. Available: ${Object.keys(REGION_FILTERS).join(', ')}`);
      process.exit(1);
    }
    regionCodes = [code];
  } else {
    regionCodes = Object.keys(REGION_FILTERS);
  }

  console.log('=== BiteInsight Offline Database Builder ===\n');
  console.log(`Regions: ${regionCodes.map((c) => `${REGION_FILTERS[c].flag}  ${REGION_FILTERS[c].label} (${c})`).join(', ')}`);
  console.log(`Quality filter: requires product name (nutrition data optional)\n`);

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Set up a DB + insert statement + batch buffer per region
  const regionDbs = {};
  for (const code of regionCodes) {
    const dbPath = path.join(OUTPUT_DIR, `offline_${code}_products.db`);
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`  Removed old ${code} database.`);
    }
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.exec(CREATE_TABLE_SQL);

    const insert = db.prepare(INSERT_SQL);
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(...row);
    });

    regionDbs[code] = { db, insert, insertMany, batch: [], count: 0, dbPath };
  }

  console.log('\nDownloading Open Food Facts CSV dump...');
  console.log(`  URL: ${CSV_URL}\n`);

  const stream = await download(CSV_URL);

  const gunzip = zlib.createGunzip();
  const parser = parse({
    delimiter: '\t',
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  let processed = 0;
  let qualityFiltered = 0;

  parser.on('data', (record) => {
    processed++;

    if (processed % 100000 === 0) {
      const counts = regionCodes.map((c) => `${c}:${regionDbs[c].count}`).join(' ');
      console.log(`  ${(processed / 1000).toFixed(0)}K rows processed | ${counts} | filtered:${qualityFiltered}`);
    }

    // Quality filter first (before region check, saves work)
    if (!meetsQualityThreshold(record)) {
      qualityFiltered++;
      return;
    }

    // Check which regions this product belongs to
    const matches = matchRegions(record.countries_tags, regionCodes);
    if (matches.length === 0) return;

    // Extract row data once
    const row = extractRow(record);
    if (!row) return;

    // Insert into each matching region's DB
    for (const code of matches) {
      const rd = regionDbs[code];
      rd.batch.push(row);
      rd.count++;

      if (rd.batch.length >= BATCH_SIZE) {
        rd.insertMany(rd.batch);
        rd.batch = [];
      }
    }
  });

  await new Promise((resolve, reject) => {
    parser.on('end', () => {
      // Flush remaining batches
      for (const code of regionCodes) {
        const rd = regionDbs[code];
        if (rd.batch.length > 0) {
          rd.insertMany(rd.batch);
          rd.batch = [];
        }
      }
      resolve();
    });
    parser.on('error', reject);
    stream.pipe(gunzip).pipe(parser);
  });

  console.log(`\nDone! Processed ${processed.toLocaleString()} total rows.`);
  console.log(`Quality filtered: ${qualityFiltered.toLocaleString()} rows.\n`);

  // Finalize each region DB and build manifest
  const today = new Date().toISOString().slice(0, 10);
  const manifestRegions = {};

  for (const code of regionCodes) {
    const rd = regionDbs[code];
    const filter = REGION_FILTERS[code];

    console.log(`${filter.flag}  ${filter.label}: ${rd.count.toLocaleString()} products`);

    // Write metadata into the DB
    const insertMeta = rd.db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
    insertMeta.run('version', today);
    insertMeta.run('product_count', String(rd.count));
    insertMeta.run('build_date', new Date().toISOString());
    insertMeta.run('region', code);

    // Optimize
    rd.db.pragma('journal_mode = DELETE');
    rd.db.exec('VACUUM');
    rd.db.close();

    // Get file size
    const stat = fs.statSync(rd.dbPath);
    const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
    console.log(`   → ${sizeMB} MB (${rd.dbPath})`);

    manifestRegions[code] = {
      filename: `offline_${code}_products.db`,
      sizeBytes: stat.size,
      productCount: rd.count,
      label: filter.label,
      flag: filter.flag,
    };
  }

  // Write global manifest
  const manifest = {
    version: today,
    buildDate: new Date().toISOString(),
    regions: manifestRegions,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(`\nManifest written to: ${MANIFEST_PATH}`);
  console.log('\nUpload all .db files and manifest.json to a GitHub Release.');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
