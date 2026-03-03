import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface ConfirmSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  /** The phrase the user must type to unlock the confirm button */
  confirmPhrase: string;
  /** Label shown on the confirm button */
  confirmLabel: string;
  /** Whether the confirm action is in progress */
  loading?: boolean;
}

export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase,
  confirmLabel,
  loading = false,
}: ConfirmSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const hasShownRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [typed, setTyped] = useState('');

  const isMatch = typed.trim().toUpperCase() === confirmPhrase.toUpperCase();

  useEffect(() => {
    if (visible) {
      hasShownRef.current = true;
      setMounted(true);
      setTyped('');
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (hasShownRef.current) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
        setTyped('');
      });
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropAnim }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sheet */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardWrap}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom: insets.bottom + 32,
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color={Colors.status.negative} />
          </TouchableOpacity>

          {/* Warning icon */}
          <View style={styles.iconWrap}>
            <Ionicons name="warning" size={40} color={Colors.status.negative} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Description */}
          <Text style={styles.description}>{description}</Text>

          {/* Prompt */}
          <View style={styles.promptSection}>
            <Text style={styles.promptLabel}>
              Type <Text style={styles.promptPhrase}>{confirmPhrase}</Text> to confirm
            </Text>
            <TextInput
              style={[
                styles.input,
                isMatch && styles.inputMatch,
              ]}
              value={typed}
              onChangeText={setTyped}
              placeholder={confirmPhrase}
              placeholderTextColor="#ccc"
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          {/* Actions */}
          <TouchableOpacity
            style={[styles.confirmBtn, !isMatch && styles.confirmBtnDisabled]}
            onPress={onConfirm}
            activeOpacity={0.85}
            disabled={!isMatch || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 32,
    paddingTop: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,47,97,0.1)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,47,97,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.status.negative,
    letterSpacing: -0.44,
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  promptSection: {
    width: '100%',
    gap: 8,
    marginBottom: 24,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Figtree_400Regular',
    color: Colors.primary,
    textAlign: 'center',
  },
  promptPhrase: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.status.negative,
  },
  input: {
    width: '100%',
    height: 52,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 2,
    backgroundColor: '#fafafa',
  },
  inputMatch: {
    borderColor: Colors.status.positive,
    backgroundColor: '#f0faf8',
  },
  confirmBtn: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.status.negative,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.35,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.16,
  },
  cancelBtn: {
    paddingVertical: 16,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.16,
  },
});
