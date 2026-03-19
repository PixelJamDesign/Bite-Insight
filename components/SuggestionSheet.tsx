/**
 * SuggestionModal — a centered modal that lets users suggest a condition,
 * allergy, or dietary preference that isn't in the current list.
 *
 * Uses a centered Modal + KeyboardAvoidingView so the input stays visible
 * above the device keyboard.
 *
 * Inserts into the `condition_suggestions` table in Supabase.
 * A unique index on (user_id, category, suggestion_normalized) prevents
 * duplicate submissions; the admin `condition_suggestion_tally` view
 * aggregates votes across users.
 */

import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export type SuggestionCategory = 'health_condition' | 'allergy' | 'dietary_preference';

type Props = {
  visible: boolean;
  onClose: () => void;
  category: SuggestionCategory;
};

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  health_condition: 'health condition',
  allergy: 'allergy or intolerance',
  dietary_preference: 'dietary preference',
};

export function SuggestionSheet({ visible, onClose, category }: Props) {
  const { session } = useAuth();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  const label = CATEGORY_LABELS[category];

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdropAnim.setValue(0);
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1, duration: 220, useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, duration: 220, useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0, duration: 180, useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9, duration: 180, useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0, duration: 150, useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  function handleClose() {
    setText('');
    setSubmitted(false);
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || !session?.user?.id) return;

    Keyboard.dismiss();
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('condition_suggestions')
      .insert({
        user_id: session.user.id,
        category,
        suggestion: trimmed,
      });

    setSaving(false);

    if (insertError) {
      if (insertError.code === '23505') {
        setError("You've already suggested this one. Try something else!");
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }

    setSubmitted(true);
  }

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Centered card */}
      <KeyboardAvoidingView
        style={styles.centeredWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {submitted ? (
            <View style={styles.content}>
              <Text style={styles.title}>Thank you!</Text>
              <Text style={styles.body}>
                We've noted your suggestion. If enough people request it, we'll add it to the list.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.content}>
              <Text style={styles.title}>Suggest a {label}</Text>
              <Text style={styles.body}>
                Can't find what you're looking for? Let us know and we'll consider adding it.
              </Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder={`e.g. "${category === 'health_condition' ? 'Fibromyalgia' : category === 'allergy' ? 'Nightshade Sensitivity' : 'Mediterranean Diet'}"`}
                  placeholderTextColor="#9cb8b5"
                  value={text}
                  onChangeText={(v) => { setText(v); setError(null); }}
                  autoFocus
                  maxLength={100}
                  returnKeyType="send"
                  onSubmitEditing={handleSubmit}
                />
                {text.length > 0 && (
                  <TouchableOpacity onPress={() => { setText(''); setError(null); }} hitSlop={8} activeOpacity={0.7} style={styles.clearBtn}>
                    <Ionicons name="close" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={[styles.submitBtn, (!text.trim() || saving) && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!text.trim() || saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 52, 50, 0.45)',
  },
  centeredWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: Radius.l,
    padding: 24,
    ...Shadows.level4,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  content: {
    gap: Spacing.s,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.4,
    lineHeight: 26,
    paddingRight: 32,
  },
  body: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.secondary,
    lineHeight: 24,
    letterSpacing: 0,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    paddingHorizontal: Spacing.s,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: Colors.surface.tertiary,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
  },
  clearBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.status.negative,
    lineHeight: 20,
  },
  submitBtn: {
    width: '100%',
    backgroundColor: Colors.accent,
    borderRadius: Radius.m,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.m,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0,
  },
});
