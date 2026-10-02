/**
 * FeedbackQuestionnaire — "What could we do better?" / "Mind telling us
 * why?" (Figma 5949:14833 and 5957:11273). A centred white card over the
 * blurred page: icon, kicker + title, tick-any-that-apply rows in the
 * flagged-ingredient style, an optional comment, Send feedback / Skip.
 *
 * FeedbackQuestionnaireHost is mounted once in the root layout and shows
 * whichever questionnaire showFeedbackQuestionnaire() asked for, then the
 * "Thank you for your feedback!" toast (Figma 5957:11755) once it's sent.
 */
import { useEffect, useRef, useState, type ComponentType } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import {
  FEEDBACK_COMMENT_MAX,
  FEEDBACK_COPY,
  hideFeedbackQuestionnaire,
  submitFeedback,
  useFeedbackQuestionnaire,
  type FeedbackSource,
} from '@/lib/feedback';
import { BlurScrim } from '@/components/BlurScrim';
import CheckedIcon from '@/assets/icons/checkbox-checked.svg';
import ChatIcon from '@/assets/icons/feedback/chat.svg';
import HeartIcon from '@/assets/icons/feedback/heart.svg';
import StarIcon from '@/assets/icons/feedback/star.svg';

// Frosted glass for the toast, so it reads on any background. Expo Go
// can't load the native blur; there the tint is more solid instead.
type BlurProps = { blurType?: string; blurAmount?: number; style?: any };
const BlurView: ComponentType<BlurProps> | null =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? null
    : require('@sbaiahmed1/react-native-blur').BlurView;

/** How long the thank-you toast stays up on its own. */
const THANKS_MS = 4000;

const ICONS: Record<FeedbackSource, typeof ChatIcon> = {
  review: ChatIcon,
  trial_decline: HeartIcon,
};

export function FeedbackQuestionnaireHost() {
  const source = useFeedbackQuestionnaire();
  const [thanks, setThanks] = useState(false);
  return (
    <>
      {source && (
        // Keyed so each opening starts with nothing ticked.
        <FeedbackQuestionnaire
          key={source}
          source={source}
          onClose={hideFeedbackQuestionnaire}
          onSent={() => setThanks(true)}
        />
      )}
      {thanks && <ThanksToast onDone={() => setThanks(false)} />}
    </>
  );
}

function FeedbackQuestionnaire({
  source,
  onClose,
  onSent,
}: {
  source: FeedbackSource;
  onClose: () => void;
  onSent: () => void;
}) {
  const copy = FEEDBACK_COPY[source];
  const Icon = ICONS[source];
  const { session } = useAuth();
  const posthog = usePostHog();

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const canSend = picked.size > 0 || comment.trim().length > 0;

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(fade, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }).start();
  }, [fade]);

  function close() {
    Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => onClose());
  }

  function toggle(key: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function send() {
    if (!canSend) return;
    // Keep the list's order, not the order they were tapped.
    const reasons = copy.reasons.map((r) => r.key).filter((k) => picked.has(k));
    posthog?.capture('feedback_submitted', { source, reasons, has_comment: comment.trim().length > 0 });
    submitFeedback({ source, userId: session?.user?.id, reasons, comment });
    close();
    // Once the card has gone.
    setTimeout(onSent, 250);
  }

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <BlurScrim opacity={fade} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fade,
                transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [32, 0] }) }],
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Icon width={30} height={30} />
              </View>
              <View>
                <Text style={styles.kicker}>{copy.kicker}</Text>
                <Text style={styles.title}>{copy.title}</Text>
              </View>
            </View>

            <View style={styles.listBlock}>
              <Text style={styles.listHeading}>Pick any that apply</Text>
              <View style={styles.list}>
                {copy.reasons.map((r) => {
                  const on = picked.has(r.key);
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.row, on && styles.rowOn]}
                      onPress={() => toggle(r.key)}
                      activeOpacity={0.8}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      accessibilityLabel={r.label}
                    >
                      {on ? <CheckedIcon width={24} height={24} /> : <View style={styles.box} />}
                      <Text style={styles.rowLabel}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder="Tell us more (optional)"
              placeholderTextColor="rgba(2, 52, 50, 0.5)"
              multiline
              maxLength={FEEDBACK_COMMENT_MAX}
              textAlignVertical="top"
            />

            <View style={styles.buttons}>
              <TouchableOpacity
                style={[styles.primaryBtn, !canSend && styles.btnDisabled]}
                onPress={send}
                disabled={!canSend}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryLabel}>Send feedback</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={close} activeOpacity={0.7}>
                <Text style={styles.secondaryLabel}>Skip</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The pill at the top: "Thank you for your feedback!" with Dismiss. */
function ThanksToast({ onDone }: { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  function hide() {
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone());
  }

  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 8, tension: 80, useNativeDriver: true }).start();
    const t = setTimeout(hide, THANKS_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.toastWrap, { top: insets.top + Spacing.xs }]} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            opacity: anim,
            transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          },
        ]}
        accessibilityRole="alert"
        accessibilityLabel="Thank you for your feedback!"
      >
        <View style={styles.toastGlass} pointerEvents="none">
          {BlurView && <BlurView blurType="light" blurAmount={16} style={StyleSheet.absoluteFill} />}
          <View style={[StyleSheet.absoluteFill, BlurView ? styles.toastTint : styles.toastTintNoBlur]} />
        </View>
        <View style={styles.toastText}>
          <StarIcon width={18} height={18} />
          <Text style={styles.toastBold}>Thank you</Text>
          <Text style={styles.toastLight} numberOfLines={1}>
            for your feedback!
          </Text>
        </View>
        <TouchableOpacity onPress={hide} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.toastDismiss}>Dismiss</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  toastWrap: {
    position: 'absolute',
    left: Spacing.s + 3,
    right: Spacing.s + 3,
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
    minHeight: 32,
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.full,
  },
  // The glass, clipped to the pill. (No shadow: on a see-through view iOS
  // would draw it around the text.)
  toastGlass: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.full,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  toastTint: {
    backgroundColor: 'rgba(226, 241, 238, 0.6)',
  },
  toastTintNoBlur: {
    backgroundColor: 'rgba(226, 241, 238, 0.94)',
  },
  toastText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  toastBold: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
    color: '#18a68f',
  },
  toastLight: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: '#00342c',
  },
  toastDismiss: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
    color: Colors.secondary,
    textDecorationLine: 'underline',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    padding: Spacing.m,
    gap: Spacing.m,
    ...Shadows.level4,
  },
  header: {
    gap: Spacing.xs,
  },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 999,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
    color: Colors.secondary,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.4,
    color: Colors.primary,
  },
  listBlock: {
    gap: Spacing.xs,
  },
  listHeading: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
    color: Colors.primary,
  },
  list: {
    gap: Spacing.xxs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    minHeight: 48,
    paddingLeft: Spacing.xs,
    paddingRight: Spacing.s,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
    backgroundColor: '#f5fbfb',
  },
  rowOn: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(59,149,134,0.08)',
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#aad4cd',
    backgroundColor: Colors.surface.secondary,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
    color: Colors.primary,
  },
  input: {
    height: 115,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: 12,
    padding: Spacing.s,
    paddingTop: Spacing.s,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    backgroundColor: Colors.surface.secondary,
  },
  buttons: {
    gap: Spacing.xs,
  },
  primaryBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  primaryLabel: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
  },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingVertical: Spacing.s - 2,
    paddingHorizontal: Spacing.m,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
});
