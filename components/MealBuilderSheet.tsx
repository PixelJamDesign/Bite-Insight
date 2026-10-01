/**
 * MealBuilderSheet — create / edit one planned meal, as a tall bottom
 * sheet over the planner.
 *
 *   Meal name (optional — named from the time if left blank)
 *   Time card
 *   Items, each with its portion
 *   Meal totals
 *   Save as a recipe (Plus only)
 *   Discard / Save footer
 *
 * The add-source list, the time picker and the portion picker are steps
 * inside this one sheet rather than sheets of their own: a second Modal
 * on top of an open one freezes iOS (see app/recipes/pick-scan.tsx).
 *
 * Search, scan and the recipe / scan-history pickers are full screens.
 * To reach them the sheet hides itself (onHide) and the planner reopens
 * it when it regains focus. The meal itself lives in DraftMealProvider,
 * so nothing is lost in between.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Radius } from '@/constants/theme';
import { TextField } from '@/components/TextField';
import { PlusBadge } from '@/components/PlusBadge';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import { AddIngredientOptions, type AddSource } from '@/components/AddIngredientSheet';
import { QuantityPickerBody } from '@/components/QuantityPickerSheet';
import { MealTimeBody } from '@/components/MealTimeSheet';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toastContext';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useDraftMeal } from '@/lib/draftMealContext';
import {
  dayAtTimeLabel,
  defaultMealName,
  portionLabel,
  relativeDayLabel,
  saveItemsAsRecipe,
  saveMeal,
  sumNutrition,
} from '@/lib/mealPlan';
import { MealTotalsList } from '@/components/MealTotalsList';

type Step = 'main' | 'add' | 'time' | 'portion';

interface Props {
  visible: boolean;
  /** Hide the sheet but keep the draft — used while a picker screen is
   *  on top. The planner reopens the sheet when it regains focus. */
  onHide: () => void;
  /** The meal was saved or discarded. The draft has been cleared. */
  onDone: (result: { saved: boolean; dateKey: string }) => void;
}

export function MealBuilderSheet({ visible, onHide, onDone }: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
  const { height: windowHeight } = useWindowDimensions();
  const { session } = useAuth();
  const { showToast } = useToast();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  const draftMeal = useDraftMeal();
  // The draft is cleared the moment a meal is saved or discarded; keep
  // the last one so the sheet still has something to show as it slides out.
  const lastDraft = useRef(draftMeal.draft);
  if (draftMeal.draft) lastDraft.current = draftMeal.draft;
  const d = draftMeal.draft ?? lastDraft.current;

  const [step, setStep] = useState<Step>('main');
  const [portionKey, setPortionKey] = useState<string | null>(null);
  const [saveAsRecipe, setSaveAsRecipe] = useState(false);
  const [saving, setSaving] = useState(false);

  // Always come back to the main step when the sheet (re)opens.
  useEffect(() => {
    if (visible) setStep('main');
  }, [visible]);

  // A fresh meal starts with the checkbox off.
  useEffect(() => {
    setSaveAsRecipe(false);
    setSaving(false);
  }, [d?.editingMealId, d?.dateKey]);

  const totals = useMemo(() => sumNutrition(d?.items ?? []), [d?.items]);

  if (!d) return null;

  const isEditing = Boolean(d.editingMealId);
  const portionItem = d.items.find((i) => i.key === portionKey) ?? null;
  const canSave = d.items.length > 0 && !saving;
  const resolvedName = d.name.trim() || defaultMealName(d.time);

  function finish(saved: boolean) {
    const dateKey = d!.dateKey;
    draftMeal.clear();
    onDone({ saved, dateKey });
  }

  function handleDiscard() {
    // Alert buttons are a no-op on web, so only confirm on native.
    if (d!.items.length === 0 || Platform.OS === 'web') {
      finish(false);
      return;
    }
    Alert.alert('Discard this meal?', "Anything you've added will be lost.", [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => finish(false) },
    ]);
  }

  function handleAddSourceSelected(source: AddSource) {
    // The pickers are full screens, so get out of their way first.
    onHide();
    if (source === 'recipe' || source === 'history') {
      router.push({
        pathname: '/meal-plan-add',
        params: { source: source === 'recipe' ? 'recipes' : 'scans' },
      } as never);
    } else if (source === 'search') {
      router.push('/food-search?addToMeal=1' as never);
    } else if (source === 'scan') {
      // The scanner can't router.back() to us reliably, so tell it where
      // to land — same reason the recipe builder passes returnTo.
      router.push(
        `/(tabs)/scanner?addToMeal=1&returnTo=${encodeURIComponent('/meal-plan')}` as never,
      );
    }
  }

  function handleToggleSaveAsRecipe() {
    if (!isPlus) {
      // Let this sheet finish closing before the upsell Modal opens.
      onHide();
      setTimeout(showUpsell, 350);
      return;
    }
    setSaveAsRecipe((v) => !v);
  }

  async function handleSave() {
    const userId = session?.user?.id;
    if (!userId || !canSave) return;
    setSaving(true);

    const mealId = await saveMeal(userId, {
      id: d!.editingMealId,
      dateKey: d!.dateKey,
      time: d!.time,
      name: resolvedName,
      items: d!.items,
    });
    if (!mealId) {
      setSaving(false);
      // The sheet covers the toast layer, so use an alert here.
      Alert.alert('Could not save this meal', 'Please try again.');
      return;
    }

    let recipeSaved = false;
    if (saveAsRecipe && isPlus) {
      recipeSaved = Boolean(await saveItemsAsRecipe(userId, resolvedName, d!.items));
    }

    const when = dayAtTimeLabel(d!.dateKey, d!.time);
    setSaving(false);
    finish(true);
    if (saveAsRecipe && isPlus && !recipeSaved) {
      showToast({
        message: 'Meal saved, but we could not add it to your recipe book.',
        variant: 'error',
      });
    } else {
      showToast({
        message: recipeSaved ? `Planned for ${when} and saved to your recipes` : `Planned for ${when}`,
        variant: 'success',
      });
    }
  }

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={handleDiscard}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          {/* Tapping outside only closes an empty meal — a stray tap
              shouldn't throw away one that has items in it. */}
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={d.items.length === 0 ? handleDiscard : undefined}
            activeOpacity={1}
          />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%' }}
        >
          <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
            <SafeAreaView
              style={[styles.sheet, { maxHeight: windowHeight * 0.92 }]}
              edges={['bottom']}
            >
              <View style={styles.handle} />

              <View style={styles.closeRow}>
                {step !== 'main' ? (
                  <TouchableOpacity
                    style={styles.backLink}
                    onPress={() => setStep('main')}
                    hitSlop={12}
                    activeOpacity={0.7}
                  >
                    <MenuArrowLeftIcon color={Colors.secondary} size={16} />
                    <Text style={styles.backLinkText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <View />
                )}
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={handleDiscard}
                  hitSlop={12}
                  activeOpacity={0.7}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={22} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {step === 'add' && (
                <View style={styles.stepBody}>
                  <Text style={styles.title}>Add to meal</Text>
                  <AddIngredientOptions onPick={handleAddSourceSelected} includeRecipes />
                </View>
              )}

              {step === 'time' && (
                <View style={styles.stepPad}>
                  <MealTimeBody
                    visible
                    value={d.time}
                    onSave={(time) => {
                      draftMeal.setTime(time);
                      setStep('main');
                    }}
                  />
                </View>
              )}

              {step === 'portion' && portionItem && (
                <View style={styles.stepPad}>
                  <QuantityPickerBody
                    visible
                    title={portionItem.kind === 'recipe' ? 'How many servings?' : 'How much?'}
                    servingsMode={portionItem.kind === 'recipe'}
                    value={
                      portionItem.kind === 'recipe'
                        ? portionItem.servings
                        : portionItem.quantity_value ?? 100
                    }
                    unit={portionItem.quantity_unit ?? 'g'}
                    onClose={() => setStep('main')}
                    onSave={(value, unit) => {
                      draftMeal.updatePortion(
                        portionItem.key,
                        portionItem.kind === 'recipe'
                          ? { servings: value }
                          : { quantity_value: value, quantity_unit: unit },
                      );
                      setStep('main');
                    }}
                  />
                </View>
              )}

              {step === 'main' && (
                <>
                  <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.body}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.titleBlock}>
                      <Text style={styles.title}>{isEditing ? 'Edit meal' : 'Plan a meal'}</Text>
                      <Text style={styles.bodySmall}>{relativeDayLabel(d.dateKey)}</Text>
                    </View>

                    {/* ── Name + time ─────────────────────────────────── */}
                    <View style={styles.group16}>
                      <View style={styles.group16}>
                        <Text style={styles.h4}>Meal name</Text>
                        <TextField
                          value={d.name}
                          onChangeText={draftMeal.setName}
                          placeholder={defaultMealName(d.time)}
                          returnKeyType="done"
                        />
                      </View>

                      <TouchableOpacity
                        style={styles.inlineCard}
                        onPress={() => setStep('time')}
                        activeOpacity={0.85}
                      >
                        <View style={styles.inlineCardLeft}>
                          <Text style={styles.h5}>Time</Text>
                          <Text style={styles.bodySmall}>When do you plan to eat?</Text>
                        </View>
                        <View style={styles.pill}>
                          <Text style={styles.pillText}>{d.time}</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* ── Items ───────────────────────────────────────── */}
                    <View style={styles.section}>
                      <View style={styles.sectionHeaderRow}>
                        <View style={styles.sectionHeaderText}>
                          <Text style={styles.h4}>What you're eating</Text>
                          <View style={styles.countRow}>
                            <Text style={styles.bodySmall}>This meal has</Text>
                            <Text style={styles.countBold}>
                              {d.items.length} {d.items.length === 1 ? 'item' : 'items'}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.squareAddBtn}
                          onPress={() => setStep('add')}
                          activeOpacity={0.85}
                          accessibilityLabel="Add an item"
                        >
                          <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      {d.items.length === 0 ? (
                        <TouchableOpacity
                          style={styles.emptyCard}
                          onPress={() => setStep('add')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.emptyCardText}>Add a recipe or a product</Text>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.itemList}>
                          {d.items.map((item) => (
                            <View key={item.key} style={styles.itemRow}>
                              <View style={styles.itemThumb}>
                                {item.image_url ? (
                                  <Image
                                    source={{ uri: item.image_url }}
                                    style={styles.itemThumbImage}
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View style={styles.itemThumbNoImage}>
                                    <Ionicons name="image-outline" size={16} color="#aad4cd" />
                                    <Text style={styles.itemThumbNoImageText}>No image</Text>
                                  </View>
                                )}
                              </View>
                              <View style={styles.itemInfo}>
                                <Text style={styles.itemBrand} numberOfLines={1}>
                                  {item.kind === 'recipe'
                                    ? 'Recipe'
                                    : item.product_snapshot?.brand || 'Product'}
                                </Text>
                                <Text style={styles.itemName} numberOfLines={2}>
                                  {item.title}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={styles.itemQty}
                                onPress={() => {
                                  setPortionKey(item.key);
                                  setStep('portion');
                                }}
                                activeOpacity={0.75}
                                accessibilityLabel={`Change portion, ${portionLabel(item)}`}
                              >
                                <Text style={styles.itemQtyText}>{portionLabel(item)}</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => draftMeal.removeItem(item.key)}
                                activeOpacity={0.7}
                                hitSlop={8}
                                accessibilityLabel={`Remove ${item.title}`}
                              >
                                <Ionicons name="close" size={18} color={Colors.secondary} />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>

                    {/* ── Totals ──────────────────────────────────────── */}
                    {d.items.length > 0 && (
                      <View style={styles.section}>
                        <View style={styles.sectionHeaderText}>
                          <Text style={styles.h4}>Meal totals</Text>
                          <Text style={styles.bodySmall}>Everything above, added up.</Text>
                        </View>
                        <MealTotalsList totals={totals} />
                      </View>
                    )}

                    {/* ── Save as a recipe (Plus) ─────────────────────── */}
                    <TouchableOpacity
                      style={styles.inlineCard}
                      onPress={handleToggleSaveAsRecipe}
                      activeOpacity={0.85}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: saveAsRecipe }}
                    >
                      <View style={[styles.checkbox, saveAsRecipe && styles.checkboxChecked]}>
                        {saveAsRecipe && <Ionicons name="checkmark" size={16} color="#fff" />}
                      </View>
                      <View style={styles.inlineCardLeft}>
                        <Text style={styles.h5}>Save as a recipe</Text>
                        <Text style={styles.bodySmall}>
                          Keep this meal in your recipe book to plan again.
                        </Text>
                      </View>
                      {!isPlus && <PlusBadge size="small" />}
                    </TouchableOpacity>
                  </ScrollView>

                  {/* ── Footer ──────────────────────────────────────── */}
                  <View style={styles.footer}>
                    <TouchableOpacity
                      style={styles.discardBtn}
                      onPress={handleDiscard}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.discardBtnText}>Discard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
                      onPress={handleSave}
                      disabled={!canSave}
                      activeOpacity={0.85}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.saveBtnText}>
                          {isEditing ? 'Save changes' : 'Save meal'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </SafeAreaView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// Sheet chrome matches the other sheets; section, card, row and footer
// blocks mirror app/recipes/new.tsx.
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
    paddingTop: 7,
    paddingBottom: 24,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backLinkText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  // Steps other than the main form
  stepPad: { paddingHorizontal: 24, marginTop: 8 },
  stepBody: { paddingHorizontal: 24, marginTop: 8, gap: 24 },

  // Shrinks to fit under the sheet's maxHeight, then scrolls.
  scroll: { flexShrink: 1 },
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 32,
  },
  titleBlock: { gap: 4 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  h4: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
  },
  h5: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  bodySmall: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: 0,
  },

  group16: { gap: 16 },
  section: { gap: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  sectionHeaderText: { flex: 1, gap: 4 },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 4 },
  countBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: 0,
  },
  squareAddBtn: {
    width: 52,
    height: 52,
    borderRadius: Radius.l,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  inlineCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  inlineCardLeft: { flex: 1, gap: 4 },
  pill: {
    backgroundColor: '#e4f1ef',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  pillText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    fontVariant: ['tabular-nums'],
  },

  emptyCard: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    letterSpacing: -0.14,
  },

  itemList: { gap: 8 },
  itemRow: {
    backgroundColor: '#f5fbfb',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    minHeight: 76,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.m,
    backgroundColor: '#e2f1ee',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemThumbImage: { width: '100%', height: '100%' },
  itemThumbNoImage: { alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemThumbNoImageText: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#aad4cd',
  },
  itemInfo: { flex: 1, justifyContent: 'center', gap: 2 },
  itemBrand: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },
  itemName: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  itemQty: {
    backgroundColor: '#e4f1ef',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  itemQtyText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
    textAlign: 'center',
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },

  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(170, 212, 205, 0.4)',
  },
  discardBtn: {
    height: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  discardBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  saveBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
