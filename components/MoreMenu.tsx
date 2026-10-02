/**
 * MoreMenu (web) — a ⋯ Small Icon Button that opens an ActionsSheet.
 * iOS and Android use the system menu instead — see MoreMenu.native.tsx.
 */
import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { IconButton } from '@/components/IconButton';
import { MoreMenuButton } from '@/components/MoreMenuButton';
import { ActionsSheet } from '@/components/ActionsSheet';
import type { MoreMenuProps } from '@/components/moreMenuTypes';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

export function MoreMenu({ actions, title, variant = 'onTeal', size = 'small', accessibilityLabel, bare }: MoreMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {bare ? (
        <TouchableOpacity onPress={() => setOpen(true)} accessibilityLabel={accessibilityLabel ?? 'More actions'} activeOpacity={0.7}>
          <MoreMenuButton bare />
        </TouchableOpacity>
      ) : (
      <IconButton
        size={size}
        variant={variant}
        icon={<Ionicons name="ellipsis-horizontal" size={size === 'small' ? 20 : 24} color={Colors.primary} />}
        onPress={() => setOpen(true)}
        accessibilityLabel={accessibilityLabel ?? 'More actions'}
      />
      )}
      <ActionsSheet visible={open} onClose={() => setOpen(false)} title={title} actions={actions} />
    </>
  );
}
