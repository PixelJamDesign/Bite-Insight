/**
 * PregnancyStatusPrompt — modal shown when a user's pregnancy_due_date is
 * past (plus a 14 day grace) and they haven't updated their status yet.
 * Triggered from the root layout once per session.
 */
import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';

const GRACE_DAYS = 14;

/**
 * Returns true if this user should see the post-due-date prompt.
 * Conditions:
 *   - pregnancy_status === 'pregnant'
 *   - pregnancy_due_date was more than GRACE_DAYS ago
 *   - pregnancy_prompt_dismissed_at is null or older than the due date
 */
export function shouldShowPregnancyPrompt(profile: {
  pregnancy_status: string | null;
  pregnancy_due_date: string | null;
  pregnancy_prompt_dismissed_at: string | null;
}): boolean {
  if (profile.pregnancy_status !== 'pregnant') return false;
  if (!profile.pregnancy_due_date) return false;
  const dueMs = new Date(profile.pregnancy_due_date + 'T00:00:00').getTime();
  const graceMs = GRACE_DAYS * 24 * 60 * 60 * 1000;
  if (Date.now() < dueMs + graceMs) return false;
  if (profile.pregnancy_prompt_dismissed_at) {
    const dismissedMs = new Date(profile.pregnancy_prompt_dismissed_at).getTime();
    if (dismissedMs > dueMs) return false;
  }
  return true;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PregnancyStatusPrompt({ visible, onClose }: Props) {
  const { session } = useAuth();
  const [saving, setSaving] = useState(false);

  async function setStatus(next: 'breastfeeding' | 'done' | 'still_pregnant') {
    if (!session?.user?.id) return;
    setSaving(true);
    try {
      const updates: Record<string, string | null> = {
        pregnancy_prompt_dismissed_at: new Date().toISOString(),
      };
      if (next === 'breastfeeding') {
        updates.pregnancy_status = 'breastfeeding';
      } else if (next === 'done') {
        updates.pregnancy_status = null;
        updates.pregnancy_due_date = null;
      }
      // 'still_pregnant' just dismisses the prompt; status stays pregnant
      await supabase.from('profiles').update(updates).eq('id', session.user.id);
    } finally {
      setSaving(false);
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.content}>
            <Text style={styles.emoji}>👶</Text>
            <Text style={styles.title}>Has baby arrived?</Text>
            <Text style={styles.body}>
              Congratulations on making it this far. Your due date has passed,
              so we want to check in. Updating this helps us tailor guidance to
              where you are now.
            </Text>

            <View style={styles.options}>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={() => setStatus('breastfeeding')}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.btnPrimaryText}>Yes, and I'm breastfeeding</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnSecondary]}
                onPress={() => setStatus('done')}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.btnSecondaryText}>Yes, not breastfeeding</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => setStatus('still_pregnant')}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Text style={styles.btnGhostText}>Still pregnant</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    ...Shadows.level3,
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
  content: {
    padding: Spacing.m,
    paddingBottom: Spacing.s,
    gap: Spacing.s,
    alignItems: 'center',
  },
  emoji: { fontSize: 48, marginTop: 4 },
  title: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'center',
  },
  body: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
  options: {
    width: '100%',
    gap: 10,
    marginTop: Spacing.s,
  },
  btn: {
    paddingVertical: 16,
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    ...Shadows.level3,
  },
  btnPrimaryText: {
    ...Typography.h5,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
  },
  btnSecondary: {
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: 'transparent',
  },
  btnSecondaryText: {
    ...Typography.h5,
    color: Colors.secondary,
    fontFamily: 'Figtree_700Bold',
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
});
