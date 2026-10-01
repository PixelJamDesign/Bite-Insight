/**
 * mealNutritionCopy — what the NutritionPanel says when some or all of a
 * meal's items have no nutrition data.
 *
 *   none missing  → nothing extra
 *   some missing  → an Info notice naming them ("totals are low")
 *   all missing   → the "no nutritional data" panel, with "Add nutritional
 *                   data" when it's a single product we can send to
 *                   Improve item details
 */
type Item = { title: string; kind: 'recipe' | 'product'; barcode: string | null };

function names(items: Item[]): string {
  const t = items.map((i) => i.title);
  return t.length <= 1 ? t.join('') : `${t.slice(0, -1).join(', ')} and ${t[t.length - 1]}`;
}

export function mealNutritionCopy(
  items: Item[],
  missing: Item[],
  onAddNutrition?: (barcode: string) => void,
): {
  notice: string | null;
  noData: { title: string; body: string; actionLabel?: string; onAction?: () => void } | null;
} {
  if (items.length === 0 || missing.length === 0) return { notice: null, noData: null };

  if (missing.length < items.length) {
    return {
      notice: `There's no nutrition data for ${names(missing)}, so these totals are on the low side.`,
      noData: null,
    };
  }

  if (items.length === 1) {
    const only = items[0];
    const canAdd = only.kind === 'product' && Boolean(only.barcode) && Boolean(onAddNutrition);
    return {
      notice: null,
      noData: {
        title: 'This item has no nutritional data',
        body: canAdd
          ? `We couldn't find nutrition for ${only.title}. If you have the pack, you can add it.`
          : `We couldn't find nutrition for ${only.title}.`,
        actionLabel: canAdd ? 'Add nutritional data' : undefined,
        onAction: canAdd ? () => onAddNutrition!(only.barcode!) : undefined,
      },
    };
  }

  return {
    notice: null,
    noData: {
      title: 'This meal has no nutritional data',
      body: "We couldn't find nutrition for anything in this meal yet. Tap an item to add it from the pack.",
    },
  };
}
