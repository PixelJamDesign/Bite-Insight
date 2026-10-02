/**
 * FeedbackQuestionnaire — "What could we do better?" / "Mind telling us
 * why?" (Figma 5949:14833 and 5957:11273). A centred white card over the
 * blurred page: icon, kicker + title, tick-any-that-apply rows in the
 * flagged-ingredient style, an optional comment, Send feedback / Skip.
 *
 * FeedbackQuestionnaireHost is mounted once in the root layout and shows
 * whichever questionnaire showFeedbackQuestionnaire() asked for.
 */
import { useEffect, useRef, useState } from 'react';
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

const ICONS: Record<FeedbackSource, typeof ChatIcon> = {
  review: ChatIcon,
  trial_decline: HeartIcon,
};

export function FeedbackQuestionnaireHost() {
  const source = useFeedbackQuestionnaire();
  if (!source) return null;
  // Keyed so each opening starts with nothing ticked.
  return <FeedbackQuestionnaire key={source} source={source} onClose={hideFeedbackQuestionnaire} />;
}

function FeedbackQuestionnaire({ source, onClose }: { source: FeedbackSource; onClose: () => void }) {
  const copy = FEEDBACK_COPY[source];
  const Icon = ICONS[source];
  const { session } = useAuth();
  const posthog = usePostHog();

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
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

  async function send() {
    if (!canSend || sent) return;
    // Keep the list's order, not the order they were tapped.
    const reasons = copy.reasons.map((r) => r.key).filter((k) => picked.has(k));
    setSent(true);
    posthog?.capture('feedback_submitted', { source, reasons, has_comment: comment.trim().length > 0 });
    await submitFeedback({ source, userId: session?.user?.id, reasons, comment });
    setTimeout(close, 900);
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
                disabled={!canSend || sent}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryLabel}>{sent ? 'Thanks, that really helps' : 'Send feedback'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={close} disabled={sent} activeOpacity={0.7}>
                <Text style={styles.secondaryLabel}>Skip</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
