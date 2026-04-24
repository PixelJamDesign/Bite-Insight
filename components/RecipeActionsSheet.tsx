/**
 * RecipeActionsSheet — bottom sheet with the Recipe Actions menu.
 *
 * Supports two variants:
 *  • 'owner'  (Figma 4817:7241) — the current user authored this recipe.
 *    Shows Edit / Duplicate / Share to community (Plus-gated) / Share
 *    with a friend / Delete.
 *  • 'viewer' (Figma 4834:33395) — the current user is viewing another
 *    user's public recipe. This surface is itself Plus-gated at the
 *    feature level (only Plus members can browse others' recipes).
 *    Shows Save recipe / Duplicate recipe / Share with a friend.
 *
 * Pixel-matches the Figma design:
 *   • 24px top-corner sheet, 24px horizontal padding, 24 top / 48 bottom
 *   • Handle bar (110×6 #d9d9d9 at top:7) + trailing close X
 *   • "Recipe actions" Heading 3 title
 *   • White cards with 1px #aad4cd border, 8px radius, 48×48 circular
 *     spring-water (#e2f1ee) icon tile on the left
 *   • Plus+ tag on the right of the Share-to-community row for non-Plus
 *   • Delete uses a rose-pink tile tint
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
import ShareLinkIcon from '@/assets/icons/recipe-actions/share-link.svg';
import BookmarkIcon from '@/assets/icons/recipe-actions/bookmark.svg';
import TrashIcon from '@/assets/icons/recipe-actions/trash.svg';
import PlusSparkleIcon from '@/assets/icons/plus-sparkle.svg';

export type RecipeActionsVariant = 'owner' | 'viewer';

interface BaseProps {
  visible: boolean;
  onClose: () => void;
  /** Fires when the user taps "Share with a friend". Parent should
   *  open the native share sheet (or an in-app friend picker). */
  onShareWithFriend: () => void;
}

interface OwnerProps extends BaseProps {
  variant: 'owner';
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  /** Flips recipes.visibility between 'public' and 'private'. Parent
   *  routes non-Plus users through the upsell sheet instead. */
  onShareWithCommunity: () => void;
  /** True when recipes.visibility === 'public'. */
  isShared: boolean;
  /** When false, the Share-to-community row shows the Plus+ tag. */
  isPlus: boolean;
}

interface ViewerProps extends BaseProps {
  variant: 'viewer';
  onSave: () => void;
  onDuplicate: () => void;
}

type Props = OwnerProps | ViewerProps;

// ── Icon tile tints (Figma-sourced) ─────────────────────────────────────
const SPRING_WATER = '#e2f1ee';
const DESTRUCTIVE_TINT = 'rgba(255, 47, 97, 0.1)';

export function RecipeActionsSheet(props: Props) {
  const { visible, onClose } = props;
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
              >
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.title}>Recipe actions</Text>

              <View style={styles.rows}>
                {props.variant === 'owner' ? (
                  <OwnerRows {...props} />
                ) : (
                  <ViewerRows {...props} />
                )}
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Variant bodies ───────────────────────────────────────────────────────

function OwnerRows({
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onShareWithCommunity,
  onShareWithFriend,
  isShared,
  isPlus,
}: OwnerProps) {
  return (
    <>
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
        IconSvg={ShareLinkIcon}
        iconSize={22}
        tint={SPRING_WATER}
        title="Share with a friend"
        subtitle="Send this recipe to a friend or family member who's also on Bite Insight."
        onPress={() => {
          onClose();
          onShareWithFriend();
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
    </>
  );
}

function ViewerRows({
  onClose,
  onSave,
  onDuplicate,
  onShareWithFriend,
}: ViewerProps) {
  return (
    <>
      <ActionRow
        IconSvg={BookmarkIcon}
        iconSize={20}
        tint={SPRING_WATER}
        title="Save recipe"
        subtitle="Add this recipe to your recipe book"
        onPress={() => {
          onClose();
          onSave();
        }}
      />
      <ActionRow
        IconSvg={DuplicateIcon}
        iconSize={22}
        tint={SPRING_WATER}
        title="Duplicate recipe"
        subtitle="Take inspiration from this recipe but tweak things to better suit you"
        onPress={() => {
          onClose();
          onDuplicate();
        }}
      />
      <ActionRow
        IconSvg={ShareLinkIcon}
        iconSize={22}
        tint={SPRING_WATER}
        title="Share with a friend"
        subtitle="Send this recipe to a friend or family member who's also on Bite Insight."
        onPress={() => {
          onClose();
          onShareWithFriend();
        }}
      />
    </>
  );
}

// ── Row + badge ─────────────────────────────────────────────────────────

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

  plusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface.contrast,
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
