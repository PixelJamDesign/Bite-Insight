/**
 * MoreMenu (web) — a ⋯ Small Icon Button that opens an ActionsSheet.
 * iOS and Android use the system menu instead — see MoreMenu.native.tsx.
 */
import { useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { ActionsSheet } from '@/components/ActionsSheet';
import type { MoreMenuProps } from '@/components/moreMenuTypes';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export function MoreMenu({ actions, title, variant = 'onTeal', size = 'small', accessibilityLabel }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        size={size}
        variant={variant}
        icon={<Ionicons name="ellipsis-horizontal" size={size === 'small' ? 20 : 24} color={Colors.primary} />}
        onPress={() => setOpen(true)}
        accessibilityLabel={accessibilityLabel ?? 'More actions'}
      />
      <ActionsSheet visible={open} onClose={() => setOpen(false)} title={title} actions={actions} />
    </>
  );
}
