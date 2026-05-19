#!/usr/bin/env node
// Fetches the Open Food Facts ingredient taxonomy, prunes it to parent
// relationships only, and writes constants/offTaxonomy.json for bundling
// with the app. Run this whenever we want to refresh against upstream:
//
//   node scripts/build-taxonomy.js
//
// The pruned file is ~216 KB raw / ~57 KB gzipped, so we bundle it
// directly rather than fetching at runtime.

const fs = require('fs');
const https = require('https');
const path = require('path');

const TAXONOMY_URL = 'https://static.openfoodfacts.org/data/taxonomies/ingredients.json';
const OUT_PATH = path.join(__dirname, '..', 'constants', 'offTaxonomy.json');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        return;
      }
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
  console.log('▸ Fetching OFF ingredient taxonomy…');
  const full = await fetchJson(TAXONOMY_URL);
  const total = Object.keys(full).length;
  console.log(`  ${total} ingredient nodes received`);

  // Keep only parent relationships. Everything else (EFSA metadata, names
  // in 50 languages, wikidata refs) gets dropped — we don't need it at
  // scan time. Parent-only form is ~7% of the original size.
  const pruned = {};
  let withParents = 0;
  for (const [id, node] of Object.entries(full)) {
    if (node.parents && node.parents.length > 0) {
      pruned[id] = node.parents;
      withParents++;
    }
  }

  const json = JSON.stringify(pruned);
  fs.writeFileSync(OUT_PATH, json);

  const stat = fs.statSync(OUT_PATH);
  console.log(`▸ Wrote ${OUT_PATH}`);
  console.log(`  ${withParents} nodes with parents, ${total - withParents} root nodes`);
  console.log(`  ${(stat.size / 1024).toFixed(0)} KB on disk`);
}

main().catch((e) => { console.error(e); process.exit(1); });
