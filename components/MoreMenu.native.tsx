/**
 * MoreMenu (Android) — the ⋯ Small Icon Button opens the system's
 * own dropdown menu, anchored to the button. Built on Expo UI's MenuView.
 *
 * Used on Android only — iOS has MoreMenu.ios.tsx (fixed item order), web
 * uses MoreMenu.tsx (an ActionsSheet).
 *
 * Actions run after a short pause so the menu has gone before anything
 * presents a Modal.
 */
import MenuView from '@expo/ui/community/menu';
import { IconButton } from '@/components/IconButton';
import type { MoreMenuProps } from '@/components/moreMenuTypes';
import MoreIcon from '@/assets/icons/more.svg';

const MENU_DISMISS_MS = 250;

export function MoreMenu({ actions, title, variant = 'onTeal', size = 'small', accessibilityLabel }: MoreMenuProps) {
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
      <IconButton
        size={size}
        variant={variant}
        icon={<MoreIcon width={size === 'small' ? 20 : 24} height={size === 'small' ? 20 : 24} />}
      />
    </MenuView>
  );
}
