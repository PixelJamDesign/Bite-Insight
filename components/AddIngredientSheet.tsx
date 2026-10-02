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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Shadows, Typography } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { OptionCard } from '@/components/OptionCard';
import { usePostHog } from 'posthog-react-native';

export type AddSource = 'search' | 'scan' | 'history' | 'recipe';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (source: AddSource) => void;
  /** Sheet heading. Defaults to the recipe builder's "Add ingredient". */
  title?: string;
  /** Adds a "Choose a recipe" row above the product sources. Used by
   *  the meal planner, where a whole recipe can go into a slot. */
  includeRecipes?: boolean;
}

export function AddIngredientSheet({
  visible,
  onClose,
  onPick,
  title = 'Add ingredient',
  includeRecipes = false,
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
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsPad}>
            <AddIngredientOptions onPick={onPick} includeRecipes={includeRecipes} />
          </View>
        </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

type SourceRow = { source: AddSource; icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string };

const SOURCE_ROWS: Record<AddSource, SourceRow> = {
  history: {
    source: 'history',
    icon: 'time-outline',
    title: 'Add from scan history',
    subtitle: 'Pick from your recent scans',
  },
  recipe: {
    source: 'recipe',
    icon: 'restaurant-outline',
    title: 'Choose a recipe',
    subtitle: 'Pick from your recipe book',
  },
  search: {
    source: 'search',
    icon: 'search',
    title: 'Search foods',
    subtitle: 'Browse the Open Food Facts database',
  },
  scan: {
    source: 'scan',
    icon: 'barcode-outline',
    title: 'Scan a barcode',
    subtitle: 'Use the camera to scan a product',
  },
};

/**
 * Fixed orders, most likely first. Planning a meal you're usually not
 * holding the product, so things already scanned and recipes come first;
 * building a recipe you often are, so search and scan lead. Kept fixed on
 * purpose: people learn where an option sits. `add_source_picked` in
 * PostHog shows which get used, to tune these for everyone.
 */
const MEAL_ORDER: AddSource[] = ['history', 'recipe', 'search', 'scan'];
const RECIPE_ORDER: AddSource[] = ['search', 'scan', 'history'];

/**
 * The source rows without the sheet around them, so they can also be
 * shown as a step inside another sheet (MealBuilderSheet).
 */
export function AddIngredientOptions({
  onPick,
  includeRecipes = false,
  includeScan = true,
}: Pick<Props, 'onPick' | 'includeRecipes'> & {
  /** Off where the scanner can't come back to the caller. */
  includeScan?: boolean;
}) {
  const posthog = usePostHog();
  const context = includeRecipes ? 'meal' : 'recipe';
  const rows = (includeRecipes ? MEAL_ORDER : RECIPE_ORDER).filter((source) => includeScan || source !== 'scan');

  return (
    <View style={styles.options}>
      {rows.map((source, index) => {
        const row = SOURCE_ROWS[source];
        return (
          <OptionCard
            key={source}
            icon={row.icon}
            title={row.title}
            subtitle={row.subtitle}
            onPress={() => {
              posthog?.capture('add_source_picked', { source, position: index + 1, context });
              onPick(source);
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
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
  optionsPad: {
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.m,   // breathing room above the safe-area inset
  },
  options: {
    gap: 8,
  },
});
