/**
 * ImageViewer — full-screen look at a photo, shown whole (nothing
 * cropped). Thumbnails elsewhere fill their box and crop; tapping one
 * opens this so people can still read the full pack.
 *
 * Same backdrop and close button as AvatarViewer. Tap anywhere to close.
 */
import { useEffect, useState } from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

export function ImageViewer({ visible, uri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Size the photo to its own shape so it fills as much as it can.
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    if (!visible || !uri) return;
    let cancelled = false;
    Image.getSize(
      uri,
      (w, h) => {
        if (!cancelled && w && h) setRatio(w / h);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [visible, uri]);
  const maxW = width - 48;
  const maxH = height - insets.top - insets.bottom - 160;
  const box =
    ratio == null
      ? { width: maxW, height: maxW }
      : maxW / ratio <= maxH
        ? { width: maxW, height: maxW / ratio }
        : { width: maxH * ratio, height: maxH };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.backdrop}
        onPress={onClose}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel="Close photo"
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={[styles.image, box]}
            resizeMode="contain"
          />
        ) : null}
      </TouchableOpacity>

      {/* Same place and style as AvatarViewer's close button. */}
      <View style={[styles.headerBar, { paddingTop: insets.top + 24 }]} pointerEvents="box-none">
        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8} accessibilityLabel="Close">
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    // Avocado-skin (#002923) at 95% opacity — as AvatarViewer
    backgroundColor: 'rgba(0, 41, 35, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { borderRadius: 16 },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
