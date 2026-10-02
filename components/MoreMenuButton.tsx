/**
 * MoreMenuButton — what a MoreMenu shows before it's opened (visual only;
 * the menu handles the tap). Either the ⋯ Icon Button, or with `bare` the
 * small plain ⋯ used inside list rows (liked / disliked / flagged
 * ingredients), with a 32pt tap area that doesn't change the row's layout.
 */
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton, type IconButtonSize, type IconButtonVariant } from '@/components/IconButton';
import { Colors } from '@/constants/theme';

export function MoreMenuButton({
  size = 'small',
  variant = 'onTeal',
  bare = false,
}: {
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  bare?: boolean;
}) {
  if (bare) {
    return (
      <View style={styles.bare}>
        <Ionicons name="ellipsis-horizontal" size={14} color={Colors.secondary} />
      </View>
    );
  }
  return (
    <IconButton
      size={size}
      variant={variant}
      icon={<Ionicons name="ellipsis-horizontal" size={size === 'small' ? 20 : 24} color={Colors.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  // 32pt to tap, laid out as the old 20pt button.
  bare: {
    width: 32,
    height: 32,
    margin: -6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
