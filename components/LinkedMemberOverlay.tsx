/**
 * LinkedMemberOverlay — the read-only detail card shown when tapping a
 * LINKED family member (Figma 5406:24984). Linked members own their own
 * account, so there's nothing to edit here — just their live details and
 * a "Remove from family" action.
 *
 * "Remove from family" deletes the family_profiles row (removes them from
 * the owner's list). Their own account is untouched — RLS lets an owner
 * delete their own family rows; the forbid_direct_family_link_writes
 * trigger only guards INSERT/UPDATE of the link, not DELETE.
 */
import { Modal, View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { CachedAvatar } from '@/components/CachedAvatar';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import type { FamilyProfile } from '@/lib/types';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function LinkedMemberOverlay({
  visible,
  member,
  relationshipLabel,
  tags,
  onClose,
  onRemoved,
}: {
  visible: boolean;
  member: FamilyProfile | null;
  relationshipLabel?: string;
  tags: string[];
  onClose: () => void;
  onRemoved: () => void;
}) {
  function handleRemove() {
    if (!member) return;
    Alert.alert(
      'Remove from family?',
      `${member.name} will be removed from your family list. Their own account won't be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('family_profiles').delete().eq('id', member.id);
            if (error) {
              Alert.alert('Could not remove', error.message);
              return;
            }
            onRemoved();
            onClose();
          },
        },
      ],
    );
  }

  if (!member) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <BlurView intensity={18} tint="light" style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.center} pointerEvents="box-none">
          <View style={styles.cardWrap}>
            {/* Avatar overlapping the card top */}
            <View style={styles.avatarWrap}>
              <CachedAvatar
                avatarUrl={member.avatar_url}
                initials={getInitials(member.name)}
                size="100%"
                initialsStyle={styles.avatarInitials}
              />
            </View>

            <View style={styles.card}>
              {/* Back arrow */}
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.7}
              >
                <MenuArrowLeftIcon color={Colors.primary} size={24} />
              </TouchableOpacity>

              <View style={styles.inner}>
                <View style={styles.identity}>
                  <Text style={styles.name}>{member.name}</Text>
                  {relationshipLabel ? <Text style={styles.relationship}>{relationshipLabel}</Text> : null}
                  {tags.length > 0 && (
                    <View style={styles.tagsRow}>
                      {tags.map((tag) => (
                        <View key={tag} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.removeBtn} activeOpacity={0.85} onPress={handleRemove}>
                  <Text style={styles.removeBtnText}>Remove from family</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Please note:</Text>
                <Text style={styles.noteBody}>
                  Removal of this member will remove them from your family member list. Their account
                  will not be deleted.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const AVATAR = 120;
const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(226,241,238,0.55)' },
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.m },
  cardWrap: { alignItems: 'center' },
  avatarWrap: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    borderWidth: 5,
    borderColor: '#fff',
    backgroundColor: Colors.accent,
    overflow: 'hidden',
    marginBottom: -40,
    zIndex: 2,
    ...Shadows.level3,
  },
  avatarInitials: {
    fontSize: 40,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.8,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.m,
    gap: Spacing.s,
    ...Shadows.level4,
  },
  backBtn: { position: 'absolute', top: 15, left: 15, zIndex: 5 },
  inner: { gap: Spacing.m },
  identity: { alignItems: 'center', gap: Spacing.xs },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    textAlign: 'center',
  },
  relationship: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    backgroundColor: 'rgba(0,119,111,0.25)',
    borderRadius: 999,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
  },
  tagText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },
  removeBtn: {
    backgroundColor: Colors.status.negative,
    borderRadius: Radius.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.14,
  },
  noteBox: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    padding: Spacing.s,
    gap: Spacing.xs,
  },
  noteTitle: {
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    letterSpacing: -0.14,
  },
});
