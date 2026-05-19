#!/usr/bin/env node
// Validates the taxonomy-driven health-condition matcher.
//
// Pulls 20 random product barcodes from the GB offline DB, fetches the
// FULL product (with structured ingredient IDs) from the live OFF API,
// runs them against 10 random migrated conditions, and cross-references
// every flagged ingredient against the actual ingredients_text.
//
// Run: node scripts/validate-taxonomy-matcher.js [seed]

const path = require('path');
const fs = require('fs');
const https = require('https');
const Database = require('better-sqlite3');

const SEED = parseInt(process.argv[2] || '42', 10);
const PRODUCT_COUNT = 20;
const CONDITION_COUNT = 10;

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

// ── Load taxonomy + overrides ───────────────────────────────────────────────
const OFF_TAXONOMY = require(path.join(__dirname, '..', 'constants', 'offTaxonomy.json'));
const overridesSrc = fs.readFileSync(
  path.join(__dirname, '..', 'constants', 'taxonomyOverrides.ts'),
  'utf8',
);
const overridesMatch = overridesSrc.match(/TAXONOMY_OVERRIDES[^=]*=\s*(\{[\s\S]*?\n\});/);
// eslint-disable-next-line no-eval
const TAXONOMY_OVERRIDES = eval('(' + overridesMatch[1] + ')');

function getParents(id) {
  const lc = id.toLowerCase();
  const off = OFF_TAXONOMY[lc] || [];
  const overrides = TAXONOMY_OVERRIDES[lc] || [];
  if (!overrides.length) return off;
  if (!off.length) return overrides;
  return Array.from(new Set([...off, ...overrides]));
}
const ancestorCache = new Map();
function ancestorsOf(id) {
  const lc = id.toLowerCase();
  if (ancestorCache.has(lc)) return ancestorCache.get(lc);
  const ancestors = new Set();
  const queue = [lc];
  const seen = new Set([lc]);
  while (queue.length) {
    const cur = queue.shift();
    for (const p of getParents(cur)) {
      const pLc = p.toLowerCase();
      if (seen.has(pLc)) continue;
      seen.add(pLc);
      ancestors.add(pLc);
      queue.push(pLc);
    }
  }
  ancestorCache.set(lc, ancestors);
  return ancestors;
}
function matchingAncestors(id, targets) {
  if (!id || !targets.length) return [];
  const lc = id.toLowerCase();
  const anc = ancestorsOf(lc);
  return targets.filter((t) => lc === t.toLowerCase() || anc.has(t.toLowerCase()));
}

// ── Extract conditions ──────────────────────────────────────────────────────
const flagsSrc = fs.readFileSync(
  path.join(__dirname, '..', 'constants', 'healthIngredientFlags.ts'),
  'utf8',
);
function extractConditions(src, exportName) {
  const start = src.indexOf(`export const ${exportName}`);
  if (start === -1) return {};
  let i = src.indexOf('{', start);
  let depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  const block = src.slice(i, end + 1);
  const conditions = {};
  const re = /(\w+):\s*\{/g;
  const keyPositions = [];
  let m;
  while ((m = re.exec(block))) {
    let d = 0;
    for (let k = 0; k < m.index; k++) {
      if (block[k] === '{') d++;
      else if (block[k] === '}') d--;
    }
    if (d === 1) keyPositions.push({ name: m[1], start: m.index });
  }
  for (let k = 0; k < keyPositions.length; k++) {
    const kp = keyPositions[k];
    const next = keyPositions[k + 1] ? keyPositions[k + 1].start : block.length;
    const slice = block.slice(kp.start, next);
    const ancMatch = slice.match(/flagsTaxonomyAncestors:\s*\[([^\]]*)\]/);
    const ancestors = ancMatch
      ? ancMatch[1].split(',').map((s) => s.trim().replace(/['"]/g, '')).filter(Boolean)
      : [];
    conditions[kp.name] = { flagsTaxonomyAncestors: ancestors };
  }
  return conditions;
}
const HEALTH_CONDITIONS = extractConditions(flagsSrc, 'HEALTH_CONDITION_INGREDIENTS');
const DIETARY_PREFS = extractConditions(flagsSrc, 'DIETARY_PREFERENCE_INGREDIENTS');
const allConditions = { ...HEALTH_CONDITIONS, ...DIETARY_PREFS };
const migrated = Object.entries(allConditions).filter(
  ([_k, v]) => v.flagsTaxonomyAncestors && v.flagsTaxonomyAncestors.length > 0,
);
console.log(`▸ ${migrated.length} conditions migrated. Picking ${CONDITION_COUNT}.\n`);
const chosenConditions = pickN(migrated, CONDITION_COUNT);

// ── Fetch products from OFF live API ────────────────────────────────────────
function fetchProduct(barcode) {
  return new Promise((resolve, reject) => {
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=code,product_name,brands,ingredients,ingredients_text`;
    https.get(url, { headers: { 'User-Agent': 'BiteInsight-validation/1.6.2' } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
        catch (e) { reject(e); }
      });
      res.on('error', reject);
    });
  });
}

async function main() {
  // Pick random barcodes from offline DB
  const DB_PATH = path.join(__dirname, 'output', 'offline_gb_products.db');
  const db = new Database(DB_PATH, { readonly: true });
  const total = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
  console.log(`▸ GB offline DB has ${total.toLocaleString()} products. Sampling ${PRODUCT_COUNT * 2} barcodes (will keep ${PRODUCT_COUNT} that have parsed ingredients).\n`);
  const candidates = db
    .prepare(
      `SELECT barcode FROM products
       WHERE ingredients_text IS NOT NULL
         AND length(ingredients_text) > 30
       ORDER BY random()
       LIMIT ?`,
    )
    .all(PRODUCT_COUNT * 3);

  const products = [];
  for (const { barcode } of candidates) {
    if (products.length >= PRODUCT_COUNT) break;
    process.stdout.write(`  fetching ${barcode}…  `);
    let resp;
    try { resp = await fetchProduct(barcode); }
    catch (e) { console.log('error'); continue; }
    const p = resp && resp.product;
    const hasIngredients = p && Array.isArray(p.ingredients) && p.ingredients.length > 0
                              && p.ingredients_text && p.ingredients_text.length > 20;
    if (!hasIngredients) { console.log('skip (no parsed ingredients)'); continue; }
    console.log('ok');
    products.push({
      barcode: p.code,
      product_name: p.product_name || '(unnamed)',
      brand: p.brands || '',
      ingredients_text: p.ingredients_text,
      ingredients: p.ingredients,
    });
    await new Promise((r) => setTimeout(r, 250)); // be polite
  }
  console.log(`\n▸ ${products.length} products with parsed ingredients ready.\n`);

  // ── Run matcher + cross-reference ────────────────────────────────────────
  function flatten(nodes, out = []) {
    for (const n of nodes || []) {
      out.push(n);
      if (n.ingredients) flatten(n.ingredients, out);
    }
    return out;
  }

  let totalFlags = 0, presentInText = 0, missingFromText = 0;
  const missingDetails = [];

  console.log('═'.repeat(78));
  for (let p = 0; p < products.length; p++) {
    const prod = products[p];
    const ings = flatten(prod.ingredients);
    const lcText = (prod.ingredients_text || '').toLowerCase();

    console.log(`\n[${p + 1}/${products.length}] ${prod.product_name} — ${prod.brand || '(no brand)'}`);
    console.log(`     barcode: ${prod.barcode}`);
    console.log(`     ingredients: ${(prod.ingredients_text || '').slice(0, 140)}${prod.ingredients_text.length > 140 ? '…' : ''}`);

    let anyFlag = false;
    for (const [condKey, condEntry] of chosenConditions) {
      const hits = [];
      for (const ing of ings) {
        const id = (ing.id || '').toLowerCase();
        if (!id) continue;
        const matched = matchingAncestors(id, condEntry.flagsTaxonomyAncestors);
        if (matched.length > 0) hits.push({ id, text: ing.text || '', via: matched[0] });
      }
      if (hits.length === 0) continue;
      anyFlag = true;
      const seen = new Set();
      const uniq = hits.filter((h) => seen.has(h.id) ? false : (seen.add(h.id), true));
      console.log(`     ↳ ${condKey}: ${uniq.length} flag${uniq.length > 1 ? 's' : ''}`);
      for (const h of uniq) {
        totalFlags++;
        const candidate = (h.text || h.id.replace(/^en:/, '').replace(/-/g, ' ')).toLowerCase();
        const tokens = candidate.split(/[\s,]+/).filter((t) => t.length >= 3);
        const present =
          lcText.includes(candidate) ||
          (tokens.length > 0 && tokens.every((t) => lcText.includes(t)));
        const mark = present ? '✓' : '✗ MISSING';
        if (present) presentInText++;
        else {
          missingFromText++;
          missingDetails.push({
            product: prod.product_name,
            barcode: prod.barcode,
            condition: condKey,
            ingredientId: h.id,
            ingredientText: h.text,
            via: h.via,
            ingredients_text: prod.ingredients_text,
          });
        }
        console.log(`        ${mark}  ${h.id.padEnd(38)} (via ${h.via}) — "${h.text}"`);
      }
    }
    if (!anyFlag) console.log('     (no flags for any chosen condition)');
  }

  console.log('\n' + '═'.repeat(78));
  console.log('SUMMARY');
  console.log('═'.repeat(78));
  console.log(`Products tested:     ${products.length}`);
  console.log(`Conditions tested:   ${chosenConditions.map(([k]) => k).join(', ')}`);
  console.log(`Total flags raised:  ${totalFlags}`);
  console.log(`  ✓ present in text: ${presentInText}`);
  console.log(`  ✗ missing in text: ${missingFromText}`);
  if (totalFlags > 0) {
    const pct = ((presentInText / totalFlags) * 100).toFixed(1);
    console.log(`  accuracy:          ${pct}%`);
  }

  if (missingDetails.length > 0) {
    console.log('\n--- Flags raised but ingredient text seemed absent ---');
    for (const m of missingDetails) {
      console.log(`\n  ${m.product} (${m.barcode})`);
      console.log(`    condition:  ${m.condition}`);
      console.log(`    flagged:    ${m.ingredientId} ("${m.ingredientText}") via ${m.via}`);
      console.log(`    full text:  ${m.ingredients_text.slice(0, 200)}${m.ingredients_text.length > 200 ? '…' : ''}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
