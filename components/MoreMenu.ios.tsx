/**
 * MoreMenu (iOS) — the ⋯ Small Icon Button opens the system pull-down
 * menu (UIMenu via SwiftUI Menu, Liquid Glass on iOS 26) anchored to the
 * button. The button is our React Native view, hosted in the SwiftUI menu
 * label; SwiftUI handles the tap.
 *
 * Actions run after a short pause so the menu has gone before anything
 * presents a Modal.
 */
import { Host, Menu, Button, RNHostView } from '@expo/ui/swift-ui';
import { IconButton } from '@/components/IconButton';
import type { MoreMenuProps } from '@/components/moreMenuTypes';
import MoreIcon from '@/assets/icons/more.svg';

const MENU_DISMISS_MS = 250;

export function MoreMenu({ actions, variant = 'onTeal' }: MoreMenuProps) {
  return (
    <Host matchContents>
      <Menu
        label={
          <RNHostView matchContents>
            <IconButton size="small" variant={variant} icon={<MoreIcon width={20} height={20} />} />
          </RNHostView>
        }
      >
        {actions.map((a) => (
          <Button
            key={a.key}
            systemImage={a.systemImage}
            label={a.label}
            role={a.destructive ? 'destructive' : 'default'}
            onPress={() => setTimeout(a.onPress, MENU_DISMISS_MS)}
          />
        ))}
      </Menu>
    </Host>
  );
}
