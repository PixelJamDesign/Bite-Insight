/**
 * ProductMoreMenu (iOS) — the ⋯ Small Icon Button opens the system
 * pull-down menu (UIMenu via SwiftUI Menu, Liquid Glass on iOS 26)
 * anchored to the button. The button itself is our React Native view,
 * hosted inside the SwiftUI menu label; SwiftUI handles the tap.
 */
import { Host, Menu, Button, RNHostView } from '@expo/ui/swift-ui';
import { IconButtonSmall } from '@/components/IconButtonSmall';
import MoreIcon from '@/assets/icons/more.svg';
import type { ProductMoreMenuProps } from './ProductMoreMenu';

export function ProductMoreMenu({
  onAddToMealPlan,
  onAddToRecipe,
  onImproveDetails,
}: ProductMoreMenuProps) {
  return (
    <Host matchContents>
      <Menu
        label={
          <RNHostView matchContents>
            <IconButtonSmall icon={<MoreIcon width={20} height={20} />} />
          </RNHostView>
        }
      >
        <Button systemImage="calendar.badge.plus" label="Add to meal plan" onPress={onAddToMealPlan} />
        <Button systemImage="fork.knife" label="Add to recipe" onPress={onAddToRecipe} />
        <Button systemImage="square.and.pencil" label="Improve item details" onPress={onImproveDetails} />
      </Menu>
    </Host>
  );
}
