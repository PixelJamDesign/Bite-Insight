/**
 * IconButtonSmall — Figma "Icon Button/Small" (node 5856:31328):
 * 36×36, 12 radius, tertiary fill, white 1px border, level-3 shadow,
 * 20px icon in the middle.
 *
 * Pass `onPress` for a normal button. Leave it out to get the visual only,
 * e.g. as the trigger inside a native menu that handles the tap itself.
 */
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, Shadows } from '@/constants/theme';

interface Props {
  /** A 20×20 icon element. */
  icon: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButtonSmall({ icon, onPress, accessibilityLabel, style }: Props) {
  if (!onPress) {
    return (
      <View style={[styles.button, style]} pointerEvents="none">
        {icon}
      </View>
    );
  }
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
});
