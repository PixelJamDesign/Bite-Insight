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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '@/constants/theme';

interface Props {
  visible: boolean;
  uri: string | null;
  initials?: string;
  onClose: () => void;
}

export function AvatarViewer({ visible, uri, initials, onClose }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={{ flex: 1 }} edges={[]}>
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

          {/* Close button — matches the header menu button style + position
              from components/ScreenLayout.tsx so it feels like the same
              control users already know. Close icon instead of hamburger. */}
          <View
            style={[
              styles.headerBar,
              { paddingTop: insets.top + 24 },
            ]}
            pointerEvents="box-none"
          >
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color={Colors.primary} />
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
  // Mirrors styles.headerBar in components/ScreenLayout.tsx — same positioning
  // and spacing so the close button sits exactly where the menu button does.
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 20,
    elevation: 20,
  },
  // Same dimensions, radius, border, shadow as styles.menuBtn in ScreenLayout.
  closeBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
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
