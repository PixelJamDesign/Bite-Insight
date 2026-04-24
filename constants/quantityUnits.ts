/**
 * Quantity unit metadata — label, default value, precision, conversion.
 * Used by the quantity picker sheet and ingredient rows.
 *
 * Conversion notes:
 *   Volume ↔ volume  (ml, tbsp, tsp, cup) — exact.
 *   Weight ↔ weight  (g)                  — trivial (only one weight unit).
 *   Weight ↔ volume                       — uses water density (1 g = 1 ml).
 *                                           Close for most liquids/sauces;
 *                                           approximate for dry goods.
 *   Count (unit, pack) ↔ anything         — not meaningful; resets to 1.
 */
import type { QuantityUnit } from '@/lib/types';

export interface QuantityUnitMeta {
  key: QuantityUnit;
  label: string;
  shortLabel: string;
  defaultValue: number;
  step: number;         // increment in the stepper
  precision: number;    // decimal places to display (non-fractional units)
}

export const QUANTITY_UNITS: QuantityUnitMeta[] = [
  { key: 'g',    label: 'Grams',        shortLabel: 'g',     defaultValue: 100, step: 10,  precision: 0 },
  { key: 'ml',   label: 'Millilitres',  shortLabel: 'ml',    defaultValue: 100, step: 10,  precision: 0 },
  { key: 'unit', label: 'Units',        shortLabel: 'Units', defaultValue: 1,   step: 1,   precision: 0 },
  { key: 'pack', label: 'Packs',        shortLabel: 'Packs', defaultValue: 1,   step: 0.5, precision: 1 },
  { key: 'tbsp', label: 'Tablespoons',  shortLabel: 'Tbsp',  defaultValue: 1,   step: 0.5, precision: 1 },
  { key: 'tsp',  label: 'Teaspoons',    shortLabel: 'Tsp',   defaultValue: 1,   step: 0.5, precision: 1 },
  { key: 'cup',  label: 'Cups',         shortLabel: 'Cups',  defaultValue: 0.5, step: 0.25, precision: 2 },
];

export function unitMeta(unit: QuantityUnit): QuantityUnitMeta {
  return QUANTITY_UNITS.find((u) => u.key === unit) ?? QUANTITY_UNITS[0];
}

// ── Conversion ────────────────────────────────────────────────────────────
// Conversion factor to millilitres. `null` means the unit is not convertible
// (counts — can't become a volume or weight without knowing the product).
// Grams use water-density equivalence (1 g = 1 ml) for weight↔volume.
export const UNIT_TO_ML: Record<QuantityUnit, number | null> = {
  g:    1,
  ml:   1,
  tbsp: 15,    // US customary
  tsp:  5,     // US customary
  cup:  240,   // US customary cup (widely used in recipes)
  unit: null,
  pack: null,
};

export function canConvert(from: QuantityUnit, to: QuantityUnit): boolean {
  return UNIT_TO_ML[from] != null && UNIT_TO_ML[to] != null;
}

/**
 * Convert a value from one unit to another, or return null if the units
 * are incompatible (e.g. counting → weight).
 */
export function convertUnits(
  from: QuantityUnit,
  to: QuantityUnit,
  value: number,
): number | null {
  if (from === to) return value;
  const fromRatio = UNIT_TO_ML[from];
  const toRatio = UNIT_TO_ML[to];
  if (fromRatio == null || toRatio == null) return null;
  return (value * fromRatio) / toRatio;
}

// ── Fraction display ──────────────────────────────────────────────────────
// Cups, tbsp and tsp display as friendly fractions ("¼", "½", "1¾").
// Everything else uses decimal with its configured precision.

const CUP_FRACTIONS: { value: number; glyph: string }[] = [
  { value: 1 / 4, glyph: '¼' },
  { value: 1 / 3, glyph: '⅓' },
  { value: 1 / 2, glyph: '½' },
  { value: 2 / 3, glyph: '⅔' },
  { value: 3 / 4, glyph: '¾' },
];

const HALF_FRACTION: { value: number; glyph: string }[] = [
  { value: 1 / 2, glyph: '½' },
];

export function shouldShowAsFraction(unit: QuantityUnit): boolean {
  return unit === 'cup' || unit === 'tbsp' || unit === 'tsp';
}

function fractionsFor(unit: QuantityUnit) {
  return unit === 'cup' ? CUP_FRACTIONS : HALF_FRACTION;
}

/**
 * Renders a value as "1¾", "½", "3" etc. Snaps the fractional part to the
 * nearest supported glyph. Returns a plain integer string when the value
 * rounds to a whole number.
 */
export function formatFractional(value: number, unit: QuantityUnit): string {
  if (value <= 0) return '0';
  const fractions = fractionsFor(unit);
  const whole = Math.floor(value);
  const frac = value - whole;

  // Candidates to snap to: 0 (use whole only), any listed fraction, or 1 (→ bump whole).
  type Snap = { whole: number; glyph: string };
  const candidates: { dist: number; snap: Snap }[] = [
    { dist: frac, snap: { whole, glyph: '' } },
    { dist: 1 - frac, snap: { whole: whole + 1, glyph: '' } },
    ...fractions.map((f) => ({ dist: Math.abs(frac - f.value), snap: { whole, glyph: f.glyph } })),
  ];
  candidates.sort((a, b) => a.dist - b.dist);
  const { whole: finalWhole, glyph } = candidates[0].snap;

  if (glyph === '') return String(finalWhole);
  if (finalWhole === 0) return glyph;
  return `${finalWhole}${glyph}`;
}

/**
 * Snap a raw numeric value to the nearest supported fraction step for the
 * given unit. Used after cross-unit conversion so the stored value matches
 * what's shown (no "½" label on top of 0.4167 under the hood).
 */
export function snapToFractionStep(value: number, unit: QuantityUnit): number {
  if (!shouldShowAsFraction(unit)) return value;
  if (value <= 0) return 0;
  const fractions = fractionsFor(unit);
  const whole = Math.floor(value);
  const frac = value - whole;

  const candidates: { dist: number; value: number }[] = [
    { dist: frac, value: whole },
    { dist: 1 - frac, value: whole + 1 },
    ...fractions.map((f) => ({ dist: Math.abs(frac - f.value), value: whole + f.value })),
  ];
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates[0].value;
}

// ── Display helpers ───────────────────────────────────────────────────────

/** Value-only display, used inside the Quantity sheet next to the unit. */
export function formatQuantityValue(value: number, unit: QuantityUnit): string {
  if (shouldShowAsFraction(unit)) return formatFractional(value, unit);
  const meta = unitMeta(unit);
  return value.toFixed(meta.precision);
}

/**
 * Short "100g" / "¾ cups" / "4 units" style used in ingredient rows.
 */
export function formatQuantity(value: number, unit: QuantityUnit): string {
  if (shouldShowAsFraction(unit)) {
    const meta = unitMeta(unit);
    return `${formatFractional(value, unit)} ${meta.shortLabel}`;
  }
  const meta = unitMeta(unit);
  const formatted = value.toFixed(meta.precision);
  const space = meta.shortLabel === 'g' || meta.shortLabel === 'ml' ? '' : ' ';
  return `${formatted}${space}${meta.shortLabel}`;
}
