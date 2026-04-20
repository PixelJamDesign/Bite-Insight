/**
 * AddIngredientSheet — action sheet for choosing how to add an ingredient
 * to a recipe: search foods, scan a barcode, or pick from scan history.
 * Placeholder UI.
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

export type AddSource = 'search' | 'scan' | 'history';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (source: AddSource) => void;
}

export function AddIngredientSheet({ visible, onClose, onPick }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Add ingredient</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            <Option
              icon="search"
              title="Search foods"
              subtitle="Browse the Open Food Facts database"
              onPress={() => onPick('search')}
            />
            <Option
              icon="barcode-outline"
              title="Scan a barcode"
              subtitle="Use the camera to scan a product"
              onPress={() => onPick('scan')}
            />
            <Option
              icon="time-outline"
              title="Add from scan history"
              subtitle="Pick from your recent scans"
              onPress={() => onPick('history')}
            />
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function Option({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={22} color={Colors.secondary} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: Colors.background,
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
  title: {
    ...Typography.h4,
    color: Colors.primary,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  options: {
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
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
