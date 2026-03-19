/**
 * DoneAccessory — iOS keyboard toolbar with a "Done" button.
 *
 * iOS numeric keypads (number-pad, decimal-pad) don't include a return/done key.
 * This component renders an InputAccessoryView above the keyboard with a tappable
 * "Done" button that dismisses it.
 *
 * Usage:
 *   <DoneAccessory id="age-input" />
 *   <TextInput inputAccessoryViewID="age-input" keyboardType="number-pad" ... />
 *
 * On Android this renders nothing — Android keyboards already have a ✓ button.
 */
import { Platform, InputAccessoryView, View, TouchableOpacity, Text, Keyboard, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

type Props = { id: string };

export function DoneAccessory({ id }: Props) {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={id}>
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => Keyboard.dismiss()} hitSlop={8}>
          <Text style={styles.done}>Done</Text>
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ccc',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  done: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.accent,
  },
});
