/**
 * Quantity unit metadata — label, default value, precision for each unit.
 * Used by the quantity picker sheet and ingredient rows.
 */
import type { QuantityUnit } from '@/lib/types';

export interface QuantityUnitMeta {
  key: QuantityUnit;
  label: string;
  shortLabel: string;
  defaultValue: number;
  step: number;         // increment in the stepper
  precision: number;    // decimal places to display
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

export function formatQuantity(value: number, unit: QuantityUnit): string {
  const meta = unitMeta(unit);
  const formatted = value.toFixed(meta.precision);
  return `${formatted}${meta.shortLabel === 'g' || meta.shortLabel === 'ml' ? meta.shortLabel : ' ' + meta.shortLabel}`;
}
