/**
 * ReviewPromptCard — the scan milestone moment (Figma "Review Prompt",
 * 5949:14831): 20, 50 and 100 scans. A white card with a 3D number
 * sitting over its top edge; confetti bursts out from behind the number
 * as the card lands, then drifts gently while it's open.
 *
 * Artwork comes from the Figma frames, exported per piece so each can
 * move on its own. Positions below are in the card's own points (354pt
 * wide in Figma) and are laid out from the card's centre, so the art
 * stays put on wider phones.
 */
import { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import type { ReviewMilestone } from '@/lib/useReviewPrompt';
import { BlurScrim } from '@/components/BlurScrim';

const DESIGN_WIDTH = 354;
/** How far the art rises above the card's top edge. */
const ART_RISE = 130;

const SPRITES = {
  c1: { src: require('@/assets/images/review/confetti-c1.png'), w: 49, h: 50.3, spin: -140 },
  c2: { src: require('@/assets/images/review/confetti-c2.png'), w: 28, h: 29, spin: 90 },
  c3: { src: require('@/assets/images/review/confetti-c3.png'), w: 12, h: 11, spin: 180 },
  c4: { src: require('@/assets/images/review/confetti-c4.png'), w: 24.3, h: 25, spin: -120 },
  c5: { src: require('@/assets/images/review/confetti-c5.png'), w: 23, h: 31, spin: 160 },
  c6: { src: require('@/assets/images/review/confetti-c6.png'), w: 23, h: 31, spin: -170 },
  c7: { src: require('@/assets/images/review/confetti-c7.png'), w: 37.7, h: 35.3, spin: 130 },
  c8: { src: require('@/assets/images/review/confetti-c8.png'), w: 31, h: 32.7, spin: 150 },
  c9: { src: require('@/assets/images/review/confetti-c9.png'), w: 38, h: 34, spin: -150 },
};
type SpriteKey = keyof typeof SPRITES;
const SPRITE_KEYS = Object.keys(SPRITES) as SpriteKey[];

/** Confetti positions (top-left, card points). 20 and 50 share a layout;
 *  the wider 100 spreads it out. */
const LAYOUT_TWO_DIGIT: Record<SpriteKey, [number, number]> = {
  c1: [180, -110], c2: [244, -98], c3: [191, -130], c4: [63, -45], c5: [270, -45],
  c6: [82, -86], c7: [140, -117], c8: [268, 11], c9: [51, 0],
};
const LAYOUT_HUNDRED: Record<SpriteKey, [number, number]> = {
  c1: [180, -110], c2: [244, -98], c3: [191, -130], c4: [43, -65], c5: [310, -65],
  c6: [76, -92], c7: [114, -104], c8: [318, 11], c9: [12, 7],
};

const MILESTONES: Record<
  ReviewMilestone,
  {
    title: string;
    number: { src: number; x: number; y: number; w: number; h: number };
    layout: Record<SpriteKey, [number, number]>;
  }
> = {
  20: {
    title: "You've scanned over 20 products!",
    number: { src: require('@/assets/images/review/twenty.webp'), x: 76.3, y: -55.3, w: 197.3, h: 118.3 },
    layout: LAYOUT_TWO_DIGIT,
  },
  50: {
    title: "50 products!? You're smashing it!",
    number: { src: require('@/assets/images/review/fifty.webp'), x: 76.3, y: -56, w: 198, h: 119 },
    layout: LAYOUT_TWO_DIGIT,
  },
  100: {
    title: 'Over 100 products scanned!',
    number: { src: require('@/assets/images/review/hundred.webp'), x: 41.3, y: -56, w: 283, h: 119 },
    layout: LAYOUT_HUNDRED,
  },
};

const STORE_NAME = Platform.OS === 'android' ? 'Google Play' : 'App Store';

interface Props {
  milestone: ReviewMilestone;
  onYes: () => void;
  onNotReally: () => void;
  onLater: () => void;
}

export function ReviewPromptCard({ milestone, onYes, onNotReally, onLater }: Props) {
  const m = MILESTONES[milestone];
  // Where the confetti bursts from: the middle of the number.
  const origin = { x: m.number.x + m.number.w / 2, y: m.number.y + m.number.h / 2 };

  const backdrop = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const number = useRef(new Animated.Value(0)).current;
  const burst = useRef(SPRITE_KEYS.map(() => new Animated.Value(0))).current;
  const drift = useRef(SPRITE_KEYS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let cancelled = false;
    const loops: Animated.CompositeAnimation[] = [];

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        [backdrop, card, number, ...burst].forEach((v) => v.setValue(1));
        return;
      }
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      Animated.spring(card, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
      Animated.sequence([
        Animated.delay(140),
        Animated.spring(number, { toValue: 1, friction: 4.5, tension: 120, useNativeDriver: true }),
      ]).start();
      Animated.stagger(
        28,
        burst.map((v) =>
          Animated.timing(v, {
            toValue: 1,
            duration: 720,
            easing: Easing.out(Easing.back(1.7)),
            useNativeDriver: true,
          }),
        ),
      ).start();
      // Once settled, each piece bobs on its own slow rhythm.
      drift.forEach((v, i) => {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 1700 + i * 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(v, { toValue: 0, duration: 1700 + i * 170, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          ]),
        );
        loops.push(loop);
        setTimeout(() => !cancelled && loop.start(), 900);
      });
    });

    return () => {
      cancelled = true;
      loops.forEach((l) => l.stop());
    };
  }, [backdrop, card, number, burst, drift]);

  // A modal so it sits over everything on the page, floating header and
  // tab bar included.
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onLater}>
      <View style={styles.overlay}>
        <BlurScrim opacity={backdrop} />

        <Animated.View
          style={[
            styles.cardWrap,
            {
              opacity: card,
              transform: [
                { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) },
                { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
              ],
            },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.title}>{m.title}</Text>

            <View style={styles.textBlock}>
              <Text style={styles.lead}>Loving Bite Insight?</Text>
              <Text style={styles.body}>
                We'd really like to hear what you think about the Bite Insight app and how we can make it better
                for you. Leaving a review or rating on the {STORE_NAME} helps us a lot, and we'd appreciate your
                feedback!
              </Text>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity style={styles.primaryBtn} onPress={onYes} activeOpacity={0.85}>
                <Text style={styles.primaryLabel}>Yes, I love it!</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={onNotReally} activeOpacity={0.7}>
                <Text style={styles.secondaryLabel}>Not really</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tertiaryBtn} onPress={onLater} activeOpacity={0.7}>
                <Text style={styles.tertiaryLabel}>Ask me later</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Art over the top edge, laid out on the 354pt design grid */}
          <View style={styles.art} pointerEvents="none">
            {SPRITE_KEYS.map((key, i) => {
              const p = SPRITES[key];
              const [x, y] = m.layout[key];
              const dx = origin.x - (x + p.w / 2);
              const dy = origin.y - (y + p.h / 2);
              const b = burst[i];
              return (
                <Animated.Image
                  key={key}
                  source={p.src}
                  style={[
                    styles.abs,
                    {
                      left: x,
                      top: y + ART_RISE,
                      width: p.w,
                      height: p.h,
                      opacity: b.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1] }),
                      transform: [
                        { translateX: b.interpolate({ inputRange: [0, 1], outputRange: [dx, 0] }) },
                        {
                          translateY: Animated.add(
                            b.interpolate({ inputRange: [0, 1], outputRange: [dy, 0] }),
                            drift[i].interpolate({ inputRange: [0, 1], outputRange: [0, i % 2 ? 4 : -4] }),
                          ),
                        },
                        { rotate: b.interpolate({ inputRange: [0, 1], outputRange: [`${p.spin}deg`, '0deg'] }) },
                        { scale: b.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
              );
            })}
            <Animated.View
              style={[
                styles.abs,
                {
                  left: m.number.x,
                  top: m.number.y + ART_RISE,
                  width: m.number.w,
                  height: m.number.h,
                  opacity: number.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
                  transform: [
                    { translateY: number.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                    { scale: number.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                  ],
                },
              ]}
            >
              <Image source={m.number.src} style={styles.fill} resizeMode="contain" />
            </Animated.View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 440,
    paddingTop: ART_RISE,
  },
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    paddingTop: 84,
    paddingHorizontal: Spacing.m,
    paddingBottom: Spacing.m,
    gap: Spacing.m,
    ...Shadows.level4,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.6,
    color: Colors.primary,
    textAlign: 'center',
  },
  textBlock: {
    gap: Spacing.xs,
  },
  lead: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.32,
    color: Colors.primary,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    letterSpacing: -0.14,
    color: Colors.secondary,
  },
  buttons: {
    gap: Spacing.xs,
  },
  primaryBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.m,
    alignItems: 'center',
  },
  primaryLabel: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
  },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingVertical: Spacing.s - 2,
    paddingHorizontal: Spacing.m,
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  tertiaryBtn: {
    paddingVertical: Spacing.xs,
    alignItems: 'center',
  },
  tertiaryLabel: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.28,
    color: Colors.secondary,
  },
  art: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -DESIGN_WIDTH / 2,
    width: DESIGN_WIDTH,
    height: ART_RISE + 84,
  },
  abs: {
    position: 'absolute',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
});
