/**
 * ConflictReviewStep — penultimate step in the profile journey. Shown only
 * when there are Tier 1 conflicts or Tier 2 redundancies to report.
 *
 * Tier 1 (hard): user must resolve each by picking which selection to keep
 *   or removing one. Save is blocked until all are resolved.
 * Tier 2 (redundancy): auto-resolved, shown as a summary so the user knows
 *   what was tidied up.
 */
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import type { Conflict } from '@/lib/profileConflicts';

interface Props {
  hardConflicts: Conflict[];
  redundancies: Conflict[];
  /** Resolve a hard conflict by removing one of its selections */
  onResolve: (conflictId: string, removeCategory: 'health' | 'allergy' | 'dietary', removeKey: string) => void;
  /** Keys of labels — caller provides. Pass any Map/dict/function that returns a label for a given (category,key) */
  labelFor: (category: 'health' | 'allergy' | 'dietary', key: string) => string;
}

export function ConflictReviewStep({ hardConflicts, redundancies, onResolve, labelFor }: Props) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>Quick check before we save</Text>
      <Text style={styles.subheading}>
        A few selections didn't quite match up. Let's sort them now so your
        profile works properly.
      </Text>

      {hardConflicts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NEEDS YOUR ATTENTION</Text>
          {hardConflicts.map((c) => (
            <View key={c.id} style={[styles.card, styles.cardHard]}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeHard}>
                  <Ionicons name="alert" size={14} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>{c.title}</Text>
              </View>
              <Text style={styles.cardMessage}>{c.message}</Text>
              <View style={styles.actions}>
                {c.selections.map((sel) => (
                  <TouchableOpacity
                    key={`${sel.category}:${sel.key}`}
                    style={styles.removeBtn}
                    onPress={() => onResolve(c.id, sel.category, sel.key)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-circle" size={16} color={Colors.status.negative} />
                    <Text style={styles.removeBtnText}>Remove "{labelFor(sel.category, sel.key)}"</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
      )}

      {redundancies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>WE TIDIED THESE UP</Text>
          {redundancies.map((c) => (
            <View key={c.id} style={[styles.card, styles.cardRedundancy]}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeRedundancy}>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                </View>
                <Text style={styles.cardTitle}>{c.title}</Text>
              </View>
              <Text style={styles.cardMessage}>{c.message}</Text>
            </View>
          ))}
        </View>
      )}

      {hardConflicts.length === 0 && redundancies.length === 0 && (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="checkmark-circle" size={40} color={Colors.status.positive} />
          </View>
          <Text style={styles.emptyTitle}>All good</Text>
          <Text style={styles.emptyBody}>Your selections look consistent. You're all set.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.m,
    gap: Spacing.m,
    paddingBottom: 120,
  },
  heading: { ...Typography.h3, color: Colors.primary },
  subheading: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  card: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: Spacing.s,
    gap: 10,
    ...Shadows.level4,
  },
  cardHard: {
    borderColor: Colors.status.negative,
    borderWidth: 1.5,
  },
  cardRedundancy: {
    borderColor: '#aad4cd',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgeHard: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.status.negative,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeRedundancy: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.status.positive,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  cardMessage: {
    fontSize: 14,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    lineHeight: 20,
  },
  actions: { gap: 8 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    padding: Spacing.s,
    borderWidth: 1,
    borderColor: '#aad4cd',
  },
  removeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.l,
    gap: Spacing.s,
  },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.primary,
  },
  emptyBody: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
});
