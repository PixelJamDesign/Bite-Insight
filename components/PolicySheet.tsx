// ── Privacy Policy & Cookie Policy bottom sheet ──────────────────────────────
// Pixel-perfect match to Figma node 4486-17599 "Policy Bottom Sheet".
// Container: white, rounded-tl/tr 24px, 24px padding, drag handle 110×6 #d9d9d9.
// Close X right-aligned → Banner (sticky with white gradient fade) → ScrollView.

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  TouchableOpacity,
  Animated,
  Easing,
  Modal,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, Line, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
// MenuIcons not needed — banner uses inline SVGs from policy_privacy_mini.svg / policy_cookies_mini.svg
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_FRACTION = 0.92;

type PolicyType = 'privacy' | 'cookie';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: PolicyType;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Root sheet wrapper                                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */

export function PolicySheet({ visible, onClose, type }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const closingRef = useRef(false);

  // ── Animated open / close ──────────────────────────────
  const animateOpen = useCallback(() => {
    slideAnim.setValue(SCREEN_HEIGHT);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, backdropAnim]);

  const animateClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 280,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      closingRef.current = false;
      setMounted(false);
      onClose();
    });
  }, [slideAnim, backdropAnim, onClose]);

  useEffect(() => {
    if (visible) {
      closingRef.current = false;
      setMounted(true);
      // Small timeout so mount renders before animation starts
      requestAnimationFrame(() => animateOpen());
    } else if (mounted && !closingRef.current) {
      animateClose();
    }
  }, [visible]);

  // ── Swipe-to-dismiss PanResponder ──────────────────────
  // Use refs so the PanResponder always sees the latest callbacks
  const animateCloseRef = useRef(animateClose);
  animateCloseRef.current = animateClose;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (
        _: GestureResponderEvent,
        gs: PanResponderGestureState,
      ) => {
        return gs.dy > 4 && Math.abs(gs.dy) > Math.abs(gs.dx);
      },
      onPanResponderGrant: () => {
        // Stop any running animations when user grabs
        slideAnim.stopAnimation();
        backdropAnim.stopAnimation();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          slideAnim.setValue(gs.dy);
          const progress = Math.max(0, 1 - gs.dy / (SCREEN_HEIGHT * SHEET_FRACTION));
          backdropAnim.setValue(progress);
        }
      },
      onPanResponderRelease: (_, gs) => {
        const sheetHeight = SCREEN_HEIGHT * SHEET_FRACTION;
        if (gs.dy > sheetHeight * 0.2 || gs.vy > 0.4) {
          animateCloseRef.current();
        } else {
          Animated.parallel([
            Animated.spring(slideAnim, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }),
            Animated.timing(backdropAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    }),
  ).current;

  if (!mounted) return null;

  const label = type === 'privacy' ? 'Privacy Policy' : 'Cookie Policy';
  const title =
    type === 'privacy'
      ? 'Our commitment\nto your privacy'
      : 'How we use\ncookies';

  const BANNER_HEIGHT = 123;
  const HEADER_TOTAL = BANNER_HEIGHT + 24 + 40; // banner + close row + gap

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={animateClose}
      statusBarTranslucent
    >
      {/* Backdrop — tapping animates close */}
      <Animated.View style={[root.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={animateClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          root.container,
          {
            height: SCREEN_HEIGHT * SHEET_FRACTION,
            transform: [{ translateY: slideAnim }],
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* ── Swipeable header zone (handle + close + banner) ─ */}
        <View {...panResponder.panHandlers}>
          {/* Drag handle — centered */}
          <View style={root.handleRow}>
            <View style={root.handle} />
          </View>

          {/* Close X — right-aligned */}
          <View style={root.closeRow}>
            <TouchableOpacity
              onPress={animateClose}
              activeOpacity={0.7}
              hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
            >
              <Ionicons name="close" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Sticky banner */}
          <View style={root.bannerContainer}>
            <View style={root.banner}>
              <View style={root.bannerTextCol}>
                <Text style={root.bannerLabel}>{label}</Text>
                <Text style={root.bannerTitle}>{title}</Text>
              </View>
              <View style={root.bannerIconWrap}>
                <BannerIcon type={type} />
              </View>
            </View>
          </View>
        </View>

        {/* ── Scrollable content with fade overlay ──────────── */}
        <View style={root.scrollWrap}>
          <ScrollView
            style={root.scroll}
            contentContainerStyle={root.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {type === 'privacy' ? <PrivacyContent /> : <CookieContent />}
          </ScrollView>
          {/* Fade overlay — sits on top of scroll content */}
          <LinearGradient
            colors={['#ffffff', 'rgba(255,255,255,0)']}
            style={root.scrollFade}
            pointerEvents="none"
          />
        </View>
      </Animated.View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Root styles                                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

const root = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 52, 50, 0.45)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.m, // 24px
  },

  /* ── Drag handle — centered via handleRow ────────────── */
  handleRow: {
    alignItems: 'center',
    paddingTop: 7,
    paddingBottom: 10,
  },
  handle: {
    width: 110,
    height: 6,
    borderRadius: 93,
    backgroundColor: '#d9d9d9',
  },

  /* ── Close X ─────────────────────────────────────────── */
  closeRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.xs, // 8px gap before banner
  },

  /* ── Sticky banner ───────────────────────────────────── */
  bannerContainer: {
    zIndex: 2,
  },
  banner: {
    backgroundColor: '#e2f1ee',
    borderRadius: Radius.l, // 16px
    paddingLeft: Spacing.m, // 24px
    paddingRight: Spacing.s, // 16px
    paddingVertical: Spacing.xs, // 8px
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 123,
  },
  bannerTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  bannerLabel: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  bannerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },
  bannerIconWrap: {
    width: 81,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Scroll ──────────────────────────────────────────── */
  scrollWrap: {
    flex: 1,
    position: 'relative',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.m, // 24px breathing room — content fades behind gradient
    paddingBottom: 40,
  },
  scrollFade: {
    position: 'absolute',
    top: 0,
    left: -Spacing.m, // bleed to sheet edges
    right: -Spacing.m,
    height: 40, // gradient fade height
  },
});

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Banner decorative icon                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function BannerIcon({ type }: { type: PolicyType }) {
  // Exact SVGs from assets/images/policy_privacy_mini.svg & policy_cookies_mini.svg
  if (type === 'privacy') {
    return (
      <Svg width={81} height={88} viewBox="0 0 81 88" fill="none">
        <G opacity={0.25}>
          <Path d="M9.09099 9.14177C21.2123 -3.04726 40.8822 -3.04726 53.0036 9.14177C65.1249 21.3308 65.1249 41.138 53.0036 53.327L52.4229 53.9074C40.4467 65.3709 21.6478 65.3709 9.67166 53.9074L9.09099 53.327C-3.03033 41.138 -3.03033 21.3308 9.09099 9.14177ZM46.4348 15.7804C37.9426 7.2191 24.1882 7.2191 15.696 15.7804C7.20383 24.3418 7.20383 38.1633 15.696 46.7246C24.1882 55.286 37.9426 55.286 46.4348 46.7246C54.927 38.1633 54.927 24.3418 46.4348 15.7804Z" fill="#3B9586" />
          <Path d="M52.6043 66.7495C50.7172 64.6454 50.7535 61.4168 52.7495 59.4215C54.7455 57.4263 57.9392 57.3537 60.0078 59.2764L78.9156 76.1814C81.6012 78.6846 81.71 82.9289 79.1334 85.5409C76.5567 88.1528 72.3106 88.044 69.8428 85.3232L52.6043 66.7495Z" fill="#3B9586" />
        </G>
        <Path d="M31 38.5C27.1516 38.5 24.2704 36.8074 22.25 34.911M31 38.5C32.6749 38.5 34.1667 38.1794 35.484 37.6609M31 38.5V41.625M22.25 34.911C19.6768 32.4958 18.5 29.75 18.5 29.75M22.25 34.911L20.375 36.786M35.484 37.6609C37.1933 36.9881 38.609 35.982 39.75 34.9111M35.484 37.6609L37.25 40.375M26.516 37.6609L24.75 40.375M43.5 29.75C43.5 29.75 42.3232 32.4958 39.75 34.9111M39.75 34.9111L41.625 36.7861" stroke="#023432" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }
  // Cookie
  return (
    <Svg width={81} height={88} viewBox="0 0 81 88" fill="none">
      <G opacity={0.25}>
        <Path d="M9.09099 9.14177C21.2123 -3.04726 40.8822 -3.04726 53.0036 9.14177C65.1249 21.3308 65.1249 41.138 53.0036 53.327L52.4229 53.9074C40.4467 65.3709 21.6478 65.3709 9.67166 53.9074L9.09099 53.327C-3.03033 41.138 -3.03033 21.3308 9.09099 9.14177ZM46.4348 15.7804C37.9426 7.2191 24.1882 7.2191 15.696 15.7804C7.20383 24.3418 7.20383 38.1633 15.696 46.7246C24.1882 55.286 37.9426 55.286 46.4348 46.7246C54.927 38.1633 54.927 24.3418 46.4348 15.7804Z" fill="#3B9586" />
        <Path d="M52.6043 66.7495C50.7172 64.6454 50.7535 61.4168 52.7495 59.4215C54.7455 57.4263 57.9392 57.3537 60.0078 59.2764L78.9156 76.1814C81.6012 78.6846 81.71 82.9289 79.1334 85.5409C76.5567 88.1528 72.3106 88.044 69.8428 85.3232L52.6043 66.7495Z" fill="#3B9586" />
      </G>
      <Path d="M27.3711 26.5859V26.5984M36.7461 35.3359V35.3484M31.7461 30.9609V30.9734M30.4961 37.2109V37.2234M25.4961 33.4609V33.4734M31.7461 18.4609C29.2738 18.4609 26.8571 19.194 24.8015 20.5676C22.7459 21.9411 21.1437 23.8933 20.1976 26.1774C19.2515 28.4615 19.004 30.9748 19.4863 33.3996C19.9686 35.8243 21.1591 38.0516 22.9073 39.7998C24.6554 41.5479 26.8827 42.7384 29.3075 43.2208C31.7322 43.7031 34.2456 43.4555 36.5296 42.5094C38.8137 41.5633 40.766 39.9612 42.1395 37.9056C43.513 35.85 44.2461 33.4332 44.2461 30.9609C43.3774 31.2284 42.4521 31.2541 41.5699 31.035C40.6877 30.816 39.8819 30.3606 39.2392 29.7179C38.5964 29.0751 38.141 28.2693 37.922 27.3871C37.703 26.5049 37.7286 25.5797 37.9961 24.7109C37.1274 24.9784 36.2021 25.0041 35.3199 24.785C34.4377 24.566 33.6319 24.1106 32.9892 23.4679C32.3464 22.8251 31.891 22.0193 31.672 21.1371C31.453 20.2549 31.4786 19.3297 31.7461 18.4609Z" stroke="#023432" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Bullet marker (18×18 teal circle + bolt)                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

function BulletMarker() {
  return (
    <View style={s.bulletMarker}>
      <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
        <Circle cx={9} cy={9} r={9} fill="#e2f1ee" />
        <Path d="M10.5 4L7 10h3l-0.5 4L13 8h-3l0.5-4z" fill={Colors.accent} />
      </Svg>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Email icon                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

function EmailIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={4} width={20} height={16} rx={3} stroke={Colors.accent} strokeWidth={1.5} />
      <Path
        d="M2 7l10 7 10-7"
        stroke={Colors.accent}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Shared primitive components                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

function SectionNum({ children }: { children: string }) {
  return <Text style={s.sectionNum}>{children}</Text>;
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={s.sectionTitle}>{children}</Text>;
}

function BodyLarge({ children }: { children: string }) {
  return <Text style={s.bodyLarge}>{children}</Text>;
}

function Body({ children }: { children: string }) {
  return <Text style={s.body}>{children}</Text>;
}

function BodySmall({ children }: { children: string }) {
  return <Text style={s.bodySmall}>{children}</Text>;
}

function Bullet({ children }: { children: string }) {
  return (
    <View style={s.bulletRow}>
      <BulletMarker />
      <Text style={s.bulletText}>{children}</Text>
    </View>
  );
}

function BulletList({ children }: { children: React.ReactNode }) {
  return <View style={s.bulletList}>{children}</View>;
}

function Divider() {
  return <View style={s.divider} />;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return <View style={s.infoBox}>{children}</View>;
}

function ImportantBox({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.importantBox}>
      <Text style={s.importantLabel}>Important:</Text>
      {children}
    </View>
  );
}

function EmailRow() {
  return (
    <TouchableOpacity
      style={s.emailRow}
      onPress={() => Linking.openURL('mailto:hello@biteinsight.app')}
      activeOpacity={0.7}
    >
      <EmailIcon />
      <Text style={s.emailText}>hello@biteinsight.app</Text>
    </TouchableOpacity>
  );
}

/** Wrapper: gap/xl (48px) between sections in the Policy Stack. */
function PolicyStack({ children }: { children: React.ReactNode }) {
  return <View style={s.policyStack}>{children}</View>;
}

/** A numbered section (01, 02, etc.) with its inner headline group. */
function Section({ children, headlineGap }: { children: React.ReactNode; headlineGap?: number }) {
  return (
    <View style={[s.section, headlineGap ? { gap: headlineGap } : undefined]}>
      {children}
    </View>
  );
}

/** Content group below the section number. Gap 16px between child elements. */
function SectionContent({ children }: { children: React.ReactNode }) {
  return <View style={s.sectionContent}>{children}</View>;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Accordion                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

function AccordionItem({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  }, []);

  return (
    <View style={s.accordionItem}>
      <TouchableOpacity style={s.accordionHeader} onPress={toggle} activeOpacity={0.7}>
        <Text style={s.accordionTitle}>{title}</Text>
        <View style={s.accordionToggle}>
          <Ionicons name={expanded ? 'remove' : 'add'} size={24} color={Colors.primary} />
        </View>
      </TouchableOpacity>
      {expanded && <View style={s.accordionBody}>{children}</View>}
    </View>
  );
}

function AccordionStack({ children }: { children: React.ReactNode }) {
  return <View style={s.accordionStack}>{children}</View>;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Privacy Policy Content                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function PrivacyContent() {
  return (
    <PolicyStack>
      {/* 01 — Who we are */}
      <Section>
        <SectionNum>01</SectionNum>
        <SectionContent>
          <SectionTitle>Who we are</SectionTitle>
          <BodyLarge>
            Bite Insight is a health and wellbeing application operated by Bite
            Insight Ltd, a company registered in the United Kingdom.
          </BodyLarge>
          <Body>
            We are committed to protecting your privacy and handling your
            personal data transparently and securely.
          </Body>
          <InfoBox>
            <Body>
              If you have any questions about this policy, you can contact us at:
            </Body>
            <EmailRow />
          </InfoBox>
        </SectionContent>
      </Section>

      <Divider />

      {/* 02 — What this policy covers */}
      <Section>
        <SectionNum>02</SectionNum>
        <SectionContent>
          <SectionTitle>What this policy covers</SectionTitle>
          <BodyLarge>This Privacy Policy explains:</BodyLarge>
          <BulletList>
            <Bullet>What personal data we collect.</Bullet>
            <Bullet>How we use it.</Bullet>
            <Bullet>How we store and protect it.</Bullet>
            <Bullet>Your rights under UK GDPR.</Bullet>
            <Bullet>How we use third-party services.</Bullet>
          </BulletList>
          <Body>
            By using Bite Insight, you agree to the practices described in this
            policy.
          </Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 03 — What information we collect (accordions, gap/l=32 to headline) */}
      <Section headlineGap={Spacing.l}>
        <SectionNum>03</SectionNum>
        <SectionContent>
          <SectionTitle>What information we collect</SectionTitle>
          <AccordionStack>
            <AccordionItem title="A. Account information">
              <Body>When you create an account, we may collect:</Body>
              <BulletList>
                <Bullet>Name (if provided)</Bullet>
                <Bullet>Email address</Bullet>
                <Bullet>Password (encrypted)</Bullet>
              </BulletList>
            </AccordionItem>

            <AccordionItem title="B. Health & Preference Information (User-Provided)">
              <Body>Bite Insight allows you to select:</Body>
              <BulletList>
                <Bullet>Health conditions (e.g. diabetes, hypertension)</Bullet>
                <Bullet>Allergies or sensitivities</Bullet>
                <Bullet>Dietary preferences</Bullet>
              </BulletList>
              <ImportantBox>
                <BulletList>
                  <Bullet>We do not collect medical records.</Bullet>
                  <Bullet>
                    We do not connect to NHS or healthcare databases.
                  </Bullet>
                  <Bullet>
                    We only store the preferences you choose to input.
                  </Bullet>
                </BulletList>
              </ImportantBox>
              <BodySmall>
                This information is used solely to personalise your experience
                inside the app.
              </BodySmall>
            </AccordionItem>

            <AccordionItem title="C. Usage Data">
              <Body>We may collect anonymous usage data such as:</Body>
              <BulletList>
                <Bullet>Products scanned</Bullet>
                <Bullet>Features used</Bullet>
                <Bullet>General interaction data</Bullet>
              </BulletList>
              <BodySmall>This helps us improve the app.</BodySmall>
            </AccordionItem>

            <AccordionItem title="D. Payment information">
              <Body>
                If you subscribe to Bite Insight+, payments are processed
                securely via third-party providers such as:
              </Body>
              <BulletList>
                <Bullet>Stripe</Bullet>
                <Bullet>Apple App Store</Bullet>
                <Bullet>Google Play</Bullet>
              </BulletList>
              <BodySmall>We do not store your full card details.</BodySmall>
            </AccordionItem>
          </AccordionStack>
        </SectionContent>
      </Section>

      <Divider />

      {/* 04 — How we use your data */}
      <Section>
        <SectionNum>04</SectionNum>
        <SectionContent>
          <SectionTitle>How we use your data</SectionTitle>
          <BodyLarge>We use your data to:</BodyLarge>
          <BulletList>
            <Bullet>Provide personalised nutritional insights</Bullet>
            <Bullet>Deliver app functionality</Bullet>
            <Bullet>Improve performance and features</Bullet>
            <Bullet>Provide customer support</Bullet>
            <Bullet>Process subscriptions</Bullet>
          </BulletList>
          <InfoBox>
            <Body>
              We do not sell your personal data. Data is not shared for
              advertising purposes.
            </Body>
          </InfoBox>
        </SectionContent>
      </Section>

      <Divider />

      {/* 05 — Legal basis */}
      <Section>
        <SectionNum>05</SectionNum>
        <SectionContent>
          <SectionTitle>Legal basis for processing</SectionTitle>
          <BodyLarge>Under UK GDPR, our lawful bases include:</BodyLarge>
          <BulletList>
            <Bullet>Contractual necessity</Bullet>
            <Bullet>Legitimate interest</Bullet>
            <Bullet>Consent (withdrawable anytime)</Bullet>
          </BulletList>
        </SectionContent>
      </Section>

      <Divider />

      {/* 06 — Data storage & security */}
      <Section>
        <SectionNum>06</SectionNum>
        <SectionContent>
          <SectionTitle>Data storage & security</SectionTitle>
          <BodyLarge>We protect your data with:</BodyLarge>
          <BulletList>
            <Bullet>Encrypted passwords</Bullet>
            <Bullet>Secure hosting environments</Bullet>
            <Bullet>Limited access controls</Bullet>
          </BulletList>
        </SectionContent>
      </Section>

      <Divider />

      {/* 07 — Data retention */}
      <Section>
        <SectionNum>07</SectionNum>
        <SectionContent>
          <SectionTitle>Data retention</SectionTitle>
          <BodyLarge>
            Personal data is retained only as long as necessary to maintain your
            account, provide services, and comply with legal obligations.
          </BodyLarge>
          <Body>Account deletion is available upon request.</Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 08 — Third-party services */}
      <Section>
        <SectionNum>08</SectionNum>
        <SectionContent>
          <SectionTitle>Third-party services</SectionTitle>
          <BodyLarge>We may share limited data with:</BodyLarge>
          <BulletList>
            <Bullet>Open Food Facts (product database)</Bullet>
            <Bullet>Payment processors (Stripe, Apple, Google)</Bullet>
            <Bullet>Analytics tools (if implemented)</Bullet>
          </BulletList>
          <Body>These providers maintain separate privacy policies.</Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 09 — Your rights */}
      <Section>
        <SectionNum>09</SectionNum>
        <SectionContent>
          <SectionTitle>Your rights</SectionTitle>
          <BodyLarge>Under UK GDPR, you have the right to:</BodyLarge>
          <BulletList>
            <Bullet>Access your personal data</Bullet>
            <Bullet>Correct inaccurate information</Bullet>
            <Bullet>Request deletion</Bullet>
            <Bullet>Restrict processing</Bullet>
            <Bullet>Object to processing</Bullet>
            <Bullet>Request data portability</Bullet>
          </BulletList>
          <InfoBox>
            <Body>To exercise your rights, contact us at:</Body>
            <EmailRow />
          </InfoBox>
          <Body>
            You may also lodge complaints with the Information Commissioner's
            Office (ICO).
          </Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 10 — Medical disclaimer */}
      <Section>
        <SectionNum>10</SectionNum>
        <SectionContent>
          <SectionTitle>Medical disclaimer</SectionTitle>
          <InfoBox>
            <Body>
              Bite Insight provides educational nutritional insights only. It is
              not a medical service and does not replace professional healthcare
              advice.
            </Body>
          </InfoBox>
        </SectionContent>
      </Section>

      <Divider />

      {/* 11 — Changes to this policy */}
      <Section>
        <SectionNum>11</SectionNum>
        <SectionContent>
          <SectionTitle>Changes to this policy</SectionTitle>
          <Body>
            We may update this policy periodically. You will be notified of
            changes via the app or email.
          </Body>
        </SectionContent>
      </Section>
    </PolicyStack>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Cookie Policy Content                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function CookieContent() {
  return (
    <PolicyStack>
      {/* 01 — Introduction */}
      <Section>
        <SectionNum>01</SectionNum>
        <SectionContent>
          <SectionTitle>Introduction</SectionTitle>
          <BodyLarge>
            Bite Insight Ltd uses cookies and similar technologies on our
            website and application.
          </BodyLarge>
          <Body>
            This Cookie Policy explains what cookies are, how we use them, what
            types we use, and how you can control your cookie preferences.
          </Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 02 — What are cookies */}
      <Section>
        <SectionNum>02</SectionNum>
        <SectionContent>
          <SectionTitle>What are cookies</SectionTitle>
          <BodyLarge>
            Cookies are small text files placed on your device when you visit a
            website. They help websites function properly, remember your
            preferences, and provide information to site owners.
          </BodyLarge>
          <Body>
            Cookies can be "session" cookies (deleted when you close your
            browser) or "persistent" cookies (remain until they expire or you
            delete them).
          </Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 03 — Essential cookies */}
      <Section>
        <SectionNum>03</SectionNum>
        <SectionContent>
          <SectionTitle>Essential cookies</SectionTitle>
          <BodyLarge>
            These cookies are necessary for the website to function and cannot
            be switched off. They include:
          </BodyLarge>
          <BulletList>
            <Bullet>Session management</Bullet>
            <Bullet>Security and authentication</Bullet>
            <Bullet>Load balancing</Bullet>
            <Bullet>Cookie consent preferences</Bullet>
          </BulletList>
        </SectionContent>
      </Section>

      <Divider />

      {/* 04 — Performance & analytics */}
      <Section>
        <SectionNum>04</SectionNum>
        <SectionContent>
          <SectionTitle>Performance & analytics cookies</SectionTitle>
          <BodyLarge>
            These cookies allow us to count visits and traffic sources so we can
            measure and improve site performance. All information collected is
            aggregated and anonymous.
          </BodyLarge>
          <BulletList>
            <Bullet>Page views and navigation paths</Bullet>
            <Bullet>Time spent on pages</Bullet>
            <Bullet>Error and performance reporting</Bullet>
            <Bullet>Feature usage patterns</Bullet>
          </BulletList>
        </SectionContent>
      </Section>

      <Divider />

      {/* 05 — Functional cookies */}
      <Section>
        <SectionNum>05</SectionNum>
        <SectionContent>
          <SectionTitle>Functional cookies</SectionTitle>
          <BodyLarge>
            These cookies enable enhanced functionality and personalisation. If
            you do not allow these cookies, some features may not function
            properly.
          </BodyLarge>
          <BulletList>
            <Bullet>Language and region preferences</Bullet>
            <Bullet>User interface customisation</Bullet>
            <Bullet>Previously viewed products</Bullet>
            <Bullet>Personalised recommendations</Bullet>
          </BulletList>
        </SectionContent>
      </Section>

      <Divider />

      {/* 06 — Third-party cookies */}
      <Section>
        <SectionNum>06</SectionNum>
        <SectionContent>
          <SectionTitle>Third-party cookies</SectionTitle>
          <BodyLarge>
            Some cookies are placed by third-party services that appear on our
            pages. We do not control the setting of these cookies.
          </BodyLarge>
          <BulletList>
            <Bullet>Stripe (payment processing)</Bullet>
            <Bullet>Google Analytics (website analytics)</Bullet>
            <Bullet>Social media sharing widgets</Bullet>
          </BulletList>
        </SectionContent>
      </Section>

      <Divider />

      {/* 07 — How to manage cookies */}
      <Section>
        <SectionNum>07</SectionNum>
        <SectionContent>
          <SectionTitle>How to manage cookies</SectionTitle>
          <BodyLarge>
            You can control and manage cookies in several ways. Please note that
            removing or blocking cookies may impact your user experience.
          </BodyLarge>
          <Body>
            Most browsers allow you to refuse or accept cookies, delete cookies,
            and be notified when a cookie is set. Check your browser's help
            section for specific instructions.
          </Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 08 — Cookies in our mobile app */}
      <Section>
        <SectionNum>08</SectionNum>
        <SectionContent>
          <SectionTitle>Cookies in our mobile app</SectionTitle>
          <BodyLarge>
            Our mobile application uses similar technologies to cookies,
            including local storage and device identifiers that help us provide
            and improve our service.
          </BodyLarge>
          <InfoBox>
            <Body>
              Your health preferences and scan history are stored locally on
              your device and are not shared with third parties.
            </Body>
          </InfoBox>
        </SectionContent>
      </Section>

      <Divider />

      {/* 09 — Updates */}
      <Section>
        <SectionNum>09</SectionNum>
        <SectionContent>
          <SectionTitle>Updates to this policy</SectionTitle>
          <Body>
            We may update this Cookie Policy from time to time. Any changes will
            be posted on this page with an updated effective date.
          </Body>
        </SectionContent>
      </Section>

      <Divider />

      {/* 10 — Contact */}
      <Section>
        <SectionNum>10</SectionNum>
        <SectionContent>
          <SectionTitle>Contact us</SectionTitle>
          <Body>
            If you have any questions about our use of cookies, please contact
            us:
          </Body>
          <EmailRow />
        </SectionContent>
      </Section>
    </PolicyStack>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Content styles — all values taken directly from Figma node 4486-17599     */
/* ═══════════════════════════════════════════════════════════════════════════ */

const s = StyleSheet.create({
  /* ── Policy Stack ─────────────────────────────────────── */
  policyStack: {
    gap: Spacing.xl, // 48px — Figma: gap/xl between each section/divider
  },

  /* ── Section ──────────────────────────────────────────── */
  section: {
    gap: Spacing.s, // 16px — Figma: gap/s between section num and headline
  },
  sectionContent: {
    gap: Spacing.s, // 16px — Figma: gap between elements in a content group
  },
  sectionNum: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary, // #00776f
    letterSpacing: -0.48,
  },
  sectionTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary, // #023432
    letterSpacing: -0.48,
  },

  /* ── Body text ────────────────────────────────────────── */
  bodyLarge: {
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 21, // 14 * 1.5
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    letterSpacing: -0.14,
  },

  /* ── Bullet list ──────────────────────────────────────── */
  bulletList: {
    gap: Spacing.xxs, // 4px — Figma: gap/xxs
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s, // 16px — Figma: gap/s
  },
  bulletMarker: {
    width: 18,
    height: 18,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
  },

  /* ── Divider ──────────────────────────────────────────── */
  divider: {
    height: 1,
    backgroundColor: '#aad4cd',
  },

  /* ── Info box ─────────────────────────────────────────── */
  infoBox: {
    backgroundColor: '#e4f1ef', // surface/tertiary
    borderRadius: Radius.l, // 16px
    paddingHorizontal: Spacing.m, // 24px — Figma: px-[gap/m]
    paddingVertical: Spacing.s, // 16px — Figma: py-[gap/s]
    gap: Spacing.xs, // 8px
  },

  /* ── Important box (inside accordion) ─────────────────── */
  importantBox: {
    backgroundColor: '#e4f1ef', // surface/tertiary
    borderRadius: Radius.l, // 16px
    padding: Spacing.m, // 24px — Figma: p-[gap/m]
    gap: Spacing.xs, // 8px
  },
  importantLabel: {
    fontSize: 16,
    lineHeight: 24, // 16 * 1.5
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },

  /* ── Email row ────────────────────────────────────────── */
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emailText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24, // 16 * 1.5
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },

  /* ── Accordion ────────────────────────────────────────── */
  accordionStack: {
    gap: 10, // Figma: gap 10px
  },
  accordionItem: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#aad4cd', // stroke/secondary
    borderRadius: Radius.l, // 16px
    overflow: 'hidden',
    // Figma shadow: subtle multi-layer
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s, // 16px — Figma: px-[gap/s]
    paddingTop: Spacing.s, // 16px — Figma: pt-[gap/s]
    paddingBottom: Spacing.s, // 16px (when collapsed)
    gap: Spacing.s, // 16px
  },
  accordionTitle: {
    flex: 1,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '700', // BOLD — Figma: font-bold
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.5,
  },
  accordionToggle: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#e2f1ee', // teal/spring-water — NOT #aad4cd
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBody: {
    paddingHorizontal: Spacing.s, // 16px — Figma: px-[gap/s]
    paddingBottom: Spacing.m, // 24px — Figma: pb-[gap/m]
    gap: Spacing.s, // 16px — Figma: gap/s
  },
});
