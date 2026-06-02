/**
 * family-invite — the in-app accept screen reached by opening a family
 * share link (biteinsight://family-invite?token=…). The notification-inbox
 * card is the other entry; this is for people who arrive via the link.
 *
 * DRAFT: built on the design system as a starting point for Glenn's design.
 *
 * Requires a signed-in user (the auth flow routes them in first). On accept
 * we call accept-family-invite, which validates the token and links this
 * account to the inviter's family member row.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toastContext';
import { CachedAvatar } from '@/components/CachedAvatar';

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface InvitePreview {
  inviter_name: string | null;
  inviter_avatar_url: string | null;
  valid: boolean;
}

export default function FamilyInviteScreen() {
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [busy, setBusy] = useState<null | 'accept' | 'decline'>(null);
  const [preview, setPreview] = useState<InvitePreview | null>(null);

  // Personalise the screen with the inviter's name + photo.
  useEffect(() => {
    if (!token) return;
    supabase.rpc('family_invite_preview', { p_token: token }).then(({ data }) => {
      const row = Array.isArray(data) ? data[0] : null;
      if (row) setPreview(row as InvitePreview);
    });
  }, [token]);

  const inviterName = preview?.inviter_name?.split(' ')[0] ?? null;

  async function respond(action: 'accept' | 'decline') {
    if (!token) {
      showToast({ message: 'This invite link is not valid.', variant: 'error' });
      return;
    }
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke('accept-family-invite', {
        body: { token, action },
      });
      if (error) {
        let msg = 'Something went wrong. Try again.';
        try {
          const body = await (error as { context?: Response }).context?.json();
          if (body?.error) msg = body.error;
        } catch {}
        showToast({ message: msg, variant: 'error' });
        return;
      }
      const bodyErr = (data as { error?: string } | null)?.error;
      if (bodyErr) {
        showToast({ message: bodyErr, variant: 'error' });
        return;
      }
      if (action === 'accept') {
        showToast({ message: "You're in. Your profile is now shared.", variant: 'success' });
      }
      router.replace('/(tabs)/dashboard' as never);
    } catch {
      showToast({ message: 'Something went wrong. Try again.', variant: 'error' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {preview?.inviter_avatar_url || preview?.inviter_name ? (
            <CachedAvatar
              avatarUrl={preview.inviter_avatar_url ?? null}
              initials={initialsFrom(preview.inviter_name ?? '?')}
              size="100%"
              initialsStyle={styles.avatarInitials}
            />
          ) : (
            <Ionicons name="people" size={40} color="#fff" />
          )}
        </View>

        <Text style={styles.title}>
          {inviterName ? `${inviterName} wants to add you to their family` : 'Join a family on Bite Insight'}
        </Text>
        <Text style={styles.body}>
          {inviterName
            ? `Tap below to join ${inviterName}'s family on Bite Insight.`
            : 'Someone wants to add you to their family on Bite Insight. Tap below to join.'}
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={() => respond('accept')}
          disabled={!!busy}
        >
          {busy === 'accept' ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Yes, join family</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          activeOpacity={0.7}
          onPress={() => respond('decline')}
          disabled={!!busy}
        >
          <Text style={styles.ghostBtnText}>No, thank you</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.m,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    padding: Spacing.l,
    alignItems: 'center',
    ...Shadows.level4,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
    marginBottom: Spacing.m,
    ...Shadows.level3,
  },
  avatarInitials: {
    fontSize: 36,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.7,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    marginBottom: Spacing.l,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.32,
  },
  ghostBtn: { paddingVertical: 12, alignItems: 'center', width: '100%' },
  ghostBtnText: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
});
