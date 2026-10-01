import type { SFSymbol } from 'sf-symbols-typescript';
import type { IconButtonSize, IconButtonVariant } from '@/components/IconButton';

type SvgComponent = React.FC<{ width?: number; height?: number }>;

/** One action in a MoreMenu — shared by the iOS menu and the sheet. */
export interface MoreMenuAction {
  key: string;
  label: string;
  /** Second line, shown in the sheet only (the iOS menu is one line). */
  subtitle?: string;
  /** SF Symbol for the iOS menu. */
  systemImage: SFSymbol;
  /** Icon for the sheet row. */
  Icon: SvgComponent;
  iconSize?: number;
  /** Red in the iOS menu, rose tile in the sheet. */
  destructive?: boolean;
  onPress: () => void;
}

export interface MoreMenuProps {
  actions: MoreMenuAction[];
  /** Sheet title on Android and web. */
  title: string;
  /** Button variant — onWhite inside white cards. */
  variant?: IconButtonVariant;
  /** small (36, the default) or regular (48) — e.g. a sheet header. */
  size?: IconButtonSize;
  accessibilityLabel?: string;
}
