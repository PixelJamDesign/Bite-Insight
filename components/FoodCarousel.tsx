/**
 * FoodCarousel — 3 rows of circular food images scrolling infinitely in
 * alternating directions. Uses native Animated API for smooth 60fps animation.
 *
 * Each row duplicates its item list so we can seamlessly loop:
 * render [items, items] side-by-side, translate by one full set width,
 * then reset to 0 and repeat.
 */
import { useEffect, useRef, useMemo } from 'react';
import { View, Image, Animated, StyleSheet, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows } from '@/constants/theme';

const ITEM_SIZE = 95;
const ITEM_GAP = 10;
const ITEM_TOTAL = ITEM_SIZE + ITEM_GAP;
const FADE_WIDTH = 70;

// Supabase ingredient image URLs — hand-picked for visual variety
const BUCKET = 'https://bfkxjgbvsygvenmciasg.supabase.co/storage/v1/object/public/ingredients';

const ROW_1_IMAGES = [
  `${BUCKET}/Vegetables/Tomato.webp`,
  `${BUCKET}/Fruit/Apple.webp`,
  `${BUCKET}/Dairy/cheddar_cheese.webp`,
  `${BUCKET}/Fruit/Banana.webp`,
  `${BUCKET}/Vegetables/Broccoli.webp`,
  `${BUCKET}/Fruit/Blueberries.webp`,
  `${BUCKET}/Meat%20%26%20Protein/Eggs.webp`,
  `${BUCKET}/Fruit/Clementine.webp`,
  `${BUCKET}/Carbs%20%26%20Wheat/bread.webp`,
];

const ROW_2_IMAGES = [
  `${BUCKET}/Meat%20%26%20Protein/Steak.webp`,
  `${BUCKET}/Fruit/Cranberries.webp`,
  `${BUCKET}/Dairy/butter.webp`,
  `${BUCKET}/Carbs%20%26%20Wheat/spaghetti.webp`,
  `${BUCKET}/Fruit/Coconut.webp`,
  `${BUCKET}/Drinks/coffee.webp`,
  `${BUCKET}/Carbs%20%26%20Wheat/rice.webp`,
  `${BUCKET}/Fruit/Cherries.webp`,
  `${BUCKET}/Nuts/Pine%20Nuts.webp`,
];

const ROW_3_IMAGES = [
  `${BUCKET}/Fruit/Figs.webp`,
  `${BUCKET}/Dairy/yogurt.webp`,
  `${BUCKET}/Carbs%20%26%20Wheat/oats.webp`,
  `${BUCKET}/Fruit/Blackberries.webp`,
  `${BUCKET}/Carbs%20%26%20Wheat/quinoa.webp`,
  `${BUCKET}/Fruit/Grapefruit.webp`,
  `${BUCKET}/Dairy/mozzarella_cheese.webp`,
  `${BUCKET}/Fruit/Dates.webp`,
  `${BUCKET}/Carbs%20%26%20Wheat/couscous.webp`,
];

const ALL_IMAGES = [...ROW_1_IMAGES, ...ROW_2_IMAGES, ...ROW_3_IMAGES];

/** Prefetch all carousel images so they're cached before display. */
export function prefetchFoodImages() {
  ALL_IMAGES.forEach((uri) => Image.prefetch(uri));
}

interface CarouselRowProps {
  images: string[];
  /** 'left' = scroll left, 'right' = scroll right */
  direction: 'left' | 'right';
  /** Duration for one full loop in ms (lower = faster) */
  duration: number;
}

function CarouselRow({ images, direction, duration }: CarouselRowProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const setWidth = images.length * ITEM_TOTAL;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [duration]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange:
      direction === 'left' ? [0, -setWidth] : [-setWidth, 0],
  });

  // Render the set twice for seamless looping
  const doubled = useMemo(() => [...images, ...images], [images]);

  return (
    <View style={styles.rowClip}>
      <Animated.View style={[styles.rowInner, { transform: [{ translateX }] }]}>
        {doubled.map((uri, i) => (
          <View key={`${i}`} style={styles.itemContainer}>
            <Image source={{ uri }} style={styles.itemImage} />
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export default function FoodCarousel() {
  return (
    <View style={styles.container}>
      <CarouselRow images={ROW_1_IMAGES} direction="left" duration={30000} />
      <CarouselRow images={ROW_2_IMAGES} direction="right" duration={35000} />
      <CarouselRow images={ROW_3_IMAGES} direction="left" duration={32000} />

      {/* Edge fades */}
      <LinearGradient
        colors={[Colors.background, 'rgba(226,241,238,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fadeLeft}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(226,241,238,0)', Colors.background]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.fadeRight}
        pointerEvents="none"
      />

      {/* Top + bottom edge fades — mask shadow bleed from circular items */}
      <LinearGradient
        colors={[Colors.background, 'rgba(226,241,238,0)']}
        style={styles.fadeTop}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(226,241,238,0)', Colors.background]}
        style={styles.fadeBottom}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 320,
    gap: ITEM_GAP,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowClip: {
    overflow: 'hidden',
    height: ITEM_SIZE,
  },
  rowInner: {
    flexDirection: 'row',
    gap: ITEM_GAP,
  },
  itemContainer: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#fff',
    ...Shadows.level3,
  },
  itemImage: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
  },
  fadeLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: FADE_WIDTH,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FADE_WIDTH / 2,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: FADE_WIDTH / 2,
  },
});
