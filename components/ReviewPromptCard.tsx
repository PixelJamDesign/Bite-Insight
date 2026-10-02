/**
 * ReviewPromptCard — the "You've scanned over 20 products!" moment
 * (Figma 5949:14597). A white card with a 3D "20" sitting over its top
 * edge; confetti bursts out from behind the number as the card lands,
 * then drifts gently while it's open.
 *
 * Artwork comes from the Figma frame, exported per piece so each can
 * move on its own. Positions below are in the card's own points (354pt
 * wide in Figma) and are laid out from the card's centre, so the art
 * stays put on wider phones.
 */
import { useEffect, useRef, type ComponentType } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

// Native blur behind the scrim. Expo Go can't load the view, so there the
// scrim is a little darker instead.
type BlurProps = { blurType?: string; blurAmount?: number; style?: any; pointerEvents?: 'none' };
const BlurView: ComponentType<BlurProps> | null =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    ? null
    : require('@sbaiahmed1/react-native-blur').BlurView;

const DESIGN_WIDTH = 354;
/** How far the art rises above the card's top edge. */
const ART_RISE = 130;

const TWENTY = { x: 76.3, y: -55.3, w: 197.3, h: 118.3 };

const PIECES = [
  { key: 'c1', src: require('@/assets/images/review/confetti-c1.png'), x: 180, y: -110, w: 49, h: 50.3, spin: -140 },
  { key: 'c2', src: require('@/assets/images/review/confetti-c2.png'), x: 244, y: -98, w: 28, h: 29, spin: 90 },
  { key: 'c3', src: require('@/assets/images/review/confetti-c3.png'), x: 191, y: -130, w: 12, h: 11, spin: 180 },
  { key: 'c4', src: require('@/assets/images/review/confetti-c4.png'), x: 63, y: -45, w: 24.3, h: 25, spin: -120 },
  { key: 'c5', src: require('@/assets/images/review/confetti-c5.png'), x: 270, y: -45, w: 23, h: 31, spin: 160 },
  { key: 'c6', src: require('@/assets/images/review/confetti-c6.png'), x: 82, y: -86, w: 23, h: 31, spin: -170 },
  { key: 'c7', src: require('@/assets/images/review/confetti-c7.png'), x: 140, y: -117, w: 37.7, h: 35.3, spin: 130 },
  { key: 'c8', src: require('@/assets/images/review/confetti-c8.png'), x: 268, y: 11, w: 31, h: 32.7, spin: 150 },
  { key: 'c9', src: require('@/assets/images/review/confetti-c9.png'), x: 51, y: 0, w: 38, h: 34, spin: -150 },
] as const;

/** Where the confetti bursts from: the middle of the "20". */
const ORIGIN = { x: TWENTY.x + TWENTY.w / 2, y: TWENTY.y + TWENTY.h / 2 };

interface Props {
  onYes: () => void;
  onNotReally: () => void;
  onLater: () => void;
}

export function ReviewPromptCard({ onYes, onNotReally, onLater }: Props) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const twenty = useRef(new Animated.Value(0)).current;
  const burst = useRef(PIECES.map(() => new Animated.Value(0))).current;
  const drift = useRef(PIECES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let cancelled = false;
    const loops: Animated.CompositeAnimation[] = [];

    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        [backdrop, card, twenty, ...burst].forEach((v) => v.setValue(1));
        return;
      }
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      Animated.spring(card, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
      Animated.sequence([
        Animated.delay(140),
        Animated.spring(twenty, { toValue: 1, friction: 4.5, tension: 120, useNativeDriver: true }),
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
  }, [backdrop, card, twenty, burst, drift]);

  // A modal so it sits over everything on the page, floating header and
  // tab bar included.
  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onLater}>
      <View style={styles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdrop }]} pointerEvents="none">
          {BlurView && <BlurView blurType="dark" blurAmount={12} style={StyleSheet.absoluteFill} />}
          <View style={[StyleSheet.absoluteFill, BlurView ? styles.scrim : styles.scrimNoBlur]} />
        </Animated.View>

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
            <View style={styles.textBlock}>
              <Text style={styles.title}>You've scanned over 20 products!</Text>
              <Text style={styles.lead}>Loving Bite Insight?</Text>
              <Text style={styles.body}>
                We'd love to know what you think about the Bite Insight app and how we can make it better for you.
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
                <Text style={styles.secondaryLabel}>Ask me later</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Art over the top edge, laid out on the 354pt design grid */}
          <View style={styles.art} pointerEvents="none">
            {PIECES.map((p, i) => {
              const dx = ORIGIN.x - (p.x + p.w / 2);
              const dy = ORIGIN.y - (p.y + p.h / 2);
              const b = burst[i];
              return (
                <Animated.Image
                  key={p.key}
                  source={p.src}
                  style={[
                    styles.abs,
                    {
                      left: p.x,
                      top: p.y + ART_RISE,
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
                  left: TWENTY.x,
                  top: TWENTY.y + ART_RISE,
                  width: TWENTY.w,
                  height: TWENTY.h,
                  opacity: twenty.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
                  transform: [
                    { translateY: twenty.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                    { scale: twenty.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                  ],
                },
              ]}
            >
              <Image source={require('@/assets/images/review/twenty.webp')} style={styles.fill} resizeMode="contain" />
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
  scrim: {
    backgroundColor: 'rgba(2, 52, 50, 0.6)',
  },
  scrimNoBlur: {
    backgroundColor: 'rgba(2, 52, 50, 0.85)',
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
  textBlock: {
    gap: Spacing.xs,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.4,
    color: Colors.primary,
  },
  lead: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
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
