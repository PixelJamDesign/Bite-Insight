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

/** Returns true if the user hasn't seen the What's New screen for the current version. */
export async function shouldShowWhatsNew(): Promise<boolean> {
  const lastSeen = await AsyncStorage.getItem(STORAGE_KEY);
  return lastSeen !== getAppVersion();
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

interface CardData {
  badge: string;
  title: string;
  description: string;
  subsections?: { heading: string; bullets: string[] }[];
  /** When true, the Plus chip sits next to the title to flag the
   *  feature as Plus-only. */
  plus?: boolean;
  /** Bespoke icon for this card. Each card has its own glyph
   *  rather than cycling a shared set. */
  icon: CardIcon;
}

const CARDS: CardData[] = [
  {
    badge: 'New feature!',
    title: 'Your recipe book',
    icon: RecipeBookIcon,
    description:
      "Build recipes from the foods you scan. Drop in ingredients, set the servings, and the nutrition totals itself up as you go.",
  },
  {
    badge: 'New feature!',
    title: 'Community recipes',
    plus: true,
    icon: CommunityIcon,
    description:
      "Post your recipes for everyone to see, and pinch ones you like the look of. Tap the heart on the cards you love and save the keepers to your own book.",
  },
  {
    badge: 'New feature!',
    title: 'Family-aware recipe insights',
    plus: true,
    icon: FamilyInsightsIcon,
    description:
      "Cooking for the household? Tap any family member on a recipe to see which ingredients to watch for them and whether the meal's a good fit.",
  },
  {
    badge: 'New feature!',
    title: 'Flagged ingredients for family members',
    plus: true,
    icon: FlagIcon,
    description:
      "Set liked, disliked and flagged ingredients for each person in your family. Scans and recipes then warn you about things that don't suit them, separately from your own list.",
  },
  {
    badge: 'New additions!',
    title: 'New Conditions, Allergies & Diets',
    icon: ProfileAdditionsIcon,
    description:
      "A few new things to add to your profile so the app fits how you actually live:",
    subsections: [
      { heading: 'Health Conditions', bullets: ['No Gallbladder', 'IBS (with subtype)', 'Pregnancy'] },
      { heading: 'Dietary Preferences', bullets: ['Halal (with auto-detection)', 'Low Fibre'] },
    ],
  },
  {
    badge: 'Improvement',
    title: 'Flagged ingredient accuracy',
    plus: true,
    icon: AccuracyIcon,
    description:
      "Greater accuracy of flagged ingredients when scanning or searching products.",
  },
];

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
        <Text style={styles.headline}>A few new things</Text>
        <Text style={styles.subtitle}>
          Quick tour of what's changed in this version.
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

              {/* Sub-sections (card 4 only) */}
              {card.subsections?.map((sub, j) => (
                <View key={j} style={styles.subsection}>
                  <Text style={styles.subsectionHeading}>{sub.heading}</Text>
                  {sub.bullets.map((bullet, k) => (
                    <View key={k} style={styles.bulletRow}>
                      <BulletMarker size={18} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
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
    marginBottom: Spacing.xxs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
