/**
 * ProductMoreMenu — the ⋯ button on a scanned product.
 *
 * Android & web: the Small Icon Button opens ProductActionsSheet (the
 * parent passes `onOpenSheet`). iOS uses the system pull-down menu
 * instead — see ProductMoreMenu.ios.tsx.
 */
import { IconButtonSmall } from '@/components/IconButtonSmall';
import MoreIcon from '@/assets/icons/more.svg';

export interface ProductMoreMenuProps {
  onAddToMealPlan: () => void;
  onAddToRecipe: () => void;
  onImproveDetails: () => void;
  /** Opens the in-app actions sheet (platforms without a native menu). */
  onOpenSheet: () => void;
}

export function ProductMoreMenu({ onOpenSheet }: ProductMoreMenuProps) {
  return (
    <IconButtonSmall
      icon={<MoreIcon width={20} height={20} />}
      onPress={onOpenSheet}
      accessibilityLabel="Product actions"
    />
  );
}
