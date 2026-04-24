/**
 * RecipeActionsSheet — bottom sheet with Edit / Duplicate / Delete actions.
 *
 * Pixel-matches Figma node 4817-7241:
 *   • 24px top-corner sheet, 24px horizontal padding, 24 top / 48 bottom
 *   • Top handle (110×6 #d9d9d9 at top:7) + trailing close X
 *   • "Recipe actions" Heading 3 title
 *   • Three action rows — each a white card with 1px #aad4cd border and
 *     8px radius, containing a 48×48 circular icon tile on the left and
 *     title + subtitle on the right
 *   • Edit/Duplicate icons use the spring-water teal tint (#e2f1ee)
 *   • Delete uses a rose-pink tint on the icon tile and keeps the title
 *     in the primary colour (subtitle stays secondary teal — the only
 *     visual signal for destructive intent is the icon colour)
 */
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function RecipeActionsSheet({ visible, onClose, onEdit, onDuplicate, onDelete }: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Close X — on its own row, top-right, no background */}
            <View style={styles.closeRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={styles.body}>
              <Text style={styles.title}>Recipe actions</Text>

              <View style={styles.rows}>
                <ActionRow
                  icon="create-outline"
                  iconColor={Colors.primary}
                  tint={SPRING_WATER}
                  title="Edit recipe"
                  subtitle="Update name, servings, ingredients"
                  onPress={() => {
                    onClose();
                    onEdit();
                  }}
                />
                <ActionRow
                  icon="copy-outline"
                  iconColor={Colors.primary}
                  tint={SPRING_WATER}
                  title="Duplicate recipe"
                  subtitle="Create a copy you can tweak"
                  onPress={() => {
                    onClose();
                    onDuplicate();
                  }}
                />
                <ActionRow
                  icon="trash-outline"
                  iconColor={DESTRUCTIVE_RED}
                  tint={DESTRUCTIVE_TINT}
                  title="Delete recipe"
                  subtitle="Permanently remove this recipe"
                  onPress={() => {
                    onClose();
                    onDelete();
                  }}
                />
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Icon tile colours ────────────────────────────────────────────────────
const SPRING_WATER = '#e2f1ee';
const DESTRUCTIVE_RED = '#ff2f61';
const DESTRUCTIVE_TINT = 'rgba(255, 47, 97, 0.1)';

// ─────────────────────────────────────────────────────────────────────────

function ActionRow({
  icon,
  iconColor,
  tint,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 7,
    paddingBottom: 48, // generous breathing room above home indicator
  },
  handle: {
    alignSelf: 'center',
    width: 110,
    height: 6,
    borderRadius: 93,
    backgroundColor: '#d9d9d9',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 32, // Figma: gap-l between title and action list
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },

  rows: {
    gap: 8,
  },

  // Action row card
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 48,
    height: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: 4 },
  rowTitle: {
    fontSize: 16,
    lineHeight: 17.6, // Figma: 1.1
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  rowSub: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
});
