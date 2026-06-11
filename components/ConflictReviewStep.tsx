/**
 * ConflictReviewStep — penultimate step in the profile journey ("Overview").
 * Shown only when there are conflicts, cautions or redundancies to report.
 *
 * Tier 1 (hard): user must resolve each by picking which selection to keep
 *   or removing one. Save is blocked until all are resolved.
 * Tier 3 (caution): non-blocking. Shown as orange "Attention" cards advising
 *   the user's healthcare provider. No remove buttons.
 * Tier 2 (redundancy): auto-resolved, shown as a summary so the user knows
 *   what was tidied up.
 *
 * Design: Figma node 5463-14952.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { HeartPlusIcon } from '@/components/MenuIcons';
import { NutrientConflictNotice } from '@/components/NutrientConflictNotice';
import { nutrientConflictGroups, type Conflict } from '@/lib/profileConflicts';

const ORANGE = '#ff8736';

interface Props {
  hardConflicts: Conflict[];
  /** Non-blocking cautions — advise the user's healthcare provider. */
  cautions?: Conflict[];
  redundancies: Conflict[];
  /** Resolve a hard conflict by removing one of its selections */
  onResolve: (conflictId: string, removeCategory: 'health' | 'allergy' | 'dietary', removeKey: string) => void;
  /** Keys of labels — caller provides. Pass any Map/dict/function that returns a label for a given (category,key) */
  labelFor: (category: 'health' | 'allergy' | 'dietary', key: string) => string;
  /** Label of the neutral nutrient option, e.g. "Balance". */
  neutralLabel?: string;
}

export function ConflictReviewStep({ hardConflicts, cautions = [], redundancies, onResolve, labelFor, neutralLabel = 'Balance' }: Props) {
  const allGood = hardConflicts.length === 0 && cautions.length === 0 && redundancies.length === 0;

  // Group the nutrient-based cautions by disputed nutrient so every condition
  // pulling on that nutrient shows in one place (e.g. CF + heart disease +
  // hypertension all under "Sodium"), matching the watchlist notice design.
  const noticeItems = nutrientConflictGroups(cautions).map((g) => ({
    nutrientName: g.nutrientName,
    sides: g.sides.map((s) => ({
      label: labelFor(s.category, s.key),
      direction: s.direction,
      nutrientLabel: g.nutrientLabel,
    })),
  }));
  // Cautions that aren't tied to a single shared nutrient (e.g. CF vs high
  // cholesterol's total-fat vs saturated-fat tension, keto + diabetes) stay as
  // their own notes beneath the grouped card.
  const otherCautions = cautions.filter((c) => !c.resolvable);

  return (
    <View style={styles.root}>
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.heading}>Quick check before we save</Text>
          <Text style={styles.subheading}>
            Some picks didn't line up right. Let's fix them so your profile works smoothly.
          </Text>
        </View>

        {hardConflicts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Needs your attention</Text>
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

        {cautions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Worth a word with your doctor</Text>
            {noticeItems.length > 0 && (
              <NutrientConflictNotice items={noticeItems} neutralLabel={neutralLabel} />
            )}
            {otherCautions.map((c) => (
              <View key={c.id} style={styles.cautionCard}>
                <View style={styles.attentionPill}>
                  <HeartPlusIcon size={15} color="#fff" />
                  <Text style={styles.attentionPillText}>Attention</Text>
                </View>
                <Text style={styles.cautionTitle}>{c.title}</Text>
                <View style={styles.cautionDivider} />
                <Text style={styles.cautionMessage}>{c.message}</Text>
              </View>
            ))}
          </View>
        )}

        {redundancies.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>We tidied these up</Text>
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

        {allGood && (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="checkmark-circle" size={40} color={Colors.status.positive} />
            </View>
            <Text style={styles.emptyTitle}>All good</Text>
            <Text style={styles.emptyBody}>Your selections look consistent. You're all set.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    paddingBottom: Spacing.m,
  },
  panel: {
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    borderRadius: Radius.l,
    paddingTop: Spacing.m,
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
    gap: Spacing.m,
    ...Shadows.level4,
  },
  panelHeader: { gap: Spacing.xs },
  heading: { ...Typography.h4, fontFamily: 'Figtree_700Bold', color: Colors.primary },
  subheading: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  section: { gap: Spacing.s },
  sectionLabel: {
    ...Typography.h5,
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },

  // ── Caution (Attention) card ──────────────────────────────────────────────
  cautionCard: {
    backgroundColor: 'rgba(255,135,54,0.1)',
    borderWidth: 2,
    borderColor: ORANGE,
    borderRadius: Radius.m,
    padding: Spacing.s,
    gap: Spacing.xs,
  },
  attentionPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff7824',
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  attentionPillText: {
    fontSize: 13,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.26,
  },
  cautionTitle: {
    fontSize: 14,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: -0.14,
    lineHeight: 18,
  },
  cautionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,135,54,0.3)',
  },
  cautionMessage: {
    fontSize: 14,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    letterSpacing: -0.14,
    lineHeight: 21,
  },

  // ── Hard / redundancy cards ───────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.m,
    padding: Spacing.s,
    gap: 10,
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
    backgroundColor: Colors.surface.secondary,
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

  // ── Empty state ───────────────────────────────────────────────────────────
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
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  emptyBody: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
});
