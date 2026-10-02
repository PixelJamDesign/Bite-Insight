/**
 * Icons for the like / dislike / flag actions in ingredient row MoreMenus,
 * in the { width, height } shape the menu's sheet rows expect.
 */
import { MenuDislikedIcon, MenuFlaggedIcon, MenuLikedIcon } from '@/components/MenuIcons';
import { Colors } from '@/constants/theme';

type Props = { width?: number; height?: number };

export function LikeActionIcon({ width = 20 }: Props) {
  return <MenuLikedIcon size={width} color={Colors.primary} />;
}
export function DislikeActionIcon({ width = 20 }: Props) {
  return <MenuDislikedIcon size={width} color={Colors.primary} />;
}
export function FlagActionIcon({ width = 20 }: Props) {
  return <MenuFlaggedIcon size={width} color={Colors.primary} />;
}
