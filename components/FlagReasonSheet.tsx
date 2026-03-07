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
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { MenuFlaggedIcon } from './MenuIcons';
import { buildFlagReasonGroups } from '@/constants/flagReasons';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface FlagReasonSheetProps {
  visible: boolean;
  ingredientName: string;
  onClose: () => void;
  onConfirm: (reasons: { category: string; text: string }[]) => void;
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
  const { t } = useTranslation('flagReasons');
  const { t: tc } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const hasShownRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // Multi-select state
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [isOther, setIsOther] = useState(false);
  const [otherText, setOtherText] = useState('');

  const groups = buildFlagReasonGroups(healthConditions, allergies, dietaryPreferences);
  const canConfirm = selectedReasons.size > 0 || (isOther && otherText.trim().length > 0);

  // ── Animation ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      hasShownRef.current = true;
      setMounted(true);
      // Reset state
      setSelectedReasons(new Set());
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

  function toggleReason(source: string, text: string) {
    const key = `${source}|${text}`;
    setSelectedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleOther() {
    setIsOther((prev) => !prev);
    if (isOther) setOtherText('');
  }

  function handleConfirm() {
    const reasons: { category: string; text: string }[] = [];
    for (const key of selectedReasons) {
      const sepIdx = key.indexOf('|');
      reasons.push({
        category: key.slice(0, sepIdx),
        text: key.slice(sepIdx + 1),
      });
    }
    if (isOther && otherText.trim()) {
      reasons.push({ category: 'Other', text: otherText.trim() });
    }
    if (reasons.length > 0) onConfirm(reasons);
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop — teal-tinted */}
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
              maxHeight: SCREEN_HEIGHT * 0.88,
            },
          ]}
        >
          {/* Close button — no bg, shadow only */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={24} color={Colors.primary} />
          </TouchableOpacity>

          {/* Flag icon circle */}
          <View style={styles.iconCircle}>
            <MenuFlaggedIcon size={32} color={Colors.primary} />
          </View>

          {/* Two-line header */}
          <Text style={styles.subtitleLabel}>{t('sheet.whyFlagging')}</Text>
          <Text style={styles.ingredientTitle}>{ingredientName}?</Text>

          {/* Scrollable reason list with gradient fade */}
          <View style={styles.scrollWrapper}>
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {groups.map((group) => (
                <View key={group.source} style={styles.group}>
                  {/* Section header — Heading 5 */}
                  <Text style={styles.groupHeader}>{group.source}</Text>
                  {group.reasons.map((reason) => {
                    const key = `${group.source}|${reason}`;
                    const active = selectedReasons.has(key);
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.reasonRow, active && styles.reasonRowActive]}
                        onPress={() => toggleReason(group.source, reason)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, active && styles.checkboxActive]}>
                          {active && <Ionicons name="checkmark" size={16} color="#fff" />}
                        </View>
                        <Text style={styles.reasonText}>{reason}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {/* "Other" option — always shown */}
              <View style={styles.group}>
                <Text style={styles.groupHeader}>{t('sheet.otherHeader')}</Text>
                <TouchableOpacity
                  style={[styles.reasonRow, isOther && styles.reasonRowActive]}
                  onPress={toggleOther}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isOther && styles.checkboxActive]}>
                    {isOther && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.reasonText}>{t('sheet.enterOwnReason')}</Text>
                </TouchableOpacity>

                {isOther && (
                  <TextInput
                    style={styles.otherInput}
                    value={otherText}
                    onChangeText={setOtherText}
                    placeholder={t('sheet.otherPlaceholder')}
                    placeholderTextColor="#aaa"
                    multiline
                    maxLength={200}
                    autoFocus
                  />
                )}
              </View>
            </ScrollView>

            {/* Gradient fade at bottom of scroll area */}
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,1)']}
              style={styles.scrollGradient}
              pointerEvents="none"
            />
          </View>

          {/* Footer buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={!canConfirm}
            >
              <Text style={styles.confirmBtnText}>{t('sheet.flagIngredient')}</Text>
            </TouchableOpacity>

            <View style={styles.cancelBtnWrap}>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>{tc('buttons.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(226,241,238,0.8)',
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
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: Spacing.m,
    right: Spacing.m,
    width: 48,
    height: 48,
    borderRadius: Radius.l,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...Shadows.level3,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  subtitleLabel: {
    // Body Regular
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: 0,
    textAlign: 'center',
    marginBottom: Spacing.xxs,
  },
  ingredientTitle: {
    // Heading 3
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    textAlign: 'center',
    marginBottom: Spacing.s,
  },
  scrollWrapper: {
    width: '100%',
  },
  scrollArea: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.38,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  scrollGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
  group: {
    marginBottom: Spacing.l,
  },
  groupHeader: {
    // Heading 5
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: 0,
    marginBottom: Spacing.xs,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 48,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.s,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    marginBottom: Spacing.xxs,
  },
  reasonRowActive: {
    backgroundColor: 'rgba(59,149,134,0.08)',
    borderColor: Colors.accent,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  reasonText: {
    // Heading 5
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: 0,
  },
  otherInput: {
    width: '100%',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: '#aad4cd',
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
  footer: {
    width: '100%',
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: Radius.m,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.35,
  },
  confirmBtnText: {
    // Heading 5
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: 0,
  },
  cancelBtnWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    borderRadius: Radius.m,
    shadowColor: 'rgba(132,161,159,1)',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.19,
    shadowRadius: 14,
    elevation: 3,
  },
  cancelBtnText: {
    // Heading 5
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0,
  },
});
