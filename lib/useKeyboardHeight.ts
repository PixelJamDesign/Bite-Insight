/**
 * useKeyboardHeight — how much of the screen the iOS keyboard covers, 0
 * when it's down. Bottom sheets add this to their bottom padding so the
 * sheet grows up to the keyboard, instead of a KeyboardAvoidingView
 * lifting the whole sheet and leaving a gap of backdrop under it.
 *
 * iOS only: Android resizes the window for the keyboard itself (the
 * sheets never padded for it there), and web has no keyboard events.
 */
import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    // "will" events so the sheet moves with the keyboard, not after it.
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}
