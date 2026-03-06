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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { MenuFlaggedIcon } from './MenuIcons';
import { buildFlagReasonGroups, type FlagReasonGroup } from '@/constants/flagReasons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface FlagReasonSheetProps {
  visible: boolean;
  ingredientName: string;
  onClose: () => void;
  onConfirm: (reason: { category: string; text: string }) => void;
  healthConditions: string[];
  allergies: string[];
  dietaryPreferences: string[];
}

export function FlagReasonSheet({
  visible,
  ingredientName,
  onClose,
  onConfirm,
  healthConditions,
  allergies,
  dietaryPreferences,
}: FlagReasonSheetProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const hasShownRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // Selection state
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [isOther, setIsOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  const groups = buildFlagReasonGroups(healthConditions, allergies, dietaryPreferences);
  const canConfirm = isOther ? otherText.trim().length > 0 : !!selectedText;

  // ── Animation ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      hasShownRef.current = true;
      setMounted(true);
      // Reset state
      setSelectedSource(null);
      setSelectedText(null);
      setIsOther(false);
      setOtherText('');
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
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  function selectReason(source: string, text: string) {
    setSelectedSource(source);
    setSelectedText(text);
    setIsOther(false);
    setOtherText('');
  }

  function selectOther() {
    setSelectedSource(null);
    setSelectedText(null);
    setIsOther(true);
  }

  function handleConfirm() {
    if (isOther && otherText.trim()) {
      onConfirm({ category: 'Other', text: otherText.trim() });
    } else if (selectedSource && selectedText) {
      onConfirm({ category: selectedSource, text: selectedText });
    }
  }

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
              paddingBottom: insets.bottom + 24,
              maxHeight: SCREEN_HEIGHT * 0.85,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handle} />

          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color={Colors.secondary} />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconCircle}>
            <MenuFlaggedIcon size={28} color={Colors.status.negative} />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            Why are you flagging{' '}
            <Text style={styles.ingredientHighlight}>{ingredientName}</Text>?
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {groups.length > 0
              ? 'Select a reason based on your profile'
              : 'Tell us why you want to flag this ingredient'}
          </Text>

          {/* Scrollable reason list */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {groups.map((group) => (
              <View key={group.source} style={styles.group}>
                {/* Section header */}
                <Text style={styles.groupHeader}>{group.source}</Text>
                {group.reasons.map((reason) => {
                  const active = selectedSource === group.source && selectedText === reason;
                  return (
                    <TouchableOpacity
                      key={`${group.source}-${reason}`}
                      style={[styles.reasonRow, active && styles.reasonRowActive]}
                      onPress={() => selectReason(group.source, reason)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* "Other" option — always shown */}
            <View style={styles.group}>
              <Text style={styles.groupHeader}>Other</Text>
              <TouchableOpacity
                style={[styles.reasonRow, isOther && styles.reasonRowActive]}
                onPress={selectOther}
                activeOpacity={0.7}
              >
                <View style={[styles.radio, isOther && styles.radioActive]}>
                  {isOther && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.reasonText, isOther && styles.reasonTextActive]}>
                  Enter my own reason
                </Text>
              </TouchableOpacity>

              {isOther && (
                <TextInput
                  style={styles.otherInput}
                  value={otherText}
                  onChangeText={setOtherText}
                  placeholder="e.g. Makes me feel bloated"
                  placeholderTextColor="#aaa"
                  multiline
                  maxLength={200}
                  autoFocus
                />
              )}
            </View>
          </ScrollView>

          {/* Confirm button */}
          <TouchableOpacity
            style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={!canConfirm}
          >
            <MenuFlaggedIcon size={18} color="#fff" />
            <Text style={styles.confirmBtnText}>Flag Ingredient</Text>
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
    borderTopLeftRadius: Radius.l,
    borderTopRightRadius: Radius.l,
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.xs,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginBottom: Spacing.s,
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.s,
    right: Spacing.s,
    width: 36,
    height: 36,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,63,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: Spacing.m,
  },
  ingredientHighlight: {
    color: Colors.status.negative,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    textAlign: 'center',
    marginBottom: Spacing.s,
  },
  scrollArea: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  scrollContent: {
    paddingBottom: Spacing.s,
  },
  group: {
    marginBottom: Spacing.s,
  },
  groupHeader: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
    marginBottom: Spacing.xxs,
    paddingLeft: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    marginBottom: Spacing.xxs,
  },
  reasonRowActive: {
    backgroundColor: 'rgba(59,149,134,0.1)',
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: Colors.accent,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 20,
  },
  reasonTextActive: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },
  otherInput: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: Radius.m,
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
    fontSize: 15,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    backgroundColor: Colors.surface.tertiary,
    marginTop: Spacing.xxs,
    textAlignVertical: 'top',
  },
  confirmBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.l,
    backgroundColor: Colors.status.negative,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
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
});
