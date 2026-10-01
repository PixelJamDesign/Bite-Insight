/**
 * MoreMenu — a ⋯ Small Icon Button that offers a list of actions.
 *
 * Android & web: opens an ActionsSheet. iOS uses the system pull-down
 * menu instead — see MoreMenu.ios.tsx. Both take the same `actions`.
 */
import { useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { ActionsSheet } from '@/components/ActionsSheet';
import type { MoreMenuProps } from '@/components/moreMenuTypes';
import MoreIcon from '@/assets/icons/more.svg';

export function MoreMenu({ actions, title, variant = 'onTeal', accessibilityLabel }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        size="small"
        variant={variant}
        icon={<MoreIcon width={20} height={20} />}
        onPress={() => setOpen(true)}
        accessibilityLabel={accessibilityLabel ?? 'More actions'}
      />
      <ActionsSheet visible={open} onClose={() => setOpen(false)} title={title} actions={actions} />
    </>
  );
}
