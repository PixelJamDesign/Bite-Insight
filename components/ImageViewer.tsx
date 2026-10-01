/**
 * ImageViewer — full-screen look at a photo, shown whole (nothing
 * cropped). Thumbnails elsewhere fill their box and crop; tapping one
 * opens this so people can still read the full pack.
 *
 * A plain white screen that fades in, with the white Icon Button close
 * in the top right (where the header menu button sits). Tap anywhere to
 * close.
 */
import { useEffect, useState } from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { IconButton } from '@/components/IconButton';

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

      <View style={[styles.headerBar, { paddingTop: insets.top + 24 }]} pointerEvents="box-none">
        <IconButton
          variant="onWhite"
          icon={<Ionicons name="close" size={24} color={Colors.primary} />}
          onPress={onClose}
          accessibilityLabel="Close"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.surface.secondary,
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
});
