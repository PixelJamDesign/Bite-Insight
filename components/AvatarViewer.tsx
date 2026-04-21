/**
 * AvatarViewer — full-screen modal showing the user's avatar at a larger
 * size. Tapped into from the edit-profile avatar.
 */
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '@/constants/theme';

interface Props {
  visible: boolean;
  uri: string | null;
  initials?: string;
  onClose: () => void;
}

export function AvatarViewer({ visible, uri, initials, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.centerArea}>
            <TouchableOpacity
              style={styles.imageTouch}
              onPress={onClose}
              activeOpacity={1}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.placeholder}>
                  <Text style={styles.initials}>{initials ?? '?'}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  imageTouch: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 420,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: Colors.accent,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    ...Typography.h1,
    fontSize: 120,
    lineHeight: 130,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -2,
  },
});
