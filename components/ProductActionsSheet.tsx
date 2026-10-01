/**
 * ProductActionsSheet — the "more" menu on a scanned product.
 * Same layout as RecipeActionsSheet (and reuses its ActionRow):
 *   • Add to meal plan
 *   • Add to recipe
 *   • Improve item details (edit the Open Food Facts entry)
 *
 * Each row closes this sheet first; the parent opens the next sheet after
 * a short delay so two Modals never overlap (iOS double-modal freeze).
 */
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { ActionRow, SPRING_WATER } from '@/components/RecipeActionsSheet';
import MealPlanIcon from '@/assets/icons/recipe-actions/meal-plan.svg';
import RecipeIcon from '@/assets/icons/recipe-actions/recipe.svg';
import EditIcon from '@/assets/icons/recipe-actions/edit.svg';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddToMealPlan: () => void;
  onAddToRecipe: () => void;
  onImproveDetails: () => void;
}

export function ProductActionsSheet({
  visible,
  onClose,
  onAddToMealPlan,
  onAddToRecipe,
  onImproveDetails,
}: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  function pick(action: () => void) {
    onClose();
    action();
  }

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
              <Text style={styles.title}>Product actions</Text>

              <View style={styles.rows}>
                <ActionRow
                  IconSvg={MealPlanIcon}
                  iconSize={22}
                  tint={SPRING_WATER}
                  title="Add to meal plan"
                  subtitle="Choose how much, then a day and a time"
                  onPress={() => pick(onAddToMealPlan)}
                />
                <ActionRow
                  IconSvg={RecipeIcon}
                  iconSize={22}
                  tint={SPRING_WATER}
                  title="Add to recipe"
                  subtitle="Use it in a new recipe or one you've already made"
                  onPress={() => pick(onAddToRecipe)}
                />
                <ActionRow
                  IconSvg={EditIcon}
                  iconSize={20}
                  tint={SPRING_WATER}
                  title="Improve item details"
                  subtitle="Something missing or wrong? Fix it on Open Food Facts for everyone"
                  onPress={() => pick(onImproveDetails)}
                />
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
