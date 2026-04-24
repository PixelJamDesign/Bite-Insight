/**
 * FamilyIngredientPreferencesSheet — bottom sheet wrapper around the
 * FamilyIngredientPreferencesPanel. Used when we need the preferences
 * UI from a non-step context (e.g. a quick edit from the family list).
 *
 * The panel itself is used directly inside the add-family-member flow
 * as a step.
 *
 * Matches Figma node 4819-24905.
 */
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import {
  FamilyIngredientPreferencesPanel,
  ALL_CATEGORY,
  type FamilyMemberSummary,
  type PreferenceDraft,
  type PreferenceIngredient,
  type PreferenceState,
  type PreferenceTab,
} from '@/components/FamilyIngredientPreferencesPanel';

export type { FamilyMemberSummary, PreferenceDraft, PreferenceIngredient, PreferenceState, PreferenceTab };

interface Props {
  visible: boolean;
  onClose: () => void;

  member: FamilyMemberSummary;
  ingredients: PreferenceIngredient[];
  initial: PreferenceDraft;
  categories: string[];

  onSave: (next: PreferenceDraft) => void;
  onEditList?: (tab: PreferenceTab) => void;
  onSearch?: (tab: PreferenceTab) => void;
}

export function FamilyIngredientPreferencesSheet({
  visible,
  onClose,
  member,
  ingredients,
  initial,
  categories,
  onSave,
  onEditList,
  onSearch,
}: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  const [tab, setTab] = useState<PreferenceTab>('liked');
  const [category, setCategory] = useState<string>(ALL_CATEGORY);
  const [draft, setDraft] = useState<PreferenceDraft>(initial);

  // Re-snapshot the draft (and reset UI state) each time the sheet opens.
  useEffect(() => {
    if (visible) {
      setDraft(initial);
      setTab('liked');
      setCategory(ALL_CATEGORY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleSave() {
    onSave(draft);
    onClose();
  }

  function handleDiscard() {
    setDraft(initial);
    onClose();
  }

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrap,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
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

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <FamilyIngredientPreferencesPanel
                member={member}
                ingredients={ingredients}
                tab={tab}
                onTabChange={setTab}
                category={category}
                onCategoryChange={setCategory}
                categories={categories}
                draft={draft}
                onDraftChange={setDraft}
                showMemberHeader
                onEditList={onEditList}
                onSearch={onSearch}
              />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.discardBtn}
                onPress={handleDiscard}
                activeOpacity={0.85}
              >
                <Text style={styles.discardText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveText}>Save changes</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheetWrap: { maxHeight: '92%' },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
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
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 24,
  },
  discardBtn: {
    height: 52,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  saveBtn: {
    flex: 1,
    height: 52,
    paddingHorizontal: 24,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
