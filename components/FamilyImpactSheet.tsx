/**
 * FamilyImpactSheet — bottom sheet showing how a recipe affects a single
 * family member (Figma nodes 4819-24288 "Good", 4826-25938 "Ok",
 * 4826-25720 "Warning").
 *
 * Three visual states share one component:
 *   • "Good"    — status strip only, impact panels below
 *   • "Ok"      — same as Good but the status pill turns orange
 *   • "Warning" — extra Flagged / Allergen alert cards between the
 *                 status strip and the impact panels
 *
 * Layout decisions borrowed directly from scan-result.tsx:
 *   • 1–2 impact panels → side-by-side row
 *   • 3+ impact panels  → vertical stack
 *
 * This sheet is presentational. Data + computation live in the parent
 * (recipe detail screen) — we just render what we're given.
 */
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { CachedAvatar } from '@/components/CachedAvatar';
import type { InsightDef, ImpactResult } from '@/lib/insightEngine';
import BulletMarkerIcon from '@/assets/icons/bullet-marker.svg';

// ── Types ────────────────────────────────────────────────────────────────

/**
 * One flagged-ingredient match inside this recipe. Shown inside the
 * orange "Flagged" card.
 */
export interface FlaggedMatch {
  ingredientName: string;
  reasons: string[];
}

/** Allergen strings we want to call out as a red "Warning" card. */
export type AllergenWarning = string;

export interface ImpactMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  /** Tag pills shown under the name (conditions + allergies + prefs). */
  tags: string[];
}

interface Props {
  visible: boolean;
  onClose: () => void;

  member: ImpactMember;

  /** Overall verdict for this member + recipe combo. */
  verdict: { label: 'Good' | 'Ok' | 'Warning'; color: string };

  /** Insight panels to show, in priority order. Driven by getActiveInsights. */
  insights: { def: InsightDef; result: ImpactResult }[];

  /** Populated when the recipe contains ingredients this member has flagged. */
  flaggedMatches?: FlaggedMatch[];

  /** Populated when the recipe has allergens this member is allergic to. */
  allergenWarnings?: AllergenWarning[];

  /** Optional — tap handler for each impact panel (future drilldown). */
  onInsightPress?: (insight: { def: InsightDef; result: ImpactResult }) => void;
}

// ── Component ────────────────────────────────────────────────────────────

export function FamilyImpactSheet({
  visible,
  onClose,
  member,
  verdict,
  insights,
  flaggedMatches = [],
  allergenWarnings = [],
  onInsightPress,
}: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  const stacked = insights.length >= 3;

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheetWrap,
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            {/* Handle + close */}
            <View style={styles.handle} />
            <View style={styles.closeRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Member header — 80px avatar + name + tags */}
              <View style={styles.memberRow}>
                <View style={styles.avatarWrap}>
                  <CachedAvatar
                    avatarUrl={member.avatarUrl}
                    initials={initialsFrom(member.name)}
                    size={80}
                  />
                </View>
                <View style={styles.memberText}>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.tags.length > 0 && (
                    <View style={styles.tagWrap}>
                      {member.tags.map((t) => (
                        <View key={t} style={styles.tag}>
                          <Text style={styles.tagText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Recipe impact status strip */}
              <View style={styles.statusStrip}>
                <Text style={styles.statusLabel}>Recipe impact</Text>
                <View style={[styles.statusPill, { backgroundColor: verdict.color }]}>
                  <Text style={styles.statusPillText}>{verdict.label}</Text>
                </View>
              </View>

              {/* Flagged card(s) — one per matched ingredient */}
              {flaggedMatches.map((match, idx) => (
                <FlaggedCard key={`flag-${idx}`} match={match} />
              ))}

              {/* Allergen warning card(s) */}
              {allergenWarnings.map((msg, idx) => (
                <AllergenCard key={`allergen-${idx}`} message={msg} />
              ))}

              {/* Impact panels — side-by-side row for 1-2, stacked for 3+ */}
              {insights.length > 0 && (
                <View style={stacked ? styles.panelsCol : styles.panelsRow}>
                  {insights.map(({ def, result }) => {
                    const Icon = def.icons[result.iconKey];
                    if (stacked) {
                      return (
                        <TouchableOpacity
                          key={def.key}
                          style={styles.panelRow}
                          activeOpacity={0.7}
                          onPress={onInsightPress ? () => onInsightPress({ def, result }) : undefined}
                          disabled={!onInsightPress}
                        >
                          <Icon width={48} height={40} />
                          <View style={styles.panelRowContent}>
                            <Text style={styles.panelRowLabel}>{def.label}</Text>
                            <View style={[styles.impactPill, { backgroundColor: result.color }]}>
                              <Text style={styles.impactPillText}>{result.label}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    }
                    return (
                      <TouchableOpacity
                        key={def.key}
                        style={styles.panel}
                        activeOpacity={0.7}
                        onPress={onInsightPress ? () => onInsightPress({ def, result }) : undefined}
                        disabled={!onInsightPress}
                      >
                        <Icon width={def.iconWidth} height={def.iconHeight} />
                        <View style={styles.panelLabelGroup}>
                          <Text style={styles.panelLabel}>{def.label}</Text>
                          <View style={[styles.impactPill, { backgroundColor: result.color }]}>
                            <Text style={styles.impactPillText}>{result.label}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Nothing-to-show fallback — very rare. */}
              {insights.length === 0 &&
                flaggedMatches.length === 0 &&
                allergenWarnings.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>
                      This recipe has no specific dietary impact on {member.name}.
                    </Text>
                  </View>
                )}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Alert cards ──────────────────────────────────────────────────────────

function FlaggedCard({ match }: { match: FlaggedMatch }) {
  return (
    <View style={styles.flaggedCard}>
      <View style={styles.flaggedBadge}>
        <Ionicons name="flag" size={14} color="#fff" />
        <Text style={styles.flaggedBadgeText}>Flagged</Text>
      </View>
      <Text style={styles.flaggedHeadline}>
        This recipe contains an ingredient that matches a flagged ingredient.
      </Text>
      <View style={styles.flaggedDivider} />
      <Text style={styles.flaggedIngredient}>{match.ingredientName}</Text>
      {match.reasons.map((reason, idx) => (
        <View key={`${idx}-${reason.slice(0, 8)}`} style={styles.flaggedReasonRow}>
          <BulletMarkerIcon width={18} height={18} />
          <Text style={styles.flaggedReasonText}>{reason}</Text>
        </View>
      ))}
    </View>
  );
}

function AllergenCard({ message }: { message: string }) {
  return (
    <View style={styles.allergenCard}>
      <View style={styles.allergenBadge}>
        <Ionicons name="warning" size={14} color="#fff" />
        <Text style={styles.allergenBadgeText}>Warning</Text>
      </View>
      <Text style={styles.allergenText}>{message}</Text>
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
}

// ── Styles ───────────────────────────────────────────────────────────────

const STROKE = '#aad4cd';
const ROW_FILL = '#f5fbfb';
const FLAG_ORANGE = '#ff8736';
const FLAG_BADGE_ORANGE = '#ff7824';
const FLAG_TEXT = '#b94a00';

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheetWrap: { maxHeight: '92%' },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 7,
    paddingBottom: 48,
  },
  handle: {
    alignSelf: 'center',
    width: 110,
    height: 6,
    borderRadius: 93,
    backgroundColor: '#d9d9d9',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },

  // Member header
  memberRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  memberText: { flex: 1, gap: 8, justifyContent: 'center' },
  memberName: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    backgroundColor: '#e2f1ee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tagText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.26,
  },

  // Recipe-impact strip
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ROW_FILL,
    borderWidth: 1,
    borderColor: STROKE,
    borderRadius: Radius.m,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  statusLabel: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Flagged card (orange)
  flaggedCard: {
    backgroundColor: 'rgba(255,135,54,0.1)',
    borderWidth: 2,
    borderColor: FLAG_ORANGE,
    borderRadius: Radius.l,
    padding: 16,
    gap: 8,
  },
  flaggedBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    backgroundColor: FLAG_BADGE_ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    height: 25,
  },
  flaggedBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
  },
  flaggedHeadline: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
  flaggedDivider: {
    height: 1,
    backgroundColor: 'rgba(255,135,54,0.35)',
  },
  flaggedIngredient: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  flaggedReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flaggedReasonText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 17.5,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: FLAG_TEXT,
    letterSpacing: -0.14,
  },

  // Allergen card (red)
  allergenCard: {
    backgroundColor: 'rgba(255,63,66,0.1)',
    borderWidth: 2,
    borderColor: Colors.status.negative,
    borderRadius: Radius.l,
    padding: 16,
    gap: 8,
  },
  allergenBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.status.negative,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    height: 25,
  },
  allergenBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
  },
  allergenText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },

  // Impact panels — row (1-2)
  panelsRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  panel: {
    flex: 1,
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.m,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: STROKE,
    // No shadow — the #aad4cd stroke already defines the card edge.
  },
  panelLabelGroup: {
    alignItems: 'center',
    gap: 4,
  },
  panelLabel: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: -0.28,
  },

  // Impact panels — stacked row (3+)
  panelsCol: {
    flexDirection: 'column',
    gap: 4,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface.secondary, // white
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: STROKE,
    padding: 16,
    // No shadow — the #aad4cd stroke already defines the card edge.
  },
  panelRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  panelRowLabel: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
    flexShrink: 1,
  },

  // Shared impact pill (inside each panel)
  impactPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  impactPillText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.28,
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // Empty state
  emptyState: {
    backgroundColor: ROW_FILL,
    borderWidth: 1,
    borderColor: STROKE,
    borderRadius: Radius.m,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
    textAlign: 'center',
  },
});
