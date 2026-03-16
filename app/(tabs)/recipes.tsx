import { Animated, View, Text, Image, StyleSheet } from 'react-native';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useFocusFadeIn } from '@/lib/useFocusFadeIn';
import { ScreenLayout } from '@/components/ScreenLayout';

export default function RecipesScreen() {
  const focusAnim = useFocusFadeIn();

  return (
    <ScreenLayout title="Recipes">
      <Animated.View style={{ flex: 1, opacity: focusAnim.opacity, transform: [{ translateY: focusAnim.translateY }] }}>
        <View style={styles.centerWrap}>
        <View style={styles.cardWrap}>
          {/* Egg timer — transparent bg webp with shadow */}
          <Image
            source={require('@/assets/images/egg-timer.webp')}
            style={styles.timerImage}
            resizeMode="contain"
          />

          {/* White card */}
          <View style={[styles.card, focusAnim.showElevation && Shadows.level4]}>
            <View style={styles.content}>
              <View style={styles.textGroup}>
                <Text style={styles.heading}>Sorry, nearly ready.</Text>
                <Text style={styles.bodyLarge}>
                  Recipes tailored to you based off your liked and disliked ingredients!
                </Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  We're currently working extremely hard to bring this feature to Bite Insight. Stay tuned for exciting news and updates in the near future.
                </Text>
              </View>
            </View>
          </View>
        </View>
        </View>
      </Animated.View>
    </ScreenLayout>
  );
}

const TIMER_WIDTH = 140;
const TIMER_HEIGHT = Math.round(TIMER_WIDTH * (292 / 240)); // maintain aspect ratio ≈ 170
const OVERLAP = 50;

const styles = StyleSheet.create({
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 150,               // offset for tab bar height
  },
  cardWrap: {
    paddingHorizontal: Spacing.m,     // 24px from device edges
    alignItems: 'center',
  },
  timerImage: {
    width: TIMER_WIDTH,
    height: TIMER_HEIGHT,
    zIndex: 2,
    elevation: 5,
    marginBottom: -OVERLAP,
  },
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    paddingTop: 60,
    paddingBottom: Spacing.m,
    paddingHorizontal: Spacing.m,
    width: '100%',
    zIndex: 1,
  },
  content: {
    gap: Spacing.m,                    // 24px
  },
  textGroup: {
    gap: Spacing.s,                    // 16px
    alignItems: 'center',
  },
  heading: {
    ...Typography.h3,
    color: Colors.primary,
    textAlign: 'center',
    width: '100%',
  },
  bodyLarge: {
    ...Typography.bodyLarge,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    width: '100%',
  },
  infoBox: {
    backgroundColor: Colors.surface.tertiary,
    borderRadius: Radius.m,
    padding: Spacing.s,
    width: '100%',
  },
  infoText: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.primary,
    textAlign: 'center',
  },
});
