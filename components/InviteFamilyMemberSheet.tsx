/**
 * InviteFamilyMemberSheet — owner-side "invite a managed member to link
 * their own account" bottom sheet.
 *
 * DRAFT: built on the design system (mirrors FamilySwitcherSheet's sheet
 * shell) as a starting point for Glenn's design.
 *
 * Two paths, per the agreed flow:
 *   - Enter their email  → email-bound invite (only that account can accept;
 *     if it matches an existing account the invite card lands in their inbox)
 *   - Share a link       → token-bound invite, opened via the native share
 *     sheet (WhatsApp / Messenger / etc.); they open it in the app to connect
 *
 * Calls the create-family-invite edge function (runs as the signed-in owner).
 */
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Animated,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Share,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastContext';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Mode = 'choice' | 'email';

export function InviteFamilyMemberSheet({
  visible,
  onClose,
  member,
}: {
  visible: boolean;
  onClose: () => void;
  member: { id: string; name: string } | null;
}) {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<Mode>('choice');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setMode('choice');
      setEmail('');
      slideAnim.setValue(SCREEN_HEIGHT);
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  const firstName = member?.name?.split(' ')[0] ?? 'them';

  async function createInvite(method: 'email' | 'link'): Promise<{ link?: string } | null> {
    if (!member) return null;
    const { data, error } = await supabase.functions.invoke('create-family-invite', {
      body: { family_profile_id: member.id, method, email: method === 'email' ? email.trim() : undefined },
    });
    if (error) {
      let msg = 'Could not create the invite. Try again.';
      try {
        const body = await (error as { context?: Response }).context?.json();
        if (body?.error) msg = body.error;
      } catch {}
      showToast({ message: msg, variant: 'error' });
      return null;
    }
    return data as { link?: string };
  }

  async function handleShareLink() {
    setBusy(true);
    const res = await createInvite('link');
    setBusy(false);
    if (!res?.link) return;
    onClose();
    try {
      await Share.share({
        message: `Join my family on Bite Insight so your preferences sync across. Tap to connect: ${res.link}`,
      });
    } catch {
      /* user dismissed the share sheet — invite still exists */
    }
  }

  async function handleSendEmail() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast({ message: 'Enter a valid email address.', variant: 'error' });
      return;
    }
    setBusy(true);
    const res = await createInvite('email');
    setBusy(false);
    if (!res) return;
    showToast({ message: `Invite sent to ${trimmed}.`, variant: 'success' });
    onClose();
  }

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} pointerEvents="box-none">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Ionicons name="close" size={20} color={Colors.primary} />
          </TouchableOpacity>

          <View style={styles.titleBlock}>
            <Text style={styles.title}>
              {mode === 'choice' ? `Invite ${firstName}` : `Email ${firstName}`}
            </Text>
            <Text style={styles.subtitle}>
              {mode === 'choice'
                ? `Link ${firstName}'s own account so their preferences and photo sync into your family. They stay in control and can leave anytime.`
                : `We'll send ${firstName} an invite. If they already have an account it appears in their notifications too.`}
            </Text>
          </View>

          <View style={styles.body}>
            {mode === 'choice' ? (
              <>
                <TouchableOpacity style={styles.option} activeOpacity={0.8} onPress={() => setMode('email')}>
                  <View style={styles.optionIcon}>
                    <Ionicons name="mail-outline" size={22} color={Colors.secondary} />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Enter their email</Text>
                    <Text style={styles.optionSub}>Best if you know the email on their account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.option} activeOpacity={0.8} onPress={handleShareLink} disabled={busy}>
                  <View style={styles.optionIcon}>
                    {busy ? (
                      <ActivityIndicator size="small" color={Colors.secondary} />
                    ) : (
                      <Ionicons name="link-outline" size={22} color={Colors.secondary} />
                    )}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>Share a link</Text>
                    <Text style={styles.optionSub}>Send via Messages, WhatsApp, anywhere</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.secondary} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="their@email.com"
                  placeholderTextColor={Colors.secondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoFocus
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
                  activeOpacity={0.85}
                  onPress={handleSendEmail}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send invite</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.backLink} onPress={() => setMode('choice')} activeOpacity={0.7}>
                  <Text style={styles.backLinkText}>Back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  kav: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  titleBlock: { paddingTop: 28, paddingHorizontal: 24, paddingBottom: 16, gap: 4 },
  title: {
    fontSize: 24,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },
  body: { paddingHorizontal: 24, paddingTop: 8, gap: 12 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1, gap: 2 },
  optionTitle: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  optionSub: {
    fontSize: 13,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.13,
  },
  input: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#aad4cd',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },
  primaryBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.32,
  },
  backLink: { alignSelf: 'center', paddingVertical: 8 },
  backLinkText: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
});
