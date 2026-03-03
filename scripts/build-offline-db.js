#!/usr/bin/env node

/**
 * build-offline-db.js
 *
 * Downloads the Open Food Facts CSV data dump, filters to UK products,
 * extracts only the columns the BiteInsight app uses, and writes them
 * to a lean SQLite database for offline barcode scanning.
 *
 * Usage:
 *   npm run build:offline-db
 *
 * Prerequisites (devDependencies):
 *   npm install --save-dev better-sqlite3 csv-parse
 *
 * Output:
 *   scripts/output/offline_uk_products.db   — SQLite database
 *   scripts/output/manifest.json            — Version manifest for the app
 *
 * After running, upload both files to your Supabase Storage bucket
 * (e.g. "offline-databases") and update the URLs in lib/offlineDatabase.ts.
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
const DB_PATH = path.join(OUTPUT_DIR, 'offline_uk_products.db');
const MANIFEST_PATH = path.join(OUTPUT_DIR, 'manifest.json');

// ── Helpers ──────────────────────────────────────────────────────────────────

function download(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (res) => {
      // Follow redirects
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

/** Check if a product's countries_tags includes the UK. */
function isUkProduct(countriesTags) {
  if (!countriesTags) return false;
  const lower = countriesTags.toLowerCase();
  return (
    lower.includes('en:united-kingdom') ||
    lower.includes('en:uk') ||
    lower.includes('en:great-britain')
  );
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

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== BiteInsight Offline UK Database Builder ===\n');

  // Ensure output directory
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Remove old database if exists
  if (fs.existsSync(DB_PATH)) {
    fs.unlinkSync(DB_PATH);
    console.log('Removed old database.\n');
  }

  // Create SQLite database
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
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
  `);

  const insert = db.prepare(`
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
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(...row);
    }
  });

  console.log('Downloading Open Food Facts CSV dump...');
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
  let inserted = 0;
  let batch = [];
  const BATCH_SIZE = 5000;

  parser.on('data', (record) => {
    processed++;

    // Log progress every 100K rows
    if (processed % 100000 === 0) {
      console.log(`  Processed ${(processed / 1000).toFixed(0)}K rows, inserted ${inserted} UK products...`);
    }

    // Filter: only UK products
    if (!isUkProduct(record.countries_tags)) return;

    // Skip if no barcode
    const barcode = str(record.code);
    if (!barcode) return;

    // Skip if no product name
    const productName =
      str(record.product_name) ||
      str(record.product_name_en) ||
      str(record.abbreviated_product_name) ||
      str(record.generic_name) ||
      '';
    if (!productName) return;

    const row = [
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
      null, // ingredients_json — skip to save space, too large in bulk
      str(record.lang) || str(record.lc) || 'en',
    ];

    batch.push(row);
    inserted++;

    if (batch.length >= BATCH_SIZE) {
      insertMany(batch);
      batch = [];
    }
  });

  await new Promise((resolve, reject) => {
    parser.on('end', () => {
      // Flush remaining batch
      if (batch.length > 0) {
        insertMany(batch);
        batch = [];
      }
      resolve();
    });
    parser.on('error', reject);
    stream.pipe(gunzip).pipe(parser);
  });

  console.log(`\nDone! Processed ${processed.toLocaleString()} total rows.`);
  console.log(`Inserted ${inserted.toLocaleString()} UK products.\n`);

  // Write metadata
  const today = new Date().toISOString().slice(0, 10);
  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)');
  insertMeta.run('version', today);
  insertMeta.run('product_count', String(inserted));
  insertMeta.run('build_date', new Date().toISOString());

  // Optimize database
  console.log('Optimizing database...');
  db.pragma('journal_mode = DELETE'); // Switch from WAL for portability
  db.exec('VACUUM');
  db.close();

  // Get file size
  const stat = fs.statSync(DB_PATH);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);
  console.log(`Database size: ${sizeMB} MB\n`);

  // Write manifest
  const manifest = {
    version: today,
    sizeBytes: stat.size,
    filename: 'offline_uk_products.db',
    productCount: inserted,
    buildDate: new Date().toISOString(),
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written to: ${MANIFEST_PATH}`);
  console.log(`Database written to: ${DB_PATH}`);
  console.log('\nUpload both files to your Supabase Storage bucket to make them available in the app.');
}

main().catch((err) => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
