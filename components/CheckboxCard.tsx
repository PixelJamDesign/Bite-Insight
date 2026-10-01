/**
 * CheckboxCard — the Figma "Checkbox" component (5912:14907): a tinted
 * card with a 24px checkbox, a bold title and optional supporting text.
 *
 *   Unchecked — white box, 1px #aad4cd stroke, 6 radius
 *   Checked   — #3b9586 box with a white tick
 *
 * The whole card is the tap target.
 */
import { View, Text, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import CheckedIcon from '@/assets/icons/checkbox-checked.svg';

interface Props {
  checked: boolean;
  onPress: () => void;
  title: string;
  supportingText?: string;
  /** Extra element on the right, e.g. a Plus badge. */
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CheckboxCard({ checked, onPress, title, supportingText, trailing, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={title}
    >
      <View style={styles.positioner}>
        {checked ? <CheckedIcon width={24} height={24} /> : <View style={styles.box} />}
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {supportingText ? <Text style={styles.supporting}>{supportingText}</Text> : null}
      </View>
      {trailing}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#e4f1ef', // Figma surface/tertiary
    borderRadius: Radius.l,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  // Drops the box 2px so it lines up with the title's first line.
  positioner: { paddingTop: 2 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
  },
  text: { flex: 1 },
  title: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  supporting: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
});
