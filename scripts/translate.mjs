#!/usr/bin/env node
/**
 * translate.mjs — Auto-translate English locale JSONs into target languages
 *
 * Uses the free Google Translate web API (no API key needed).
 * Run:  node scripts/translate.mjs
 *
 * Options:
 *   --lang fr,de      Only generate specific languages (comma-separated)
 *   --file common     Only translate a specific namespace file
 *   --dry-run         Preview what would be created without writing files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const EN_DIR = path.join(LOCALES_DIR, 'en');

// ── Target languages ─────────────────────────────────────────────────────────
const ALL_LANGUAGES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  pl: 'Polish',
  ja: 'Japanese',
  zh: 'Chinese (Simplified)',
  ko: 'Korean',
  ar: 'Arabic',
};

// ── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const langFilter = getArgValue('--lang')?.split(',') ?? null;
const fileFilter = getArgValue('--file') ?? null;

const targetLangs = langFilter
  ? Object.fromEntries(Object.entries(ALL_LANGUAGES).filter(([k]) => langFilter.includes(k)))
  : ALL_LANGUAGES;

// ── Google Translate (free, no key) ──────────────────────────────────────────
const BATCH_SIZE = 30; // strings per request to avoid URL limits
const DELAY_MS = 300;  // delay between requests to be polite

async function translateBatch(texts, targetLang) {
  // Google Translate API (free tier, used by browser extension)
  const params = new URLSearchParams();
  params.append('client', 'gtx');
  params.append('sl', 'en');
  params.append('tl', targetLang);
  params.append('dt', 't');
  texts.forEach(t => params.append('q', t));

  const url = `https://translate.googleapis.com/translate_a/t?${params.toString()}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) {
    throw new Error(`Google Translate returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  // Response format varies: single string → [[trans, orig]], multiple → [[[trans, orig]], ...]
  if (texts.length === 1) {
    // Single text: data is either a string or [[translated, original]]
    if (typeof data === 'string') return [data];
    if (Array.isArray(data) && Array.isArray(data[0])) return [data[0][0]];
    return [String(data)];
  }

  // Multiple texts: array of results
  return data.map(item => {
    if (typeof item === 'string') return item;
    if (Array.isArray(item)) return item[0];
    return String(item);
  });
}

async function translateTexts(texts, targetLang) {
  const results = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const translated = await translateBatch(batch, targetLang);
    results.push(...translated);

    if (i + BATCH_SIZE < texts.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  return results;
}

// ── JSON traversal helpers ───────────────────────────────────────────────────
// i18next interpolation tokens like {{name}} and $t(key) must be preserved
const INTERPOLATION_RE = /(\{\{[^}]+\}\}|\$t\([^)]+\))/g;

function extractStrings(obj, prefix = '') {
  const entries = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries.push({ key: fullKey, value });
    } else if (typeof value === 'object' && value !== null) {
      entries.push(...extractStrings(value, fullKey));
    }
  }
  return entries;
}

function setNestedValue(obj, dotKey, value) {
  const parts = dotKey.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) current[parts[i]] = {};
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

function protectInterpolation(text) {
  const tokens = [];
  const protected_ = text.replace(INTERPOLATION_RE, (match) => {
    tokens.push(match);
    return `__PLACEHOLDER_${tokens.length - 1}__`;
  });
  return { protected: protected_, tokens };
}

function restoreInterpolation(text, tokens) {
  return text.replace(/__PLACEHOLDER_(\d+)__/g, (_, idx) => tokens[parseInt(idx)]);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const jsonFiles = fs.readdirSync(EN_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !fileFilter || f === `${fileFilter}.json`);

  if (jsonFiles.length === 0) {
    console.error('No English JSON files found' + (fileFilter ? ` matching "${fileFilter}"` : ''));
    process.exit(1);
  }

  const langCodes = Object.keys(targetLangs);
  console.log(`\n📋 Translating ${jsonFiles.length} files → ${langCodes.length} languages`);
  console.log(`   Languages: ${langCodes.map(c => `${c} (${targetLangs[c]})`).join(', ')}`);
  console.log(`   Files: ${jsonFiles.join(', ')}`);
  if (dryRun) console.log('   ⚠️  DRY RUN — no files will be written\n');
  else console.log('');

  for (const langCode of langCodes) {
    const langDir = path.join(LOCALES_DIR, langCode);
    if (!dryRun && !fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    console.log(`🌐 ${langCode} (${targetLangs[langCode]})`);

    for (const file of jsonFiles) {
      const enPath = path.join(EN_DIR, file);
      const enJson = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
      const entries = extractStrings(enJson);

      if (entries.length === 0) {
        console.log(`   ⏭  ${file} — no strings`);
        continue;
      }

      // Protect interpolation tokens before translating
      const prepared = entries.map(e => protectInterpolation(e.value));
      const textsToTranslate = prepared.map(p => p.protected);

      let translated;
      try {
        translated = await translateTexts(textsToTranslate, langCode);
      } catch (err) {
        console.error(`   ❌ ${file} — translation failed: ${err.message}`);
        continue;
      }

      // Build translated JSON
      const result = {};
      for (let i = 0; i < entries.length; i++) {
        const restored = restoreInterpolation(translated[i], prepared[i].tokens);
        setNestedValue(result, entries[i].key, restored);
      }

      const outPath = path.join(langDir, file);
      if (!dryRun) {
        fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', 'utf-8');
      }
      console.log(`   ✅ ${file} — ${entries.length} strings`);
    }

    console.log('');
  }

  console.log('✨ Done!\n');

  if (!dryRun) {
    console.log('Next steps:');
    console.log('  1. Register new languages in lib/i18n.ts');
    console.log('  2. Review translations for accuracy (especially medical/dietary terms)');
    console.log('  3. Test by switching device language\n');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
