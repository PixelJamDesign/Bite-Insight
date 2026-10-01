/**
 * ActionsSheet — a titled bottom sheet of action rows, in the
 * RecipeActionsSheet layout (and reusing its ActionRow). It's what a
 * MoreMenu opens on Android and web; iOS uses the system menu instead.
 *
 * Picking a row closes the sheet first and runs the action once it has
 * gone, so an action that opens another Modal never stacks on this one
 * (iOS double-modal freeze).
 */
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { ActionRow, SPRING_WATER } from '@/components/RecipeActionsSheet';
import type { MoreMenuAction } from '@/components/moreMenuTypes';

const DESTRUCTIVE_TINT = 'rgba(255, 47, 97, 0.1)';
/** Time for this sheet's exit animation before the action runs. */
const CLOSE_DELAY_MS = 350;

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  actions: MoreMenuAction[];
}

export function ActionsSheet({ visible, onClose, title, actions }: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.handle} />

            <View style={styles.closeRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                activeOpacity={0.7}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={2}>
                {title}
              </Text>
              <View style={styles.rows}>
                {actions.map((a) => (
                  <ActionRow
                    key={a.key}
                    IconSvg={a.Icon}
                    iconSize={a.iconSize ?? 22}
                    tint={a.destructive ? DESTRUCTIVE_TINT : SPRING_WATER}
                    title={a.label}
                    subtitle={a.subtitle ?? ''}
                    onPress={() => {
                      onClose();
                      setTimeout(a.onPress, CLOSE_DELAY_MS);
                    }}
                  />
                ))}
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// Sheet chrome matches RecipeActionsSheet.
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 7,
    paddingBottom: 48,
  },
  handle: {
    alignSelf: 'center',
    width: 110,
    height: 6,
    borderRadius: 93,
    backgroundColor: '#d9d9d9',
  },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 32, marginTop: 8 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  rows: { gap: 8 },
});
