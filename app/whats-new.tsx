import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import RecipeBookIcon from '@/assets/icons/whats-new/recipe-book.svg';
import CommunityIcon from '@/assets/icons/whats-new/community.svg';
import FamilyInsightsIcon from '@/assets/icons/whats-new/family-insights.svg';
import FlagIcon from '@/assets/icons/whats-new/flag.svg';
import ProfileAdditionsIcon from '@/assets/icons/whats-new/profile-additions.svg';
import AccuracyIcon from '@/assets/icons/whats-new/accuracy.svg';
import WaveIcon from '@/assets/icons/whats-new/wave.svg';
import SparklesIcon from '@/assets/icons/whats-new/sparkles.svg';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PlusBadge } from '@/components/PlusBadge';
import { FrostedHeader, useScrollEdge } from '@/components/HeaderEdge';
import { MenuNotificationsIcon } from '@/components/MenuIcons';
import { MealPlanIcon } from '@/components/TabIcons';

// ── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'lastSeenWhatsNewVersion';

/** The app version string from app.json / expo config. */
function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

/** Write the current version so the screen won't show again until the next update. */
export async function markWhatsNewSeen(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, getAppVersion());
}

/** Returns true if the user hasn't seen the What's New screen for the
 *  current version AND there's content worth showing. When the CARDS
 *  array is empty (e.g. the start of a new release cycle before any
 *  changes have been featured), this returns false so users don't see
 *  a half-empty screen — the version is silently marked seen so the
 *  gate doesn't keep firing. */
export async function shouldShowWhatsNew(): Promise<boolean> {
  const lastSeen = await AsyncStorage.getItem(STORAGE_KEY);
  if (lastSeen === getAppVersion()) return false;
  if (CARDS.length === 0) {
    // Mark this version seen so we don't re-check every cold launch.
    await markWhatsNewSeen();
    return false;
  }
  return true;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(tc: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return tc('greeting.morning');
  if (hour < 18) return tc('greeting.afternoon');
  return tc('greeting.evening');
}

// ── Card icon SVGs (exported from Figma node 4904:71593) ────────────────────
type CardIcon = React.FC<{ width?: number; height?: number }>;

// ── Bullet marker (teal circle + dark lightning bolt, per Figma design) ─────
function BulletMarker({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <Path d="M0 9a9 9 0 1118 0A9 9 0 010 9z" fill="#AAD4CD" />
      <Path d="M5.12 8.91l4.9-5.81c.2-.24.58-.03.5.27l-1.06 3.9c-.11.38.17.76.55.76h2.4c.5 0 .77.61.43 1l-4.98 5.87c-.2.23-.57.03-.49-.27l.98-3.98c.1-.38-.18-.76-.55-.76H5.58c-.5 0-.76-.6-.43-1l-.03-.01z" fill="#023432" />
    </Svg>
  );
}

// ── Card Data ───────────────────────────────────────────────────────────────

/** A bullet is either a plain string ("Pregnancy") or a structured
 *  item with a bold title and an optional sub-line in lighter type
 *  (e.g. "Cancer Support" + "(Sub types include: …)"). */
type Bullet = string | { title: string; sub?: string };

interface CardData {
  badge: string;
  title: string;
  description: string;
  /** Optional panel at the bottom of the card telling Bite Insight+
   *  members what they get (Figma "Banner", 5949:14477). */
  plusNote?: string;
  subsections?: { heading: string; bullets: Bullet[] }[];
  /** When true, the Plus chip sits next to the title to flag the
   *  feature as Plus-only. */
  plus?: boolean;
  /** Bespoke icon for this card. Each card has its own glyph
   *  rather than cycling a shared set. */
  icon: CardIcon;
}

// Notifications card uses the same bell as the dashboard (the canonical
// MenuNotificationsIcon), wrapped to the card-icon's width/height signature.
function BellIcon({ width = 28 }: { width?: number; height?: number }) {
  return <MenuNotificationsIcon color={Colors.primary} size={width} />;
}

// Apple glyph for the ingredients card (Figma "Food=Apple"). Line style to
// match the other What's New card icons.
function AppleIcon({ width = 28 }: { width?: number; height?: number }) {
  return (
    <Svg width={width} height={width} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8.2c-1.5-1.7-4-2.2-6-1C3.9 8.6 3.3 11.6 4.3 14.3 5.3 17 7.6 20 9.9 20c1 0 1.4-.5 2.1-.5s1.1.5 2.1.5c2.3 0 4.6-3 5.6-5.7 1-2.7.4-5.7-1.7-7.1-2-1.2-4.5-.7-6 1z"
        stroke={Colors.primary}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M12 8.2c-.2-1.9.4-3.4 2-4.3 1.4-.8 3-.7 4.3-.2-.2 1.4-1 2.7-2.3 3.4-1.3.7-2.8.8-4 1.1z"
        stroke={Colors.primary}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Tab bar glyph, wrapped to the card-icon's width/height signature.
function PlannerIcon({ width = 28 }: { width?: number; height?: number }) {
  return <MealPlanIcon color={Colors.primary} size={width} />;
}

// v2.0.0 — the Meal Planner and the new look.
const CARDS: CardData[] = [
  {
    badge: 'New!',
    title: 'Meal Planner',
    icon: PlannerIcon,
    plus: true,
    description:
      "Plan what you're eating for any day of the week. Add products you've scanned or your own recipes, and we'll check each meal against your health profile before you eat it.",
    plusNote: 'Bite Insight+ members unlock the ability to plan meals for the week and save your meals as recipes in your recipe book!',
    subsections: [
      {
        heading: 'What you can do:',
        bullets: [
          { title: 'Plan your meals', sub: "Free for today's meals. Add each one at the time you plan to eat it." },
          { title: 'See how a meal suits you', sub: "Meals turn amber or red when they don't fit your profile, and we'll tell you why." },
          { title: 'Keep track of your day', sub: 'Mark meals as eaten and see your totals for the day.' },
        ],
      },
    ],
  },
  {
    badge: 'Updated!',
    title: 'A Fresh New Look',
    icon: SparklesIcon,
    description:
      "We've redesigned Bite Insight from top to bottom. Screens are cleaner and less cluttered, so the things you use most are quicker to reach and easier to read.",
    subsections: [
      {
        heading: "What's changed:",
        bullets: [
          {
            title: 'New dashboard',
            sub: "Your day at a glance. Today's planned meals and your recent scans now sit together on one screen, and the Meal Planner is a tap away in the tab bar.",
          },
        ],
      },
    ],
  },
];

// ── Screen ──────────────────────────────────────────────────────────────────

export default function WhatsNewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t: tc } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const topEdge = useScrollEdge();

  const [firstName, setFirstName] = useState<string>('');

  // Fetch the user's first name from the profile
  useEffect(() => {
    if (!session?.user?.id) return;
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        const fullName =
          data?.full_name ??
          session.user.user_metadata?.full_name ??
          tc('greeting.fallbackName');
        setFirstName(fullName.split(' ')[0]);
      });
  }, [session?.user?.id]);

  const greeting = getGreeting(tc);

  async function dismiss() {
    await markWhatsNewSeen();
    router.replace('/(tabs)/dashboard' as any);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Runs up under the status bar, which frosts over as content passes */}
      <ScrollView
        {...topEdge.scrollProps}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + Spacing.xl }]}
        showsVerticalScrollIndicator={false}
        scrollIndicatorInsets={{ top: insets.top }}
      >
        {/* ── Greeting ── */}
        <Text style={styles.greetingLight}>{greeting}</Text>
        <Text style={styles.greetingName}>{firstName}</Text>

        {/* ── Headline ── */}
        <Text style={styles.headline}>Welcome to Bite Insight 2.0</Text>
        <Text style={styles.subtitle}>
          This is our biggest update yet, and a lot of it came from your feedback. Here's what's new.
        </Text>

        {/* ── Cards ── */}
        <View style={styles.cardsContainer}>
          {CARDS.map((card, i) => {
            const IconComponent = card.icon;
            return (
            <View key={i} style={styles.card}>
              {/* Icon + tags row. The Plus chip sits beside the update
                  tag for Plus-only features (Figma 5478:10384). */}
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <IconComponent width={30} height={30} />
                </View>
                <View style={styles.cardHeaderTags}>
                  {card.plus && <PlusBadge />}
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{card.badge}</Text>
                  </View>
                </View>
              </View>

              {/* Title */}
              <Text style={styles.cardTitle}>{card.title}</Text>

              {/* Description */}
              <Text style={styles.cardDesc}>{card.description}</Text>

              {/* Sub-sections — bullets are either plain strings or
                  { title, sub? } pairs for bold-title + small caption. */}
              {card.subsections?.map((sub, j) => (
                <View key={j} style={styles.subsection}>
                  <Text style={styles.subsectionHeading}>{sub.heading}</Text>
                  {sub.bullets.map((bullet, k) => {
                    const isStructured = typeof bullet !== 'string';
                    return (
                      <View key={k} style={styles.bulletRow}>
                        <View style={styles.bulletMarker}>
                          <BulletMarker size={18} />
                        </View>
                        {isStructured ? (
                          <View style={styles.bulletContent}>
                            <Text style={styles.bulletTitle}>{bullet.title}</Text>
                            {bullet.sub ? (
                              <Text style={styles.bulletSub}>{bullet.sub}</Text>
                            ) : null}
                          </View>
                        ) : (
                          <Text style={styles.bulletText}>{bullet}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}

              {/* What Bite Insight+ members get */}
              {card.plusNote ? (
                <View style={styles.plusNote}>
                  <Text style={styles.plusNoteTitle}>Bite Insight+ Feature</Text>
                  <Text style={styles.plusNoteText}>{card.plusNote}</Text>
                  <View style={styles.plusNoteBadge}>
                    <PlusBadge />
                  </View>
                </View>
              ) : null}
            </View>
          );
          })}
        </View>

        {/* Bottom spacer so content doesn't hide behind the sticky footer */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ── Sticky Footer ── */}
      <View style={styles.footer}>
        <LinearGradient
          colors={['rgba(226,241,238,0)', Colors.background]}
          style={styles.footerFade}
          pointerEvents="none"
        />
        <View style={[styles.footerInner, { paddingBottom: Math.max(insets.bottom, Spacing.l) }]}>
          <TouchableOpacity
            style={styles.ctaBtn}
            onPress={dismiss}
            activeOpacity={0.88}
          >
            <Text style={styles.ctaBtnText}>Go to dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FrostedHeader scrollY={topEdge.scrollY} style={{ top: 0, height: insets.top }} />
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.m,
  },

  // ── Greeting ──────────────────────────────────────────────────────────────
  greetingLight: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: -0.48,
    color: Colors.secondary,
  },
  greetingName: {
    fontSize: 48,
    lineHeight: 54,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -2,
    color: Colors.primary,
    marginBottom: Spacing.m,
  },

  // ── Headline ──────────────────────────────────────────────────────────────
  headline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: -1,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: -0.5,
    color: Colors.secondary,
    marginBottom: Spacing.l,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  cardsContainer: {
    gap: Spacing.s,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#ffffff',
    padding: Spacing.m,
    ...Shadows.level3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 999,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: '#b8dfd6',
    borderRadius: 999,
    paddingHorizontal: Spacing.xs,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.level3,
  },
  badgeText: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
    color: Colors.primary,
  },
  // Right side of cardHeader: Plus chip (Plus-only features) then the
  // update tag, side by side.
  cardHeaderTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.4,
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },
  cardDesc: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: 0,
    color: Colors.secondary,
  },

  // ── Sub-sections (card 4) ─────────────────────────────────────────────────
  subsection: {
    marginTop: Spacing.s,
    gap: Spacing.xs,
  },
  subsectionHeading: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: 0,
    color: Colors.primary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s,
  },
  // Nudge the marker down so it lines up with the first line of text
  // (matches the Figma "Bullet Container" top padding).
  bulletMarker: {
    paddingTop: 4,
  },
  bulletText: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: 0,
    color: Colors.primary,
    flex: 1,
  },
  bulletContent: {
    flex: 1,
  },
  bulletTitle: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: 0,
    color: Colors.primary,
  },
  bulletSub: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: -0.14,
    color: Colors.secondary,
  },

  // ── Bite Insight+ note (Figma "Banner") ───────────────────────────────────
  plusNote: {
    marginTop: Spacing.s,
    backgroundColor: Colors.background,
    borderRadius: Radius.m,
    padding: Spacing.s,
    // Room for the Plus chip in the top right corner.
    paddingRight: 86,
    gap: Spacing.xs,
  },
  plusNoteTitle: {
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
    color: Colors.primary,
  },
  plusNoteText: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: -0.14,
    color: Colors.secondary,
  },
  plusNoteBadge: {
    position: 'absolute',
    top: Spacing.s,
    right: Spacing.s,
  },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerFade: {
    height: 40,
  },
  footerInner: {
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.background,
  },
  ctaBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingVertical: Spacing.s,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.36,
    color: '#ffffff',
  },
});
