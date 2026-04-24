/**
 * RecipeActionsSheet — bottom sheet with Edit / Duplicate / Share /
 * Delete actions.
 *
 * Pixel-matches Figma node 4817-7241 (+ 4828-26060 for the Share row):
 *   • 24px top-corner sheet, 24px horizontal padding, 24 top / 48 bottom
 *   • Top handle (110×6 #d9d9d9 at top:7) + trailing close X
 *   • "Recipe actions" Heading 3 title
 *   • Four action rows — white cards, 1px #aad4cd border, 8px radius,
 *     48×48 circular icon tile on the left, title + subtitle on the right
 *   • The Share row sits between Duplicate and Delete and shows a
 *     Plus+ tag on the right for non-Plus users (dark teal pill with
 *     lowercase "plus" text + gradient sparkle glyph)
 *   • Delete uses a rose-pink tint on the icon tile; all other icons
 *     sit on the spring-water teal tint (#e2f1ee)
 *
 * Custom SVG icons live in assets/icons/recipe-actions/ — exported
 * directly from the Figma design system so strokes match exactly.
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
import EditIcon from '@/assets/icons/recipe-actions/edit.svg';
import DuplicateIcon from '@/assets/icons/recipe-actions/duplicate.svg';
import ShareIcon from '@/assets/icons/recipe-actions/share.svg';
import TrashIcon from '@/assets/icons/recipe-actions/trash.svg';
import PlusSparkleIcon from '@/assets/icons/plus-sparkle.svg';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Fires when the user taps "Share to the community". The parent
   *  decides whether to open the upsell sheet (non-Plus) or toggle
   *  recipes.visibility between 'public' / 'private'. */
  onShareWithCommunity: () => void;
  /** True when recipes.visibility === 'public'. Controls the row
   *  copy — "Share to the community" vs "Stop sharing". */
  isShared: boolean;
  /** When false, the Share row shows the Plus+ tag on the right edge
   *  so the user knows they need to upgrade to use this action. */
  isPlus: boolean;
}

// ── Icon tile colours (Figma-sourced) ───────────────────────────────────
const SPRING_WATER = '#e2f1ee';
const DESTRUCTIVE_TINT = 'rgba(255, 47, 97, 0.1)';

export function RecipeActionsSheet({
  visible,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onShareWithCommunity,
  isShared,
  isPlus,
}: Props) {
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

            {/* Close X */}
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
                  IconSvg={EditIcon}
                  iconSize={20}
                  tint={SPRING_WATER}
                  title="Edit recipe"
                  subtitle="Update name, servings, ingredients"
                  onPress={() => {
                    onClose();
                    onEdit();
                  }}
                />
                <ActionRow
                  IconSvg={DuplicateIcon}
                  iconSize={22}
                  tint={SPRING_WATER}
                  title="Duplicate recipe"
                  subtitle="Create a copy you can tweak"
                  onPress={() => {
                    onClose();
                    onDuplicate();
                  }}
                />
                <ActionRow
                  IconSvg={ShareIcon}
                  iconSize={22}
                  tint={SPRING_WATER}
                  title={isShared ? 'Stop sharing' : 'Share to the community'}
                  subtitle={
                    isShared
                      ? 'Make this recipe private again'
                      : 'Share your creation with the\nBite Insight+ Community'
                  }
                  rightAccessory={!isPlus ? <PlusTag /> : undefined}
                  onPress={() => {
                    onClose();
                    onShareWithCommunity();
                  }}
                />
                <ActionRow
                  IconSvg={TrashIcon}
                  iconSize={22}
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

// ─────────────────────────────────────────────────────────────────────────

type SvgComponent = React.FC<{ width?: number; height?: number }>;

function ActionRow({
  IconSvg,
  iconSize,
  tint,
  title,
  subtitle,
  rightAccessory,
  onPress,
}: {
  IconSvg: SvgComponent;
  iconSize: number;
  tint: string;
  title: string;
  subtitle: string;
  /** Optional element rendered on the right edge of the card, aligned
   *  to the top. Used for the Plus+ tag on the Share row. */
  rightAccessory?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, rightAccessory ? styles.rowWithAccessory : null]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.rowMain}>
        <View style={[styles.rowIcon, { backgroundColor: tint }]}>
          <IconSvg width={iconSize} height={iconSize} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowSub}>{subtitle}</Text>
        </View>
      </View>
      {rightAccessory}
    </TouchableOpacity>
  );
}

/**
 * Plus+ tag — Figma "Plus Tag" variant of the BiteInsight upsell banner.
 * Dark teal pill, white lowercase "plus", gradient sparkle glyph.
 */
function PlusTag() {
  return (
    <View style={styles.plusTag}>
      <Text style={styles.plusTagText}>plus</Text>
      <PlusSparkleIcon width={8} height={8} />
    </View>
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
    paddingBottom: 48,
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
    gap: 32,
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

  rows: { gap: 8 },

  // Base row card. `items-center` for normal rows; rows with a
  // right accessory switch to `items-start` so the accessory pins
  // to the top of the card (matches Figma).
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
  rowWithAccessory: {
    alignItems: 'flex-start',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    lineHeight: 17.6,
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

  // Plus+ tag (Figma "Plus Tag" variant) — dark teal pill with white
  // "plus" text and a small gradient sparkle. Sits top-right of the
  // Share row for non-Plus members.
  plusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface.contrast, // #023432
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  plusTagText: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
    letterSpacing: -0.32,
  },
});
