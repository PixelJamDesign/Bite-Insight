/**
 * MoreMenu (iOS & Android) — the ⋯ Small Icon Button opens the system's
 * own menu, anchored to the button: the iOS pull-down menu (Liquid Glass
 * on iOS 26) and Android's dropdown menu. Built on Expo UI's MenuView.
 *
 * Web uses MoreMenu.tsx (an ActionsSheet) instead.
 *
 * Actions run after a short pause so the menu has gone before anything
 * presents a Modal.
 */
import MenuView from '@expo/ui/community/menu';
import { IconButton } from '@/components/IconButton';
import type { MoreMenuProps } from '@/components/moreMenuTypes';
import MoreIcon from '@/assets/icons/more.svg';

const MENU_DISMISS_MS = 250;

export function MoreMenu({ actions, title, variant = 'onTeal', accessibilityLabel }: MoreMenuProps) {
  return (
    <MenuView
      title={title}
      actions={actions.map((a) => ({
        id: a.key,
        title: a.label,
        image: a.systemImage,
        attributes: a.destructive ? { destructive: true } : undefined,
      }))}
      onPressAction={({ nativeEvent }) => {
        const action = actions.find((a) => a.key === nativeEvent.event);
        if (action) setTimeout(action.onPress, MENU_DISMISS_MS);
      }}
      testID={accessibilityLabel}
    >
      {/* Visual only — the native menu handles the tap. */}
      <IconButton size="small" variant={variant} icon={<MoreIcon width={20} height={20} />} />
    </MenuView>
  );
}
