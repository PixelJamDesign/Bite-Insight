/**
 * productCache.ts
 *
 * SQLite-backed local cache for Open Food Facts product data.
 * Lookup order in scanner: cache → OFF API → save to cache.
 *
 * This means:
 *  - Any previously scanned barcode works instantly offline
 *  - The local database grows organically with use
 *  - OFF API is only hit when a barcode has never been seen before
 */

import * as SQLite from 'expo-sqlite';

export type CachedProduct = {
  barcode: string;
  productName: string;
  brand: string | null;
  imageUrl: string | null;
  quantity: string | null;
  nutriscoreGrade: string | null;
  energyKcal: number | null;
  carbs: number | null;
  sugars: number | null;
  fiber: number | null;
  fat: number | null;
  saturatedFat: number | null;
  proteins: number | null;
  salt: number | null;
  // Per-serving values (from OFF nutriments *_serving fields)
  servingSize: string | null;
  energyKcalServing: number | null;
  carbsServing: number | null;
  sugarsServing: number | null;
  fiberServing: number | null;
  fatServing: number | null;
  saturatedFatServing: number | null;
  proteinsServing: number | null;
  saltServing: number | null;
  ingredientsText: string | null;
  allergens: string | null;      // comma-separated, e.g. "en:gluten,en:milk"
  ingredientsJson: string | null; // JSON.stringify(product.ingredients) from OFF API
  offLang: string | null;         // OFF product language code, e.g. "en", "fr", "de"
  cachedAt: number;              // Unix ms
};

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('biteinsight_products.db');
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS product_cache (
      barcode          TEXT PRIMARY KEY,
      product_name     TEXT NOT NULL DEFAULT '',
      brand            TEXT,
      image_url        TEXT,
      quantity         TEXT,
      nutriscore_grade TEXT,
      energy_kcal      REAL,
      carbs            REAL,
      sugars           REAL,
      fiber            REAL,
      fat              REAL,
      saturated_fat    REAL,
      proteins         REAL,
      salt             REAL,
      ingredients_text TEXT,
      allergens        TEXT,
      ingredients_json TEXT,
      cached_at        INTEGER NOT NULL
    );
  `);
  // Migrations: add columns for existing databases that predate them
  const migrations = [
    'ALTER TABLE product_cache ADD COLUMN ingredients_json TEXT;',
    'ALTER TABLE product_cache ADD COLUMN serving_size TEXT;',
    'ALTER TABLE product_cache ADD COLUMN energy_kcal_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN carbs_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN sugars_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN fiber_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN fat_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN saturated_fat_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN proteins_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN salt_serving REAL;',
    'ALTER TABLE product_cache ADD COLUMN off_lang TEXT;',
  ];
  for (const sql of migrations) {
    try { await _db.execAsync(sql); } catch { /* column already exists */ }
  }
  return _db;
}

/** Returns the cached product or null if not found. */
export async function getCachedProduct(barcode: string): Promise<CachedProduct | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    barcode: string;
    product_name: string;
    brand: string | null;
    image_url: string | null;
    quantity: string | null;
    nutriscore_grade: string | null;
    energy_kcal: number | null;
    carbs: number | null;
    sugars: number | null;
    fiber: number | null;
    fat: number | null;
    saturated_fat: number | null;
    proteins: number | null;
    salt: number | null;
    serving_size: string | null;
    energy_kcal_serving: number | null;
    carbs_serving: number | null;
    sugars_serving: number | null;
    fiber_serving: number | null;
    fat_serving: number | null;
    saturated_fat_serving: number | null;
    proteins_serving: number | null;
    salt_serving: number | null;
    ingredients_text: string | null;
    allergens: string | null;
    ingredients_json: string | null;
    off_lang: string | null;
    cached_at: number;
  }>(
    'SELECT * FROM product_cache WHERE barcode = ?',
    [barcode],
  );
  if (!row) return null;
  return {
    barcode: row.barcode,
    productName: row.product_name,
    brand: row.brand,
    imageUrl: row.image_url,
    quantity: row.quantity,
    nutriscoreGrade: row.nutriscore_grade,
    energyKcal: row.energy_kcal,
    carbs: row.carbs,
    sugars: row.sugars,
    fiber: row.fiber,
    fat: row.fat,
    saturatedFat: row.saturated_fat,
    proteins: row.proteins,
    salt: row.salt,
    servingSize: row.serving_size,
    energyKcalServing: row.energy_kcal_serving,
    carbsServing: row.carbs_serving,
    sugarsServing: row.sugars_serving,
    fiberServing: row.fiber_serving,
    fatServing: row.fat_serving,
    saturatedFatServing: row.saturated_fat_serving,
    proteinsServing: row.proteins_serving,
    saltServing: row.salt_serving,
    ingredientsText: row.ingredients_text,
    allergens: row.allergens,
    ingredientsJson: row.ingredients_json,
    offLang: row.off_lang,
    cachedAt: row.cached_at,
  };
}

/** Inserts or replaces a product in the local cache. */
export async function cacheProduct(product: Omit<CachedProduct, 'cachedAt'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO product_cache (
      barcode, product_name, brand, image_url, quantity, nutriscore_grade,
      energy_kcal, carbs, sugars, fiber, fat, saturated_fat,
      proteins, salt,
      serving_size, energy_kcal_serving, carbs_serving, sugars_serving,
      fiber_serving, fat_serving, saturated_fat_serving, proteins_serving, salt_serving,
      ingredients_text, allergens, ingredients_json, off_lang, cached_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.barcode,
      product.productName,
      product.brand,
      product.imageUrl,
      product.quantity,
      product.nutriscoreGrade,
      product.energyKcal,
      product.carbs,
      product.sugars,
      product.fiber,
      product.fat,
      product.saturatedFat,
      product.proteins,
      product.salt,
      product.servingSize,
      product.energyKcalServing,
      product.carbsServing,
      product.sugarsServing,
      product.fiberServing,
      product.fatServing,
      product.saturatedFatServing,
      product.proteinsServing,
      product.saltServing,
      product.ingredientsText,
      product.allergens,
      product.ingredientsJson,
      product.offLang,
      Date.now(),
    ],
  );
}
