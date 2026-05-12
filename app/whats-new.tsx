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
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius, Shadows } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { PlusBadge } from '@/components/PlusBadge';

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
  subsections?: { heading: string; bullets: Bullet[] }[];
  /** When true, the Plus chip sits next to the title to flag the
   *  feature as Plus-only. */
  plus?: boolean;
  /** Bespoke icon for this card. Each card has its own glyph
   *  rather than cycling a shared set. */
  icon: CardIcon;
}

// v1.6.1 — add card entries here as changes are made during the
// release cycle. When this array is empty, shouldShowWhatsNew() still
// fires on first open of the new version but the screen has no content
// to show — see below: when there are no cards, the screen auto-marks
// itself seen and routes straight to the dashboard.
const CARDS: CardData[] = [];

// ── Screen ──────────────────────────────────────────────────────────────────

export default function WhatsNewScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { t: tc } = useTranslation('common');
  const insets = useSafeAreaInsets();

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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={dismiss}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.skipText}>{tc('buttons.skip')}</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <Text style={styles.greetingLight}>{greeting}</Text>
        <Text style={styles.greetingName}>{firstName}</Text>

        {/* ── Headline ── */}
        <Text style={styles.headline}>We've made some updates!</Text>
        <Text style={styles.subtitle}>
          Thanks to your feedback we've updated Bite Insight to improve your experience.
        </Text>

        {/* ── Cards ── */}
        <View style={styles.cardsContainer}>
          {CARDS.map((card, i) => {
            const IconComponent = card.icon;
            return (
            <View key={i} style={styles.card}>
              {/* Icon + Badge row. Plus chip sits stacked under the
                  badge for Plus-only features so it reads as a
                  qualifier on the badge itself. */}
              <View style={styles.cardHeader}>
                <View style={styles.iconCircle}>
                  <IconComponent width={28} height={28} />
                </View>
                <View style={styles.cardHeaderTags}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{card.badge}</Text>
                  </View>
                  {card.plus && <PlusBadge size="small" />}
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
                        <BulletMarker size={18} />
                        {isStructured ? (
                          <Text style={styles.bulletText}>
                            <Text style={styles.bulletTitle}>{bullet.title}</Text>
                            {bullet.sub ? (
                              <>
                                {'\n'}
                                <Text style={styles.bulletSub}>{bullet.sub}</Text>
                              </>
                            ) : null}
                          </Text>
                        ) : (
                          <Text style={styles.bulletText}>{bullet}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
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
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  skipBtn: {
    position: 'absolute',
    top: 16,
    right: Spacing.m,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: 0,
    color: Colors.secondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.xl,
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
    marginBottom: Spacing.s,
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
  },
  badgeText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.26,
    color: Colors.primary,
  },
  // Right-side stack inside cardHeader: the kind-of-update badge
  // sits on top, the Plus chip drops in underneath when the
  // feature is Plus-only. alignItems:flex-end so both pills hug
  // the right edge of the card.
  cardHeaderTags: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.4,
    color: Colors.primary,
    marginBottom: Spacing.xxs,
  },
  cardDesc: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: 0,
    color: Colors.secondary,
  },

  // ── Sub-sections (card 4) ─────────────────────────────────────────────────
  subsection: {
    marginTop: Spacing.s,
  },
  subsectionHeading: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: 0,
    color: Colors.primary,
    marginBottom: Spacing.s,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.s,
    marginBottom: 2,
  },
  bulletText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: 0,
    color: Colors.secondary,
    flex: 1,
  },
  bulletTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
    color: Colors.secondary,
  },
  bulletSub: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: -0.14,
    color: Colors.secondary,
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
