/**
 * StepEditorSheet — bottom sheet for adding or editing a single recipe
 * method step. Used from the Process section of the recipe builder.
 */
import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (text: string) => void;
  onDelete?: () => void;
  /** Initial text — empty for a new step, populated for an edit */
  initialText?: string;
  /** 1-based step number for the title */
  stepNumber: number;
}

export function StepEditorSheet({
  visible,
  onClose,
  onSave,
  onDelete,
  initialText = '',
  stepNumber,
}: Props) {
  const [text, setText] = useState(initialText);

  // Reset the text when the sheet opens for a different step
  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  function handleSave() {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      onClose();
      return;
    }
    onSave(trimmed);
  }

  function handleDelete() {
    Alert.alert(
      'Delete this step?',
      'This will remove the step from the recipe.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete?.();
          },
        },
      ],
    );
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>Step {stepNumber}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="Describe this step..."
                placeholderTextColor="#99b8b3"
                multiline
                autoFocus
                textAlignVertical="top"
              />
            </ScrollView>

            <View style={styles.actions}>
              {onDelete && initialText.length > 0 && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={20} color={Colors.status.negative} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>
                  {initialText.length > 0 ? 'Save changes' : 'Add step'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTouch: { flex: 1 },
  keyboardWrap: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Shadows.level3,
    minHeight: 280,
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
  scrollContent: {
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
  },
  input: {
    backgroundColor: '#f5fbfb',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: Spacing.s,
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 24,
    minHeight: 140,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: Spacing.s,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.s,
  },
  deleteBtn: {
    width: 52, height: 52,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: Colors.status.negative,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    height: 52,
    borderRadius: Radius.m,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
