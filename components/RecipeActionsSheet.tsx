/**
 * RecipeActionsSheet — bottom sheet with Edit / Duplicate / Delete actions.
 * Replaces the per-screen bottom action bar on the recipe detail view.
 */
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export function RecipeActionsSheet({ visible, onClose, onEdit, onDuplicate, onDelete }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Recipe actions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            <Row
              icon="pencil"
              iconColor={Colors.secondary}
              title="Edit recipe"
              subtitle="Update name, servings, ingredients"
              onPress={() => { onClose(); onEdit(); }}
            />
            <Row
              icon="copy"
              iconColor={Colors.secondary}
              title="Duplicate"
              subtitle="Create a copy you can tweak"
              onPress={() => { onClose(); onDuplicate(); }}
            />
            <Row
              icon="trash"
              iconColor={Colors.status.negative}
              title="Delete recipe"
              subtitle="Permanently remove this recipe"
              destructive
              onPress={() => { onClose(); onDelete(); }}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Row({
  icon,
  iconColor,
  title,
  subtitle,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View
        style={[
          styles.rowIcon,
          destructive && { backgroundColor: '#ffe8e9' },
        ]}
      >
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text
          style={[
            styles.rowTitle,
            destructive && { color: Colors.status.negative },
          ]}
        >
          {title}
        </Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Shadows.level3,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cdd8d6',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
  },
  title: { ...Typography.h4, color: Colors.primary },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  options: {
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.m,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: Spacing.s,
    ...Shadows.level4,
  },
  rowIcon: {
    width: 44, height: 44,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: 2 },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  rowSub: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
});
