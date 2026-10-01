/**
 * MoreMenu (iOS) — the ⋯ Small Icon Button opens the system pull-down menu
 * (Liquid Glass on iOS 26), built from Expo UI's SwiftUI Menu.
 *
 * Unlike the community MenuView, this sets `menuOrder(.fixed)`: by default
 * iOS flips a menu that opens upwards (first item nearest the finger), so
 * the order changed with the button's position. Fixed keeps it top-down,
 * the same as Android and web.
 *
 * Android uses MoreMenu.native.tsx; web uses MoreMenu.tsx.
 */
import { Button, Host, Menu, RNHostView, Section } from '@expo/ui/swift-ui';
import { menuOrder } from '@expo/ui/swift-ui/modifiers';
import { IconButton } from '@/components/IconButton';
import type { MoreMenuProps } from '@/components/moreMenuTypes';
import MoreIcon from '@/assets/icons/more.svg';

/** Lets the menu finish closing before an action presents a Modal. */
const MENU_DISMISS_MS = 250;
const FIXED_ORDER = [menuOrder('fixed')];

export function MoreMenu({ actions, title, variant = 'onTeal', size = 'small', accessibilityLabel }: MoreMenuProps) {
  const iconSize = size === 'small' ? 20 : 24;
  const items = actions.map((a) => (
    <Button
      key={a.key}
      label={a.label}
      systemImage={a.systemImage}
      role={a.destructive ? 'destructive' : undefined}
      onPress={() => setTimeout(a.onPress, MENU_DISMISS_MS)}
    />
  ));

  return (
    <Host matchContents testID={accessibilityLabel} ignoreSafeArea="all">
      <Menu
        modifiers={FIXED_ORDER}
        label={
          <RNHostView matchContents>
            {/* Visual only — the menu handles the tap. */}
            <IconButton
              size={size}
              variant={variant}
              icon={<MoreIcon width={iconSize} height={iconSize} />}
            />
          </RNHostView>
        }
      >
        {title ? <Section title={title}>{items}</Section> : items}
      </Menu>
    </Host>
  );
}
